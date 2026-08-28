import PageHeader from "@/components/PageHeader";
import { Tag } from "lucide-react";
import VouchersManager from "@/components/admin/VouchersManager";

export default function AdminVouchersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Discount Vouchers & Coupons"
        subtitle="Manage promo codes, percentage off, flat discounts, and customer-exclusive vouchers"
        icon={Tag}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Vouchers" },
        ]}
      />
      <VouchersManager />
    </div>
  );
}
