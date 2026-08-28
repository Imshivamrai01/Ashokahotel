import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISupplierPaymentDoc extends Document {
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  amount: number;
  method: "cash" | "bank" | "upi" | "cheque" | "other";
  note?: string;
  paidBy?: mongoose.Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
}

const SupplierPaymentSchema = new Schema<ISupplierPaymentDoc>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "bank", "upi", "cheque", "other"],
      default: "cash",
    },
    note: { type: String },
    paidBy: { type: Schema.Types.ObjectId },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SupplierPaymentSchema.index({ supplierId: 1, paidAt: -1 });

const SupplierPayment: Model<ISupplierPaymentDoc> =
  mongoose.models.SupplierPayment ||
  mongoose.model<ISupplierPaymentDoc>("SupplierPayment", SupplierPaymentSchema);

export default SupplierPayment;
