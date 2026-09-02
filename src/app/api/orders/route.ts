import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Location from "@/lib/db/models/Location";
import Item from "@/lib/db/models/Item";
import Branding from "@/lib/db/models/Branding";
import { nextDailyKotSeq } from "@/lib/db/models/Counter";
import { withTransaction } from "@/lib/db/withTransaction";
import { formatKotNumber, computeOrderTotals } from "@/lib/utils";
import { deductForOrder } from "@/lib/inventory/deduct";
import { autoDisableOutOfStock } from "@/lib/inventory/auto86";
import { notifyLowStock } from "@/lib/inventory/notify";
import type { IOrder } from "@/types";

// ─── GET /api/orders ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tableId = searchParams.get("tableId");
  const captainId = searchParams.get("captainId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (status) query.status = status;
  if (tableId) query.tableId = tableId;
  if (captainId) query.captainId = captainId;
  if (from || to) {
    query.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (!from.includes("T")) d.setHours(0, 0, 0, 0);
      query.createdAt.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!to.includes("T")) d.setHours(23, 59, 59, 999);
      query.createdAt.$lte = d;
    }
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean<IOrder[]>();

  return NextResponse.json(orders);
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["admin", "captain", "cashier", "receptionist"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { tableId, tableLabel, items, specialInstructions, captainId, captainName } = body as {
      tableId?: string;
      tableLabel?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items?: any[];
      specialInstructions?: string;
      captainId?: string;
      captainName?: string;
    };

    if (!tableId || !tableLabel || !items?.length) {
      return NextResponse.json(
        { error: "tableId, tableLabel, and items are required" },
        { status: 400 },
      );
    }

    await connectDB();

    // ── Server-side pricing: NEVER trust client prices ──────────────────────
    // Look every line up in the menu and build the order from DB values; the
    // client only chooses item + quantity + notes.
    const now = new Date();
    const reqIds = items.map((i) => String((i as { itemId?: string }).itemId));
    const dbItems = await Item.find({ _id: { $in: reqIds } }).lean();
    const byId = new Map(dbItems.map((d) => [String(d._id), d]));

    const orderItems: Array<{
      itemId: unknown;
      name: string;
      price: number;
      quantity: number;
      notes: string | undefined;
      isVegetarian: boolean;
      preparationTtlMinutes: number;
      itemStatus: "pending";
      orderedAt: Date;
      isNC: boolean;
      ncReason?: string;
      ncBy?: unknown;
      taxRate: number;
      variationName?: string;
      variationScale?: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addons?: any[];
    }> = [];
    for (const i of items as {
      itemId?: string;
      quantity?: unknown;
      notes?: string;
      isNC?: boolean;
      ncReason?: string;
      variationName?: string;
      addonNames?: string[];
    }[]) {
      const db = byId.get(String(i.itemId));
      if (!db) {
        return NextResponse.json(
          { error: `Unknown menu item: ${i.itemId}` },
          { status: 400 },
        );
      }
      if (!db.isAvailable) {
        return NextResponse.json(
          { error: `${db.name} is unavailable` },
          { status: 400 },
        );
      }
      const qty = Number(i.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json(
          { error: `Invalid quantity for ${db.name}` },
          { status: 400 },
        );
      }
      const isNC = i.isNC === true;
      // Server-priced options: variation replaces base price; add-ons add on.
      let unitPrice = db.discountPrice ?? db.price;
      let variationName: string | undefined;
      let variationScale: number | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbVariations = (db as any).variations as
        | { name: string; price: number; recipeScale: number }[]
        | undefined;
      if (i.variationName && dbVariations?.length) {
        const v = dbVariations.find((x) => x.name === i.variationName);
        if (v) {
          unitPrice = v.price;
          variationName = v.name;
          variationScale = v.recipeScale ?? 1;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chosenAddons: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAddons = (db as any).addons as
        | { name: string; price: number; inventoryItemId?: unknown; qtyBase?: number }[]
        | undefined;
      if (i.addonNames?.length && dbAddons?.length) {
        for (const an of i.addonNames) {
          const a = dbAddons.find((x) => x.name === an);
          if (a) {
            unitPrice += a.price;
            chosenAddons.push({
              name: a.name,
              price: a.price,
              inventoryItemId: a.inventoryItemId,
              qtyBase: a.qtyBase,
            });
          }
        }
      }
      orderItems.push({
        itemId: db._id,
        name: db.name,
        price: unitPrice,
        quantity: qty,
        notes: i.notes || undefined,
        isVegetarian: db.isVegetarian,
        preparationTtlMinutes: db.preparationTtlMinutes ?? 15,
        itemStatus: "pending" as const,
        orderedAt: now,
        isNC,
        ncReason: isNC ? i.ncReason || undefined : undefined,
        ncBy: isNC ? session.user.id : undefined,
        variationName,
        variationScale,
        addons: chosenAddons.length ? chosenAddons : undefined,
        // Item-level tax not used in billing — GST is bill-level (branding).
        taxRate: 0,
      });
    }

    // GST-aware totals (NC lines excluded). pricesIncludeTax from branding.
    const branding = await Branding.findOne({})
      .select("gstEnabled pricesIncludeTax gstRatePercent")
      .lean();
    const gstOn = !!branding?.gstEnabled;
    const incl = !!branding?.pricesIncludeTax;
    const billRate = gstOn ? (branding?.gstRatePercent ?? 0) : 0;
    const itemsForTotals = gstOn
      ? orderItems
      : orderItems.map((i) => ({ ...i, taxRate: 0 }));
    const { subtotal, tax, total } = computeOrderTotals(
      itemsForTotals,
      incl,
      billRate,
    );

    // KOT day boundary computed in UTC to match the counter key + kotDate, so
    // the daily reset and the unique {kotDate, kotNumber} index stay consistent
    // regardless of server timezone.
    const kotDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC)
    const todayStart = new Date(`${kotDate}T00:00:00.000Z`);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    // Create the order + occupy the table. Retry once on a KOT duplicate-key
    // collision (concurrent first-of-day requests) so the order is never lost.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let order: any = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const existingTodayCount = await Order.countDocuments({
        createdAt: { $gte: todayStart, $lt: tomorrowStart },
      });
      const seq = await nextDailyKotSeq(existingTodayCount);
      const kotNumber = formatKotNumber(seq);
      try {
        order = await withTransaction(async (s) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const [created] = await (Order.create as any)(
            [
              {
                kotNumber,
                kotDate,
                tableId,
                tableLabel,
                captainId: captainId || session.user.id,
                captainName: captainName || (session.user.name ?? "Captain"),
                placedByRole: session.user.role,
                status: "pending",
                items: orderItems,
                specialInstructions: specialInstructions || undefined,
                subtotal,
                tax,
                total,
                pricesIncludeTax: incl,
                billTaxRatePercent: billRate,
              },
            ],
            { session: s },
          );
          // Deduct raw materials for tracked items (idempotent, NC-aware).
          await deductForOrder(created, session.user.id, s);
          await created.save({ session: s });
          await Location.findByIdAndUpdate(
            tableId,
            { isOccupied: true },
            { session: s },
          );
          return created;
        });
      } catch (e) {
        lastErr = e;
        if ((e as { code?: number }).code === 11000) continue; // KOT clash → re-seq
        throw e;
      }
    }
    if (!order) throw lastErr ?? new Error("Failed to create order");

    // Auto-86 + low-stock alerts (best-effort, post-commit — never blocks sale).
    {
      const affected = [...new Set(orderItems.map((i) => String(i.itemId)))];
      autoDisableOutOfStock(affected).catch(() => null);
      // Notify on the raw materials, not the menu items.
      Promise.resolve()
        .then(async () => {
          const { default: Recipe } = await import(
            "@/lib/db/models/inventory/Recipe"
          );
          const recipes = await Recipe.find({
            kind: "menu",
            menuItemId: { $in: affected },
          }).lean();
          const rawIds = recipes.flatMap((r) =>
            r.components
              .filter((c) => c.kind === "item" && c.inventoryItemId)
              .map((c) => String(c.inventoryItemId)),
          );
          await notifyLowStock([...new Set(rawIds)]);
        })
        .catch(() => null);
    }

    return NextResponse.json(
      { success: true, orderId: order._id.toString(), kotNumber: order.kotNumber },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/orders]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
