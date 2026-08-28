import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_REDIRECTS } from "@/lib/auth";
import type { UserRole } from "@/types";

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.role) {
    const role = session.user.role as UserRole;
    redirect(ROLE_REDIRECTS[role] ?? "/login");
  }
  // Unauthenticated guests → menu (also makes PWA start_url useful)
  redirect("/menu");
}
