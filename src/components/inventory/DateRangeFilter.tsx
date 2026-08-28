"use client";

export interface DateRange {
  from: string; // yyyy-mm-dd or ""
  to: string; // yyyy-mm-dd or ""
  preset: string;
}

const PRESETS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All", days: -1 },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Quick date-range chips + optional custom from/to inputs. */
export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const applyPreset = (key: string, days: number) => {
    if (days === -1) return onChange({ from: "", to: "", preset: "all" });
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ from: ymd(from), to: ymd(to), preset: key });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key, p.days)}
          className={`btn btn-xs ${value.preset === p.key ? "btn-primary" : "btn-ghost border border-base-300"}`}
        >
          {p.label}
        </button>
      ))}
      <input
        type="date"
        value={value.from}
        onChange={(e) =>
          onChange({ ...value, from: e.target.value, preset: "custom" })
        }
        className="input input-bordered input-xs"
        aria-label="From date"
      />
      <span className="text-xs text-base-content/40">to</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) =>
          onChange({ ...value, to: e.target.value, preset: "custom" })
        }
        className="input input-bordered input-xs"
        aria-label="To date"
      />
    </div>
  );
}
