import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Staff from "@/lib/db/models/Staff";
import bcrypt from "bcryptjs";
import { StaffSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const staff = await Staff.find({})
    .select("-password -pinHash")
    .sort({ role: 1, name: 1 })
    .lean();
  
  // Fetch pin status for each staff member
  const allStaffWithPin = await Staff.find({}).select("_id pinHash").lean();
  const pinMap = new Map(allStaffWithPin.map((s) => [String(s._id), !!s.pinHash]));

  const result = staff.map((s) => ({
    ...s,
    pinSet: pinMap.get(String(s._id)) ?? false,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = StaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!parsed.data.password) {
    return NextResponse.json(
      { error: "Password is required for new staff." },
      { status: 400 },
    );
  }
  await connectDB();
  try {
    const { pin, ...data } = parsed.data;
    const pinValue = pin?.trim();
    const hashedPin = pinValue && pinValue.length >= 4 ? await bcrypt.hash(pinValue, 10) : undefined;
    const staff = new Staff({
      ...data,
      ...(hashedPin ? { pinHash: hashedPin } : {}),
    });
    await staff.save();
    const { password: _, pinHash: __, ...safe } = staff.toObject();
    void _;
    void __;
    return NextResponse.json({ ...safe, pinSet: !!staff.pinHash }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 },
      );
    }
    throw e;
  }
}
