import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadDoc extends Document {
  leadManagerId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  source:
    | "walk_in"
    | "call"
    | "whatsapp"
    | "website"
    | "referral"
    | "social"
    | "other";
  interest: string;
  budget?: string;
  status:
    | "new"
    | "contacted"
    | "interested"
    | "proposal_sent"
    | "negotiating"
    | "won"
    | "lost"
    | "cold";
  priority: "low" | "medium" | "high";
  notes?: string;
  nextFollowUpAt?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILeadDoc>(
  {
    leadManagerId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true },
    source: {
      type: String,
      enum: [
        "walk_in",
        "call",
        "whatsapp",
        "website",
        "referral",
        "social",
        "other",
      ],
      required: true,
    },
    interest: { type: String, required: true },
    budget: { type: String },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "interested",
        "proposal_sent",
        "negotiating",
        "won",
        "lost",
        "cold",
      ],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    notes: { type: String },
    nextFollowUpAt: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Staff" },
  },
  { timestamps: true },
);

LeadSchema.index({ leadManagerId: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ nextFollowUpAt: 1 });
LeadSchema.index({ priority: 1 });

const Lead: Model<ILeadDoc> =
  mongoose.models.Lead || mongoose.model<ILeadDoc>("Lead", LeadSchema);

export default Lead;
