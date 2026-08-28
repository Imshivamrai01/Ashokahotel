import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import type { IOrder } from "@/types";

// GET /api/orders/active — for KDS polling
export async function GET() {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "kitchen", "receptionist"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const orders = await Order.find({
    isCaptainConfirmed: { $ne: false },
    status: {
      $in: [
        "pending",
        "preparing",
        "partially_ready",
        "ready",
        "partially_delivered",
        "delivered",
      ],
      $nin: ["cancelled", "pending_captain"],
    },
  })
    .sort({ createdAt: 1 })
    .lean<IOrder[]>();

  return NextResponse.json(orders);
}
