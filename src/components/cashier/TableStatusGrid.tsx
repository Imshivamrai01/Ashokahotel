"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Pill } from "@/components/ui/Pill";
import type { ILocation } from "@/types";
import type { TableBill } from "@/app/api/orders/cashier/route";

async function fetchLocations(): Promise<ILocation[]> {
  const res = await fetch("/api/locations", { cache: "no-store" });
  if (!res.ok) throw new Error();
  return res.json();
}

async function fetchCashierTables(): Promise<TableBill[]> {
  const res = await fetch("/api/orders/cashier", { cache: "no-store" });
  if (!res.ok) throw new Error();
  return res.json();
}

export default function TableStatusGrid() {
  const { data: locations = [], refetch } = useQuery<ILocation[]>({
    queryKey: ["cashier-locations"],
    queryFn: fetchLocations,
    refetchInterval: 5000,
  });

  // Shared cache with OrdersQueue (same key) — tells us which occupied
  // locations actually have a bill vs. which are stuck "busy" with nothing.
  const { data: bills = [] } = useQuery<TableBill[]>({
    queryKey: ["cashier-tables"],
    queryFn: fetchCashierTables,
    refetchInterval: 5000,
  });
  const billedIds = new Set(bills.map((b) => b.tableId));

  const [freeing, setFreeing] = useState<string | null>(null);

  const tables = locations.filter((l) => l.type === "table");
  const rooms = locations.filter((l) => l.type === "room");

  // Manually free an orphan location (occupied but no active orders).
  async function freeLocation(loc: ILocation) {
    setFreeing(loc._id);
    try {
      // No bill to void — flip the flag directly via void_table (0 orders, just
      // frees the table). Reason recorded for the audit trail.
      const res = await fetch(`/api/orders/${loc._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "void_table",
          tableId: loc._id,
          reason: "Manual free (stuck/orphan)",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${loc.label} freed`);
      await refetch();
    } catch {
      toast.error("Could not free");
    } finally {
      setFreeing(null);
    }
  }

  function renderTile(t: ILocation) {
    const orphan = t.isOccupied && !billedIds.has(t._id);
    return (
      <motion.div
        key={t._id}
        layout
        className={`rounded-xl border p-2 text-center transition-colors ${
          t.isOccupied
            ? orphan
              ? "border-warning/50 bg-warning/10 text-warning"
              : "border-error/40 bg-error/10 text-error"
            : "border-success/40 bg-success/10 text-success"
        }`}
        aria-label={`${t.label} – ${t.isOccupied ? "Occupied" : "Free"}`}
      >
        <div className="text-xs font-bold leading-tight wrap-break-word">
          {t.label}
        </div>
        <div className="flex items-center justify-center gap-1 mt-1 opacity-70">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${t.isOccupied ? (orphan ? "bg-warning" : "bg-error") : "bg-success"}`}
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium">
            {t.isOccupied ? (orphan ? "Stuck" : "Busy") : "Free"}
          </span>
        </div>
        {orphan && (
          <button
            onClick={() => freeLocation(t)}
            disabled={freeing === t._id}
            className="btn btn-warning btn-xs w-full mt-1.5"
            title="Occupied but no active order — free it"
          >
            {freeing === t._id ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Free"
            )}
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-base-300 bg-base-200/50 flex items-center justify-between shrink-0">
        <span className="font-bold text-sm">Table Status</span>
        <Pill variant="outline">{tables.length + rooms.length}</Pill>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <div>
          <p className="text-[10px] uppercase font-bold text-base-content/40 px-1 mb-1">
            Tables
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {tables.map(renderTile)}
          </div>
        </div>
        {rooms.length > 0 && (
          <div>
            <p className="text-[10px] uppercase font-bold text-base-content/40 px-1 mb-1">
              Rooms
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {rooms.map(renderTile)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
