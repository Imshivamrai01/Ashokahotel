"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Receipt,
  ChevronDown,
  ChevronUp,
  Check,
  X as XIcon,
  ArrowRightLeft,
  Trash2,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { formatElapsed, formatPrice } from "@/lib/utils";
import { BillPrintButton } from "./TableReceipt";
import PaymentModal from "./PaymentModal";
import TransferModal from "./TransferModal";
import VoidModal from "./VoidModal";
import type { TableBill } from "@/app/api/orders/cashier/route";
import { Pill } from "@/components/ui/Pill";

async function fetchCashierTables(): Promise<TableBill[]> {
  const res = await fetch("/api/orders/cashier", { cache: "no-store" });
  if (!res.ok) throw new Error();
  return res.json();
}

export default function OrdersQueue() {
  const {
    data: tables = [],
    isLoading,
    refetch,
  } = useQuery<TableBill[]>({
    queryKey: ["cashier-tables"],
    queryFn: fetchCashierTables,
    refetchInterval: 5000,
  });

  const { data: branding } = useQuery<{
    hotelName?: string;
    gstNumber?: string;
    logoUrl?: string;
  }>({
    queryKey: ["cashier-branding-lite"],
    queryFn: () => fetch("/api/admin/branding").then((r) => r.json()),
    staleTime: 300_000,
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<TableBill | null>(null);
  const [transferTable, setTransferTable] = useState<TableBill | null>(null);
  const [voidTable, setVoidTable] = useState<TableBill | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  // Force a re-render every 1 second to keep the elapsed timers (mm:ss) updating live
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cashier takeover when the kitchen is behind: force an item delivered (it was
  // served, chef never tapped) or cancel it (never made → drop from the bill).
  async function resolveItem(
    orderId: string,
    itemId: string,
    itemStatus: "delivered" | "cancelled",
  ) {
    setBusyItem(itemId);
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemStatus }),
      });
      if (!res.ok) throw new Error();
      await refetch();
    } catch {
      toast.error("Could not update item");
    } finally {
      setBusyItem(null);
    }
  }

  // Toggle No-Charge (complimentary) on an item — ₹0 on the bill.
  async function toggleNC(orderId: string, itemId: string, makeNC: boolean) {
    const reason = makeNC
      ? window.prompt("Reason for No Charge? (e.g. complaint, VIP)") ?? undefined
      : undefined;
    if (makeNC && reason === undefined) return; // cancelled the prompt
    setBusyItem(itemId);
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNC: makeNC, ncReason: reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await refetch();
      toast.success(makeNC ? "Marked No Charge" : "No Charge removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update item");
    } finally {
      setBusyItem(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-base-300 bg-base-200/50 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-success" />
        <h2 className="font-bold text-base">Billing Queue</h2>
        {isLoading && (
          <span className="loading loading-spinner loading-xs text-base-content/40" />
        )}
        <Pill variant="success" className="ml-auto">
          {tables.length} table{tables.length !== 1 ? "s" : ""}
        </Pill>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-base-300/60">
        {!isLoading && tables.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-base-content/40">
            <span className="text-4xl">💰</span>
            <p className="text-sm">No tables awaiting billing</p>
          </div>
        )}

        <AnimatePresence>
          {tables.map((table) => {
            const isExp = expanded === table.tableId;
            const hasCancelled = table.kots.some((k) =>
              k.items.some((i) => i.itemStatus === "cancelled"),
            );
            // A KOT is "pending" for billing if it has any non-cancelled item that
            // isn't delivered yet. Cashier can resolve these inline below.
            const pendingKots = table.kots.filter((k) => {
              if (k.status === "cancelled") return false;
              const activeItems = k.items.filter(
                (i) => i.itemStatus !== "cancelled",
              );
              return (
                activeItems.length === 0 ||
                !activeItems.every((i) => i.itemStatus === "delivered")
              );
            });
            return (
              <motion.div
                key={table.tableId}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="font-bold text-base shrink-0">
                      🪑 {table.tableLabel}
                    </span>
                    <Pill variant="outline" className="shrink-0">
                      {table.kots.length} KOT
                      {table.kots.length !== 1 ? "s" : ""}
                    </Pill>
                    {hasCancelled && (
                      <Pill variant="error" className="shrink-0">
                        voids
                      </Pill>
                    )}
                    {pendingKots.length > 0 && (
                      <Pill variant="warning" className="shrink-0">
                        {pendingKots.length} in kitchen
                      </Pill>
                    )}
                  </div>
                  <button
                    onClick={() => setExpanded(isExp ? null : table.tableId)}
                    className="btn btn-ghost btn-xs btn-circle"
                  >
                    {isExp ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-base-content/60 mb-3">
                  <span>
                    {table.itemCount} item{table.itemCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(table.since)}
                  </span>
                </div>

                {/* Bill Breakdown */}
                <div className="space-y-1.5 text-xs bg-base-200/50 p-2.5 rounded-lg mb-3">
                  <div className="flex justify-between">
                    <span className="opacity-70">Subtotal</span>
                    <span>{formatPrice(table.subtotal)}</span>
                  </div>
                  {table.tax > 0 && (
                    <div className="flex justify-between opacity-70">
                      <span>GST</span>
                      <span>{formatPrice(table.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-base-300 pt-1">
                    <span>Total</span>
                    <span className="text-warning font-mono">
                      {formatPrice(table.total)}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-1 mb-3">
                        {table.kots.map((kot) => (
                          <div
                            key={kot._id}
                            className="bg-base-200/30 rounded-lg p-2.5 text-xs"
                          >
                            <div className="flex justify-between font-semibold mb-1.5 opacity-80">
                              <span>KOT #{kot.kotNumber}</span>
                              <span className="capitalize">{kot.status}</span>
                            </div>
                            <ul className="space-y-1">
                              {kot.items.map((item) => {
                                const cancelled =
                                  item.itemStatus === "cancelled";
                                const delivered =
                                  item.itemStatus === "delivered";
                                const unresolved = !cancelled && !delivered;
                                const busy = busyItem === item._id;
                                return (
                                  <li
                                    key={item._id}
                                    className={`flex items-center justify-between gap-1 ${cancelled ? "opacity-40 line-through" : ""}`}
                                  >
                                    <span className="truncate flex-1">
                                      {item.quantity}x {item.name}
                                    </span>
                                    <span className="opacity-70 shrink-0 font-mono">
                                      {item.isNC ? "NC" : formatPrice(item.price * item.quantity)}
                                    </span>
                                    {!cancelled && (
                                      <div className="flex items-center gap-1 shrink-0 ml-1">
                                        <button
                                          onClick={() =>
                                            toggleNC(
                                              kot._id,
                                              item._id,
                                              !item.isNC,
                                            )
                                          }
                                          disabled={busy}
                                          title={
                                            item.isNC
                                              ? "Remove No Charge"
                                              : "Mark No Charge (free)"
                                          }
                                          className={`btn btn-xs btn-circle ${item.isNC ? "btn-success" : "btn-ghost border border-base-300"}`}
                                        >
                                          <Gift className="w-3 h-3" />
                                        </button>
                                        {unresolved && (
                                          <>
                                            <button
                                              onClick={() =>
                                                resolveItem(
                                                  kot._id,
                                                  item._id,
                                                  "delivered",
                                                )
                                              }
                                              disabled={busy}
                                              title="Mark served"
                                              className="btn btn-ghost btn-xs text-success px-1.5 h-5 min-h-0"
                                            >
                                              <Check className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                resolveItem(
                                                  kot._id,
                                                  item._id,
                                                  "cancelled",
                                                )
                                              }
                                              disabled={busy}
                                              title="Cancel item"
                                              className="btn btn-ghost btn-xs text-error px-1.5 h-5 min-h-0"
                                            >
                                              <XIcon className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setTransferTable(table)}
                          className="btn btn-outline btn-info btn-sm flex-1 gap-1"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Transfer
                        </button>
                        <button
                          onClick={() => setVoidTable(table)}
                          className="btn btn-outline btn-error btn-sm flex-1 gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Void
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <BillPrintButton
                    data={{ tableLabel: table.tableLabel, kots: table.kots }}
                    hotelName={branding?.hotelName}
                    gstNumber={branding?.gstNumber}
                    logoUrl={branding?.logoUrl}
                    label="Print Bill"
                  />

                  <button
                    onClick={() => setSelected(table)}
                    className="btn btn-sm gap-1.5 rounded-xl font-extrabold shadow transition-all text-xs bg-amber-400 hover:bg-amber-300 text-black border-none cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Collect {formatPrice(table.total)}
                    </span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {selected && (
        <PaymentModal
          table={selected}
          branding={branding}
          onClose={() => setSelected(null)}
          onPaid={() => {
            setSelected(null);
            refetch();
          }}
        />
      )}
      {transferTable && (
        <TransferModal
          table={transferTable}
          onClose={() => setTransferTable(null)}
          onTransferred={() => {
            setTransferTable(null);
            refetch();
          }}
        />
      )}
      {voidTable && (
        <VoidModal
          table={voidTable}
          onClose={() => setVoidTable(null)}
          onVoided={() => {
            setVoidTable(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
