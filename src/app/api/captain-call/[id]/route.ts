import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import CaptainCall from "@/lib/db/models/CaptainCall";

// PATCH /api/captain-call/[id] — captain acknowledges a call
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !["admin", "captain"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  await CaptainCall.findByIdAndUpdate(id, {
    status: "acknowledged",
    acknowledgedAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
