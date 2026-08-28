import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";
import Item from "@/lib/db/models/Item";
import Branding from "@/lib/db/models/Branding";
import CaptainCall from "@/lib/db/models/CaptainCall";
import { nextDailyKotSeq } from "@/lib/db/models/Counter";
import { formatKotNumber, computeOrderTotals } from "@/lib/utils";

// Rate limiting for guest order placement: max 20 orders per minute per IP
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const orderTimes = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (orderTimes.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    orderTimes.set(ip, recent);
    return true;
  }
  recent.push(now);
  orderTimes.set(ip, recent);
  if (orderTimes.size > 5000) {
    for (const [k, v] of orderTimes) {
      if (v.every((t) => now - t > RL_WINDOW_MS)) orderTimes.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { tableId, locationCode, items, specialInstructions } = body as {
      tableId?: string;
      locationCode?: string;
      items?: {
        itemId: string;
        quantity: number;
        notes?: string;
        variationName?: string;
      }[];
      specialInstructions?: string;
    };

    if (!items || !items.length) {
      return NextResponse.json(
        { error: "No items selected for order" },
        { status: 400 },
      );
    }

    await connectDB();

    // Safe location lookup by ObjectId, code, or label
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let location: any = null;
    if (tableId && mongoose.Types.ObjectId.isValid(tableId)) {
      location = await Location.findById(tableId).lean();
    }
    if (!location && tableId) {
      location = await Location.findOne({
        $or: [
          { code: tableId },
          { label: tableId },
          { label: `Table ${tableId}` },
          { label: new RegExp(`^Table\\s*${tableId}$`, "i") },
        ],
      }).lean();
    }
    if (!location && locationCode) {
      location = await Location.findOne({
        $or: [
          { code: locationCode },
          { label: locationCode },
          { label: `Table ${locationCode}` },
          { label: new RegExp(`^Table\\s*${locationCode}$`, "i") },
        ],
      }).lean();
    }

    // Fallback: if still not found, pick first active table
    if (!location) {
      location = await Location.findOne({ isActive: true, type: "table" }).lean();
    }

    if (!location) {
      return NextResponse.json(
        { error: "Invalid table or location selected" },
        { status: 404 },
      );
    }

    // Verify all items from DB for safe pricing
    const itemIds = items
      .map((i) => String(i.itemId))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const dbItems = await Item.find({ _id: { $in: itemIds } }).lean();
    const dbItemsMap = new Map(dbItems.map((it) => [String(it._id), it]));

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolvedItems: any[] = [];

    for (const reqItem of items) {
      const it = dbItemsMap.get(String(reqItem.itemId));
      if (!it || !it.isAvailable) continue;

      const qty = Math.max(1, Math.min(99, Number(reqItem.quantity) || 1));
      const price = it.discountPrice ?? it.price;

      resolvedItems.push({
        itemId: it._id,
        name: it.name,
        price,
        quantity: qty,
        notes: reqItem.notes?.trim() || undefined,
        isVegetarian: !!it.isVegetarian,
        preparationTtlMinutes: it.preparationTtlMinutes ?? 15,
        itemStatus: "pending",
        orderedAt: now,
        isNC: false,
        taxRate: 0,
      });
    }

    if (!resolvedItems.length) {
      return NextResponse.json(
        { error: "Selected items are currently unavailable" },
        { status: 400 },
      );
    }

    // Fetch branding for GST settings
    const branding = await Branding.findOne({})
      .select("gstEnabled pricesIncludeTax gstRatePercent")
      .lean();
    const gstRatePercent = branding?.gstEnabled ? (branding.gstRatePercent ?? 5) : 0;
    const pricesIncludeTax = !!branding?.pricesIncludeTax;

    const { subtotal, tax, total } = computeOrderTotals(
      resolvedItems,
      pricesIncludeTax,
      gstRatePercent,
    );

    const kotDate = now.toISOString().slice(0, 10);
    const todayStart = new Date(kotDate + "T00:00:00.000Z");
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    // Create the order with retry loop for concurrent KOT sequence generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let order: any = null;
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const existingTodayCount = await Order.countDocuments({
        createdAt: { $gte: todayStart, $lt: tomorrowStart },
      });
      const kotSeq = await nextDailyKotSeq(existingTodayCount);
      const kotNumber = formatKotNumber(kotSeq);

      try {
        order = await Order.create({
          kotNumber,
          kotDate,
          tableId: location._id,
          tableLabel: location.label,
          placedByRole: "customer",
          isCaptainConfirmed: false,
          status: "pending_captain",
          items: resolvedItems,
          specialInstructions: specialInstructions?.trim() || undefined,
          subtotal,
          tax,
          total,
          pricesIncludeTax,
          billTaxRatePercent: gstRatePercent,
          kotPrinted: false,
        });
      } catch (err: any) {
        lastErr = err;
        // Retry on duplicate key collision (E11000)
        if (err?.code === 11000 && attempt < 2) {
          continue;
        }
        throw err;
      }
    }

    if (!order) {
      throw lastErr || new Error("Failed to generate unique KOT for order");
    }

    // Create a CaptainCall notification for captain alert
    try {
      await CaptainCall.create({
        tableId: String(location._id),
        tableLabel: location.label,
        locationCode: location.code,
        status: "pending",
      });
    } catch (e) {
      console.warn("CaptainCall notification creation notice:", e);
    }

    return NextResponse.json({
      success: true,
      order: {
        _id: String(order._id),
        kotNumber: order.kotNumber,
        tableLabel: order.tableLabel,
        total: order.total,
        status: order.status,
      },
    });
  } catch (err: unknown) {
    console.error("POST /api/orders/self-order error:", err);
    const msg = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json(
      { error: `Order placement failed: ${msg}` },
      { status: 500 },
    );
  }
}
