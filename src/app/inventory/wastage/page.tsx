"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import { Trash2, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import Paginator from "@/components/inventory/Paginator";
import DateRangeFilter, {
  type DateRange,
} from "@/components/inventory/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ItemCombo from "@/components/inventory/ItemCombo";
import { exportXlsx } from "@/lib/inventory/sheet";
import { UNITS_BY_TYPE, type MeasureType } from "@/lib/inventory/units";

interface WEntry {
  _id: string;
  lines: { name: string; qty: number; unit: string; reason: string; costValue: number }[];
  totalValue: number;
  wastedAt: string;
}
const HIST_PAGE = 10;

interface InvItem {
  _id: string;
  name: string;
  measureType: MeasureType;
}
interface Line {
  inventoryItemId: string;
  customItemName?: string;
  qty: number;
  unit: string;
  reason: string;
}
const REASONS = [
  "spoilage",
  "spillage",
  "expiry",
  "overproduction",
  "staff_meal",
  "training",
  "other",
];

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function WastagePage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });
  const { data: history = [] } = useQuery<WEntry[]>({
    queryKey: ["inv-wastage"],
    queryFn: () => getJSON("/api/inventory/wastage"),
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [range, setRange] = useState<DateRange>({ from: "", to: "", preset: "all" });
  const [page, setPage] = useState(1);

  const histView = useMemo(() => {
    let r = history;
    if (range.from) r = r.filter((e) => e.wastedAt.slice(0, 10) >= range.from);
    if (range.to) r = r.filter((e) => e.wastedAt.slice(0, 10) <= range.to);
    return r;
  }, [history, range]);
  const histPaged = histView.slice((page - 1) * HIST_PAGE, page * HIST_PAGE);

  const addLine = () => {
    const f = items[0];
    setLines([
      ...lines,
      {
        inventoryItemId: f?._id || "custom",
        customItemName: !f ? "New Item" : undefined,
        qty: 0,
        unit: f ? UNITS_BY_TYPE[f.measureType][0] : "pcs",
        reason: "spoilage",
      },
    ]);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Wastage recorded");
      setLines([]);
      qc.invalidateQueries({ queryKey: ["inv-items"] });
      qc.invalidateQueries({ queryKey: ["inv-wastage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Wastage"
        subtitle="Record stock that was spoiled, spilled, or thrown away."
        icon={Trash2}
      />
      <PanelHelp
        id="wastage"
        title="Logging wastage"
        steps={[
          "Add the item, how much was wasted, and why.",
          "Save — stock goes down and the loss shows in reports.",
          "Logging waste keeps your stock numbers honest.",
        ]}
      />

      <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4 space-y-3">
        {lines.map((l, i) => {
          const item = items.find((x) => x._id === l.inventoryItemId);
          const isCustom = l.inventoryItemId === "custom" || (!item && !!l.customItemName);
          const units = item ? UNITS_BY_TYPE[item.measureType] : ["pcs", "kg", "g", "ltr", "ml", "pack"];
          return (
            <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <ItemCombo
                className="flex-1 min-w-[180px]"
                allowCustom
                value={isCustom ? (l.customItemName || "") : l.inventoryItemId}
                onChange={(v) => {
                  const it = items.find((x) => x._id === v);
                  const n = [...lines];
                  if (it) {
                    n[i] = {
                      ...l,
                      inventoryItemId: it._id,
                      customItemName: undefined,
                      unit: UNITS_BY_TYPE[it.measureType][0],
                    };
                  } else {
                    n[i] = {
                      ...l,
                      inventoryItemId: "custom",
                      customItemName: v,
                      unit: l.unit || "pcs",
                    };
                  }
                  setLines(n);
                }}
                onAddCustom={(name) => {
                  const n = [...lines];
                  n[i] = {
                    ...l,
                    inventoryItemId: "custom",
                    customItemName: name,
                    unit: l.unit || "pcs",
                  };
                  setLines(n);
                }}
                options={items.map((it) => ({ value: it._id, label: it.name }))}
              />
              <Input
                type="number"
                className="w-24"
                placeholder="qty"
                value={l.qty || ""}
                onChange={(e) => {
                  const n = [...lines];
                  n[i] = { ...l, qty: Number(e.target.value) };
                  setLines(n);
                }}
              />
              <select
                className="select select-bordered select-sm w-24"
                value={l.unit}
                onChange={(e) => {
                  const n = [...lines];
                  n[i] = { ...l, unit: e.target.value };
                  setLines(n);
                }}
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <select
                className="select select-bordered select-sm w-32"
                value={l.reason}
                onChange={(e) => {
                  const n = [...lines];
                  n[i] = { ...l, reason: e.target.value };
                  setLines(n);
                }}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
              >
                <Trash2 className="w-3.5 h-3.5 text-error" />
              </Button>
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="gap-2" onClick={addLine}>
          <Plus className="w-4 h-4" /> Add item
        </Button>
        <div className="flex justify-end pt-2 border-t border-base-300/60">
          <Button
            size="sm"
            disabled={lines.length === 0 || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Saving…" : "Record Wastage"}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-base-content/70">
            Wastage history
          </h2>
          <div className="flex items-center gap-2">
            <DateRangeFilter
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={histView.length === 0}
              onClick={() =>
                exportXlsx(
                  histView.flatMap((e) =>
                    e.lines.map((l) => ({
                      date: format(new Date(e.wastedAt), "yyyy-MM-dd HH:mm"),
                      item: l.name,
                      qty: l.qty,
                      unit: l.unit,
                      reason: l.reason,
                      value: l.costValue,
                    })),
                  ),
                  "wastage.xlsx",
                )
              }
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>
        <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
          {histPaged.length === 0 ? (
            <p className="p-6 text-center text-sm text-base-content/40">
              No wastage recorded for this range.
            </p>
          ) : (
            <ul className="divide-y divide-base-300/50">
              {histPaged.map((e) => (
                <li key={e._id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs text-base-content/50">
                      {format(new Date(e.wastedAt), "dd MMM HH:mm")}
                    </span>
                    <span className="font-medium text-error">
                      ₹{e.totalValue.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-xs text-base-content/60">
                    {e.lines
                      .map((l) => `${l.name} ${l.qty}${l.unit} (${l.reason})`)
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Paginator
            page={page}
            pageSize={HIST_PAGE}
            total={histView.length}
            onPage={setPage}
          />
        </div>
      </div>
    </div>
  );
}
