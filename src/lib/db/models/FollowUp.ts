import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFollowUpDoc extends Document {
  leadId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  staffName?: string;
  type: "call" | "whatsapp" | "email" | "meeting" | "site_visit";
  notes: string;
  outcome?: string;
  nextFollowUpAt?: Date;
  createdAt: Date;
}

const FollowUpSchema = new Schema<IFollowUpDoc>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    staffName: { type: String },
    type: {
      type: String,
      enum: ["call", "whatsapp", "email", "meeting", "site_visit"],
      required: true,
    },
    notes: { type: String, required: true },
    outcome: { type: String },
    nextFollowUpAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FollowUpSchema.index({ leadId: 1, createdAt: -1 });

const FollowUp: Model<IFollowUpDoc> =
  mongoose.models.FollowUp ||
  mongoose.model<IFollowUpDoc>("FollowUp", FollowUpSchema);

export default FollowUp;
