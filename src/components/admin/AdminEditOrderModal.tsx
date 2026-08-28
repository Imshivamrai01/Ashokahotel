"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, Minus, Search, Trash2, Gift } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import type { IOrder, IItem } from "@/types";

interface Props {
  order: IOrder;
  onClose: () => void;
  onSaved: () => void;
}

interface MenuResponse {
  items: IItem[];
}

async function fetchMenu(): Promise<IItem[]> {
  const res = await fetch("/api/menu", { cache: "no-store" });
  if (!res.ok) throw new Error();
  const data: MenuResponse = await res.json();
  return data.items ?? [];
}

// Admin-only: add new items, change quantity of not-yet-started items, or
// remove (cancel) existing items on an already-placed order.
export default function AdminEditOrderModal({ order, onClose, onSaved }: Props) {
  const { data: menu = [] } = useQuery<IItem[]>({
    queryKey: ["admin-menu-items"],
    queryFn: fetchMenu,
  });

  const [search, setSearch] = useState("");
  const [adds, setAdds] = useState<Record<string, { item: IItem; qty: number }>>(
    {},
  );
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState<Record<string, number>>({});
  // No-Charge toggles for existing items: itemId → { isNC, reason }
  const [ncMap, setNcMap] = useState<
    Record<string, { isNC: boolean; reason?: string }>
  >({});
  const [saving, setSaving] = useState(false);

  const existing = order.items.filter((i) => i.itemStatus !== "cancelled");

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menu.slice(0, 8);
    return menu.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 12);
  }, [menu, search]);

  function addMenuItem(item: IItem) {
    setAdds((p) => {
      const cur = p[item._id];
      return { ...p, [item._id]: { item, qty: (cur?.qty ?? 0) + 1 } };
    });
  }

  const hasChanges =
    Object.keys(adds).length > 0 ||
    removeIds.size > 0 ||
    Object.keys(qty).length > 0 ||
    Object.keys(ncMap).length > 0;

  // Current NC state for an existing item (pending edit overrides saved value).
  const ncState = (it: { _id: string; isNC?: boolean; ncReason?: string }) =>
    ncMap[it._id] ?? { isNC: !!it.isNC, reason: it.ncReason };

  function toggleNC(it: { _id: string; isNC?: boolean; ncReason?: string }) {
    const cur = ncState(it);
    setNcMap((p) => ({
      ...p,
      [it._id]: { isNC: !cur.isNC, reason: cur.isNC ? undefined : cur.reason },
    }));
  }

  function setNCReason(itemId: string, reason: string) {
    setNcMap((p) => ({ ...p, [itemId]: { isNC: true, reason } }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_items",
          addItems: Object.values(adds).map(({ item, qty }) => ({
            itemId: item._id,
            name: item.name,
            price: item.price,
            discountPrice: item.discountPrice,
            quantity: qty,
            isVegetarian: item.isVegetarian,
            preparationTtlMinutes: item.preparationTtlMinutes,
          })),
          removeItemIds: [...removeIds],
          updateQty: Object.entries(qty).map(([itemId, quantity]) => ({
            itemId,
            quantity,
          })),
          setNC: Object.entries(ncMap).map(([itemId, v]) => ({
            itemId,
            isNC: v.isNC,
            reason: v.reason,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      if (Array.isArray(data.droppedQty) && data.droppedQty.length) {
        toast.warning(
          `Qty unchanged for already-cooking items: ${data.droppedQty.join(", ")}`,
        );
      }
      toast.success("Order updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div>
            <h2 className="font-bold text-lg">Edit Order</h2>
            <p className="text-sm text-base-content/60">
              {order.kotNumber} · {order.tableLabel}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Existing items */}
          <div>
            <p className="text-xs uppercase font-bold text-base-content/40 mb-1.5">
              Current items
            </p>
            <div className="space-y-1.5">
              {existing.map((it) => {
                const removed = removeIds.has(it._id);
                const editable = it.itemStatus === "pending";
                const curQty = qty[it._id] ?? it.quantity;
                const nc = ncState(it);
                return (
                  <div
                    key={it._id}
                    className="rounded-lg px-2 py-1.5 bg-base-200 space-y-1.5"
                  >
                  <div
                    className={`flex items-center gap-2 text-sm ${removed ? "opacity-40 line-through" : ""}`}
                  >
                    <span className="flex-1 truncate">
                      {it.name}
                      {nc.isNC && (
                        <span className="ml-1.5 badge badge-xs badge-success align-middle">
                          NC
                        </span>
                      )}
                    </span>
                    {editable && !removed ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setQty((p) => ({
                              ...p,
                              [it._id]: Math.max(1, curQty - 1),
                            }))
                          }
                          className="btn btn-xs btn-circle btn-ghost border border-base-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono">
                          {curQty}
                        </span>
                        <button
                          onClick={() =>
                            setQty((p) => ({ ...p, [it._id]: curQty + 1 }))
                          }
                          className="btn btn-xs btn-circle btn-ghost border border-base-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-base-content/50">
                        x{it.quantity}
                        {!editable && (
                          <span className="ml-1 text-[10px] text-warning">
                            ({it.itemStatus})
                          </span>
                        )}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setRemoveIds((p) => {
                          const n = new Set(p);
                          if (n.has(it._id)) n.delete(it._id);
                          else n.add(it._id);
                          return n;
                        })
                      }
                      className={`btn btn-xs btn-circle ${removed ? "btn-ghost" : "btn-error"}`}
                      title={removed ? "Undo remove" : "Remove item"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* No-Charge toggle */}
                  {!removed && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleNC(it)}
                        className={`btn btn-xs gap-1 ${nc.isNC ? "btn-success" : "btn-ghost border border-base-300"}`}
                      >
                        <Gift className="w-3 h-3" />
                        {nc.isNC ? "No Charge ✓" : "No Charge"}
                      </button>
                      {nc.isNC && (
                        <input
                          value={nc.reason ?? ""}
                          onChange={(e) => setNCReason(it._id, e.target.value)}
                          placeholder="Reason…"
                          className="input input-bordered input-xs flex-1 text-xs"
                        />
                      )}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* New items to add */}
          {Object.keys(adds).length > 0 && (
            <div>
              <p className="text-xs uppercase font-bold text-success mb-1.5">
                Adding
              </p>
              <div className="space-y-1.5">
                {Object.values(adds).map(({ item, qty }) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 bg-success/10"
                  >
                    <span className="flex-1 truncate">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setAdds((p) => {
                            const cur = p[item._id];
                            if (!cur) return p;
                            if (cur.qty <= 1) {
                              const rest = { ...p };
                              delete rest[item._id];
                              return rest;
                            }
                            return {
                              ...p,
                              [item._id]: { item, qty: cur.qty - 1 },
                            };
                          })
                        }
                        className="btn btn-xs btn-circle btn-ghost border border-base-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono">{qty}</span>
                      <button
                        onClick={() => addMenuItem(item)}
                        className="btn btn-xs btn-circle btn-ghost border border-base-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu search */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu to add…"
                className="input input-bordered input-sm w-full pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {filteredMenu.map((m) => (
                <button
                  key={m._id}
                  onClick={() => addMenuItem(m)}
                  className="btn btn-xs btn-outline justify-between"
                >
                  <span className="truncate">{m.name}</span>
                  <span className="text-base-content/50">
                    {formatPrice(m.discountPrice ?? m.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-base-300">
          <button
            onClick={save}
            disabled={saving || !hasChanges}
            className="btn btn-primary w-full"
          >
            {saving ? (
              <span className="loading loading-spinner" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
