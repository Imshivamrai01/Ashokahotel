"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface CaptainCallAlert {
  _id: string;
  tableId: string;
  tableLabel: string;
  isGeneric?: boolean;
  callType?: "call" | "order_ready" | "self_order";
  message?: string;
  kotNumber?: string;
  createdAt: string;
}

export function useCaptainCallAlerts() {
  const [alerts, setAlerts] = useState<CaptainCallAlert[]>([]);
  const prevIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/staffcallbeep.mp3");
        audioRef.current.volume = 0.8;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Web Audio fallback
        try {
          const AudioCtx =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx: AudioContext = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(660, ctx.currentTime);
          gain.gain.setValueAtTime(0.6, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.8);
        } catch {}
      });
    } catch {}
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a._id !== id));
    prevIds.current.delete(id);
    try {
      await fetch(`/api/captain-call/${id}`, { method: "PATCH" });
    } catch {}
  }, []);

  const dismissAll = useCallback(async () => {
    const ids = alerts.map((a) => a._id);
    setAlerts([]);
    ids.forEach((id) => prevIds.current.delete(id));
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/captain-call/${id}`, { method: "PATCH" }).catch(() => {}),
      ),
    );
  }, [alerts]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/captain-call");
        if (!res.ok) return;
        const data: CaptainCallAlert[] = await res.json();
        const newAlerts = data.filter((a) => !prevIds.current.has(a._id));
        if (newAlerts.length > 0) {
          playBeep();
          setAlerts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            return [
              ...prev,
              ...newAlerts.filter((a) => !existingIds.has(a._id)),
            ];
          });
          newAlerts.forEach((a) => prevIds.current.add(a._id));
        }
        // Remove alerts that were acknowledged elsewhere
        const serverIds = new Set(data.map((a) => a._id));
        setAlerts((prev) => prev.filter((a) => serverIds.has(a._id)));
      } catch {}
    };

    poll(); // immediate first poll
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [playBeep]);

  return { alerts, dismiss, dismissAll };
}
