import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import GoodsReceivedNote from "@/lib/db/models/inventory/GoodsReceivedNote";
import PurchaseOrder from "@/lib/db/models/inventory/PurchaseOrder";
import Supplier from "@/lib/db/models/inventory/Supplier";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { withTransaction } from "@/lib/db/withTransaction";
import { applyMovement } from "@/lib/inventory/stock";
import { nextNumber } from "@/lib/inventory/numbering";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const grns = await GoodsReceivedNote.find({})
    .sort({ receivedAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json(grns);
}

// Receive stock: writes purchase_in movements + moving-average cost, updates PO.
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

  const po = body.purchaseOrderId
    ? await PurchaseOrder.findById(body.purchaseOrderId)
    : null;

  // Resolve items + build lines with base-unit conversion + variance.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const built: any[] = [];
  for (const l of body.lines) {
    let item: any = null;
    if (l.inventoryItemId && l.inventoryItemId !== "custom") {
      item = await InventoryItem.findById(l.inventoryItemId);
    }
    if (!item && (l.customItemName || l.name)) {
      const customName = (l.customItemName || l.name).trim();
      if (customName) {
        item = await InventoryItem.findOne({
          name: new RegExp(`^${customName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
        if (!item) {
          item = await InventoryItem.create({
            name: customName,
            measureType: "count",
            stockUnit: l.unit || "pcs",
            purchaseUnit: l.unit || "pcs",
            purchaseToStock: 1,
            defaultSupplierId: supplier._id,
            isActive: true,
          });
        }
      }
    }
    if (!item) continue;
    const qtyReceived = Number(l.qtyReceived) || 0;
    if (qtyReceived <= 0) continue;
    const rate = Number(l.rate) || 0;
    const poLine = po?.lines.find(
      (p) => String(p.inventoryItemId) === String(l.inventoryItemId),
    );
    built.push({
      item,
      line: {
        inventoryItemId: item._id,
        name: item.name,
        qtyReceived,
        unit: item.purchaseUnit,
        rate,
        amount: qtyReceived * rate,
        qtyOrdered: poLine?.qty,
        batchNo: l.batchNo,
        expiryDate: l.expiryDate,
        qtyVariance: poLine ? qtyReceived - (poLine.qty - (poLine.receivedQty ?? 0)) : undefined,
        priceVariance: poLine ? rate - poLine.rate : undefined,
      },
      qtyBase: qtyReceived * item.purchaseToStock,
      unitCostBase: item.purchaseToStock > 0 ? rate / item.purchaseToStock : rate,
    });
  }
  if (built.length === 0)
    return NextResponse.json({ error: "No valid lines" }, { status: 400 });

  const grnNumber = await nextNumber("GRN");
  const total = built.reduce((s, b) => s + b.line.amount, 0);

  const grn = await withTransaction(async (s) => {
    for (const b of built) {
      await applyMovement(
        {
          inventoryItemId: b.item._id,
          type: "purchase_in",
          qtyBase: b.qtyBase,
          unitCost: b.unitCostBase,
          refType: "grn",
          byUser: g.user.id,
        },
        s,
      );
      // Stamp receipt date for perishable-expiry tracking.
      await InventoryItem.findByIdAndUpdate(
        b.item._id,
        { lastReceivedAt: new Date() },
        { session: s },
      );
    }
    // Update PO received quantities + status.
    if (po) {
      for (const b of built) {
        const pl = po.lines.find(
          (p) => String(p.inventoryItemId) === String(b.item._id),
        );
        if (pl) pl.receivedQty = (pl.receivedQty ?? 0) + b.line.qtyReceived;
      }
      const allReceived = po.lines.every(
        (p) => (p.receivedQty ?? 0) >= p.qty,
      );
      po.status = allReceived ? "received" : "partially_received";
      await po.save({ session: s });
    }
    const [created] = await GoodsReceivedNote.create(
      [
        {
          grnNumber,
          purchaseOrderId: po?._id,
          supplierId: supplier._id,
          supplierName: supplier.name,
          lines: built.map((b) => b.line),
          total,
          notes: body.notes,
          receivedBy: g.user.id,
          receivedAt: new Date(),
        },
      ],
      { session: s },
    );
    return created;
  });

  return NextResponse.json(grn, { status: 201 });
}
