import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { authorizePrintAgent } from "@/lib/print-auth";

// Polled by the print agent — never cache.
export const dynamic = "force-dynamic";

// ─── GET /api/orders/print-queue ──────────────────────────────────────────────
// Returns KOTs that have not been physically printed yet, created in the last
// 4 hours (safety window so a long-offline agent can't dump a whole day of
// stale tickets when it reconnects).
export async function GET(req: NextRequest) {
  const authz = await authorizePrintAgent(req, ["admin", "kitchen"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  await connectDB();

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const orders = await Order.find({
    // `false` (not `$ne:true`) so the {kotPrinted, createdAt} index can seek —
    // this is the hottest polled route. New orders default kotPrinted:false.
    kotPrinted: false,
    status: { $nin: ["cancelled", "pending_captain"] },
    isCaptainConfirmed: { $ne: false },
    createdAt: { $gte: fourHoursAgo },
  })
    .sort({ createdAt: 1 }) // oldest unprinted first
    .limit(50)
    // Only fields the KOT ticket actually renders — `total` is intentionally
    // excluded so the agent never receives monetary data it doesn't need.
    .select("kotNumber tableLabel captainName items specialInstructions createdAt")
    .lean();

  const queue = orders.map((o) => ({
    _id: o._id.toString(),
    kotNumber: o.kotNumber,
    tableLabel: o.tableLabel,
    captainName: o.captainName,
    items: (o.items ?? []).map((it) => ({
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
