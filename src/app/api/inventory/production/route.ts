import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import Recipe from "@/lib/db/models/inventory/Recipe";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import ProductionEntry from "@/lib/db/models/inventory/ProductionEntry";
import { withTransaction } from "@/lib/db/withTransaction";
import { applyMovement } from "@/lib/inventory/stock";
import { toBase } from "@/lib/inventory/units";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const list = await ProductionEntry.find({})
    .sort({ producedAt: -1 })
    .limit(100)
    .lean();
  return NextResponse.json(list);
}

// Make a batch of a sub-recipe. Body: { subRecipeId, batchQty } (batchQty in output unit).
export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  const batchQty = Number(body.batchQty) || 0;
  if (!body.subRecipeId || batchQty <= 0) {
    return NextResponse.json(
      { error: "subRecipeId and a positive batchQty are required" },
      { status: 400 },
    );
  }
  await connectDB();

  const recipe = await Recipe.findById(body.subRecipeId);
  if (!recipe || recipe.kind !== "sub" || !recipe.outputItemId) {
    return NextResponse.json({ error: "Sub-recipe not found" }, { status: 404 });
  }
  const outputItem = await InventoryItem.findById(recipe.outputItemId);
  if (!outputItem)
    return NextResponse.json({ error: "Output item missing" }, { status: 400 });

  // Producing batchQty output units; recipe components are TOTAL for yieldQty output.
  const scale = batchQty / (recipe.yieldQty || 1);

  // Resolve component consumption first (compute cost).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consume: { item: any; qtyBase: number; cost: number }[] = [];
  for (const c of recipe.components) {
    const refId =
      c.kind === "item"
        ? c.inventoryItemId
        : (await Recipe.findById(c.subRecipeId))?.outputItemId;
    if (!refId) continue;
    const item = await InventoryItem.findById(refId);
    if (!item) continue;
    const yieldFactor = c.kind === "item" ? (item.yieldPercent || 100) / 100 : 1;
    const qtyBase = (toBase(c.qty, c.unit) / yieldFactor) * scale;
    consume.push({ item, qtyBase, cost: qtyBase * item.avgCost });
  }
  const batchCost = consume.reduce((s, x) => s + x.cost, 0);
  const outQtyBase = toBase(batchQty, recipe.outputUnit || outputItem.stockUnit);
  const outUnitCost = outQtyBase > 0 ? batchCost / outQtyBase : 0;

  const entry = await withTransaction(async (s) => {
    for (const x of consume) {
      await applyMovement(
        {
          inventoryItemId: x.item._id,
          type: "production_out",
          qtyBase: -Math.abs(x.qtyBase),
          unitCost: x.item.avgCost,
          refType: "production",
          byUser: g.user.id,
        },
        s,
      );
    }
    await applyMovement(
      {
        inventoryItemId: outputItem._id,
        type: "production_in",
        qtyBase: outQtyBase,
        unitCost: outUnitCost,
        refType: "production",
        byUser: g.user.id,
      },
      s,
    );
    // Stamp production date for prep-expiry tracking.
    await InventoryItem.findByIdAndUpdate(
      outputItem._id,
      { lastProducedAt: new Date() },
      { session: s },
    );
    const [created] = await ProductionEntry.create(
      [
        {
          subRecipeId: recipe._id,
          subRecipeName: recipe.subRecipeName ?? outputItem.name,
          outputItemId: outputItem._id,
          batchQty,
          outputUnit: recipe.outputUnit ?? outputItem.stockUnit,
          batchCost,
          producedBy: g.user.id,
          producedAt: new Date(),
        },
      ],
      { session: s },
    );
    return created;
  });

  return NextResponse.json(entry, { status: 201 });
}
