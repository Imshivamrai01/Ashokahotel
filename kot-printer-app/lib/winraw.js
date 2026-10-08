// Windows-only helpers that talk to printers WITHOUT any native Node module.
// Everything goes through powershell.exe (always present on Windows):
//   - USB / Windows printers: RAW bytes straight into the spooler (winspool.drv)
//   - Bluetooth printers:     the paired device's serial (COM) port
// Parameters travel in environment variables and the script itself is passed
// as -EncodedCommand, so nothing needs to exist on disk (works inside asar).
const { execFile } = require("child_process");

function runPs(script, env = {}, timeout = 20000) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32") return reject(new Error("Windows only"));
    const encoded = Buffer.from(
      `$ProgressPreference='SilentlyContinue';$ErrorActionPreference='Stop';${script}`,
      "utf16le",
    ).toString("base64");
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true, timeout, env: { ...process.env, ...env }, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = String(stderr || err.message || "").split(/\r?\n/).find((l) => l.trim());
          return reject(new Error(err.killed ? "timed out" : (msg || "PowerShell failed").trim()));
        }
        resolve(String(stdout || "").trim());
      },
    );
  });
}

function parseJsonList(out) {
  if (!out) return [];
  try {
    const v = JSON.parse(out);
    return Array.isArray(v) ? v : [v];
  } catch {
    return [];
  }
}

/** Every printer queue installed in Windows, with its driver/port/offline flag. */
async function listWindowsPrinters() {
  const out = await runPs(
    "ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Printer | " +
      "Select-Object Name,DriverName,PortName,WorkOffline,PrinterState)",
    {},
    10000,
  ).catch(() => "");
  return parseJsonList(out);
}

const RAW_SEND = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KotRaw {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool OpenPrinter(string name, out IntPtr h, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern int StartDocPrinter(IntPtr h, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] buf, int count, out int written);
  public static int Send(string printer, string doc, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("Cannot open printer (" + Marshal.GetLastWin32Error() + ")");
    try {
      DOCINFO di = new DOCINFO(); di.pDocName = doc; di.pDataType = "RAW";
      int job = StartDocPrinter(h, 1, di);
      if (job == 0) throw new Exception("Cannot start print job (" + Marshal.GetLastWin32Error() + ")");
      try {
        StartPagePrinter(h);
        int written;
        if (!WritePrinter(h, data, data.Length, out written) || written != data.Length)
          throw new Exception("Write to printer failed (" + Marshal.GetLastWin32Error() + ")");
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
      return job;
    } finally { ClosePrinter(h); }
  }
}
"@
$job = [KotRaw]::Send($env:KOT_PRN, $env:KOT_DOC, [Convert]::FromBase64String($env:KOT_B64))
# A job that reaches the device leaves the queue almost instantly. One that is
# still there after the wait is stuck (cable out / power off) — remove it so the
# spooler can't print it later on top of our own retry.
$deadline = (Get-Date).AddSeconds(8); $state = 'gone'
while ((Get-Date) -lt $deadline) {
  $j = Get-PrintJob -PrinterName $env:KOT_PRN -ID $job -ErrorAction SilentlyContinue
  if (-not $j) { $state = 'gone'; break }
  $state = [string]$j.JobStatus
  if ($state -match 'Printed|Completed') { $state = 'gone'; break }
  if ($state -match 'Error|Offline|PaperOut|Blocked|UserIntervention') { break }
  Start-Sleep -Milliseconds 300
}
if ($state -eq 'gone') { 'OK' } else {
  Remove-PrintJob -PrinterName $env:KOT_PRN -ID $job -ErrorAction SilentlyContinue
  'FAIL:' + $state
}
`;

/** Send raw ESC/POS bytes to a Windows printer queue. Throws if the job sticks. */
async function sendRawToSpooler(printerName, bytes, docName = "KOT") {
  const out = await runPs(RAW_SEND, {
    KOT_PRN: printerName,
    KOT_DOC: docName,
    KOT_B64: Buffer.from(bytes).toString("base64"),
  });
  const last = out.split(/\r?\n/).pop().trim();
  if (last === "OK") return;
  throw new Error(
    last.startsWith("FAIL:")
      ? `Printer not responding (${last.slice(5) || "job stuck"}) — check power/cable/paper`
      : last || "Print failed",
  );
}

/**
 * Paired Bluetooth devices that expose an OUTGOING serial port (SPP).
 * Returns [{ port: "COM5", name: "KPC307", address: "AABBCCDDEEFF" }].
 */
async function listBluetoothPorts() {
  const out = await runPs(
    `$bt = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue)
