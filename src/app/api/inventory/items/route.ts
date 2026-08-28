import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { BASE_UNIT, UNIT_TO_BASE, type MeasureType } from "@/lib/inventory/units";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const items = await InventoryItem.find({ isActive: { $ne: false } })
    .sort({ category: 1, name: 1 })
    .lean();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!body.name || !body.measureType) {
    return NextResponse.json(
      { error: "name and measureType are required" },
      { status: 400 },
    );
  }
  const measureType = body.measureType as MeasureType;
  const stockUnit = BASE_UNIT[measureType];
  const purchaseUnit = body.purchaseUnit || stockUnit;
  // Derive purchase→stock factor from the unit table when possible.
  const purchaseToStock =
    UNIT_TO_BASE[purchaseUnit]?.type === measureType
      ? UNIT_TO_BASE[purchaseUnit].factor
      : Number(body.purchaseToStock) || 1;

  await connectDB();
  const item = await InventoryItem.create({
    name: body.name,
    sku: body.sku,
    category: body.category || "General",
    measureType,
    stockUnit,
    purchaseUnit,
    purchaseToStock,
    yieldPercent: body.yieldPercent ?? 100,
    reorderLevel: body.reorderLevel ?? 0,
    reorderQty: body.reorderQty,
    isPerishable: !!body.isPerishable,
    shelfLifeDays: body.shelfLifeDays,
    defaultSupplierId: body.defaultSupplierId || undefined,
    isDirectSale: !!body.isDirectSale,
    isActive: body.isActive ?? true,
  });
  return NextResponse.json(item, { status: 201 });
}
