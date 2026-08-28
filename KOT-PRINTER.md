# KOT Printer Integration Plan
## WiFi / Bluetooth Thermal Printer — Ashoka Hotel

> **Date:** May 2026  
> **Stack:** Next.js 16 (App Router) · MongoDB/Mongoose · next-auth JWT · Deployed on Vercel

---

## 1. Current System — What Already Exists

```
Captain (browser) → POST /api/orders → MongoDB saved
                                           ↓
                              Kitchen KDS polls /api/orders/active every 3s
                              Captain polls /api/orders/captain every 6s
                              Cashier polls /api/orders/cashier every 5s
```

**What is NOT there:**  
No physical KOT printing. The kitchen currently relies purely on the KDS screen (`/kitchen`).

**Existing infrastructure we can hook into:**
| Asset | File | Relevance |
|---|---|---|
| `POST /api/orders` returns `{ orderId, kotNumber }` | `src/app/api/orders/route.ts` | Hook for triggering print after save |
| `Order` model with `kotNumber`, `kotDate`, `tableLabel`, `items`, `specialInstructions` | `src/lib/db/models/Order.ts` | All KOT print data is here |
| `PushSubscription` model + `web-push` package | already installed | Push infra exists, not used for printing yet |
| `usePushSubscription` hook on Captain page | `src/hooks/usePushSubscription.ts` | Captain device already registers for push |
| `OrderSummary.tsx` `placeOrder()` function | `src/components/captain/OrderSummary.tsx` | Single place to add post-order print trigger |
| ESC/POS npm packages (NOT yet installed) | — | Need to add |

---

## 2. The Core Problem

> **Next.js is deployed on Vercel (cloud). The printer is on the local restaurant LAN.**  
> The Vercel server cannot open a TCP socket to `192.168.1.x:9100` (the printer).  
> The browser JS sandbox cannot open raw TCP sockets either.

This means we need **a local bridge** — something running inside the restaurant network that can reach the printer.

---

## 3. Two Printer Types — Two Strategies

### 3A. WiFi Thermal Printer (e.g., Epson TM-T82, TP-Link TM series)
- Connects to restaurant WiFi router
- Gets a local IP (e.g., `192.168.1.150`) and listens on **port 9100**
- Accepts raw **ESC/POS** bytes over TCP

**Strategy:** Local Print Agent (a tiny Node.js process running on any PC/tablet in the restaurant) polls the Regalia server for unprinted KOTs and sends ESC/POS via TCP.

### 3B. Bluetooth Thermal Printer (e.g., Rongta RPP300, Goojprt)
- Pairs with a device over BLE (Bluetooth Low Energy)
- Modern Chrome supports **Web Bluetooth API** — the browser can connect directly

**Strategy:** Browser-based printing from the Captain's device right after `placeOrder()` succeeds — no agent needed.

---

## 4. Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Restaurant LAN                        │
│                                                         │
│  ┌──────────────┐   Web Bluetooth    ┌───────────────┐  │
│  │ Captain      │ ─────────────────► │ BT Printer    │  │
│  │ (Chrome tab) │                    │ (Bluetooth)   │  │
│  └──────┬───────┘                    └───────────────┘  │
│         │ POST /api/orders                              │
│         ▼                                               │
│  ┌──────────────────────┐  poll /api/orders/print-queue │
│  │  Vercel (cloud)      │ ◄──────────────────────────── │
│  │  Next.js API         │                               │
│  │  MongoDB Atlas       │ ──────────────────────────── ►│
│  └──────────────────────┘  mark printed                 │
│                                                         │
│  ┌──────────────────────┐  TCP:9100  ┌───────────────┐  │
│  │ Local Print Agent    │ ─────────► │ WiFi Printer  │  │
│  │ (Node.js, any PC)    │            │ 192.168.1.150 │  │
│  └──────────────────────┘            └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Database Changes Required

Add two fields to the `Order` model:

```typescript
// src/lib/db/models/Order.ts  — add to IOrderDoc interface
kotPrinted?: boolean;       // false by default, true after agent/browser prints
kotPrintedAt?: Date;        // timestamp of first successful print
kotPrintAttempts?: number;  // retry counter
```

Add to Mongoose schema:
```typescript
kotPrinted: { type: Boolean, default: false },
kotPrintedAt: { type: Date },
kotPrintAttempts: { type: Number, default: 0 },
```

Add a sparse index for the print queue query:
```typescript
OrderSchema.index({ kotPrinted: 1, createdAt: -1 }, { sparse: true });
```

---

## 6. New API Endpoints Required

### `GET /api/orders/print-queue`
Returns all orders where `kotPrinted !== true`, created in the last 4 hours (safety window).  
**Auth:** `kitchen` or `admin` role (the print agent logs in as kitchen staff).

