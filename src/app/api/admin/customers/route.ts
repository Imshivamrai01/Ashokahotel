import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Customer } from "@/lib/db/models/Customer";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const customers = await Customer.find().sort({ lastVisitAt: -1 }).lean();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // Check upcoming (next 30 days) birthdays & anniversaries
    const upcomingBirthdays = customers.filter((c) => {
      if (!c.dob) return false;
      const d = new Date(c.dob);
      const bMonth = d.getMonth();
      const bDay = d.getDate();
      // Roughly match this month or next
      return (bMonth === currentMonth && bDay >= currentDay) || bMonth === (currentMonth + 1) % 12;
    });

    const upcomingAnniversaries = customers.filter((c) => {
      if (!c.anniversaryDate) return false;
      const d = new Date(c.anniversaryDate);
      const aMonth = d.getMonth();
      const aDay = d.getDate();
      return (aMonth === currentMonth && aDay >= currentDay) || aMonth === (currentMonth + 1) % 12;
    });

    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);
    const vipCount = customers.filter((c) => ["vip", "platinum"].includes(c.tier)).length;

    return NextResponse.json({
      customers,
      stats: {
        totalCustomers,
        totalRevenue,
        vipCount,
        upcomingBirthdaysCount: upcomingBirthdays.length,
        upcomingAnniversariesCount: upcomingAnniversaries.length,
      },
      upcomingBirthdays,
      upcomingAnniversaries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch admin customers" },
      { status: 500 },
    );
  }
}
