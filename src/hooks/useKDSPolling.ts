"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IOrder } from "@/types";

const ACTIVE_STATUSES = [
  "pending",
  "preparing",
  "partially_ready",
  "ready",
  "partially_delivered",
  "delivered",
];

async function fetchActiveOrders(): Promise<IOrder[]> {
  const res = await fetch("/api/orders/active", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

function persistKnown(ids: Set<string>) {
  try {
    sessionStorage.setItem("kds-known-ids", JSON.stringify([...ids]));
  } catch {
    // ignore — non-persistent fallback is acceptable
  }
}

interface UseKDSPollingResult {
  orders: IOrder[];
  isLoading: boolean;
  isError: boolean;
  newKotIds: Set<string>;
  clearNewKot: (id: string) => void;
  refetch: () => void;
}

const KNOWN_KEY = "kds-known-ids";

export function useKDSPolling(): UseKDSPollingResult {
  const [hasActiveOrders, setHasActiveOrders] = useState(true);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const [newKotIds, setNewKotIds] = useState<Set<string>>(new Set());

  // Hydrate previously-seen KOT ids from this browser session so a reload
  // (PWA update, ChunkErrorReload) doesn't re-buzz the entire active board.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KNOWN_KEY);
      if (saved) {
        knownIdsRef.current = new Set(JSON.parse(saved) as string[]);
        seededRef.current = true;
      }
    } catch {
      // sessionStorage unavailable — fall back to first-load seeding below
    }
  }, []);

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<IOrder[]>({
    queryKey: ["kds-orders"],
    queryFn: fetchActiveOrders,
    // Adaptive: 3s when active orders exist, 15s when quiet
    refetchInterval: hasActiveOrders ? 3000 : 15000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const active = orders.some((o) => ACTIVE_STATUSES.includes(o.status));
    // Use setTimeout to avoid synchronous setState-in-effect warning
    const t = setTimeout(() => setHasActiveOrders(active), 0);

    // First resolved fetch: treat everything already on the board as KNOWN
    // (no buzzer). Only genuinely new KOTs after this point should alert.
    if (!seededRef.current) {
      if (!isLoading) {
        knownIdsRef.current = new Set(orders.map((o) => o._id));
        seededRef.current = true;
        persistKnown(knownIdsRef.current);
      }
      return () => clearTimeout(t);
    }

    // Detect new KOTs
    const incoming = new Set<string>();
    orders.forEach((o) => {
      if (!knownIdsRef.current.has(o._id)) {
        incoming.add(o._id);
      }
    });

    if (incoming.size > 0) {
      setNewKotIds((prev) => new Set([...prev, ...incoming]));
    }

    // Update + persist known IDs
    knownIdsRef.current = new Set(orders.map((o) => o._id));
    persistKnown(knownIdsRef.current);

    return () => clearTimeout(t);
  }, [orders, isLoading]);

  const clearNewKot = (id: string) => {
    setNewKotIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return { orders, isLoading, isError, newKotIds, clearNewKot, refetch };
}
