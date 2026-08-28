import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Branding from "@/lib/db/models/Branding";
import { BrandingSchema } from "@/lib/validations";

/**
 * The DB model uses `restaurantName`; the form/Zod schema uses `hotelName`.
 * These helpers translate between the two so the form always sees `hotelName`
 * and the DB always receives `restaurantName`. The manager PIN is write-only:
 * the client only ever learns whether one is SET (`managerPinSet`), never the
 * hash or the value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToForm(doc: any) {
  if (!doc) return {};
  const { restaurantName, managerPinHash, ...rest } = doc;
  return {
    ...rest,
    hotelName: restaurantName,
    phone: doc.phone || doc.callNumber || "",
    callNumber: doc.callNumber || doc.phone || "",
    managerPinSet: !!managerPinHash,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function formToDb(data: any) {
  const { hotelName, managerPin, ...rest } = data;
  const phoneNumber = data.phone || data.callNumber || "";
  const out: Record<string, unknown> = {
    ...rest,
    restaurantName: hotelName,
    phone: phoneNumber,
    callNumber: phoneNumber,
  };
  // Only touch the hash when a new PIN was actually typed (non-empty).
  if (typeof managerPin === "string" && managerPin.trim()) {
    out.managerPinHash = await bcrypt.hash(managerPin.trim(), 10);
  }
  return out;
}

export async function GET() {
  // Staff-only: this returns discount policy + business PII (GSTIN, contact).
  // The PUBLIC guest menu does NOT use this route — it reads getBranding()
  // server-side — so gating to authenticated staff breaks no public path.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const branding = await Branding.findOne({}).lean();
  return NextResponse.json(dbToForm(branding));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = BrandingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await connectDB();
  const updated = await Branding.findOneAndUpdate(
    {},
    { $set: await formToDb(parsed.data) },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  try {
    revalidatePath("/menu");
    revalidatePath("/admin/branding");
  } catch {}

  return NextResponse.json(dbToForm(updated?.toObject?.() ?? updated));
}
