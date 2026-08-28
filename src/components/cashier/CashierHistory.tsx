"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Pill } from "@/components/ui/Pill";
import { BillPrintButton } from "./TableReceipt";
import type { IOrder } from "@/types";

const getJSON = (u: string) => fetch(u).then((r) => r.json());

interface ConsolidatedTableSession {
  id: string;
  tableLabel: string;
  tableId: string;
  kots: IOrder[];
  kotNumbers: string[];
  total: number;
  paymentMethod: string;
  settledAt: Date;
}

export default function CashierHistory({ onExit }: { onExit: () => void }) {
  const { data: rawOrders = [], isLoading } = useQuery<IOrder[]>({
    queryKey: ["cashier-history"],
    queryFn: () => getJSON("/api/orders/cashier/history"),
    refetchInterval: 15000,
  });

  const { data: branding } = useQuery<{
    hotelName?: string;
    gstNumber?: string;
    logoUrl?: string;
  }>({
    queryKey: ["cashier-branding-lite"],
    queryFn: () => getJSON("/api/admin/branding"),
    staleTime: 300_000,
  });

  const sessions = useMemo(() => {
    const sorted = [...rawOrders].sort((a, b) => {
      const timeA = new Date(a.clearedAt || a.paidAt || a.createdAt).getTime();
      const timeB = new Date(b.clearedAt || b.paidAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    const groups: ConsolidatedTableSession[] = [];

    for (const order of sorted) {
      const orderTime = new Date(
        order.clearedAt || order.paidAt || order.createdAt,
      ).getTime();
      const orderTable = String(order.tableId || order.tableLabel);

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
        match.total += order.total || 0;
      } else {
        groups.push({
          id: order._id,
          tableLabel: order.tableLabel || "Table",
          tableId: String(order.tableId || order.tableLabel),
          kots: [order],
          kotNumbers: [order.kotNumber],
          total: order.total || 0,
          paymentMethod: order.paymentMethod || "cash",
          settledAt: new Date(
            order.clearedAt || order.paidAt || order.createdAt,
          ),
        });
      }
    }

    return groups;
  }, [rawOrders]);

  const total = rawOrders.reduce((s, o) => s + (o.total ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-base-300 bg-base-200/50 shrink-0">
        <button
          onClick={onExit}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <History className="w-5 h-5 text-success" />
          <div>
            <p className="font-bold text-sm leading-none">Today&apos;s Settled Bills</p>
            <p className="text-xs text-base-content/50 leading-none mt-0.5">
              {sessions.length} bills ({rawOrders.length} KOTs) · {formatPrice(total)}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-base-200 animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-base-content/40">
            <span className="text-4xl">🧾</span>
            <p className="text-sm">No settled orders today yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-base-300/60">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-white">
                      🪑 {s.tableLabel}
                    </span>
                    <span className="badge badge-warning badge-xs font-bold text-black">
                      {s.kots.length} KOT{s.kots.length > 1 ? "s" : ""}
                    </span>
                    <span className="font-mono text-xs text-warning">
                      ({s.kotNumbers.join(", ")})
                    </span>
                  </div>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {format(s.settledAt, "HH:mm")}
                    {s.paymentMethod
                      ? ` · ${s.paymentMethod.replace("_", " ").toUpperCase()}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-extrabold text-sm tabular-nums text-emerald-400 font-mono">
                    {formatPrice(s.total)}
                  </span>
                  <Pill variant="success">Paid</Pill>
                  <BillPrintButton
                    data={{ tableLabel: s.tableLabel, kots: s.kots }}
                    hotelName={branding?.hotelName}
                    gstNumber={branding?.gstNumber}
                    logoUrl={branding?.logoUrl}
                    label="Print Bill"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
