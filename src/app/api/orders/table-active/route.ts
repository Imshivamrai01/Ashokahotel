import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");
    const locationCode = searchParams.get("locationCode");

    if (!tableId && !locationCode) {
      return NextResponse.json({ activeOrders: [] });
    }

    await connectDB();

    // Resolve location
    let targetTableId: mongoose.Types.ObjectId | null = null;
    let targetLabel = "";

    if (tableId && mongoose.Types.ObjectId.isValid(tableId)) {
      targetTableId = new mongoose.Types.ObjectId(tableId);
    } else if (tableId || locationCode) {
      const query = locationCode || tableId;
      const loc = await Location.findOne({
        $or: [
          { code: query },
          { label: query },
          { label: `Table ${query}` },
          { label: new RegExp(`^Table\\s*${query}$`, "i") },
        ],
      }).lean();
      if (loc) {
        targetTableId = loc._id as mongoose.Types.ObjectId;
        targetLabel = loc.label;
      }
    }

    if (!targetTableId) {
      return NextResponse.json({ activeOrders: [] });
    }

    // Active orders are those not paid or cleared or cancelled
    const activeOrders = await Order.find({
      tableId: targetTableId,
      status: {
        $in: [
          "pending_captain",
          "pending",
          "preparing",
          "partially_ready",
          "ready",
          "partially_delivered",
          "delivered",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = activeOrders.map((o) => ({
      _id: String(o._id),
      kotNumber: o.kotNumber,
      tableLabel: o.tableLabel || targetLabel,
      status: o.status,
      isCaptainConfirmed: !!o.isCaptainConfirmed,
      specialInstructions: o.specialInstructions,
      createdAt: o.createdAt,
      total: o.total,
      items: (o.items || [])
        .filter((it) => it.itemStatus !== "cancelled")
        .map((it) => ({
          _id: String(it._id),
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          itemStatus: it.itemStatus,
          isVegetarian: it.isVegetarian,
          notes: it.notes,
        })),
    }));

    return NextResponse.json({
      activeOrders: formatted,
    });
  } catch (err: unknown) {
    console.error("GET /api/orders/table-active error:", err);
    return NextResponse.json({ activeOrders: [] }, { status: 500 });
  }
}
