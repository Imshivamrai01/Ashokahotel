import mongoose, { Schema, Document, Model } from "mongoose";

export type CustomerTier = "new" | "regular" | "vip" | "platinum";

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  isMarried: boolean;
  dob?: Date;
  anniversaryDate?: Date;
  totalVisits: number;
  totalSpend: number;
  tier: CustomerTier;
  lastVisitAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function computeCustomerTier(visits: number, spend: number): CustomerTier {
  if (visits >= 10 || spend >= 10000) return "platinum";
  if (visits >= 5 || spend >= 5000) return "vip";
  if (visits >= 3 || spend >= 2000) return "regular";
  return "new";
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    isMarried: { type: Boolean, default: false },
    dob: { type: Date },
    anniversaryDate: { type: Date },
    totalVisits: { type: Number, default: 1, min: 0 },
    totalSpend: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ["new", "regular", "vip", "platinum"],
      default: "new",
    },
    lastVisitAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true },
);

// Auto-recalculate tier before save
CustomerSchema.pre("save", function () {
  this.tier = computeCustomerTier(this.totalVisits, this.totalSpend);
});

export const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
