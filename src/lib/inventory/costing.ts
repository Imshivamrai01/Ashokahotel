import type { ClientSession } from "mongoose";
import Recipe, { type IRecipeDoc } from "@/lib/db/models/inventory/Recipe";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { toBase } from "@/lib/inventory/units";

export interface RawDeduction {
  inventoryItemId: string;
  qtyBase: number; // stock unit, for ONE portion × orderedQty already applied
  unitCost: number;
}

/**
 * Explode a menu item's recipe into raw stock deductions for `orderedQty`
 * portions. Sub-recipe components deduct the sub's OWN stocked output (the prep
 * was made earlier in a batch) rather than re-exploding to raws — that keeps
 * sale-time deduction simple and correct. Returns [] if the item has no recipe.
 *
 * Component qty is the TOTAL for the recipe batch; per-portion = qty / yieldQty.
 * Yield% (trim loss) inflates raw-item consumption.
 */
export async function explodeForDeduction(
  menuItemId: string,
  orderedQty: number,
  session?: ClientSession,
): Promise<RawDeduction[]> {
  const recipe = await Recipe.findOne({
    kind: "menu",
    menuItemId,
    isActive: true,
  }).session(session ?? null);
  if (!recipe || recipe.components.length === 0) return [];

  const out: RawDeduction[] = [];
  for (const c of recipe.components) {
    const perPortion = c.qty / (recipe.yieldQty || 1);
    const totalUnits = perPortion * orderedQty;

    if (c.kind === "item" && c.inventoryItemId) {
      const item = await InventoryItem.findById(c.inventoryItemId).session(
        session ?? null,
      );
      if (!item) continue;
      const yieldFactor = (item.yieldPercent || 100) / 100;
      const qtyBase = toBase(totalUnits, c.unit) / yieldFactor;
      out.push({
        inventoryItemId: String(item._id),
        qtyBase,
        unitCost: item.avgCost,
      });
    } else if (c.kind === "sub" && c.subRecipeId) {
      const sub = await Recipe.findById(c.subRecipeId).session(session ?? null);
      if (!sub?.outputItemId) continue;
      const outItem = await InventoryItem.findById(sub.outputItemId).session(
        session ?? null,
      );
      if (!outItem) continue;
      const qtyBase = toBase(totalUnits, c.unit);
      out.push({
        inventoryItemId: String(outItem._id),
        qtyBase,
        unitCost: outItem.avgCost,
      });
    }
  }
  return out;
}

/**
 * Cost to produce ONE yield unit of a recipe (menu portion or sub batch unit).
 * Recurses through sub-recipes. Guards against cycles via a visited set.
 */
export async function recipeCostPerYield(
  recipe: IRecipeDoc,
  visited = new Set<string>(),
): Promise<number> {
  const rid = String(recipe._id);
  if (visited.has(rid)) return 0; // cycle guard
  visited.add(rid);

  let total = 0;
  for (const c of recipe.components) {
    const perYield = c.qty / (recipe.yieldQty || 1);
    if (c.kind === "item" && c.inventoryItemId) {
      const item = await InventoryItem.findById(c.inventoryItemId);
      if (!item) continue;
      const yieldFactor = (item.yieldPercent || 100) / 100;
      total += (toBase(perYield, c.unit) / yieldFactor) * item.avgCost;
    } else if (c.kind === "sub" && c.subRecipeId) {
      const sub = await Recipe.findById(c.subRecipeId);
      if (!sub) continue;
      const subUnitCost = await recipeCostPerYield(sub, visited);
      // subUnitCost is per sub yield unit; component qty is in that unit.
      total += perYield * subUnitCost;
    }
  }
  return total;
}
