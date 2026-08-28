import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import Item from "@/lib/db/models/Item";

// Menu items, for the recipe editor (inventory_manager has no /api/admin access).
export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const items = await Item.find({})
    .select("_id name price discountPrice trackInventory categoryId imageUrl")
    .sort({ name: 1 })
    .lean();
  return NextResponse.json(items);
}

// Toggle inventory tracking for a menu item. Body: { id, trackInventory }
export async function PATCH(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id, trackInventory } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await connectDB();
  const updated = await Item.findByIdAndUpdate(
    id,
    { trackInventory: !!trackInventory },
    { new: true },
  )
    .select("_id trackInventory")
    .lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
