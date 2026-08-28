import type { ClientSession } from "mongoose";
import Item from "@/lib/db/models/Item";
import { explodeForDeduction } from "@/lib/inventory/costing";
import { applyMovement } from "@/lib/inventory/stock";

/**
 * Deduct raw materials for an order's lines. Runs INSIDE the order's
 * transaction so stock + order commit atomically. Idempotent per line
 * (`stockDeducted` guard). NC items still deduct — the dish is made & served.
 * Never throws on missing recipe — a sale is never blocked by inventory config.
 *
 * Mutates `order.items[*].stockDeducted` / `stockMovementIds`; caller must save
 * the order within the same session afterwards.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deductForOrder(order: any, byUser: string, session: ClientSession) {
  // Which menu items track inventory?
  const itemIds = order.items
    .filter((l: any) => !l.stockDeducted && l.itemStatus !== "cancelled") // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((l: any) => String(l.itemId)); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (itemIds.length === 0) return;
  const menuItems = await Item.find({ _id: { $in: itemIds } })
    .select("_id trackInventory")
    .session(session)
    .lean();
  const tracked = new Set(
    menuItems.filter((m) => m.trackInventory).map((m) => String(m._id)),
  );

  for (const line of order.items) {
    if (line.stockDeducted || line.itemStatus === "cancelled") continue;
    if (!tracked.has(String(line.itemId))) continue;
    await deductLine(line, byUser, session);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deductLine(line: any, byUser: string, session: ClientSession) {
  const scale = line.variationScale ?? 1;
  const raws = await explodeForDeduction(
    String(line.itemId),
    line.quantity * scale,
    session,
  );
  const ids = [];
  for (const r of raws) {
    const mv = await applyMovement(
      {
        inventoryItemId: r.inventoryItemId,
        type: "sale_out",
        qtyBase: -Math.abs(r.qtyBase),
        unitCost: r.unitCost,
        refType: "order",
        orderItemId: String(line._id),
        byUser,
      },
      session,
    );
    ids.push(mv._id);
  }
  // Add-on ingredients (e.g. extra cheese 30g) deduct per line quantity.
  for (const a of line.addons ?? []) {
    if (!a.inventoryItemId || !a.qtyBase) continue;
    const mv = await applyMovement(
      {
        inventoryItemId: String(a.inventoryItemId),
        type: "sale_out",
        qtyBase: -Math.abs(a.qtyBase * line.quantity),
        refType: "order",
        orderItemId: String(line._id),
        reason: `Add-on: ${a.name}`,
        byUser,
      },
      session,
    );
    ids.push(mv._id);
  }
  if (ids.length === 0) {
    // No recipe + no add-on stock → leave undeducted; surfaced in reports.
    return;
  }
  line.stockDeducted = true;
  line.stockMovementIds = ids;
}

/**
 * Reverse a previously-deducted line (cancel / void / qty-down). Re-explodes the
 * recipe and books a restoring movement. If `asWastage` (the dish was already
 * cooked), it also books an equal wastage_out so net stock is unchanged but the
 * consumption is correctly categorized as wastage, not a sale.
 */
export async function reverseLine(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  line: any,
  byUser: string,
  session: ClientSession,
  asWastage = false,
) {
  if (!line.stockDeducted) return;
  const scale = line.variationScale ?? 1;
  const raws = await explodeForDeduction(
    String(line.itemId),
    line.quantity * scale,
    session,
  );
  // Add-on ingredients restored alongside recipe ingredients.
  const addonRaws = (line.addons ?? [])
    .filter((a: { inventoryItemId?: unknown; qtyBase?: number }) => a.inventoryItemId && a.qtyBase)
    .map((a: { inventoryItemId: unknown; qtyBase: number }) => ({
      inventoryItemId: String(a.inventoryItemId),
      qtyBase: a.qtyBase * line.quantity,
      unitCost: 0,
    }));
  for (const r of [...raws, ...addonRaws]) {
    await applyMovement(
      {
        inventoryItemId: r.inventoryItemId,
        type: "reversal",
        qtyBase: Math.abs(r.qtyBase),
        unitCost: r.unitCost,
        refType: "order",
        orderItemId: String(line._id),
        reason: "Order line cancelled/reversed",
        byUser,
      },
      session,
    );
    if (asWastage) {
      await applyMovement(
        {
          inventoryItemId: r.inventoryItemId,
          type: "wastage_out",
          qtyBase: -Math.abs(r.qtyBase),
          unitCost: r.unitCost,
          refType: "wastage",
          reason: "Cancelled after cooking",
          byUser,
        },
        session,
      );
    }
  }
  line.stockDeducted = false;
  line.stockMovementIds = undefined;
}
