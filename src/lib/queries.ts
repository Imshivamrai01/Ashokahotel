import { cache } from "react";
import { connectDB } from "@/lib/db/mongoose";
import { todayInTz, startOfDayTz } from "@/lib/time";
import Branding from "@/lib/db/models/Branding";
import Category from "@/lib/db/models/Category";
import Item from "@/lib/db/models/Item";
import Location from "@/lib/db/models/Location";
import Order from "@/lib/db/models/Order";
import Staff from "@/lib/db/models/Staff";
import { naturalSortLocations } from "@/lib/location-utils";
import type {
  IBranding,
  ICategory,
  IItem,
  ILocation,
  IOrder,
  OrderStatus,
} from "@/types";

// ─── Branding ────────────────────────────────────────────────────────────────
export const getBranding = cache(async (): Promise<IBranding | null> => {
  await connectDB();
  // NEVER return managerPinHash — this doc is serialized into the PUBLIC menu
  // HTML (server→client props), so a projected hash would be brute-forceable.
  return Branding.findOne({}).select("-managerPinHash").lean<IBranding>();
});

// ─── Menu Data ───────────────────────────────────────────────────────────────
export const getMenuData = cache(async () => {
  await connectDB();
  const [categories, items] = await Promise.all([
    Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean<ICategory[]>(),
    // Items use `isAvailable` (not `isActive`); `$ne:false` shows everything
    // except items explicitly marked unavailable, tolerating legacy docs that
    // predate the field.
    Item.find({ isAvailable: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .lean<IItem[]>(),
  ]);

  // Group items by categoryId
  const itemsByCategory = items.reduce<Record<string, IItem[]>>((acc, item) => {
    const key = item.categoryId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return { categories, items, itemsByCategory };
});

// ─── Location ────────────────────────────────────────────────────────────────
export const getLocationBySlug = async (
  slug: string,
): Promise<ILocation | null> => {
  await connectDB();
  return Location.findOne({ slug, isActive: true }).lean<ILocation>();
};

export const getLocationByCode = async (
  code: string,
): Promise<ILocation | null> => {
  await connectDB();
  return Location.findOne({ code, isActive: true }).lean<ILocation>();
};

export const getLocationById = async (
  id: string,
): Promise<ILocation | null> => {
  await connectDB();
  return Location.findById(id).lean<ILocation>();
};

export const getAllLocations = cache(async (): Promise<ILocation[]> => {
  await connectDB();
  const locs = await Location.find({ isActive: true }).lean<ILocation[]>();
  return naturalSortLocations(locs);
});

// ─── Orders ──────────────────────────────────────────────────────────────────
export const getActiveOrders = async (
  statuses: OrderStatus[] = [
    "pending",
    "preparing",
    "partially_ready",
    "ready",
    "partially_delivered",
    "delivered",
  ],
): Promise<IOrder[]> => {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Order.find({ status: { $in: statuses } } as any)
    .populate("captainId", "name")
    .sort({ createdAt: 1 })
    .lean<IOrder[]>();
};

export const getOrderById = async (id: string): Promise<IOrder | null> => {
  await connectDB();
  return Order.findById(id).populate("captainId", "name").lean<IOrder>();
};

export const getOrdersByLocation = async (
  tableId: string,
  statuses?: OrderStatus[],
): Promise<IOrder[]> => {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { tableId };
  if (statuses?.length) query.status = { $in: statuses };
  return Order.find(query).sort({ createdAt: -1 }).lean<IOrder[]>();
};

export const getOrdersForCashier = async (): Promise<IOrder[]> => {
  await connectDB();
  // Must match the live cashier route's active-status set, or a table with
  // still-pending items would vanish from billing if this helper is ever wired up.
  return Order.find({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
    .populate("captainId", "name")
    .sort({ updatedAt: -1 })
    .lean<IOrder[]>();
};

export const getOrdersByDateRange = async (
  from: Date,
  to: Date,
): Promise<IOrder[]> => {
  await connectDB();
  return Order.find({ createdAt: { $gte: from, $lte: to } })
    .populate("tableId", "label type")
    .sort({ createdAt: -1 })
    .lean<IOrder[]>();
};

// ─── Dashboard Metrics ───────────────────────────────────────────────────────
export const getDashboardMetrics = async () => {
  await connectDB();
  // Day boundaries in the restaurant timezone, not the server's (Vercel = UTC).
  const today = startOfDayTz(todayInTz());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const [
    todayOrders,
    yesterdayOrders,
    activeOrders,
    totalLocations,
    occupiedLocations,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Order.find({
      $or: [
        { createdAt: { $gte: today, $lt: tomorrow } },
        { paidAt: { $gte: today, $lt: tomorrow } },
        { clearedAt: { $gte: today, $lt: tomorrow } },
        {
          updatedAt: { $gte: today, $lt: tomorrow },
          status: { $in: ["paid", "cleared"] },
        },
      ],
    } as any).lean<IOrder[]>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Order.find({
      $or: [
        { createdAt: { $gte: yesterday, $lt: today } },
        { paidAt: { $gte: yesterday, $lt: today } },
        { clearedAt: { $gte: yesterday, $lt: today } },
        {
          updatedAt: { $gte: yesterday, $lt: today },
          status: { $in: ["paid", "cleared"] },
        },
      ],
    } as any).lean<IOrder[]>(),
    Order.countDocuments({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    Location.countDocuments({ isActive: true }),
    Location.countDocuments({ isActive: true, isOccupied: true }),
  ]);

  const todayRevenue = todayOrders
    .filter((o) => o.status === "paid" || o.status === "cleared")
    .reduce((sum, o) => sum + (o.total || o.paymentAmount || 0), 0);

  const todayOrderCount = todayOrders.length;

  const yesterdayRevenue = yesterdayOrders
    .filter((o) => o.status === "paid" || o.status === "cleared")
    .reduce((sum, o) => sum + (o.total || o.paymentAmount || 0), 0);

  const yesterdayOrderCount = yesterdayOrders.length;

  return {
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    todayOrderCount,
    yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
    yesterdayOrderCount,
    activeOrders,
    totalLocations,
    occupiedLocations,
  };
};
