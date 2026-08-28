"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ItemCombo from "@/components/inventory/ItemCombo";
import { formatPrice } from "@/lib/utils";
import { UNITS_BY_TYPE, toBase, type MeasureType } from "@/lib/inventory/units";

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  trackInventory?: boolean;
}
interface InvItem {
  _id: string;
  name: string;
  measureType: MeasureType;
  avgCost: number;
  yieldPercent: number;
}
interface Sub {
  _id: string;
  subRecipeName: string;
  outputUnit?: string;
  costCache?: number;
}
interface Component {
  inventoryItemId?: string;
  subRecipeId?: string;
  name: string;
  qty: number;
  unit: string;
}
interface Recipe {
  _id?: string;
  yieldQty: number;
  components: Component[];
  costCache?: number;
}

const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function RecipesPage() {
  const qc = useQueryClient();
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["inv-menu-items"],
    queryFn: () => getJSON("/api/inventory/menu-items"),
  });
  const { data: invItems = [] } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });
  const { data: subs = [] } = useQuery<Sub[]>({
    queryKey: ["inv-subs"],
    queryFn: () => getJSON("/api/inventory/recipes?kind=sub"),
  });

  // Combined picker: raw ingredients + prep sub-recipes.
  const compKey = (c: Component) =>
    c.subRecipeId ? `sub:${c.subRecipeId}` : `item:${c.inventoryItemId}`;
  const unitsFor = (c: Component): string[] => {
    if (c.subRecipeId) {
      const s = subs.find((x) => x._id === c.subRecipeId);
      return s?.outputUnit ? [s.outputUnit] : [c.unit];
    }
    const it = invItems.find((x) => x._id === c.inventoryItemId);
    return it ? UNITS_BY_TYPE[it.measureType] : [c.unit];
  };
  const applyPick = (value: string): Component => {
    if (value.startsWith("sub:")) {
      const s = subs.find((x) => x._id === value.slice(4));
      return {
        subRecipeId: s?._id,
        name: s?.subRecipeName ?? "",
        qty: 0,
        unit: s?.outputUnit ?? "g",
      };
    }
    const it = invItems.find((x) => x._id === value.slice(5));
    return {
      inventoryItemId: it?._id,
      name: it?.name ?? "",
      qty: 0,
      unit: it ? UNITS_BY_TYPE[it.measureType][0] : "g",
    };
  };

  const [selectedId, setSelectedId] = useState<string>("");
  const selected = menuItems.find((m) => m._id === selectedId);

  const { data: recipe } = useQuery<Recipe | null>({
    queryKey: ["inv-recipe", selectedId],
    queryFn: () => getJSON(`/api/inventory/recipes?menuItemId=${selectedId}`),
    enabled: !!selectedId,
  });

  const [draft, setDraft] = useState<Recipe | null>(null);
  // Sync draft when recipe loads / item changes.
  const current: Recipe =
    draft ?? recipe ?? { yieldQty: 1, components: [] };

  const setCurrent = (r: Recipe) => setDraft(r);

  // Live cost preview from the current draft (approximate; server is authoritative on save).
  const cost = useMemo(() => {
    let total = 0;
    for (const c of current.components) {
      const perYield = c.qty / (current.yieldQty || 1);
      if (c.subRecipeId) {
        const s = subs.find((x) => x._id === c.subRecipeId);
        total += perYield * (s?.costCache ?? 0);
      } else {
        const it = invItems.find((x) => x._id === c.inventoryItemId);
        if (!it) continue;
        const yieldFactor = (it.yieldPercent || 100) / 100;
        total += (toBase(perYield, c.unit) / yieldFactor) * (it.avgCost || 0);
      }
    }
    return total;
  }, [current.components, current.yieldQty, invItems, subs]);

  const price = selected?.discountPrice ?? selected?.price ?? 0;
  const foodCostPct = price > 0 && cost > 0 ? (cost / price) * 100 : 0;

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "menu",
          menuItemId: selectedId,
          yieldQty: current.yieldQty,
          components: current.components,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: () => {
      toast.success("Recipe saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["inv-recipe", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTrack = useMutation({
    mutationFn: async (track: boolean) => {
      await fetch("/api/inventory/menu-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, trackInventory: track }),
      });
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["inv-menu-items"] });
    },
  });

  const addComponent = () => {
    const first = invItems[0];
    if (!first) {
      toast.error("Add ingredients first");
      return;
    }
    setCurrent({
      ...current,
      components: [
        ...current.components,
        {
          inventoryItemId: first._id,
          name: first.name,
          qty: 0,
          unit: UNITS_BY_TYPE[first.measureType][0],
        },
      ],
    });
  };

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle="Tell us what goes into each dish so selling it lowers stock."
        icon={BookOpen}
      />
      <PanelHelp
        id="recipes"
        title="How recipes work"
        steps={[
          "Pick a dish, then list the ingredients it uses and how much.",
          "Turn on 'Deduct stock when sold' so each sale lowers ingredients.",
          "We show the dish cost and food-cost % so you can price right.",
          "No recipe = that dish won't change stock (safe to skip drinks etc).",
        ]}
      />

      <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4 mb-4">
        <label className="text-sm font-medium">Dish</label>
        <select
          className="select select-bordered select-sm w-full mt-1"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setDraft(null);
          }}
        >
          <option value="">— Select a dish —</option>
          {menuItems.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
              {m.trackInventory ? " ✓" : ""}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={!!selected.trackInventory}
                onChange={(e) => toggleTrack.mutate(e.target.checked)}
              />
              Deduct stock when sold
            </label>
            <div className="flex items-center gap-4 text-sm">
              <span>
                Cost:{" "}
                <span className="font-bold">{formatPrice(cost)}</span>
              </span>
              <span>
                Price: <span className="font-bold">{formatPrice(price)}</span>
              </span>
              <span
                className={
                  foodCostPct > 40
                    ? "text-error font-bold"
                    : "text-success font-bold"
                }
              >
                Food cost: {foodCostPct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm">Makes</label>
            <Input
              type="number"
              className="w-24"
              value={current.yieldQty}
              onChange={(e) =>
                setCurrent({ ...current, yieldQty: Number(e.target.value) || 1 })
              }
            />
            <span className="text-sm text-base-content/50">
              portion(s) per recipe
            </span>
          </div>

          <div className="space-y-2">
            {current.components.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <ItemCombo
                  className="flex-1"
                  value={compKey(c)}
                  onChange={(v) => {
                    const comps = [...current.components];
                    comps[i] = { ...applyPick(v), qty: c.qty };
                    setCurrent({ ...current, components: comps });
                  }}
                  options={[
                    ...invItems.map((it) => ({
                      value: `item:${it._id}`,
                      label: it.name,
                    })),
                    ...subs.map((s) => ({
                      value: `sub:${s._id}`,
                      label: s.subRecipeName,
                      hint: "prep",
                    })),
                  ]}
                />
                <Input
                  type="number"
                  className="w-20"
                  value={c.qty}
                  onChange={(e) => {
                    const comps = [...current.components];
                    comps[i] = { ...c, qty: Number(e.target.value) };
                    setCurrent({ ...current, components: comps });
                  }}
                />
                <select
                  className="select select-bordered select-sm w-20"
                  value={c.unit}
                  onChange={(e) => {
                    const comps = [...current.components];
                    comps[i] = { ...c, unit: e.target.value };
                    setCurrent({ ...current, components: comps });
                  }}
                >
                  {unitsFor(c).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    const comps = current.components.filter((_, j) => j !== i);
                    setCurrent({ ...current, components: comps });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-error" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-2" onClick={addComponent}>
              <Plus className="w-4 h-4" /> Add ingredient
            </Button>
          </div>

          <div className="flex justify-end pt-2 border-t border-base-300/60">
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save recipe"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
