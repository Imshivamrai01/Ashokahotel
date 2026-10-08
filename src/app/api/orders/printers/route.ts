import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import PrintStation, {
  PRINT_STATION_ID,
  type IStationPrinter,
} from "@/lib/db/models/PrintStation";
import { authorizePrintAgent } from "@/lib/print-auth";

export const dynamic = "force-dynamic";

// The agent reports every ~60s; treat it as offline after a few missed beats.
const AGENT_OFFLINE_MS = 3 * 60 * 1000;
const TRANSPORTS = ["usb", "tcp", "bt"] as const;

function cleanPrinters(input: unknown): IStationPrinter[] {
  if (!Array.isArray(input)) return [];
  const out: IStationPrinter[] = [];
  for (const raw of input.slice(0, 12)) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.slice(0, 300) : "";
    const transport = TRANSPORTS.find((t) => t === p.transport);
    if (!id || !transport || out.some((x) => x.id === id)) continue;
    out.push({
      id,
      transport,
      name: (typeof p.name === "string" ? p.name : "Printer").slice(0, 120),
      address: (typeof p.address === "string" ? p.address : "").slice(0, 120),
      usable: p.usable === true,
    });
  }
  return out;
}

// ─── GET /api/orders/printers ────────────────────────────────────────────────
// Printers the agent can see + which one prints invoices. For the picker in the
// admin / reception panels.
export async function GET(req: NextRequest) {
  const authz = await authorizePrintAgent(req, ["admin", "receptionist", "cashier"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }
  await connectDB();
  const station = await PrintStation.findById(PRINT_STATION_ID).lean();
  const lastSeenAt = station?.lastSeenAt ?? null;
  return NextResponse.json({
    printers: station?.printers ?? [],
    billPrinterId: station?.billPrinterId ?? "",
    lastSeenAt,
    agentOnline: !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < AGENT_OFFLINE_MS,
  });
}

// ─── POST /api/orders/printers ───────────────────────────────────────────────
// Agent heartbeat: replaces the printer list, returns the invoice-printer choice.
// Agent token only — no staff role may overwrite the list.
export async function POST(req: NextRequest) {
  const authz = await authorizePrintAgent(req, []);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }
  const body = await req.json().catch(() => null);
  const printers = cleanPrinters(body?.printers);

  await connectDB();
  const station = await PrintStation.findByIdAndUpdate(
    PRINT_STATION_ID,
    { $set: { printers, lastSeenAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return NextResponse.json({ billPrinterId: station?.billPrinterId ?? "" });
}

// ─── PATCH /api/orders/printers ──────────────────────────────────────────────
// Staff choose which printer prints invoices. "" = let the agent use its first one.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "receptionist"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const billPrinterId = typeof body?.billPrinterId === "string" ? body.billPrinterId : null;
  if (billPrinterId === null) {
    return NextResponse.json({ error: "billPrinterId is required" }, { status: 400 });
  }

  await connectDB();
  const station = await PrintStation.findById(PRINT_STATION_ID);
  if (billPrinterId && !station?.printers.some((p) => p.id === billPrinterId)) {
    return NextResponse.json({ error: "That printer is not connected" }, { status: 400 });
  }
  await PrintStation.findByIdAndUpdate(
    PRINT_STATION_ID,
    { $set: { billPrinterId } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return NextResponse.json({ success: true, billPrinterId });
}
