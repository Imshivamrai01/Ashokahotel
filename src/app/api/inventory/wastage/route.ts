import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import WastageEntry from "@/lib/db/models/inventory/WastageEntry";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { withTransaction } from "@/lib/db/withTransaction";
import { applyMovement } from "@/lib/inventory/stock";
import { toBase } from "@/lib/inventory/units";

export async function GET() {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const list = await WastageEntry.find({}).sort({ wastedAt: -1 }).limit(200).lean();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "lines required" }, { status: 400 });
  }
  await connectDB();

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
            isActive: true,
          });
        }
      }
    }
    if (!item) continue;
    const qty = Number(l.qty) || 0;
    if (qty <= 0) continue;
    const unit = l.unit || item.stockUnit;
    const qtyBase = toBase(qty, unit);
    built.push({
      item,
      qtyBase,
      line: {
        inventoryItemId: item._id,
        name: item.name,
        qty,
        unit,
        qtyBase,
        reason: l.reason || "other",
        costValue: qtyBase * item.avgCost,
      },
    });
  }
  if (built.length === 0)
    return NextResponse.json({ error: "No valid lines" }, { status: 400 });

  const totalValue = built.reduce((s, b) => s + b.line.costValue, 0);

  const entry = await withTransaction(async (s) => {
    for (const b of built) {
      await applyMovement(
        {
          inventoryItemId: b.item._id,
          type: "wastage_out",
          qtyBase: -Math.abs(b.qtyBase),
          unitCost: b.item.avgCost,
          refType: "wastage",
          reason: b.line.reason,
          byUser: g.user.id,
        },
        s,
      );
    }
    const [created] = await WastageEntry.create(
      [
        {
          lines: built.map((b) => b.line),
          totalValue,
          notes: body.notes,
          wastedBy: g.user.id,
          wastedAt: new Date(),
        },
      ],
      { session: s },
    );
    return created;
  });
  return NextResponse.json(entry, { status: 201 });
}
