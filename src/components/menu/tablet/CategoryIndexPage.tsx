"use client";

import { UtensilsCrossed } from "lucide-react";
import type { CategoryWithItems } from "@/types";

interface Props {
  categories: CategoryWithItems[];
  onCategoryClick: (catId: string) => void;
  width: number;
  height: number;
}

export default function CategoryIndexPage({
  categories,
  onCategoryClick,
  width,
  height,
}: Props) {
  return (
    <div
      className="w-full h-full flex flex-col px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-5 overflow-hidden select-none"
      style={{ width, height, background: "var(--menu-page-bg, #FAF9F6)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="mb-3 sm:mb-4 text-center shrink-0">
        <p className="text-amber-800 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">
          ✦ Contents ✦
        </p>
        <h2 className="font-playfair text-slate-900 text-xl sm:text-2xl font-black tracking-tight">
          Our Menu
        </h2>
        <div className="w-12 sm:w-14 h-0.5 bg-amber-400 mx-auto mt-1.5 rounded-full" />
      </div>

      {/* Categories Grid with smooth scrolling */}
      <div className="flex-1 overflow-y-auto pr-0.5 grid grid-cols-2 gap-2 sm:gap-2.5 content-start">
        {categories.map((cat, idx) => (
          <button
            key={cat._id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCategoryClick(cat._id);
            }}
            aria-label={`Jump to ${cat.name}, ${cat.items.length} items`}
            className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-sm transition-all text-left group cursor-pointer touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-base sm:text-lg shrink-0 group-hover:scale-105 transition-transform">
              {cat.iconEmoji ? (
                cat.iconEmoji
              ) : (
                <UtensilsCrossed className="w-4 h-4 text-amber-700" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-900 text-xs sm:text-sm font-extrabold leading-tight line-clamp-2 group-hover:text-amber-700 transition-colors">
                {cat.name}
              </p>
              <p className="text-slate-500 text-[10px] sm:text-xs font-medium mt-0.5">
                {cat.items.length} items
              </p>
            </div>
            <span className="text-amber-800/80 text-[10px] sm:text-xs font-mono font-bold tabular-nums bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 shrink-0">
              {String(idx + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-3 text-center shrink-0">
        <p className="text-slate-400 text-[11px] font-medium tracking-wider">
          Tap any category to jump to it
        </p>
      </div>
    </div>
  );
}

