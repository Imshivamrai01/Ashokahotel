import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { authorizePrintAgent } from "@/lib/print-auth";

export const dynamic = "force-dynamic";

// ─── PATCH /api/orders/[id]/mark-printed ──────────────────────────────────────
// Called by the print agent after a successful write to the printer (or by the
// kitchen UI after a manual reprint). Idempotent: re-marking an already-printed
// KOT bumps the attempt counter but preserves the first-print timestamp.
//
// Roles: admin + kitchen only. `captain` is deliberately excluded — it cannot
// read the print queue either, and allowing it would let any captain suppress
// an arbitrary order's KOT (set kotPrinted=true) via its id.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizePrintAgent(req, ["admin", "kitchen"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await connectDB();

  try {
    // Aggregation-pipeline update so kotPrintedAt is set only on the FIRST print
    // (per the model's documented semantics) while attempts always increments.
    const order = await Order.findByIdAndUpdate(
      id,
      [
        {
          $set: {
            kotPrinted: true,
            kotPrintedAt: { $ifNull: ["$kotPrintedAt", "$$NOW"] },
            kotPrintAttempts: {
              $add: [{ $ifNull: ["$kotPrintAttempts", 0] }, 1],
            },
          },
        },
      ],
      { new: true },
    ).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/orders/[id]/mark-printed]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
