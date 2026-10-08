// Transport-agnostic KOT printing. node-thermal-printer is used ONLY to compose
// the ESC/POS bytes; delivery is ours, so no native printer module is needed:
//   - "tcp"  WiFi/Ethernet → raw socket to <ip>:9100
//   - "usb"  plugged-in USB printer → written directly to the device, or (when
//            only a Windows printer queue is known) a RAW job through the spooler
//   - "bt"   Bluetooth → the paired device's serial (COM) port
const net = require("net");
const {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
} = require("node-thermal-printer");
const {
  sendRawToSpooler,
  sendUsbDirect,
  sendSerial,
  listWindowsPrinters,
  listUsbPrintDevices,
} = require("./winraw");

// Fail fast with a clear message when the selected transport has no target.
function assertTarget(config) {
  if (config.transport === "usb") {
    if (!config.usbDevicePath && !config.usbPrinterName) throw new Error("No USB printer selected");
  } else if (config.transport === "bt") {
    if (!config.btPort) throw new Error("No Bluetooth printer selected");
  } else if (!config.printerIp) {
    throw new Error("No printer IP configured");
  }
}

// Composer only — the interface is never opened (we call getBuffer(), not execute()).
function makePrinter() {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON, // Posiflow / TVS / Rugtek all speak ESC/POS (Epson-compatible)
    interface: "tcp://127.0.0.1:9100",
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: false,
  });
}

function sendTcp(host, port, bytes, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };
    socket.setTimeout(timeout);
    socket.once("timeout", () => finish(new Error(`Printer ${host} timed out`)));
    socket.once("error", (e) => finish(new Error(`Printer ${host}: ${e.code || e.message}`)));
    socket.once("close", () => finish());
    socket.connect(port, host, () => socket.end(bytes));
  });
}

// Deliver composed bytes over whichever transport is configured. Throws if the
// printer is unreachable (so the caller leaves the order unmarked and retries).
// Note: over TCP/Bluetooth this resolves when the bytes are handed to the link —
// it does NOT confirm physical printing (paper-out is not detected there).
async function send(config, bytes, docName) {
  assertTarget(config);
  if (config.transport === "usb") {
    if (config.usbDevicePath) {
      await sendUsbDirect(config.usbDevicePath, bytes);
      return;
    }
    return sendRawToSpooler(config.usbPrinterName, bytes, docName);
  }
  if (config.transport === "bt") {
    await sendSerial(config.btPort, bytes);
    return;
  }
  return sendTcp(config.printerIp, config.printerPort || 9100, bytes);
}

async function isConnected(config) {
  try {
    assertTarget(config);
    if (config.transport === "usb" && config.usbDevicePath) {
      return (await listUsbPrintDevices()).some((d) => d.path === config.usbDevicePath);
    }
    if (config.transport === "usb") {
      const q = (await listWindowsPrinters()).find((p) => p.Name === config.usbPrinterName);
      return !!q && !q.WorkOffline;
    }
    if (config.transport === "bt") return true; // only a real write can tell
    await sendTcp(config.printerIp, config.printerPort || 9100, Buffer.alloc(0), 2000);
    return true;
  } catch {
    return false;
  }
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour12: true });
  } catch {
    return "";
  }
}

// Render + send one KOT. Throws if the printer is unreachable (so the caller
// leaves the order unmarked and retries on the next poll).
async function printKot(config, order) {
  assertTarget(config);
  const p = makePrinter();

  p.alignCenter();
  p.bold(true);
  p.setTextDoubleHeight();
  p.setTextDoubleWidth();
  p.println("** KOT **");
  p.setTextNormal();
  if (order.reprint) p.println("(REPRINT)");
  p.bold(false);
  p.drawLine();

  // KOT number — large
  p.bold(true);
  p.setTextSize(1, 1);
  p.println(order.kotNumber || "");
  p.setTextNormal();

  p.alignLeft();
  p.println(`Table : ${order.tableLabel || "-"}`);
  p.println(`Time  : ${fmtTime(order.createdAt)}`);
  p.println(`Capt  : ${order.captainName || "-"}`);
  p.bold(false);
  p.drawLine();

  p.bold(true);
  for (const it of order.items || []) {
    const veg = it.isVegetarian ? "[V]" : "[N]";
    p.println(`${it.quantity}x ${it.name} ${veg}`);
    if (it.notes) p.println(`   >> ${it.notes}`);
  }
  p.bold(false);
  p.drawLine();

  if (order.specialInstructions) {
    p.bold(true);
    p.println(`NOTE: ${order.specialInstructions}`);
    p.bold(false);
    p.drawLine();
  }

  p.cut();
  await send(config, p.getBuffer(), `KOT ${order.kotNumber || ""}`.trim());
}

