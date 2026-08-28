import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import type { IOrder } from "@/types";

// GET /api/orders/captain?tableId=xxx — active orders for a table
export async function GET(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "captain", "receptionist"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get("tableId");
  const pendingOnly = searchParams.get("pendingOnly") === "true";

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (tableId) query.tableId = tableId;

  if (pendingOnly) {
    query.status = "pending_captain";
  } else {
    query.status = {
      $in: [
        "pending_captain",
        "pending",
        "preparing",
        "partially_ready",
        "ready",
        "partially_delivered",
        "delivered",
      ],
    };
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .lean<IOrder[]>();

  return NextResponse.json(orders);
}
