import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Staff from "@/lib/db/models/Staff";

// ─── GET /api/staff ───────────────────────────────────────────────────────────
// Returns active staff list; admin only
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const staff = await Staff.find({ isActive: true }, { password: 0 })
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(
    staff.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      email: s.email,
      role: s.role,
    })),
  );
}
