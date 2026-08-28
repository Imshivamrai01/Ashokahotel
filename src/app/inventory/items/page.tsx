"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Carrot,
  Plus,
  Pencil,
  Sliders,
  Upload,
  Download,
  FileDown,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ScrollText,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import Paginator from "@/components/inventory/Paginator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/Pill";
import { AdminFormField } from "@/components/admin/AdminFormField";
import { parseSheet, exportXlsx } from "@/lib/inventory/sheet";
import {
  UNITS_BY_TYPE,
  BASE_UNIT,
  displayQty,
  type MeasureType,
} from "@/lib/inventory/units";

const PAGE_SIZE = 15;

interface InvItem {
  _id: string;
  name: string;
  category: string;
  measureType: MeasureType;
  stockUnit: string;
  purchaseUnit: string;
  currentStock: number;
  avgCost: number;
  reorderLevel: number;
  yieldPercent: number;
  isPerishable: boolean;
  isDirectSale: boolean;
  isActive: boolean;
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

function stockTone(it: InvItem): "success" | "warning" | "error" {
  if (it.currentStock <= 0) return "error";
  if (it.reorderLevel > 0 && it.currentStock <= it.reorderLevel) return "warning";
  return "success";
}

export default function ItemsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<InvItem | null>(null);
  const [adjust, setAdjust] = useState<InvItem | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const empty = {
    name: "",
    category: "General",
    measureType: "weight" as MeasureType,
    purchaseUnit: "kg",
    reorderLevel: 0,
    yieldPercent: 100,
    isPerishable: false,
    isDirectSale: false,
    openingStock: 0,
  };
  const [form, setForm] = useState(empty);

