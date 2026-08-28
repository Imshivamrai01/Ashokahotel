import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import KitchenPageClient from "@/components/kitchen/KitchenPageClient";

export default async function KitchenPage() {
  const session = await auth();
  if (!session?.user || !["admin", "kitchen"].includes(session.user.role))
    redirect("/login");

  return <KitchenPageClient staffName={session.user.name ?? "Staff"} />;
}
