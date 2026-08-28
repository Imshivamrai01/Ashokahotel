import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Voucher } from "@/lib/db/models/Voucher";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { code, subtotal, customerPhone } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const voucher = await Voucher.findOne({ code: cleanCode, isActive: true });

    if (!voucher) {
      return NextResponse.json({ error: "Invalid or inactive coupon code" }, { status: 404 });
    }

    const now = new Date();
    if (voucher.validFrom && new Date(voucher.validFrom) > now) {
      return NextResponse.json({ error: "Coupon is not yet active" }, { status: 400 });
    }

    if (voucher.validTill && new Date(voucher.validTill) < now) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    if (voucher.customerPhone) {
      const cleanVoucherPhone = voucher.customerPhone.replace(/\D/g, "").slice(-10);
      const cleanCustPhone = customerPhone ? customerPhone.replace(/\D/g, "").slice(-10) : "";
      if (!cleanCustPhone) {
        return NextResponse.json(
          { error: `This coupon is exclusive. Please enter the customer's 10-digit mobile number above first.` },
          { status: 400 },
        );
      }
      if (cleanVoucherPhone !== cleanCustPhone) {
        return NextResponse.json(
          { error: `This coupon is exclusively assigned to customer mobile: ${cleanVoucherPhone}` },
          { status: 400 },
        );
      }
    }

    const numSubtotal = Number(subtotal) || 0;
    if (voucher.minBillAmount && numSubtotal < voucher.minBillAmount) {
      return NextResponse.json(
        {
          error: `Minimum bill of ₹${voucher.minBillAmount} required to use this coupon (current subtotal: ₹${numSubtotal.toFixed(0)})`,
        },
        { status: 400 },
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discountType === "flat") {
      discountAmount = Math.min(voucher.discountValue, numSubtotal);
    } else if (voucher.discountType === "percent") {
      discountAmount = (numSubtotal * voucher.discountValue) / 100;
      if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
        discountAmount = voucher.maxDiscountAmount;
      }
    }

    return NextResponse.json({
      valid: true,
      voucher: {
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
        description: voucher.description,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to validate voucher" },
      { status: 500 },
    );
  }
}
