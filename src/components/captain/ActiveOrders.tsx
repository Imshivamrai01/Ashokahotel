"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, Ban, Timer, Gift, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { formatElapsed, formatPrice } from "@/lib/utils";
import { useCaptainStore } from "@/store/captain";
import type { IOrder } from "@/types";
import { FssaiDot } from "@/components/ui/FssaiDot";
import { Pill } from "@/components/ui/Pill";
import type { PillVariant } from "@/components/ui/Pill";
import LottiePlayer from "@/components/LottiePlayer";
import CancelOrderModal from "@/components/captain/CancelOrderModal";

interface Props {
  tableId: string;
  tableLabel: string;
}

const VOID_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

async function fetchTableOrders(tableId: string): Promise<IOrder[]> {
  const res = await fetch(`/api/orders/captain?tableId=${tableId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

async function cancelItem(orderId: string, itemId: string) {
  const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemStatus: "cancelled" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to cancel item");
}

async function setItemNC(
  orderId: string,
  itemId: string,
  isNC: boolean,
  ncReason?: string,
) {
  const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isNC, ncReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update item NC status");
}

const STATUS_CONFIG: Record<string, { label: string; pill: PillVariant }> = {
  pending_captain: { label: "Needs Confirmation", pill: "error" },
  pending: { label: "Pending", pill: "warning" },
  preparing: { label: "Preparing", pill: "info" },
  partially_ready: { label: "Partially Ready", pill: "info" },
  ready: { label: "Ready", pill: "success" },
  partially_delivered: { label: "Partially Delivered", pill: "success" },
  delivered: { label: "Delivered", pill: "ghost" },
  cancelled: { label: "Cancelled", pill: "error" },
};

// Per-item kitchen status shown to captain
const ITEM_STATUS_CONFIG: Record<
  string,
  { label: string; pill: PillVariant; icon: string }
> = {
  pending: { label: "Queued", pill: "neutral", icon: "⏳" },
  preparing: { label: "Preparing", pill: "info", icon: "🔥" },
  ready: { label: "Ready", pill: "success", icon: "✅" },
  delivered: { label: "Delivered", pill: "ghost", icon: "🍽️" },
  cancelled: { label: "Voided", pill: "error", icon: "✕" },
};

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function ActiveOrders({ tableId, tableLabel }: Props) {
  const queryClient = useQueryClient();
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [confirmedOrderInfo, setConfirmedOrderInfo] = useState<{
    kotNumber: string;
    tableLabel: string;
    captainName: string;
    total: number;
  } | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<IOrder | null>(null);
  const now = useNow();
  const prevOrderIds = useRef<string[]>([]);
  const [tickerMsg, setTickerMsg] = useState<string | null>(null);
  const tickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: orders = [], isLoading } = useQuery<IOrder[]>({
    queryKey: ["captain-active-orders", tableId],
    queryFn: () => fetchTableOrders(tableId),
    refetchInterval: 6000,
  });

  // Detect genuinely new KOTs and show a ticker announcement
  useEffect(() => {
    const currentIds = orders.map((o) => o._id);
    const newOrders = orders.filter(
      (o) => !prevOrderIds.current.includes(o._id),
    );
    if (prevOrderIds.current.length > 0 && newOrders.length > 0) {
      const latest = newOrders[newOrders.length - 1];
      const itemCount = latest.items.reduce((s, i) => s + i.quantity, 0);
      const msg = `🆕 ${latest.kotNumber} · ${latest.tableLabel} · ${itemCount} item${itemCount !== 1 ? "s" : ""} · ₹${latest.total}`;
      setTickerMsg(msg);
      if (tickerTimer.current) clearTimeout(tickerTimer.current);
      tickerTimer.current = setTimeout(() => setTickerMsg(null), 10_000);
    }
    prevOrderIds.current = currentIds;
  }, [orders]);

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      cancelItem(orderId, itemId),
    onSuccess: () => {
      toast.success("Item voided");
      setConfirmingItemId(null);
      queryClient.invalidateQueries({
        queryKey: ["captain-active-orders", tableId],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed");
      setConfirmingItemId(null);
    },
  });

  const ncMutation = useMutation({
    mutationFn: ({
      orderId,
      itemId,
      isNC,
      ncReason,
    }: {
      orderId: string;
      itemId: string;
      isNC: boolean;
      ncReason?: string;
    }) => setItemNC(orderId, itemId, isNC, ncReason),
    onSuccess: (_d, v) => {
      toast.success(v.isNC ? "Marked No Charge" : "No Charge removed");
      queryClient.invalidateQueries({
        queryKey: ["captain-active-orders", tableId],
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "captain_confirm" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm order");
      return data;
    },
    onSuccess: (data) => {
      const order = data.order || {};
      setConfirmedOrderInfo({
        kotNumber: order.kotNumber || "KOT",
        tableLabel: order.tableLabel || tableLabel,
        captainName: order.captainName || "Captain",
        total: order.total || 0,
      });
      toast.success(`Order Confirmed! ${order.kotNumber || "KOT"} sent to Kitchen & Print Queue.`);
      queryClient.invalidateQueries({
        queryKey: ["captain-active-orders", tableId],
      });
      queryClient.invalidateQueries({
        queryKey: ["captain-locations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["captain-all-active-orders"],
      });

      // Auto-dismiss floating call alert for this table
      try {
        fetch("/api/captain-call")
          .then((r) => r.json())
          .then((calls) => {
            if (Array.isArray(calls)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const match = calls.find((c: any) => String(c.tableId) === String(tableId));
              if (match?._id) {
                fetch(`/api/captain-call/${match._id}`, { method: "PATCH" });
              }
            }
          })
          .catch(() => {});
      } catch {}
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to confirm"),
  });

  const setStep = useCaptainStore((s) => s.setStep);
  const activeOrders = orders.filter(
    (o) => !["paid", "cleared", "cancelled"].includes(o.status),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="loading loading-spinner loading-md text-warning" />
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/40">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-base">No active orders for {tableLabel}</p>
          <p className="text-xs text-base-content/50">Table is currently free or cleared</p>
        </div>
        <button
          onClick={() => setStep("order_build")}
          className="btn btn-warning btn-sm font-extrabold text-black gap-2 rounded-xl mt-2 px-6"
        >
          <PlusCircle className="w-4 h-4" /> Take New Order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Table Summary & Add More Items Action */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-base-200 border border-base-300">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base tracking-tight">🪑 {tableLabel}</h3>
            <span className="badge badge-warning badge-sm font-extrabold text-black">
              {activeOrders.length} KOT{activeOrders.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-base-content/60 mt-0.5">
            Total Running:{" "}
            <span className="font-mono font-extrabold text-warning text-sm">
              ₹{activeOrders.reduce((s, o) => s + (o.total || 0), 0)}
            </span>
          </p>
        </div>

        <button
          onClick={() => setStep("order_build")}
          className="btn btn-warning btn-sm font-extrabold text-black gap-1.5 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Add More Items
        </button>
      </div>

      {/* News ticker — appears for 10 s when a new KOT arrives */}
      <AnimatePresence>
        {tickerMsg && (
          <motion.div
            key="ticker"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="overflow-hidden rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2 px-3 py-1.5"
          >
            <span className="shrink-0 text-warning text-xs font-bold uppercase tracking-widest">
              NEW
            </span>
            <div className="flex-1 overflow-hidden">
              <motion.p
                key={tickerMsg}
                initial={{ x: "100%" }}
                animate={{ x: "-100%" }}
                transition={{ duration: 12, ease: "linear" }}
                className="whitespace-nowrap text-xs font-medium text-warning"
              >
                {tickerMsg}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{tickerMsg}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeOrders.map((order) => {
          const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
          const isPendingCaptain =
            order.status === "pending_captain" ||
            order.isCaptainConfirmed === false;
          const orderAge = now - new Date(order.createdAt).getTime();
          const inVoidWindow = orderAge < VOID_WINDOW_MS;
          const remainingSec = inVoidWindow
            ? Math.ceil((VOID_WINDOW_MS - orderAge) / 1000)
            : 0;

          return (
            <motion.div
              key={order._id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-3xl border transition-all ${
                isPendingCaptain
                  ? "border-2 border-amber-400 bg-white shadow-xl ring-4 ring-amber-400/15"
                  : "border border-slate-200 bg-white shadow-md"
              } p-5 space-y-4 text-slate-900`}
            >
              {/* Customer Pending Confirmation Alert Banner */}
              {isPendingCaptain && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 flex items-center gap-2 text-base font-playfair">
                      🛎️ Customer Self-Order
                    </span>
                    <span className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-xs animate-pulse">
                      Pending Verification
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    Verify the ordered items with the guest at table before sending to kitchen.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      onClick={() => confirmMutation.mutate(order._id)}
                      disabled={confirmMutation.isPending}
                      className="btn bg-amber-500 hover:bg-amber-600 btn-md font-black text-white gap-2 shadow-md rounded-xl text-sm border-none cursor-pointer transition-all"
                    >
                      {confirmMutation.isPending ? (
                        <span className="loading loading-spinner loading-sm text-white" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Confirm & Send KOT
                    </button>
                    <button
                      onClick={() => setStep("order_build")}
                      className="btn bg-white hover:bg-amber-50 text-slate-800 border border-amber-300 btn-md font-bold gap-1.5 rounded-xl text-sm cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-600" />
                      Add More Items
                    </button>
                    <button
                      onClick={() => setCancellingOrder(order)}
                      className="btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 btn-sm font-bold gap-1.5 rounded-xl text-xs cursor-pointer shadow-xs col-span-1 sm:col-span-2"
                    >
                      <Ban className="w-4 h-4 text-rose-600" />
                      Reject / Cancel Self-Order (Requires PIN)
                    </button>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-amber-800 text-sm">
                    {order.kotNumber}
                  </span>
                  <Pill variant={cfg.pill}>{cfg.label}</Pill>
                  {(order.captainName || order.confirmedByCaptainName) && (
                    <span className="text-[11px] bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg font-bold text-slate-700">
                      👤 {order.captainName || order.confirmedByCaptainName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatElapsed(order.createdAt)}
                </span>
              </div>

              {/* Items */}
              <ul className="space-y-2 pt-1">
                {order.items.map((item) => {
                  const isCancelled = item.itemStatus === "cancelled";
                  const canVoid = inVoidWindow && !isCancelled;

                  return (
                    <li
                      key={item._id}
                      className={`text-sm rounded-2xl border transition-all p-3 space-y-1.5 ${
                        isCancelled
                          ? "bg-slate-100/70 border-slate-200 opacity-60 line-through"
                          : item.isNC
                            ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300/40"
                            : "bg-white border-slate-200/90 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="font-mono font-black text-amber-700 text-sm shrink-0 mt-0.5">
                            {item.quantity}×
                          </span>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-900 text-sm block truncate">
                              {item.name}
                            </span>
                            {item.notes && (
                              <p className="text-xs text-amber-800 font-medium italic mt-0.5">
                                📝 {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          {canVoid && (
                            <button
                              type="button"
                              onClick={() => cancelMutation.mutate({ orderId: order._id, itemId: item._id })}
                              className="text-rose-600 hover:text-rose-800 text-xs font-black p-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Cancel item"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Total & Action Footer */}
              <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-3 mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-slate-900 font-extrabold text-base">Order Total</span>
                  {!["paid", "cleared", "cancelled"].includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => setCancellingOrder(order)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                    >
                      <Ban className="w-3.5 h-3.5" /> Cancel Order (PIN)
                    </button>
                  )}
                </div>
                <span className="font-mono text-amber-700 text-xl font-black">
                  {formatPrice(order.total)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── Cancel Order Modal (PIN + Mandatory Reason) ──────────────── */}
      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onCancelled={() => {
            setCancellingOrder(null);
            queryClient.invalidateQueries({
              queryKey: ["captain-active-orders", tableId],
            });
            queryClient.invalidateQueries({
              queryKey: ["captain-locations"],
            });
            queryClient.invalidateQueries({
              queryKey: ["captain-all-active-orders"],
            });
          }}
        />
      )}

      {/* ── Order Confirmation Celebration Modal ────────────────────── */}
      <AnimatePresence>
        {confirmedOrderInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
              style={{ zIndex: 100000 }}
              onClick={() => setConfirmedOrderInfo(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4 text-slate-900"
              style={{ zIndex: 100001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center -mt-2">
                <LottiePlayer variant="success" size={110} loop={false} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-emerald-700 font-playfair">
                  Order Confirmed!
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Sent to Kitchen KDS & KOT Print Queue
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>KOT Number</span>
                  <span className="font-mono font-black text-amber-800 text-lg">
                    {confirmedOrderInfo.kotNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Table</span>
                  <span className="font-extrabold text-slate-900">
                    {confirmedOrderInfo.tableLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Confirmed By</span>
                  <span className="font-bold text-amber-800">
                    👤 {confirmedOrderInfo.captainName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setConfirmedOrderInfo(null)}
                className="btn bg-amber-500 hover:bg-amber-600 text-white font-black w-full rounded-xl shadow-md border-none cursor-pointer text-sm"
              >
                Continue / Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
