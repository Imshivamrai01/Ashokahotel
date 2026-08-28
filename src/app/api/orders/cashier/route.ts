import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Branding from "@/lib/db/models/Branding";
import { billOrderTotals } from "@/lib/billing";
import type { IOrder } from "@/types";

export interface TableBill {
  tableId: string;
  tableLabel: string;
  kots: IOrder[];
  subtotal: number; // net of GST (sum across KOTs)
  tax: number; // total GST (CGST + SGST)
  total: number; // amount to collect (GST-inclusive)
  itemCount: number;
  since: string; // createdAt of oldest KOT
  anchorKotId: string; // first KOT id — used for pay_table API call
  // GST display flags (current branding, applied live at billing time)
  gstEnabled: boolean;
  gstNumber: string;
  gstRatePercent: number;
  pricesIncludeTax: boolean;
  // Discount policy (for the payment modal)
  maxDiscountPercent: number;
  discountRequiresReason: boolean;
  discountApprovalThresholdPercent: number;
  managerPinSet: boolean;
}

// GET /api/orders/cashier — table-wise billing view
export async function GET() {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "cashier", "receptionist"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Current GST settings — applied LIVE so the bill is correct even for orders
  // placed before GST was switched on (their stored tax may be stale/zero).
  const branding = await Branding.findOne({})
    .select(
      "gstEnabled gstNumber gstRatePercent pricesIncludeTax maxDiscountPercent discountRequiresReason discountApprovalThresholdPercent managerPinHash",
    )
    .lean();
  const gstEnabled = !!branding?.gstEnabled;
  const gstNumber = branding?.gstNumber ?? "";
  const gstRatePercent = gstEnabled ? branding?.gstRatePercent ?? 0 : 0;
  const pricesIncludeTax = !!branding?.pricesIncludeTax;
  const maxDiscountPercent = branding?.maxDiscountPercent ?? 20;
  const discountRequiresReason = branding?.discountRequiresReason ?? true;
  const discountApprovalThresholdPercent =
    branding?.discountApprovalThresholdPercent ?? 10;
  const managerPinSet = !!branding?.managerPinHash;

  // Fetch all active (unpaid, uncleared) orders for the billing queue.
  // Include all non-terminal statuses so a table appears as soon as an order exists.
  const orders = await Order.find({
    status: {
      $in: [
        "pending",
        "preparing",
        "partially_ready",
        "ready",
        "partially_delivered",
        "delivered",
      ],
    },
  })
    .sort({ createdAt: 1 })
    .lean<IOrder[]>();

  // Group by tableId
  const tableMap = new Map<string, IOrder[]>();
  for (const order of orders) {
    const key = order.tableId.toString();
    if (!tableMap.has(key)) tableMap.set(key, []);
    tableMap.get(key)!.push(order);
  }

  const tables: TableBill[] = [];
  for (const [tableId, kots] of tableMap) {
    // Recompute each KOT's GST live and override the snapshot so the receipt
    // preview + payment modal show the correct breakdown.
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    for (const k of kots) {
      const t = billOrderTotals(k.items, branding);
      k.subtotal = t.subtotal;
      k.tax = t.tax;
      k.total = t.total;
      subtotal += t.subtotal;
      tax += t.tax;
      total += t.total;
    }
    const itemCount = kots.reduce(
      (sum, k) =>
        sum + k.items.filter((i) => i.itemStatus !== "cancelled").length,
      0,
    );
    tables.push({
      tableId,
      tableLabel: kots[0].tableLabel,
      kots,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount,
      since: kots[0].createdAt,
      anchorKotId: kots[0]._id,
      gstEnabled,
      gstNumber,
      gstRatePercent,
      pricesIncludeTax,
      maxDiscountPercent,
      discountRequiresReason,
      discountApprovalThresholdPercent,
      managerPinSet,
    });
  }

  // Sort by oldest first
  tables.sort(
    (a, b) => new Date(a.since).getTime() - new Date(b.since).getTime(),
  );

  return NextResponse.json(tables);
}
