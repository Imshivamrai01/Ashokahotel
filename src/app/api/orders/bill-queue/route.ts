import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Branding from "@/lib/db/models/Branding";
import { authorizePrintAgent } from "@/lib/print-auth";

// Polled by the local print agent's BILL printer — never cache.
export const dynamic = "force-dynamic";

// ─── GET /api/orders/bill-queue ──────────────────────────────────────────────
// Bills the cashier asked to print but the agent hasn't printed yet. Includes
// monetary + GST data (it's the customer invoice). 4-hour safety window.
export async function GET(req: NextRequest) {
  const authz = await authorizePrintAgent(req, ["admin", "cashier"]);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  await connectDB();
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const branding = await Branding.findOne({})
    .select("restaurantName gstNumber address phone")
    .lean();

  const orders = await Order.find({
    billPrintRequested: true,
    billPrinted: false,
    updatedAt: { $gte: fourHoursAgo },
  })
    .sort({ updatedAt: 1 })
    .limit(50)
    .select(
      "kotNumber tableLabel captainName items subtotal discountAmount tax total paymentMethod createdAt",
    )
    .lean();

  const queue = orders.map((o) => ({
    _id: o._id.toString(),
    kotNumber: o.kotNumber,
    tableLabel: o.tableLabel,
    captainName: o.captainName,
    items: (o.items ?? [])
      .filter((it) => it.itemStatus !== "cancelled")
      .map((it) => ({
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        isNC: it.isNC,
        variationName: it.variationName,
        addons: (it.addons ?? []).map((a) => ({ name: a.name })),
      })),
    subtotal: o.subtotal,
    discount: o.discountAmount ?? 0,
    tax: o.tax ?? 0,
    total: o.total,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
  }));

  return NextResponse.json({
    branding: {
      name: branding?.restaurantName ?? "Ashoka Hotel",
      gstNumber: branding?.gstNumber ?? "",
      address: branding?.address ?? "",
      phone: branding?.phone ?? "",
    },
    queue,
  });
}
