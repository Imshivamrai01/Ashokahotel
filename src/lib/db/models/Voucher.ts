import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVoucher extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description?: string;
  discountType: "flat" | "percent";
  discountValue: number;
  minBillAmount?: number;
  maxDiscountAmount?: number;
  customerPhone?: string; // Optional: Restricted to specific customer
  validFrom: Date;
  validTill: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: ["flat", "percent"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minBillAmount: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    customerPhone: { type: String, trim: true, index: true },
    validFrom: { type: Date, default: Date.now },
    validTill: { type: Date, required: true },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Voucher: Model<IVoucher> =
  mongoose.models.Voucher ||
  mongoose.model<IVoucher>("Voucher", VoucherSchema);