```typescript
// Response shape
[{
  _id: string,
  kotNumber: string,
  tableLabel: string,
  captainName: string,
  items: [{ name, quantity, notes, isVegetarian }],
  specialInstructions?: string,
  total: number,
  createdAt: string
}]
```

### `PATCH /api/orders/[id]/mark-printed`
Marks a KOT as printed. Called by the agent after successful TCP write, or by the browser after successful BT write.  
**Auth:** `kitchen`, `captain`, or `admin`.

```typescript
// Request body: {} (no body needed)
// Sets: kotPrinted = true, kotPrintedAt = now, $inc kotPrintAttempts
```

---

## 7. Option A — Local Print Agent (WiFi Printer)

A standalone Node.js script that runs forever on any PC/tablet in the restaurant.

### How it works
1. Every **4 seconds**, calls `GET https://regalia.vercel.app/api/orders/print-queue` with an auth cookie/token
2. For each unprinted order, builds ESC/POS bytes
3. Opens TCP socket to `PRINTER_IP:9100`, writes bytes, closes socket
4. Calls `PATCH /api/orders/[id]/mark-printed`

### Agent file structure
```
kot-agent/
  index.js          ← main polling loop
  escpos.js         ← ESC/POS byte builder
  config.json       ← { printerIp, printerPort, apiBase, token }
  package.json      ← { "net": built-in, "node-fetch": "^3" }
```

### `kot-agent/escpos.js` — KOT format
```javascript
const ESC = 0x1b;
const GS  = 0x1d;

function buildKotEscPos(order) {
  const lines = [];

  // Initialize + cut mode
  lines.push(Buffer.from([ESC, 0x40]));           // ESC @ — init
  lines.push(Buffer.from([ESC, 0x61, 0x01]));     // center align
  lines.push(Buffer.from([GS,  0x21, 0x11]));     // double size
  lines.push(textLine("** KOT **"));
  lines.push(Buffer.from([GS,  0x21, 0x00]));     // normal size
  lines.push(textLine("--------------------------------"));

  // KOT number — big
  lines.push(Buffer.from([GS,  0x21, 0x30]));     // 4x height
  lines.push(textLine(order.kotNumber));
  lines.push(Buffer.from([GS,  0x21, 0x00]));

  lines.push(Buffer.from([ESC, 0x61, 0x00]));     // left align
  lines.push(textLine(`Table : ${order.tableLabel}`));
  lines.push(textLine(`Time  : ${formatTime(order.createdAt)}`));
  lines.push(textLine(`Capt  : ${order.captainName}`));
  lines.push(textLine("--------------------------------"));

  // Items
  for (const item of order.items) {
    const veg = item.isVegetarian ? "[V]" : "[N]";
    lines.push(textLine(`${item.quantity}x ${item.name} ${veg}`));
    if (item.notes) lines.push(textLine(`   >> ${item.notes}`));
  }

  lines.push(textLine("--------------------------------"));
  if (order.specialInstructions) {
    lines.push(textLine(`NOTE: ${order.specialInstructions}`));
    lines.push(textLine("--------------------------------"));
  }

  // Feed + cut
  lines.push(Buffer.from([ESC, 0x64, 0x04]));     // feed 4 lines
  lines.push(Buffer.from([GS,  0x56, 0x41, 0x03])); // cut

  return Buffer.concat(lines);
}

function textLine(str) {
  return Buffer.from(str + "\n", "utf8");
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour12: true });
}
module.exports = { buildKotEscPos };
```

### `kot-agent/index.js`
```javascript
const net = require("net");
const { buildKotEscPos } = require("./escpos");
const config = require("./config.json");

const printed = new Set(); // in-memory dedup within session

async function poll() {
  try {
    const res = await fetch(`${config.apiBase}/api/orders/print-queue`, {
      headers: { Authorization: `Bearer ${config.token}` }
    });
    const orders = await res.json();

    for (const order of orders) {
      if (printed.has(order._id)) continue;
      printed.add(order._id);

      const bytes = buildKotEscPos(order);
      await printTcp(bytes);

      await fetch(`${config.apiBase}/api/orders/${order._id}/mark-printed`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${config.token}` }
      });

      console.log(`[KOT] Printed ${order.kotNumber} for ${order.tableLabel}`);
    }
  } catch (err) {
    console.error("[KOT agent error]", err.message);
  }
}

function printTcp(bytes) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.connect(config.printerPort ?? 9100, config.printerIp, () => {
      socket.write(bytes);
      socket.end();
    });
    socket.on("close", resolve);
    socket.on("error", reject);
    setTimeout(() => { socket.destroy(); reject(new Error("timeout")); }, 5000);
  });
}

