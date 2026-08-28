"use client";

import { useState } from "react";
import { Tag, ShieldCheck, X } from "lucide-react";
import { computeDiscount, type DiscountConfig } from "@/lib/discount";

const QUICK_REASONS = ["Loyalty", "Staff", "Manager Comp", "Complaint", "Festival Offer"];

/**
 * Discount state + live math for a bill. Parent supplies the config (net, gst
 * rate, limits). Returns everything needed to render the control + settle:
 *   disc.calc.payable  — amount due after discount
 *   disc.calc.error    — blocking validation error (disable Collect)
 *   disc.calc.payload  — { discountType, discountValue, discountReason, managerPin }
 */
export function useDiscount(cfg: DiscountConfig) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const calc = computeDiscount(
    { type, value: parseFloat(value) || 0, reason, pin },
    cfg,
  );
  const reset = () => {
    setOpen(false);
    setValue("");
    setReason("");
    setPin("");
  };
  return {
    open,
    setOpen,
    type,
    setType,
    value,
    setValue,
    reason,
    setReason,
    pin,
    setPin,
    calc,
    cfg,
    reset,
  };
}

export type DiscountState = ReturnType<typeof useDiscount>;

export default function DiscountControl({ d }: { d: DiscountState }) {
  const { cfg, calc } = d;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/4 p-3 space-y-2 text-white">
      {!d.open ? (
        <button
          type="button"
          onClick={() => d.setOpen(true)}
          className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer py-0.5"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>🏷️ Add Discount</span>
          {cfg.maxPercent > 0 && (
            <span className="text-[10px] text-white/40 font-normal">
              (max {cfg.maxPercent}%)
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
              <Tag className="w-3.5 h-3.5" />
              <span>Discount</span>
              <span className="text-[10px] font-normal text-white/50">
                (max {cfg.maxPercent}%)
              </span>
            </p>
            <button
              type="button"
              onClick={d.reset}
              className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          </div>

          {/* Type & Value Input */}
          <div className="flex gap-2">
            <div className="flex rounded-xl overflow-hidden border border-white/20 shrink-0">
              <button
                type="button"
                onClick={() => d.setType("percent")}
                className={`px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  d.type === "percent"
                    ? "bg-amber-400 text-black"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => d.setType("flat")}
                className={`px-3 py-1 text-xs font-bold transition-colors cursor-pointer border-l border-white/20 ${
                  d.type === "flat"
                    ? "bg-amber-400 text-black"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                ₹
              </button>
            </div>

            <input
              type="number"
              value={d.value}
              onChange={(e) => d.setValue(e.target.value)}
              className="input input-sm flex-1 bg-[#222222] border-white/20 text-white font-mono font-bold text-sm rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-white/30 h-8"
              placeholder={d.type === "percent" ? "e.g. 10" : "e.g. 100"}
              min={0}
              max={d.type === "percent" ? 100 : undefined}
              step="0.01"
            />
          </div>

          {/* Reason Input & Quick Pills */}
          {cfg.requiresReason && (
            <div className="space-y-1.5">
              <input
                type="text"
                value={d.reason}
                onChange={(e) => d.setReason(e.target.value)}
                className="input input-sm w-full bg-[#222222] border-white/20 text-white font-medium text-xs rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-white/40 h-8"
                placeholder="Type reason (e.g. Loyalty, Staff, Comp)..."
              />

              {/* Quick Reason Pills */}
              <div className="flex flex-wrap gap-1">
                {QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => d.setReason(r)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                      d.reason === r
                        ? "bg-amber-400 text-black font-bold"
                        : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manager PIN */}
          {calc.needsPin && (
            <label className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="password"
                inputMode="numeric"
                value={d.pin}
                onChange={(e) => d.setPin(e.target.value)}
                className="input input-xs bg-[#222222] border-white/20 text-white font-mono font-bold flex-1 rounded-lg focus:border-amber-400 focus:outline-none"
                placeholder={`Manager PIN (needed over ${cfg.threshold}%)`}
                autoComplete="off"
              />
            </label>
          )}

          {/* Validation Error / Success Display */}
          {calc.error ? (
            <p className="text-[11px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
              ⚠️ {calc.error}
            </p>
          ) : (
            calc.amount > 0 && (
              <p className="text-[11px] text-amber-300 font-bold">
                ✓ Applied − ₹{calc.amount.toFixed(2)} off
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
