// Printer discovery — network (mDNS + raw TCP 9100 scan) and USB (Windows spooler).
// A WiFi printer is just a network printer: it gets a LAN IP and listens on
// 9100, exactly like an Ethernet printer. So the same path covers WiFi + LAN.
const net = require("net");
const os = require("os");
const { execFile } = require("child_process");

/** Derive every /24 the host sits on from its non-internal IPv4 interfaces. */
function localSubnets() {
  const nets = os.networkInterfaces();
  const subnets = new Set();
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      // Skip internal + APIPA link-local (169.254.x) so we don't brute-force a
      // dark /24 for ~3.5s per disconnected/virtual adapter.
      if (ni.family === "IPv4" && !ni.internal && !ni.address.startsWith("169.254")) {
        const parts = ni.address.split(".");
        subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }
  return [...subnets];
}

/** Probe one host:port. Resolves true if a TCP connection opens within `timeout`. */
function probe(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

/** Brute-force scan all local /24 subnets for hosts with port 9100 open. */
async function portScan({ port = 9100, timeout = 500, concurrency = 40 } = {}) {
  const found = [];
  const targets = [];
  for (const sub of localSubnets()) {
    for (let i = 1; i <= 254; i++) targets.push(`${sub}.${i}`);
  }
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const host = targets[cursor++];
      // eslint-disable-next-line no-await-in-loop
      if (await probe(host, port, timeout)) found.push(host);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, worker),
  );
  return found;
}

/**
 * Discover network printers that advertise themselves via mDNS/Bonjour.
 * Fast and reliable when the printer supports it. Falls back gracefully to []
 * if the optional `bonjour-service` module is missing or errors.
 *   - `_pdl-datastream._tcp` → raw socket (port 9100)
 *   - `_printer._tcp`        → LPR (still gives us the host IP)
 */
function discoverMdns({ timeout = 3500 } = {}) {
  return new Promise((resolve) => {
    let Bonjour;
    try {
      ({ Bonjour } = require("bonjour-service"));
    } catch {
      return resolve([]); // module not installed — skip mDNS
    }
    let bonjour;
    try {
      bonjour = new Bonjour();
    } catch {
      return resolve([]);
    }
    const found = new Map(); // ip -> ip
    const onUp = (svc) => {
      const ip =
        (svc.referer && svc.referer.address) ||
        (svc.addresses || []).find((a) => a.includes(".") && !a.startsWith("169.254"));
      if (ip) found.set(ip, ip);
    };
    let browsers = [];
    try {
      browsers = [
        bonjour.find({ type: "pdl-datastream" }),
        bonjour.find({ type: "printer" }),
      ];
      browsers.forEach((b) => b.on("up", onUp));
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      try {
        browsers.forEach((b) => b.stop && b.stop());
        bonjour.destroy();
      } catch {
        /* ignore */
      }
      resolve([...found.values()]);
    }, timeout);
  });
}

/**
 * Find all reachable network printers: mDNS first (fast), then a port-9100
 * sweep, unioned and de-duplicated. Returns a sorted list of IPs.
 */
async function scanLan(opts = {}) {
  const [mdns, scanned] = await Promise.all([
    discoverMdns(opts),
    portScan(opts),
  ]);
  return [...new Set([...mdns, ...scanned])].sort();
}

/** List installed Windows printers via PowerShell (no native module needed). */
function listUsbPrinters() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve([]);
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-Printer | Select-Object -ExpandProperty Name",
      ],
      { windowsHide: true, timeout: 8000 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        resolve(
          stdout
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        );
      },
    );
  });
}

// ── Unified auto-detect (USB + LAN + Bluetooth) ──────────────────────────────
const {
  listWindowsPrinters,
  listUsbPrintDevices,
  sendUsbDirect,
  listBluetoothPorts,
  sendSerial,
} = require("./winraw");

// ESC/POS real-time status request (DLE EOT 1). A genuine receipt printer answers
// with one byte shaped 0xx1xx10; an office printer on port 9100 stays silent.
const STATUS_REQUEST = Buffer.from([0x10, 0x04, 0x01]);
const isEscposStatus = (b) => typeof b === "number" && (b & 0x93) === 0x12;
// Win32 PRINTER_STATUS bits that mean the queue cannot reach its device:
// ERROR (0x2) | OFFLINE (0x80) | NOT_AVAILABLE (0x1000).
const QUEUE_DEAD = 0x2 | 0x80 | 0x1000;

const VIRTUAL_PORT = /^(nul:|PORTPROMPT:|FILE:|XPSPort:|SHRFAX:|AD_Port|TS\d+)/i;
const VIRTUAL_NAME = /PDF|OneNote|XPS|Fax|AnyDesk|Send To/i;
const NETWORK_PORT = /^(IP_|IP6_|WSD|http|\d{1,3}(\.\d{1,3}){3})/i;
const THERMAL_NAME =
  /RP\d{3,}|KPC\d|posiflow|\bPOS\b|POS-?\d|thermal|receipt|TM-|TSP\d|XP-\d|rugtek|\bTVS\b|80mm|58mm|ESC\/?POS/i;

/** Ask a host on port 9100 for its ESC/POS status. True only for a real reply. */
function probeEscposTcp(host, port = 9100, timeout = 900) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("data", (d) => finish(isEscposStatus(d[0])));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("close", () => finish(false));
    socket.connect(port, host, () => socket.write(STATUS_REQUEST));
  });
}

