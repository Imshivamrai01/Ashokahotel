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
  reportPrinters,
} = require("./lib/api");
const { scanLan, listUsbPrinters, detectAll } = require("./lib/discovery");
const { printKot, printBill, testPrint, testBillPrint } = require("./lib/printer");

const TOKEN_PLACEHOLDER = "PASTE_AGENT_TOKEN_HERE";
const tokenConfigured = () => !!AGENT_TOKEN && AGENT_TOKEN !== TOKEN_PLACEHOLDER;

const store = new Store({
  defaults: {
    // ── Printers ──────────────────────────────────────────────────────────────
    // KOTs print on EVERY working printer the scan finds. The invoice prints on
    // one of them, chosen by staff in the admin / reception panel (billPrinterId).
    printers: [], // last scan result — lets printing start before the next scan finishes
    kotDisabledIds: [], // printers the operator switched off for KOT
    billPrinterId: "", // from the server; "" = first working printer
    nonReceiptIps: [], // LAN hosts on :9100 that are not receipt printers — never probed again
    // Optional printer added by hand (Printer tab → Manual setup), used in
    // addition to the detected ones while autoSelect is false.
    transport: "tcp", // "tcp" (LAN/WiFi) | "usb" (Windows printer queue)
    printerIp: "",
    printerPort: 9100,
    usbPrinterName: "",
    autoSelect: true,
    // ── Agent ─────────────────────────────────────────────────────────────────
    pollMs: 2000,
    autoLaunch: true,
    installAt: 0, // first launch; older KOTs are never printed
    billPrimed: false, // true once the pre-install invoice backlog has been skipped
    printedIds: [], // durable dedup across restarts
    billPrintedIds: [],
    // ── Offline POS ───────────────────────────────────────────────────────────
    offlineMenu: [],
    offlineSyncQueue: [],
  },
});

const cfg = () => store.store;
const TRANSPORT_LABEL = { usb: "USB", tcp: "WiFi/LAN", bt: "Bluetooth" };
const TRANSPORT_ORDER = { usb: 0, tcp: 1, bt: 2 };
const REDETECT_MS = 3 * 60 * 1000; // look for added / removed printers this often
const HEARTBEAT_MS = 60 * 1000;
const BACKLOG_GRACE_MS = 15 * 60 * 1000;
const MAX_RETRIES = 5;

const launchedHidden = process.argv.includes("--hidden");
const now = () => new Date();
const today = () => now().toISOString().slice(0, 10);

let tray = null;
let mainWin = null;
let pollTimer = null;
let polling = false;
let scanning = false;
let failStreak = 0;
let markFailCount = 0;
let lastDetected = []; // every printer the last scan saw (usable or not)
let lastDetectAt = 0;
let lastHeartbeatAt = 0;
let retries = []; // { order, printerId, tries } — a KOT one printer missed
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
    printers: printerView(),
  });
}

// ── Printers in use ──────────────────────────────────────────────────────────
// The printer added by hand, shaped like a scan result (or null if none).
function manualPrinter() {
  const c = cfg();
  if (c.autoSelect !== false) return null;
  const usb = c.transport === "usb";
  if (usb ? !c.usbPrinterName : !c.printerIp) return null;
  return {
    id: usb ? `usb:${c.usbPrinterName}` : `tcp:${c.printerIp}`,
    transport: usb ? "usb" : "tcp",
    name: usb ? c.usbPrinterName : `Printer ${c.printerIp}`,
    address: usb ? "Windows printer" : c.printerIp,
    online: true,
    thermal: true,
    verified: false,
    manual: true,
    note: "added by hand — not tested",
    target: {
      transport: c.transport,
      printerIp: c.printerIp,
      printerPort: c.printerPort,
      usbPrinterName: c.usbPrinterName,
    },
  };
}

// Connection settings in the shape lib/printer.js expects.
const targetOf = (p) =>
  p.target || {
    transport: p.transport,
    printerIp: p.address,
    printerPort: 9100,
    usbPrinterName: p.name,
    usbDevicePath: p.path || "",
    btPort: p.address,
  };

/**
 * Every distinct working printer. Tested printers win over untested Windows
 * queues, and one physical printer reachable two ways (say USB and WiFi) counts
 * once — otherwise it would print each KOT twice.
 */
