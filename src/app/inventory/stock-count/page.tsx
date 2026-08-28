"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CountLine {
  inventoryItemId: string;
  name: string;
  unit: string;
  systemQty: number;
  countedQty: number;
}
interface Count {
  _id: string;
  countNumber: string;
  status: string;
  lines: CountLine[];
}
const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function StockCountPage() {
  const qc = useQueryClient();
  const { data: counts = [] } = useQuery<Count[]>({
    queryKey: ["inv-counts"],
    queryFn: () => getJSON("/api/inventory/stock-counts"),
  });
  const openCount = counts.find((c) => c.status === "open");

  const [counted, setCounted] = useState<Record<string, number>>({});

  const start = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/stock-counts", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Count started");
      qc.invalidateQueries({ queryKey: ["inv-counts"] });
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      if (!openCount) return;
      const lines = openCount.lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        countedQty:
          counted[l.inventoryItemId] != null
            ? counted[l.inventoryItemId]
            : l.systemQty,
      }));
      const res = await fetch(`/api/inventory/stock-counts/${openCount._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Count posted — stock corrected");
      setCounted({});
      qc.invalidateQueries({ queryKey: ["inv-counts"] });
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Stock Check"
        subtitle="Count what's physically there; we fix the numbers."
        icon={ClipboardCheck}
      />
      <PanelHelp
        id="stock-count"
        title="Doing a stock check"
        steps={[
          "Press Start — we list every item with its current number.",
          "Walk your store and type the real amount you counted.",
          "Press Post — stock is set to your counts and the difference is logged.",
        ]}
      />

      {!openCount ? (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-8 text-center">
          <p className="text-sm text-base-content/60 mb-3">
            No count in progress.
          </p>
          <Button size="sm" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? "Starting…" : "Start Stock Check"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/60 flex items-center justify-between">
            <span className="font-semibold text-sm">{openCount.countNumber}</span>
            <Button size="sm" disabled={post.isPending} onClick={() => post.mutate()}>
              {post.isPending ? "Posting…" : "Post Count"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm min-w-[520px]">
              <thead>
                <tr className="text-xs uppercase text-base-content/40">
                  <th>Item</th>
                  <th>System</th>
                  <th>Counted</th>
                </tr>
              </thead>
              <tbody>
                {openCount.lines.map((l) => (
                  <tr key={l.inventoryItemId} className="border-b border-base-300/50">
                    <td className="font-medium text-sm">{l.name}</td>
                    <td className="text-sm text-base-content/50">
                      {l.systemQty} {l.unit}
                    </td>
                    <td>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={l.systemQty}
                        onChange={(e) =>
                          setCounted({
                            ...counted,
                            [l.inventoryItemId]: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
