import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Voucher } from "@/lib/db/models/Voucher";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const vouchers = await Voucher.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ vouchers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch vouchers" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      minBillAmount,
      maxDiscountAmount,
      customerPhone,
      validTill,
      usageLimit,
    } = body;

    if (!code || !discountType || discountValue === undefined || !validTill) {
      return NextResponse.json(
        { error: "Code, Discount Type, Discount Value, and Expiry Date are required" },
        { status: 400 },
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Voucher.findOne({ code: cleanCode });
    if (existing) {
      return NextResponse.json(
        { error: `Voucher code ${cleanCode} already exists` },
        { status: 400 },
      );
    }

    const voucher = await Voucher.create({
      code: cleanCode,
      description: description?.trim(),
      discountType,
      discountValue: Number(discountValue),
      minBillAmount: minBillAmount ? Number(minBillAmount) : undefined,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      customerPhone: customerPhone?.trim() || undefined,
      validTill: new Date(validTill),
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      usedCount: 0,
      isActive: true,
    });

    return NextResponse.json({ voucher }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create voucher" },
      { status: 500 },
    );
  }
}
