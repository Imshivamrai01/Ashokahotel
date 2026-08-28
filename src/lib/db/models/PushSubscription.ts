import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscriptionDoc extends Document {
  userId: string;
  role: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDoc>(
  {
    userId: { type: String, required: true },
    role: { type: String, required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true },
);

const PushSubscriptionModel: Model<IPushSubscriptionDoc> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDoc>(
    "PushSubscription",
    PushSubscriptionSchema,
  );

export default PushSubscriptionModel;
