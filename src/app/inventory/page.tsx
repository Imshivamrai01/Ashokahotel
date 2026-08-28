"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  Boxes,
  AlertTriangle,
  PackageX,
  IndianRupee,
  CheckCircle2,
  Circle,
  BookOpen,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { formatPrice } from "@/lib/utils";
import { displayQty, type MeasureType } from "@/lib/inventory/units";

interface Summary {
  itemCount: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  recipeCount: number;
  hasReceivedStock: boolean;
}
interface LowRow {
  _id: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  stockUnit: string;
}
interface ExpRow {
  _id: string;
  name: string;
  currentStock: number;
  stockUnit: string;
  daysLeft: number | null;
  expired: boolean;
}

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed");
  return r.json();
}

export default function InventoryDashboard() {
  const { data: summary } = useQuery<Summary>({
    queryKey: ["inv-summary"],
    queryFn: () => getJSON("/api/inventory/reports?type=summary"),
  });
  const { data: low } = useQuery<{ rows: LowRow[] }>({
    queryKey: ["inv-low"],
    queryFn: () => getJSON("/api/inventory/reports?type=low_stock"),
  });
  const { data: missing } = useQuery<{ rows: { _id: string; name: string }[] }>({
    queryKey: ["inv-missing"],
    queryFn: () => getJSON("/api/inventory/reports?type=missing_recipes"),
  });
  const push = usePushSubscription();
  const qc = useQueryClient();
  const { data: expiring } = useQuery<{ rows: ExpRow[] }>({
    queryKey: ["inv-expiring"],
    queryFn: () => getJSON("/api/inventory/reports?type=expiring"),
  });
  const { data: negative } = useQuery<{ rows: LowRow[] }>({
    queryKey: ["inv-negative"],
    queryFn: () => getJSON("/api/inventory/reports?type=negative"),
  });

  const writeOff = useMutation({
    mutationFn: async (row: ExpRow) => {
      const res = await fetch("/api/inventory/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [
            {
              inventoryItemId: row._id,
              qty: row.currentStock,
              unit: row.stockUnit,
              reason: "expiry",
            },
          ],
          notes: "Expired prep write-off",
        }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Written off");
      qc.invalidateQueries({ queryKey: ["inv-expiring"] });
      qc.invalidateQueries({ queryKey: ["inv-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const steps = [
    { label: "Add ingredients", done: (summary?.itemCount ?? 0) > 0, href: "/inventory/items" },
    { label: "Set recipes for dishes", done: (summary?.recipeCount ?? 0) > 0, href: "/inventory/recipes" },
    { label: "Receive opening stock", done: !!summary?.hasReceivedStock, href: "/inventory/stock-in" },
  ];
  const allDone = steps.every((s) => s.done);

  const cards = [
    {
      label: "Stock Value",
      value: summary ? formatPrice(summary.stockValue) : "—",
      icon: IndianRupee,
      tone: "text-success",
    },
    {
      label: "Ingredients",
      value: summary?.itemCount ?? "—",
      icon: Boxes,
      tone: "text-primary",
    },
    {
      label: "Low Stock",
      value: summary?.lowStock ?? "—",
      icon: AlertTriangle,
      tone: "text-warning",
    },
    {
      label: "Out of Stock",
      value: summary?.outOfStock ?? "—",
      icon: PackageX,
      tone: "text-error",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Your stock at a glance — what you have and what to buy."
        icon={Boxes}
        action={
          push.permission === "unsupported" ? null : push.permission ===
            "granted" ? (
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Bell className="w-4 h-4" /> Alerts on
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => push.enable()}
            >
              <Bell className="w-4 h-4" /> Enable alerts
            </Button>
          )
        }
      />

      <PanelHelp
        id="dashboard"
        title="Getting started"
        steps={[
          "Add your ingredients (Ingredients tab).",
          "Set a recipe for each dish so selling it drops stock (Recipes tab).",
          "Record what you buy with Stock In, log spoilage in Wastage.",
          "Do a Stock Check now and then to keep numbers accurate.",
        ]}
      />

      {!allDone && (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold mb-2">Setup checklist</p>
          <div className="flex flex-col gap-1.5">
            {steps.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                {s.done ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Circle className="w-4 h-4 text-base-content/30" />
                )}
                <span className={s.done ? "line-through text-base-content/40" : ""}>
                  {s.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {missing && missing.rows.length > 0 && (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-warning" /> Dishes set to deduct
            stock but missing a recipe
          </p>
          <p className="text-xs text-base-content/60 mb-2">
            These won&apos;t lower stock when sold until you add a recipe.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.rows.map((m) => (
              <Link
                key={m._id}
                href="/inventory/recipes"
                className="badge badge-warning badge-sm"
              >
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {negative && negative.rows.length > 0 && (
        <div className="mb-4 rounded-2xl border border-error/40 bg-error/10 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2">
            <PackageX className="w-4 h-4 text-error" /> Below zero — fix these
          </p>
          <p className="text-xs text-base-content/60 mb-2">
            Stock went negative (likely a missing recipe or uncounted use). Do a
            stock check or correction.
          </p>
          <ul className="flex flex-col gap-1">
            {negative.rows.map((r) => (
              <li key={r._id} className="flex items-center justify-between text-sm">
                <span>{r.name}</span>
                <span className="text-error font-medium tabular-nums">
                  {displayQty(r.currentStock, guessType(r.stockUnit))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expiring && expiring.rows.length > 0 && (
        <div className="mb-4 rounded-2xl border border-error/30 bg-error/5 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-error" /> Prep expiring / expired
          </p>
          <ul className="flex flex-col gap-1.5">
            {expiring.rows.map((r) => (
              <li key={r._id} className="flex items-center justify-between text-sm">
                <span>
                  {r.name}{" "}
                  <span className={r.expired ? "text-error" : "text-warning"}>
                    ({r.expired
                      ? "expired"
                      : r.daysLeft == null
                        ? "no date"
                        : `${r.daysLeft}d left`})
                  </span>
                </span>
                <button
                  onClick={() => writeOff.mutate(r)}
                  disabled={writeOff.isPending}
                  className="btn btn-error btn-xs"
                >
                  Write off
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-base-200 border border-base-300/60 p-4"
          >
            <c.icon className={`w-5 h-5 ${c.tone} mb-2`} />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-base-content/50">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-base-300/60 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Buy soon (low
            stock)
          </h2>
          <Link href="/inventory/stock-in" className="btn btn-primary btn-xs">
            Stock In
          </Link>
        </div>
        {low && low.rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-base-content/40">
            Nothing low right now. 👍
          </p>
        ) : (
          <ul className="divide-y divide-base-300/50">
            {low?.rows.map((r) => (
              <li
                key={r._id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span>{r.name}</span>
                <span className="text-warning font-medium">
                  {displayQty(r.currentStock, guessType(r.stockUnit))} left
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function guessType(unit: string): MeasureType {
  if (unit === "ml") return "volume";
  if (unit === "pcs") return "count";
  return "weight";
}
