/**
 * Pill — a clean, consistent badge/tag component.
 * Replaces all DaisyUI `badge badge-*` usage across the app.
 *
 * Usage:
 *   <Pill variant="success">Ready</Pill>
 *   <span className={pillCls("warning")}>Pending</span>  // for motion.span etc.
 */

import { cn } from "@/lib/utils";

export const PILL_VARIANTS = {
  info: "bg-sky-50 text-sky-800 border-sky-300 font-bold",
  primary: "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold",
  accent: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
  warning: "bg-orange-50 text-orange-900 border-orange-300 font-bold",
  secondary: "bg-purple-50 text-purple-900 border-purple-300 font-bold",
  success: "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold",
  error: "bg-rose-50 text-rose-900 border-rose-300 font-bold",
  ghost: "bg-slate-100 text-slate-700 border-slate-300 font-medium",
  neutral: "bg-slate-100 text-slate-800 border-slate-300 font-bold",
  outline: "bg-white text-slate-700 border-slate-300 font-semibold",
} as const;

export type PillVariant = keyof typeof PILL_VARIANTS;

const BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border leading-none";

/** Returns the full className string — use this on non-span elements (motion.span, select, etc.) */
export function pillCls(variant: PillVariant = "ghost", extra?: string) {
  return cn(BASE, PILL_VARIANTS[variant], extra);
}

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
}

/** Pill component — drop-in replacement for <span className="badge badge-*"> */
export function Pill({
  variant = "ghost",
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span className={pillCls(variant, className)} {...props}>
      {children}
    </span>
  );
}
