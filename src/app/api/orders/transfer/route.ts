import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";
import { withTransaction } from "@/lib/db/withTransaction";

// POST /api/orders/transfer — move all active orders from one table to another.
// Merge-capable: if the target table is already occupied, the moved orders join
// its existing bill. The source table is freed once it has no active orders left.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "cashier", "captain"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fromTableId, toTableId } = await req.json();
  if (!fromTableId || !toTableId) {
    return NextResponse.json(
      { error: "fromTableId and toTableId required" },
      { status: 400 },
    );
  }
  if (fromTableId === toTableId) {
    return NextResponse.json(
      { error: "Source and target tables are the same" },
      { status: 400 },
    );
  }

  await connectDB();

  const toTable = await Location.findById(toTableId);
  if (!toTable || !toTable.isActive) {
    return NextResponse.json(
      { error: "Target table not found" },
      { status: 404 },
    );
  }
  const wasOccupied = toTable.isOccupied;

  try {
    const moved = await withTransaction(async (s) => {
    // Active orders currently on the source table (read inside the txn so a
    // concurrent billing/transfer can't move/clear them out from under us).
    const orders = await Order.find({
      tableId: fromTableId,
      status: { $nin: ["cleared", "paid", "cancelled"] },
    }).session(s);

    if (orders.length === 0) {
      throw new Error("No active orders on the source table");
    }

    for (const o of orders) {
      o.transferredFrom = o.tableLabel;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      o.tableId = toTable._id as any;
      o.tableLabel = toTable.label;
      await o.save({ session: s });
    }

    // Target holds orders → occupied. Free source if nothing active remains.
    await Location.findByIdAndUpdate(
      toTableId,
      { isOccupied: true },
      { session: s },
    );
    const remaining = await Order.countDocuments({
      tableId: fromTableId,
      status: { $nin: ["cleared", "paid", "cancelled"] },
    }).session(s);
    if (remaining === 0) {
      await Location.findByIdAndUpdate(
        fromTableId,
        { isOccupied: false },
        { session: s },
      );
    }
      return orders.length;
    });

    return NextResponse.json({ success: true, moved, merged: wasOccupied });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transfer failed" },
      { status: 400 },
    );
  }
}
