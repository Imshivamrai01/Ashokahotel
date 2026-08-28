import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Item from "@/lib/db/models/Item";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";
import { authorizePrintAgent } from "@/lib/print-auth";
import { nextDailyKotSeq } from "@/lib/db/models/Counter";
import { formatKotNumber, computeOrderTotals } from "@/lib/utils";

// ─── GET /api/orders/sync ───────────────────────────────────────────────────
// Returns active menu items for the offline POS
export async function GET(req: NextRequest) {
  const authz = await authorizePrintAgent(req, ["admin", "kitchen"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  await connectDB();
  const items = await Item.find({ isAvailable: true })
    .populate("categoryId", "name")
    .lean();
    
  const locations = await Location.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
    
  return NextResponse.json({ items, locations });
}

// ─── POST /api/orders/sync ──────────────────────────────────────────────────
// Receives an array of offline orders from the Printer App
export async function POST(req: NextRequest) {
  const authz = await authorizePrintAgent(req, ["admin", "kitchen"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  try {
    const { orders } = await req.json();
    if (!Array.isArray(orders)) {
      return NextResponse.json({ error: "orders must be an array" }, { status: 400 });
    }

    await connectDB();
    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingTodayCount = await Order.countDocuments({
      createdAt: { $gte: today },
    });

    for (const offlineOrder of orders) {
      const seq = await nextDailyKotSeq(existingTodayCount);
      const newKotNumber = formatKotNumber(seq);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsForDb = offlineOrder.items.map((it: any) => ({
        itemId: undefined,
        name: it.name,
        price: it.price || 0,
        quantity: it.quantity,
        notes: it.notes,
        isVegetarian: false,
        preparationTtlMinutes: 15,
        itemStatus: "pending",
        orderedAt: now,
        isNC: false,
        taxRate: 5,
      }));

      const newOrder = new Order({
        tableId: null,
        tableLabel: offlineOrder.tableLabel,
        captainId: null,
        captainName: offlineOrder.captainName,
        status: "active",
        kotNumber: newKotNumber,
        items: itemsForDb,
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentStatus: "unpaid",
        kotPrinted: true, // Already printed offline!
      });
      
      // Calculate totals
      const { subtotal, tax, total } = computeOrderTotals(newOrder.items as any);
      newOrder.subtotal = subtotal;
      newOrder.tax = tax;
      newOrder.total = total;
      
      await newOrder.save();

      // Ensure the table is marked occupied if we can find it by label
      const loc = await Location.findOne({ label: { $regex: new RegExp(`^${offlineOrder.tableLabel}$`, "i") } });
      if (loc && !loc.isOccupied) {
        loc.isOccupied = true;
        await loc.save();
      }
    }

    return NextResponse.json({ ok: true, synced: orders.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
