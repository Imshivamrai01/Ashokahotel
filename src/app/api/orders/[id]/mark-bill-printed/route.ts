import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { authorizePrintAgent } from "@/lib/print-auth";

export const dynamic = "force-dynamic";

// PATCH /api/orders/[id]/mark-bill-printed — agent confirms the bill printed.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizePrintAgent(req, ["admin", "cashier"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }
  await connectDB();
  const order = await Order.findByIdAndUpdate(
    id,
    [
      {
        $set: {
          billPrinted: true,
          billPrintedAt: { $ifNull: ["$billPrintedAt", "$$NOW"] },
          billPrintAttempts: { $add: [{ $ifNull: ["$billPrintAttempts", 0] }, 1] },
        },
      },
    ],
    { new: true },
  ).lean();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
