import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { applyMovement } from "@/lib/inventory/stock";
import {
  BASE_UNIT,
  UNIT_TO_BASE,
  type MeasureType,
} from "@/lib/inventory/units";

/**
 * Bulk-create ingredients from parsed CSV rows.
 * Row: { name, category?, measureType, purchaseUnit?, reorderLevel?, openingStock?, cost? }
 * openingStock + reorderLevel are in the STOCK (base) unit. Skips existing names.
 */
export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0)
    return NextResponse.json({ error: "No rows" }, { status: 400 });

  await connectDB();
  let created = 0;
  const skipped: string[] = [];

  for (const r of rows) {
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    const mt = (["weight", "volume", "count"].includes(r.measureType)
      ? r.measureType
      : "weight") as MeasureType;
    const exists = await InventoryItem.findOne({ name });
    if (exists) {
      skipped.push(name);
      continue;
    }
    const purchaseUnit = r.purchaseUnit || BASE_UNIT[mt];
    const purchaseToStock =
      UNIT_TO_BASE[purchaseUnit]?.type === mt
        ? UNIT_TO_BASE[purchaseUnit].factor
        : 1;
    const cost = Number(r.cost) || 0;
    const opening = Number(r.openingStock) || 0;
    const item = await InventoryItem.create({
      name,
      category: r.category || "General",
      measureType: mt,
      stockUnit: BASE_UNIT[mt],
      purchaseUnit,
      purchaseToStock,
      reorderLevel: Number(r.reorderLevel) || 0,
      avgCost: cost,
      currentStock: 0,
    });
    if (opening > 0) {
      await applyMovement({
        inventoryItemId: String(item._id),
        type: "purchase_in",
        qtyBase: opening,
        unitCost: cost,
        refType: "adjustment",
        reason: "CSV import opening stock",
        byUser: g.user.id,
      });
    }
    created++;
  }

  return NextResponse.json({ created, skipped });
}