// A 12-hex hardware address identifies the physical printer whichever way it is
// connected (USB serial, network MAC, Bluetooth address). Only an EXACT match is
// treated as "same printer" — near matches could be two units of one model.
const hex12 = (s) => {
  const h = String(s || "").replace(/[^0-9a-f]/gi, "").toUpperCase();
  return h.length === 12 ? h : "";
};

/** ip -> MAC for hosts this PC has recently talked to (from the ARP cache). */
function arpTable() {
  return new Promise((resolve) => {
    execFile("arp", ["-a"], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      const map = {};
      if (!err && stdout) {
        for (const line of stdout.split(/\r?\n/)) {
          const m = line.match(/(\d+\.\d+\.\d+\.\d+)\s+((?:[0-9a-f]{2}[-:]){5}[0-9a-f]{2})/i);
          if (m) map[m[1]] = hex12(m[2]);
        }
      }
      resolve(map);
    });
  });
}

async function detectUsb() {
  const out = [];
  // 1) Printers physically plugged in over USB — tested by asking for their status.
  const devices = await listUsbPrintDevices();
  for (const d of devices) {
    let online = false;
    let thermal = false;
    let note = "";
    try {
      // eslint-disable-next-line no-await-in-loop
      const reply = await sendUsbDirect(d.path, STATUS_REQUEST, { expectReply: true });
      online = true;
      thermal = isEscposStatus(reply);
      if (!thermal) note = "did not answer as a receipt printer";
    } catch (e) {
      note = e.message;
    }
    out.push({
      id: `usb:${d.path}`,
      transport: "usb",
      name: d.name,
      address: d.port || "USB",
      path: d.path,
      deviceKey: hex12(d.path.split("#")[2]),
      online,
      thermal,
      verified: online && thermal,
      note,
    });
  }
  // 2) Windows printer queues that are not just another view of a device above.
  //    A queue can't be asked for its status, so it is never "verified": it is
  //    only used when nothing verified is available.
  const directPorts = new Set(devices.map((d) => d.port).filter(Boolean));
  for (const q of await listWindowsPrinters()) {
    if (directPorts.has(q.PortName)) continue;
    const label = `${q.Name} ${q.DriverName || ""}`;
    if (VIRTUAL_PORT.test(q.PortName || "") || VIRTUAL_NAME.test(label)) continue;
    if (NETWORK_PORT.test(q.PortName || "")) continue; // office printer installed over the network
    const thermal = THERMAL_NAME.test(label);
    const online = !q.WorkOffline && !(Number(q.PrinterState) & QUEUE_DEAD);
    let note = "Windows printer queue — not tested";
    if (!online) note = "Windows reports this printer as not available";
    else if (!thermal) note = "not recognised as a thermal printer";
    out.push({
      id: `usb:${q.Name}`,
      transport: "usb",
      name: q.Name,
      address: q.PortName || "",
      online,
      thermal,
      verified: false,
      note,
    });
  }
  return out;
}

async function detectLan(skipIps = []) {
  const ips = (await scanLan()).filter((ip) => !skipIps.includes(ip));
  const arp = ips.length ? await arpTable() : {};
  const results = await Promise.all(
    ips.map(async (ip) => {
      const thermal = await probeEscposTcp(ip);
      return {
        id: `tcp:${ip}`,
        transport: "tcp",
        name: thermal ? "Network thermal printer" : "Network printer",
        address: ip,
        deviceKey: arp[ip] || "",
        online: true,
        thermal,
        verified: thermal,
        note: thermal ? "" : "did not answer as a receipt printer",
      };
    }),
  );
  return results;
}

async function detectBluetooth() {
  const out = [];
  for (const d of await listBluetoothPorts()) {
    let online = false;
    let thermal = false;
    let note = "";
    try {
      // eslint-disable-next-line no-await-in-loop
      const reply = await sendSerial(d.port, STATUS_REQUEST, { expectReply: true });
      online = true;
      thermal = isEscposStatus(reply) || THERMAL_NAME.test(d.name || "");
      if (!thermal) note = "did not answer as a receipt printer";
    } catch {
      note = "paired but not reachable (off or out of range)";
    }
    out.push({
      id: `bt:${d.port}`,
      transport: "bt",
      name: d.name,
      address: d.port,
      deviceKey: hex12(d.address),
      online,
      thermal,
      verified: online && thermal,
      note,
    });
  }
  return out;
}

/**
 * Find every printer this PC can reach and TEST each one. `skipLanIps` are hosts
 * already known not to be receipt printers, so they are never poked again.
 * Returns [{ id, transport, name, address, deviceKey, online, thermal, verified, note }].
 * `verified` = the device itself answered an ESC/POS status request.
 */
async function detectAll({ skipLanIps = [] } = {}) {
  const [usb, lan, bt] = await Promise.all([
    detectUsb().catch(() => []),
    detectLan(skipLanIps).catch(() => []),
    detectBluetooth().catch(() => []),
  ]);
  return [...usb, ...lan, ...bt];
}

const TRANSPORT_ORDER = { usb: 0, tcp: 1, bt: 2 };

/**
 * Best usable printer: verified ones first; among equals the one already in use,
 * then USB > LAN > Bluetooth.
 */
function pickBest(printers, currentId) {
  const rank = (p) =>
    (p.verified ? 0 : 100) + (p.id === currentId ? 0 : 10) + TRANSPORT_ORDER[p.transport];
  return (
    printers.filter((p) => p.online && p.thermal).sort((a, b) => rank(a) - rank(b))[0] || null
  );
}

module.exports = {
  scanLan,
  listUsbPrinters,
  localSubnets,
  portScan,
  discoverMdns,
  detectAll,
  pickBest,
};
