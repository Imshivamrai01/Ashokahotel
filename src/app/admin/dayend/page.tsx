"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  IndianRupee,
  Receipt,
  Gift,
  Ban,
  Download,
  CreditCard,
  Smartphone,
  Banknote,
  Users,
  UtensilsCrossed,
  Award,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { exportXlsx } from "@/lib/inventory/sheet";

interface DayEnd {
  date: string;
  orderCount: number;
  sales: number;
  tax: number;
  net: number;
  itemsSold: number;
  ncCount: number;
  ncValue: number;
  voids: number;
  byPayment: { method: string; amount: number }[];
  byHour: { hour: string; amount: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  byCaptain?: { name: string; orders: number; revenue: number }[];
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function DayEndPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery<DayEnd>({
    queryKey: ["dayend", date],
    queryFn: () => getJSON(`/api/orders/dayend?date=${date}`),
  });

  const cards = [
    {
      label: "Total Sales",
      value: data ? formatPrice(data.sales) : "—",
      icon: IndianRupee,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      label: "Orders Settled",
      value: data?.orderCount ?? "—",
      icon: Receipt,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      label: "Tax Collected",
      value: data ? formatPrice(data.tax) : "—",
      icon: IndianRupee,
      color: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
      label: "Items Sold",
      value: data?.itemsSold ?? "—",
      icon: UtensilsCrossed,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
      label: "No-Charge (NC)",
      value: data ? `${data.ncCount} · ${formatPrice(data.ncValue)}` : "—",
      icon: Gift,
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      label: "Cancelled / Voids",
      value: data?.voids ?? "—",
      icon: Ban,
      color: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  const totalPaymentCollected = (data?.byPayment ?? []).reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day-end Report"
        subtitle="Daily sales audit, payment collections, and staff sales performance"
        icon={CalendarDays}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Day-end" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 bg-white border-slate-300 text-slate-900 rounded-xl font-bold text-xs"
            />
            <Button
              size="sm"
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs"
              disabled={!data}
              onClick={() =>
                data &&
                exportXlsx(
                  [
                    { metric: "Date", value: data.date },
                    { metric: "Sales", value: data.sales },
                    { metric: "Net", value: data.net },
                    { metric: "Tax", value: data.tax },
                    { metric: "Orders", value: data.orderCount },
                    { metric: "Items sold", value: data.itemsSold },
                    { metric: "NC count", value: data.ncCount },
                    { metric: "NC value", value: data.ncValue },
                    { metric: "Voids", value: data.voids },
                    ...data.byPayment.map((p) => ({
                      metric: `Payment: ${p.method}`,
                      value: p.amount,
                    })),
                    ...data.topItems.map((t) => ({
                      metric: `Item: ${t.name} (x${t.qty})`,
                      value: t.revenue,
                    })),
                    ...(data.byCaptain ?? []).map((c) => ({
                      metric: `Captain: ${c.name} (${c.orders} orders)`,
                      value: c.revenue,
                    })),
                  ],
                  `dayend-${data.date}.xlsx`,
                )
              }
            >
              <Download className="w-4 h-4" /> Export XLSX
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:border-amber-300 transition-colors"
          >
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2.5 ${c.color}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {c.value}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Grid: Compact Payments Card & Top Sold Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Compact Payments Card */}
        <Panel
          title="Payment Collections"
          badge={
            totalPaymentCollected > 0
              ? `Total: ${formatPrice(totalPaymentCollected)}`
              : undefined
          }
        >
          {(data?.byPayment ?? []).length === 0 ? (
            <Empty message="No payments recorded for this day." />
          ) : (
            <div className="p-2">
              <ul className="divide-y divide-slate-100">
                {data?.byPayment.map((p) => {
                  const methodLower = p.method.toLowerCase();
                  const isCash = methodLower.includes("cash");
                  const isUpi = methodLower.includes("upi");
                  const isCard = methodLower.includes("card");
                  const share =
                    totalPaymentCollected > 0
                      ? Math.round((p.amount / totalPaymentCollected) * 100)
                      : 0;

                  return (
                    <li
                      key={p.method}
                      className="flex items-center justify-between px-3.5 py-3 hover:bg-amber-50/40 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                            isCash
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isUpi
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : isCard
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isCash ? (
                            <Banknote className="w-4 h-4" />
                          ) : isUpi ? (
                            <Smartphone className="w-4 h-4" />
                          ) : isCard ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <IndianRupee className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900 capitalize">
                            {p.method.replace("_", " ")}
                          </p>
                          <p className="text-[11px] font-bold text-slate-400 font-mono">
                            {share}% of total
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-base text-slate-900">
                          {formatPrice(p.amount)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {totalPaymentCollected > 0 && (
                <div className="mt-2 pt-3 px-3.5 border-t border-slate-100 flex items-center justify-between bg-amber-50/50 rounded-xl py-2.5">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Total Settled
                  </span>
                  <span className="font-mono font-black text-base text-emerald-700">
                    {formatPrice(totalPaymentCollected)}
                  </span>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Top Items */}
        <Panel title="Top Sold Items">
          {(data?.topItems ?? []).length === 0 ? (
            <Empty message="No item sales recorded for this day." />
          ) : (
            <div className="p-2">
              <ul className="divide-y divide-slate-100">
                {data?.topItems.slice(0, 7).map((t, idx) => (
                  <li
                    key={t.name}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-amber-50/40 rounded-xl transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-xs font-bold text-slate-400 font-mono">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {t.name}
                      </span>
                      <span className="badge badge-sm bg-slate-100 border-slate-200 text-slate-700 font-mono font-bold shrink-0">
                        ×{t.qty}
                      </span>
                    </div>
                    <span className="font-mono font-black text-slate-900 shrink-0 ml-2">
                      {formatPrice(t.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Captain & Staff Sales Performance (Directly Below Payments) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-200/60 bg-amber-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 font-playfair tracking-tight">
                Captain & Staff Sales Performance
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Orders taken, total revenue, and sales share for {date}
              </p>
            </div>
          </div>
          <span className="badge badge-sm bg-white border-amber-300 text-amber-900 font-bold font-mono">
            {(data?.byCaptain ?? []).length} Active Captains / Channels
          </span>
        </div>

        {(data?.byCaptain ?? []).length === 0 ? (
          <Empty message="No captain-assigned orders recorded for this day." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-5">Rank & Captain</th>
                  <th className="text-right">Orders Taken</th>
                  <th className="text-right">Total Sales</th>
                  <th className="text-right">Avg / Order (AOV)</th>
                  <th className="text-right px-5">Sales Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.byCaptain ?? []).map((c, i) => {
                  const totalOrders = data?.orderCount ?? 1;
                  const totalSales = data?.sales ?? 1;
                  const orderShare = Math.round((c.orders / (totalOrders || 1)) * 100);
                  const salesShare = Math.round((c.revenue / (totalSales || 1)) * 100);
                  const aov = c.orders > 0 ? Math.round(c.revenue / c.orders) : 0;

                  return (
                    <tr key={c.name} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                            i === 0
                              ? "bg-amber-100 text-amber-900 border border-amber-300 font-black"
                              : i === 1
                                ? "bg-slate-100 text-slate-800 border border-slate-300"
                                : "bg-slate-50 text-slate-600"
                          }`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {c.name}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-medium">
                              {orderShare}% of total orders ({c.orders})
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right font-mono font-bold text-slate-800 text-sm">
                        {c.orders}
                      </td>
                      <td className="text-right font-mono font-black text-emerald-700 text-sm">
                        {formatPrice(c.revenue)}
                      </td>
                      <td className="text-right font-mono font-bold text-slate-700 text-xs">
                        {formatPrice(aov)}
                      </td>
                      <td className="w-44 text-right px-5">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-24 border border-slate-200">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(5, salesShare))}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-black text-slate-700 w-9 tabular-nums">
                            {salesShare}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-100 font-black text-sm text-slate-900 flex items-center justify-between bg-slate-50/50">
        <span>{title}</span>
        {badge && (
          <span className="badge badge-sm bg-emerald-50 text-emerald-800 border-emerald-200 font-mono font-bold">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <p className="p-8 text-center text-xs font-medium text-slate-400">
      {message}
    </p>
  );
}
