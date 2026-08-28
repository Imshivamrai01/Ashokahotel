const $ = (id) => document.getElementById(id);
let transport = "tcp";
let config = {};

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    $(`tab-${b.dataset.tab}`).classList.add("active");
  };
});

// ── Live status / stats / log ─────────────────────────────────────────────────
function setStatus(s) {
  $("pillDot").classList.toggle("ok", !!s.ok);
  $("pillMsg").textContent = s.msg || "";
  $("dStatus").textContent = s.msg || "—";
}
function setStats(st) {
  $("cPrinted").textContent = st.printedToday ?? 0;
  $("cPending").textContent = st.queuePending ?? 0;
  $("cFail").textContent = st.failures ?? 0;
}
function addLog(entry) {
  const el = document.createElement("div");
  el.className = "ln";
  el.innerHTML = `<span class="t">${entry.time}</span><span class="${entry.level}">${escapeHtml(entry.text)}</span>`;
  const log = $("log");
  log.insertBefore(el, log.firstChild);
  while (log.childElementCount > 200) log.removeChild(log.lastChild);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function renderHistory(history) {
  const body = $("histBody");
  body.innerHTML = "";
  if (!history || !history.length) {
    $("histEmpty").classList.remove("hide");
    return;
  }
  $("histEmpty").classList.add("hide");
  for (const h of history) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(h.kotNumber)}</td><td>${escapeHtml(h.table)}</td>` +
      `<td>${escapeHtml(h.captain)}</td><td>${escapeHtml(h.time)}</td>` +
      `<td><span class="badge ${h.ok ? "ok" : "bad"}">${h.ok ? "printed" : "failed"}</span></td>` +
      `<td><button class="act" data-kot="${escapeHtml(h.kotNumber)}" style="padding:5px 10px">Reprint</button></td>`;
    body.appendChild(tr);
  }
}
$("histBody").onclick = async (e) => {
  const kot = e.target?.dataset?.kot;
  if (!kot) return;
  e.target.textContent = "…";
  const r = await window.agent.reprint(kot);
  e.target.textContent = r.ok ? "Sent" : "Failed";
  setTimeout(() => (e.target.textContent = "Reprint"), 1500);
};

// ── Printer tab ───────────────────────────────────────────────────────────────
function setTransport(t) {
  transport = t;
  $("seg-tcp").classList.toggle("active", t === "tcp");
  $("seg-usb").classList.toggle("active", t === "usb");
  $("tcpBox").classList.toggle("hide", t !== "tcp");
  $("usbBox").classList.toggle("hide", t !== "usb");
}
$("seg-tcp").onclick = () => setTransport("tcp");
$("seg-usb").onclick = () => setTransport("usb");

function addOption(selId, val, selected) {
  const sel = $(selId);
  if (![...sel.options].some((o) => o.value === val)) {
    const o = document.createElement("option");
    o.value = val;
    o.textContent = val;
    sel.appendChild(o);
  }
  if (selected) sel.value = val;
}

$("scanLan").onclick = async (e) => {
  e.target.textContent = "Scanning…";
  e.target.disabled = true;
  const ips = await window.agent.scanLan();
  e.target.textContent = "Scan";
  e.target.disabled = false;
  const sel = $("lanResults");
  const cur = $("printerIp").value;
  sel.innerHTML = '<option value="">— select —</option>';
  ips.forEach((ip) => addOption("lanResults", ip));
  if (ips.includes(cur)) sel.value = cur;
  else if (ips.length === 1) {
    sel.value = ips[0];
    $("printerIp").value = ips[0];
  }
  if (!ips.length) addOption("lanResults", "none found", false);
};
$("lanResults").onchange = (e) => {
  if (e.target.value && e.target.value !== "none found") $("printerIp").value = e.target.value;
};
$("scanUsb").onclick = async (e) => {
  e.target.textContent = "Scanning…";
  e.target.disabled = true;
  const names = await window.agent.listUsb();
  e.target.textContent = "Scan";
  e.target.disabled = false;
  $("usbResults").innerHTML = '<option value="">— select —</option>';
  names.forEach((n) => addOption("usbResults", n));
  if (!names.length) addOption("usbResults", "none found", false);
};

function gatherConfig() {
  return {
    transport,
    printerIp: $("printerIp").value.trim(),
    printerPort: Number($("printerPort").value) || 9100,
    usbPrinterName: $("usbResults").value || config.usbPrinterName || "",
    pollMs: Number($("pollMs").value) || 4000,
    autoLaunch: $("autoLaunch").checked,
  };
}
async function save() {
  await window.agent.saveConfig(gatherConfig());
}
$("bSavePrinter").onclick = save;
$("bSaveSettings").onclick = save;

// ── Action buttons ────────────────────────────────────────────────────────────
$("bTest").onclick = $("bTest2").onclick = async () => {
  await window.agent.testPrint();
};
$("bPrintNow").onclick = () => window.agent.printNow();
$("bFind").onclick = () => window.agent.autodetect();

// ── Bill printer ──────────────────────────────────────────────────────────────
let billTransport = "tcp";
function setBillTransport(t) {
  billTransport = t;
  $("bseg-tcp").classList.toggle("active", t === "tcp");
  $("bseg-usb").classList.toggle("active", t === "usb");
  $("billTcpBox").classList.toggle("hide", t !== "tcp");
  $("billUsbBox").classList.toggle("hide", t !== "usb");
}
$("bseg-tcp").onclick = () => setBillTransport("tcp");
$("bseg-usb").onclick = () => setBillTransport("usb");
$("billEnabled").onchange = (e) =>
  $("billBox").classList.toggle("hide", !e.target.checked);
$("scanBillUsb").onclick = async (e) => {
  e.target.textContent = "Scanning…";
  e.target.disabled = true;
  const names = await window.agent.listUsb();
  e.target.textContent = "Scan";
  e.target.disabled = false;
  $("billUsbResults").innerHTML = '<option value="">— select —</option>';
  names.forEach((n) => addOption("billUsbResults", n));
  if (!names.length) addOption("billUsbResults", "none found", false);
};
$("bSaveBill").onclick = async () => {
  await window.agent.saveBillConfig({
    billEnabled: $("billEnabled").checked,
    billTransport,
    billPrinterIp: $("billPrinterIp").value.trim(),
    billPrinterPort: Number($("billPrinterPort").value) || 9100,
    billUsbPrinterName: $("billUsbResults").value || config.billUsbPrinterName || "",
  });
};
$("bTestBill").onclick = () => window.agent.testBill();

// ── Printer summary line ──────────────────────────────────────────────────────
function printerSummary(c) {
  if (c.transport === "usb") return c.usbPrinterName ? `USB · ${c.usbPrinterName}` : "USB · not set";
  return c.printerIp ? `WiFi/LAN · ${c.printerIp}:${c.printerPort || 9100}` : "WiFi/LAN · not set";
}

// ── Hydrate ───────────────────────────────────────────────────────────────────
async function load() {
  const s = await window.agent.getState();
  config = s.config;
  $("serverLine").textContent = (config.serverUrl || "").replace(/^https?:\/\//, "");
  $("dServer").textContent = config.serverUrl || "—";
  $("sServer").textContent = config.serverUrl || "—";
  $("sToken").textContent = config.tokenConfigured ? "configured ✓" : "NOT set ✕";
  $("dPrinter").textContent = printerSummary(config);
  $("printerIp").value = config.printerIp || "";
  $("printerPort").value = config.printerPort || 9100;
  $("pollMs").value = config.pollMs || 4000;
  $("autoLaunch").checked = config.autoLaunch !== false;
  if (config.printerIp) addOption("lanResults", config.printerIp, true);
  if (config.usbPrinterName) addOption("usbResults", config.usbPrinterName, true);
  setTransport(config.transport || "tcp");

  // Bill printer hydrate
  $("billEnabled").checked = !!config.billEnabled;
  $("billBox").classList.toggle("hide", !config.billEnabled);
  $("billPrinterIp").value = config.billPrinterIp || "";
  $("billPrinterPort").value = config.billPrinterPort || 9100;
  if (config.billUsbPrinterName)
    addOption("billUsbResults", config.billUsbPrinterName, true);
  setBillTransport(config.billTransport || "tcp");

  if (config.tokenConfigured === false) {
    $("tokenWarn").classList.remove("hide");
    $("bTest").disabled = $("bTest2").disabled = $("bPrintNow").disabled = true;
  }

  setStatus(s.status);
  setStats(s.stats);
  renderHistory(s.history);
  (s.activity || []).slice().reverse().forEach(addLog);
}

window.agent.onStatus(setStatus);
window.agent.onActivity(addLog);
window.agent.onState((s) => {
  setStatus(s.status);
  setStats(s.stats);
  renderHistory(s.history);
  $("dPrinter").textContent = printerSummary(config);
});
load();

// ── Offline POS Logic ────────────────────────────────────────────────────────
let offlineMenu = [];
let cart = {}; // item._id -> { item, quantity }

async function renderPosMenu() {
  offlineMenu = await window.agent.getOfflineMenu() || [];
  const locations = await window.agent.getOfflineLocations() || [];
  
  // Populate Table dropdown
  const tableSelect = $("posTable");
  tableSelect.innerHTML = '<option value="">Select a table...</option>';
  locations.forEach(loc => {
    if (!loc.label) return;
    const opt = document.createElement("option");
    opt.value = loc.label;
    opt.textContent = loc.label;
    tableSelect.appendChild(opt);
  });

  const list = $("posMenuList");
  list.innerHTML = "";
  if (!offlineMenu.length) {
    $("posMenuEmpty").classList.remove("hide");
    return;
  }
  $("posMenuEmpty").classList.add("hide");
  
  // Render by category
  const categories = [...new Set(offlineMenu.map(m => m.category?.name || "Uncategorized"))];
  categories.forEach(cat => {
    const catHead = document.createElement("h3");
    catHead.textContent = cat;
    catHead.style.marginTop = "16px";
    catHead.style.color = "var(--muted)";
    list.appendChild(catHead);
    
    const items = offlineMenu.filter(m => (m.category?.name || "Uncategorized") === cat);
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "kv";
      row.style.cursor = "pointer";
      row.style.padding = "10px 0";
      row.innerHTML = `<span>${escapeHtml(item.name)} <br/><small>₹${item.price}</small></span> <button class="act" style="padding:4px 8px;">+ Add</button>`;
      row.onclick = () => addToCart(item);
      list.appendChild(row);
    });
  });
}

function addToCart(item) {
  if (cart[item._id]) {
    cart[item._id].quantity++;
  } else {
    cart[item._id] = { item, quantity: 1 };
  }
  renderCart();
}

function updateCartQty(id, delta) {
  if (cart[id]) {
    cart[id].quantity += delta;
    if (cart[id].quantity <= 0) delete cart[id];
    renderCart();
  }
}
window.updateCartQty = updateCartQty;

function renderCart() {
  const list = $("posCartList");
  list.innerHTML = "";
  const items = Object.values(cart);
  if (items.length === 0) {
    $("posCartEmpty").classList.remove("hide");
    return;
  }
  $("posCartEmpty").classList.add("hide");
  
  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "kv";
    row.innerHTML = `
      <span style="flex:1">${escapeHtml(c.item.name)}</span>
      <span style="display:flex; gap:8px; align-items:center;">
        <button class="act btn-minus" style="padding:2px 8px; cursor:pointer;">-</button>
        ${c.quantity}
        <button class="act btn-plus" style="padding:2px 8px; cursor:pointer;">+</button>
      </span>
    `;
    
    row.querySelector('.btn-minus').onclick = () => updateCartQty(c.item._id, -1);
    row.querySelector('.btn-plus').onclick = () => updateCartQty(c.item._id, 1);
    
    list.appendChild(row);
  });
}

$("btnPlaceOrder").onclick = async () => {
  const table = $("posTable").value.trim();
  const items = Object.values(cart);
  if (!table) return alert("Please enter a table number/label");
  if (items.length === 0) return alert("Cart is empty");
  
  $("btnPlaceOrder").disabled = true;
  $("btnPlaceOrder").textContent = "Printing...";
  
  const payload = {
    table,
    items: items.map(c => ({
      item: c.item,
      quantity: c.quantity,
      price: c.item.price
    }))
  };
  
  const res = await window.agent.placeOfflineOrder(payload);
  if (res.ok) {
    cart = {};
    $("posTable").value = "";
    renderCart();
    if (res.warning) {
      alert(res.warning);
    } else {
      alert("Offline Order Placed & Printed!");
    }
  } else {
    alert("Failed to save order: " + res.error);
  }
  
  $("btnPlaceOrder").disabled = false;
  $("btnPlaceOrder").textContent = "Place Offline Order";
};

document.querySelector('button[data-tab="pos"]').addEventListener('click', () => {
  renderPosMenu();
});

