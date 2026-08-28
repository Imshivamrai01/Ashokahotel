"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useCaptainStore } from "@/store/captain";
import type { IOrder } from "@/types";

/**
 * Robust audio synthesizer that generates a loud, crisp dual-tone restaurant chime.
 * Guaranteed to produce sound across Chrome, Safari, Edge, Android Chrome, and iOS WebViews.
 */
export function playLoudOrderChime() {
  // 1. Try HTML5 Audio element
  try {
    const audio = new Audio("/buzzer.mp3");
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback
        playSynthesizedChime();
      });
    }
  } catch {
    playSynthesizedChime();
  }
}

/**
 * WebAudio dual-tone bell synthesizer (works even if MP3 file is blocked/cached)
 */
function playSynthesizedChime() {
  try {
    const AudioCtx =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      type: OscillatorType = "sine",
      vol: number = 0.8,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(vol, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    // Loud 3-tone attention chime (Ding-Dong-Ding)
    playTone(880, 0, 0.35, "sine", 0.9);
    playTone(1174, 0.2, 0.45, "triangle", 0.9);
    playTone(1760, 0.45, 0.6, "sine", 0.8);
  } catch (err) {
    console.warn("Synthesized chime error:", err);
  }
}

/**
 * Global audio and incoming order watcher for Captain App.
 * Runs continuously in background regardless of what step/screen the captain is viewing.
 */
export function useCaptainOrderAudioAlert() {
  const isFirstPoll = useRef(true);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const knownReadyOrderIds = useRef<Set<string>>(new Set());
  const setStep = useCaptainStore((s) => s.setStep);
  const selectTable = useCaptainStore((s) => s.selectTable);

  // 1. One-time user interaction listener to unlock WebAudio & Audio autoplay
  useEffect(() => {
    const unlock = () => {
      try {
        const AudioCtx =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx.resume().catch(() => {});
        }
        const audio = new Audio("/buzzer.mp3");
        audio.volume = 0.01;
        audio.play().then(() => audio.pause()).catch(() => {});
      } catch {}
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // 2. Poll active orders globally every 2.5 seconds
  const checkOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/captain", { cache: "no-store" });
      if (!res.ok) return;
      const orders: IOrder[] = await res.json();

      // On initial load, record current orders without beeping
      if (isFirstPoll.current) {
        orders.forEach((o) => {
          knownOrderIds.current.add(o._id);
          if (o.status === "ready" || o.status === "partially_ready") {
            knownReadyOrderIds.current.add(o._id);
          }
        });
        isFirstPoll.current = false;
        return;
      }

      // Check for freshly prepared / ready orders from kitchen
      const freshlyPreparedOrders = orders.filter(
        (o) =>
          (o.status === "ready" || o.status === "partially_ready") &&
          !knownReadyOrderIds.current.has(o._id),
      );

      if (freshlyPreparedOrders.length > 0) {
        playLoudOrderChime();
        freshlyPreparedOrders.forEach((order) => {
          knownReadyOrderIds.current.add(order._id);
          toast.success(`🍲 Food Prepared! Ready to Serve`, {
            description: `Table ${order.tableLabel} · KOT #${order.kotNumber} is freshly prepared & ready in kitchen!`,
            duration: 10000,
            action: {
              label: "Serve Table",
              onClick: () => {
                selectTable({
                  _id: String(order.tableId),
                  code: order.tableLabel,
                  label: order.tableLabel,
                  type: "table",
                  isActive: true,
                  isOccupied: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                setStep("active_orders");
              },
            },
          });
        });
      }

      // Check for genuinely new incoming orders
      const newOrders = orders.filter((o) => !knownOrderIds.current.has(o._id));

      if (newOrders.length > 0) {
        // Play loud buzzer / chime
        playLoudOrderChime();

        newOrders.forEach((order) => {
          knownOrderIds.current.add(order._id);
          if (order.status === "ready" || order.status === "partially_ready") {
            knownReadyOrderIds.current.add(order._id);
          }
          const isSelfOrder =
            order.status === "pending_captain" ||
            order.isCaptainConfirmed === false ||
            order.placedByRole === "customer";

          const title = isSelfOrder
            ? `🛎️ Customer Self-Order (${order.tableLabel})`
            : `🔔 New Order: ${order.tableLabel}`;

          toast(title, {
            description: `KOT: ${order.kotNumber} · ₹${order.total} · ${order.items?.length || 0} items`,
            duration: 8000,
            action: {
              label: "Open Table",
              onClick: () => {
                selectTable({
                  _id: String(order.tableId),
                  code: order.tableLabel,
                  label: order.tableLabel,
                  type: "table",
                  isActive: true,
                  isOccupied: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                setStep("active_orders");
              },
            },
          });
        });
      }

      // Sync known IDs with active set
      const activeIds = new Set(orders.map((o) => o._id));
      knownOrderIds.current = activeIds;
      const activeReadyIds = new Set(
        orders
          .filter((o) => o.status === "ready" || o.status === "partially_ready")
          .map((o) => o._id),
      );
      knownReadyOrderIds.current = activeReadyIds;
    } catch {}
  }, [selectTable, setStep]);

  useEffect(() => {
    checkOrders();
    const timer = setInterval(checkOrders, 2500);
    return () => clearInterval(timer);
  }, [checkOrders]);
}
