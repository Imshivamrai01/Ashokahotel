"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { TableBill } from "@/app/api/orders/cashier/route";

interface VoidModalProps {
  table: TableBill;
  onClose: () => void;
  onVoided: () => void;
}

const PRESET_REASONS = [
  "No-show",
  "Walk-out",
  "Wrong table",
  "Duplicate KOT",
  "Customer cancelled",
  "Order mistake",
];

export default function VoidModal({
  table,
  onClose,
  onVoided,
}: VoidModalProps) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVoid = async () => {
    const finalReason = reason.trim();
    const finalPin = pin.trim();

    if (!finalPin) {
      setError("Security PIN is required to void table.");
      return;
    }
    if (!finalReason) {
      setError("A cancellation reason is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${table.anchorKotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "void_table",
          tableId: table.tableId,
          reason: finalReason,
          pin: finalPin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Void failed. Invalid PIN.");
      }

      toast.success(
        `Table freed — voided by ${data.cancelledByName || "Staff"}`
      );
      onVoided();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Void failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-base-100 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-base-content border border-base-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-error/10">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2 text-error">
                <Trash2 className="w-5 h-5" />
                Free Without Payment (Void)
              </h2>
              <p className="text-xs text-base-content/70 mt-0.5 font-medium">
                {table.tableLabel} · {table.kots.length} KOT
                {table.kots.length !== 1 ? "s" : ""} · Rs.
                {table.total.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm"
              aria-label="Close void modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start gap-2 bg-error/10 border border-error/20 rounded-2xl p-3 text-xs font-semibold text-error">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Orders will be marked cancelled and excluded from sales revenue. Your Staff PIN will be recorded in the audit log.
              </p>
            </div>

            {/* Preset reasons */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70">
                Cancellation Reason <span className="text-error">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`btn btn-xs rounded-xl font-bold ${
                      reason === r ? "btn-error text-white" : "btn-outline"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or type custom reason..."
              className="input input-bordered input-sm w-full rounded-xl text-xs font-medium"
            />

            {/* 4-digit Security PIN */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-warning" />
                  Your 4-Digit Staff PIN <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="input input-bordered input-md w-full text-center text-xl tracking-widest font-mono font-black rounded-xl border-warning/50 focus:border-warning"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2 text-center">
                ⚠️ {error}
              </p>
            )}

            <button
              onClick={handleVoid}
              disabled={loading}
              className="btn btn-error btn-md w-full font-black rounded-xl text-white shadow-md cursor-pointer"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Authorize & Free Table (No Charge)"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
