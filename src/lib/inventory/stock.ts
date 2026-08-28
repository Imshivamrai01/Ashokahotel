import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import StockMovement, {
  type StockMovementType,
  type StockRefType,
} from "@/lib/db/models/inventory/StockMovement";

export interface ApplyMovementInput {
  inventoryItemId: string | mongoose.Types.ObjectId;
  type: StockMovementType;
  qtyBase: number; // signed: +in / -out, in stock unit
  unitCost?: number; // cost per stock unit (for inbound moving-average)
  refType?: StockRefType;
  refId?: string | mongoose.Types.ObjectId;
  orderItemId?: string | mongoose.Types.ObjectId;
  reason?: string;
  byUser?: string | mongoose.Types.ObjectId;
}

/**
 * The ONLY way stock changes. Appends a ledger movement, updates the cached
 * `currentStock`, and recomputes moving-average `avgCost` on inbound movements.
 * Must run inside a transaction (`session`) when bundled with an order/GRN write.
 *
 * Negative stock is allowed (a sale is never blocked) — it signals a missing
 * recipe or count error and is surfaced in reports, not enforced here.
 */
export async function applyMovement(
  input: ApplyMovementInput,
  session?: ClientSession,
) {
  const item = await InventoryItem.findById(input.inventoryItemId).session(
    session ?? null,
  );
  if (!item) throw new Error(`Inventory item not found: ${input.inventoryItemId}`);

  const balanceAfter = item.currentStock + input.qtyBase;

  // Moving-average cost on inbound (purchase / production / positive adjustment).
  const isInbound = input.qtyBase > 0;
  const cost = input.unitCost ?? item.avgCost;
  if (isInbound && (input.unitCost ?? 0) > 0) {
    const prevQty = Math.max(item.currentStock, 0);
    const prevVal = prevQty * item.avgCost;
    const inVal = input.qtyBase * (input.unitCost as number);
    const newQty = prevQty + input.qtyBase;
    item.avgCost = newQty > 0 ? (prevVal + inVal) / newQty : item.avgCost;
  }

  item.currentStock = balanceAfter;
  // Restocked above the alert level → re-arm the low-stock notification.
  if (isInbound && item.reorderLevel > 0 && balanceAfter > item.reorderLevel) {
    item.lowStockNotified = false;
  }
  await item.save({ session });

  const [movement] = await StockMovement.create(
    [
      {
        inventoryItemId: item._id,
        type: input.type,
        qtyBase: input.qtyBase,
        unitCost: cost,
        balanceAfter,
        refType: input.refType,
        refId: input.refId
          ? new mongoose.Types.ObjectId(String(input.refId))
          : undefined,
        orderItemId: input.orderItemId
          ? new mongoose.Types.ObjectId(String(input.orderItemId))
          : undefined,
        reason: input.reason,
        byUser: input.byUser
          ? new mongoose.Types.ObjectId(String(input.byUser))
          : undefined,
      },
    ],
    { session: session ?? undefined },
  );

  return movement;
}
