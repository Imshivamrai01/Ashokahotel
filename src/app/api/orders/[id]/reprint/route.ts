import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import PrintStation, { PRINT_STATION_ID } from "@/lib/db/models/PrintStation";

export const dynamic = "force-dynamic";

// Same threshold the printer picker uses to call the agent "online".
const AGENT_OFFLINE_MS = 3 * 60 * 1000;

// ─── POST /api/orders/[id]/reprint ───────────────────────────────────────────
// The Print button on a KOT card (kitchen panel on any phone/tablet/PC). Puts
// the KOT back in the print queue so the PC print agent prints it on the
// connected KOT printer(s) — the device that pressed the button needs no printer.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !["admin", "kitchen", "receptionist"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await connectDB();

  // Only orders the print queue will actually serve: never an unconfirmed guest
  // order, never a cancelled one.
  const order = await Order.findOneAndUpdate(
    {
      _id: id,
      status: { $nin: ["pending_captain", "cancelled"] },
      isCaptainConfirmed: { $ne: false },
    },
    {
      $set: { kotPrinted: false, kotReprintAt: new Date() },
      $inc: { kotReprintSeq: 1 },
    },
    { new: true },
  )
    .select("kotNumber")
    .lean();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const station = await PrintStation.findById(PRINT_STATION_ID).lean();
  const agentOnline =
    !!station?.lastSeenAt &&
    Date.now() - new Date(station.lastSeenAt).getTime() < AGENT_OFFLINE_MS;
  const printers = (station?.printers ?? []).filter((p) => p.usable).length;

  return NextResponse.json({
    success: true,
    kotNumber: order.kotNumber,
    agentOnline,
    printers,
  });
}
