import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Location from "@/lib/db/models/Location";
import Order from "@/lib/db/models/Order";
import CaptainCall from "@/lib/db/models/CaptainCall";
import { LocationSchema } from "@/lib/validations";

import {
  formatLocationLabel,
  formatLocationCode,
} from "@/lib/location-utils";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = LocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await connectDB();
  const label = formatLocationLabel(parsed.data.label);
  const code = formatLocationCode(label);
  const updated = await Location.findByIdAndUpdate(
    id,
    { ...parsed.data, label, code },
    { new: true },
  );
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// PATCH — lightweight field updates (currently: manual occupied toggle).
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  if (typeof body.isOccupied !== "boolean") {
    return NextResponse.json(
      { error: "isOccupied (boolean) required" },
      { status: 400 },
    );
  }
  await connectDB();
  const updated = await Location.findByIdAndUpdate(
    id,
    { isOccupied: body.isOccupied },
    { new: true },
  );
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await connectDB();

  const loc = await Location.findById(id);
  if (!loc) {
    return NextResponse.json({ ok: true });
  }

  // Cancel any lingering un-closed orders for this table so they don't orphan or block
  await Order.updateMany(
    {
      tableId: id,
      status: { $nin: ["cleared", "paid", "cancelled"] },
    },
    { $set: { status: "cancelled" } },
  );

  // Clean up any CaptainCalls associated with this location
  await CaptainCall.deleteMany({
    $or: [{ locationCode: loc.code }, { locationCode: loc.label }],
  });

  await Location.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
