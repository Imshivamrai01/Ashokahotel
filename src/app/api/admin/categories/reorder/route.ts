import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Category from "@/lib/db/models/Category";

/** PATCH /api/admin/categories/reorder
 *  Body: { updates: { id: string; sortOrder: number }[] }
 *  Applies all sort-order changes in a single round-trip using bulkWrite.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { updates } = (await req.json()) as {
    updates: { id: string; sortOrder: number }[];
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  await connectDB();

  await Category.bulkWrite(
    updates.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder } },
      },
    })),
  );

  return NextResponse.json({ ok: true });
}
