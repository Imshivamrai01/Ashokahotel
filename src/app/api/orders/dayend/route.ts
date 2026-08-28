import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";

/**
 * Day-end / sales summary for a date (default today), based on settled orders.
 * ?date=YYYY-MM-DD. Admin + cashier only.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00.000`);
  const end = new Date(`${date}T23:59:59.999`);

  // Settled orders this day (paid/cleared).
  const settled = await Order.find({
    status: { $in: ["paid", "cleared"] },
    $or: [
      { clearedAt: { $gte: start, $lte: end } },
      { paidAt: { $gte: start, $lte: end } },
    ],
  }).lean();

  let sales = 0;
  let tax = 0;
  let ncValue = 0;
  let ncCount = 0;
  let itemsSold = 0;
  const byPayment: Record<string, number> = {};
  const byCategory: Record<string, { qty: number; revenue: number }> = {};
  const topItems: Record<string, { qty: number; revenue: number }> = {};
  const byHour: Record<string, number> = {};
  const byCaptain: Record<string, { orders: number; revenue: number }> = {};

  for (const o of settled) {
    sales += o.total ?? 0;
    tax += o.tax ?? 0;
    const pm = o.paymentMethod ?? "unknown";
    byPayment[pm] = (byPayment[pm] ?? 0) + (o.paymentAmount ?? o.total ?? 0);
    const when = o.clearedAt ?? o.paidAt ?? o.createdAt;
    const hour = `${new Date(when).getHours()}`.padStart(2, "0");
    byHour[hour] = (byHour[hour] ?? 0) + (o.total ?? 0);

    const cap = o.captainName?.trim() || (o.placedByRole === "cashier" ? "Cashier Desk" : "Direct / QR");
    byCaptain[cap] = {
      orders: (byCaptain[cap]?.orders ?? 0) + 1,
      revenue: (byCaptain[cap]?.revenue ?? 0) + (o.total ?? 0),
    };

    for (const it of o.items ?? []) {
      if (it.itemStatus === "cancelled") continue;
      if (it.isNC) {
        ncCount += 1;
        ncValue += it.price * it.quantity;
        continue;
      }
      itemsSold += it.quantity;
      const rev = it.price * it.quantity;
      topItems[it.name] = {
        qty: (topItems[it.name]?.qty ?? 0) + it.quantity,
        revenue: (topItems[it.name]?.revenue ?? 0) + rev,
      };
    }
  }

  // Voids: orders cancelled this day.
  const voids = await Order.countDocuments({
    status: "cancelled",
    updatedAt: { $gte: start, $lte: end },
  });

  const top = Object.entries(topItems)
    .map(([name, v]) => ({ name, qty: v.qty, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  const captains = Object.entries(byCaptain)
    .map(([name, v]) => ({ name, orders: v.orders, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  void byCategory;

  return NextResponse.json({
    date,
    orderCount: settled.length,
    sales: Math.round(sales * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    net: Math.round((sales - tax) * 100) / 100,
    itemsSold,
    ncCount,
    ncValue: Math.round(ncValue),
    voids,
    byPayment: Object.entries(byPayment).map(([method, amount]) => ({
      method,
      amount: Math.round(amount),
    })),
    byHour: Object.entries(byHour)
      .map(([hour, amount]) => ({ hour, amount: Math.round(amount) }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    topItems: top,
    byCaptain: captains,
  });
}
