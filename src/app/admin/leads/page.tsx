import PageHeader from "@/components/PageHeader";
import { Users } from "lucide-react";
import AdminLeadsClient from "@/components/leads/AdminLeadsClient";

export default function AdminLeadsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Manager"
        subtitle="All leads across all managers — filter, reassign, and export"
        icon={Users}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Leads" },
        ]}
      />
      <AdminLeadsClient />
    </div>
  );
}
