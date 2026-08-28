"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Clock, BellRing, Utensils, ChefHat, Sparkles } from "lucide-react";
import { useCaptainStore } from "@/store/captain";
import type { ILocation, IOrder } from "@/types";
import { naturalSortLocations } from "@/lib/location-utils";

interface TableSelectorProps {
  onSelectTable: (table: ILocation) => void;
}

async function fetchLocations(): Promise<ILocation[]> {
  const res = await fetch("/api/locations", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch locations");
  return res.json();
}

async function fetchActiveOrders(): Promise<IOrder[]> {
  const res = await fetch("/api/orders/captain", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

import { playLoudOrderChime } from "@/hooks/useCaptainOrderAudioAlert";

export default function TableSelector({ onSelectTable }: TableSelectorProps) {
  const setStep = useCaptainStore((s) => s.setStep);
  const prevPendingCount = useRef(0);

  const { data: locations = [], isLoading } = useQuery<ILocation[]>({
    queryKey: ["captain-locations"],
    queryFn: fetchLocations,
    refetchInterval: 3000,
  });

  const { data: allOrders = [] } = useQuery<IOrder[]>({
    queryKey: ["captain-all-active-orders"],
    queryFn: fetchActiveOrders,
    refetchInterval: 3000,
  });

  // Index orders by tableId
  const pendingSelfOrdersByTable = new Map<string, IOrder[]>();
  const runningOrdersByTable = new Map<string, IOrder[]>();
  const preparedOrdersByTable = new Map<string, IOrder[]>();

  allOrders.forEach((o) => {
    const tId = String(o.tableId);
    const isPrepared =
      o.status === "ready" ||
      o.status === "partially_ready" ||
      (Array.isArray(o.items) && o.items.some((it) => it.itemStatus === "ready"));

    if (isPrepared) {
      const cur = preparedOrdersByTable.get(tId) || [];
      cur.push(o);
      preparedOrdersByTable.set(tId, cur);
    }

    if (o.status === "pending_captain" || o.isCaptainConfirmed === false) {
      const cur = pendingSelfOrdersByTable.get(tId) || [];
      cur.push(o);
      pendingSelfOrdersByTable.set(tId, cur);
    } else if (
      [
        "pending",
        "preparing",
        "partially_ready",
        "ready",
        "partially_delivered",
        "delivered",
      ].includes(o.status)
    ) {
      const cur = runningOrdersByTable.get(tId) || [];
      cur.push(o);
      runningOrdersByTable.set(tId, cur);
    }
  });

  // Calculate total pending self-orders for loud audio buzzer
  const totalPendingSelfOrders = Array.from(pendingSelfOrdersByTable.values()).reduce(
    (s, arr) => s + arr.length,
    0,
  );

  useEffect(() => {
    if (totalPendingSelfOrders > prevPendingCount.current) {
      playLoudOrderChime();
    }
    prevPendingCount.current = totalPendingSelfOrders;
  }, [totalPendingSelfOrders]);

  const list = naturalSortLocations(locations.filter((l) => l.type === "table"));
  const free = list.filter(
    (t) =>
      !t.isOccupied &&
      !pendingSelfOrdersByTable.has(String(t._id)) &&
      !runningOrdersByTable.has(String(t._id)),
  );
  const orderedCount = Array.from(pendingSelfOrdersByTable.keys()).length;
  const preparedCount = Array.from(preparedOrdersByTable.keys()).length;
  const occupied = list.filter(
    (t) =>
      t.isOccupied ||
      runningOrdersByTable.has(String(t._id)) ||
      pendingSelfOrdersByTable.has(String(t._id)),
  );

  const handleTableClick = (table: ILocation) => {
    const hasPending = pendingSelfOrdersByTable.has(String(table._id));
    const hasRunning = runningOrdersByTable.has(String(table._id));
    const hasPrepared = preparedOrdersByTable.has(String(table._id));

    onSelectTable(table);

    // If table has orders, go directly to active_orders view
    if (hasPending || hasRunning || hasPrepared || table.isOccupied) {
      setStep("active_orders");
    } else {
      setStep("order_build");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm">
          <div className="stat-figure text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
          <div className="stat-title text-xs font-black uppercase tracking-wider text-slate-600">Free Tables</div>
          <div className="stat-value text-emerald-800 text-2xl font-mono font-black">{free.length}</div>
        </div>

        <div
          className={`stat rounded-2xl border p-3.5 transition-all shadow-md ${
            preparedCount > 0
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-500 animate-pulse text-emerald-950 ring-2 ring-emerald-400/40"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="stat-figure text-emerald-600">
            <ChefHat className={`w-5 h-5 ${preparedCount > 0 ? "animate-bounce" : ""}`} />
          </div>
          <div className="stat-title text-xs font-black uppercase tracking-wider text-emerald-950">Food Prepared</div>
          <div className="stat-value text-emerald-800 text-2xl font-mono font-black">{preparedCount}</div>
        </div>

        <div
          className={`stat rounded-2xl border p-3.5 transition-all shadow-md ${
            orderedCount > 0
              ? "bg-gradient-to-br from-amber-50 to-amber-100/90 border-2 border-amber-400 animate-pulse text-amber-950"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="stat-figure text-amber-600">
            <BellRing className={`w-5 h-5 ${orderedCount > 0 ? "animate-bounce" : ""}`} />
          </div>
          <div className="stat-title text-xs font-black uppercase tracking-wider text-amber-950">Ordered (Verify)</div>
          <div className="stat-value text-amber-800 text-2xl font-mono font-black">{orderedCount}</div>
        </div>

        <div className="stat bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm">
          <div className="stat-figure text-rose-700">
            <Clock className="w-5 h-5" />
          </div>
          <div className="stat-title text-xs font-black uppercase tracking-wider text-slate-600">Occupied</div>
          <div className="stat-value text-rose-800 text-2xl font-mono font-black">{occupied.length}</div>
        </div>
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-black text-slate-800">No active tables found.</p>
          <p className="text-sm mt-1 text-slate-600 font-medium">Ask admin to add table locations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {list.map((table, i) => {
            const hasPrepared = preparedOrdersByTable.has(String(table._id));
            const hasSelfOrder = pendingSelfOrdersByTable.has(String(table._id));
            const hasRunning = runningOrdersByTable.has(String(table._id));
            const isOcc = table.isOccupied || hasRunning || hasPrepared;

            let cardStyle = "bg-emerald-50/90 border-2 border-emerald-300 hover:bg-emerald-100/90 shadow-sm";
            let statusBadge = (
              <span className="text-xs font-black text-emerald-950 bg-emerald-200/80 border border-emerald-300/80 px-2.5 py-0.5 rounded-lg tracking-tight">
                Free
              </span>
            );
            let dotColor = "bg-emerald-600";

            if (hasPrepared) {
              cardStyle =
                "bg-gradient-to-br from-emerald-100 to-emerald-200 border-2 border-emerald-500 shadow-xl ring-4 ring-emerald-500/35 hover:bg-emerald-200";
              statusBadge = (
                <span className="text-xs font-black text-emerald-950 bg-emerald-300 border border-emerald-500 px-2.5 py-0.5 rounded-lg tracking-tight animate-bounce flex items-center gap-1">
                  🍲 Food Prepared!
                </span>
              );
              dotColor = "bg-emerald-600 animate-ping";
            } else if (hasSelfOrder) {
              cardStyle =
                "bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-400 shadow-md ring-4 ring-amber-400/25 hover:bg-amber-100";
              statusBadge = (
                <span className="text-xs font-black text-amber-950 bg-amber-300/90 border border-amber-400 px-2.5 py-0.5 rounded-lg tracking-tight animate-pulse">
                  Ordered (Verify)
                </span>
              );
              dotColor = "bg-amber-600 animate-ping";
            } else if (isOcc) {
              cardStyle = "bg-rose-50/90 border-2 border-rose-300 hover:bg-rose-100/90 shadow-sm";
              statusBadge = (
                <span className="text-xs font-black text-rose-950 bg-rose-200/80 border border-rose-300/80 px-2.5 py-0.5 rounded-lg tracking-tight">
                  Occupied
                </span>
              );
              dotColor = "bg-rose-600 animate-pulse";
            }

            return (
              <motion.button
                key={table._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleTableClick(table)}
                className={`
                  relative flex flex-col items-center justify-center gap-1.5
                  rounded-2xl p-4 transition-all text-center cursor-pointer
                  ${cardStyle}
                `}
              >
                {/* Status Dot / Indicator */}
                <span className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${dotColor}`} />

                {hasPrepared ? (
                  <span className="absolute top-2 left-2 text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md animate-pulse">
                    <ChefHat className="w-3 h-3" /> PREPARED
                  </span>
                ) : hasSelfOrder ? (
                  <span className="absolute top-2 left-2 text-[10px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                    <BellRing className="w-3 h-3" /> NEW
                  </span>
                ) : null}

                {/* Table Code in Deep High-Contrast Obsidian Black */}
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-950 mt-1 tracking-tight">
                  {table.code}
                </span>

                <div className="w-full flex justify-center mt-0.5">
                  {statusBadge}
                </div>

                {table.capacity && (
                  <span className="text-xs text-slate-700 font-extrabold flex items-center gap-1 mt-0.5">
                    <Utensils className="w-3.5 h-3.5 text-slate-600" /> {table.capacity} seats
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-600 text-center font-bold">
        Auto-refreshes every 3 seconds · {list.length} total tables
      </p>
    </div>
  );
}
