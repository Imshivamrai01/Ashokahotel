import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchaseReturnLine {
  inventoryItemId: mongoose.Types.ObjectId;
  name: string;
  qty: number; // purchase unit
  unit: string;
  rate: number;
  amount: number;
}

export interface IPurchaseReturnDoc extends Document {
  returnNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  lines: IPurchaseReturnLine[];
  total: number;
  reason?: string;
  returnedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LineSchema = new Schema<IPurchaseReturnLine>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const PurchaseReturnSchema = new Schema<IPurchaseReturnDoc>(
  {
    returnNumber: { type: String, required: true, unique: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    lines: { type: [LineSchema], required: true },
    total: { type: Number, required: true },
    reason: { type: String },
    returnedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PurchaseReturnSchema.index({ supplierId: 1, createdAt: -1 });

const PurchaseReturn: Model<IPurchaseReturnDoc> =
  mongoose.models.PurchaseReturn ||
  mongoose.model<IPurchaseReturnDoc>("PurchaseReturn", PurchaseReturnSchema);

export default PurchaseReturn;
