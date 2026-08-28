import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import {
  getDashboardMetrics,
  getAllLocations,
  getActiveOrders,
} from "@/lib/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [metrics, locations, activeOrdersList] = await Promise.all([
      getDashboardMetrics(),
      getAllLocations(),
      getActiveOrders(),
    ]);

    return NextResponse.json(
      JSON.parse(JSON.stringify({ metrics, locations, activeOrdersList })),
    );
  } catch (error) {
    console.error("[GET /api/admin/dashboard] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard data" },
      { status: 500 },
    );
  }
}
