"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  BellRing,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { IBranding, MenuMode } from "@/types";

interface Props {
  branding: IBranding | null;
  mode: MenuMode;
  locationCode?: string | null;
}

type CallState = "idle" | "calling" | "sent" | "error";

export default function TabletFloatingButtons({
  branding,
  mode,
  locationCode,
}: Props) {
  const isRoom = mode === "room";
  const showWhatsApp = isRoom && branding?.whatsappNumber;
  // Show captain call button in ALL modes — locationCode optional
  const showCaptainCall = true;

  const [callState, setCallState] = useState<CallState>("idle");

  const handleCallCaptain = async () => {
    if (callState !== "idle") return;
    setCallState("calling");
    try {
      const res = await fetch("/api/captain-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode }),
      });
      if (res.ok) {
        setCallState("sent");
        setTimeout(() => setCallState("idle"), 10000);
      } else {
        setCallState("error");
        setTimeout(() => setCallState("idle"), 4000);
      }
    } catch {
      setCallState("error");
      setTimeout(() => setCallState("idle"), 4000);
    }
  };

  if (!showWhatsApp && !showCaptainCall) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.0, type: "spring", stiffness: 200, damping: 20 }}
      className="fixed bottom-3 left-3 flex items-center gap-2"
      style={{ zIndex: 9999 }}
    >
      {showCaptainCall && (
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            onClick={handleCallCaptain}
            disabled={callState !== "idle"}
            className="w-11 h-11 rounded-full shadow-xl border-none flex items-center justify-center transition-all cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70"
            style={{
              background:
                callState === "sent"
                  ? "#16a34a"
                  : callState === "error"
                    ? "#dc2626"
                    : "#D97706",
              boxShadow:
                callState === "sent"
                  ? "0 0 15px rgba(22,163,74,0.6)"
                  : "0 4px 15px rgba(217,119,6,0.4)",
            }}
            title="Call Captain"
            aria-label="Call Captain"
          >
            {/* Pulse ring when calling */}
            {callState === "calling" && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid #D97706" }}
                animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                transition={{ repeat: Infinity, duration: 1, ease: "easeOut" }}
              />
            )}
            {callState === "sent" ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : callState === "error" ? (
              <AlertCircle className="w-5 h-5 text-white" />
            ) : (
              <BellRing
                className="w-5 h-5 text-white"
              />
            )}
          </motion.button>

          {/* Label */}
          <span
            className="px-3 py-1.5 rounded-full text-xs font-extrabold select-none hidden md:inline-block shadow-sm"
            style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(217, 119, 6, 0.4)",
              color: "#0F172A",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            {callState === "sent"
              ? "Captain on the way!"
              : callState === "calling"
                ? "Alerting…"
                : callState === "error"
                  ? "Try again"
                  : "Call Captain"}
          </span>

          {/* Toast */}
          {callState === "sent" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute left-0 bottom-14 text-xs font-medium px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap inline-flex items-center gap-1.5"
              style={{
                background: "rgba(22,163,74,0.95)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#ffffff",
              }}
            >
              <CheckCircle className="w-4 h-4" /> All captains alerted!
            </motion.div>
          )}
        </div>
      )}

      {showWhatsApp && (
        <motion.a
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.08 }}
          href={`https://wa.me/${branding?.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{ background: "#25D366" }}
          title="WhatsApp"
          aria-label="Order via WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </motion.a>
      )}
    </motion.div>
  );
}
