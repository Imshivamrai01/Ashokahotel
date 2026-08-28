"use client";

import type { OrderStatus } from "@/types";
import { pillCls } from "@/components/ui/Pill";

const FILTERS: {
  label: string;
  shortLabel: string;
  value: OrderStatus | "all";
}[] = [
  { label: "All", shortLabel: "All", value: "all" },
  { label: "Pending", shortLabel: "Pend.", value: "pending" },
  { label: "Preparing", shortLabel: "Prep.", value: "preparing" },
  { label: "Partially Ready", shortLabel: "Part.", value: "partially_ready" },
  { label: "Ready", shortLabel: "Ready", value: "ready" },
];

const FILTER_STYLES: Record<string, string> = {
  all: "btn-neutral",
  pending: "btn-error",
  preparing: "btn-warning",
  partially_ready: "btn-info",
  ready: "btn-success",
};

interface KDSFiltersProps {
  active: OrderStatus | "all";
  onChange: (f: OrderStatus | "all") => void;
  counts: Partial<Record<OrderStatus | "all", number>>;
}

export default function KDSFilters({
  active,
  onChange,
  counts,
}: KDSFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const count = counts[f.value] ?? 0;
        const isActive = active === f.value;
        const style = FILTER_STYLES[f.value] ?? "btn-neutral";
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`btn btn-xs sm:btn-sm gap-1 ${isActive ? style : "btn-ghost"}`}
          >
            <span className="hidden sm:inline">{f.label}</span>
            <span className="sm:hidden">{f.shortLabel}</span>
            {count > 0 && (
              <span className={pillCls(isActive ? "neutral" : "outline")}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
