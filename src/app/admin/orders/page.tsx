import PageHeader from "@/components/PageHeader";
import { ClipboardList } from "lucide-react";
import OrdersTableClient from "@/components/admin/OrdersTable";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ captain?: string }>;
}) {
  const { captain } = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Order History"
        subtitle="Full order log with filters and CSV export"
        icon={ClipboardList}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Orders" },
        ]}
      />
      <OrdersTableClient initialCaptain={captain ?? ""} />
    </div>
  );
}
