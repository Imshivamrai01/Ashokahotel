"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, BellRing, ChevronUp } from "lucide-react";
import type { IBranding, MenuMode } from "@/types";

interface Props {
  branding: IBranding | null;
  mode: MenuMode;
  locationCode?: string | null;
  showScrollTop?: boolean;
}

type CallState = "idle" | "calling" | "sent" | "error";

export default function FloatingButtons({
  branding,
  mode,
  locationCode,
  showScrollTop = false,
}: Props) {
  const isRoom = mode === "room";
  const isTable = mode === "table";
  const showWhatsApp = isRoom && branding?.whatsappNumber;
  const showCall = !isTable && branding?.callNumber; // hide phone call on table mode
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

  if (!showWhatsApp && !showCall && !showCaptainCall && !showScrollTop)
    return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      className="fixed bottom-4 right-4 z-20 flex flex-col gap-2"
    >
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="btn btn-circle shadow-lg border-none bg-base-content/20 hover:bg-base-content/30 text-base-content backdrop-blur-sm"
            aria-label="Back to top"
            title="Back to top"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      {showCaptainCall && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCallCaptain}
          disabled={callState !== "idle"}
          className={`btn btn-circle shadow-lg border-none transition-colors ${
            callState === "sent"
              ? "bg-success text-white"
              : callState === "error"
                ? "bg-error text-white"
                : callState === "calling"
                  ? "bg-warning text-black animate-pulse"
                  : "bg-warning text-black"
          }`}
          title={
            callState === "sent"
              ? "Captain is on the way!"
              : callState === "calling"
                ? "Calling…"
                : "Call Captain"
          }
          aria-label="Call Captain"
        >
          <BellRing className="w-5 h-5" />
        </motion.button>
      )}
      {showWhatsApp && (
        <motion.a
          whileTap={{ scale: 0.9 }}
          href={`https://wa.me/${branding?.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-circle bg-[#25D366] hover:bg-[#1da851] border-none text-white shadow-lg"
          title="WhatsApp Order"
          aria-label="WhatsApp Order"
        >
          <MessageCircle className="w-5 h-5" />
        </motion.a>
      )}
      {showCall && (
        <motion.a
          whileTap={{ scale: 0.9 }}
          href={`tel:${branding?.callNumber}`}
          className="btn btn-circle btn-info shadow-lg"
          title="Call Reception"
          aria-label="Call Reception"
        >
          <Phone className="w-5 h-5" />
        </motion.a>
      )}
      {/* Toast feedback above the button */}
      {callState === "sent" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-16 right-0 bg-success text-white text-xs font-medium px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap"
        >
          ✓ Captain is on the way!
        </motion.div>
      )}
    </motion.div>
  );
}
