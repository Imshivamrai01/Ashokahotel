import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Item from "@/lib/db/models/Item";
import { ItemSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const items = await Item.find({})
    .sort({ categoryId: 1, sortOrder: 1, name: 1 })
    .lean();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = ItemSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.entries(flat.fieldErrors)[0];
    const errMsg = firstField
      ? `${firstField[0]}: ${firstField[1]?.join(", ")}`
      : flat.formErrors[0] || "Validation failed";
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  await connectDB();
  const { isActive, isVeg, name, ...rest } = parsed.data;

  try {
    let baseSlug = slugify(name) || "item";
    let slug = baseSlug;
    let count = 1;
    while (await Item.exists({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (Item.create as any)({
      ...rest,
      name,
      slug,
      isAvailable: isActive,
      isVegetarian: isVeg,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("Failed to create menu item:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create menu item" },
      { status: 500 },
    );
  }
}
