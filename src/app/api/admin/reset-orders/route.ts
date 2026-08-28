import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/lib/db/models/Order";
import Counter from "@/lib/db/models/Counter";
import CaptainCall from "@/lib/db/models/CaptainCall";
import Location from "@/lib/db/models/Location";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const orderRes = await Order.deleteMany({});
    const counterRes = await Counter.deleteMany({});
    const callRes = await CaptainCall.deleteMany({});
    const locRes = await Location.updateMany({}, { isOccupied: false });

    return NextResponse.json({
      success: true,
      message: "All orders, KOTs, invoices, and alerts cleared successfully.",
      deletedOrders: orderRes.deletedCount,
      deletedCounters: counterRes.deletedCount,
      clearedCalls: callRes.deletedCount,
      resetTables: locRes.modifiedCount,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
