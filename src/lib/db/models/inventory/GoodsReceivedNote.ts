import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGRNLine {
  inventoryItemId: mongoose.Types.ObjectId;
  name: string;
  qtyReceived: number; // purchase unit
  unit: string;
  rate: number; // per purchase unit
  amount: number;
  qtyOrdered?: number;
  batchNo?: string;
  expiryDate?: Date;
  qtyVariance?: number;
  priceVariance?: number;
}

export interface IGoodsReceivedNoteDoc extends Document {
  grnNumber: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  lines: IGRNLine[];
  total: number;
  notes?: string;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt: Date;
  createdAt: Date;
}

const GRNLineSchema = new Schema<IGRNLine>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    name: { type: String, required: true },
    qtyReceived: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true },
    qtyOrdered: { type: Number },
    batchNo: { type: String },
    expiryDate: { type: Date },
    qtyVariance: { type: Number },
    priceVariance: { type: Number },
  },
  { _id: false },
);

const GoodsReceivedNoteSchema = new Schema<IGoodsReceivedNoteDoc>(
  {
    grnNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    lines: { type: [GRNLineSchema], required: true },
    total: { type: Number, required: true },
    notes: { type: String },
    receivedBy: { type: Schema.Types.ObjectId },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

GoodsReceivedNoteSchema.index({ supplierId: 1, receivedAt: -1 });
GoodsReceivedNoteSchema.index({ purchaseOrderId: 1 });

const GoodsReceivedNote: Model<IGoodsReceivedNoteDoc> =
  mongoose.models.GoodsReceivedNote ||
  mongoose.model<IGoodsReceivedNoteDoc>(
    "GoodsReceivedNote",
    GoodsReceivedNoteSchema,
  );

export default GoodsReceivedNote;
