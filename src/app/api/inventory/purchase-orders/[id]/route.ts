import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import PurchaseOrder from "@/lib/db/models/inventory/PurchaseOrder";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  await connectDB();
  const po = await PurchaseOrder.findById(id).lean();
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

// Update status only (send / cancel). Receiving happens via GRN.
export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const { status } = await req.json();
  if (!["draft", "sent", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await connectDB();
  const updated = await PurchaseOrder.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
