"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { ILocation } from "@/types";
import type { TableBill } from "@/app/api/orders/cashier/route";

interface TransferModalProps {
  table: TableBill;
  onClose: () => void;
  onTransferred: () => void;
}

async function fetchTables(): Promise<ILocation[]> {
  const res = await fetch("/api/locations", { cache: "no-store" });
  if (!res.ok) throw new Error();
  return res.json();
}

export default function TransferModal({
  table,
  onClose,
  onTransferred,
}: TransferModalProps) {
  const { data: locations = [] } = useQuery<ILocation[]>({
    queryKey: ["transfer-tables"],
    queryFn: fetchTables,
  });

  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Any table except the source. Occupied targets merge the two bills.
  const targets = locations.filter((l) => l._id !== table.tableId);

  const handleTransfer = async () => {
    if (!target) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTableId: table.tableId, toTableId: target }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error);
      }
      toast.success("Table transferred");
      onTransferred();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
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
        className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-info/5">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-info" />
                Transfer Table
              </h2>
              <p className="text-sm text-base-content/60">
                Move {table.tableLabel} ({table.kots.length} KOT
                {table.kots.length !== 1 ? "s" : ""}) to…
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm"
              aria-label="Close transfer modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {targets.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setTarget(t._id)}
                  className={`rounded-xl border p-2 text-center transition-colors ${
                    target === t._id
                      ? "border-info bg-info/15 ring-2 ring-info"
                      : t.isOccupied
                        ? "border-error/40 bg-error/5"
                        : "border-success/40 bg-success/5"
                  }`}
                >
                  <div className="text-xs font-bold leading-tight wrap-break-word">
                    {t.type === "room" ? "🛏️" : "🍽️"} {t.label}
                  </div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {t.isOccupied ? "Busy · merge" : "Free"}
                  </div>
                </button>
              ))}
            </div>

            {target &&
              targets.find((t) => t._id === target)?.isOccupied && (
                <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                  Target is occupied — bills will be merged onto one table.
                </p>
              )}

            <button
              onClick={handleTransfer}
              disabled={!target || loading}
              className="btn btn-info btn-lg w-full"
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                "Transfer"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
