import PageHeader from "@/components/PageHeader";
import { BarChart3 } from "lucide-react";
import MetricsDashboard from "@/components/admin/MetricsDashboard";

export default function AdminMetricsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics & Analytics"
        subtitle="Revenue trends, top items, peak hours, and captain performance"
        icon={BarChart3}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Metrics" },
        ]}
      />
      <MetricsDashboard />
    </div>
  );
}
