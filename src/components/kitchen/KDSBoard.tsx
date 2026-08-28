"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { LayoutGrid, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useKDSPolling } from "@/hooks/useKDSPolling";
import KOTCard from "./KOTCard";
import KDSFilters from "./KDSFilters";
import BuzzerHandler from "./BuzzerHandler";
import type { IOrder, ItemStatus, OrderStatus } from "@/types";

async function patchItemStatus(
  orderId: string,
  itemId: string,
  status: ItemStatus,
) {
  const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemStatus: status }),
  });
  if (!res.ok) throw new Error("Failed to update item");
}

export default function KDSBoard() {
  const { orders, isLoading, isError, newKotIds, clearNewKot, refetch } =
    useKDSPolling();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [focusedIdx, setFocusedIdx] = useState(0);

  // ── New-KOT ticker ──────────────────────────────────────────────────────
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  // Build ticker from orders that are new AND still active (not delivered/cancelled)
  useEffect(() => {
    const activeNew = orders.filter(
      (o) =>
        newKotIds.has(o._id) &&
        !["delivered", "cancelled", "paid", "cleared"].includes(o.status),
    );
    const msgs = activeNew.map((o) => {
      const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
      return `🆕 ${o.kotNumber} · ${o.tableLabel} · ${itemCount} item${itemCount !== 1 ? "s" : ""}`;
    });
    // defer to avoid synchronous setState-in-effect warning
    const t1 = setTimeout(() => setTickerItems(msgs), 0);
    return () => clearTimeout(t1);
  }, [orders, newKotIds]); // re-run on every poll so delivered KOTs drop off immediately

  const handleItemStatus = useCallback(
    async (orderId: string, itemId: string, status: ItemStatus) => {
      try {
        await patchItemStatus(orderId, itemId, status);
        refetch();
      } catch {
        toast.error("Could not update item status");
      }
    },
    [refetch],
  );

  // One atomic order-level PATCH instead of N parallel item PATCHes — the
  // server updates every item + recomputes status in a single transaction, so
  // concurrent saves can't drop changes or miscompute the total.
  const patchOrderStatus = useCallback(
    async (orderId: string, status: "ready" | "delivered") => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    },
    [],
  );

  const handleMarkAllReady = useCallback(
    async (orderId: string) => {
      try {
        await patchOrderStatus(orderId, "ready");
        refetch();
        toast.success("All items marked ready");
      } catch {
        toast.error("Could not mark all ready");
      }
    },
    [patchOrderStatus, refetch],
  );

  const handleMarkAllDelivered = useCallback(
    async (orderId: string) => {
      try {
        await patchOrderStatus(orderId, "delivered");
        refetch();
        toast.success("Order marked delivered");
      } catch {
        toast.error("Could not mark delivered");
      }
    },
    [patchOrderStatus, refetch],
  );

  // Count for filter badges
  const counts: Partial<Record<OrderStatus | "all", number>> = {
    all: orders.length,
  };
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }

  const displayed: IOrder[] =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  // Active KOTs: oldest first so newest lands at the bottom (like a chat/feed).
  // Delivered/cancelled KOTs: pushed to the very bottom, oldest first.
  const DELIVERED_STATUSES = ["delivered", "cancelled"];
  const sorted = useMemo(() => {
    const activeKots = displayed
      .filter((o) => !DELIVERED_STATUSES.includes(o.status))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    const deliveredKots = displayed
      .filter((o) => DELIVERED_STATUSES.includes(o.status))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    return [...activeKots, ...deliveredKots];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  // ArrowLeft / ArrowRight  → navigate cards (highlights focused card)
  // R                       → mark focused card "all ready"
  // D                       → mark focused card "delivered"
  // Escape / F5             → manual refetch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const len = sorted.length;
      if (len === 0) return;

      if (e.key === "ArrowRight") {
        setFocusedIdx((i) => Math.min(i + 1, len - 1));
      } else if (e.key === "ArrowLeft") {
        setFocusedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "r" || e.key === "R") {
        const order = sorted[focusedIdx];
        if (order) {
          if (newKotIds.has(order._id)) clearNewKot(order._id);
          handleMarkAllReady(order._id);
        }
      } else if (e.key === "d" || e.key === "D") {
        const order = sorted[focusedIdx];
        if (order) {
          if (newKotIds.has(order._id)) clearNewKot(order._id);
          handleMarkAllDelivered(order._id);
        }
      } else if (e.key === "Escape" || e.key === "F5") {
        e.preventDefault();
        refetch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    focusedIdx,
    sorted,
    newKotIds,
    clearNewKot,
    handleMarkAllReady,
    handleMarkAllDelivered,
    refetch,
  ]);

  return (
    <div className="flex flex-col h-full">
      <BuzzerHandler newKotCount={newKotIds.size} />

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-base-300 bg-base-200/50 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <LayoutGrid className="w-5 h-5 text-error" />
            <h1 className="font-bold text-lg leading-none">Kitchen Display</h1>
            {isLoading && (
              <span className="loading loading-spinner loading-xs text-base-content/40" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden lg:flex items-center gap-2 text-[11px] text-base-content/30 font-mono select-none">
              <kbd className="kbd kbd-xs">←</kbd>
              <kbd className="kbd kbd-xs">→</kbd> nav &nbsp;·&nbsp;
              <kbd className="kbd kbd-xs">R</kbd> ready &nbsp;·&nbsp;
              <kbd className="kbd kbd-xs">D</kbd> done
            </span>
            <button
              onClick={() => refetch()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Refresh orders"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-2">
          <KDSFilters active={filter} onChange={setFilter} counts={counts} />
        </div>
      </div>

      {/* New-KOT ticker strip */}
      <AnimatePresence>
        {tickerItems.length > 0 && (
          <motion.div
            key="kds-ticker"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-error/10 border-b border-error/30 shrink-0"
          >
            <div className="flex items-center gap-3 px-4 py-1.5 overflow-hidden">
              <span className="shrink-0 text-error text-[10px] font-bold uppercase tracking-widest">
                NEW KOT
              </span>
              <div className="flex-1 overflow-hidden">
                <motion.p
                  key={tickerItems.join(",")}
                  initial={{ x: "100%" }}
                  animate={{ x: "-100%" }}
                  transition={{ duration: 14, ease: "linear" }}
                  className="whitespace-nowrap text-xs font-medium text-error"
                >
                  {tickerItems.join("   ·   ")}&nbsp;&nbsp;&nbsp;&nbsp;
                  {tickerItems.join("   ·   ")}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isError && (
          <div className="alert alert-error mb-4">
            <span>Failed to load orders. Retrying…</span>
          </div>
        )}
        {!isLoading && sorted.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64 gap-3 text-base-content/40"
          >
            <span className="text-5xl">🍽️</span>
            <p className="text-lg font-semibold">
              All clear — no active orders
            </p>
          </motion.div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
          <AnimatePresence>
            {sorted.map((order, idx) => {
              const isNew = newKotIds.has(order._id);
              const isFocused = idx === focusedIdx;
              return (
                <div
                  key={order._id}
                  className={
                    isFocused
                      ? "ring-2 ring-error ring-offset-2 ring-offset-base-100 rounded-xl"
                      : undefined
                  }
                  onClick={() => setFocusedIdx(idx)}
                >
                  <KOTCard
                    order={order}
                    isNew={isNew}
                    onItemStatusChange={(oid, iid, st) => {
                      if (isNew) clearNewKot(oid);
                      return handleItemStatus(oid, iid, st);
                    }}
                    onMarkAllReady={(oid) => {
                      if (isNew) clearNewKot(oid);
                      return handleMarkAllReady(oid);
                    }}
                    onMarkAllDelivered={(oid) => {
                      if (isNew) clearNewKot(oid);
                      return handleMarkAllDelivered(oid);
                    }}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
