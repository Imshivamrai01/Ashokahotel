import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReceptionistPageClient from "@/components/receptionist/ReceptionistPageClient";

export default async function ReceptionistPage() {
  const session = await auth();

  if (
    !session?.user ||
    !["admin", "receptionist", "captain", "cashier"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  return (
    <ReceptionistPageClient
      staffName={session.user.name ?? "Receptionist"}
      role={session.user.role}
    />
  );
}
