import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import PurchaseOrder from "@/lib/db/models/inventory/PurchaseOrder";
import Supplier from "@/lib/db/models/inventory/Supplier";
import { nextNumber } from "@/lib/inventory/numbering";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const pos = await PurchaseOrder.find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json(pos);
}

export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!body.supplierId || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json(
      { error: "supplierId and at least one line are required" },
      { status: 400 },
    );
  }
  await connectDB();
  const supplier = await Supplier.findById(body.supplierId).lean();
  if (!supplier)
    return NextResponse.json({ error: "Supplier not found" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = body.lines.map((l: any) => {
    const qty = Number(l.qty) || 0;
    const rate = Number(l.rate) || 0;
    return {
      inventoryItemId: l.inventoryItemId,
      name: l.name,
      qty,
      unit: l.unit,
      rate,
      amount: qty * rate,
      receivedQty: 0,
    };
  });
  const subtotal = lines.reduce(
    (s: number, l: { amount: number }) => s + l.amount,
    0,
  );
  const poNumber = await nextNumber("PO");
  const po = await PurchaseOrder.create({
    poNumber,
    supplierId: supplier._id,
    supplierName: supplier.name,
    status: body.status === "sent" ? "sent" : "draft",
    expectedDate: body.expectedDate,
    lines,
    subtotal,
    total: subtotal,
    notes: body.notes,
    createdBy: g.user.id,
  });
  return NextResponse.json(po, { status: 201 });
}
