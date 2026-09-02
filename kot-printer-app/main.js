const {
  app,
  Tray,
  Menu,
  BrowserWindow,
  ipcMain,
  nativeImage,
} = require("electron");
const path = require("path");
const Store = require("electron-store");
const { AGENT_TOKEN, SERVER_URL } = require("./config");
const {
  fetchQueue,
  markPrinted,
  fetchBillQueue,
  markBillPrinted,
  fetchMenu,
  syncOfflineOrders,
} = require("./lib/api");
const { scanLan, listUsbPrinters } = require("./lib/discovery");
const {
  printKot,
  printBill,
  testPrint,
  testBillPrint,
  isConnected,
} = require("./lib/printer");

const TOKEN_PLACEHOLDER = "PASTE_AGENT_TOKEN_HERE";
const tokenConfigured = () => !!AGENT_TOKEN && AGENT_TOKEN !== TOKEN_PLACEHOLDER;

const store = new Store({
  defaults: {
    transport: "tcp", // "tcp" (LAN/WiFi) | "usb"
    printerIp: "",
    printerPort: 9100,
    usbPrinterName: "",
    pollMs: 2000,
    autoLaunch: true,
    printedIds: [], // durable dedup across restarts
    // ── Bill (tax invoice) printer — separate device from the KOT printer ──
    billEnabled: false,
    billTransport: "tcp",
    billPrinterIp: "",
    billPrinterPort: 9100,
    billUsbPrinterName: "",
    billPrinterPort: 9100,
    billUsbPrinterName: "",
    billPrintedIds: [],
    // ── Offline POS ──────────────────────────────────────────────────────────────
    offlineMenu: [],
    offlineSyncQueue: [],
  },
});

const cfg = () => store.store;
const hasPrinter = () => {
  const c = cfg();
  return c.transport === "usb" ? !!c.usbPrinterName : !!c.printerIp;
};

const launchedHidden = process.argv.includes("--hidden");
const now = () => new Date();
const today = () => now().toISOString().slice(0, 10);

let tray = null;
let mainWin = null;
let pollTimer = null;
let polling = false;
let scanning = false;
let printerFailCount = 0;
let markFailCount = 0;
const printedSession = new Set();

// ── Live application state (streamed to the dashboard) ───────────────────────
const state = {
  status: { ok: false, msg: "Starting…" },
  stats: { day: today(), printedToday: 0, failures: 0, queuePending: 0 },
  history: [], // { kotNumber, table, captain, time, ok }
};
const activity = []; // { time, level, text }
const recentOrders = []; // full order objects, for reprint

function emit(channel, payload) {
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(channel, payload);
}

function logEvent(level, text) {
  const entry = { time: now().toLocaleTimeString(), level, text };
  activity.unshift(entry);
  if (activity.length > 200) activity.length = 200;
  emit("activity", entry);
}

function rememberPrinted(id) {
  printedSession.add(id);
  store.set("printedIds", [...printedSession].slice(-1000));
}

function recordPrint(order, ok) {
  if (state.stats.day !== today()) {
    state.stats.day = today();
    state.stats.printedToday = 0;
  }
  if (ok) state.stats.printedToday++;
  else state.stats.failures++;
  state.history.unshift({
    kotNumber: order.kotNumber || "?",
    table: order.tableLabel || "-",
    captain: order.captainName || "-",
    time: now().toLocaleTimeString(),
    ok,
  });
  if (state.history.length > 100) state.history.length = 100;
  if (ok) {
    recentOrders.unshift(order);
    if (recentOrders.length > 20) recentOrders.length = 20;
  }
  emitState();
}

function emitState() {
  emit("state", {
    status: state.status,
    stats: state.stats,
    history: state.history,
  });
}

// ── Single instance ──────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showMain);
}

