"use client";

import { useState } from "react";
import { ChevronsUpDown, Check, Search, Plus } from "lucide-react";

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Lightweight searchable picker (combobox) for choosing an ingredient/option
 * from a long list. Type to filter, click to select, or add custom on the fly.
 */
export default function ItemCombo({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className = "",
  allowCustom = false,
  onAddCustom,
}: {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowCustom?: boolean;
  onAddCustom?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === value);
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  const handleAddCustom = () => {
    if (!q.trim()) return;
    if (onAddCustom) {
      onAddCustom(q.trim());
    } else {
      onChange(q.trim());
    }
    setOpen(false);
    setQ("");
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input input-bordered input-sm w-full flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? "truncate" : "text-base-content/40 truncate"}>
          {selected ? selected.label : value || placeholder}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setQ("");
            }}
          />
          <div className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            <div className="sticky top-0 bg-base-100 border-b border-base-300 flex items-center gap-1.5 px-2">
              <Search className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search or type new item…"
                className="w-full py-2 text-sm bg-transparent focus:outline-none"
              />
            </div>
            {allowCustom && q.trim() && !options.some((o) => o.label.toLowerCase() === q.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={handleAddCustom}
                className="w-full text-left px-3 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 flex items-center gap-1.5 border-b border-base-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add &quot;{q.trim()}&quot; as new item</span>
              </button>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQ("");
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-base-200 flex items-center justify-between gap-2"
              >
                <span className="truncate">{o.label}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {o.hint && (
                    <span className="text-xs text-base-content/40">{o.hint}</span>
                  )}
                  {o.value === value && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </span>
              </button>
            ))}
            {filtered.length === 0 && !allowCustom && (
              <p className="px-3 py-3 text-sm text-base-content/40">No match</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
