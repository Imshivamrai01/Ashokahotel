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

module.exports = { scanLan, listUsbPrinters, localSubnets, portScan, discoverMdns };
