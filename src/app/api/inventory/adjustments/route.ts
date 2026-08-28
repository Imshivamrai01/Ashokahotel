import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { withTransaction } from "@/lib/db/withTransaction";
import { applyMovement } from "@/lib/inventory/stock";
import { toBase } from "@/lib/inventory/units";

// Manual stock correction. Body: { inventoryItemId, newQty?, deltaQty?, unit?, reason }
// newQty/deltaQty are in `unit` (defaults to the item's stock unit).
export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  await connectDB();
  const item = await InventoryItem.findById(body.inventoryItemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const unit = body.unit || item.stockUnit;
  let delta: number;
  if (body.newQty != null) {
    delta = toBase(Number(body.newQty), unit) - item.currentStock;
  } else {
    delta = toBase(Number(body.deltaQty) || 0, unit);
  }
  if (delta === 0)
    return NextResponse.json({ error: "No change" }, { status: 400 });

  await withTransaction(async (s) => {
    await applyMovement(
      {
        inventoryItemId: item._id,
        type: "adjustment",
        qtyBase: delta,
        unitCost: item.avgCost,
        refType: "adjustment",
        reason: body.reason || "Manual adjustment",
        byUser: g.user.id,
      },
      s,
    );
  });
  return NextResponse.json({ ok: true });
}