  const openAdd = () => {
    setEdit(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (it: InvItem) => {
    setEdit(it);
    setForm({
      name: it.name,
      category: it.category,
      measureType: it.measureType,
      purchaseUnit: it.purchaseUnit,
      reorderLevel: it.reorderLevel,
      yieldPercent: it.yieldPercent,
      isPerishable: it.isPerishable,
      isDirectSale: it.isDirectSale,
      openingStock: 0,
    });
    setOpen(true);
  };

  const importFile = async (file: File) => {
    try {
      const rows = await parseSheet(file);
      if (rows.length === 0) {
        toast.error("No rows found in the file");
        return;
      }
      const res = await fetch("/api/inventory/items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(
        `Imported ${data.created}${data.skipped?.length ? `, skipped ${data.skipped.length} existing` : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  const downloadSample = () => {
    exportXlsx(
      [
        {
          name: "Tomato",
          category: "Vegetables",
          measureType: "weight",
          purchaseUnit: "kg",
          reorderLevel: 4000,
          openingStock: 20000,
          cost: 0.05,
        },
      ],
      "ingredients-sample.xlsx",
    );
  };

  const exportItems = () => {
    exportXlsx(
      items
        .filter((i) => i.isActive)
        .map((i) => ({
          name: i.name,
          category: i.category,
          measureType: i.measureType,
          stockUnit: i.stockUnit,
          currentStock: i.currentStock,
          avgCost: i.avgCost,
          reorderLevel: i.reorderLevel,
        })),
      "ingredients.xlsx",
    );
  };

  // ── Table controls ──
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [sortKey, setSortKey] = useState<
    "name" | "currentStock" | "avgCost"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );
  const view = useMemo(() => {
    let r = showInactive ? items : items.filter((i) => i.isActive);
    if (cat !== "all") r = r.filter((i) => i.category === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((i) => i.name.toLowerCase().includes(q));
    }
    const m = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * m;
      return String(av).localeCompare(String(bv)) * m;
    });
  }, [items, cat, search, sortKey, sortDir, showInactive]);
  const paged = view.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
    setPage(1);
  };
  const sortIcon = (k: typeof sortKey) =>
    sortKey !== k ? (
      <ArrowUpDown className="w-3 h-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  const ariaSort = (k: typeof sortKey): "ascending" | "descending" | "none" =>
    sortKey !== k ? "none" : sortDir === "asc" ? "ascending" : "descending";

  const save = useMutation({
    mutationFn: async () => {
      const url = edit
        ? `/api/inventory/items/${edit._id}`
        : "/api/inventory/items";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      // New item with an opening stock → record it as a stock adjustment.
      if (!edit && form.openingStock > 0) {
        const created = await res.json();
        await fetch("/api/inventory/adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId: created._id,
            newQty: form.openingStock,
            reason: "Opening stock",
          }),
        });
      }
    },
    onSuccess: () => {
      toast.success(edit ? "Ingredient updated" : "Ingredient added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/inventory/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? "Restored" : "Archived");
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Ingredients"
        subtitle="Everything you stock — raw materials and ready-to-sell goods."
        icon={Carrot}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={downloadSample}
              title="Download a sample import file"
            >
              <FileDown className="w-4 h-4" /> Sample
            </Button>
            <label className="btn btn-outline btn-sm gap-2 cursor-pointer">
              <Upload className="w-4 h-4" /> Import
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportItems}
            >
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        }
      />

      <PanelHelp
        id="items"
        title="About ingredients"
        steps={[
          "Add each raw material once — pick the unit you buy it in (kg, L, pcs).",
          "Set a low-stock number so we warn you when it's running out.",
          "Stock goes up from Stock In and down automatically when dishes sell.",
          "Use the sliders button to fix a stock number after a physical count.",
        ]}
      />

      {/* Toolbar: search + category filter */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-40">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ingredients…"
              className="pl-9"
            />
          </div>
          <select
            className="select select-bordered select-sm"
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setPage(1);
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-base-content/60 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setPage(1);
              }}
            />
            Show archived
          </label>
          <span className="text-xs text-base-content/40">{view.length} items</span>
        </div>
      )}

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-lg bg-base-300/40 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-base-content/50">
            <Carrot className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No ingredients yet.</p>
            <p className="text-sm">Add your first ingredient to start tracking stock.</p>
            <Button size="sm" className="mt-3 gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Ingredient
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-base-300/60 text-xs uppercase text-base-content/40">
                  <th scope="col" aria-sort={ariaSort("name")}>
                    <button
                      className="inline-flex items-center gap-1 hover:text-base-content transition-colors"
                      onClick={() => toggleSort("name")}
                    >
                      Name {sortIcon("name")}
                    </button>
                  </th>
                  <th scope="col">Category</th>
                  <th scope="col" aria-sort={ariaSort("currentStock")}>
                    <button
                      className="inline-flex items-center gap-1 hover:text-base-content transition-colors"
                      onClick={() => toggleSort("currentStock")}
                    >
                      In Stock {sortIcon("currentStock")}
                    </button>
                  </th>
                  <th scope="col" aria-sort={ariaSort("avgCost")}>
                    <button
                      className="inline-flex items-center gap-1 hover:text-base-content transition-colors"
                      onClick={() => toggleSort("avgCost")}
                    >
                      Avg Cost {sortIcon("avgCost")}
                    </button>
                  </th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((it) => (
                  <tr
                    key={it._id}
                    className={`hover border-b border-base-300/50 transition-colors ${it.isActive ? "" : "opacity-50"}`}
                  >
                    <td className="font-medium">
                      {it.name}
                      {it.isDirectSale && (
                        <span className="ml-1.5 badge badge-xs badge-ghost">
                          direct
                        </span>
                      )}
                      {!it.isActive && (
                        <span className="ml-1.5 badge badge-xs badge-ghost">
                          archived
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-base-content/60">{it.category}</td>
                    <td>
                      <Pill variant={stockTone(it)}>
                        <span className="tabular-nums">
                          {displayQty(it.currentStock, it.measureType)}
                        </span>
                      </Pill>
                    </td>
                    <td className="text-sm tabular-nums">
                      ₹{it.avgCost.toFixed(2)}/{it.stockUnit}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {it.isActive ? (
                          <>
                            <Link
                              href={`/inventory/ledger?item=${it._id}`}
                              className="btn btn-ghost btn-xs btn-square"
                              title="View history"
                              aria-label={`View history for ${it.name}`}
                            >
                              <ScrollText className="w-3.5 h-3.5" />
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Fix stock number"
                              aria-label={`Fix stock for ${it.name}`}
                              onClick={() => setAdjust(it)}
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Edit"
                              aria-label={`Edit ${it.name}`}
                              onClick={() => openEdit(it)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Restore"
                            aria-label={`Restore ${it.name}`}
                            onClick={() =>
                              setActive.mutate({ id: it._id, isActive: true })
                            }
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Paginator
              page={page}
              pageSize={PAGE_SIZE}
              total={view.length}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {open && (
        <Modal title={edit ? "Edit Ingredient" : "Add Ingredient"} onClose={() => setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <AdminFormField label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Tomato"
                required
              />
            </AdminFormField>
            <div className="grid grid-cols-2 gap-3">
              <AdminFormField label="Category">
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Vegetables"
                />
              </AdminFormField>
              <AdminFormField label="Measured in">
                <select
                  className="select select-bordered select-sm w-full"
                  value={form.measureType}
                  disabled={!!edit}
                  onChange={(e) => {
                    const mt = e.target.value as MeasureType;
                    setForm({
                      ...form,
                      measureType: mt,
                      purchaseUnit: UNITS_BY_TYPE[mt][0],
                    });
                  }}
                >
                  <option value="weight">Weight (kg/g)</option>
                  <option value="volume">Volume (L/ml)</option>
                  <option value="count">Count (pcs)</option>
                </select>
              </AdminFormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminFormField label="You buy it in">
                <select
                  className="select select-bordered select-sm w-full"
                  value={form.purchaseUnit}
                  onChange={(e) =>
                    setForm({ ...form, purchaseUnit: e.target.value })
                  }
                >
                  {UNITS_BY_TYPE[form.measureType].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField
                label={`Warn below (${BASE_UNIT[form.measureType]})`}
              >
                <Input
                  type="number"
                  value={form.reorderLevel}
                  onChange={(e) =>
                    setForm({ ...form, reorderLevel: Number(e.target.value) })
                  }
                  placeholder="0 = no alert"
                />
              </AdminFormField>
              {!edit && (
                <AdminFormField
                  label={`Opening stock (${BASE_UNIT[form.measureType]})`}
                  hint="how much you have right now"
                >
                  <Input
                    type="number"
                    value={form.openingStock}
                    onChange={(e) =>
                      setForm({ ...form, openingStock: Number(e.target.value) })
                    }
                    placeholder="0"
                  />
                </AdminFormField>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminFormField
                label="Yield %"
                hint="usable after trim; 100 = no loss"
              >
                <Input
                  type="number"
                  value={form.yieldPercent}
                  onChange={(e) =>
                    setForm({ ...form, yieldPercent: Number(e.target.value) })
                  }
                />
              </AdminFormField>
              <div className="flex flex-col gap-2 justify-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.isPerishable}
                    onChange={(e) =>
                      setForm({ ...form, isPerishable: e.target.checked })
                    }
                  />
                  Perishable
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.isDirectSale}
                    onChange={(e) =>
                      setForm({ ...form, isDirectSale: e.target.checked })
                    }
                  />
                  Sold as-is (no recipe)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={save.isPending}>
                {save.isPending ? "Saving…" : edit ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {adjust && (
        <AdjustModal
          item={adjust}
          onClose={() => setAdjust(null)}
          onDone={() => {
            setAdjust(null);
            qc.invalidateQueries({ queryKey: ["inv-items"] });
          }}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-base-300">
          <h2 className="font-bold text-lg">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function AdjustModal({
  item,
  onClose,
  onDone,
}: {
  item: InvItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(String(item.currentStock));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: item._id,
          newQty: Number(qty),
          unit: item.stockUnit,
          reason: reason || "Manual correction",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Stock updated");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Fix stock — ${item.name}`} onClose={onClose}>
      <p className="text-sm text-base-content/60 mb-3">
        Set the actual amount you have. We&apos;ll record the difference.
      </p>
      <AdminFormField label={`Current amount (${item.stockUnit})`}>
        <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
      </AdminFormField>
      <div className="mt-3">
        <AdminFormField label="Reason (optional)">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. recount, spillage"
          />
        </AdminFormField>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : "Update stock"}
        </Button>
      </div>
    </Modal>
  );
}
