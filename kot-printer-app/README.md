# Ashoka Hotel KOT Printer Agent

Local tray app for Windows. Polls the Ashoka Hotel server for unprinted KOTs and
sends them to a thermal printer over **WiFi / Ethernet (LAN)** or **USB**. Runs
in the system tray, auto-starts on boot, and **auto-detects the printer** — near
zero configuration for the restaurant. Built for the **TVS Champ RP STAR**
(ESC/POS); works with any ESC/POS receipt printer.

This folder is **not** part of the Next.js app and is excluded from Vercel
deploys (`.vercelignore`). It runs on a PC inside the restaurant network.

---

## How it works

```
Vercel (cloud)                    Restaurant PC (this app)        Printer
GET  /api/orders/print-queue  ──►  poll every ~4s
                                   build ESC/POS  ──────────────►  print
PATCH /api/orders/:id/mark-printed ◄── mark done
```

The server cannot reach a printer on `192.168.x.x`, so this agent bridges it.

**Server URL and auth token are baked into the build** (`config.js`) — the
restaurant operator never sees or types them. The only thing they may touch is
which printer to use, and even that is auto-detected.

---

## 1. One-time build setup (developer)

The agent authenticates to the server with a token. This is **not** a per-device
step — it is embedded once at build time and hidden from the UI.

> Why a token at all: `/api/orders/print-queue` returns live order data (tables,
> items, totals). A fully open endpoint would leak every order. The agent still
> authenticates; the secret is just invisible to the operator.

1. Server: set `PRINT_AGENT_SECRET=<long-random>` in `.env.local` **and** the
   Vercel project env. Generate one:
   ```powershell
   [Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))
   ```
2. Agent: put the **same** value into the build, either by editing
   `AGENT_TOKEN` in `kot-printer-app/config.js`, or by setting the
   `KOT_AGENT_TOKEN` env var before building. `SERVER_URL` is already hardcoded
   to `https://ashokahotel.vercel.app`.

> Note: an embedded token in a desktop app can be extracted by someone with the
> installer. That is acceptable for order data. The fully-secure future option
> is per-device pairing (agent registers, admin approves, server issues a scoped
> token) — see the "Future" note at the bottom.

## 2. Install & run (restaurant PC)

```bash
cd kot-printer-app
npm install
npm start
```

On every launch the agent **finds and tests every printer** it can reach:

- **USB** — printers physically plugged into this PC (no driver needed).
- **WiFi / Ethernet** — mDNS plus a port-9100 sweep of the local network.
- **Bluetooth** — printers already paired in Windows.

Each one is asked for its ESC/POS status, so only a real receipt printer that
answers is used. The best working one is selected automatically (USB first, then
network, then Bluetooth) and printing starts. If it stops responding the agent
scans again and switches to another connection. The **Printer** tab lists
everything found; **Use** picks one by hand.

The tray dot is **green** when healthy, **red** on error (hover for the reason).
Right-click the tray for **Find printer**, **Test Print**, **Print Now**,
**Settings**, **Quit**.

## 3. Printer wiring

### WiFi or Ethernet

A WiFi printer and an Ethernet printer look identical to the agent: both get a
LAN IP and listen on port **9100**.

- **Ethernet:** LAN cable into the printer's `E` port → router/switch.
- **WiFi:** join the printer to the restaurant WiFi (per its manual).

Then just open the app — auto-detect finds it. If your printer supports mDNS it
appears instantly; otherwise the port-9100 sweep finds it within a few seconds.

> Tip: reserve the printer's IP in the router (DHCP reservation by MAC). Even if
> you don't, the agent **self-heals**: if the printer stops responding it
> re-scans and adopts the new IP automatically.

### USB

Plug the printer into the PC and switch it on — that is all. The agent writes to
the USB device directly, so no printer driver and no native Node module are
required. (A printer that only exists as a Windows printer queue can still be
picked under **Manual setup**; it is sent as a RAW job through the spooler.)

### Bluetooth

Pair the printer once in Windows (Settings → Bluetooth & devices). After that it
shows up in the scan like any other printer.

## 4. Build an installer (.exe)

```bash
# make sure the token is set first (config.js or KOT_AGENT_TOKEN)
npm run dist
```
Output in `dist/`. Run the NSIS installer on the restaurant PC. The app
self-registers for auto-start on boot (toggle in Settings → Advanced).

---

## Behaviour notes

- **Auto-detect:** mDNS (`_pdl-datastream._tcp`, `_printer._tcp`) + a port-9100
  subnet sweep, unioned. Single obvious match is selected automatically.
- **Self-heal:** after repeated print failures on a network printer, the agent
  re-scans and adopts a new reachable IP (handles DHCP changes).
- **Dedup:** each KOT prints once (in-memory set + the server's `kotPrinted`
  flag). If `mark-printed` fails, the in-memory set still prevents a reprint this
  session; the server retries next poll.
- **Safety window:** the queue only returns KOTs from the last 4 hours, so a
  long-offline agent won't dump a whole day of stale tickets on reconnect.

## Future

- **Per-device pairing** instead of a baked token: the agent generates a keypair
  on first run, registers with the server, an admin approves it in the dashboard,
  and the server issues a revocable per-device token. Removes the
  extractable-shared-secret risk.
- **Reprint button** on the KDS card (clears `kotPrinted` → re-queues).
- **Multiple printers** (bar + kitchen): run two instances, or route by item
  category in `poll()`.