// Poll every 4 seconds
setInterval(poll, 4000);
poll(); // immediate first call
console.log(`[KOT agent] Running — printer @ ${config.printerIp}:${config.printerPort ?? 9100}`);
```

### `kot-agent/config.json`
```json
{
  "printerIp": "192.168.1.150",
  "printerPort": 9100,
  "apiBase": "https://your-domain.vercel.app",
  "token": "PASTE_KITCHEN_STAFF_JWT_HERE"
}
```

### Running the agent
```bash
# On any Windows PC in the restaurant (leave running in background)
cd kot-agent
npm install node-fetch
node index.js
```

> **No installation/setup needed on the printer.** Just power on, connect to WiFi, note its IP from the router admin panel.

---

## 8. Option B — Browser-Based Bluetooth Printing (Captain's Device)

For Bluetooth printers — print directly from the Captain's Chrome tab right after `placeOrder()` succeeds.

### Limitations
- Only works on **Chrome / Edge** (Firefox does not support Web Bluetooth)
- Captain's device must have Bluetooth
- First use requires user gesture to pair (one-time)
- Not suitable if multiple KOT machines need to print simultaneously

### Hook: `src/hooks/useBluetoothPrinter.ts`
```typescript
"use client";

import { useRef, useCallback } from "react";
import { buildKotBytes } from "@/lib/escpos-web"; // ESC/POS byte builder (browser-compatible)

// Epson/generic BT printer GATT service UUIDs
const PRINTER_SERVICE   = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHAR      = "00002af1-0000-1000-8000-00805f9b34fb";

export function useBluetoothPrinter() {
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connect = useCallback(async () => {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [PRINTER_SERVICE] }],
    });
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(PRINTER_SERVICE);
    characteristicRef.current = await service.getCharacteristic(PRINTER_CHAR);
    return device.name;
  }, []);

  const printKot = useCallback(async (order: PrintableKot) => {
    if (!characteristicRef.current) throw new Error("Printer not connected");
    const bytes = buildKotBytes(order);
    // BT write max chunk = 512 bytes — split if needed
    for (let i = 0; i < bytes.length; i += 512) {
      await characteristicRef.current.writeValueWithResponse(
        bytes.slice(i, i + 512)
      );
    }
  }, []);

  return { connect, printKot };
}
```

### Integration in `OrderSummary.tsx`
```typescript
// After successful placeOrder():
const data = await res.json();
setPlaced({ kotNumber: data.kotNumber });

// Trigger BT print (non-blocking — failure is silent)
try {
  await printKot({
    kotNumber: data.kotNumber,
    tableLabel: selectedTable!.label,
    captainName,
    items: orderItems,
    specialInstructions,
    createdAt: new Date().toISOString(),
    total: subtotal,
  });
  await fetch(`/api/orders/${data.orderId}/mark-printed`, { method: "PATCH" });
} catch {
  // Print failure doesn't block order placement — KDS is the backup
}
```

---

## 9. ESC/POS Web-Compatible Builder

For the browser (Option B), we need a `Uint8Array`-based builder (no `Buffer` / Node.js):

**`src/lib/escpos-web.ts`**
```typescript
export interface PrintableKot {
  kotNumber: string;
  tableLabel: string;
  captainName: string;
  items: { name: string; quantity: number; notes?: string; isVegetarian: boolean }[];
  specialInstructions?: string;
  total: number;
  createdAt: string;
}

