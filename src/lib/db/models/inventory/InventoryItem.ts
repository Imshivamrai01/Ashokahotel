import mongoose, { Schema, Document, Model } from "mongoose";
import type { MeasureType } from "@/lib/inventory/units";

/**
 * A stockable thing: a raw ingredient (Tomato, Oil), a direct-sale good
 * (bottled water), or a semi-finished sub-recipe batch (Gravy Base).
 * All quantities are stored in `stockUnit` (the base unit of `measureType`).
 */
export interface IInventoryItemDoc extends Document {
  name: string;
  sku?: string;
  category: string;
  measureType: MeasureType;
  stockUnit: string; // base unit, e.g. "g"
  purchaseUnit: string; // e.g. "kg"
  purchaseToStock: number; // factor purchase→stock (kg→g = 1000)
  yieldPercent: number; // usable % after trim (default 100)
  currentStock: number; // cached running balance in stockUnit
  avgCost: number; // moving-average cost per stockUnit
  reorderLevel: number; // low-stock threshold, in stockUnit
  reorderQty?: number; // suggested PO qty, in purchaseUnit
  isPerishable: boolean;
  shelfLifeDays?: number;
  defaultSupplierId?: mongoose.Types.ObjectId;
  isDirectSale: boolean; // sold 1:1 as a menu item (no recipe)
  isSubRecipe: boolean; // produced via a sub-recipe batch
  lastProducedAt?: Date; // last production batch (for prep expiry)
  lastReceivedAt?: Date; // last GRN receipt (for raw-ingredient expiry)
  lowStockNotified?: boolean; // dedup flag for low-stock push alerts
  isActive: boolean;
  branchId?: mongoose.Types.ObjectId; // future multi-outlet (null = main)
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItemDoc>(
  {
    name: { type: String, required: true },
    sku: { type: String },
    category: { type: String, default: "General" },
    measureType: {
      type: String,
      enum: ["weight", "volume", "count"],
      required: true,
    },
    stockUnit: { type: String, required: true },
    purchaseUnit: { type: String, required: true },
    purchaseToStock: { type: Number, required: true, default: 1 },
    yieldPercent: { type: Number, default: 100, min: 1, max: 100 },
    currentStock: { type: Number, default: 0 },
    avgCost: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    reorderQty: { type: Number },
    isPerishable: { type: Boolean, default: false },
    shelfLifeDays: { type: Number },
    defaultSupplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    isDirectSale: { type: Boolean, default: false },
    isSubRecipe: { type: Boolean, default: false },
    lastProducedAt: { type: Date },
    lastReceivedAt: { type: Date },
    lowStockNotified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Location" },
  },
  { timestamps: true },
);

InventoryItemSchema.index({ name: 1 });
InventoryItemSchema.index({ category: 1, isActive: 1 });
InventoryItemSchema.index({ currentStock: 1 });

const InventoryItem: Model<IInventoryItemDoc> =
  mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItemDoc>("InventoryItem", InventoryItemSchema);

export default InventoryItem;
