"use client";

import { useState } from "react";
import { getTtlStatus } from "@/lib/utils";
import type { IOrderItem, ItemStatus } from "@/types";
import { FssaiDot } from "@/components/ui/FssaiDot";
import { pillCls } from "@/components/ui/Pill";
import type { PillVariant } from "@/components/ui/Pill";

interface KOTItemProps {
  item: IOrderItem;
  orderId: string;
  orderCreatedAt: Date | string;
  onStatusChange: (
    orderId: string,
    itemId: string,
    status: ItemStatus,
  ) => Promise<void>;
}

const VEG_DOT = <FssaiDot isVeg={true} size="sm" />;
const NON_VEG_DOT = <FssaiDot isVeg={false} size="sm" />;

const STATUS_PILL: Record<ItemStatus, PillVariant> = {
  pending: "error",
  preparing: "warning",
  ready: "success",
  delivered: "ghost",
  cancelled: "outline",
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function KOTItem({
  item,
  orderId,
  orderCreatedAt,
  onStatusChange,
}: KOTItemProps) {
  const [loading, setLoading] = useState(false);
  const ttl = getTtlStatus(orderCreatedAt, item.preparationTtlMinutes ?? 15);
  const isDelivered = item.itemStatus === "delivered";

  const handleClick = async (next: ItemStatus) => {
    setLoading(true);
    try {
      await onStatusChange(orderId, item._id, next);
    } finally {
      setLoading(false);
    }
  };

  const timerBg =
    ttl === "overdue"
      ? "bg-error/10 border-l-4 border-error"
      : ttl === "warning"
        ? "bg-amber-500/10 border-l-4 border-amber-400"
        : "";

  const isCancelled = item.itemStatus === "cancelled";

  return (
    <div
      className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 border-b border-white/5 last:border-0 ${timerBg} ${
        isDelivered || isCancelled ? "opacity-40" : ""
      }`}
    >
      {/* Left: Info */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="pt-0.5 shrink-0">
          {item.isVegetarian ? VEG_DOT : NON_VEG_DOT}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-bold text-sm text-slate-900 ${
                isCancelled ? "line-through text-slate-400" : ""
              }`}
            >
              {item.name}
            </span>
            <span className="bg-amber-500 text-white font-extrabold text-xs px-1.5 py-0.2 rounded-md tabular-nums shrink-0 shadow-sm">
              ×{item.quantity}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={pillCls(STATUS_PILL[item.itemStatus], "text-[10px] px-1.5 py-0.2 font-bold uppercase tracking-wider")}>
              {STATUS_LABEL[item.itemStatus]}
            </span>

            {item.notes && (
              <span className="text-xs text-amber-800 font-semibold italic shrink-0">
                📝 {item.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action buttons */}
      {!isDelivered && !isCancelled && (
        <div className="flex items-center gap-1.5 shrink-0">
          {item.itemStatus === "pending" && (
            <button
              disabled={loading}
              onClick={() => handleClick("preparing")}
              className="btn btn-xs bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 border-none shadow-sm rounded-lg px-2"
              title="Start preparing"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "🔥 Prep"
              )}
            </button>
          )}

          {(item.itemStatus === "pending" || item.itemStatus === "preparing") && (
            <button
              disabled={loading}
              onClick={() => handleClick("ready")}
              className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 border-none shadow-sm rounded-lg px-2"
              title="Mark item ready"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "✓ Ready"
              )}
            </button>
          )}

          {item.itemStatus === "ready" && (
            <button
              disabled={loading}
              onClick={() => handleClick("delivered")}
              className="btn btn-xs btn-ghost text-slate-700 hover:bg-slate-200 gap-1 rounded-lg px-2 font-bold"
              title="Mark served"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "✈ Delivered"
              )}
            </button>
          )}

          {/* Kitchen can cancel any non-delivered item */}
          {(item.itemStatus === "pending" || item.itemStatus === "preparing") && (
            <button
              disabled={loading}
              onClick={() => handleClick("cancelled")}
              className="btn btn-xs btn-ghost text-error hover:bg-error/20 border border-error/30 rounded-lg px-1.5 font-bold"
              title="Void item"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "✕"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
