import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import { APP_TZ, todayInTz, startOfDayTz, endOfDayTz } from "@/lib/time";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Day boundaries computed in the restaurant timezone (not the server's), so
  // "today"/range edges align with the same zone used to bucket below.
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam
    ? startOfDayTz(fromParam.slice(0, 10))
    : new Date(
        startOfDayTz(todayInTz()).getTime() - 29 * 24 * 60 * 60 * 1000,
      );
  const to = toParam ? endOfDayTz(toParam.slice(0, 10)) : endOfDayTz(todayInTz());

  const matchStage = { createdAt: { $gte: from, $lte: to } };

  const [
    totals,
    revenueByDay,
    paymentBreakdown,
    topItems,
    captainVolume,
    hourlyHeatmap,
    avgTimes,
  ] = await Promise.all([
    // ── 1. Totals ────────────────────────────────────────────────────────────
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ["$status", ["paid", "cleared"]] }, "$total", 0],
            },
          },
          totalRefunds: { $sum: { $ifNull: ["$refundAmount", 0] } },
          paidOrders: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
          },
          clearedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cleared"] }, 1, 0] },
          },
        },
      },
    ]),

    // ── 2. Revenue by day ────────────────────────────────────────────────────
    Order.aggregate([
      { $match: { ...matchStage, status: { $in: ["paid", "cleared"] } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: APP_TZ,
            },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", revenue: 1, orders: 1 } },
    ]),

    // ── 3. Payment method breakdown ──────────────────────────────────────────
    Order.aggregate([
      { $match: { ...matchStage, status: { $in: ["paid", "cleared"] } } },
      {
        $group: {
          _id: { $ifNull: ["$paymentMethod", "unknown"] },
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $project: { _id: 0, method: "$_id", count: 1, revenue: 1 } },
    ]),

    // ── 4. Top 10 items by quantity ──────────────────────────────────────────
    Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $match: { "items.itemStatus": { $ne: "cancelled" } } },
      {
        // Group by stable itemId, not the mutable denormalized name — renaming
        // or re-pricing an item must not split its history into two rows.
        $group: {
          _id: "$items.itemId",
          name: { $last: "$items.name" },
          count: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          isVegetarian: { $first: "$items.isVegetarian" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: 1,
          count: 1,
          revenue: 1,
          isVegetarian: 1,
        },
      },
    ]),

    // ── 5. Captain volume ────────────────────────────────────────────────────
    Order.aggregate([
      // Exclude cashier/admin-placed orders so captain performance isn't polluted.
      // Legacy orders (no placedByRole) are treated as captain orders.
      {
        $match: {
          ...matchStage,
          placedByRole: { $nin: ["cashier", "admin"] },
        },
      },
      {
        $group: {
          _id: "$captainName",
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { orders: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, captain: "$_id", orders: 1, revenue: 1 } },
    ]),

    // ── 6. Hourly heatmap (0–23) ─────────────────────────────────────────────
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: { date: "$createdAt", timezone: APP_TZ } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, hour: "$_id", count: 1 } },
    ]),

    // ── 7. Avg prep and delivery times ───────────────────────────────────────
    Order.aggregate([
      {
        $match: {
          ...matchStage,
          status: { $in: ["delivered", "paid", "cleared"] },
        },
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.readyAt": { $exists: true },
          "items.orderedAt": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgPrepMs: {
            $avg: {
              $subtract: ["$items.readyAt", "$items.orderedAt"],
            },
          },
          avgDeliveryMs: {
            $avg: {
              $cond: [
                { $ifNull: ["$items.deliveredAt", false] },
                { $subtract: ["$items.deliveredAt", "$items.orderedAt"] },
                null,
              ],
            },
          },
        },
      },
    ]),
  ]);

  // ── Normalize hourly heatmap to full 0–23 ───────────────────────────────
  const heatmapMap: Record<number, number> = {};
  for (const h of hourlyHeatmap) heatmapMap[h.hour] = h.count;
  const fullHeatmap = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: heatmapMap[i] ?? 0,
  }));

  const msToMin = (ms: number | null) =>
    ms != null ? Math.round(ms / 60000) : null;

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    totals: (() => {
      const t = totals[0] ?? {
        totalOrders: 0,
        totalRevenue: 0,
        totalRefunds: 0,
        paidOrders: 0,
        clearedOrders: 0,
      };
      return { ...t, netRevenue: (t.totalRevenue ?? 0) - (t.totalRefunds ?? 0) };
    })(),
    revenueByDay,
    paymentBreakdown,
    topItems,
    captainVolume,
    hourlyHeatmap: fullHeatmap,
    avgPrepMinutes: msToMin(avgTimes[0]?.avgPrepMs ?? null),
    avgDeliveryMinutes: msToMin(avgTimes[0]?.avgDeliveryMs ?? null),
  });
}
