import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { authorizePrintAgent } from "@/lib/print-auth";

// Polled by the print agent — never cache.
export const dynamic = "force-dynamic";

// ─── GET /api/orders/print-queue ──────────────────────────────────────────────
// Returns KOTs that have not been physically printed yet, created in the last
// 4 hours (safety window so a long-offline agent can't dump a whole day of
// stale tickets when it reconnects) — plus any KOT staff just asked to reprint.
export async function GET(req: NextRequest) {
  const authz = await authorizePrintAgent(req, ["admin", "kitchen"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  await connectDB();

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  // A reprint request is only honoured while it is fresh, so a press made while
  // the agent was off doesn't surprise the kitchen with a ticket hours later.
  const reprintWindow = new Date(Date.now() - 15 * 60 * 1000);

  const orders = await Order.find({
    // `false` (not `$ne:true`) so the {kotPrinted, createdAt} index can seek —
    // this is the hottest polled route. New orders default kotPrinted:false.
    kotPrinted: false,
    status: { $nin: ["cancelled", "pending_captain"] },
    isCaptainConfirmed: { $ne: false },
    $or: [
      { createdAt: { $gte: fourHoursAgo } },
      { kotReprintAt: { $gte: reprintWindow } },
    ],
  })
    .sort({ createdAt: 1 }) // oldest unprinted first
    .limit(50)
    // Only fields the KOT ticket actually renders — `total` is intentionally
    // excluded so the agent never receives monetary data it doesn't need.
    .select("kotNumber tableLabel captainName items specialInstructions createdAt kotReprintSeq")
    .lean();

  const queue = orders.map((o) => ({
    _id: o._id.toString(),
    // The agent prints each printKey once, so a reprint (new seq) prints again.
    printKey: `${o._id.toString()}:${o.kotReprintSeq ?? 0}`,
    reprint: (o.kotReprintSeq ?? 0) > 0,
    kotNumber: o.kotNumber,
    tableLabel: o.tableLabel,
    captainName: o.captainName,
    items: (o.items ?? [])
      .filter((it) => it.itemStatus !== "cancelled")
      .map((it) => ({
      name: it.name,
      quantity: it.quantity,
      notes: it.notes,
      isVegetarian: it.isVegetarian,
    })),
    specialInstructions: o.specialInstructions,
    createdAt: o.createdAt,
  }));

  return NextResponse.json(queue);
}
