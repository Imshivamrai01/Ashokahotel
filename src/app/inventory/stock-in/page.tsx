"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ItemCombo from "@/components/inventory/ItemCombo";

interface Supplier {
  _id: string;
  name: string;
}
interface InvItem {
  _id: string;
  name: string;
  purchaseUnit: string;
}
interface Line {
  inventoryItemId: string;
  customItemName?: string;
  unit?: string;
  qtyReceived: number;
  rate: number;
}
interface GRN {
  _id: string;
  grnNumber: string;
  supplierName: string;
  total: number;
  receivedAt: string;
  lines: { name: string; qtyReceived: number; unit: string }[];
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function StockInPage() {
  const qc = useQueryClient();
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["inv-suppliers"],
    queryFn: () => getJSON("/api/inventory/suppliers"),
  });
  const { data: items = [] } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });
  const { data: grns = [] } = useQuery<GRN[]>({
    queryKey: ["inv-grns"],
    queryFn: () => getJSON("/api/inventory/grn"),
  });

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        inventoryItemId: items[0]?._id || "custom",
        customItemName: !items[0] ? "New Item" : undefined,
        unit: items[0]?.purchaseUnit || "pcs",
        qtyReceived: 0,
        rate: 0,
      },
    ]);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, lines }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Stock received");
      setLines([]);
      qc.invalidateQueries({ queryKey: ["inv-items"] });
      qc.invalidateQueries({ queryKey: ["inv-grns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = lines.reduce((s, l) => s + l.qtyReceived * l.rate, 0);

  return (
    <div>
      <PageHeader
        title="Stock In"
        subtitle="Add stock you received from a supplier."
        icon={PackagePlus}
      />
      <PanelHelp
        id="stock-in"
        title="Receiving stock"
        steps={[
          "Pick the supplier you bought from.",
          "Add each item, how much arrived, and the rate per unit.",
          "Save — stock goes up and average cost updates automatically.",
        ]}
      />

      <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Supplier</label>
          <select
            className="select select-bordered select-sm w-full mt-1"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">— Select supplier —</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => {
            const item = items.find((x) => x._id === l.inventoryItemId);
            const isCustom = l.inventoryItemId === "custom" || (!item && !!l.customItemName);
            return (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <ItemCombo
                  className="flex-1 min-w-[200px]"
                  allowCustom
                  value={isCustom ? (l.customItemName || "") : l.inventoryItemId}
                  onChange={(v) => {
                    const it = items.find((x) => x._id === v);
                    const n = [...lines];
                    if (it) {
                      n[i] = { ...l, inventoryItemId: it._id, customItemName: undefined, unit: it.purchaseUnit };
                    } else {
                      n[i] = { ...l, inventoryItemId: "custom", customItemName: v, unit: l.unit || "pcs" };
                    }
                    setLines(n);
                  }}
                  onAddCustom={(name) => {
                    const n = [...lines];
                    n[i] = { ...l, inventoryItemId: "custom", customItemName: name, unit: l.unit || "pcs" };
                    setLines(n);
                  }}
                  options={items.map((it) => ({ value: it._id, label: it.name }))}
                />
                {isCustom && (
                  <select
                    className="select select-bordered select-sm w-20"
                    value={l.unit || "pcs"}
                    onChange={(e) => {
                      const n = [...lines];
                      n[i] = { ...l, unit: e.target.value };
                      setLines(n);
                    }}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="ltr">ltr</option>
                    <option value="ml">ml</option>
                    <option value="pack">pack</option>
                  </select>
                )}
                <Input
                  type="number"
                  className="w-24"
                  placeholder={item?.purchaseUnit ?? l.unit ?? "qty"}
                  value={l.qtyReceived || ""}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i] = { ...l, qtyReceived: Number(e.target.value) };
                    setLines(n);
                  }}
                />
                <span className="text-xs text-base-content/50 w-8">
                  {item?.purchaseUnit ?? l.unit ?? "pcs"}
                </span>
                <Input
                  type="number"
                  className="w-24"
                  placeholder="₹/unit"
                  value={l.rate || ""}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i] = { ...l, rate: Number(e.target.value) };
                    setLines(n);
                  }}
                />
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
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-base-300/60">
          <span className="font-bold">Total ₹{total.toFixed(2)}</span>
          <Button
            size="sm"
            disabled={!supplierId || lines.length === 0 || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Saving…" : "Receive Stock"}
          </Button>
        </div>
      </div>

      {/* Recent receipts */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-2 text-base-content/70">
          Recent receipts
        </h2>
        <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
          {grns.length === 0 ? (
            <p className="p-6 text-center text-sm text-base-content/40">
              No stock received yet.
            </p>
          ) : (
            <ul className="divide-y divide-base-300/50">
              {grns.slice(0, 15).map((grn) => (
                <li key={grn._id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-base-content/50">
                      {grn.grnNumber}
                    </span>
                    <span className="font-medium">₹{grn.total.toFixed(0)}</span>
                  </div>
                  <p className="text-xs text-base-content/50">
                    {grn.supplierName} ·{" "}
                    {grn.lines.map((l) => `${l.name} ${l.qtyReceived}${l.unit}`).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
