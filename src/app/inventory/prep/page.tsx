"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChefHat, Plus, Trash2, Hammer, Pencil } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminFormField } from "@/components/admin/AdminFormField";
import ItemCombo from "@/components/inventory/ItemCombo";
import { formatPrice } from "@/lib/utils";
import { UNITS_BY_TYPE, type MeasureType } from "@/lib/inventory/units";

interface InvItem {
  _id: string;
  name: string;
  measureType: MeasureType;
}
interface Component {
  inventoryItemId?: string;
  name: string;
  qty: number;
  unit: string;
}
interface Sub {
  _id: string;
  subRecipeName: string;
  outputUnit?: string;
  yieldQty: number;
  costCache?: number;
  components: Component[];
}
const getJSON = (u: string) => fetch(u).then((r) => r.json());
const ALL_UNITS = ["kg", "g", "L", "ml", "pcs"];

export default function PrepPage() {
  const qc = useQueryClient();
  const { data: subs = [] } = useQuery<Sub[]>({
    queryKey: ["inv-subs"],
    queryFn: () => getJSON("/api/inventory/recipes?kind=sub"),
  });
  const { data: items = [] } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [outputUnit, setOutputUnit] = useState("g");
  const [yieldQty, setYieldQty] = useState(1);
  const [shelfLifeDays, setShelfLifeDays] = useState(2);
  const [comps, setComps] = useState<Component[]>([]);

  const openNew = () => {
    setEditId(null);
    setName("");
    setOutputUnit("g");
    setYieldQty(1);
    setShelfLifeDays(2);
    setComps([]);
    setOpen(true);
  };
  const openEdit = (s: Sub) => {
    setEditId(s._id);
    setName(s.subRecipeName);
    setOutputUnit(s.outputUnit ?? "g");
    setYieldQty(s.yieldQty);
    setComps(s.components ?? []);
    setOpen(true);
  };
  const [produceFor, setProduceFor] = useState<Sub | null>(null);
  const [batchQty, setBatchQty] = useState(0);

  const create = useMutation({
    mutationFn: async () => {
      const url = editId
        ? `/api/inventory/recipes/${editId}`
        : "/api/inventory/recipes";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sub",
          subRecipeName: name,
          outputUnit,
          yieldQty,
          shelfLifeDays,
          components: comps,
        }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success(editId ? "Sub-recipe updated" : "Sub-recipe created");
      setOpen(false);
      setComps([]);
      qc.invalidateQueries({ queryKey: ["inv-subs"] });
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const produce = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subRecipeId: produceFor?._id, batchQty }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Batch produced — stock updated");
      setProduceFor(null);
      setBatchQty(0);
      qc.invalidateQueries({ queryKey: ["inv-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComp = () => {
    const f = items[0];
    if (!f) return toast.error("Add ingredients first");
    setComps([
      ...comps,
      {
        inventoryItemId: f._id,
        name: f.name,
        qty: 0,
        unit: UNITS_BY_TYPE[f.measureType][0],
      },
    ]);
  };

  return (
    <div>
      <PageHeader
        title="Prep / Sub-recipes"
        subtitle="Batch-made items (gravies, sauces) used inside other dishes."
        icon={ChefHat}
        action={
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> New Sub-recipe
          </Button>
        }
      />
      <PanelHelp
        id="prep"
        title="How prep works"
        steps={[
          "Create a prep (e.g. Gravy Base): list its ingredients and how much it makes.",
          "Press Produce when you cook a batch — ingredients drop, prep stock goes up.",
          "Use the prep as an ingredient inside dish recipes; selling the dish uses prep stock.",
        ]}
      />

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
        {subs.length === 0 ? (
          <p className="p-8 text-center text-sm text-base-content/40">
            No sub-recipes yet. Create one if a dish uses a pre-made base.
          </p>
        ) : (
          <ul className="divide-y divide-base-300/50">
            {subs.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{s.subRecipeName}</p>
                  <p className="text-xs text-base-content/50">
                    Makes {s.yieldQty} {s.outputUnit} ·{" "}
                    {s.costCache != null ? formatPrice(s.costCache) : "—"}/
                    {s.outputUnit}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => openEdit(s)}
                    title="Edit sub-recipe"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      setProduceFor(s);
                      setBatchQty(s.yieldQty);
                    }}
                  >
                    <Hammer className="w-3.5 h-3.5" /> Produce
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create / edit sub-recipe modal */}
      {open && (
        <Modal
          title={editId ? "Edit Sub-recipe" : "New Sub-recipe"}
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <AdminFormField label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gravy Base"
                required
              />
            </AdminFormField>
            <div className="grid grid-cols-2 gap-3">
              <AdminFormField label="Output unit">
                <select
                  className="select select-bordered select-sm w-full"
                  value={outputUnit}
                  onChange={(e) => setOutputUnit(e.target.value)}
                >
                  {ALL_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField label="Batch makes" hint="in output unit">
                <Input
                  type="number"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(Number(e.target.value) || 1)}
                />
              </AdminFormField>
            </div>
            <AdminFormField
              label="Good for (days)"
              hint="we'll warn before it expires; 0 = no expiry"
            >
              <Input
                type="number"
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(Number(e.target.value))}
              />
            </AdminFormField>
            <p className="text-xs font-semibold uppercase text-base-content/40 mt-1">
              Ingredients
            </p>
            {comps.map((c, i) => {
              const it = items.find((x) => x._id === c.inventoryItemId);
              const units = it ? UNITS_BY_TYPE[it.measureType] : [c.unit];
              return (
                <div key={i} className="flex items-center gap-2">
                  <ItemCombo
                    className="flex-1"
                    value={c.inventoryItemId ?? ""}
                    onChange={(v) => {
                      const itm = items.find((x) => x._id === v);
                      const n = [...comps];
                      n[i] = {
                        ...c,
                        inventoryItemId: v,
                        name: itm?.name ?? "",
                        unit: itm ? UNITS_BY_TYPE[itm.measureType][0] : c.unit,
                      };
                      setComps(n);
                    }}
                    options={items.map((x) => ({ value: x._id, label: x.name }))}
                  />
                  <Input
                    type="number"
                    className="w-20"
                    value={c.qty}
                    onChange={(e) => {
                      const n = [...comps];
                      n[i] = { ...c, qty: Number(e.target.value) };
                      setComps(n);
                    }}
                  />
                  <select
                    className="select select-bordered select-sm w-20"
                    value={c.unit}
                    onChange={(e) => {
                      const n = [...comps];
                      n[i] = { ...c, unit: e.target.value };
                      setComps(n);
                    }}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setComps(comps.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-error" />
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addComp}>
              <Plus className="w-4 h-4" /> Add ingredient
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {editId ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Produce modal */}
      {produceFor && (
        <Modal
          title={`Produce — ${produceFor.subRecipeName}`}
          onClose={() => setProduceFor(null)}
        >
          <p className="text-sm text-base-content/60 mb-3">
            How much did you make? Ingredients will be deducted automatically.
          </p>
          <AdminFormField label={`Amount made (${produceFor.outputUnit})`}>
            <Input
              type="number"
              value={batchQty}
              onChange={(e) => setBatchQty(Number(e.target.value))}
            />
          </AdminFormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setProduceFor(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={batchQty <= 0 || produce.isPending}
              onClick={() => produce.mutate()}
            >
              {produce.isPending ? "Producing…" : "Produce Batch"}
            </Button>
          </div>
        </Modal>
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
        className="bg-base-100 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
