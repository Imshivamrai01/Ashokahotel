import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  await connectDB();
  const item = await InventoryItem.findById(id).lean();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  await connectDB();

  // Only editable fields — never touch currentStock/avgCost here (ledger owns those).
  const allowed = [
    "name",
    "sku",
    "category",
    "purchaseUnit",
    "purchaseToStock",
    "yieldPercent",
    "reorderLevel",
    "reorderQty",
    "isPerishable",
    "shelfLifeDays",
    "defaultSupplierId",
    "isDirectSale",
    "isActive",
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  const updated = await InventoryItem.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  await connectDB();
  // Soft-delete: keep ledger history intact.
  const updated = await InventoryItem.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
