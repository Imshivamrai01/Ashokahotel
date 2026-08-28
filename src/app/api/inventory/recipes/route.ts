import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import Recipe from "@/lib/db/models/inventory/Recipe";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { recipeCostPerYield } from "@/lib/inventory/costing";
import { unitMeasureType, BASE_UNIT } from "@/lib/inventory/units";

export async function GET(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const menuItemId = searchParams.get("menuItemId");
  const kind = searchParams.get("kind");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: Record<string, any> = {};
  if (menuItemId) q.menuItemId = menuItemId;
  if (kind) q.kind = kind;
  const recipes = await Recipe.find(q).sort({ updatedAt: -1 }).lean();
  return NextResponse.json(menuItemId ? (recipes[0] ?? null) : recipes);
}

// Create/replace a recipe. Menu recipes upsert by menuItemId.
export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components = (body.components ?? []).map((c: any) => ({
    kind: c.subRecipeId ? "sub" : "item",
    inventoryItemId: c.inventoryItemId || undefined,
    subRecipeId: c.subRecipeId || undefined,
    name: c.name,
    qty: Number(c.qty) || 0,
    unit: c.unit,
  }));
  const yieldQty = Number(body.yieldQty) || 1;

  if (body.kind === "sub") {
    const outputUnit = body.outputUnit || "g";
    const mt = unitMeasureType(outputUnit) ?? "weight";
    // Ensure a stocked output item exists for this sub-recipe.
    let outputItemId = body.outputItemId;
    if (!outputItemId) {
      const out = await InventoryItem.create({
        name: body.subRecipeName,
        category: "Prep",
        measureType: mt,
        stockUnit: BASE_UNIT[mt],
        purchaseUnit: BASE_UNIT[mt],
        purchaseToStock: 1,
        isSubRecipe: true,
        isPerishable: body.shelfLifeDays ? true : false,
        shelfLifeDays: body.shelfLifeDays || undefined,
      });
      outputItemId = out._id;
    }
    const recipe = await Recipe.create({
      kind: "sub",
      subRecipeName: body.subRecipeName,
      outputItemId,
      outputUnit,
      yieldQty,
      components,
    });
    recipe.costCache = await recipeCostPerYield(recipe);
    await recipe.save();
    return NextResponse.json(recipe, { status: 201 });
  }

  // Menu recipe — upsert by menuItemId
  if (!body.menuItemId)
    return NextResponse.json({ error: "menuItemId required" }, { status: 400 });
  const recipe = await Recipe.findOneAndUpdate(
    { kind: "menu", menuItemId: body.menuItemId },
    { kind: "menu", menuItemId: body.menuItemId, yieldQty, components, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  recipe.costCache = await recipeCostPerYield(recipe);
  await recipe.save();
  return NextResponse.json(recipe, { status: 201 });
}
