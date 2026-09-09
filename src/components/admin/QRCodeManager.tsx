"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Search, QrCode, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface QRLocation {
  id: string;
  label: string;
  code: string;
  type: "table" | "room";
  floor?: string | null;
  isActive: boolean;
}

export interface QRBranding {
  restaurantName?: string | null;
  logoUrl?: string | null;
  callNumber?: string | null;
  primaryColor?: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function buildMenuUrl(appUrl: string, type: "table" | "room", code: string) {
  return `${appUrl}/menu/${code}`;
}

/* ─── Preset dimensions ───────────────────────────────────────────────────── */
interface Preset {
  label: string;
  w: number;
  h: number;
}
const PRESETS: Preset[] = [
  { label: "Default (6×9 in)", w: 600, h: 900 },
  { label: "A4 Portrait", w: 595, h: 842 },
  { label: "A5 Portrait", w: 420, h: 595 },
  { label: "Square", w: 600, h: 600 },
  { label: "Half-Letter", w: 612, h: 792 },
  { label: "Custom", w: 0, h: 0 },
];

/* ─── Shared phone-icon helper ───────────────────────────────────────────── */
const PhoneIcon = ({
  size = 13,
  color = "#d4956a",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

/* ─── Ornate corner flourish (Regalia swirl style) ───────────────────────── */
const CornerSwirl = ({
  size = 100,
  color = "#d4956a",
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    style={style}
  >
    <path
      d="M8 92 Q8 8 92 8"
      stroke={color}
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M18 92 Q18 18 92 18"
      stroke={color}
      strokeWidth="0.6"
      fill="none"
      strokeLinecap="round"
      opacity="0.45"
    />
    {/* Swirl curl at top-right end */}
    <path
      d="M92 8 C92 8 84 3 80 9 C76 15 85 17 84 11 C83 7 78 7 80 9"
      stroke={color}
      strokeWidth="1.3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Swirl curl at bottom-left end */}
    <path
      d="M8 92 C8 92 3 84 9 80 C15 76 17 85 11 84 C7 83 7 78 9 80"
      stroke={color}
      strokeWidth="1.3"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="92" cy="8" r="2.2" fill={color} opacity="0.7" />
    <circle cx="8" cy="92" r="2.2" fill={color} opacity="0.7" />
    <circle cx="52" cy="52" r="1.5" fill={color} opacity="0.2" />
  </svg>
);

/* ─── Sparkle dots (Midnight template) ───────────────────────────────────── */
const SparkleField = ({
  cardW,
  cardH,
  color = "#d4956a",
}: {
  cardW: number;
  cardH: number;
  color?: string;
}) => {
  const dots = [
    { x: 0.12, y: 0.08, r: 1.5 },
    { x: 0.88, y: 0.12, r: 1 },
    { x: 0.05, y: 0.35, r: 1 },
    { x: 0.95, y: 0.3, r: 1.5 },
    { x: 0.08, y: 0.62, r: 1 },
    { x: 0.92, y: 0.58, r: 1.2 },
    { x: 0.15, y: 0.82, r: 1.5 },
    { x: 0.82, y: 0.78, r: 1 },
    { x: 0.22, y: 0.18, r: 0.8 },
    { x: 0.78, y: 0.22, r: 0.8 },
    { x: 0.35, y: 0.06, r: 1.2 },
    { x: 0.65, y: 0.06, r: 0.8 },
    { x: 0.04, y: 0.5, r: 0.8 },
    { x: 0.96, y: 0.48, r: 1 },
  ];
  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${cardW} ${cardH}`}
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x * cardW}
          cy={d.y * cardH}
          r={d.r}
          fill={color}
          opacity={0.35}
        />
      ))}
    </svg>
  );
};

/* ─── Art-deco horizontal lines (Champagne template) ─────────────────────── */
const ArtDecoLines = ({
  cardW,
  color = "#a07820",
  s = 1,
}: {
  cardW: number;
  color?: string;
  s?: number;
}) => (
  <svg
    width={cardW}
    height={20 * s}
    viewBox={`0 0 ${cardW} ${20 * s}`}
    preserveAspectRatio="none"
    style={{ display: "block" }}
  >
    <line
      x1="0"
      y1={2 * s}
      x2={cardW}
      y2={2 * s}
      stroke={color}
      strokeWidth={0.6}
      opacity="0.6"
    />
    <line
      x1="0"
      y1={7 * s}
      x2={cardW}
      y2={7 * s}
      stroke={color}
      strokeWidth={1.5}
      opacity="0.7"
    />
    <line
      x1="0"
      y1={11 * s}
      x2={cardW}
      y2={11 * s}
      stroke={color}
      strokeWidth={0.6}
      opacity="0.5"
    />
    <line
      x1="0"
      y1={15 * s}
      x2={cardW}
      y2={15 * s}
      stroke={color}
      strokeWidth={2.5}
      opacity="0.8"
    />
    <line
      x1="0"
      y1={19 * s}
      x2={cardW}
      y2={19 * s}
      stroke={color}
      strokeWidth={0.4}
      opacity="0.4"
    />
  </svg>
);

/* ─── Petal motif SVG (Blush template) ───────────────────────────────────── */
const PetalCluster = ({
  style,
  color = "#c4736a",
}: {
  style?: React.CSSProperties;
  color?: string;
}) => (
  <svg width="70" height="70" viewBox="0 0 70 70" fill="none" style={style}>
    {[0, 60, 120, 180, 240, 300].map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const cx = 35 + Math.cos(rad) * 18;
      const cy = 35 + Math.sin(rad) * 18;
      return (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx="9"
          ry="14"
          fill={color}
          opacity="0.25"
          transform={`rotate(${deg + 90} ${cx} ${cy})`}
        />
      );
    })}
    <circle cx="35" cy="35" r="5" fill={color} opacity="0.4" />
  </svg>
);

/* ─── Google Fonts loader ─────────────────────────────────────────────────── */
const FontLoader = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@400;600;800&display=swap');`}</style>
);

/* ─── Shared card props ───────────────────────────────────────────────────── */
interface CardProps {
  selected: QRLocation;
  qrDataUrl: string;
  qrSize?: number;
  logoUrl?: string | null;
  logoSize?: number;
  logoY?: number;
  restaurantName?: string | null;
  phoneNumber?: string | null;
  cardW?: number;
  cardH?: number;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

/* ─── Template 1: Ashoka Ivory ──────────────────────────────────────────── */
function PrintCardIvory({
  selected,
  qrDataUrl,
  qrSize = 192,
  logoUrl,
  logoSize = 120,
  logoY = 30,
  restaurantName,
  phoneNumber,
  cardW = 600,
  cardH = 900,
  cardRef,
}: CardProps) {
  const s = Math.min(cardW / 600, cardH / 900);
  const peach = "#d4956a";
  const peachDeep = "#7c4018";
  const cs = 90 * s; // corner size
  return (
    <div
      ref={cardRef}
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        background: "#fef9f4",
        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent ${30 * s}px,rgba(180,130,90,0.04) ${30 * s}px,rgba(180,130,90,0.04) ${31 * s}px),repeating-linear-gradient(90deg,transparent,transparent ${30 * s}px,rgba(180,130,90,0.04) ${30 * s}px,rgba(180,130,90,0.04) ${31 * s}px)`,
      }}
    >
      <FontLoader />
      {/* Top/bottom border bands */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 7 * s,
          background: `linear-gradient(90deg,${peach},#f5c8a0,${peach})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 7 * s,
          background: `linear-gradient(90deg,${peach},#f5c8a0,${peach})`,
        }}
      />
      {/* Corner swirls */}
      <CornerSwirl
        size={cs}
        color={peach}
        style={{ position: "absolute", top: 7 * s, left: 7 * s }}
      />
      <CornerSwirl
        size={cs}
        color={peach}
        style={{
          position: "absolute",
          top: 7 * s,
          right: 7 * s,
          transform: "scaleX(-1)",
        }}
      />
      <CornerSwirl
        size={cs}
        color={peach}
        style={{
          position: "absolute",
          bottom: 7 * s,
          left: 7 * s,
          transform: "scaleY(-1)",
        }}
      />
      <CornerSwirl
        size={cs}
        color={peach}
        style={{
          position: "absolute",
          bottom: 7 * s,
          right: 7 * s,
          transform: "scale(-1,-1)",
        }}
      />
      {/* Logo */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            position: "absolute",
            top: logoY,
            left: "50%",
            transform: "translateX(-50%)",
            height: logoSize,
            maxWidth: cardW * 0.65,
            width: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 3px 12px rgba(140,80,30,0.18))",
            zIndex: 10,
          }}
        /> // eslint-disable-line @next/next/no-img-element
      ) : (
        <p
          style={{
            position: "absolute",
            top: logoY + 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 40 * s,
            color: peachDeep,
            lineHeight: 1,
            margin: 0,
            zIndex: 10,
          }}
        >
          {restaurantName || "Ashoka Hotel"}
        </p>
      )}
      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: Math.min(200 * s, cardH * 0.24),
          paddingBottom: Math.min(50 * s, cardH * 0.06),
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond','Playfair Display',Georgia,serif",
            fontSize: 96 * s,
            fontWeight: 700,
            color: peachDeep,
            lineHeight: 1,
            margin: 0,
            letterSpacing: 10 * s,
          }}
        >
          MENU
        </p>
        {/* Diamond divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            margin: `${14 * s}px 0 ${12 * s}px`,
          }}
        >
          <div
            style={{
              width: 70 * s,
              height: 1,
              background: `linear-gradient(to right,transparent,${peach})`,
            }}
          />
          <svg width={10 * s} height={10 * s} viewBox="0 0 10 10">
            <polygon points="5,0 10,5 5,10 0,5" fill={peach} />
          </svg>
          <div
            style={{
              width: 70 * s,
              height: 1,
              background: `linear-gradient(to left,transparent,${peach})`,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontSize: 15 * s,
            color: "#9b7560",
            margin: `0 0 ${22 * s}px`,
            letterSpacing: 0.5 * s,
            textAlign: "center",
          }}
        >
          Scan the QR Code to explore our menu
        </p>
        <div
          style={{
            border: `1.5px solid ${peach}`,
            borderRadius: 99,
            padding: `${8 * s}px ${30 * s}px`,
            marginBottom: 20 * s,
            background: "rgba(212,149,106,0.07)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 700,
              fontSize: 17 * s,
              color: peachDeep,
              margin: 0,
              letterSpacing: 0.5 * s,
            }}
          >
            {selected.label}
          </p>
        </div>
        <div
          style={{
            background: "#fff",
            padding: 12 * s,
            borderRadius: 12 * s,
            border: `2px solid ${peach}`,
            boxShadow: `0 ${4 * s}px ${20 * s}px rgba(212,149,106,0.22)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={(qrSize || 192) * s}
            height={(qrSize || 192) * s}
            style={{ display: "block", borderRadius: 4 * s }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * s,
            marginTop: 14 * s,
          }}
        >
          <div
            style={{
              width: 28 * s,
              height: 1,
              background: peach,
              opacity: 0.5,
            }}
          />
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 800,
              fontSize: 9 * s,
              color: peach,
              letterSpacing: 6 * s,
              margin: 0,
            }}
          >
            ✦ SCAN ME ✦
          </p>
          <div
            style={{
              width: 28 * s,
              height: 1,
              background: peach,
              opacity: 0.5,
            }}
          />
        </div>
        {selected.floor && (
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontSize: 12 * s,
              color: "#9b7560",
              margin: `${4 * s}px 0 0`,
            }}
          >
            {selected.floor}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Template 2: Midnight Royal ─────────────────────────────────────────── */
function PrintCardMidnight({
  selected,
  qrDataUrl,
  qrSize = 192,
  logoUrl,
  logoSize = 120,
  logoY = 30,
  restaurantName,
  phoneNumber,
  cardW = 600,
  cardH = 900,
  cardRef,
}: CardProps) {
  const s = Math.min(cardW / 600, cardH / 900);
  const gold = "#d4956a";
  const goldBright = "#f5c8a0";
  const bk = 60 * s; // bracket size
  return (
    <div
      ref={cardRef}
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        background: "#0d1117",
      }}
    >
      <FontLoader />
      {/* Subtle center glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400 * s,
          height: 400 * s,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(212,149,106,0.08) 0%,transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Top/bottom gold stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5 * s,
          background: `linear-gradient(90deg,transparent,${gold},${goldBright},${gold},transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5 * s,
          background: `linear-gradient(90deg,transparent,${gold},${goldBright},${gold},transparent)`,
        }}
      />
      {/* Corner brackets */}
      {[
        { t: 5 * s, l: 5 * s, r: undefined, b: undefined },
        { t: 5 * s, l: undefined, r: 5 * s, b: undefined },
        { t: undefined, l: 5 * s, r: undefined, b: 5 * s },
        { t: undefined, l: undefined, r: 5 * s, b: 5 * s },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: pos.t,
            left: pos.l,
            right: pos.r,
            bottom: pos.b,
            width: bk,
            height: bk,
            borderTop: pos.t !== undefined ? `1.5px solid ${gold}` : undefined,
            borderBottom:
              pos.b !== undefined ? `1.5px solid ${gold}` : undefined,
            borderLeft: pos.l !== undefined ? `1.5px solid ${gold}` : undefined,
            borderRight:
              pos.r !== undefined ? `1.5px solid ${gold}` : undefined,
          }}
        />
      ))}
      {/* Sparkle field */}
      <SparkleField cardW={cardW} cardH={cardH} color={gold} />
      {/* Logo */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            position: "absolute",
            top: logoY,
            left: "50%",
            transform: "translateX(-50%)",
            height: logoSize,
            maxWidth: cardW * 0.65,
            width: "auto",
            objectFit: "contain",
            filter:
              "drop-shadow(0 0 16px rgba(212,149,106,0.5)) brightness(1.1)",
            zIndex: 10,
          }}
        /> // eslint-disable-line @next/next/no-img-element
      ) : (
        <p
          style={{
            position: "absolute",
            top: logoY + 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Playfair Display',Georgia,serif",
            fontWeight: 700,
            fontSize: 34 * s,
            color: goldBright,
            lineHeight: 1,
            margin: 0,
            zIndex: 10,
            textShadow: `0 0 30px rgba(245,200,160,0.4)`,
          }}
        >
          {restaurantName || "Ashoka Hotel"}
        </p>
      )}
      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: Math.min(210 * s, cardH * 0.25),
          paddingBottom: Math.min(50 * s, cardH * 0.06),
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            fontSize: 96 * s,
            fontWeight: 700,
            color: gold,
            lineHeight: 1,
            margin: 0,
            letterSpacing: 8 * s,
            textShadow: `0 0 40px rgba(212,149,106,0.35),0 0 80px rgba(212,149,106,0.15)`,
          }}
        >
          MENU
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            margin: `${12 * s}px 0 ${18 * s}px`,
          }}
        >
          <div
            style={{
              width: 70 * s,
              height: 1,
              background: `linear-gradient(to right,transparent,${gold})`,
            }}
          />
          <svg width={8 * s} height={8 * s} viewBox="0 0 8 8">
            <polygon points="4,0 8,4 4,8 0,4" fill={gold} />
          </svg>
          <div
            style={{
              width: 70 * s,
              height: 1,
              background: `linear-gradient(to left,transparent,${gold})`,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'DM Sans',Arial,sans-serif",
            fontSize: 13 * s,
            color: "rgba(245,200,160,0.5)",
            margin: `0 0 ${22 * s}px`,
            letterSpacing: 1.5 * s,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          Scan to explore our menu
        </p>
        <div
          style={{
            background: "rgba(212,149,106,0.1)",
            border: `1.5px solid ${gold}`,
            borderRadius: 4 * s,
            padding: `${8 * s}px ${28 * s}px`,
            marginBottom: 20 * s,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 700,
              fontSize: 17 * s,
              color: goldBright,
              margin: 0,
              letterSpacing: 1 * s,
            }}
          >
            {selected.label}
          </p>
        </div>
        <div
          style={{
            background: "#060810",
            padding: 12 * s,
            borderRadius: 10 * s,
            border: `2px solid ${gold}`,
            boxShadow: `0 0 30px rgba(212,149,106,0.15)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={(qrSize || 190) * s}
            height={(qrSize || 190) * s}
            style={{ display: "block", borderRadius: 4 * s }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * s,
            marginTop: 14 * s,
          }}
        >
          <div
            style={{
              width: 30 * s,
              height: 1,
              background: gold,
              opacity: 0.45,
            }}
          />
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 800,
              fontSize: 9 * s,
              color: gold,
              letterSpacing: 6 * s,
              margin: 0,
            }}
          >
            SCAN ME
          </p>
          <div
            style={{
              width: 30 * s,
              height: 1,
              background: gold,
              opacity: 0.45,
            }}
          />
        </div>
        {selected.floor && (
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontSize: 12 * s,
              color: "rgba(245,200,160,0.4)",
              margin: `${4 * s}px 0 0`,
            }}
          >
            {selected.floor}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Template 3: Blush Petal ─────────────────────────────────────────────── */
function PrintCardBlush({
  selected,
  qrDataUrl,
  qrSize = 192,
  logoUrl,
  logoSize = 120,
  logoY = 30,
  restaurantName,
  phoneNumber,
  cardW = 600,
  cardH = 900,
  cardRef,
}: CardProps) {
  const s = Math.min(cardW / 600, cardH / 900);
  const rose = "#c4736a";
  const roseDeep = "#6b2f2b";
  const rosePale = "#f7e4e2";
  return (
    <div
      ref={cardRef}
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        background: "#fdf2f0",
      }}
    >
      <FontLoader />
      {/* Soft gradient top wash */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: cardH * 0.42,
          background: "linear-gradient(170deg,#fde8e4 0%,#fdf2f0 100%)",
        }}
      />
      {/* Top/bottom rose stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6 * s,
          background: `linear-gradient(90deg,${rose},#e8a09a,${rose})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6 * s,
          background: `linear-gradient(90deg,${rose},#e8a09a,${rose})`,
        }}
      />
      {/* Corner petal clusters */}
      <PetalCluster
        color={rose}
        style={{
          position: "absolute",
          top: 12 * s,
          left: 12 * s,
          width: 70 * s,
          height: 70 * s,
          opacity: 0.65,
        }}
      />
      <PetalCluster
        color={rose}
        style={{
          position: "absolute",
          top: 12 * s,
          right: 12 * s,
          width: 70 * s,
          height: 70 * s,
          opacity: 0.65,
          transform: "scaleX(-1)",
        }}
      />
      <PetalCluster
        color={rose}
        style={{
          position: "absolute",
          bottom: 12 * s,
          left: 12 * s,
          width: 70 * s,
          height: 70 * s,
          opacity: 0.55,
          transform: "scaleY(-1)",
        }}
      />
      <PetalCluster
        color={rose}
        style={{
          position: "absolute",
          bottom: 12 * s,
          right: 12 * s,
          width: 70 * s,
          height: 70 * s,
          opacity: 0.55,
          transform: "scale(-1,-1)",
        }}
      />
      {/* Logo */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            position: "absolute",
            top: logoY,
            left: "50%",
            transform: "translateX(-50%)",
            height: logoSize,
            maxWidth: cardW * 0.65,
            width: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 10px rgba(180,80,70,0.15))",
            zIndex: 10,
          }}
        /> // eslint-disable-line @next/next/no-img-element
      ) : (
        <p
          style={{
            position: "absolute",
            top: logoY + 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 38 * s,
            color: roseDeep,
            lineHeight: 1,
            margin: 0,
            zIndex: 10,
          }}
        >
          {restaurantName || "Ashoka Hotel"}
        </p>
      )}
      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: Math.min(205 * s, cardH * 0.25),
          paddingBottom: Math.min(50 * s, cardH * 0.06),
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond','Playfair Display',Georgia,serif",
            fontSize: 94 * s,
            fontWeight: 700,
            color: roseDeep,
            lineHeight: 1,
            margin: 0,
            letterSpacing: 10 * s,
          }}
        >
          MENU
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            margin: `${12 * s}px 0 ${12 * s}px`,
          }}
        >
          <div
            style={{
              width: 70 * s,
              height: 1,
              background: `linear-gradient(to right,transparent,${rose})`,
            }}
          />
          <svg width={12 * s} height={7 * s} viewBox="0 0 12 7">
            <ellipse
              cx="6"
              cy="3.5"
              rx="5"
              ry="3"
              fill="none"
              stroke={rose}
              strokeWidth="1"
            />
            <circle cx="6" cy="3.5" r="1.5" fill={rose} />
          </svg>
          <div
            style={{
              width: 70 * s,
              height: 1,
              background: `linear-gradient(to left,transparent,${rose})`,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontSize: 15 * s,
            color: "#a06060",
            margin: `0 0 ${20 * s}px`,
            textAlign: "center",
          }}
        >
          Scan the QR Code to explore our menu
        </p>
        <div
          style={{
            background: rosePale,
            border: `1.5px solid ${rose}`,
            borderRadius: 99,
            padding: `${8 * s}px ${28 * s}px`,
            marginBottom: 20 * s,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 700,
              fontSize: 17 * s,
              color: roseDeep,
              margin: 0,
            }}
          >
            {selected.label}
          </p>
        </div>
        <div
          style={{
            background: "#fff",
            padding: 12 * s,
            borderRadius: 12 * s,
            border: `2px solid ${rose}`,
            boxShadow: `0 ${4 * s}px ${20 * s}px rgba(196,115,106,0.18)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={(qrSize || 192) * s}
            height={(qrSize || 192) * s}
            style={{ display: "block", borderRadius: 4 * s }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * s,
            marginTop: 14 * s,
          }}
        >
          <div
            style={{ width: 28 * s, height: 1, background: rose, opacity: 0.4 }}
          />
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 800,
              fontSize: 9 * s,
              color: rose,
              letterSpacing: 6 * s,
              margin: 0,
            }}
          >
            ✦ SCAN ME ✦
          </p>
          <div
            style={{ width: 28 * s, height: 1, background: rose, opacity: 0.4 }}
          />
        </div>
        {selected.floor && (
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontSize: 12 * s,
              color: "#a06060",
              margin: `${4 * s}px 0 0`,
            }}
          >
            {selected.floor}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Template 4: Champagne & Gold ───────────────────────────────────────── */
function PrintCardChampagne({
  selected,
  qrDataUrl,
  qrSize = 192,
  logoUrl,
  logoSize = 120,
  logoY = 30,
  restaurantName,
  phoneNumber,
  cardW = 600,
  cardH = 900,
  cardRef,
}: CardProps) {
  const s = Math.min(cardW / 600, cardH / 900);
  const gold = "#a07820";
  const goldBright = "#d4a840";
  const champagne = "#f7f0e0";
  return (
    <div
      ref={cardRef}
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        background: champagne,
      }}
    >
      <FontLoader />
      {/* Art-deco line bands at top/bottom */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <ArtDecoLines cardW={cardW} color={gold} s={s} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: "scaleY(-1)",
        }}
      >
        <ArtDecoLines cardW={cardW} color={gold} s={s} />
      </div>
      {/* Side vertical accent lines */}
      <div
        style={{
          position: "absolute",
          top: 20 * s,
          bottom: 20 * s,
          left: 20 * s,
          width: 1.5,
          background: `linear-gradient(to bottom,transparent,${gold},${goldBright},${gold},transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20 * s,
          bottom: 20 * s,
          right: 20 * s,
          width: 1.5,
          background: `linear-gradient(to bottom,transparent,${gold},${goldBright},${gold},transparent)`,
        }}
      />
      {/* Top center diamond ornament */}
      <div
        style={{
          position: "absolute",
          top: 22 * s,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <svg width={40 * s} height={12 * s} viewBox="0 0 40 12">
          <line x1="0" y1="6" x2="14" y2="6" stroke={gold} strokeWidth="0.8" />
          <polygon points="20,0 26,6 20,12 14,6" fill={gold} opacity="0.7" />
          <line x1="26" y1="6" x2="40" y2="6" stroke={gold} strokeWidth="0.8" />
        </svg>
      </div>
      {/* Logo */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            position: "absolute",
            top: logoY,
            left: "50%",
            transform: "translateX(-50%)",
            height: logoSize,
            maxWidth: cardW * 0.65,
            width: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 3px 12px rgba(160,120,32,0.2))",
            zIndex: 10,
          }}
        /> // eslint-disable-line @next/next/no-img-element
      ) : (
        <p
          style={{
            position: "absolute",
            top: logoY + 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontWeight: 700,
            fontSize: 38 * s,
            color: gold,
            lineHeight: 1,
            margin: 0,
            zIndex: 10,
          }}
        >
          {restaurantName || "Ashoka Hotel"}
        </p>
      )}
      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: Math.min(205 * s, cardH * 0.25),
          paddingBottom: Math.min(50 * s, cardH * 0.06),
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 96 * s,
            fontWeight: 700,
            color: gold,
            lineHeight: 1,
            margin: 0,
            letterSpacing: 10 * s,
          }}
        >
          MENU
        </p>
        {/* Horizontal rule with diamond */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            margin: `${12 * s}px 0 ${14 * s}px`,
          }}
        >
          <div
            style={{
              width: 80 * s,
              height: 1,
              background: `linear-gradient(to right,transparent,${gold})`,
            }}
          />
          <svg width={10 * s} height={10 * s} viewBox="0 0 10 10">
            <polygon points="5,0 10,5 5,10 0,5" fill={goldBright} />
          </svg>
          <div
            style={{
              width: 80 * s,
              height: 1,
              background: `linear-gradient(to left,transparent,${gold})`,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontSize: 15 * s,
            color: "#8a7040",
            margin: `0 0 ${20 * s}px`,
            textAlign: "center",
          }}
        >
          Scan the QR Code to explore our menu
        </p>
        <div
          style={{
            background: "rgba(160,120,32,0.08)",
            border: `1px solid ${gold}`,
            padding: `${8 * s}px ${30 * s}px`,
            marginBottom: 20 * s,
          }}
        >
          <p
            style={{
              fontFamily: "'Cormorant Garamond',Georgia,serif",
              fontWeight: 700,
              fontSize: 18 * s,
              color: gold,
              margin: 0,
              letterSpacing: 1 * s,
            }}
          >
            {selected.label}
          </p>
        </div>
        <div
          style={{
            background: "#fff8ec",
            padding: 12 * s,
            border: `1.5px solid ${goldBright}`,
            boxShadow: `0 ${4 * s}px ${20 * s}px rgba(160,120,32,0.2)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={(qrSize || 192) * s}
            height={(qrSize || 192) * s}
            style={{ display: "block" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * s,
            marginTop: 14 * s,
          }}
        >
          <div
            style={{
              width: 32 * s,
              height: 0.8,
              background: gold,
              opacity: 0.5,
            }}
          />
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 800,
              fontSize: 9 * s,
              color: gold,
              letterSpacing: 6 * s,
              margin: 0,
            }}
          >
            SCAN ME
          </p>
          <div
            style={{
              width: 32 * s,
              height: 0.8,
              background: gold,
              opacity: 0.5,
            }}
          />
        </div>
        {selected.floor && (
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontSize: 12 * s,
              color: "#8a7040",
              margin: `${4 * s}px 0 0`,
            }}
          >
            {selected.floor}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Template 5: Ashoka Noir ────────────────────────────────────────────── */
function PrintCardNoir({
  selected,
  qrDataUrl,
  qrSize = 192,
  logoUrl,
  logoSize = 120,
  logoY = 30,
  restaurantName,
  phoneNumber,
  cardW = 600,
  cardH = 900,
  cardRef,
}: CardProps) {
  const s = Math.min(cardW / 600, cardH / 900);
  const peach = "#f5c8a0"; // exact Regalia logo peach
  const peachDim = "rgba(245,200,160,0.55)";
  return (
    <div
      ref={cardRef}
      style={{
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        background: "#1a120c",
      }}
    >
      <FontLoader />
      {/* Subtle warm radial glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 500 * s,
          height: 500 * s,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(245,200,160,0.06) 0%,transparent 65%)",
          pointerEvents: "none",
        }}
      />
      {/* Top/bottom minimal stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3 * s,
          background: `linear-gradient(90deg,transparent,${peach},transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3 * s,
          background: `linear-gradient(90deg,transparent,${peach},transparent)`,
        }}
      />
      {/* Thin border rect */}
      <div
        style={{
          position: "absolute",
          top: 12 * s,
          left: 12 * s,
          right: 12 * s,
          bottom: 12 * s,
          border: `1px solid rgba(245,200,160,0.12)`,
          borderRadius: 4 * s,
          pointerEvents: "none",
        }}
      />
      {/* Corner dots */}
      {[
        { t: 8 * s, l: 8 * s },
        { t: 8 * s, r: 8 * s },
        { b: 8 * s, l: 8 * s },
        { b: 8 * s, r: 8 * s },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: (p as { t?: number }).t,
            bottom: (p as { b?: number }).b,
            left: (p as { l?: number }).l,
            right: (p as { r?: number }).r,
            width: 5 * s,
            height: 5 * s,
            borderRadius: "50%",
            background: peach,
            opacity: 0.45,
          }}
        />
      ))}
      {/* Logo */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            position: "absolute",
            top: logoY,
            left: "50%",
            transform: "translateX(-50%)",
            height: logoSize,
            maxWidth: cardW * 0.65,
            width: "auto",
            objectFit: "contain",
            filter: `drop-shadow(0 0 20px rgba(245,200,160,0.45)) brightness(1.05)`,
            zIndex: 10,
          }}
        /> // eslint-disable-line @next/next/no-img-element
      ) : (
        <p
          style={{
            position: "absolute",
            top: logoY + 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 38 * s,
            color: peach,
            lineHeight: 1,
            margin: 0,
            zIndex: 10,
            textShadow: `0 0 30px rgba(245,200,160,0.35)`,
          }}
        >
          {restaurantName || "Ashoka Hotel"}
        </p>
      )}
      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: Math.min(205 * s, cardH * 0.25),
          paddingBottom: Math.min(50 * s, cardH * 0.06),
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond','Playfair Display',Georgia,serif",
            fontSize: 96 * s,
            fontWeight: 700,
            color: peach,
            lineHeight: 1,
            margin: 0,
            letterSpacing: 10 * s,
            textShadow: `0 0 50px rgba(245,200,160,0.2)`,
          }}
        >
          MENU
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            margin: `${12 * s}px 0 ${16 * s}px`,
          }}
        >
          <div
            style={{
              width: 80 * s,
              height: 1,
              background: `linear-gradient(to right,transparent,${peachDim})`,
            }}
          />
          <svg width={6 * s} height={6 * s} viewBox="0 0 6 6">
            <circle cx="3" cy="3" r="2.5" fill={peach} opacity="0.6" />
          </svg>
          <div
            style={{
              width: 80 * s,
              height: 1,
              background: `linear-gradient(to left,transparent,${peachDim})`,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontStyle: "italic",
            fontSize: 14 * s,
            color: peachDim,
            margin: `0 0 ${22 * s}px`,
            letterSpacing: 1 * s,
            textAlign: "center",
          }}
        >
          Scan to explore our menu
        </p>
        <div
          style={{
            border: `1px solid rgba(245,200,160,0.25)`,
            borderRadius: 3 * s,
            padding: `${8 * s}px ${28 * s}px`,
            marginBottom: 20 * s,
            background: "rgba(245,200,160,0.05)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 600,
              fontSize: 17 * s,
              color: peach,
              margin: 0,
              letterSpacing: 1 * s,
            }}
          >
            {selected.label}
          </p>
        </div>
        <div
          style={{
            background: "#100c08",
            padding: 12 * s,
            borderRadius: 8 * s,
            border: `1px solid rgba(245,200,160,0.3)`,
            boxShadow: `0 0 30px rgba(245,200,160,0.08)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={(qrSize || 192) * s}
            height={(qrSize || 192) * s}
            style={{ display: "block", borderRadius: 4 * s }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * s,
            marginTop: 14 * s,
          }}
        >
          <div style={{ width: 30 * s, height: 1, background: peachDim }} />
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontWeight: 800,
              fontSize: 9 * s,
              color: peachDim,
              letterSpacing: 7 * s,
              margin: 0,
            }}
          >
            SCAN ME
          </p>
          <div style={{ width: 30 * s, height: 1, background: peachDim }} />
        </div>
        {selected.floor && (
          <p
            style={{
              fontFamily: "'DM Sans',Arial,sans-serif",
              fontSize: 12 * s,
              color: peachDim,
              margin: `${4 * s}px 0 0`,
            }}
          >
            {selected.floor}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── QRCodeManager (main export) ────────────────────────────────────────── */
interface QRCodeManagerProps {
  locations: QRLocation[];
  branding: QRBranding | null;
  appUrl: string;
}

export function QRCodeManager({
  locations,
  branding,
  appUrl,
}: QRCodeManagerProps) {
  const [baseUrlOverride, setBaseUrlOverride] = useState<string>(() => {
    try {
      return localStorage.getItem("ashoka_qr_base_url") || appUrl;
    } catch {
      return appUrl;
    }
  });

  const effectiveBaseUrl = baseUrlOverride.trim().replace(/\/+$/, "") || appUrl;

  const [selected, setSelected] = useState<QRLocation | null>(
    locations[0] ?? null,
  );
  const [filter, setFilter] = useState<"all" | "room" | "table">("all");
  const [search, setSearch] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [logoSize, setLogoSize] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_logo");
      if (s) {
        const { size } = JSON.parse(s);
        if (size) return size;
      }
    } catch {
      /* ignore */
    }
    return 120;
  });
  const [logoY, setLogoY] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_logo");
      if (s) {
        const { y } = JSON.parse(s);
        if (y !== undefined) return y;
      }
    } catch {
      /* ignore */
    }
    return 30;
  });
  const [cardW, setCardW] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_dims");
      if (s) {
        const { w } = JSON.parse(s);
        if (w) return w;
      }
    } catch {
      /* ignore */
    }
    return 600;
  });
  const [cardH, setCardH] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_dims");
      if (s) {
        const { h } = JSON.parse(s);
        if (h) return h;
      }
    } catch {
      /* ignore */
    }
    return 900;
  });
  const [presetLabel, setPresetLabel] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_dims");
      if (s) {
        const { preset } = JSON.parse(s);
        if (preset) return preset;
      }
    } catch {
      /* ignore */
    }
    return "Default (6×9 in)";
  });
  const [customW, setCustomW] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_dims");
      if (s) {
        const { cw } = JSON.parse(s);
        if (cw) return cw;
      }
    } catch {
      /* ignore */
    }
    return 600;
  });
  const [customH, setCustomH] = useState(() => {
    try {
      const s = localStorage.getItem("regaliaQR_dims");
      if (s) {
        const { ch } = JSON.parse(s);
        if (ch) return ch;
      }
    } catch {
      /* ignore */
    }
    return 900;
  });
  const [template, setTemplate] = useState<
    "ivory" | "midnight" | "blush" | "champagne" | "noir"
  >(() => {
    try {
      const s = localStorage.getItem("regaliaQR_dims");
      if (s) {
        const { tmpl } = JSON.parse(s);
        if (tmpl) return tmpl;
      }
    } catch {
      /* ignore */
    }
    return "ivory";
  });
  const [qrSize, setQrSize] = useState<number>(() => {
    try {
      const s = localStorage.getItem("regaliaQR_qr_size");
      if (s) {
        const val = Number(s);
        if (!isNaN(val) && val >= 100 && val <= 500) return val;
      }
    } catch {
      /* ignore */
    }
    return 192;
  });
  const printCardRef = useRef<HTMLDivElement>(null);

  // Persist QR size adjustment
  useEffect(() => {
    localStorage.setItem("regaliaQR_qr_size", String(qrSize));
  }, [qrSize]);

  // Persist logo adjustments
  useEffect(() => {
    localStorage.setItem(
      "regaliaQR_logo",
      JSON.stringify({ size: logoSize, y: logoY }),
    );
  }, [logoSize, logoY]);

  // Persist card dimensions
  useEffect(() => {
    localStorage.setItem(
      "regaliaQR_dims",
      JSON.stringify({
        w: cardW,
        h: cardH,
        preset: presetLabel,
        cw: customW,
        ch: customH,
        tmpl: template,
      }),
    );
  }, [cardW, cardH, presetLabel, customW, customH, template]);

  const filtered = locations.filter((l) => {
    const matchType = filter === "all" || l.type === filter;
    const matchSearch =
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const generateQR = useCallback(
    async (loc: QRLocation, size = qrSize) => {
      setGenerating(true);
      try {
        const QRCode = (await import("qrcode")).default;
        const url = buildMenuUrl(effectiveBaseUrl, loc.type, loc.code);
        const dataUrl = await QRCode.toDataURL(url, {
          width: Math.max(size * 2, 512),
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
        setQrDataUrl(dataUrl);
      } finally {
        setGenerating(false);
      }
    },
    [effectiveBaseUrl, qrSize],
  );

  useEffect(() => {
    if (selected) {
      generateQR(selected, qrSize);
    }
  }, [selected, effectiveBaseUrl, generateQR, qrSize]);

  const handleSelect = async (loc: QRLocation) => {
    setSelected(loc);
    await generateQR(loc);
  };

  const downloadQR = () => {
    if (!qrDataUrl || !selected) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${selected.label.replace(/\s+/g, "-")}-QR.png`;
    link.click();
    toast.success(`Downloaded QR for ${selected.label}`);
  };

  const downloadPrintCard = async () => {
    if (!printCardRef.current || !selected) return;
    try {
      const { toPng } = await import("html-to-image");
      toast.loading("Generating print card…", { id: "print" });
      const dataUrl = await toPng(printCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${selected.label.replace(/\s+/g, "-")}-PrintCard.png`;
      link.click();
      toast.success("Print card downloaded!", { id: "print" });
    } catch {
      toast.error("Failed to generate print card", { id: "print" });
    }
  };

  const downloadBulk = async (type?: "room" | "table") => {
    const QRCode = (await import("qrcode")).default;
    setBulkLoading(true);
    try {
      const zip = new JSZip();
      const subset = type
        ? locations.filter((l) => l.type === type)
        : locations;
      const folder = zip.folder("QR-Codes");
      await Promise.all(
        subset.map(async (loc) => {
          const url = buildMenuUrl(effectiveBaseUrl, loc.type, loc.code);
          const dataUrl = await QRCode.toDataURL(url, {
            width: 512,
            margin: 2,
          });
          const base64 = dataUrl.split(",")[1];
          folder!.file(`${loc.label.replace(/\s+/g, "-")}-QR.png`, base64, {
            base64: true,
          });
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = type ? `${type}-QRs.zip` : "all-QRs.zip";
      link.click();
      toast.success(`Downloaded ${subset.length} QR codes!`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Generate QR on mount for first location
  useEffect(() => {
    const first = locations[0];
    if (!first) return;
    (async () => {
      await generateQR(first);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharedCardProps = {
    selected: selected!,
    qrDataUrl,
    qrSize,
    logoUrl: branding?.logoUrl,
    logoSize,
    logoY,
    restaurantName: branding?.restaurantName,
    phoneNumber: branding?.callNumber,
    cardW,
    cardH,
  };

  const TEMPLATES = [
    {
      id: "ivory" as const,
      label: "Ivory & Rose Gold",
      bg: "#fef9f4",
      accent: "#d4956a",
      textColor: "#7c4018",
    },
    {
      id: "midnight" as const,
      label: "Midnight Royal",
      bg: "#0d1117",
      accent: "#d4956a",
      textColor: "#f5c8a0",
    },
    {
      id: "blush" as const,
      label: "Blush Petal",
      bg: "#fdf2f0",
      accent: "#c4736a",
      textColor: "#6b2f2b",
    },
    {
      id: "champagne" as const,
      label: "Champagne & Gold",
      bg: "#f7f0e0",
      accent: "#a07820",
      textColor: "#5a4a1a",
    },
    {
      id: "noir" as const,
      label: "Ashoka Noir",
      bg: "#1a120c",
      accent: "#f5c8a0",
      textColor: "#f5c8a0",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* LEFT — Location list */}
      <div className="lg:col-span-2 space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "table", "room"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
            >
              {f === "all" ? "All" : f === "table" ? "🍽️ Tables" : "🛏️ Rooms"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location..."
            className="input input-bordered input-sm w-full bg-base-200 pl-8"
          />
        </div>

        {/* Location list */}
        <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden max-h-120 overflow-y-auto">
          {filtered.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-base-300/50 last:border-0 ${selected?.id === loc.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-base-300"}`}
            >
              <span className="text-lg">
                {loc.type === "room" ? "🛏️" : "🍽️"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-base-content truncate">
                  {loc.label}
                </p>
                <p className="text-xs text-base-content/40 font-mono">
                  {loc.code}
                </p>
              </div>
              {!loc.isActive && (
                <span className="badge badge-xs badge-ghost">Off</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-base-content/40">
              No locations found
            </p>
          )}
        </div>

        {/* Bulk export */}
        <div className="bg-base-200 border border-base-300 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
            Bulk Export
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadBulk("table")}
              disabled={bulkLoading}
              className="btn btn-sm btn-ghost gap-1"
            >
              <UtensilsCrossed size={14} /> All Table QRs
            </button>
            <button
              onClick={() => downloadBulk()}
              disabled={bulkLoading}
              className="btn btn-sm btn-ghost gap-1"
            >
              <Download size={14} /> Export All
            </button>
          </div>
          {bulkLoading && (
            <p className="text-xs text-primary animate-pulse">
              Generating ZIP…
            </p>
          )}
        </div>
      </div>

      {/* RIGHT — QR Preview */}
      <div className="lg:col-span-3">
        <div className="bg-base-200 border border-base-300 rounded-2xl p-6 flex flex-col items-center gap-5 min-h-125 justify-center">
          {selected ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                {/* Header */}
                <div className="text-center">
                  <p className="text-xs text-base-content/40 uppercase tracking-wider mb-1">
                    QR Preview
                  </p>
                  <h3 className="text-xl font-bold text-base-content">
                    {selected.label}
                  </h3>
                  {selected.floor && (
                    <p className="text-sm text-base-content/50">
                      {selected.floor}
                    </p>
                  )}
                </div>

                {/* QR Display Container */}
                <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center gap-2">
                  {generating ? (
                    <div
                      style={{
                        width: Math.min(Math.max(qrSize, 140), 280),
                        height: Math.min(Math.max(qrSize, 140), 280),
                      }}
                      className="flex items-center justify-center"
                    >
                      <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                  ) : qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      style={{
                        width: Math.min(Math.max(qrSize, 140), 280),
                        height: Math.min(Math.max(qrSize, 140), 280),
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: Math.min(Math.max(qrSize, 140), 280),
                        height: Math.min(Math.max(qrSize, 140), 280),
                      }}
                      className="flex items-center justify-center"
                    >
                      <QrCode size={48} className="text-gray-300" />
                    </div>
                  )}
                  <span className="text-[11px] font-mono text-gray-500 font-semibold">
                    Current Size: {qrSize} × {qrSize} px
                  </span>
                </div>

                {/* QR Size Adjustment Controls */}
                <div className="w-full bg-base-200 border border-base-300 rounded-xl p-3.5 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-base-content/80 flex items-center gap-1.5">
                      <QrCode size={14} className="text-primary" />
                      QR Code Size (बड़ा / छोटा करें):
                    </label>
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {qrSize}px
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-base-content/50 whitespace-nowrap">
                      100px
                    </span>
                    <input
                      type="range"
                      min={100}
                      max={400}
                      step={4}
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                      className="range range-xs range-primary flex-1"
                    />
                    <span className="text-[11px] font-medium text-base-content/50 whitespace-nowrap">
                      400px
                    </span>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-base-content/50 mr-1">
                      Presets:
                    </span>
                    {[
                      { label: "Small (140px)", size: 140 },
                      { label: "Normal (192px)", size: 192 },
                      { label: "Large (260px)", size: 260 },
                      { label: "XL (340px)", size: 340 },
                    ].map((p) => (
                      <button
                        key={p.size}
                        onClick={() => setQrSize(p.size)}
                        className={`btn btn-xs ${qrSize === p.size ? "btn-primary" : "btn-ghost border border-base-300"}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base URL / Domain Configuration */}
                <div className="w-full bg-base-200 border border-base-300 rounded-xl p-3 space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-base-content/70">
                      QR Domain / Base URL:
                    </label>
                    {baseUrlOverride !== appUrl && (
                      <button
                        onClick={() => {
                          setBaseUrlOverride(appUrl);
                          try {
                            localStorage.removeItem("ashoka_qr_base_url");
                          } catch {}
                        }}
                        className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                  <input
                    value={baseUrlOverride}
                    onChange={(e) => {
                      setBaseUrlOverride(e.target.value);
                      try {
                        localStorage.setItem("ashoka_qr_base_url", e.target.value);
                      } catch {}
                    }}
                    placeholder="https://ashokahotel.com or http://192.168.1.50:3000"
                    className="input input-bordered input-sm w-full font-mono text-xs bg-base-100"
                  />
                  <p className="text-[11px] font-mono text-base-content/60 break-all pt-0.5">
                    <strong>Full QR URL:</strong> {buildMenuUrl(effectiveBaseUrl, selected.type, selected.code)}
                  </p>
                </div>

                {/* Download buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={downloadQR}
                    disabled={!qrDataUrl || generating}
                    className="btn btn-primary gap-2"
                  >
                    <Download size={16} /> Download PNG
                  </button>
                  <button
                    onClick={downloadPrintCard}
                    disabled={!qrDataUrl || generating}
                    className="btn btn-outline btn-primary gap-2"
                  >
                    <Download size={16} /> Print Card
                  </button>
                </div>

                {/* Print card settings + preview */}
                {qrDataUrl && !generating && (
                  <div className="w-full pt-2 space-y-4">
                    <p className="text-xs text-base-content/40 uppercase tracking-wider text-center">
                      Print Card Preview
                    </p>

                    {/* QR Code & Logo controls */}
                    <div className="space-y-2 px-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-base-content/50 whitespace-nowrap w-16">
                          QR size
                        </span>
                        <input
                          type="range"
                          min={100}
                          max={400}
                          step={4}
                          value={qrSize}
                          onChange={(e) =>
                            setQrSize(Number(e.target.value))
                          }
                          className="range range-xs range-primary flex-1"
                        />
                        <span className="text-xs font-mono text-base-content/50 w-12 text-right">
                          {qrSize}px
                        </span>
                      </div>

                      {branding?.logoUrl && (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-base-content/50 whitespace-nowrap w-16">
                              Logo size
                            </span>
                            <input
                              type="range"
                              min={40}
                              max={800}
                              step={4}
                              value={logoSize}
                              onChange={(e) =>
                                setLogoSize(Number(e.target.value))
                              }
                              className="range range-xs range-primary flex-1"
                            />
                            <span className="text-xs font-mono text-base-content/50 w-12 text-right">
                              {logoSize}px
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-base-content/50 whitespace-nowrap w-16">
                              Logo top
                            </span>
                            <input
                              type="range"
                              min={-300}
                              max={200}
                              step={2}
                              value={logoY}
                              onChange={(e) => setLogoY(Number(e.target.value))}
                              className="range range-xs range-primary flex-1"
                            />
                            <span className="text-xs font-mono text-base-content/50 w-12 text-right">
                              {logoY}px
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Card size presets */}
                    <div className="px-2">
                      <p className="text-xs text-base-content/40 uppercase tracking-wider mb-2">
                        Card Size
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {PRESETS.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => {
                              setPresetLabel(p.label);
                              if (p.label !== "Custom") {
                                setCardW(p.w);
                                setCardH(p.h);
                              } else {
                                setCardW(customW);
                                setCardH(customH);
                              }
                            }}
                            className={`btn btn-xs ${presetLabel === p.label ? "btn-primary" : "btn-ghost"}`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {presetLabel === "Custom" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-base-content/50">
                            W
                          </span>
                          <input
                            type="number"
                            min={200}
                            max={2000}
                            value={customW}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setCustomW(v);
                              setCardW(v);
                            }}
                            className="input input-xs input-bordered w-20"
                          />
                          <span className="text-xs text-base-content/50">
                            H
                          </span>
                          <input
                            type="number"
                            min={200}
                            max={2000}
                            value={customH}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setCustomH(v);
                              setCardH(v);
                            }}
                            className="input input-xs input-bordered w-20"
                          />
                          <span className="text-xs text-base-content/40">
                            px
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Template picker */}
                    <div className="px-2">
                      <p className="text-xs text-base-content/40 uppercase tracking-wider mb-2">
                        Template
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTemplate(t.id)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${template === t.id ? "border-primary scale-[1.03] shadow-lg" : "border-base-300 opacity-70 hover:opacity-100"}`}
                            style={{ background: t.bg, padding: "8px 4px 6px" }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 99,
                                background: t.accent,
                                margin: "0 auto 4px",
                              }}
                            />
                            <p
                              style={{
                                fontFamily: "serif",
                                fontSize: 11,
                                fontWeight: 700,
                                color: t.accent,
                                margin: 0,
                                letterSpacing: 1,
                              }}
                            >
                              MENU
                            </p>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                background: "#fff",
                                border: `1.5px solid ${t.accent}`,
                                borderRadius: 4,
                                margin: "4px auto 0",
                              }}
                            />
                            <p
                              style={{
                                fontFamily: "sans-serif",
                                fontSize: 8,
                                color: t.textColor,
                                margin: "3px 0 0",
                                opacity: 0.8,
                              }}
                            >
                              {t.label}
                            </p>
                            {template === t.id && (
                              <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                                <svg
                                  width="7"
                                  height="7"
                                  viewBox="0 0 7 7"
                                  fill="none"
                                >
                                  <polyline
                                    points="1,3.5 2.8,5.5 6,1.5"
                                    stroke="#fff"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scaled-down live preview */}
                    <div className="flex justify-center">
                      {(() => {
                        const previewW = 222;
                        const previewScale = previewW / cardW;
                        const previewH = Math.round(cardH * previewScale);
                        return (
                          <div
                            style={{
                              width: previewW,
                              height: previewH,
                              overflow: "hidden",
                              borderRadius: 12,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                            }}
                          >
                            <div
                              style={{
                                transform: `scale(${previewScale})`,
                                transformOrigin: "top left",
                                width: cardW,
                                height: cardH,
                              }}
                            >
                              {template === "midnight" ? (
                                <PrintCardMidnight {...sharedCardProps} />
                              ) : template === "blush" ? (
                                <PrintCardBlush {...sharedCardProps} />
                              ) : template === "champagne" ? (
                                <PrintCardChampagne {...sharedCardProps} />
                              ) : template === "noir" ? (
                                <PrintCardNoir {...sharedCardProps} />
                              ) : (
                                <PrintCardIvory {...sharedCardProps} />
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="text-center text-base-content/30">
              <QrCode size={48} className="mx-auto mb-3" />
              <p>Select a location to generate QR</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden full-size card for html-to-image capture */}
      <div
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {qrDataUrl &&
          selected &&
          (template === "midnight" ? (
            <PrintCardMidnight {...sharedCardProps} cardRef={printCardRef} />
          ) : template === "blush" ? (
            <PrintCardBlush {...sharedCardProps} cardRef={printCardRef} />
          ) : template === "champagne" ? (
            <PrintCardChampagne {...sharedCardProps} cardRef={printCardRef} />
          ) : template === "noir" ? (
            <PrintCardNoir {...sharedCardProps} cardRef={printCardRef} />
          ) : (
            <PrintCardIvory {...sharedCardProps} cardRef={printCardRef} />
          ))}
      </div>
    </div>
  );
}
