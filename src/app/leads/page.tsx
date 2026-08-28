import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LeadsPageClient from "@/components/leads/LeadsPageClient";

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user || !["admin", "lead_manager"].includes(session.user.role))
    redirect("/login");

  return <LeadsPageClient staffName={session.user.name ?? "Lead Manager"} />;
}