function money(n) {
  return `Rs.${Number(n || 0).toFixed(2)}`;
}

// Render + send one customer BILL (tax invoice) with GST. Same transport rules
// as KOT. `branding` carries name/GSTIN/phone from the server.
async function printBill(config, order, branding = {}) {
  assertTarget(config);
  const p = makePrinter();

  p.alignCenter();
  p.bold(true);
  p.setTextDoubleHeight();
  p.println((branding.name || "ASHOKA HOTEL").toUpperCase());
  p.setTextNormal();
  p.println("Tax Invoice");
  p.bold(false);
  if (branding.gstNumber) p.println(`GSTIN: ${branding.gstNumber}`);
  if (branding.phone) p.println(String(branding.phone));
  p.drawLine();

  p.alignLeft();
  p.bold(true);
  p.println(`Bill  : ${order.kotNumber || "-"}`);
  p.println(`Table : ${order.tableLabel || "-"}`);
  p.println(`Time  : ${fmtTime(order.createdAt)}`);
  p.bold(false);
  p.drawLine();

  p.bold(true);
  for (const it of order.items || []) {
    let name = it.name || "";
    if (it.variationName) name += ` (${it.variationName})`;
    const amt = it.isNC ? "FREE" : money(it.price * it.quantity);
    p.tableCustom([
      { text: `${it.quantity}x ${name}`, align: "LEFT", width: 0.68 },
      { text: amt, align: "RIGHT", width: 0.32 },
    ]);
    if (it.addons && it.addons.length) {
      p.println(`   + ${it.addons.map((a) => a.name).join(", ")}`);
    }
  }
  p.bold(false);
  p.drawLine();

  p.bold(true);
  p.tableCustom([
    { text: "Subtotal", align: "LEFT", width: 0.6 },
    { text: money(order.subtotal), align: "RIGHT", width: 0.4 },
  ]);
  if (order.discount > 0) {
    p.tableCustom([
      { text: "Discount", align: "LEFT", width: 0.6 },
      { text: "-" + money(order.discount), align: "RIGHT", width: 0.4 },
    ]);
  }
  if (order.tax > 0) {
    p.tableCustom([
      { text: "CGST", align: "LEFT", width: 0.6 },
      { text: money(order.tax / 2), align: "RIGHT", width: 0.4 },
    ]);
    p.tableCustom([
      { text: "SGST", align: "LEFT", width: 0.6 },
      { text: money(order.tax / 2), align: "RIGHT", width: 0.4 },
    ]);
  }
  p.tableCustom([
    { text: "TOTAL", align: "LEFT", width: 0.6 },
    { text: money(order.total), align: "RIGHT", width: 0.4 },
  ]);
  p.bold(false);
  if (order.paymentMethod) {
    p.println(
      `Paid: ${String(order.paymentMethod).replace("_", " ").toUpperCase()}`,
    );
  }
  p.drawLine();
  p.alignCenter();
  p.bold(true);
  p.println("Thank you! Visit again.");
  p.bold(false);
  p.cut();
  await send(config, p.getBuffer(), `BILL ${order.kotNumber || ""}`.trim());
}

async function testPrint(config) {
  await printKot(config, {
    kotNumber: "TEST-001",
    tableLabel: "Table 1",
    captainName: "Agent",
    createdAt: new Date().toISOString(),
    items: [
      { quantity: 1, name: "Paneer Tikka", isVegetarian: true },
      { quantity: 2, name: "Butter Naan", isVegetarian: true, notes: "extra butter" },
    ],
    specialInstructions: "Printer connection OK",
  });
}

async function testBillPrint(config) {
  await printBill(
    config,
    {
      kotNumber: "TEST-001",
      tableLabel: "Table 1",
      createdAt: new Date().toISOString(),
      items: [
        { quantity: 1, name: "Paneer Tikka", price: 260 },
        { quantity: 2, name: "Butter Naan", price: 50 },
      ],
      subtotal: 360,
      tax: 18,
      total: 378,
      paymentMethod: "cash",
    },
    { name: "Ashoka Hotel", gstNumber: "22AAAAA0000A1Z5" },
  );
}

module.exports = {
  printKot,
  printBill,
  testPrint,
  testBillPrint,
  isConnected,
  send,
};
