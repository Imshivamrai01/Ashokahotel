import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import Supplier from "@/lib/db/models/inventory/Supplier";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  await connectDB();
  const allowed = [
    "name",
    "phone",
    "email",
    "gstin",
    "address",
    "paymentTermsDays",
    "notes",
    "isActive",
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  const updated = await Supplier.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  await connectDB();
  await Supplier.findByIdAndUpdate(id, { isActive: false });
  return NextResponse.json({ ok: true });
}
