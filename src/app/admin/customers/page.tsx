import PageHeader from "@/components/PageHeader";
import { Users } from "lucide-react";
import CustomersTable from "@/components/admin/CustomersTable";

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer CRM"
        subtitle="Manage guest profiles, visit history, birthdays, and marriage anniversaries"
        icon={Users}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Customers" },
        ]}
      />
      <CustomersTable />
    </div>
  );
}
