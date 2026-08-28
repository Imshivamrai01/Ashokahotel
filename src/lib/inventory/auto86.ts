import Item from "@/lib/db/models/Item";
import Recipe from "@/lib/db/models/inventory/Recipe";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { toBase } from "@/lib/inventory/units";

/**
 * Auto-86: after stock changes, disable menu items that can no longer be made
 * (any component out of stock). Best-effort, runs AFTER the order transaction
 * commits — never blocks a sale. Re-enabling on restock is manual by default.
 *
 * Pass the menu item ids touched by the sale; we only recompute those.
 */
export async function autoDisableOutOfStock(menuItemIds: string[]) {
  for (const id of menuItemIds) {
    try {
      const item = await Item.findById(id).select("_id isAvailable trackInventory");
      if (!item || !item.trackInventory || !item.isAvailable) continue;

      const recipe = await Recipe.findOne({ kind: "menu", menuItemId: id, isActive: true });
      if (!recipe || recipe.components.length === 0) continue;

      let canMake = true;
      for (const c of recipe.components) {
        const perPortion = c.qty / (recipe.yieldQty || 1);
        const refId =
          c.kind === "item" ? c.inventoryItemId : await subOutputId(c.subRecipeId);
        if (!refId) continue;
        const inv = await InventoryItem.findById(refId).select("currentStock yieldPercent");
        if (!inv) continue;
        const yieldFactor =
          c.kind === "item" ? (inv.yieldPercent || 100) / 100 : 1;
        const need = toBase(perPortion, c.unit) / yieldFactor;
        if (inv.currentStock < need) {
          canMake = false;
          break;
        }
      }

      if (!canMake) {
        item.isAvailable = false;
        await item.save();
      }
    } catch {
      // best-effort; never throw
    }
  }
}

async function subOutputId(subRecipeId?: unknown) {
  if (!subRecipeId) return null;
  const sub = await Recipe.findById(subRecipeId).select("outputItemId");
  return sub?.outputItemId ?? null;
}
