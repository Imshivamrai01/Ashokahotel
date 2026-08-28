import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Lead from "@/lib/db/models/Lead";
import FollowUp from "@/lib/db/models/FollowUp";
import Staff from "@/lib/db/models/Staff";
import type { IFollowUp } from "@/types";

// ─── GET /api/leads/[id]/followups ────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "lead_manager"].includes(session.user.role ?? "")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const lead = await Lead.findById(id).lean();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.user.role === "lead_manager" &&
    lead.leadManagerId.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const followUps = await FollowUp.find({ leadId: id })
    .sort({ createdAt: -1 })
    .lean();

  const mapped: IFollowUp[] = followUps.map((f) => ({
    _id: f._id.toString(),
    leadId: f.leadId.toString(),
    staffId: f.staffId.toString(),
    type: f.type,
    notes: f.notes,
    outcome: f.outcome,
    nextFollowUpAt: f.nextFollowUpAt?.toISOString(),
    createdAt: f.createdAt.toISOString(),
  }));

  return NextResponse.json(mapped);
}

// ─── POST /api/leads/[id]/followups ───────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "lead_manager"].includes(session.user.role ?? "")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const lead = await Lead.findById(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.user.role === "lead_manager" &&
    lead.leadManagerId.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { type, notes, outcome, nextFollowUpAt } = body;

  if (!type || !notes) {
    return NextResponse.json(
      { error: "type and notes are required" },
      { status: 400 },
    );
  }

  // look up staff name for display
  const staff = await Staff.findById(session.user.id).lean();

  const followUp = await FollowUp.create({
    leadId: id,
    staffId: session.user.id,
    type,
    notes,
    outcome,
    nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
  });

  // update lead's nextFollowUpAt if provided
  if (nextFollowUpAt) {
    lead.nextFollowUpAt = new Date(nextFollowUpAt);
    await lead.save();
  }

  const f = followUp.toObject();
  return NextResponse.json(
    {
      _id: f._id.toString(),
      leadId: f.leadId.toString(),
      staffId: f.staffId.toString(),
      staffName: staff ? (staff as { name?: string }).name : undefined,
      type: f.type,
      notes: f.notes,
      outcome: f.outcome,
      nextFollowUpAt: f.nextFollowUpAt?.toISOString(),
      createdAt: f.createdAt.toISOString(),
    } as IFollowUp,
    { status: 201 },
  );
}
