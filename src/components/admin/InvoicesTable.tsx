"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Filter,
  FileText,
  Printer,
  Calendar,
  Layers,
  User,
  Search,
  Receipt,
  IndianRupee,
  Percent,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { IOrder } from "@/types";
import { BillPrintButton } from "@/components/cashier/TableReceipt";

interface BrandingLite {
  hotelName?: string;
  gstNumber?: string;
  logoUrl?: string;
}

const PAYMENT_LABELS: Record<string, { label: string; icon: string; style: string }> = {
  cash: {
    label: "Cash",
    icon: "💵",
    style: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
  },
  card: {
    label: "Card",
    icon: "💳",
    style: "bg-blue-50 text-blue-800 border-blue-300 font-semibold",
  },
  upi: {
    label: "UPI",
    icon: "📱",
    style: "bg-purple-50 text-purple-800 border-purple-300 font-semibold",
  },
};

interface Filters {
  from: string;
  to: string;
  query: string;
}

export interface ConsolidatedInvoice {
  id: string;
  tableLabel: string;
  tableId: string;
  kots: IOrder[];
  kotNumbers: string[];
  kotCount: number;
  itemCount: number;
  captainNames: string[];
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  settledAt: Date;
}

// Settled orders only (paid/cleared) — these are the billable invoices.
async function fetchInvoices(f: Filters): Promise<IOrder[]> {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to + "T23:59:59");
  const res = await fetch(`/api/orders?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const all: IOrder[] = await res.json();
  return all.filter((o) => ["paid", "cleared"].includes(o.status));
}

/** Group individual KOTs of the same table settled together into a single master invoice */
function groupInvoicesByTableSession(orders: IOrder[]): ConsolidatedInvoice[] {
  const sorted = [...orders].sort((a, b) => {
    const timeA = new Date(a.clearedAt || a.paidAt || a.createdAt).getTime();
    const timeB = new Date(b.clearedAt || b.paidAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  const groups: ConsolidatedInvoice[] = [];

  for (const order of sorted) {
    const orderTime = new Date(
      order.clearedAt || order.paidAt || order.createdAt,
    ).getTime();
    const orderTable = String(order.tableId || order.tableLabel);

    // Check if there is an existing invoice session for this table within 15 minutes
    const match = groups.find((g) => {
      if (
        String(g.tableId) !== orderTable &&
        g.tableLabel.toLowerCase() !== order.tableLabel?.toLowerCase()
      ) {
        return false;
      }
      const groupTime = g.settledAt.getTime();
      return Math.abs(groupTime - orderTime) <= 15 * 60 * 1000;
    });

    if (match) {
      match.kots.push(order);
      match.kotNumbers.push(order.kotNumber);
      match.itemCount += (order.items || []).filter(
        (i) => i.itemStatus !== "cancelled",
      ).length;
      match.subtotal += order.subtotal || 0;
      match.discount += order.discountAmount || 0;
      match.tax += order.tax || 0;
      match.total += order.total || 0;
      if (
        order.captainName &&
        !match.captainNames.includes(order.captainName)
      ) {
        match.captainNames.push(order.captainName);
      }
    } else {
      groups.push({
        id: order._id,
        tableLabel: order.tableLabel || "Table",
        tableId: String(order.tableId || order.tableLabel),
        kots: [order],
        kotNumbers: [order.kotNumber],
        kotCount: 1,
        itemCount: (order.items || []).filter(
          (i) => i.itemStatus !== "cancelled",
        ).length,
        captainNames: order.captainName ? [order.captainName] : [],
        paymentMethod: order.paymentMethod || "cash",
        subtotal: order.subtotal || 0,
        discount: order.discountAmount || 0,
        tax: order.tax || 0,
        total: order.total || 0,
        settledAt: new Date(
          order.clearedAt || order.paidAt || order.createdAt,
        ),
      });
    }
  }

  for (const g of groups) {
    g.kotCount = g.kots.length;
  }

  return groups;
}

export default function InvoicesTable() {
  const [activePreset, setActivePreset] = useState<"today" | "yesterday" | "7days" | "all">("7days");
  const [filters, setFilters] = useState<Filters>(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    return { from: weekAgo, to: today, query: "" };
  });

  const { data: branding } = useQuery<BrandingLite>({
    queryKey: ["admin-branding-lite"],
    queryFn: () => fetch("/api/admin/branding").then((r) => r.json()),
    staleTime: 300_000,
  });

  const {
    data: rawOrders = [],
    isLoading,
    isError,
  } = useQuery<IOrder[]>({
    queryKey: ["admin-invoices", filters.from, filters.to],
    queryFn: () => fetchInvoices(filters),
  });

  const set = useCallback((key: keyof Filters, value: string) => {
    setFilters((p) => ({ ...p, [key]: value }));
  }, []);

  const setPreset = (preset: "today" | "yesterday" | "7days" | "all") => {
    setActivePreset(preset);
    const today = format(new Date(), "yyyy-MM-dd");
    if (preset === "today") {
      setFilters((p) => ({ ...p, from: today, to: today }));
    } else if (preset === "yesterday") {
      const yest = format(subDays(new Date(), 1), "yyyy-MM-dd");
      setFilters((p) => ({ ...p, from: yest, to: yest }));
    } else if (preset === "7days") {
      const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      setFilters((p) => ({ ...p, from: weekAgo, to: today }));
    } else if (preset === "all") {
      setFilters((p) => ({ ...p, from: "", to: "" }));
    }
  };

  // Group raw KOT orders into Consolidated Table Invoices
  const consolidatedInvoices = useMemo(() => {
    return groupInvoicesByTableSession(rawOrders);
  }, [rawOrders]);

  const q = filters.query.toLowerCase().trim();
  const filtered = consolidatedInvoices.filter(
    (inv) =>
      !q ||
      inv.tableLabel.toLowerCase().includes(q) ||
      inv.kotNumbers.some((k) => k.toLowerCase().includes(q)) ||
      inv.captainNames.some((c) => c.toLowerCase().includes(q)),
  );

  const subtotalTotal = filtered.reduce((s, o) => s + o.subtotal, 0);
  const discountTotal = filtered.reduce((s, o) => s + o.discount, 0);
  const taxTotal = filtered.reduce((s, o) => s + (o.tax ?? 0), 0);
  const revenue = filtered.reduce((s, o) => s + o.total, 0);
  const totalKotsCount = filtered.reduce((s, o) => s + o.kotCount, 0);

  return (
    <div className="space-y-5">
      {/* 1. Executive KPI Summary Cards (Royal Light Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Master Invoices */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Settled Invoices
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {filtered.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Bills ({totalKotsCount} KOTs)
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>Grouped by table session</span>
          </div>
        </div>

        {/* Card 2: Net Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-50/60 via-white to-white border border-emerald-300/80 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Net Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
              {formatPrice(revenue)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Total collected settlement</span>
          </div>
        </div>

        {/* Card 3: Discounts Given */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Discounts Given
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 font-mono">
              {discountTotal > 0 ? formatPrice(discountTotal) : "₹0"}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span>Customer bill waivers</span>
          </div>
        </div>

        {/* Card 4: Tax / GST */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              GST Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-700 font-mono">
              {taxTotal > 0 ? formatPrice(taxTotal) : "₹0"}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span>CGST + SGST total</span>
          </div>
        </div>
      </div>

      {/* 2. Glassmorphic Filter & Toolbar */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 p-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Left: Inputs */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.query}
                placeholder="Search table, KOT, captain…"
                onChange={(e) => set("query", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-2 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 outline-none transition placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-600 text-[11px] font-semibold">From:</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => {
                  set("from", e.target.value);
                  setActivePreset("all");
                }}
                className="bg-transparent text-slate-800 text-xs outline-none cursor-pointer font-medium"
              />
              <span className="text-slate-400 text-[11px] px-1">→</span>
              <span className="text-slate-600 text-[11px] font-semibold">To:</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => {
                  set("to", e.target.value);
                  setActivePreset("all");
                }}
                className="bg-transparent text-slate-800 text-xs outline-none cursor-pointer font-medium"
              />
            </div>
          </div>

          {/* Right: Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setPreset("today")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                activePreset === "today"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPreset("yesterday")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                activePreset === "yesterday"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset("7days")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                activePreset === "7days"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPreset("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                activePreset === "all"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-3.5 text-xs font-medium">
          Failed to load invoices. Please refresh the page.
        </div>
      )}

      {/* 3. Advanced Datatable (Light Theme) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <div className="min-w-[980px] flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-amber-50/70 border-b border-amber-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 items-center shrink-0">
              <div className="col-span-2">Table / Date</div>
              <div className="col-span-2">Included KOTs</div>
              <div className="col-span-1">Captain</div>
              <div className="col-span-1">Payment</div>
              <div className="col-span-1 text-right">Subtotal</div>
              <div className="col-span-1 text-right">Discount</div>
              <div className="col-span-1 text-right">GST</div>
              <div className="col-span-1 text-right">Final Total</div>
              <div className="col-span-2 text-center">Tax Invoice</div>
            </div>

            {/* Rows */}
            <div className="overflow-y-auto max-h-[480px] divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center space-y-3">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
                  <p className="text-xs text-slate-500 font-medium">Loading settled invoices...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">No Settled Invoices Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Invoices appear here once orders are collected and settled at the Cashier counter.
                  </p>
                </div>
              ) : (
                filtered.map((inv) => {
                  const payMeta = PAYMENT_LABELS[inv.paymentMethod] || {
                    label: inv.paymentMethod || "Cash",
                    icon: "💵",
                    style: "bg-slate-100 text-slate-800 border-slate-200",
                  };

                  return (
                    <div
                      key={inv.id}
                      className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-amber-50/40 items-center transition-colors text-xs group"
                    >
                      {/* Table & Date */}
                      <div className="col-span-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                            🪑 {inv.tableLabel}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {format(inv.settledAt, "dd MMM yyyy, hh:mm a")}
                        </span>
                      </div>

                      {/* Included KOTs */}
                      <div className="col-span-2 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {inv.kotCount} KOT{inv.kotCount > 1 ? "s" : ""}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 truncate font-medium">
                            {inv.kotNumbers.join(", ")}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                          {inv.itemCount} items ordered
                        </span>
                      </div>

                      {/* Captains */}
                      <div className="col-span-1 min-w-0">
                        <span className="text-xs text-slate-700 font-semibold truncate block">
                          {inv.captainNames.length > 0
                            ? inv.captainNames.join(", ")
                            : "—"}
                        </span>
                      </div>

                      {/* Payment Mode */}
                      <div className="col-span-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border ${payMeta.style}`}
                        >
                          <span>{payMeta.icon}</span>
                          <span>{payMeta.label}</span>
                        </span>
                      </div>

                      {/* Subtotal */}
                      <div className="col-span-1 text-right font-mono text-xs text-slate-700 font-medium">
                        {formatPrice(inv.subtotal)}
                      </div>

                      {/* Discount */}
                      <div className="col-span-1 text-right font-mono text-xs">
                        {inv.discount > 0 ? (
                          <span className="text-amber-700 font-bold">
                            − {formatPrice(inv.discount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      {/* GST */}
                      <div className="col-span-1 text-right font-mono text-xs text-slate-600 font-medium">
                        {inv.tax > 0 ? formatPrice(inv.tax) : <span className="text-slate-400">—</span>}
                      </div>

                      {/* Grand Total */}
                      <div className="col-span-1 text-right font-mono font-black text-sm text-emerald-700">
                        {formatPrice(inv.total)}
                      </div>

                      {/* Tax Invoice Action */}
                      <div className="col-span-2 text-center">
                        <BillPrintButton
                          data={{
                            tableLabel: inv.tableLabel,
                            kots: inv.kots,
                          }}
                          hotelName={branding?.hotelName}
                          gstNumber={branding?.gstNumber}
                          logoUrl={branding?.logoUrl}
                          label="Print Tax Invoice"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold border border-slate-800 rounded-xl px-3 py-1 text-xs shadow-sm hover:shadow transition-all"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 4. Luxury Total Summary Footer Bar (Light Theme) */}
            {filtered.length > 0 && (
              <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 border-t-2 border-amber-400 items-center shrink-0 shadow-inner">
                {/* 1. Col-span-2: Summary Title (Aligned under TABLE / DATE) */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0" />
                  <span className="text-[11px] font-black tracking-wider uppercase text-slate-800">
                    TOTAL SUMMARY
                  </span>
                </div>

                {/* 2. Col-span-2: Master Bills & KOTs Badge (Aligned exactly under INCLUDED KOTS) */}
                <div className="col-span-2 flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300/80 tracking-tight shadow-sm">
                    {filtered.length} Master Bills ({totalKotsCount} KOTs)
                  </span>
                </div>

                {/* 3. Col-span-1: Aligned under CAPTAIN */}
                <div className="col-span-1" />

                {/* 4. Col-span-1: Aligned under PAYMENT */}
                <div className="col-span-1" />

                {/* 5. Col-span-1: Subtotal */}
                <div className="col-span-1 text-right font-mono text-xs text-slate-800 font-bold">
                  {formatPrice(subtotalTotal)}
                </div>

                {/* 6. Col-span-1: Discount */}
                <div className="col-span-1 text-right font-mono text-xs">
                  {discountTotal > 0 ? (
                    <span className="text-amber-700 font-bold">
                      − {formatPrice(discountTotal)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                {/* 7. Col-span-1: GST */}
                <div className="col-span-1 text-right font-mono text-xs text-amber-800 font-bold">
                  {formatPrice(taxTotal)}
                </div>

                {/* 8. Col-span-1: Grand Total Highlight Badge */}
                <div className="col-span-1 text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 font-mono text-sm font-black text-emerald-800 shadow-sm">
                    {formatPrice(revenue)}
                  </span>
                </div>

                {/* 9. Col-span-2: Action Col Placeholder */}
                <div className="col-span-2 text-center text-[11px] text-slate-500 font-bold">
                  All Settled
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

