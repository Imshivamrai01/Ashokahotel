import mongoose, { Schema, Document, Model } from "mongoose";

export type POStatus =
  | "draft"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

export interface IPOLine {
  inventoryItemId: mongoose.Types.ObjectId;
  name: string;
  qty: number; // in purchase unit
  unit: string;
  rate: number; // per purchase unit
  amount: number;
  receivedQty?: number; // cumulative received (purchase unit)
}

export interface IPurchaseOrderDoc extends Document {
  poNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  status: POStatus;
  expectedDate?: Date;
  lines: IPOLine[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const POLineSchema = new Schema<IPOLine>(
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
    receivedQty: { type: Number, default: 0 },
  },
  { _id: false },
);

const PurchaseOrderSchema = new Schema<IPurchaseOrderDoc>(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "partially_received", "received", "cancelled"],
      default: "draft",
    },
    expectedDate: { type: Date },
    lines: { type: [POLineSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number },
    total: { type: Number, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

PurchaseOrderSchema.index({ supplierId: 1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });

const PurchaseOrder: Model<IPurchaseOrderDoc> =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrderDoc>("PurchaseOrder", PurchaseOrderSchema);

export default PurchaseOrder;
