import { NextRequest, NextResponse } from "next/server";
import { requireInventory } from "@/lib/inventory/guard";
import { connectDB } from "@/lib/db/mongoose";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import StockMovement from "@/lib/db/models/inventory/StockMovement";
import WastageEntry from "@/lib/db/models/inventory/WastageEntry";
import Item from "@/lib/db/models/Item";
import Recipe from "@/lib/db/models/inventory/Recipe";
import GoodsReceivedNote from "@/lib/db/models/inventory/GoodsReceivedNote";

/**
 * Aggregated inventory reports. ?type=stock_value | low_stock | consumption |
 * wastage | summary (default). ?days=N window for consumption/wastage.
 */
export async function GET(req: NextRequest) {
  const g = await requireInventory();
  if (g instanceof NextResponse) return g;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "summary";
  const days = Number(searchParams.get("days")) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (type === "stock_value") {
    const items = await InventoryItem.find({ isActive: true }).lean();
    const rows = items.map((i) => ({
      _id: i._id,
      name: i.name,
      category: i.category,
      currentStock: i.currentStock,
      stockUnit: i.stockUnit,
      avgCost: i.avgCost,
      value: i.currentStock * i.avgCost,
    }));
    const total = rows.reduce((s, r) => s + r.value, 0);
    return NextResponse.json({ rows, total });
  }

  if (type === "low_stock") {
    const items = await InventoryItem.find({ isActive: true }).lean();
    const rows = items
      .filter((i) => i.reorderLevel > 0 && i.currentStock <= i.reorderLevel)
      .map((i) => ({
        _id: i._id,
        name: i.name,
        currentStock: i.currentStock,
        reorderLevel: i.reorderLevel,
        stockUnit: i.stockUnit,
        reorderQty: i.reorderQty,
      }));
    return NextResponse.json({ rows });
  }

  if (type === "consumption") {
    const agg = await StockMovement.aggregate([
      { $match: { type: "sale_out", createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$inventoryItemId",
          qtyOut: { $sum: { $abs: "$qtyBase" } },
          costOut: { $sum: { $multiply: [{ $abs: "$qtyBase" }, "$unitCost"] } },
        },
      },
      { $sort: { costOut: -1 } },
    ]);
    return NextResponse.json({ rows: agg, days });
  }

  if (type === "wastage") {
    const agg = await WastageEntry.aggregate([
      { $match: { wastedAt: { $gte: since } } },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.reason",
          value: { $sum: "$lines.costValue" },
          count: { $sum: 1 },
        },
      },
      { $sort: { value: -1 } },
    ]);
    const total = agg.reduce((s, r) => s + r.value, 0);
    return NextResponse.json({ rows: agg, total, days });
  }

  if (type === "variance") {
    // Variance = differences found at physical stock counts (shrinkage/overage).
    const agg = await StockMovement.aggregate([
      {
        $match: {
          type: "adjustment",
          refType: "stock_count",
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$inventoryItemId",
          varianceQty: { $sum: "$qtyBase" },
          varianceValue: { $sum: { $multiply: ["$qtyBase", "$unitCost"] } },
        },
      },
    ]);
    const ids = agg.map((a) => a._id);
    const items = await InventoryItem.find({ _id: { $in: ids } })
      .select("name stockUnit")
      .lean();
    const nameById = new Map(items.map((i) => [String(i._id), i]));
    const rows = agg
      .map((a) => ({
        name: nameById.get(String(a._id))?.name ?? "?",
        varianceQty: a.varianceQty,
        unit: nameById.get(String(a._id))?.stockUnit ?? "",
        varianceValue: a.varianceValue,
      }))
      .sort((x, y) => x.varianceValue - y.varianceValue);
    const total = rows.reduce((s, r) => s + r.varianceValue, 0);
    return NextResponse.json({ rows, total, days });
  }

  if (type === "supplier_ledger") {
    const agg = await GoodsReceivedNote.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      {
        $group: {
          _id: "$supplierName",
          purchases: { $sum: "$total" },
          receipts: { $sum: 1 },
        },
      },
      { $sort: { purchases: -1 } },
    ]);
    const total = agg.reduce((s, r) => s + r.purchases, 0);
    return NextResponse.json({
      rows: agg.map((a) => ({ supplier: a._id, purchases: a.purchases, receipts: a.receipts })),
      total,
      days,
    });
  }

  if (type === "expiring") {
    // Prep (uses production date) + raw perishables (uses receipt date).
    const stock = await InventoryItem.find({
      isActive: true,
      shelfLifeDays: { $gt: 0 },
      currentStock: { $gt: 0 },
      $or: [{ isSubRecipe: true }, { isPerishable: true }],
    }).lean();
    const now = Date.now();
    const rows = stock
      .map((p) => {
        const base = p.isSubRecipe ? p.lastProducedAt : p.lastReceivedAt;
        const made = base ? new Date(base).getTime() : null;
        const daysLeft =
          made != null
            ? (p.shelfLifeDays as number) -
              Math.floor((now - made) / 86400000)
            : null;
        return {
          _id: p._id,
          name: p.name,
          kind: p.isSubRecipe ? "prep" : "raw",
          currentStock: p.currentStock,
          stockUnit: p.stockUnit,
          daysLeft,
          expired: daysLeft != null && daysLeft < 0,
        };
      })
      .filter((r) => r.daysLeft == null || r.daysLeft <= 2)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
    return NextResponse.json({ rows });
  }

  if (type === "negative") {
    const items = await InventoryItem.find({
      isActive: true,
      currentStock: { $lt: 0 },
    }).lean();
    const rows = items.map((i) => ({
      _id: i._id,
      name: i.name,
      currentStock: i.currentStock,
      stockUnit: i.stockUnit,
    }));
    return NextResponse.json({ rows });
  }

  if (type === "missing_recipes") {
    const tracked = await Item.find({ trackInventory: true })
      .select("_id name")
      .lean();
    const recipes = await Recipe.find({ kind: "menu" }).select("menuItemId").lean();
    const haveRecipe = new Set(recipes.map((r) => String(r.menuItemId)));
    const rows = tracked
      .filter((t) => !haveRecipe.has(String(t._id)))
      .map((t) => ({ _id: t._id, name: t.name }));
    return NextResponse.json({ rows });
  }

  // summary
  const items = await InventoryItem.find({ isActive: true }).lean();
  const stockValue = items.reduce((s, i) => s + i.currentStock * i.avgCost, 0);
  const lowStock = items.filter(
    (i) => i.reorderLevel > 0 && i.currentStock <= i.reorderLevel,
  ).length;
  const outOfStock = items.filter((i) => i.currentStock <= 0).length;
  const recipeCount = await Recipe.countDocuments({ kind: "menu" });
  const grnExists = await StockMovement.exists({ type: "purchase_in" });
  return NextResponse.json({
    itemCount: items.length,
    stockValue,
    lowStock,
    outOfStock,
    recipeCount,
    hasReceivedStock: !!grnExists,
  });
}
