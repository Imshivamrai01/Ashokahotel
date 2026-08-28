import mongoose, { Schema, Document, Model } from "mongoose";

export type WastageReason =
  | "spoilage"
  | "overproduction"
  | "spillage"
  | "expiry"
  | "staff_meal"
  | "training"
  | "other";

export interface IWastageLine {
  inventoryItemId: mongoose.Types.ObjectId;
  name: string;
  qty: number; // entered unit
  unit: string;
  qtyBase: number; // stock unit
  reason: WastageReason;
  costValue: number; // qtyBase * avgCost at time
}

export interface IWastageEntryDoc extends Document {
  lines: IWastageLine[];
  totalValue: number;
  notes?: string;
  wastedBy?: mongoose.Types.ObjectId;
  wastedAt: Date;
  createdAt: Date;
}

const WastageLineSchema = new Schema<IWastageLine>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    qtyBase: { type: Number, required: true },
    reason: {
      type: String,
      enum: [
        "spoilage",
        "overproduction",
        "spillage",
        "expiry",
        "staff_meal",
        "training",
        "other",
      ],
      default: "other",
    },
    costValue: { type: Number, default: 0 },
  },
  { _id: false },
);

const WastageEntrySchema = new Schema<IWastageEntryDoc>(
  {
    lines: { type: [WastageLineSchema], required: true },
    totalValue: { type: Number, default: 0 },
    notes: { type: String },
    wastedBy: { type: Schema.Types.ObjectId },
    wastedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

WastageEntrySchema.index({ wastedAt: -1 });

const WastageEntry: Model<IWastageEntryDoc> =
  mongoose.models.WastageEntry ||
  mongoose.model<IWastageEntryDoc>("WastageEntry", WastageEntrySchema);

export default WastageEntry;
