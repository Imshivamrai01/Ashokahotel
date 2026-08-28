"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { exportXlsx } from "@/lib/inventory/sheet";
import { formatPrice } from "@/lib/utils";

type Tab =
  | "stock_value"
  | "low_stock"
  | "consumption"
  | "wastage"
  | "variance"
  | "supplier_ledger";
const TABS: { key: Tab; label: string }[] = [
  { key: "stock_value", label: "Stock Value" },
  { key: "low_stock", label: "Low Stock" },
  { key: "consumption", label: "Consumption (30d)" },
  { key: "wastage", label: "Wastage (30d)" },
  { key: "variance", label: "Variance (30d)" },
  { key: "supplier_ledger", label: "Suppliers (30d)" },
];

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]).filter((k) => k !== "_id");
  const head = keys.join(",");
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          const s = v == null ? "" : String(v);
          return s.includes(",") ? `"${s}"` : s;
        })
        .join(","),
    )
    .join("\n");
  return `${head}\n${body}`;
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

const DAY_OPTS = [
  { d: 7, label: "7d" },
  { d: 30, label: "30d" },
  { d: 90, label: "90d" },
  { d: 365, label: "1y" },
];
const WINDOWED = new Set(["consumption", "wastage", "variance", "supplier_ledger"]);

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("stock_value");
  const [days, setDays] = useState(30);
  const { data } = useQuery<{
    rows?: Record<string, unknown>[];
    total?: number;
  }>({
    queryKey: ["inv-report", tab, days],
    queryFn: () => getJSON(`/api/inventory/reports?type=${tab}&days=${days}`),
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Stock value, what's low, what you're using, and waste."
        icon={BarChart3}
      />
      <PanelHelp
        id="reports"
        title="Reading reports"
        steps={[
          "Stock Value: how much money is sitting in your store.",
          "Low Stock: what to buy soon. Consumption: what sells fastest.",
          "Wastage: where you're losing money to waste.",
        ]}
      />

      <div className="flex gap-2 mb-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-ghost border border-base-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {WINDOWED.has(tab) && (
        <div className="flex gap-1.5 mb-4 items-center">
          <span className="text-xs text-base-content/50 mr-1">Period:</span>
          {DAY_OPTS.map((o) => (
            <button
              key={o.d}
              onClick={() => setDays(o.d)}
              className={`btn btn-xs ${days === o.d ? "btn-primary" : "btn-ghost border border-base-300"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        {data?.total != null ? (
          <p className="text-lg font-bold">Total: {formatPrice(data.total)}</p>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!data?.rows || data.rows.length === 0}
            onClick={() => {
              const csv = toCSV(data?.rows ?? []);
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${tab}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!data?.rows || data.rows.length === 0}
            onClick={() =>
              exportXlsx(
                (data?.rows ?? []).map((r) => {
                  const { _id, ...rest } = r as Record<string, unknown>;
                  void _id;
                  return rest;
                }),
                `${tab}.xlsx`,
              )
            }
          >
            <Download className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-x-auto">
        <table className="table table-sm min-w-[480px]">
          <tbody>
            {(data?.rows ?? []).map((r, i) => (
              <tr key={i} className="border-b border-base-300/50 text-sm">
                {Object.entries(r)
                  .filter(([k]) => k !== "_id")
                  .map(([k, v]) => (
                    <td key={k}>
                      {typeof v === "number"
                        ? k.toLowerCase().includes("value") ||
                          k.toLowerCase().includes("cost")
                          ? formatPrice(v)
                          : Math.round(v * 100) / 100
                        : String(v)}
                    </td>
                  ))}
              </tr>
            ))}
            {(!data?.rows || data.rows.length === 0) && (
              <tr>
                <td className="text-center py-8 text-base-content/40">
                  Nothing to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
