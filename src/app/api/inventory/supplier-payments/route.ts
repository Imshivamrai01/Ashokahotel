import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import SupplierPayment from "@/lib/db/models/inventory/SupplierPayment";
import Supplier from "@/lib/db/models/inventory/Supplier";

export async function GET(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  const q = supplierId ? { supplierId } : {};
  const list = await SupplierPayment.find(q)
    .sort({ paidAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  const amount = Number(body.amount) || 0;
  if (!body.supplierId || amount <= 0) {
    return NextResponse.json(
      { error: "supplierId and a positive amount are required" },
      { status: 400 },
    );
  }
  await connectDB();
  const supplier = await Supplier.findById(body.supplierId).lean();
  if (!supplier)
    return NextResponse.json({ error: "Supplier not found" }, { status: 400 });

  const payment = await SupplierPayment.create({
    supplierId: supplier._id,
    supplierName: supplier.name,
    amount,
    method: body.method || "cash",
    note: body.note,
    paidBy: g.user.id,
    paidAt: new Date(),
  });
  return NextResponse.json(payment, { status: 201 });
}
