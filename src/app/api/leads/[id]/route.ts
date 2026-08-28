import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Lead from "@/lib/db/models/Lead";
import type { ILead } from "@/types";

function mapLead(l: Record<string, unknown>): ILead {
  return {
    _id: (l._id as { toString(): string }).toString(),
    leadManagerId: (l.leadManagerId as { toString(): string }).toString(),
    name: l.name as string,
    phone: l.phone as string,
    email: l.email as string | undefined,
    source: l.source as ILead["source"],
    interest: l.interest as string,
    budget: l.budget as string | undefined,
    status: l.status as ILead["status"],
    priority: l.priority as ILead["priority"],
    notes: l.notes as string | undefined,
    nextFollowUpAt: l.nextFollowUpAt
      ? (l.nextFollowUpAt as Date).toISOString()
      : undefined,
    assignedTo: l.assignedTo
      ? (l.assignedTo as { toString(): string }).toString()
      : undefined,
    createdAt: (l.createdAt as Date).toISOString(),
    updatedAt: (l.updatedAt as Date).toISOString(),
  };
}

// ─── GET /api/leads/[id] ──────────────────────────────────────────────────────
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

  // LM can only view their own
  if (
    session.user.role === "lead_manager" &&
    lead.leadManagerId.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(mapLead(lead as unknown as Record<string, unknown>));
}

// ─── PUT /api/leads/[id] ──────────────────────────────────────────────────────
export async function PUT(
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
  const allowed = [
    "name",
    "phone",
    "email",
    "source",
    "interest",
    "budget",
    "status",
    "priority",
    "notes",
    "nextFollowUpAt",
    "assignedTo",
  ];
  for (const key of allowed) {
    if (key in body) {
      if (key === "nextFollowUpAt") {
        (lead as unknown as Record<string, unknown>)[key] = body[key]
          ? new Date(body[key])
          : undefined;
      } else {
        (lead as unknown as Record<string, unknown>)[key] = body[key];
      }
    }
  }
  await lead.save();

  return NextResponse.json(
    mapLead(lead.toObject() as unknown as Record<string, unknown>),
  );
}

// ─── DELETE /api/leads/[id] ───────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;
  await Lead.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