$res = @()
foreach ($p in @(Get-PnpDevice -Class Ports -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'BTHENUM*' })) {
  if ($p.FriendlyName -notmatch '\\((COM\\d+)\\)') { continue }
  $com = $Matches[1]
  if ($p.InstanceId -notmatch '&([0-9A-Fa-f]{12})_') { continue }
  $addr = $Matches[1].ToUpper()
  if ($addr -eq '000000000000') { continue }
  $dev = $bt | Where-Object { $_.InstanceId -like "*DEV_$addr*" } | Select-Object -First 1
  $res += [pscustomobject]@{ port = $com; address = $addr; name = $(if ($dev) { $dev.FriendlyName } else { "Bluetooth $addr" }) }
}
ConvertTo-Json -Compress -InputObject @($res)`,
    {},
    10000,
  ).catch(() => "");
  return parseJsonList(out);
}

const SERIAL_SEND = `
$p = New-Object System.IO.Ports.SerialPort $env:KOT_COM, 9600
$p.WriteTimeout = 6000; $p.ReadTimeout = 1500
$p.Open()
try {
  $b = [Convert]::FromBase64String($env:KOT_B64)
  $p.Write($b, 0, $b.Length)
  $p.BaseStream.Flush()
  if ($env:KOT_READ -eq '1') {
    try { 'REPLY:' + $p.ReadByte() } catch { 'NOREPLY' }
  } else { Start-Sleep -Milliseconds 600; 'OK' }
} finally { $p.Close() }
`;

/**
 * Write bytes to a serial (Bluetooth SPP) port. With `expectReply` it returns
 * the first byte the device answers with, or null if it stays silent.
 */
async function sendSerial(port, bytes, { expectReply = false } = {}) {
  const out = await runPs(SERIAL_SEND, {
    KOT_COM: port,
    KOT_B64: Buffer.from(bytes).toString("base64"),
    KOT_READ: expectReply ? "1" : "0",
  });
  const last = out.split(/\r?\n/).pop().trim();
  if (!expectReply) return null;
  return last.startsWith("REPLY:") ? Number(last.slice(6)) : null;
}

const USB_DIRECT = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public class KotUsb {
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern SafeFileHandle CreateFile(string name, uint access, uint share, IntPtr sa, uint disposition, uint flags, IntPtr template);
  public static string Send(string path, byte[] data, int readMs) {
    SafeFileHandle h = CreateFile(path, 0xC0000000, 3, IntPtr.Zero, 3, 0x40000000, IntPtr.Zero);
    if (h.IsInvalid) return "OPENFAIL:" + Marshal.GetLastWin32Error();
    using (FileStream fs = new FileStream(h, FileAccess.ReadWrite, 4096, true)) {
      fs.Write(data, 0, data.Length); fs.Flush();
      if (readMs <= 0) return "OK";
      byte[] buf = new byte[8];
      IAsyncResult ar = fs.BeginRead(buf, 0, 8, null, null);
      if (ar.AsyncWaitHandle.WaitOne(readMs)) { int n = fs.EndRead(ar); return n > 0 ? "REPLY:" + buf[0] : "NOREPLY"; }
      return "NOREPLY";
    }
  }
}
"@
[KotUsb]::Send($env:KOT_PATH, [Convert]::FromBase64String($env:KOT_B64), [int]$env:KOT_READMS)
`;

/**
 * USB printers that are PHYSICALLY plugged in right now (Windows "USB printing
 * support" devices). Needs no installed driver or printer queue.
 * Returns [{ name: "Caysn KPC307-UEWB", port: "USB004", path: "\\?\USB#VID_…" }].
 */
async function listUsbPrintDevices() {
  const out = await runPs(
    String.raw`$res = @()
foreach ($d in @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'USBPRINT\*' })) {
  $parent = (Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName DEVPKEY_Device_Parent -ErrorAction SilentlyContinue).Data
  if (-not $parent) { continue }
  $port = ''
  if ($d.InstanceId -match '(USB\d+)$') { $port = $Matches[1] }
  $res += [pscustomobject]@{
    name = $d.FriendlyName
    port = $port
    path = '\\?\' + ($parent -replace '\\', '#') + '#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}'
  }
}
ConvertTo-Json -Compress -InputObject @($res)`,
    {},
    10000,
  ).catch(() => "");
  return parseJsonList(out);
}

/**
 * Write bytes straight to a plugged-in USB printer (no spooler, no driver).
 * With `expectReply` it returns the first status byte the printer sends back,
 * or null if it stays silent. Throws if the device cannot be opened.
 */
async function sendUsbDirect(devicePath, bytes, { expectReply = false } = {}) {
  const out = await runPs(USB_DIRECT, {
    KOT_PATH: devicePath,
    KOT_B64: Buffer.from(bytes).toString("base64"),
    KOT_READMS: expectReply ? "1200" : "0",
  });
  const last = out.split(/\r?\n/).pop().trim();
  if (last.startsWith("OPENFAIL")) {
    throw new Error("USB printer not reachable — check power/cable (or another program is using it)");
  }
  if (!expectReply) return null;
  return last.startsWith("REPLY:") ? Number(last.slice(6)) : null;
}

module.exports = {
  listWindowsPrinters,
  sendRawToSpooler,
  listUsbPrintDevices,
  sendUsbDirect,
  listBluetoothPorts,
  sendSerial,
};
