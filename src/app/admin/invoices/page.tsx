import PageHeader from "@/components/PageHeader";
import { FileText } from "lucide-react";
import InvoicesTable from "@/components/admin/InvoicesTable";

export default function AdminInvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Settled bills — print or reprint customer Tax Invoices (CGST/SGST)"
        icon={FileText}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Invoices" },
        ]}
      />
      <InvoicesTable />
    </div>
  );
}
