import type { CSSProperties } from "react";
import type { IBranding } from "@/types";

/** Fallback accent when branding has no colour set (legacy gold). */
export const DEFAULT_MENU_ACCENT = "#D97706";

/** Pick readable on-accent text (black/white) via WCAG relative luminance. */
function onAccentColor(hex: string): string {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return "#0f0f0f";
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(full.slice(0, 2), 16));
  const g = toLin(parseInt(full.slice(2, 4), 16));
  const b = toLin(parseInt(full.slice(4, 6), 16));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.45 ? "#0f0f0f" : "#ffffff";
}

/** `color-mix` alpha helper — works for any CSS colour, unlike 8-digit hex. */
const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/**
 * Resolve the menu accent from branding.
 * Priority: accentColor → primaryColor → legacy gold default.
 */
export function resolveMenuAccent(branding: IBranding | null): string {
  return branding?.accentColor || branding?.primaryColor || DEFAULT_MENU_ACCENT;
}

/**
 * Build the menu CSS custom properties from branding. Spread onto the menu
 * root element so the whole subtree (list, cards, carts, overlays) inherits a
 * single source of truth. Also overrides DaisyUI/shadcn `--color-primary` /
 * `--primary` so component utilities (`text-primary`, `bg-primary`) brand too.
 */
export function menuThemeVars(
  branding: IBranding | null,
): CSSProperties & Record<string, string> {
  const accent = resolveMenuAccent(branding);
  const onAccent = onAccentColor(accent);

  return {
    // ── Brand accent ────────────────────────────────────────────────
    "--menu-accent": accent,
    "--menu-on-accent": onAccent,
    "--menu-accent-soft": mix(accent, 12),
    "--menu-accent-border": mix(accent, 28),
    "--menu-accent-dim": mix(accent, 65),
    "--menu-accent-glow": mix(accent, 35),

    // ── Luxury Light Surfaces (Royal Champagne Atelier) ─────────────
    "--menu-bg": `radial-gradient(140% 380px at 50% 0%, ${mix(accent, 8)} 0%, transparent 100%), linear-gradient(180deg, #FAF9F6 0%, #F5F3EF 50%, #ECE8E1 100%)`,
    "--menu-bg-solid": "#FAF9F6",
    "--menu-bg-deep": "#F3F0E9",
    "--menu-page-bg": `radial-gradient(90% 60% at 0% 0%, ${mix(accent, 6)} 0%, transparent 55%), linear-gradient(165deg, #FFFFFF 0%, #FAF8F5 42%, #F5F1EB 100%)`,
    "--menu-surface": "rgba(255,255,255,0.92)",
    "--menu-surface-2": "rgba(245,241,235,0.85)",
    "--menu-border": "rgba(217,119,6,0.18)",

    // ── Text (contrast-tuned for light canvas → crisp obsidian) ───────
    "--menu-text": "#0F172A",
    "--menu-text-muted": "#475569",
    "--menu-text-faint": "#64748B",

    // ── Override DaisyUI + shadcn primary so components brand too ────
    "--color-primary": accent,
    "--color-primary-content": onAccent,
    "--primary": accent,
    "--primary-foreground": onAccent,
  };
}
