import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export type StaffRole =
  | "receptionist"
  | "captain"
  | "kitchen"
  | "cashier"
  | "lead_manager"
  | "inventory_manager";

export interface IStaffDoc extends Document {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  pinHash?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  comparePin(candidate: string): Promise<boolean>;
}

const StaffSchema = new Schema<IStaffDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: [
        "receptionist",
        "captain",
        "kitchen",
        "cashier",
        "lead_manager",
        "inventory_manager",
      ],
      required: true,
    },
    pinHash: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

StaffSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (
    this.isModified("pinHash") &&
    this.pinHash &&
    !this.pinHash.startsWith("$2a$") &&
    !this.pinHash.startsWith("$2b$")
  ) {
    this.pinHash = await bcrypt.hash(this.pinHash, 10);
  }
});

StaffSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

StaffSchema.methods.comparePin = async function (
  candidate: string,
): Promise<boolean> {
  if (!this.pinHash) return false;
  return bcrypt.compare(candidate, this.pinHash);
};

if (mongoose.models.Staff) {
  delete mongoose.models.Staff;
}

const Staff: Model<IStaffDoc> =
  mongoose.models.Staff || mongoose.model<IStaffDoc>("Staff", StaffSchema);

export default Staff;
