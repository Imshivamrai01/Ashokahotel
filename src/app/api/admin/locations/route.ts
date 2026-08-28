import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Location from "@/lib/db/models/Location";
import { LocationSchema } from "@/lib/validations";

import {
  formatLocationLabel,
  formatLocationCode,
  naturalSortLocations,
} from "@/lib/location-utils";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const locs = await Location.find({});

  // Auto-normalize any unformatted table labels and codes in the DB
  for (const loc of locs) {
    const cleanLabel = formatLocationLabel(loc.label);
    const cleanCode = formatLocationCode(cleanLabel);
    if (loc.label !== cleanLabel || loc.code !== cleanCode) {
      loc.label = cleanLabel;
      loc.code = cleanCode;
      await loc.save().catch(() => null);
    }
  }

  const freshLocs = await Location.find({}).lean();
  const sorted = naturalSortLocations(freshLocs);
  return NextResponse.json(sorted);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loc = await (Location.create as any)({
      ...parsed.data,
      label,
      code,
    });
    return NextResponse.json(loc, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "A location with this label/code already exists." },
        { status: 409 },
      );
    }
    throw e;
  }
}
