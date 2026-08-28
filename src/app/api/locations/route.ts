import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Location from "@/lib/db/models/Location";
import type { ILocation } from "@/types";

import { naturalSortLocations } from "@/lib/location-utils";

// GET /api/locations — returns active tables/rooms for menu and staff
export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { isActive: true };
  if (type === "table" || type === "room") query.type = type;

  const locations = await Location.find(query).lean<ILocation[]>();
  const sorted = naturalSortLocations(locations);

  return NextResponse.json(sorted);
}
