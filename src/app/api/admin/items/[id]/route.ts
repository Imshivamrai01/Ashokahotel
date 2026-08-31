import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Item from "@/lib/db/models/Item";
import { ItemSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { deleteFromCloudinary, extractPublicId } from "@/lib/cloudinary";

type Params = { params: Promise<{ id: string }> };

// Full update — requires all fields
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
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
    while (await Item.exists({ slug, _id: { $ne: id } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const updated = await Item.findByIdAndUpdate(
      id,
      {
        ...rest,
        name,
        slug,
        isAvailable: isActive,
        isVegetarian: isVeg,
      },
      { new: true },
    );
    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Failed to update item:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update item" },
      { status: 500 },
    );
  }
}

// Partial update — only touches fields explicitly present in the body
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  await connectDB();

  // Build the patch using ONLY keys that were explicitly sent.
  // Do NOT run through ItemSchema.partial() — that applies defaults and
  // would overwrite unrelated fields (e.g. isVeg default=true when toggling isActive).
  const patch: Record<string, unknown> = {};

  if ("isActive" in body) patch.isAvailable = Boolean(body.isActive);
  if ("isVeg" in body) patch.isVegetarian = Boolean(body.isVeg);
  if ("name" in body) {
    patch.name = body.name;
    patch.slug = slugify(String(body.name));
  }
  if ("price" in body) patch.price = Number(body.price);
  if ("sortOrder" in body) patch.sortOrder = Number(body.sortOrder);
  if ("categoryId" in body) patch.categoryId = body.categoryId;
  if ("description" in body) patch.description = body.description;
  if ("imageUrl" in body) patch.imageUrl = body.imageUrl;
  if ("videoUrl" in body) patch.videoUrl = body.videoUrl;
  if ("taxRatePercent" in body)
    patch.taxRatePercent = Number(body.taxRatePercent);
  if ("taxIncluded" in body) patch.taxIncluded = Boolean(body.taxIncluded);
  if ("hsn" in body) patch.hsn = body.hsn;
  if ("isFeatured" in body) patch.isFeatured = Boolean(body.isFeatured);
  if ("preparationTtlMinutes" in body)
    patch.preparationTtlMinutes = Number(body.preparationTtlMinutes);
  if ("variations" in body) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patch.variations = Array.isArray(body.variations)
      ? body.variations
          .filter((v: any) => v && (String(v.name || "").trim() || Number(v.price) > 0))
          .map((v: any) => ({
            name: String(v.name || "").trim(),
            price: Number(v.price) || 0,
            recipeScale: Number(v.recipeScale) || 1,
          }))
      : [];
  }
  if ("addons" in body) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patch.addons = Array.isArray(body.addons)
      ? body.addons
          .filter((a: any) => a && (String(a.name || "").trim() || Number(a.price) > 0))
          .map((a: any) => ({
            name: String(a.name || "").trim(),
            price: Number(a.price) || 0,
            inventoryItemId: a.inventoryItemId || undefined,
            qtyBase: a.qtyBase != null ? Number(a.qtyBase) : undefined,
          }))
      : [];
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const updated = await Item.findByIdAndUpdate(id, patch, { new: true });
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

  const item = await Item.findByIdAndDelete(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Clean up Cloudinary image + video if present
  if (item.imageUrl) {
    const pid = extractPublicId(item.imageUrl);
    if (pid) await deleteFromCloudinary(pid).catch(() => null);
  }
  if (item.videoUrl) {
    const pid = extractPublicId(item.videoUrl);
    if (pid) await deleteFromCloudinary(pid, "video").catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
