import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import StockMovement from "@/lib/db/models/inventory/StockMovement";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";

export async function GET(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Number(searchParams.get("pageSize")) || 25);
  const type = searchParams.get("type");
  const itemId = searchParams.get("itemId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: Record<string, any> = {};
  if (type && type !== "all") q.type = type;
  if (itemId) q.inventoryItemId = itemId;
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to + "T23:59:59.999Z");
  }

  const total = await StockMovement.countDocuments(q);
  const movements = await StockMovement.find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  // Attach item names/units for display + export.
  const ids = [...new Set(movements.map((m) => String(m.inventoryItemId)))];
  const items = await InventoryItem.find({ _id: { $in: ids } })
    .select("name stockUnit")
    .lean();
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const rows = movements.map((m) => ({
    ...m,
    itemName: byId.get(String(m.inventoryItemId))?.name ?? "?",
    stockUnit: byId.get(String(m.inventoryItemId))?.stockUnit ?? "",
  }));

  return NextResponse.json({ rows, total });
}