// ── Tray icon ────────────────────────────────────────────────────────────────
function trayIcon(ok) {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const [b, g, r] = ok ? [70, 180, 40] : [50, 50, 200]; // BGRA
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = b;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = r;
    buf[i * 4 + 3] = 255;
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

function setStatus(ok, msg) {
  state.status = { ok, msg };
  refreshTray();
  emit("status", state.status);
}

function refreshTray() {
  if (!tray) return;
  tray.setImage(trayIcon(state.status.ok));
  tray.setToolTip(`Ashoka Hotel KOT Printer — ${state.status.msg}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: state.status.ok ? "● Connected" : "● Disconnected", enabled: false },
      { label: state.status.msg.slice(0, 60), enabled: false },
      { type: "separator" },
      { label: "Open Dashboard", click: showMain },
      { label: "Find printer", click: () => autodetect({ openIfAmbiguous: true }) },
      {
        label: "Test Print",
        click: async () => {
          try {
            await testPrint(cfg());
            logEvent("info", "Test print sent");
            setStatus(true, "Test print sent");
          } catch (e) {
            logEvent("error", `Test failed: ${e.message}`);
            setStatus(false, `Test failed: ${e.message}`);
          }
        },
      },
      { label: "Print Now", click: () => poll() },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

// ── Main window (dashboard) ──────────────────────────────────────────────────
function showMain() {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.show();
    mainWin.focus();
    return;
  }
  mainWin = new BrowserWindow({
    width: 940,
    height: 640,
    minWidth: 780,
    minHeight: 520,
    title: "Ashoka Hotel KOT Printer",
    backgroundColor: "#14161a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWin.setMenuBarVisibility(false);
  mainWin.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWin.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWin.hide(); // keep running in tray
    }
  });
}
const openConfig = showMain; // back-compat alias

// ── Auto-detect printer ───────────────────────────────────────────────────────
async function autodetect({ openIfAmbiguous = true } = {}) {
  if (scanning) return false;
  scanning = true;
  try {
    setStatus(false, "Searching for printer…");
    logEvent("info", "Scanning for printers…");
    const ips = await scanLan();
    if (ips.length === 1) {
      store.set("transport", "tcp");
      store.set("printerIp", ips[0]);
      store.set("printerPort", 9100);
      printerFailCount = 0;
      logEvent("info", `Found printer at ${ips[0]}`);
      setStatus(true, `Found printer at ${ips[0]}`);
      return true;
    }
    if (ips.length === 0) {
      const usb = await listUsbPrinters();
      if (usb.length === 1) {
        store.set("transport", "usb");
        store.set("usbPrinterName", usb[0]);
        printerFailCount = 0;
        logEvent("info", `Found USB printer: ${usb[0]}`);
        setStatus(true, `Found USB printer: ${usb[0]}`);
        return true;
      }
    }
    setStatus(false, ips.length > 1 ? "Multiple printers — pick one" : "No printer found");
    if (openIfAmbiguous) showMain();
    return false;
  } finally {
    scanning = false;
  }
}

// ── Poll loop ────────────────────────────────────────────────────────────────
async function poll() {
  if (polling || scanning) return;
  polling = true;
  try {
    if (!tokenConfigured()) {
      setStatus(false, "App token not set in this build");
      return;
    }
    
    // Sync Menu and Offline Orders even if physical printer is disconnected
    try {
      const data = await fetchMenu();
      if (data && Array.isArray(data.items)) {
        store.set("offlineMenu", data.items);
        store.set("offlineLocations", data.locations || []);
      }
    } catch (e) {
      logEvent("warn", `Menu sync failed: ${e.message}`);
    }

    const syncQueue = store.get("offlineSyncQueue") || [];
    if (syncQueue.length > 0) {
      try {
        logEvent("info", `Syncing ${syncQueue.length} offline orders...`);
        const syncRes = await syncOfflineOrders(syncQueue);
        if (syncRes.ok) {
          store.set("offlineSyncQueue", []);
          logEvent("info", `Successfully synced ${syncQueue.length} offline orders`);
        }
      } catch (e) {
        logEvent("warn", `Failed to sync offline orders: ${e.message}`);
      }
    }

    if (!hasPrinter()) {
      setStatus(false, "No printer — use Find printer / Settings");
      return;
    }
    const c = cfg();
    const queue = await fetchQueue();
    if (!Array.isArray(queue)) throw new Error("print-queue did not return a list");
    state.stats.queuePending = queue.length;
    let printed = 0;
    for (const order of queue) {
      if (printedSession.has(order._id)) continue;
      try {
        await printKot(c, order);
        rememberPrinted(order._id);
        recordPrint(order, true);
        logEvent("info", `Printed ${order.kotNumber} → ${order.tableLabel}`);
        markPrinted(order._id)
          .then(() => {
            markFailCount = 0;
          })
          .catch(() => {
            markFailCount++;
          });
        printed++;
      } catch (e) {
        recordPrint(order, false);
        logEvent("error", `Print failed (${order.kotNumber}): ${e.message}`);
        await handlePrintFailure(e);
        return;
      }
    }
    printerFailCount = 0;
    state.stats.queuePending = 0;
    if (markFailCount >= 3) {
      setStatus(true, "Printed; server not updated (may reprint)");
    } else {
      setStatus(true, printed ? `Printed ${printed} KOT(s)` : "Idle — up to date");
    }
    emitState();
  } catch (e) {
    setStatus(false, `Server: ${e.message}`);
  } finally {
    polling = false;
  }
}

async function handlePrintFailure(err) {
  printerFailCount++;
  setStatus(false, `Printer: ${err.message}`);
  if (cfg().transport !== "tcp" || printerFailCount < 3) return;
  printerFailCount = 0;
  if (scanning) return;
  scanning = true;
  try {
    setStatus(false, "Printer unreachable — re-scanning…");
    logEvent("warn", "Printer unreachable — re-scanning network…");
    const ips = await scanLan();
    const cur = cfg().printerIp;
    const others = ips.filter((ip) => ip !== cur);
    if (others.length === 1) {
      store.set("printerIp", others[0]);
      logEvent("info", `Printer moved → ${others[0]}`);
      setStatus(true, `Printer moved → ${others[0]}`);
    } else if (others.length > 1) {
      setStatus(false, "Multiple printers found — pick in Settings");
      showMain();
    } else if (ips.includes(cur)) {
      setStatus(false, `Printer at ${cur} reachable but not printing — check paper/cover`);
    } else {
      setStatus(false, "Printer offline — check power/cable");
    }
  } finally {
    scanning = false;
  }
}

// ── Bill (tax invoice) printing ──────────────────────────────────────────────
const billPrintedSession = new Set();
let billPolling = false;

// Map the bill-printer store fields onto the shape printer.js expects.
function billCfg() {
  const c = cfg();
  return {
    transport: c.billTransport,
    printerIp: c.billPrinterIp,
    printerPort: c.billPrinterPort,
    usbPrinterName: c.billUsbPrinterName,
  };
}
function billHasPrinter() {
  const c = cfg();
  return c.billTransport === "usb" ? !!c.billUsbPrinterName : !!c.billPrinterIp;
}
function rememberBillPrinted(id) {
  billPrintedSession.add(id);
  store.set("billPrintedIds", [...billPrintedSession].slice(-1000));
}

async function pollBills() {
  if (billPolling || scanning) return;
  if (!cfg().billEnabled || !tokenConfigured() || !billHasPrinter()) return;
  billPolling = true;
  try {
    const { branding, queue } = await fetchBillQueue();
    if (!Array.isArray(queue)) return;
    const bc = billCfg();
    for (const order of queue) {
      if (billPrintedSession.has(order._id)) continue;
      try {
        await printBill(bc, order, branding);
        rememberBillPrinted(order._id);
        logEvent("info", `Printed BILL ${order.kotNumber} → ${order.tableLabel}`);
        markBillPrinted(order._id).catch(() => {});
      } catch (e) {
        logEvent("error", `Bill print failed (${order.kotNumber}): ${e.message}`);
        return; // leave it queued; retry next tick
      }
    }
  } catch (e) {
    logEvent("warn", `Bill queue: ${e.message}`);
  } finally {
    billPolling = false;
  }
}

function startLoop() {
  if (pollTimer) clearInterval(pollTimer);
  // Restore bill dedup set across restarts.
  for (const id of cfg().billPrintedIds || []) billPrintedSession.add(id);
  const ms = Math.max(1500, Number(cfg().pollMs) || 2000);
  pollTimer = setInterval(() => {
    poll();
    pollBills();
  }, ms);
  poll();
  pollBills();
}

function applyAutoLaunch() {
  app.setLoginItemSettings({ openAtLogin: !!cfg().autoLaunch, args: ["--hidden"] });
}

// ── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle("get-state", () => ({
  config: { ...cfg(), serverUrl: SERVER_URL, tokenConfigured: tokenConfigured() },
  status: state.status,
  stats: state.stats,
  history: state.history,
  activity,
}));
ipcMain.handle("get-config", () => ({
  ...cfg(),
  serverUrl: SERVER_URL,
  tokenConfigured: tokenConfigured(),
}));
ipcMain.handle("save-config", (_e, incoming) => {
  const allowed = [
    "transport",
    "printerIp",
    "printerPort",
    "usbPrinterName",
    "pollMs",
    "autoLaunch",
  ];
  for (const k of allowed) {
    if (incoming && k in incoming) store.set(k, incoming[k]);
  }
  applyAutoLaunch();
  printerFailCount = 0;
  startLoop();
  logEvent("info", "Settings saved");
  return { ok: true };
});
ipcMain.handle("save-bill-config", (_e, incoming) => {
  const allowed = [
    "billEnabled",
    "billTransport",
    "billPrinterIp",
    "billPrinterPort",
    "billUsbPrinterName",
  ];
  for (const k of allowed) {
    if (incoming && k in incoming) store.set(k, incoming[k]);
  }
  logEvent("info", "Bill printer settings saved");
  pollBills();
  return { ok: true };
});
ipcMain.handle("test-bill", async () => {
  try {
    await testBillPrint(billCfg());
    logEvent("info", "Test bill sent");
    return { ok: true };
  } catch (e) {
    logEvent("error", `Bill test failed: ${e.message}`);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle("scan-lan", () => scanLan());
ipcMain.handle("list-usb", () => listUsbPrinters());
ipcMain.handle("autodetect", () => autodetect({ openIfAmbiguous: false }));
ipcMain.handle("test-print", async () => {
  try {
    await testPrint(cfg());
    logEvent("info", "Test print sent");
    setStatus(true, "Test print sent");
    return { ok: true };
  } catch (e) {
    logEvent("error", `Test failed: ${e.message}`);
    setStatus(false, `Test failed: ${e.message}`);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle("test-connection", () => isConnected(cfg()));
ipcMain.handle("print-now", () => poll());
ipcMain.handle("reprint", async (_e, kotNumber) => {
  const order = recentOrders.find((o) => o.kotNumber === kotNumber);
  if (!order) return { ok: false, error: "Order not in recent cache" };
  try {
    await printKot(cfg(), order);
    logEvent("info", `Reprinted ${order.kotNumber}`);
    return { ok: true };
  } catch (e) {
    logEvent("error", `Reprint failed: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("get-offline-menu", () => store.get("offlineMenu", []));
ipcMain.handle("get-offline-locations", () => store.get("offlineLocations", []));
ipcMain.handle("place-offline-order", async (_e, payload) => {
  if (!hasPrinter()) return { ok: false, error: "No printer configured" };
  
  const localOrder = {
    _id: `LOCAL-${Date.now()}`,
    kotNumber: `L-${Math.floor(Math.random()*10000)}`,
    tableLabel: payload.table,
    captainName: "Offline PC",
    items: payload.items.map(i => ({
      name: i.item.name,
      quantity: i.quantity,
      notes: "Offline order"
    })),
    createdAt: new Date().toISOString()
  };
  
  try {
    // 1. ALWAYS Save to sync queue first so the order is never lost
    const queue = store.get("offlineSyncQueue") || [];
    queue.push(localOrder);
    store.set("offlineSyncQueue", queue);
    
    // Attempt immediate sync to cloud
    poll(); 
    
    // 2. Now try to print locally
    try {
      await printKot(cfg(), localOrder);
      logEvent("info", `Printed OFFLINE ${localOrder.kotNumber} → ${localOrder.tableLabel}`);
      return { ok: true };
    } catch (printErr) {
      logEvent("error", `Offline print failed (but order saved): ${printErr.message}`);
      // Return ok but with a warning so the UI can inform the user
      return { ok: true, warning: "Order saved for sync, but Printer Failed: " + printErr.message };
    }
  } catch (e) {
    logEvent("error", `Critical error saving offline order: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

// ── Lifecycle ────────────────────────────────────────────────────────────────
app.on("before-quit", () => {
  app.isQuitting = true;
});

app.whenReady().then(() => {
  for (const id of store.get("printedIds", [])) printedSession.add(id);

  applyAutoLaunch();
  tray = new Tray(trayIcon(false));
  refreshTray();
  tray.on("double-click", showMain);

  if (!launchedHidden) showMain();

  if (!hasPrinter()) {
    autodetect({ openIfAmbiguous: !launchedHidden });
  }
  startLoop();
});

app.on("window-all-closed", () => {});
