import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CaptainPageClient from "@/components/captain/CaptainPageClient";

export default async function CaptainPage() {
  const session = await auth();

  if (!session?.user || !["admin", "captain"].includes(session.user.role)) {
    redirect("/login");
  }

  return <CaptainPageClient captainName={session.user.name ?? "Captain"} />;
}
