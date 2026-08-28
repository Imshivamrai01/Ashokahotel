import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Append-only stock ledger — the single source of truth. Every change to stock
 * is one immutable movement. `InventoryItem.currentStock` is a cached running
 * balance derived from these. Corrections are new compensating entries, never
 * edits.
 */
export type StockMovementType =
  | "purchase_in"
  | "sale_out"
  | "wastage_out"
  | "adjustment"
  | "production_in"
  | "production_out"
  | "transfer_in"
  | "transfer_out"
  | "return_out"
  | "reversal";

export type StockRefType =
  | "order"
  | "grn"
  | "wastage"
  | "stock_count"
  | "production"
  | "return"
  | "adjustment";

export interface IStockMovementDoc extends Document {
  inventoryItemId: mongoose.Types.ObjectId;
  type: StockMovementType;
  qtyBase: number; // signed: +in / -out, in the item's stock unit
  unitCost: number; // cost per stock unit at time of movement
  balanceAfter: number; // running balance snapshot (audit)
  refType?: StockRefType;
  refId?: mongoose.Types.ObjectId;
  orderItemId?: mongoose.Types.ObjectId; // for targeting sale reversals
  reason?: string;
  byUser?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovementDoc>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "purchase_in",
        "sale_out",
        "wastage_out",
        "adjustment",
        "production_in",
        "production_out",
        "transfer_in",
        "transfer_out",
        "return_out",
        "reversal",
      ],
      required: true,
    },
    qtyBase: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    balanceAfter: { type: Number, required: true },
    refType: {
      type: String,
      enum: [
        "order",
        "grn",
        "wastage",
        "stock_count",
        "production",
        "return",
        "adjustment",
      ],
    },
    refId: { type: Schema.Types.ObjectId },
    orderItemId: { type: Schema.Types.ObjectId },
    reason: { type: String },
    byUser: { type: Schema.Types.ObjectId },
    branchId: { type: Schema.Types.ObjectId, ref: "Location" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

StockMovementSchema.index({ inventoryItemId: 1, createdAt: -1 });
StockMovementSchema.index({ refType: 1, refId: 1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

const StockMovement: Model<IStockMovementDoc> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovementDoc>("StockMovement", StockMovementSchema);

export default StockMovement;
