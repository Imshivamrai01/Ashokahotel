import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Lead from "@/lib/db/models/Lead";
import type { ILead } from "@/types";

// ─── GET /api/leads ───────────────────────────────────────────────────────────
// lead_manager sees their own leads; admin sees all
export async function GET(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "lead_manager"].includes(session.user.role ?? "")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const assignedTo = searchParams.get("assignedTo");
  const priority = searchParams.get("priority");
  const overdue = searchParams.get("overdue") === "true";
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  // scope: lead_manager only sees their own leads
  if (session.user.role === "lead_manager") {
    query.leadManagerId = session.user.id;
  }

  if (status) query.status = status;
  if (source) query.source = source;
  if (assignedTo) query.assignedTo = assignedTo;
  if (priority) query.priority = priority;
  if (overdue) {
    query.nextFollowUpAt = { $lt: new Date() };
    query.status = { $nin: ["won", "lost"] };
  }
  if (search) {
    // Escape regex metacharacters — raw user input as a RegExp is a ReDoS vector.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safe, "i");
    query.$or = [{ name: re }, { phone: re }, { email: re }, { interest: re }];
  }

  const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

  const mapped: ILead[] = leads.map((l) => ({
    _id: l._id.toString(),
    leadManagerId: l.leadManagerId.toString(),
    name: l.name,
    phone: l.phone,
    email: l.email,
    source: l.source,
    interest: l.interest,
    budget: l.budget,
    status: l.status,
    priority: l.priority,
    notes: l.notes,
    nextFollowUpAt: l.nextFollowUpAt?.toISOString(),
    assignedTo: l.assignedTo?.toString(),
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return NextResponse.json(mapped);
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "lead_manager"].includes(session.user.role ?? "")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const {
    name,
    phone,
    email,
    source,
    interest,
    budget,
    status,
    priority,
    notes,
    nextFollowUpAt,
    assignedTo,
  } = body;

  if (!name || !phone || !source || !interest) {
    return NextResponse.json(
      { error: "name, phone, source, interest are required" },
      { status: 400 },
    );
  }

  const lead = await Lead.create({
    leadManagerId: session.user.id,
    name,
    phone,
    email,
    source,
    interest,
    budget,
    status: status ?? "new",
    priority: priority ?? "medium",
    notes,
    nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
    assignedTo: assignedTo || undefined,
  });

  const l = lead.toObject();
  return NextResponse.json(
    {
      _id: l._id.toString(),
      leadManagerId: l.leadManagerId.toString(),
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      interest: l.interest,
      budget: l.budget,
      status: l.status,
      priority: l.priority,
      notes: l.notes,
      nextFollowUpAt: l.nextFollowUpAt?.toISOString(),
      assignedTo: l.assignedTo?.toString(),
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    } as ILead,
    { status: 201 },
  );
}
