import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Staff from "@/lib/db/models/Staff";
import Order from "@/lib/db/models/Order";
import bcrypt from "bcryptjs";
import { StaffUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = StaffUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await connectDB();
  const staff = await Staff.findById(id);
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  staff.name = parsed.data.name;
  staff.email = parsed.data.email;
  staff.role = parsed.data.role;
  staff.isActive = parsed.data.isActive ?? true;
  if (parsed.data.password && parsed.data.password.trim()) {
    staff.password = parsed.data.password; // pre-save hook will hash it
  }
  // Only update PIN when a new non-empty PIN is provided
  const pinValue = parsed.data.pin?.trim();
  if (pinValue && pinValue.length >= 4) {
    staff.pinHash = await bcrypt.hash(pinValue, 10);
  }
  await staff.save();

  const { password: _, pinHash: __, ...safe } = staff.toObject();
  void _;
  void __;
  return NextResponse.json({ ...safe, pinSet: !!staff.pinHash });
}


export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await connectDB();

  await Staff.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
