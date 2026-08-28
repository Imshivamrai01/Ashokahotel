import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";
import { withTransaction } from "@/lib/db/withTransaction";
import { computeOrderTotals } from "@/lib/utils";
import { reverseLine } from "@/lib/inventory/deduct";

const CAPTAIN_VOID_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

// Toggle No-Charge on one item, then recompute the order total (NC lines = ₹0).
async function setItemNC(
  orderId: string,
  itemId: string,
  isNC: boolean,
  ncReason: string | undefined,
  staffId: string,
  role: string,
) {
  if (!["admin", "cashier", "captain"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (["cleared", "paid", "cancelled"].includes(order.status)) {
    return NextResponse.json(
      { error: "Order is closed — reopen it before changing No-Charge" },
      { status: 400 },
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = order.items.find((i: any) => i._id.toString() === itemId);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.itemStatus === "cancelled") {
    return NextResponse.json(
      { error: "Cannot No-Charge a cancelled item" },
      { status: 400 },
    );
  }

  item.isNC = isNC;
  if (isNC) {
    item.ncReason = ncReason || undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item.ncBy = staffId as any;
  } else {
    item.ncReason = undefined;
    item.ncBy = undefined;
  }

  {
    const t = computeOrderTotals(
      order.items,
      !!order.pricesIncludeTax,
      order.billTaxRatePercent ?? 0,
    );
    order.subtotal = t.subtotal;
    order.tax = t.tax;
    order.total = t.total;
  }
  await order.save();

  return NextResponse.json({ success: true, total: order.total });
}

// PATCH /api/orders/[id]/items/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !["admin", "kitchen", "captain", "cashier"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;
  const body = await req.json();
  const { itemStatus, reason } = body;

  // ── No-Charge toggle ────────────────────────────────────────────────────
  // Mark a single item complimentary (₹0) or undo it. Allowed for all three
  // ordering roles (captain/cashier/admin), any time before the order is paid.
  if (typeof body.isNC === "boolean") {
    return setItemNC(id, itemId, body.isNC, body.ncReason, session.user.id, role);
  }

  // Per-role allowed transitions:
  //  - captain: only void (within a 3-minute window, enforced below)
  //  - cashier: void or force-deliver — used when the kitchen is busy and the
  //    cashier takes over billing (item physically served but chef never tapped,
  //    or item never made and must be dropped from the bill)
  //  - kitchen/admin: full control
  const validStatuses =
    role === "captain"
      ? ["cancelled"]
      : role === "cashier"
        ? ["cancelled", "delivered"]
        : ["pending", "preparing", "ready", "delivered", "cancelled"];

  if (!validStatuses.includes(itemStatus)) {
    return NextResponse.json({ error: "Invalid itemStatus" }, { status: 400 });
  }

  await connectDB();

  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Captain 3-minute void window
  if (role === "captain" && itemStatus === "cancelled") {
    const age = Date.now() - new Date(order.createdAt).getTime();
    if (age > CAPTAIN_VOID_WINDOW_MS) {
      return NextResponse.json(
        { error: "Void window expired — ask the kitchen to cancel" },
        { status: 403 },
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = order.items.find((i: any) => i._id.toString() === itemId);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Prevent double-cancel or re-activating a cancelled item from captain
  if (item.itemStatus === "cancelled") {
    return NextResponse.json(
      { error: "Item is already cancelled" },
      { status: 400 },
    );
  }

  // Was the dish already being cooked/served when cancelled? Then the raw
  // material is gone — book it as wastage instead of restoring stock.
  const wasCooked = ["preparing", "ready", "delivered"].includes(
    item.itemStatus,
  );

  // Update item status and timestamps.
  // If kitchen jumps straight to a later status (e.g. pending → delivered),
  // backfill all intermediate timestamps so the audit trail stays complete.
  item.itemStatus = itemStatus;
  const now = new Date();
  if (
    (itemStatus === "preparing" ||
      itemStatus === "ready" ||
      itemStatus === "delivered") &&
    !item.preparingAt
  ) {
    item.preparingAt = now;
  }
  if ((itemStatus === "ready" || itemStatus === "delivered") && !item.readyAt) {
    item.readyAt = now;
  }
  if (itemStatus === "delivered" && !item.deliveredAt) item.deliveredAt = now;
  if (itemStatus === "cancelled") {
    item.cancelledAt = now;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item.cancelledBy = session.user.id as any;
    if (reason) item.cancelReason = reason;
  }

  // Recalculate order status — skip cancelled items
  const activeItems = order.items.filter(
    (i: { itemStatus: string }) => i.itemStatus !== "cancelled",
  );

  if (activeItems.length === 0) {
    // All items cancelled
    order.status = "cancelled";
  } else {
    const statuses = activeItems.map(
      (i: { itemStatus: string }) => i.itemStatus,
    );
    const allDelivered = statuses.every((s: string) => s === "delivered");
    const someDelivered = statuses.some((s: string) => s === "delivered");
    const allReady = statuses.every((s: string) =>
      ["ready", "delivered"].includes(s),
    );
    const someReady = statuses.some((s: string) =>
      ["ready", "delivered"].includes(s),
    );
    const allPending = statuses.every((s: string) => s === "pending");

    if (allDelivered) order.status = "delivered";
    else if (someDelivered) order.status = "partially_delivered";
    else if (allReady) order.status = "ready";
    else if (someReady) order.status = "partially_ready";
    else if (!allPending) order.status = "preparing";
    else order.status = "pending";
  }

  // Recalculate order total excluding cancelled and NC items
  {
    const t = computeOrderTotals(
      order.items,
      !!order.pricesIncludeTax,
      order.billTaxRatePercent ?? 0,
    );
    order.subtotal = t.subtotal;
    order.tax = t.tax;
    order.total = t.total;
  }

  // Save + (if fully cancelled) free the table atomically. Without freeing, an
  // all-voided table stays "occupied" forever yet shows nothing to the cashier.
  await withTransaction(async (s) => {
    // Cancelled item → restore stock if not yet cooked; if already cooked,
    // reclassify the consumed stock as wastage (net stock unchanged).
    if (itemStatus === "cancelled") {
      await reverseLine(item, session.user.id, s, wasCooked);
    }
    await order.save({ session: s });
    if (order.status === "cancelled") {
      const remaining = await Order.countDocuments({
        tableId: order.tableId,
        status: { $nin: ["cleared", "paid", "cancelled"] },
        _id: { $ne: order._id },
      }).session(s);
      if (remaining === 0) {
        await Location.findByIdAndUpdate(
          order.tableId,
          { isOccupied: false },
          { session: s },
        );
      }
    }
  });

  return NextResponse.json({ success: true, orderStatus: order.status });
}
