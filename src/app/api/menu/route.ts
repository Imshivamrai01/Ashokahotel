import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMenuData } from "@/lib/queries";

// GET /api/menu — accessible by all authenticated staff
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categories, items } = await getMenuData();
  return NextResponse.json({ categories, items });
}
