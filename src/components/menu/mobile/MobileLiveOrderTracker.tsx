"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  X,
  Clock,
  ChefHat,
  Sparkles,
  CheckCircle2,
  UtensilsCrossed,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface ActiveOrderItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  itemStatus: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  isVegetarian?: boolean;
  notes?: string;
}

export interface ActiveOrderData {
  _id: string;
  kotNumber: string;
  tableLabel: string;
  status:
    | "pending_captain"
    | "pending"
    | "preparing"
    | "partially_ready"
    | "ready"
    | "partially_delivered"
    | "delivered";
  isCaptainConfirmed: boolean;
  specialInstructions?: string;
  createdAt: string;
  total: number;
  items: ActiveOrderItem[];
}

interface Props {
  activeOrders: ActiveOrderData[];
  onAddMore: () => void;
}

export default function MobileLiveOrderTracker({
  activeOrders,
  onAddMore,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!activeOrders || activeOrders.length === 0) return null;

  // The latest order is the primary focus
  const primaryOrder = activeOrders[0];
  const totalItemCount = activeOrders.reduce(
    (acc, o) => acc + o.items.reduce((s, it) => s + it.quantity, 0),
    0,
  );

  // Status mapping
  // 1: Received / Pending -> 2: Preparing -> 3: Ready/Prepared -> 4: Delivered/Served
  const getStage = (status: ActiveOrderData["status"]) => {
    if (status === "pending_captain" || status === "pending") return 1;
    if (status === "preparing" || status === "partially_ready") return 2;
    if (status === "ready" || status === "partially_delivered") return 3;
    if (status === "delivered") return 4;
    return 1;
  };

  const currentStage = getStage(primaryOrder.status);

  const getStatusBadge = (status: ActiveOrderData["status"]) => {
    switch (status) {
      case "pending_captain":
        return {
          label: "Verifying with Captain",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: Clock,
          color: "#f59e0b",
        };
      case "pending":
        return {
          label: "Sent to Kitchen",
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: Clock,
          color: "#3b82f6",
        };
      case "preparing":
      case "partially_ready":
        return {
          label: "Cooking in Progress 🍳",
          bg: "bg-amber-500/15 text-amber-300 border-amber-500/40",
          icon: ChefHat,
          color: "#f59e0b",
        };
      case "ready":
      case "partially_delivered":
        return {
          label: "Food Prepared ✨ Ready!",
          bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
          icon: Sparkles,
          color: "#10b981",
        };
      case "delivered":
        return {
          label: "Served 🍽️ Enjoy!",
          bg: "bg-emerald-600/20 text-emerald-200 border-emerald-500/40",
          icon: CheckCircle2,
          color: "#10b981",
        };
      default:
        return {
          label: "Order Active",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: Clock,
          color: "#f59e0b",
        };
    }
  };

  const badge = getStatusBadge(primaryOrder.status);
  const BadgeIcon = badge.icon;

  return (
    <>
      {/* ── Collapsed Floating Status Bar (Docked at bottom above navigation) ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-3 left-3 right-3 z-40"
      >
        <div
          onClick={() => setSheetOpen(true)}
          role="button"
          tabIndex={0}
          className="w-full p-3 rounded-2xl cursor-pointer touch-manipulation shadow-2xl backdrop-blur-xl border border-amber-500/30 flex items-center justify-between gap-3 text-white transition-all active:scale-[0.99]"
          style={{
            background:
              currentStage === 3
                ? "linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)"
                : "linear-gradient(135deg, rgba(26,20,16,0.96) 0%, rgba(38,28,20,0.96) 100%)",
            boxShadow:
              currentStage === 3
                ? "0 8px 30px rgba(16,185,129,0.35)"
                : "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                currentStage === 3
                  ? "bg-white/20 border-white/40"
                  : "bg-amber-500/20 border-amber-500/30 text-amber-400"
              }`}
            >
              <BadgeIcon className="w-5 h-5 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10 text-amber-200">
                  {primaryOrder.tableLabel}
                </span>
                <span className="text-xs font-semibold text-white/70">
                  {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="text-sm font-black truncate mt-0.5 tracking-wide text-white">
                {badge.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white/15 text-white flex items-center gap-1">
              Track <ChevronUp className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Expandable Order Status Sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative w-full max-h-[85vh] bg-[#171412] text-white rounded-t-3xl border-t border-amber-500/30 shadow-2xl flex flex-col overflow-hidden"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-wide text-white">
                      Live Order Tracking
                    </h2>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {primaryOrder.tableLabel}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 font-mono mt-0.5">
                    KOT #{primaryOrder.kotNumber}
                  </p>
                </div>

                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* ── 4-Stage Animated Progress Stepper ── */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-white/60 mb-2">
                    <span>Order Progress</span>
                    <span className="text-amber-400">{badge.label}</span>
                  </div>

                  {/* Steps */}
                  <div className="relative flex items-center justify-between">
                    {/* Connecting line */}
                    <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full z-0">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width:
                            currentStage === 1
                              ? "20%"
                              : currentStage === 2
                                ? "55%"
                                : currentStage === 3
                                  ? "85%"
                                  : "100%",
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    {/* Step 1: Confirmed */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          currentStage >= 1
                            ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        ✓
                      </div>
                      <span className="text-[10px] font-bold text-white/70 mt-1.5">
                        Received
                      </span>
                    </div>

                    {/* Step 2: Preparing */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          currentStage >= 2
                            ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 animate-pulse"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        🍳
                      </div>
                      <span className="text-[10px] font-bold text-white/70 mt-1.5">
                        Preparing
                      </span>
                    </div>

                    {/* Step 3: Prepared */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          currentStage >= 3
                            ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 animate-bounce"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        ✨
                      </div>
                      <span className="text-[10px] font-bold text-white/70 mt-1.5">
                        Prepared
                      </span>
                    </div>

                    {/* Step 4: Served */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          currentStage === 4
                            ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        🍽️
                      </div>
                      <span className="text-[10px] font-bold text-white/70 mt-1.5">
                        Served
                      </span>
                    </div>
                  </div>

                  {/* Stage description text */}
                  <div className="pt-2 text-center">
                    {currentStage === 1 && (
                      <p className="text-xs text-amber-300 font-medium">
                        Your order is confirmed and sent to the kitchen.
                      </p>
                    )}
                    {currentStage === 2 && (
                      <p className="text-xs text-amber-300 font-medium">
                        Chef is actively preparing your hot & fresh dishes! 🍳
                      </p>
                    )}
                    {currentStage === 3 && (
                      <p className="text-xs text-emerald-300 font-bold">
                        Food is prepared! Ready to be served at your table ✨
                      </p>
                    )}
                    {currentStage === 4 && (
                      <p className="text-xs text-emerald-300 font-bold">
                        Dishes have been served. Enjoy your meal! 🍽️
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Ordered Items List ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-white/70">
                    <span>Ordered Dishes ({totalItemCount})</span>
                    <span>Total: {formatPrice(primaryOrder.total)}</span>
                  </div>

                  {activeOrders.map((order, orderIdx) => (
                    <div
                      key={order._id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2"
                    >
                      {activeOrders.length > 1 && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-amber-400/90 pb-1.5 border-b border-white/5">
                          <span>KOT #{order.kotNumber}</span>
                          <span className="capitalize">{order.status}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item._id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.isVegetarian
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                                }`}
                              />
                              <span className="font-bold text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-white/50 font-mono font-bold">
                                ×{item.quantity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                  item.itemStatus === "ready"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : item.itemStatus === "delivered"
                                      ? "bg-emerald-600/20 text-emerald-200"
                                      : item.itemStatus === "preparing"
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                        : "bg-white/10 text-white/60"
                                }`}
                              >
                                {item.itemStatus === "ready"
                                  ? "Prepared ✨"
                                  : item.itemStatus === "preparing"
                                    ? "Cooking 🍳"
                                    : item.itemStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Footer Actions (Add-on Order CTA) ── */}
              <div className="p-4 border-t border-white/10 bg-[#171412] shrink-0 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    onAddMore();
                  }}
                  className="w-full py-3 px-4 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer touch-manipulation"
                >
                  <PlusCircle className="w-4 h-4" />
                  Order More Dishes / Add-ons
                </button>
                <p className="text-[11px] text-center text-white/50 font-medium">
                  You can add any items from the menu to this table session
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
