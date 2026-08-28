"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { elapsedMinutes, formatElapsed } from "@/lib/utils";
import KOTItem from "./KOTItem";
import type { IOrder, IOrderItem, ItemStatus } from "@/types";
import { pillCls } from "@/components/ui/Pill";

interface KOTCardProps {
  order: IOrder;
  isNew: boolean;
  onItemStatusChange: (
    orderId: string,
    itemId: string,
    status: ItemStatus,
  ) => Promise<void>;
  onMarkAllReady: (orderId: string) => Promise<void>;
  onMarkAllDelivered: (orderId: string) => Promise<void>;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-error/60 bg-error/5",
  preparing: "border-amber-500/60 bg-amber-500/5",
  partially_ready: "border-teal-500/60 bg-teal-500/5",
  ready: "border-success/60 bg-success/5",
  partially_delivered: "border-success/40 bg-success/5",
  delivered: "border-base-300 bg-base-200/40 opacity-60",
  cancelled: "border-base-300 bg-base-200/40 opacity-50",
};

const HEADER_STYLES: Record<string, string> = {
  pending: "bg-error/20 border-b border-error/20",
  preparing: "bg-amber-500/20 border-b border-amber-500/20",
  partially_ready: "bg-teal-500/20 border-b border-teal-500/20",
  ready: "bg-success/20 border-b border-success/20",
  partially_delivered: "bg-success/10 border-b border-success/10",
  delivered: "bg-base-300/30 border-b border-base-300",
  cancelled: "bg-base-300/30 border-b border-base-300",
};

export default function KOTCard({
  order,
  isNew,
  onItemStatusChange,
  onMarkAllReady,
  onMarkAllDelivered,
}: KOTCardProps) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(order.createdAt));
  const [collapsed, setCollapsed] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);

  // Live elapsed counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(order.createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const elapsedMins = elapsedMinutes(order.createdAt);
  const timerColor =
    elapsedMins >= 20
      ? "text-error"
      : elapsedMins >= 10
        ? "text-amber-500"
        : "text-base-content/60";

  const borderStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
  const headerStyle = HEADER_STYLES[order.status] ?? HEADER_STYLES.pending;

  const pendingItems = order.items.filter(
    (i) => i.itemStatus === "pending" || i.itemStatus === "preparing",
  );
  const readyItems = order.items.filter((i) => i.itemStatus === "ready");
  const cancelledItems = order.items.filter(
    (i) => i.itemStatus === "cancelled",
  );
  const canMarkAllReady = pendingItems.length > 0;
  const canMarkAllDelivered = readyItems.length > 0 || pendingItems.length > 0;

  // Show news ticker for recently cancelled items (updated via elapsed ticker)
  const hasCancelledItems = cancelledItems.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.97 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: isNew
          ? ["0 0 0 3px #fbbf24", "0 0 0 0px transparent"]
          : "none",
      }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border-2 overflow-hidden ${borderStyle}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 ${headerStyle}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-mono-jetbrains font-bold text-lg shrink-0">
              {order.kotNumber}
            </span>
            {isNew && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={pillCls("warning", "font-bold shrink-0")}
              >
                NEW
              </motion.span>
            )}
            {hasCancelledItems && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className={pillCls("error", "font-bold gap-1 shrink-0")}
              >
                ✕ {cancelledItems.length} VOID
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1 text-sm font-mono-jetbrains ${timerColor}`}
            >
              <Clock className="w-3.5 h-3.5" />
              {elapsed}
            </span>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="btn btn-ghost btn-xs btn-circle"
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-base-content/10 border border-base-content/15 font-bold text-sm text-base-content">
            🪑 {order.tableLabel}
          </span>
          <span className="text-xs text-base-content/50">
            Captain: {order.captainName}
          </span>
        </div>
        {order.specialInstructions && (
          <div className="mt-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            ⚠️ {order.specialInstructions}
          </div>
        )}
      </div>

      {/* Cancelled items news ticker */}
      {hasCancelledItems && (
        <div className="overflow-hidden bg-error/10 border-b border-error/20 px-3 py-1">
          <div className="animate-marquee whitespace-nowrap text-xs font-bold text-error tracking-wider">
            {cancelledItems.map((i) => `✕ VOID: ${i.name}`).join("  ·  ")}
          </div>
        </div>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="divide-y divide-base-300/50">
          {order.items.map((item: IOrderItem) => (
            <KOTItem
              key={item._id}
              item={item}
              orderId={order._id}
              orderCreatedAt={order.createdAt}
              onStatusChange={onItemStatusChange}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {!collapsed && (canMarkAllReady || canMarkAllDelivered) && (
        <div className="px-4 py-3 flex gap-2 border-t border-base-300/50 bg-base-200/30">
          {canMarkAllReady &&
            (confirmReady ? (
              <div className="flex gap-2 flex-1">
                <button
                  onClick={() => {
                    onMarkAllReady(order._id);
                    setConfirmReady(false);
                  }}
                  className="btn btn-sm btn-success flex-1 gap-1"
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={() => setConfirmReady(false)}
                  className="btn btn-sm btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReady(true)}
                className="btn btn-sm btn-success flex-1 gap-1.5"
              >
                ✓ Mark All Ready
              </button>
            ))}
          {canMarkAllDelivered && (
            <button
              onClick={() => onMarkAllDelivered(order._id)}
              className="btn btn-sm btn-outline btn-success flex-1 gap-1.5"
            >
              ✈ Mark All Delivered
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
