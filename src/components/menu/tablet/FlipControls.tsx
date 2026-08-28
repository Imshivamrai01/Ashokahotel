"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function FlipControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-md rounded-full px-3 py-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.1 }}
        onClick={onPrev}
        disabled={currentPage === 0}
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-20 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>

      <span className="text-slate-800 text-xs font-mono font-bold tabular-nums px-1">
        {currentPage + 1} / {totalPages}
      </span>

      <motion.button
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.1 }}
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-20 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
