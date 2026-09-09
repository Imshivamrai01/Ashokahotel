"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuzzer } from "@/hooks/useBuzzer";

interface BuzzerHandlerProps {
  pendingKotCount: number;
  newKotCount?: number;
  enabled?: boolean;
}

export default function BuzzerHandler({
  pendingKotCount,
  newKotCount = 0,
  enabled = true,
}: BuzzerHandlerProps) {
  useBuzzer(pendingKotCount, enabled);
  const prevCount = useRef(newKotCount);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (newKotCount > prevCount.current) {
      setIsFlashing(true);
      const t = setTimeout(() => setIsFlashing(false), 800);
      prevCount.current = newKotCount;
      return () => clearTimeout(t);
    }
    prevCount.current = newKotCount;
  }, [newKotCount]);

  return (
    <AnimatePresence>
      {isFlashing && (
        <motion.div
          key="flash"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 pointer-events-none z-50 bg-amber-400"
        />
      )}
    </AnimatePresence>
  );
}

