"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Download, X } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import Paginator from "@/components/inventory/Paginator";
import DateRangeFilter, {
  type DateRange,
} from "@/components/inventory/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/Pill";
import { exportXlsx } from "@/lib/inventory/sheet";

interface Movement {
  _id: string;
  itemName: string;
  stockUnit: string;
  type: string;
  qtyBase: number;
  unitCost: number;
  balanceAfter: number;
  reason?: string;
  createdAt: string;
}
const getJSON = (u: string) => fetch(u).then((r) => r.json());
const PAGE_SIZE = 25;

const TYPE_LABEL: Record<string, string> = {
  purchase_in: "Stock In",
  sale_out: "Sold",
  wastage_out: "Wastage",
  adjustment: "Adjustment",
  production_in: "Produced",
  production_out: "Used (prep)",
  reversal: "Restored",
};
const TYPES = ["all", ...Object.keys(TYPE_LABEL)];

export default function LedgerPage() {
  return (
    <Suspense fallback={null}>
      <LedgerInner />
    </Suspense>
  );
}

function LedgerInner() {
  const sp = useSearchParams();
  const itemId = sp.get("item") ?? "";
  const [range, setRange] = useState<DateRange>({
    from: "",
    to: "",
    preset: "all",
  });
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (type !== "all") params.set("type", type);
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  if (itemId) params.set("itemId", itemId);

  const { data } = useQuery<{ rows: Movement[]; total: number }>({
    queryKey: ["inv-movements", type, range.from, range.to, page, itemId],
    queryFn: () => getJSON(`/api/inventory/movements?${params.toString()}`),
  });
  const rows = data?.rows ?? [];
  const focusName = itemId ? (rows[0]?.itemName ?? "this item") : null;

  return (
    <div>
      <PageHeader
        title="Stock Ledger"
        subtitle="Every stock change, newest first — the full audit trail."
        icon={ScrollText}
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={rows.length === 0}
            onClick={() =>
              exportXlsx(
                rows.map((m) => ({
                  date: format(new Date(m.createdAt), "yyyy-MM-dd HH:mm"),
                  item: m.itemName,
                  type: TYPE_LABEL[m.type] ?? m.type,
                  change: m.qtyBase,
                  unit: m.stockUnit,
                  balance: m.balanceAfter,
                  note: m.reason ?? "",
                })),
                "stock-ledger.xlsx",
              )
            }
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />
      <PanelHelp
        id="ledger"
        title="Stock ledger"
        steps={[
          "Complete history of every stock movement.",
          "Filter by date range or type; export to Excel any time.",
          "Each row: what happened, amount (+in / −out), and the new balance.",
        ]}
      />

      {itemId && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-sm">
            Showing history for <strong>{focusName}</strong>
          </span>
          <Link href="/inventory/ledger" className="btn btn-ghost btn-xs gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <DateRangeFilter
          value={range}
          onChange={(r) => {
            setRange(r);
            setPage(1);
          }}
        />
        <select
          className="select select-bordered select-sm"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : (TYPE_LABEL[t] ?? t)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm min-w-[720px]">
            <thead>
              <tr className="text-xs uppercase text-base-content/40">
                <th>When</th>
                <th>Item</th>
                <th>Type</th>
                <th>Change</th>
                <th>Balance</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m._id} className="border-b border-base-300/50">
                  <td className="text-xs text-base-content/50 whitespace-nowrap">
                    {format(new Date(m.createdAt), "dd MMM HH:mm")}
                  </td>
                  <td className="text-sm font-medium">{m.itemName}</td>
                  <td>
                    <Pill variant={m.qtyBase >= 0 ? "success" : "warning"}>
                      {TYPE_LABEL[m.type] ?? m.type}
                    </Pill>
                  </td>
                  <td
                    className={`font-mono text-sm ${m.qtyBase >= 0 ? "text-success" : "text-error"}`}
                  >
                    {m.qtyBase >= 0 ? "+" : ""}
                    {m.qtyBase} {m.stockUnit}
                  </td>
                  <td className="font-mono text-sm">{m.balanceAfter}</td>
                  <td className="text-xs text-base-content/50">{m.reason ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-base-content/40">
                    No movements for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginator
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.total ?? 0}
          onPage={setPage}
        />
      </div>
    </div>
  );
}
