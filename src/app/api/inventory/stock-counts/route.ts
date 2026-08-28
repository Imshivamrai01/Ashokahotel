import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import StockCount from "@/lib/db/models/inventory/StockCount";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { nextNumber } from "@/lib/inventory/numbering";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const list = await StockCount.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(list);
}

// Open a new count — snapshot current stock for all active items as the baseline.
export async function POST() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const items = await InventoryItem.find({ isActive: true })
    .sort({ category: 1, name: 1 })
    .lean();
  const lines = items.map((it) => ({
    inventoryItemId: it._id,
    name: it.name,
    unit: it.stockUnit,
    systemQty: it.currentStock,
    countedQty: it.currentStock,
    varianceQty: 0,
    varianceValue: 0,
  }));
  const countNumber = await nextNumber("SC");
  const count = await StockCount.create({
    countNumber,
    status: "open",
    lines,
    countedBy: g.user.id,
  });
  return NextResponse.json(count, { status: 201 });
}