export function buildKotBytes(order: PrintableKot): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const push = (...bytes: number[]) => chunks.push(new Uint8Array(bytes));
  const text  = (s: string)        => chunks.push(enc.encode(s + "\n"));

  push(0x1b, 0x40);             // init
  push(0x1b, 0x61, 0x01);       // center
  push(0x1d, 0x21, 0x11);       // double size
  text("** KOT **");
  push(0x1d, 0x21, 0x00);
  text("--------------------------------");
  push(0x1d, 0x21, 0x30);       // 4x height
  text(order.kotNumber);
  push(0x1d, 0x21, 0x00);
  push(0x1b, 0x61, 0x00);       // left align
  text(`Table : ${order.tableLabel}`);
  text(`Time  : ${new Date(order.createdAt).toLocaleTimeString("en-IN")}`);
  text(`Capt  : ${order.captainName}`);
  text("--------------------------------");

  for (const item of order.items) {
    text(`${item.quantity}x ${item.name} ${item.isVegetarian ? "[V]" : "[N]"}`);
    if (item.notes) text(`   >> ${item.notes}`);
  }

  text("--------------------------------");
  if (order.specialInstructions) {
    text(`NOTE: ${order.specialInstructions}`);
    text("--------------------------------");
  }

  push(0x1b, 0x64, 0x04);       // feed 4 lines
  push(0x1d, 0x56, 0x41, 0x03); // cut

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}
```

---

## 10. KOT Print Queue API Authentication

The local agent cannot use a browser cookie. Two options:

### Option A — Static API Key (simpler)
Add `PRINT_AGENT_SECRET` to `.env`. All print queue endpoints check for  
`Authorization: Bearer <PRINT_AGENT_SECRET>` as an alternative to JWT.

### Option B — Kitchen Staff JWT (already implemented)
Create a dedicated kitchen staff account (`kot-printer@regalia.local`).  
The agent logs in once via `POST /api/auth/signin`, stores the JWT, uses it.  
JWT is refreshed via next-auth refresh token or by re-signing in every 24h.

**Recommendation: Option A** — simpler, no session management in the agent.

---

## 11. Implementation Checklist

### Phase 1 — Backend (1–2 hours)
- [ ] Add `kotPrinted`, `kotPrintedAt`, `kotPrintAttempts` to `Order` model + schema
- [ ] Add sparse index `{ kotPrinted: 1, createdAt: -1 }` to `Order`
- [ ] Create `GET /api/orders/print-queue` — returns unprinted orders (last 4h)
- [ ] Create `PATCH /api/orders/[id]/mark-printed` — sets `kotPrinted = true`
- [ ] Add `PRINT_AGENT_SECRET` to `.env.local` + Vercel env vars
- [ ] Protect both endpoints with Bearer token OR kitchen-role JWT check

### Phase 2 — WiFi Agent (1 hour)
- [ ] Create `kot-agent/` folder at repo root (gitignored from Vercel deployment)
- [ ] Write `kot-agent/escpos.js` (ESC/POS builder)
- [ ] Write `kot-agent/index.js` (polling loop + TCP print)
- [ ] Write `kot-agent/config.json` (fill in printer IP + token)
- [ ] Test: `node kot-agent/index.js` — watch console for `[KOT] Printed KOT-001`

### Phase 3 — Bluetooth (Optional, Captain's device)
- [ ] Create `src/lib/escpos-web.ts`
- [ ] Create `src/hooks/useBluetoothPrinter.ts`
- [ ] Add BT print call in `OrderSummary.tsx` after `placeOrder()` succeeds
- [ ] Add "Connect Printer" button in Captain header (shows only if no `kotPrinted` in last order)

### Phase 4 — Hardening
- [ ] If `kotPrintAttempts >= 3` and `kotPrinted = false`, show orange badge on KDS card
- [ ] Add `kotPrinted` filter to admin orders table (flag unprinted orders)
- [ ] Consider a **reprint button** on KDS card (kitchen can request reprint)

---

## 12. Recommended Hardware

| Printer | Type | Protocol | Price (INR) | Notes |
|---|---|---|---|---|
| **Epson TM-T82III** | WiFi | ESC/POS TCP:9100 | ₹8,000–12,000 | Industry standard, very reliable |
| **TP-Link TM-U220** | WiFi | ESC/POS TCP:9100 | ₹5,000–7,000 | Budget option |
| **Rongta RPP300** | Bluetooth | ESC/POS BLE | ₹3,000–5,000 | Good for BT Option B |
| **Goojprt PT-400** | Bluetooth | ESC/POS BLE | ₹2,500–4,000 | Tested with Web Bluetooth |

---

## 13. Decision Summary

| Scenario | Recommended Approach |
|---|---|
| Single WiFi printer in kitchen | **Option A** — Local Print Agent |
| Multiple printers (bar + kitchen) | **Option A** — one agent, two TCP targets, filter by category |
| Bluetooth printer, captain's device prints | **Option B** — Web Bluetooth in browser |
| Both WiFi + BT fallback | **Option A** primary, **Option B** secondary (BT as captain's receipt copy) |

**For Regalia → Start with Option A (WiFi agent).** It's more reliable, runs independently of the captain's device, and works even if the captain's browser crashes mid-order.

---

## 14. Files To Create / Modify

```
MODIFY:
  src/lib/db/models/Order.ts              ← add 3 fields + index
  src/types/index.ts                      ← add kotPrinted/kotPrintedAt to IOrder
  src/app/api/orders/route.ts             ← no change needed (orderId already returned)

CREATE:
  src/app/api/orders/print-queue/route.ts ← GET unprinted queue
  src/app/api/orders/[id]/mark-printed/route.ts ← PATCH mark printed
  src/lib/escpos-web.ts                   ← browser ESC/POS builder (for Option B)
  src/hooks/useBluetoothPrinter.ts        ← Web BT hook (for Option B)
  kot-agent/index.js                      ← polling agent (NOT deployed to Vercel)
  kot-agent/escpos.js                     ← Node ESC/POS builder
  kot-agent/config.json                   ← gitignored (has secrets + IP)
  kot-agent/package.json
  .env.local (add PRINT_AGENT_SECRET)
```

---

*Say **"go phase 1"** to implement the backend DB + API changes.  
Say **"go phase 2"** to create the WiFi print agent files.  
Say **"go phase 3"** to implement the browser Bluetooth option.*
