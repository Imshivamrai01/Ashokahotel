"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Users, TicketPercent, MessageCircle, Sparkles } from "lucide-react";
import CustomersTable from "@/components/admin/CustomersTable";
import VouchersManager from "@/components/admin/VouchersManager";
import CrmTemplatesManager from "@/components/admin/CrmTemplatesManager";

function CrmContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as "customers" | "vouchers" | "templates" | null;
  const [tab, setTab] = useState<"customers" | "vouchers" | "templates">(
    initialTab || "customers",
  );

  return (
    <div className="space-y-6">
      {/* CRM Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-playfair flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 text-lg shadow-sm">
              👑
            </span>
            Customer CRM & Marketing Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage customer loyalty, discount promo vouchers, and automated WhatsApp message templates
          </p>
        </div>

        {/* Top Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 shadow-xs">
          <button
            onClick={() => setTab("customers")}
            className={`btn btn-sm rounded-xl font-bold text-xs h-9 min-h-0 gap-1.5 transition-all ${
              tab === "customers"
                ? "bg-amber-500 text-white shadow-sm border-none"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border-none"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers CRM</span>
          </button>

          <button
            onClick={() => setTab("vouchers")}
            className={`btn btn-sm rounded-xl font-bold text-xs h-9 min-h-0 gap-1.5 transition-all ${
              tab === "vouchers"
                ? "bg-amber-500 text-white shadow-sm border-none"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border-none"
            }`}
          >
            <TicketPercent className="w-3.5 h-3.5" />
            <span>Vouchers & Offers</span>
          </button>

          <button
            onClick={() => setTab("templates")}
            className={`btn btn-sm rounded-xl font-bold text-xs h-9 min-h-0 gap-1.5 transition-all ${
              tab === "templates"
                ? "bg-emerald-600 text-white shadow-sm border-none"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border-none"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Templates</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {tab === "customers" && <CustomersTable />}
        {tab === "vouchers" && <VouchersManager />}
        {tab === "templates" && <CrmTemplatesManager />}
      </div>
    </div>
  );
}

export default function CrmPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-500 font-medium">
          <span className="loading loading-spinner loading-md text-amber-500 mr-2" />
          Loading CRM Hub...
        </div>
      }
    >
      <CrmContent />
    </Suspense>
  );
}
