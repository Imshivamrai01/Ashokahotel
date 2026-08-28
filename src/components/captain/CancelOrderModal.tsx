"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import type { IOrder } from "@/types";

interface CancelOrderModalProps {
  order: IOrder;
  onClose: () => void;
  onCancelled: (data: { cancelledByName?: string; cancelledByRole?: string }) => void;
}

const PRESET_REASONS = [
  "Customer changed mind",
  "Duplicate self-order",
  "Wrong table selected",
  "Guest walked out",
  "Item unavailable / 86",
  "Test order",
];

export default function CancelOrderModal({
  order,
  onClose,
  onCancelled,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCancelOrder = async () => {
    const cleanReason = reason.trim();
    const cleanPin = pin.trim();

    if (!cleanPin) {
      setError("Please enter your 4-digit staff PIN.");
      return;
    }
    if (!cleanReason) {
      setError("Please select or enter a cancellation reason.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_order",
          reason: cleanReason,
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to cancel order. Invalid PIN.");
        setLoading(false);
        return;
      }

      toast.success(
        `Order ${order.kotNumber} cancelled by ${data.cancelledByName || "Staff"}`
      );
      onCancelled(data);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-rose-200 overflow-hidden text-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-50 to-rose-100/70 px-5 py-4 border-b border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-rose-950">
                  Cancel Order
                </h3>
                <p className="text-xs font-bold text-rose-800">
                  {order.tableLabel} · {order.kotNumber} · {formatPrice(order.total)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Warning Pill */}
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-xs font-bold text-rose-900">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p>
                This action requires your <strong>Staff Security PIN</strong>. The cancellation and reason will be permanently logged in audit reports.
              </p>
            </div>

            {/* Preset Reasons */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Select Reason <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((r) => {
                  const isSelected = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-500 text-white shadow-xs scale-102"
                          : "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800 border border-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div className="space-y-1">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Or type custom reason..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-medium text-slate-900"
              />
            </div>

            {/* 4-digit Security PIN Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Your 4-Digit Staff PIN <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  (Captain / Cashier / Admin PIN)
                </span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-xl tracking-widest font-mono font-black py-2 rounded-xl border-2 border-amber-400 bg-amber-50/40 text-slate-900 focus:border-amber-600 focus:ring-3 focus:ring-amber-400/20 outline-none transition-all"
                autoFocus
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
                ⚠️ {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Cancel
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
