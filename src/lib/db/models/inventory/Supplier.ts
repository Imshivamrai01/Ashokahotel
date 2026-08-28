import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISupplierDoc extends Document {
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  paymentTermsDays?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplierDoc>(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, lowercase: true },
    gstin: { type: String },
    address: { type: String },
    paymentTermsDays: { type: Number },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

SupplierSchema.index({ name: 1 });

const Supplier: Model<ISupplierDoc> =
  mongoose.models.Supplier ||
  mongoose.model<ISupplierDoc>("Supplier", SupplierSchema);

export default Supplier;
