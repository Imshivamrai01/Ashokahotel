import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import PurchaseReturn from "@/lib/db/models/inventory/PurchaseReturn";
import Supplier from "@/lib/db/models/inventory/Supplier";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { withTransaction } from "@/lib/db/withTransaction";
import { applyMovement } from "@/lib/inventory/stock";
import { nextNumber } from "@/lib/inventory/numbering";

export async function GET(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  const q = supplierId ? { supplierId } : {};
  const list = await PurchaseReturn.find(q)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json(list);
}

// Return stock to a supplier: stock_out (return) + record debit note.
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
  const built: any[] = [];
  for (const l of body.lines) {
    const item = await InventoryItem.findById(l.inventoryItemId);
    if (!item) continue;
    const qty = Number(l.qty) || 0;
    if (qty <= 0) continue;
    const rate = Number(l.rate) || item.avgCost * item.purchaseToStock;
    built.push({
      item,
      qtyBase: qty * item.purchaseToStock,
      line: {
        inventoryItemId: item._id,
        name: item.name,
        qty,
        unit: item.purchaseUnit,
        rate,
        amount: qty * rate,
      },
    });
  }
  if (built.length === 0)
    return NextResponse.json({ error: "No valid lines" }, { status: 400 });

  const total = built.reduce((s, b) => s + b.line.amount, 0);
  const returnNumber = await nextNumber("PR");

  const ret = await withTransaction(async (s) => {
    for (const b of built) {
      await applyMovement(
        {
          inventoryItemId: b.item._id,
          type: "return_out",
          qtyBase: -Math.abs(b.qtyBase),
          unitCost: b.item.avgCost,
          refType: "return",
          reason: `Return to ${supplier.name}`,
          byUser: g.user.id,
        },
        s,
      );
    }
    const [created] = await PurchaseReturn.create(
      [
        {
          returnNumber,
          supplierId: supplier._id,
          supplierName: supplier.name,
          lines: built.map((b) => b.line),
          total,
          reason: body.reason,
          returnedBy: g.user.id,
        },
      ],
      { session: s },
    );
    return created;
  });

  return NextResponse.json(ret, { status: 201 });
}
