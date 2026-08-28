// Customer CRM API - Ashoka Hotel
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Customer, computeCustomerTier } from "@/lib/db/models/Customer";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const phone = req.nextUrl.searchParams.get("phone");

    if (phone) {
      const cleanPhone = phone.trim();
      const customer = await Customer.findOne({ phone: cleanPhone }).lean();
      if (!customer) {
        return NextResponse.json({ customer: null }, { status: 200 });
      }
      return NextResponse.json({ customer }, { status: 200 });
    }

    const customers = await Customer.find().sort({ lastVisitAt: -1 }).lean();
    return NextResponse.json({ customers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch customer" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { name, phone, email, isMarried, dob, anniversaryDate, billAmount, notes } = body;

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    let customer = await Customer.findOne({ phone: cleanPhone });

    if (customer) {
      if (name) customer.name = name.trim();
      if (email !== undefined) customer.email = email.trim();
      if (isMarried !== undefined) customer.isMarried = Boolean(isMarried);
      if (dob) customer.dob = new Date(dob);
      if (anniversaryDate) customer.anniversaryDate = new Date(anniversaryDate);
      if (notes !== undefined) customer.notes = notes;

      if (billAmount && billAmount > 0) {
        customer.totalVisits += 1;
        customer.totalSpend += Number(billAmount);
      }
      customer.lastVisitAt = new Date();
      customer.tier = computeCustomerTier(customer.totalVisits, customer.totalSpend);
      await customer.save();
    } else {
      const totalVisits = 1;
      const totalSpend = billAmount ? Number(billAmount) : 0;
      customer = await Customer.create({
        name: name?.trim() || "Guest",
        phone: cleanPhone,
        email: email?.trim(),
        isMarried: Boolean(isMarried),
        dob: dob ? new Date(dob) : undefined,
        anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : undefined,
        totalVisits,
        totalSpend,
        tier: computeCustomerTier(totalVisits, totalSpend),
        lastVisitAt: new Date(),
        notes,
      });
    }

    return NextResponse.json({ customer }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save customer" },
      { status: 500 },
    );
  }
}
