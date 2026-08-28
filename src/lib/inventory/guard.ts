import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Allow only admin + inventory_manager. Returns the session on success, or a
 * NextResponse 401 to return early. Usage:
 *   const g = await requireInventory(); if (g instanceof NextResponse) return g;
 */
export async function requireInventory() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !["admin", "inventory_manager"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}
