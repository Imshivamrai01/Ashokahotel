import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Category from "@/lib/db/models/Category";
import { CategorySchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const cats = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = CategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cat = await (Category.create as any)({
    ...parsed.data,
    slug: slugify(parsed.data.name),
  });
  return NextResponse.json(cat, { status: 201 });
}
