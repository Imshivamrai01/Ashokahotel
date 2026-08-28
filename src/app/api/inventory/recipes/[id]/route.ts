import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import Recipe from "@/lib/db/models/inventory/Recipe";
import { recipeCostPerYield } from "@/lib/inventory/costing";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  const recipe = await Recipe.findById(id);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.components) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipe.components = body.components.map((c: any) => ({
      kind: c.subRecipeId ? "sub" : "item",
      inventoryItemId: c.inventoryItemId || undefined,
      subRecipeId: c.subRecipeId || undefined,
      name: c.name,
      qty: Number(c.qty) || 0,
      unit: c.unit,
    }));
  }
  if (body.yieldQty != null) recipe.yieldQty = Number(body.yieldQty) || 1;
  if (body.subRecipeName != null) recipe.subRecipeName = body.subRecipeName;
  if (body.outputUnit != null) recipe.outputUnit = body.outputUnit;
  recipe.costCache = await recipeCostPerYield(recipe);
  await recipe.save();
  return NextResponse.json(recipe);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  await connectDB();
  await Recipe.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