function usablePrinters() {
  let list = lastDetected.filter((p) => p.online && p.thermal);
  if (list.some((p) => p.verified)) list = list.filter((p) => p.verified);
  list = [...list].sort((a, b) => TRANSPORT_ORDER[a.transport] - TRANSPORT_ORDER[b.transport]);
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (p.deviceKey) {
      if (seen.has(p.deviceKey)) continue;
      seen.add(p.deviceKey);
    }
    out.push(p);
  }
  const manual = manualPrinter();
  if (manual && !out.some((p) => p.id === manual.id)) out.push(manual);
  return out;
}

const kotPrinters = () =>
  usablePrinters().filter((p) => !(cfg().kotDisabledIds || []).includes(p.id));

// The invoice printer staff chose; falls back to the first working one.
function billPrinter() {
  const all = usablePrinters();
  return all.find((p) => p.id === cfg().billPrinterId) || all[0] || null;
}

// What the dashboard (and the server) get to see.
function printerView() {
  const usable = usablePrinters();
  const usableIds = new Set(usable.map((p) => p.id));
  const kotIds = new Set(kotPrinters().map((p) => p.id));
  const bill = billPrinter();
  const manual = manualPrinter();
  const all = manual && !lastDetected.some((p) => p.id === manual.id) ? [...lastDetected, manual] : lastDetected;
  return all.map((p) => {
    const isUsable = usableIds.has(p.id);
    const shadowed = !isUsable && p.online && p.thermal; // same printer on another connection
    return {
      id: p.id,
      transport: p.transport,
      name: p.name,
      address: p.address,
      usable: isUsable,
      shadowed,
      kot: kotIds.has(p.id),
      bill: !!bill && bill.id === p.id,
      note: shadowed ? "same printer is already connected another way" : p.note || "",
    };
  });
}

const namesOf = (list) => list.map((p) => `${p.name} (${TRANSPORT_LABEL[p.transport]})`).join(" + ");

function readyStatus() {
  const kot = kotPrinters();
  if (!kot.length) return setStatus(false, "No working printer — searching again shortly");
  setStatus(true, `${kot.length} printer${kot.length === 1 ? "" : "s"} ready: ${namesOf(kot)}`);
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
  tray.setToolTip(`Ashoka Hotel KOT Printer — ${state.status.msg}`.slice(0, 120));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: state.status.ok ? "● Connected" : "● Disconnected", enabled: false },
      { label: state.status.msg.slice(0, 60), enabled: false },
      { type: "separator" },
      { label: "Open Dashboard", click: showMain },
      { label: "Find printers", click: () => autodetect({ openIfNone: true, fresh: true }) },
      { label: "Test Print", click: () => runTestPrint() },
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

// ── Auto-detect printers ─────────────────────────────────────────────────────
// Finds every printer reachable over USB, LAN/WiFi and Bluetooth and TESTS each
// one (asks it for its ESC/POS status). All working ones are then used for KOT.
//   fresh — forget the "not a receipt printer" list (operator-triggered scans)
//   quiet — background re-check: only speak up when the set of printers changes
async function autodetect({ openIfNone = false, fresh = false, quiet = false } = {}) {
  if (scanning) return false;
  scanning = true;
  lastDetectAt = Date.now();
  try {
    const before = usablePrinters().map((p) => p.id).sort().join("|");
    if (!quiet) {
      setStatus(false, "Searching for printers…");
      logEvent("info", "Scanning USB, network and Bluetooth for printers…");
    }
    if (fresh) store.set("nonReceiptIps", []);
    const found = await detectAll({ skipLanIps: cfg().nonReceiptIps || [] });

    const notReceipt = found.filter((p) => p.transport === "tcp" && !p.thermal).map((p) => p.address);
    if (notReceipt.length) {
      store.set("nonReceiptIps", [...new Set([...(cfg().nonReceiptIps || []), ...notReceipt])].slice(-200));
    }

    lastDetected = found;
    store.set("printers", found);
    const usable = usablePrinters();
    const changed = usable.map((p) => p.id).sort().join("|") !== before;

    if (!quiet || changed) {
      for (const p of printerView()) {
        logEvent(
          p.usable ? "info" : "warn",
          `${TRANSPORT_LABEL[p.transport]} · ${p.name} (${p.address}) — ${p.usable ? "working" : p.note || "not usable"}`,
        );
      }
      if (usable.length) logEvent("info", `KOT will print on: ${namesOf(kotPrinters()) || "none (all switched off)"}`);
    }
    if (!quiet || changed || !state.status.ok) readyStatus();
    emitState();
    sendHeartbeat();
    if (!usable.length && openIfNone) showMain();
    return usable.length > 0;
  } finally {
    scanning = false;
  }
}

