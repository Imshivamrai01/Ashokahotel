// Transport-agnostic KOT printing via node-thermal-printer.
//   - WiFi/Ethernet:  interface = tcp://<ip>:<port>   (pure JS, no native module)
//   - USB:            interface = printer:<WindowsPrinterName>
//                     (requires the @thiagoelg/node-printer native driver)
const {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
} = require("node-thermal-printer");

// node-thermal-printer's `printer:` and `tcp://` interface regexes both require
// a NON-EMPTY host/name. A blank value would silently fall through to its File
// interface and write raw ESC/POS bytes to a literal file named "printer:" /
// "tcp:" — and File.execute retries 1000×200ms (~200s), freezing the poll loop.
// So validate up front and fail fast with a clear message.
function buildInterface(config) {
  if (config.transport === "usb") {
    if (!config.usbPrinterName) throw new Error("No USB printer selected");
    return `printer:${config.usbPrinterName}`;
  }
  if (!config.printerIp) throw new Error("No printer IP configured");
  return `tcp://${config.printerIp}:${config.printerPort || 9100}`;
}

// Lazily load the native USB driver only when USB is actually used. The TCP
// path never touches it, so a missing native module doesn't break WiFi/Ethernet.
let _usbDriver = null;
function usbDriver() {
  if (_usbDriver) return _usbDriver;
  try {
    _usbDriver = require("@thiagoelg/node-printer");
  } catch {
    throw new Error(
      "USB printing module not installed — run: npm i @thiagoelg/node-printer && npm run rebuild-usb",
    );
  }
  return _usbDriver;
}

function makePrinter(config) {
  const opts = {
    type: PrinterTypes.EPSON, // TVS Champ RP STAR speaks ESC/POS (Epson-compatible)
    interface: buildInterface(config),
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: false,
    options: { timeout: 5000 },
  };
  // The printer: interface needs the native driver object passed explicitly;
  // node-thermal-printer does NOT auto-require it (throws "No driver set!").
  if (config.transport === "usb") opts.driver = usbDriver();
  return new ThermalPrinter(opts);
}

async function isConnected(config) {
  try {
    return await makePrinter(config).isPrinterConnected();
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
// Note: over TCP, execute() resolves when bytes hit the OS socket — it does NOT
// confirm physical printing (paper-out is not detected here).
async function printKot(config, order) {
  const p = makePrinter(config);

  p.alignCenter();
  p.bold(true);
  p.setTextDoubleHeight();
  p.setTextDoubleWidth();
  p.println("** KOT **");
  p.setTextNormal();
  p.bold(false);
  p.drawLine();

  // KOT number — large
  p.setTextSize(1, 1);
  p.println(order.kotNumber || "");
  p.setTextNormal();

  p.alignLeft();
  p.println(`Table : ${order.tableLabel || "-"}`);
  p.println(`Time  : ${fmtTime(order.createdAt)}`);
  p.println(`Capt  : ${order.captainName || "-"}`);
  p.drawLine();

  for (const it of order.items || []) {
    const veg = it.isVegetarian ? "[V]" : "[N]";
    p.println(`${it.quantity}x ${it.name} ${veg}`);
    if (it.notes) p.println(`   >> ${it.notes}`);
  }
  p.drawLine();

  if (order.specialInstructions) {
    p.println(`NOTE: ${order.specialInstructions}`);
    p.drawLine();
  }

  p.cut();
  await p.execute();
}

function money(n) {
  return `Rs.${Number(n || 0).toFixed(2)}`;
}

// Render + send one customer BILL (tax invoice) with GST. Same transport rules
// as KOT. `branding` carries name/GSTIN/phone from the server.
async function printBill(config, order, branding = {}) {
  const p = makePrinter(config);

  p.alignCenter();
  p.bold(true);
  p.setTextDoubleHeight();
  p.println((branding.name || "ASHOKA HOTEL").toUpperCase());
  p.setTextNormal();
  p.bold(false);
  p.println("Tax Invoice");
  if (branding.gstNumber) p.println(`GSTIN: ${branding.gstNumber}`);
  if (branding.phone) p.println(String(branding.phone));
  p.drawLine();

  p.alignLeft();
  p.println(`Bill  : ${order.kotNumber || "-"}`);
  p.println(`Table : ${order.tableLabel || "-"}`);
  p.println(`Time  : ${fmtTime(order.createdAt)}`);
  p.drawLine();

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
  p.drawLine();

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
  p.bold(true);
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
  p.println("Thank you! Visit again.");
  p.cut();
  await p.execute();
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
  makePrinter,
};
