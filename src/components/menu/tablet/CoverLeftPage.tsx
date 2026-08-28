"use client";

import type { IBranding } from "@/types";
import { resolveMenuAccent } from "@/lib/menu-theme";

interface Props {
  branding: IBranding | null;
  width: number;
  height: number;
}

export default function CoverLeftPage({ branding, width, height }: Props) {
  const primary = resolveMenuAccent(branding) || "#d97706";

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-center justify-between p-6"
      style={{
        width,
        height,
        background:
          "linear-gradient(160deg, #FFFDF9 0%, #FAF6F0 50%, #F5EFEB 100%)",
      }}
    >
      {/* Decorative Inset Frame */}
      <div className="absolute inset-4 rounded-2xl border border-amber-800/15 pointer-events-none" />
      <div className="absolute inset-5 rounded-xl border border-amber-800/10 pointer-events-none" />

      {/* Subtle radial warm glow from centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 55%, rgba(217,119,6,0.08) 0%, transparent 70%)`,
        }}
      />

      {/* Top ornament strip */}
      <div className="relative z-10 flex flex-col items-center pt-8 gap-2.5">
        <div className="flex items-center gap-3">
          <div className="h-px w-10 bg-amber-600/40" />
          <span className="text-amber-700 font-bold text-xs tracking-[0.3em]">
            ✦ ✦ ✦
          </span>
          <div className="h-px w-10 bg-amber-600/40" />
        </div>
        <p className="text-[10px] tracking-[0.4em] uppercase font-black text-amber-800/70">
          Est. 2024
        </p>
      </div>

      {/* Centre — vertical restaurant name */}
      <div className="relative z-10 flex flex-col items-center gap-6 flex-1 justify-center">
        {/* Vertical rule (top) */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-amber-500/60" />
          <div className="w-2.5 h-2.5 rotate-45 bg-amber-500 shadow-md shadow-amber-500/40" />
          <div className="w-px h-16 bg-gradient-to-t from-transparent to-amber-500/60" />
        </div>

        {/* Rotated name in Deep Obsidian */}
        <div
          className="font-playfair font-black tracking-widest uppercase select-none text-slate-900"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            fontSize: 14,
            letterSpacing: "0.35em",
          }}
        >
          {branding?.restaurantName ?? "Ashoka Hotel"}
        </div>

        {/* Vertical rule (bottom) */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-amber-500/60" />
          <div className="w-2 h-2 rotate-45 bg-amber-600/70" />
          <div className="w-px h-12 bg-gradient-to-t from-transparent to-amber-500/40" />
        </div>
      </div>

      {/* Bottom — "Dine In Menu" label */}
      <div className="relative z-10 flex flex-col items-center pb-8 gap-2.5">
        <p className="text-[9px] tracking-[0.5em] uppercase font-black text-amber-900/80">
          Dine In Menu
        </p>
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-amber-600/40" />
          <span className="text-amber-700 text-xs">✦</span>
          <div className="h-px w-8 bg-amber-600/40" />
        </div>
      </div>

      {/* Right-edge soft spine shadow */}
      <div
        className="absolute inset-y-0 right-0 w-6 pointer-events-none"
        style={{
          background: "linear-gradient(to right, transparent, rgba(0,0,0,0.06))",
        }}
      />
    </div>
  );
}
