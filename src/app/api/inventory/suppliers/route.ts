import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import Supplier from "@/lib/db/models/inventory/Supplier";
import GoodsReceivedNote from "@/lib/db/models/inventory/GoodsReceivedNote";
import SupplierPayment from "@/lib/db/models/inventory/SupplierPayment";
import PurchaseReturn from "@/lib/db/models/inventory/PurchaseReturn";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const suppliers = await Supplier.find({ isActive: { $ne: false } })
    .sort({ name: 1 })
    .lean();

  // Outstanding due = received (GRN) − paid − returned, per supplier.
  const [grn, paid, returned] = await Promise.all([
    GoodsReceivedNote.aggregate([
      { $group: { _id: "$supplierId", v: { $sum: "$total" } } },
    ]),
    SupplierPayment.aggregate([
      { $group: { _id: "$supplierId", v: { $sum: "$amount" } } },
    ]),
    PurchaseReturn.aggregate([
      { $group: { _id: "$supplierId", v: { $sum: "$total" } } },
    ]),
  ]);
  const map = (a: { _id: unknown; v: number }[]) =>
    new Map(a.map((x) => [String(x._id), x.v]));
  const gMap = map(grn);
  const pMap = map(paid);
  const rMap = map(returned);

  const withDues = suppliers.map((s) => {
    const id = String(s._id);
    const purchases = gMap.get(id) ?? 0;
    const payments = pMap.get(id) ?? 0;
    const returns = rMap.get(id) ?? 0;
    return {
      ...s,
      purchases,
      payments,
      returns,
      due: Math.round((purchases - payments - returns) * 100) / 100,
    };
  });
  return NextResponse.json(withDues);
}

export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!body.name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  await connectDB();
  const supplier = await Supplier.create({
    name: body.name,
    phone: body.phone,
    email: body.email,
    gstin: body.gstin,
    address: body.address,
    paymentTermsDays: body.paymentTermsDays,
    notes: body.notes,
    isActive: body.isActive ?? true,
  });
  return NextResponse.json(supplier, { status: 201 });
}
