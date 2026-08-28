import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CashierPageClient from "@/components/cashier/CashierPageClient";

export default async function CashierPage() {
  const session = await auth();
  if (!session?.user || !["admin", "cashier"].includes(session.user.role))
    redirect("/login");

  return <CashierPageClient staffName={session.user.name ?? "Cashier"} />;
}
