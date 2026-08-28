"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useMemo } from "react";
import { FileText, Plus, Trash2, Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import Paginator from "@/components/inventory/Paginator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/Pill";
import ItemCombo from "@/components/inventory/ItemCombo";
import DateRangeFilter, {
  type DateRange,
} from "@/components/inventory/DateRangeFilter";
import { exportXlsx } from "@/lib/inventory/sheet";
import { formatPrice } from "@/lib/utils";

const PO_PAGE = 15;
const PO_STATUSES = ["all", "draft", "sent", "partially_received", "received", "cancelled"];

interface Supplier {
  _id: string;
  name: string;
}
interface InvItem {
  _id: string;
  name: string;
  purchaseUnit: string;
}
interface POLine {
  inventoryItemId: string;
  name: string;
  qty: number;
  unit: string;
  rate: number;
  receivedQty?: number;
}
interface PO {
  _id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  total: number;
  createdAt: string;
  lines: POLine[];
}
interface Line {
  inventoryItemId: string;
  name: string;
  unit: string;
  qty: number;
  rate: number;
}
const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const { data: pos = [] } = useQuery<PO[]>({
    queryKey: ["inv-pos"],
    queryFn: () => getJSON("/api/inventory/purchase-orders"),
  });
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["inv-suppliers"],
    queryFn: () => getJSON("/api/inventory/suppliers"),
  });
  const { data: items = [] } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [receivePO, setReceivePO] = useState<PO | null>(null);
  const [recvQty, setRecvQty] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "", preset: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const view = useMemo(() => {
    let r = pos;
    if (statusFilter !== "all") {
      r = r.filter((p) => p.status === statusFilter);
    }
    if (supplierFilter !== "all") {
      r = r.filter(
        (p) =>
          p.supplierId === supplierFilter ||
          p.supplierName?.toLowerCase() === supplierFilter.toLowerCase(),
      );
    }
    if (dateRange.from) {
      r = r.filter((p) => p.createdAt.slice(0, 10) >= dateRange.from);
    }
    if (dateRange.to) {
      r = r.filter((p) => p.createdAt.slice(0, 10) <= dateRange.to);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      r = r.filter(
        (p) =>
          p.poNumber.toLowerCase().includes(q) ||
          p.supplierName?.toLowerCase().includes(q),
      );
    }
    return r;
  }, [pos, statusFilter, supplierFilter, dateRange, searchQuery]);
  const paged = view.slice((page - 1) * PO_PAGE, page * PO_PAGE);

  const { data: lowStock } = useQuery<{
    rows: { _id: string; reorderQty?: number }[];
  }>({
    queryKey: ["inv-low"],
    queryFn: () => getJSON("/api/inventory/reports?type=low_stock"),
  });

  const fromLowStock = () => {
    const rows = lowStock?.rows ?? [];
    if (rows.length === 0) {
      toast.info("Nothing is low right now");
      return;
    }
    const newLines: Line[] = rows
      .map((r) => {
        const it = items.find((x) => x._id === r._id);
        if (!it) return null;
        return {
          inventoryItemId: it._id,
          name: it.name,
          unit: it.purchaseUnit,
          qty: r.reorderQty ?? 1,
          rate: 0,
        };
      })
      .filter(Boolean) as Line[];
    setLines(newLines);
    setSupplierId("");
    setOpen(true);
  };

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: ["inv-pos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receive = useMutation({
    mutationFn: async () => {
      if (!receivePO) return;
      const grnLines = receivePO.lines
        .map((l) => ({
          inventoryItemId: l.inventoryItemId,
          qtyReceived:
            recvQty[l.inventoryItemId] ??
            Math.max(0, l.qty - (l.receivedQty ?? 0)),
          rate: l.rate,
        }))
        .filter((l) => l.qtyReceived > 0);
      const res = await fetch("/api/inventory/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: receivePO.supplierId,
          purchaseOrderId: receivePO._id,
          lines: grnLines,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Stock received against PO");
      setReceivePO(null);
      setRecvQty({});
      qc.invalidateQueries({ queryKey: ["inv-pos"] });
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, lines, status: "sent" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Purchase order created");
      setOpen(false);
      setLines([]);
      setSupplierId("");
      qc.invalidateQueries({ queryKey: ["inv-pos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Order stock from suppliers and track what's coming."
        icon={FileText}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={view.length === 0}
              onClick={() =>
                exportXlsx(
                  view.map((p) => ({
                    poNumber: p.poNumber,
                    supplier: p.supplierName,
                    date: p.createdAt.slice(0, 10),
                    total: p.total,
                    status: p.status,
                  })),
                  "purchase-orders.xlsx",
                )
              }
            >
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={fromLowStock}
            >
              <FileText className="w-4 h-4" /> From low stock
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" /> New Order
            </Button>
          </div>
        }
      />
      <PanelHelp
        id="po"
        title="Purchase orders (optional)"
        steps={[
          "Raise an order listing what you want and the expected rate.",
          "When goods arrive, record them in Stock In against this order.",
          "Small setups can skip this and just use Stock In directly.",
        ]}
      />

      {/* ── Summary Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-xl bg-base-200 border border-base-300/60">
          <p className="text-xs text-base-content/60 font-medium">Total Orders</p>
          <p className="text-lg font-black mt-0.5">{view.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-base-200 border border-base-300/60">
          <p className="text-xs text-base-content/60 font-medium">Total PO Value</p>
          <p className="text-lg font-black text-primary mt-0.5">
            {formatPrice(view.reduce((acc, p) => acc + p.total, 0))}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-base-200 border border-base-300/60">
          <p className="text-xs text-base-content/60 font-medium">Received</p>
          <p className="text-lg font-black text-success mt-0.5">
            {view.filter((p) => p.status === "received").length}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-base-200 border border-base-300/60">
          <p className="text-xs text-base-content/60 font-medium">Pending / Partial</p>
          <p className="text-lg font-black text-warning mt-0.5">
            {view.filter((p) => ["draft", "sent", "partially_received"].includes(p.status)).length}
          </p>
        </div>
      </div>

      {/* ── Filter Bar: Supplier, Status, Search, Date Range ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier Filter */}
          <select
            className="select select-bordered select-sm max-w-[180px]"
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">🏢 All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="select select-bordered select-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {PO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace("_", " ")}
              </option>
            ))}
          </select>

          {/* Search PO / Supplier */}
          <Input
            className="w-36 sm:w-44 h-8 text-xs"
            placeholder="Search PO / Supplier…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          value={dateRange}
          onChange={(r) => {
            setDateRange(r);
            setPage(1);
          }}
        />
      </div>

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table table-sm min-w-[560px]">
          <thead>
            <tr className="text-xs uppercase text-base-content/40">
              <th>PO #</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => (
              <tr key={p._id} className="border-b border-base-300/50">
                <td className="font-mono text-sm">{p.poNumber}</td>
                <td className="text-sm">{p.supplierName}</td>
                <td className="text-xs text-base-content/50">
                  {format(new Date(p.createdAt), "dd MMM")}
                </td>
                <td className="text-sm">₹{p.total.toFixed(0)}</td>
                <td>
                  <Pill variant={p.status === "received" ? "success" : "outline"}>
                    {p.status.replace("_", " ")}
                  </Pill>
                </td>
                <td className="text-right">
                  {!["received", "cancelled"].includes(p.status) && (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setReceivePO(p);
                          setRecvQty({});
                        }}
                      >
                        Receive
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-error"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(p._id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-base-content/40">
                  No purchase orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Paginator
          page={page}
          pageSize={PO_PAGE}
          total={view.length}
          onPage={setPage}
        />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-base-100 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-4">New Purchase Order</h2>
            <select
              className="select select-bordered select-sm w-full mb-3"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— Supplier —</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ItemCombo
                    className="flex-1"
                    value={l.inventoryItemId}
                    onChange={(v) => {
                      const it = items.find((x) => x._id === v);
                      const n = [...lines];
                      n[i] = {
                        ...l,
                        inventoryItemId: v,
                        name: it?.name ?? "",
                        unit: it?.purchaseUnit ?? "",
                      };
                      setLines(n);
                    }}
                    options={items.map((it) => ({ value: it._id, label: it.name }))}
                  />
                  <Input
                    type="number"
                    className="w-20"
                    placeholder="qty"
                    value={l.qty}
                    onChange={(e) => {
                      const n = [...lines];
                      n[i] = { ...l, qty: Number(e.target.value) };
                      setLines(n);
                    }}
                  />
                  <Input
                    type="number"
                    className="w-20"
                    placeholder="rate"
                    value={l.rate}
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
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const f = items[0];
                  if (!f) return toast.error("Add ingredients first");
                  setLines([
                    ...lines,
                    {
                      inventoryItemId: f._id,
                      name: f.name,
                      unit: f.purchaseUnit,
                      qty: 0,
                      rate: 0,
                    },
                  ]);
                }}
              >
                <Plus className="w-4 h-4" /> Add item
              </Button>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!supplierId || lines.length === 0 || create.isPending}
                onClick={() => create.mutate()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receive modal */}
      {receivePO && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setReceivePO(null)}
        >
          <div
            className="bg-base-100 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-1">
              Receive {receivePO.poNumber}
            </h2>
            <p className="text-sm text-base-content/60 mb-4">
              Enter what arrived. Stock goes up; the PO updates automatically.
            </p>
            <div className="space-y-2">
              {receivePO.lines.map((l) => {
                const remaining = Math.max(0, l.qty - (l.receivedQty ?? 0));
                return (
                  <div
                    key={l.inventoryItemId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-1 truncate">{l.name}</span>
                    <span className="text-xs text-base-content/40 w-24 text-right">
                      ordered {l.qty} {l.unit}
                    </span>
                    <Input
                      type="number"
                      className="w-24"
                      defaultValue={remaining}
                      onChange={(e) =>
                        setRecvQty({
                          ...recvQty,
                          [l.inventoryItemId]: Number(e.target.value),
                        })
                      }
                    />
                    <span className="text-xs w-8">{l.unit}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setReceivePO(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={receive.isPending} onClick={() => receive.mutate()}>
                {receive.isPending ? "Receiving…" : "Receive Stock"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
