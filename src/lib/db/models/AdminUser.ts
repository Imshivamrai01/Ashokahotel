import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdminUserDoc extends Document {
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const AdminUserSchema = new Schema<IAdminUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, default: "Admin" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

AdminUserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

AdminUserSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const AdminUser: Model<IAdminUserDoc> =
  mongoose.models.AdminUser ||
  mongoose.model<IAdminUserDoc>("AdminUser", AdminUserSchema);

export default AdminUser;
