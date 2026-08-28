"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, ArrowLeft, Search, Receipt, CheckCircle2, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Pill } from "@/components/ui/Pill";
import { BillPrintButton } from "./TableReceipt";
import type { IOrder } from "@/types";
import type { TableBill } from "@/app/api/orders/cashier/route";

const getJSON = (u: string) => fetch(u).then((r) => r.json());

interface Props {
  onExit: () => void;
}

export default function CashierInvoices({ onExit }: Props) {
  const [tab, setTab] = useState<"all" | "unpaid" | "paid">("all");
  const [search, setSearch] = useState("");

  // 1. Fetch Active Tables (Unpaid Estimates)
  const { data: activeTables = [], isLoading: loadingActive } = useQuery<TableBill[]>({
    queryKey: ["cashier-tables"],
    queryFn: () => getJSON("/api/orders/cashier"),
    refetchInterval: 6000,
  });

  // 2. Fetch Settled Orders (Paid Invoices)
  const { data: settledOrders = [], isLoading: loadingSettled } = useQuery<IOrder[]>({
    queryKey: ["cashier-history"],
    queryFn: () => getJSON("/api/orders/cashier/history"),
    refetchInterval: 15000,
  });

  // 3. Branding for invoice printing
  const { data: branding } = useQuery<{
    hotelName?: string;
    gstNumber?: string;
    logoUrl?: string;
  }>({
    queryKey: ["cashier-branding-lite"],
    queryFn: () => getJSON("/api/admin/branding"),
    staleTime: 300_000,
  });

  // Group settled orders by table session
  const settledSessions = useMemo(() => {
    const sorted = [...settledOrders].sort((a, b) => {
      const timeA = new Date(a.clearedAt || a.paidAt || a.createdAt).getTime();
      const timeB = new Date(b.clearedAt || b.paidAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: any[] = [];

    for (const order of sorted) {
      const orderTime = new Date(order.clearedAt || order.paidAt || order.createdAt).getTime();
      const orderTable = String(order.tableId || order.tableLabel);

      const match = groups.find((g) => {
        if (String(g.tableId) !== orderTable && g.tableLabel.toLowerCase() !== order.tableLabel?.toLowerCase()) {
          return false;
        }
        return Math.abs(g.settledAt.getTime() - orderTime) <= 15 * 60 * 1000;
      });

      if (match) {
        match.kots.push(order);
        match.kotNumbers.push(order.kotNumber);
        match.total += order.total || 0;
        match.subtotal += order.subtotal || 0;
        match.tax += order.tax || 0;
        match.discount += order.discountAmount || 0;
      } else {
        groups.push({
          id: order._id,
          tableLabel: order.tableLabel || "Table",
          tableId: String(order.tableId || order.tableLabel),
          kots: [order],
          kotNumbers: [order.kotNumber],
          total: order.total || 0,
          subtotal: order.subtotal || 0,
          tax: order.tax || 0,
          discount: order.discountAmount || 0,
          paymentMethod: order.paymentMethod || "cash",
          settledAt: new Date(order.clearedAt || order.paidAt || order.createdAt),
          isPaid: true,
        });
      }
    }
    return groups;
  }, [settledOrders]);

  // Combine Unpaid Table Bills + Paid Sessions
  const allBills = useMemo(() => {
    const list: Array<{
      id: string;
      tableLabel: string;
      kots: IOrder[];
      kotNumbers: string[];
      total: number;
      subtotal: number;
      tax: number;
      discount: number;
      isPaid: boolean;
      paymentMethod?: string;
      time: Date;
    }> = [];

    // Add Unpaid
    activeTables.forEach((t) => {
      list.push({
        id: `unpaid-${t.tableId}`,
        tableLabel: t.tableLabel,
        kots: t.kots,
        kotNumbers: t.kots.map((k) => k.kotNumber),
        total: t.total,
        subtotal: t.subtotal,
        tax: t.tax,
        discount: 0,
        isPaid: false,
        time: new Date(t.since),
      });
    });

    // Add Paid
    settledSessions.forEach((s) => {
      list.push({
        id: `paid-${s.id}`,
        tableLabel: s.tableLabel,
        kots: s.kots,
        kotNumbers: s.kotNumbers,
        total: s.total,
        subtotal: s.subtotal,
        tax: s.tax,
        discount: s.discount,
        isPaid: true,
        paymentMethod: s.paymentMethod,
        time: s.settledAt,
      });
    });

    return list;
  }, [activeTables, settledSessions]);

  const q = search.toLowerCase().trim();
  const filtered = allBills.filter((b) => {
    if (tab === "unpaid" && b.isPaid) return false;
    if (tab === "paid" && !b.isPaid) return false;
    if (!q) return true;
    return (
      b.tableLabel.toLowerCase().includes(q) ||
      b.kotNumbers.some((k) => k.toLowerCase().includes(q))
    );
  });

  const isLoading = loadingActive || loadingSettled;

  return (
    <div className="flex flex-col h-full bg-[#FAF9F6]">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-white/90 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="btn btn-ghost btn-sm btn-circle text-slate-700 hover:bg-slate-100"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-bold text-base leading-none text-slate-900">
                Invoices & Bills
              </p>
              <p className="text-xs text-slate-500 leading-none mt-1">
                Print pre-payment checks & reprint settled tax invoices
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              tab === "all" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({allBills.length})
          </button>
          <button
            onClick={() => setTab("unpaid")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              tab === "unpaid" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unpaid / Active ({activeTables.length})
          </button>
          <button
            onClick={() => setTab("paid")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              tab === "paid" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Paid ({settledSessions.length})
          </button>
        </div>
      </header>

      {/* Search Filter */}
      <div className="p-3 border-b border-slate-200 bg-white/50 shrink-0">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Table (e.g. Table 2) or KOT..."
            className="input input-sm bg-white border border-slate-200 text-slate-900 pl-9 w-full rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none placeholder:text-slate-400 text-xs font-medium"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-1 text-amber-600">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No Invoices Found</p>
            <p className="text-xs text-slate-500">
              Active table bills and paid invoices will show up here.
            </p>
          </div>
        ) : (
          filtered.map((b) => (
            <div
              key={b.id}
              className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                b.isPaid
                  ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                  : "bg-gradient-to-r from-amber-50/70 via-white to-white border-amber-300 hover:border-amber-400 shadow-sm"
              }`}
            >
              {/* Left Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-base text-slate-900">
                    🪑 {b.tableLabel}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      b.isPaid
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                    }`}
                  >
                    {b.isPaid ? "PAID ✅" : "PENDING ⏳"}
                  </span>
                  <span className="text-xs font-mono text-amber-800 font-semibold">
                    ({b.kotNumbers.join(", ")})
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {format(b.time, "dd MMM, hh:mm a")}
                  </span>
                  {b.isPaid && b.paymentMethod && (
                    <span className="text-slate-700 font-semibold uppercase">
                      • {b.paymentMethod.replace("_", " ")}
                    </span>
                  )}
                  <span className="text-slate-400">• {b.kots.length} KOT{b.kots.length > 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Right: Amount & Print */}
              <div className="flex items-center gap-3.5 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Total</p>
                  <p
                    className={`font-mono font-black text-base ${
                      b.isPaid ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {formatPrice(b.total)}
                  </p>
                </div>

                <BillPrintButton
                  data={{ tableLabel: b.tableLabel, kots: b.kots }}
                  hotelName={branding?.hotelName}
                  gstNumber={branding?.gstNumber}
                  logoUrl={branding?.logoUrl}
                  label={b.isPaid ? "Print Tax Invoice" : "Print Estimate (Bill)"}
                  className={
                    b.isPaid
                      ? "bg-slate-900 hover:bg-slate-800 text-white font-bold border border-slate-800 rounded-xl px-3 py-1 text-xs shadow-sm hover:shadow transition-all"
                      : "bg-amber-500 hover:bg-amber-600 text-white font-bold border border-amber-500 rounded-xl px-3 py-1 text-xs shadow-sm hover:shadow transition-all"
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Total Summary Strip */}
      {filtered.length > 0 && (
        <footer className="p-3 border-t-2 border-amber-400 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 flex items-center justify-between gap-4 flex-wrap shrink-0 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <span className="text-[11px] font-black tracking-wider uppercase text-slate-800">
              TOTAL SUMMARY
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {filtered.length} Bills
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Subtotal</span>
              <span className="font-bold text-slate-800">
                {formatPrice(filtered.reduce((s, o) => s + o.subtotal, 0))}
              </span>
            </div>
            {filtered.reduce((s, o) => s + o.discount, 0) > 0 && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Discount</span>
                <span className="font-bold text-amber-700">
                  − {formatPrice(filtered.reduce((s, o) => s + o.discount, 0))}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">GST</span>
              <span className="font-bold text-amber-800">
                {formatPrice(filtered.reduce((s, o) => s + o.tax, 0))}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Grand Total</span>
              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 font-black text-sm text-emerald-800 shadow-sm">
                {formatPrice(filtered.reduce((s, o) => s + o.total, 0))}
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
