import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICaptainCallDoc extends Document {
  tableId: string;
  tableLabel: string;
  locationCode: string;
  isGeneric?: boolean; // true when called without a specific location
  callType?: "call" | "order_ready" | "self_order";
  message?: string;
  kotNumber?: string;
  status: "pending" | "acknowledged";
  createdAt: Date;
  acknowledgedAt?: Date;
}

const CaptainCallSchema = new Schema<ICaptainCallDoc>(
  {
    tableId: { type: String, required: true },
    tableLabel: { type: String, required: true },
    locationCode: { type: String, required: false, default: "" },
    isGeneric: { type: Boolean, default: false },
    callType: {
      type: String,
      enum: ["call", "order_ready", "self_order"],
      default: "call",
    },
    message: { type: String },
    kotNumber: { type: String },
    status: {
      type: String,
      enum: ["pending", "acknowledged"],
      default: "pending",
    },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true },
);

// Auto-delete acknowledged calls after 5 minutes
CaptainCallSchema.index(
  { acknowledgedAt: 1 },
  {
    expireAfterSeconds: 300,
    partialFilterExpression: { status: "acknowledged" },
  },
);

// Auto-delete any call after 30 minutes regardless
CaptainCallSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

if (mongoose.models.CaptainCall) {
  delete (mongoose.models as Record<string, unknown>).CaptainCall;
}

const CaptainCall: Model<ICaptainCallDoc> =
  mongoose.models.CaptainCall ||
  mongoose.model<ICaptainCallDoc>("CaptainCall", CaptainCallSchema);

export default CaptainCall;
