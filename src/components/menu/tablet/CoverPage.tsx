"use client";

import Image from "next/image";
import type { IBranding } from "@/types";

interface Props {
  branding: IBranding | null;
  width: number;
  height: number;
}

export default function CoverPage({ branding, width, height }: Props) {
  const hasCoverMedia = !!(branding?.coverVideoUrl || branding?.coverImageUrl);

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center p-6 select-none"
      style={{
        width,
        height,
        background: hasCoverMedia
          ? "#0f0f0f"
          : "linear-gradient(160deg, #FFFDF9 0%, #FAF6F0 50%, #F5EFEB 100%)",
      }}
    >
      {/* Cover background — video takes priority, falls back to image */}
      {branding?.coverVideoUrl ? (
        <video
          src={branding.coverVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : branding?.coverImageUrl ? (
        <Image
          src={branding.coverImageUrl}
          alt="cover"
          fill
          className="object-cover"
          priority
        />
      ) : null}

      {/* Luxury Vignette when media is present */}
      {hasCoverMedia && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/30 to-slate-950/80 pointer-events-none" />
      )}

      {/* Decorative Inset Luxury Frame */}
      <div
        className={`absolute inset-4 rounded-2xl pointer-events-none ${
          hasCoverMedia
            ? "border border-amber-400/40 shadow-inner"
            : "border border-amber-800/15"
        }`}
      />
      <div
        className={`absolute inset-5 rounded-xl pointer-events-none ${
          hasCoverMedia
            ? "border border-amber-400/25"
            : "border border-amber-800/10"
        }`}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-8 flex flex-col items-center gap-3.5">
        <div className="p-1 rounded-full bg-white border-2 border-amber-400 shadow-xl">
          <Image
            src={branding?.logoUrl || "/tajlogo.png"}
            alt={branding?.restaurantName ?? "Ashoka Hotel Logo"}
            width={85}
            height={85}
            className="rounded-full object-cover"
            priority
          />
        </div>

        <h1
          className={`font-playfair text-3xl sm:text-4xl font-black tracking-widest uppercase ${
            hasCoverMedia ? "text-white drop-shadow-lg" : "text-slate-900"
          }`}
        >
          {branding?.restaurantName ?? "Ashoka Hotel"}
        </h1>

        {branding?.tagline && (
          <p
            className={`text-xs sm:text-sm tracking-widest font-medium italic ${
              hasCoverMedia
                ? "text-amber-200 drop-shadow-md"
                : "text-amber-800 font-semibold"
            }`}
          >
            {branding.tagline}
          </p>
        )}

        <div
          className={`w-16 h-0.5 mt-1 rounded-full ${
            hasCoverMedia ? "bg-amber-400" : "bg-amber-500/60"
          }`}
        />

        <p
          className={`text-xs tracking-[0.4em] font-black uppercase ${
            hasCoverMedia ? "text-amber-200 drop-shadow-sm" : "text-amber-900"
          }`}
        >
          Menu
        </p>
      </div>

      {/* Corner ornaments */}
      <div
        className={`absolute top-6 left-6 text-2xl select-none ${
          hasCoverMedia ? "text-amber-400/70" : "text-amber-700/30"
        }`}
      >
        ✦
      </div>
      <div
        className={`absolute top-6 right-6 text-2xl select-none ${
          hasCoverMedia ? "text-amber-400/70" : "text-amber-700/30"
        }`}
      >
        ✦
      </div>
      <div
        className={`absolute bottom-6 left-6 text-2xl select-none ${
          hasCoverMedia ? "text-amber-400/70" : "text-amber-700/30"
        }`}
      >
        ✦
      </div>
      <div
        className={`absolute bottom-6 right-6 text-2xl select-none ${
          hasCoverMedia ? "text-amber-400/70" : "text-amber-700/30"
        }`}
      >
        ✦
      </div>
    </div>
  );
}

