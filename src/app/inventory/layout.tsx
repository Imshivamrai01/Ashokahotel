import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import InventorySidebar from "./_components/InventorySidebar";

// Inventory area — open to admin + inventory_manager only.
export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !role || !["admin", "inventory_manager"].includes(role)) {
    redirect("/login");
  }

  return (
    <ReactQueryProvider>
      <div className="flex min-h-screen bg-base-100">
        <InventorySidebar isAdmin={role === "admin"} />
        <main className="flex-1 min-h-screen overflow-x-hidden bg-base-100">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto mt-14 md:mt-0">
            {children}
          </div>
        </main>
      </div>
    </ReactQueryProvider>
  );
}
