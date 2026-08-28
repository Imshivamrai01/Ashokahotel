"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

/**
 * Dismissible "how this works" callout shown at the top of every inventory
 * panel. Dismiss state is saved per-user in localStorage (keyed by `id`) so it
 * stops nagging but can be reopened from the "?" button. See INVENTORY-PLAN §0.2.
 */
export default function PanelHelp({
  id,
  title,
  steps,
}: {
  id: string;
  title: string;
  steps: string[];
}) {
  const key = `inv-help-dismissed:${id}`;
  // Lazy init from localStorage (client-only component) avoids a setState-in-effect.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(key) !== "1";
  });

  const dismiss = () => {
    localStorage.setItem(key, "1");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-base-content/50 hover:text-primary mb-3"
      >
        <Info className="w-3.5 h-3.5" /> How this works
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-base-content">{title}</p>
          <ul className="mt-1.5 space-y-1 text-xs text-base-content/70 list-disc pl-4">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss help"
          className="shrink-0 text-base-content/40 hover:text-base-content"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