// ── Server heartbeat ─────────────────────────────────────────────────────────
// Publishes the printer list so staff can pick the invoice printer in the admin /
// reception panel, and brings their choice back.
async function sendHeartbeat() {
  if (!tokenConfigured()) return;
  lastHeartbeatAt = Date.now();
  try {
    // Working printers only (plus the chosen invoice printer, so it shows as
    // offline instead of vanishing from the picker).
    const list = printerView()
      .filter((p) => p.usable || p.id === cfg().billPrinterId)
      .map(({ id, name, transport, address, usable }) => ({ id, name, transport, address, usable }));
    const res = await reportPrinters(list);
    const chosen = typeof res.billPrinterId === "string" ? res.billPrinterId : "";
    if (chosen !== cfg().billPrinterId) {
      store.set("billPrinterId", chosen);
      const bill = billPrinter();
      logEvent("info", `Invoice printer: ${bill ? namesOf([bill]) : "none connected"}`);
      emitState();
    }
  } catch {
    // Server unreachable or not updated yet — keep the last known choice.
  }
}

// ── KOT printing ─────────────────────────────────────────────────────────────
// Send one KOT to several printers at the same time.
function printKotOn(printers, order) {
  return Promise.all(
    printers.map(async (p) => {
      try {
        await printKot(targetOf(p), order);
        return { p, ok: true };
      } catch (e) {
        return { p, ok: false, error: e.message };
      }
    }),
  );
}

// A printer that missed a KOT gets it again on the following polls.
async function runRetries(printers) {
  if (!retries.length) return;
  const pending = retries;
  retries = [];
  for (const r of pending) {
    const p = printers.find((x) => x.id === r.printerId);
    if (!p) continue; // printer gone or switched off — the other printer has it
    // eslint-disable-next-line no-await-in-loop
    const [res] = await printKotOn([p], r.order);
    if (res.ok) {
      logEvent("info", `Printed ${r.order.kotNumber} on ${p.name} (retry)`);
    } else if (r.tries + 1 >= MAX_RETRIES) {
      logEvent("error", `Gave up printing ${r.order.kotNumber} on ${p.name}: ${res.error}`);
    } else {
      retries.push({ ...r, tries: r.tries + 1 });
    }
  }
}

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

    if (Date.now() - lastHeartbeatAt > HEARTBEAT_MS) sendHeartbeat();

    const printers = kotPrinters();
    if (!printers.length) {
      setStatus(false, "No working printer — searching again shortly");
      // Keep looking on our own: a printer plugged in later is picked up without a click.
      if (Date.now() - lastDetectAt > 30000) autodetect({ quiet: true });
      return;
    }

    await runRetries(printers);

    const queue = await fetchQueue();
    if (!Array.isArray(queue)) throw new Error("print-queue did not return a list");
    state.stats.queuePending = queue.length;
    const cutoff = (cfg().installAt || 0) - BACKLOG_GRACE_MS;
    let printed = 0;
    let skipped = 0;
    for (const order of queue) {
      if (printedSession.has(order._id)) continue;
      if (new Date(order.createdAt).getTime() < cutoff) {
        rememberPrinted(order._id); // placed before this app was installed
        skipped++;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const results = await printKotOn(printers, order);
      const failed = results.filter((r) => !r.ok);
      if (failed.length === results.length) {
        recordPrint(order, false);
        logEvent("error", `Print failed (${order.kotNumber}): ${failed[0].error}`);
        // eslint-disable-next-line no-await-in-loop
        await handlePrintFailure(failed[0].error);
        return; // still unmarked — it is retried on the next poll
      }
      rememberPrinted(order._id);
      recordPrint(order, true);
      logEvent(
        "info",
        `Printed ${order.kotNumber} → ${order.tableLabel} on ${results.filter((r) => r.ok).map((r) => r.p.name).join(" + ")}`,
      );
      for (const f of failed) {
        logEvent("warn", `${f.p.name} missed ${order.kotNumber}: ${f.error} — will retry`);
        retries.push({ order, printerId: f.p.id, tries: 0 });
      }
      markPrinted(order._id)
        .then(() => {
          markFailCount = 0;
        })
        .catch(() => {
          markFailCount++;
        });
      printed++;
    }
    if (skipped) logEvent("info", `Skipped ${skipped} old KOT(s) from before this app was installed`);
    failStreak = 0;
    state.stats.queuePending = 0;

    if (markFailCount >= 3) {
      setStatus(true, "Printed; server not updated (may reprint)");
    } else if (printed) {
      setStatus(true, `Printed ${printed} KOT(s) on ${printers.length} printer${printers.length === 1 ? "" : "s"}`);
    } else {
      readyStatus();
    }
    emitState();

    // A printer that missed a KOT may be off, and one may have been plugged in:
    // re-check what is connected, in the background.
    const stale = Date.now() - lastDetectAt;
    if (stale > REDETECT_MS || (retries.length && stale > 30000)) autodetect({ quiet: true });
  } catch (e) {
    setStatus(false, `Server: ${e.message}`);
  } finally {
    polling = false;
  }
}

