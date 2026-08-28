import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBrandingDoc extends Document {
  restaurantName: string;
  logoUrl?: string;
  whatsappNumber: string;
  callNumber: string;
  tagline?: string;
  primaryColor: string;
  accentColor?: string;
  coverVideoUrl?: string;
  coverImageUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstEnabled?: boolean;
  gstNumber?: string;
  gstRatePercent?: number; // bill-level GST % applied to the whole order
  pricesIncludeTax?: boolean; // true = menu prices already include GST
  // Bill discount governance
  maxDiscountPercent?: number; // hard cap on any bill discount (default 20)
  discountRequiresReason?: boolean; // reason mandatory when discounting (default true)
  discountApprovalThresholdPercent?: number; // discounts above this need the PIN (default 10)
  managerPinHash?: string; // bcrypt hash of the manager override PIN
  updatedAt: Date;
}

const BrandingSchema = new Schema<IBrandingDoc>(
  {
    restaurantName: { type: String, required: true, default: "Ashoka Hotel" },
    logoUrl: { type: String },
    whatsappNumber: { type: String, required: true, default: "" },
    callNumber: { type: String, required: true, default: "" },
    tagline: { type: String },
    primaryColor: { type: String, default: "#f97316" },
    accentColor: { type: String },
    coverVideoUrl: { type: String },
    coverImageUrl: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    gstEnabled: { type: Boolean, default: false },
    gstNumber: { type: String },
    gstRatePercent: { type: Number, default: 5 },
    pricesIncludeTax: { type: Boolean, default: false },
    maxDiscountPercent: { type: Number, default: 20 },
    discountRequiresReason: { type: Boolean, default: true },
    discountApprovalThresholdPercent: { type: Number, default: 10 },
    managerPinHash: { type: String },
  },
  { timestamps: true },
);

const Branding: Model<IBrandingDoc> =
  mongoose.models.Branding ||
  mongoose.model<IBrandingDoc>("Branding", BrandingSchema);

export default Branding;
