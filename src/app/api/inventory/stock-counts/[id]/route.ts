import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import StockCount from "@/lib/db/models/inventory/StockCount";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import { withTransaction } from "@/lib/db/withTransaction";
import { applyMovement } from "@/lib/inventory/stock";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  await connectDB();
  const count = await StockCount.findById(id).lean();
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(count);
}

// Post the count: book an adjustment for each variance, set stock = counted.
export async function PUT(req: NextRequest, { params }: Params) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const body = await req.json(); // { lines: [{ inventoryItemId, countedQty }] }
  await connectDB();
  const count = await StockCount.findById(id);
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (count.status !== "open")
    return NextResponse.json({ error: "Count already closed" }, { status: 400 });

  const countedMap = new Map<string, number>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (body.lines ?? []).map((l: any) => [String(l.inventoryItemId), Number(l.countedQty)]),
  );

  let totalVarianceValue = 0;

  await withTransaction(async (s) => {
    for (const line of count.lines) {
      const counted = countedMap.has(String(line.inventoryItemId))
        ? (countedMap.get(String(line.inventoryItemId)) as number)
        : line.countedQty;
      const item = await InventoryItem.findById(line.inventoryItemId).session(s);
      if (!item) continue;
      const variance = counted - item.currentStock; // vs live system qty
      line.countedQty = counted;
      line.varianceQty = variance;
      line.varianceValue = variance * item.avgCost;
      totalVarianceValue += line.varianceValue;
      if (variance !== 0) {
        await applyMovement(
          {
            inventoryItemId: item._id,
            type: "adjustment",
            qtyBase: variance,
            unitCost: item.avgCost,
            refType: "stock_count",
            refId: count._id as never,
            reason: "Physical count reconciliation",
            byUser: g.user.id,
          },
          s,
        );
      }
    }
    count.totalVarianceValue = totalVarianceValue;
    count.status = "posted";
    count.postedBy = g.user.id as never;
    count.postedAt = new Date();
    await count.save({ session: s });
  });

  return NextResponse.json({ ok: true, totalVarianceValue });
}