async function handlePrintFailure(message) {
  failStreak++;
  setStatus(false, `Printer: ${message}`);
  // Two misses in a row → scan again for a working printer. Throttled so a dead
  // printer doesn't trigger a scan on every poll.
  if (failStreak < 2 || Date.now() - lastDetectAt < 30000) return;
  failStreak = 0;
  logEvent("warn", "No printer responding — scanning again…");
  const ok = await autodetect({ openIfNone: true });
  if (!ok) setStatus(false, "Printer offline — check power/cable/paper");
}

// ── Bill (tax invoice) printing ──────────────────────────────────────────────
// Invoices go to ONE printer: the one picked in the admin / reception panel.
const billPrintedSession = new Set();
let billPolling = false;

function rememberBillPrinted(id) {
  billPrintedSession.add(id);
  store.set("billPrintedIds", [...billPrintedSession].slice(-1000));
}

async function pollBills() {
  if (billPolling || scanning || !tokenConfigured()) return;
  const target = billPrinter();
  if (!target) return;
  billPolling = true;
  try {
    const { branding, queue } = await fetchBillQueue();
    if (!Array.isArray(queue)) return;
    if (!cfg().billPrimed) {
      // First run: invoices requested before this app existed are not reprinted.
      for (const order of queue) rememberBillPrinted(order._id);
      store.set("billPrimed", true);
      if (queue.length) logEvent("info", `Skipped ${queue.length} old invoice(s) from before this app was installed`);
      return;
    }
    for (const order of queue) {
      if (billPrintedSession.has(order._id)) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await printBill(targetOf(target), order, branding);
        rememberBillPrinted(order._id);
        logEvent("info", `Printed INVOICE ${order.kotNumber} → ${order.tableLabel} on ${target.name}`);
        markBillPrinted(order._id).catch(() => {});
      } catch (e) {
        logEvent("error", `Invoice print failed (${order.kotNumber}) on ${target.name}: ${e.message}`);
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

// A test slip on every KOT printer.
async function runTestPrint() {
  const printers = kotPrinters();
  if (!printers.length) {
    setStatus(false, "No working printer to test");
    return { ok: false, error: "No working printer" };
  }
  const results = await Promise.all(
    printers.map((p) =>
      testPrint(targetOf(p)).then(
        () => ({ p, ok: true }),
        (e) => ({ p, ok: false, error: e.message }),
      ),
    ),
  );
  for (const r of results) {
    logEvent(r.ok ? "info" : "error", r.ok ? `Test print sent to ${r.p.name}` : `Test failed on ${r.p.name}: ${r.error}`);
  }
  const bad = results.filter((r) => !r.ok);
  if (bad.length) setStatus(false, `Test failed on ${bad.map((r) => r.p.name).join(", ")}`);
  else setStatus(true, `Test print sent to ${printers.length} printer${printers.length === 1 ? "" : "s"}`);
  return bad.length ? { ok: false, error: bad[0].error } : { ok: true };
}

// ── IPC ──────────────────────────────────────────────────────────────────────
const publicConfig = () => {
  const { transport, printerIp, printerPort, usbPrinterName, pollMs, autoLaunch } = cfg();
  return {
    transport,
    printerIp,
    printerPort,
    usbPrinterName,
    pollMs,
    autoLaunch,
    serverUrl: SERVER_URL,
    tokenConfigured: tokenConfigured(),
  };
};
ipcMain.handle("get-state", () => ({
  config: publicConfig(),
  printers: printerView(),
  status: state.status,
  stats: state.stats,
  history: state.history,
  activity,
}));
ipcMain.handle("get-config", publicConfig);
ipcMain.handle("save-config", (_e, incoming) => {
  const allowed = ["transport", "printerIp", "printerPort", "usbPrinterName", "pollMs", "autoLaunch"];
  const before = JSON.stringify([cfg().transport, cfg().printerIp, cfg().usbPrinterName]);
  for (const k of allowed) {
    if (incoming && k in incoming) store.set(k, incoming[k]);
  }
  // Saving a different manual printer adds it alongside the detected ones.
  if (JSON.stringify([cfg().transport, cfg().printerIp, cfg().usbPrinterName]) !== before) {
    store.set("autoSelect", false);
  }
  applyAutoLaunch();
  failStreak = 0;
  startLoop();
  logEvent("info", "Settings saved");
  emitState();
  return { ok: true };
});
ipcMain.handle("set-kot-enabled", (_e, id, enabled) => {
  const off = new Set(cfg().kotDisabledIds || []);
  if (enabled) off.delete(id);
  else off.add(id);
  store.set("kotDisabledIds", [...off]);
  const p = printerView().find((x) => x.id === id);
  logEvent("info", `KOT printing ${enabled ? "on" : "off"} for ${p ? p.name : id}`);
  readyStatus();
  emitState();
  return { ok: true };
});
ipcMain.handle("test-bill", async () => {
  const target = billPrinter();
  if (!target) return { ok: false, error: "No working printer" };
  try {
    await testBillPrint(targetOf(target));
    logEvent("info", `Test invoice sent to ${target.name}`);
    return { ok: true };
  } catch (e) {
    logEvent("error", `Test invoice failed on ${target.name}: ${e.message}`);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle("scan-lan", () => scanLan());
ipcMain.handle("list-usb", () => listUsbPrinters());
ipcMain.handle("autodetect", () => autodetect({ fresh: true }));
ipcMain.handle("test-print", () => runTestPrint());
ipcMain.handle("print-now", () => poll());
ipcMain.handle("reprint", async (_e, kotNumber) => {
  const order = recentOrders.find((o) => o.kotNumber === kotNumber);
  if (!order) return { ok: false, error: "Order not in recent cache" };
  const results = await printKotOn(kotPrinters(), order);
  const ok = results.some((r) => r.ok);
  logEvent(ok ? "info" : "error", ok ? `Reprinted ${order.kotNumber}` : `Reprint failed: ${results[0]?.error || "no printer"}`);
  return ok ? { ok: true } : { ok: false, error: results[0]?.error || "No working printer" };
});

ipcMain.handle("get-offline-menu", () => store.get("offlineMenu", []));
ipcMain.handle("get-offline-locations", () => store.get("offlineLocations", []));
ipcMain.handle("place-offline-order", async (_e, payload) => {
  const printers = kotPrinters();
  if (!printers.length) return { ok: false, error: "No printer configured" };

  const localOrder = {
    _id: `LOCAL-${Date.now()}`,
    kotNumber: `L-${Math.floor(Math.random() * 10000)}`,
    tableLabel: payload.table,
    captainName: "Offline PC",
    items: payload.items.map((i) => ({
      name: i.item.name,
      quantity: i.quantity,
      notes: "Offline order",
    })),
    createdAt: new Date().toISOString(),
  };

  try {
    // 1. ALWAYS Save to sync queue first so the order is never lost
    const queue = store.get("offlineSyncQueue") || [];
    queue.push(localOrder);
    store.set("offlineSyncQueue", queue);

    // Attempt immediate sync to cloud
    poll();

    // 2. Now try to print locally
    const results = await printKotOn(printers, localOrder);
    const failed = results.filter((r) => !r.ok);
    if (failed.length < results.length) {
      logEvent("info", `Printed OFFLINE ${localOrder.kotNumber} → ${localOrder.tableLabel}`);
      return { ok: true };
    }
    logEvent("error", `Offline print failed (but order saved): ${failed[0].error}`);
    // Return ok but with a warning so the UI can inform the user
    return { ok: true, warning: "Order saved for sync, but Printer Failed: " + failed[0].error };
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
  for (const id of store.get("billPrintedIds", [])) billPrintedSession.add(id);
  if (!cfg().installAt) store.set("installAt", Date.now());
  lastDetected = store.get("printers", []);

  applyAutoLaunch();
  tray = new Tray(trayIcon(false));
  refreshTray();
  tray.on("double-click", showMain);

  if (!launchedHidden) showMain();

  // Check what is actually connected on every start.
  autodetect({ openIfNone: !launchedHidden });
  startLoop();
});

app.on("window-all-closed", () => {});
