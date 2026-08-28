"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, Plus, Pencil, Wallet, Undo2, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PanelHelp from "@/components/inventory/PanelHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/Pill";
import { AdminFormField } from "@/components/admin/AdminFormField";
import ItemCombo from "@/components/inventory/ItemCombo";
import { formatPrice } from "@/lib/utils";

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  due?: number;
  purchases?: number;
  payments?: number;
}
interface InvItem {
  _id: string;
  name: string;
  purchaseUnit: string;
}
interface RetLine {
  inventoryItemId: string;
  qty: number;
  rate: number;
}
const getJSON = (u: string) => fetch(u).then((r) => r.json());

export default function SuppliersPage() {
  const qc = useQueryClient();
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["inv-suppliers"],
    queryFn: () => getJSON("/api/inventory/suppliers"),
  });
  const { data: items = [] } = useQuery<InvItem[]>({
    queryKey: ["inv-items"],
    queryFn: () => getJSON("/api/inventory/items"),
  });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  // Payment modal
  const [payFor, setPayFor] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  // Return modal
  const [retFor, setRetFor] = useState<Supplier | null>(null);
  const [retLines, setRetLines] = useState<RetLine[]>([]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inv-suppliers"] });
    qc.invalidateQueries({ queryKey: ["inv-items"] });
  };

  const pay = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: payFor?._id,
          amount: payAmount,
          method: payMethod,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayFor(null);
      setPayAmount(0);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ret = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/purchase-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: retFor?._id,
          lines: retLines.filter((l) => l.qty > 0),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Return recorded — stock reduced");
      setRetFor(null);
      setRetLines([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const url = edit
        ? `/api/inventory/suppliers/${edit._id}`
        : "/api/inventory/suppliers";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["inv-suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="The vendors you buy stock from."
        icon={Truck}
        action={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEdit(null);
              setForm({ name: "", phone: "", email: "" });
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        }
      />
      <PanelHelp
        id="suppliers"
        title="Suppliers"
        steps={[
          "Add the vendors you buy from.",
          "Pick a supplier when you record Stock In or raise a Purchase Order.",
        ]}
      />

      <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
        {suppliers.filter((s) => s.isActive).length === 0 ? (
          <p className="p-8 text-center text-sm text-base-content/40">
            No suppliers yet.
          </p>
        ) : (
          <ul className="divide-y divide-base-300/50">
            {suppliers
              .filter((s) => s.isActive)
              .map((s) => (
                <li
                  key={s._id}
                  className="flex items-center justify-between px-4 py-3 gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-base-content/50">
                      {s.phone || s.email || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.due != null && s.due > 0 && (
                      <Pill variant="warning">
                        <span className="tabular-nums">
                          Due {formatPrice(s.due)}
                        </span>
                      </Pill>
                    )}
                    <Button
                      variant="outline"
                      size="xs"
                      className="gap-1"
                      onClick={() => {
                        setPayFor(s);
                        setPayAmount(Math.max(0, s.due ?? 0));
                      }}
                    >
                      <Wallet className="w-3.5 h-3.5" /> Pay
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="gap-1"
                      onClick={() => {
                        setRetFor(s);
                        setRetLines([]);
                      }}
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Return
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Edit ${s.name}`}
                      onClick={() => {
                        setEdit(s);
                        setForm({
                          name: s.name,
                          phone: s.phone ?? "",
                          email: s.email ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-base-100 rounded-2xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-4">
              {edit ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="flex flex-col gap-3"
            >
              <AdminFormField label="Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </AdminFormField>
              <AdminFormField label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </AdminFormField>
              <AdminFormField label="Email">
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </AdminFormField>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={save.isPending}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payFor && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPayFor(null)}
        >
          <div
            className="bg-base-100 rounded-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-1">Pay {payFor.name}</h2>
            <p className="text-sm text-base-content/60 mb-3">
              Outstanding: {formatPrice(payFor.due ?? 0)}
            </p>
            <AdminFormField label="Amount">
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
              />
            </AdminFormField>
            <div className="mt-3">
              <AdminFormField label="Method">
                <select
                  className="select select-bordered select-sm w-full"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  {["cash", "bank", "upi", "cheque", "other"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </AdminFormField>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setPayFor(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={payAmount <= 0 || pay.isPending}
                onClick={() => pay.mutate()}
              >
                {pay.isPending ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return modal */}
      {retFor && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setRetFor(null)}
        >
          <div
            className="bg-base-100 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-1">Return to {retFor.name}</h2>
            <p className="text-sm text-base-content/60 mb-3">
              Sending stock back (damaged/wrong). Stock reduces; due lowers.
            </p>
            <div className="space-y-2">
              {retLines.map((l, i) => {
                const it = items.find((x) => x._id === l.inventoryItemId);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <ItemCombo
                      className="flex-1"
                      value={l.inventoryItemId}
                      onChange={(v) => {
                        const n = [...retLines];
                        n[i] = { ...l, inventoryItemId: v };
                        setRetLines(n);
                      }}
                      options={items.map((x) => ({ value: x._id, label: x.name }))}
                    />
                    <Input
                      type="number"
                      className="w-20"
                      placeholder={it?.purchaseUnit ?? "qty"}
                      value={l.qty}
                      onChange={(e) => {
                        const n = [...retLines];
                        n[i] = { ...l, qty: Number(e.target.value) };
                        setRetLines(n);
                      }}
                    />
                    <Input
                      type="number"
                      className="w-20"
                      placeholder="rate"
                      value={l.rate}
                      onChange={(e) => {
                        const n = [...retLines];
                        n[i] = { ...l, rate: Number(e.target.value) };
                        setRetLines(n);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setRetLines(retLines.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 text-error" />
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const f = items[0];
                  if (!f) return toast.error("No ingredients");
                  setRetLines([
                    ...retLines,
                    { inventoryItemId: f._id, qty: 0, rate: 0 },
                  ]);
                }}
              >
                <Plus className="w-4 h-4" /> Add item
              </Button>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setRetFor(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={retLines.length === 0 || ret.isPending}
                onClick={() => ret.mutate()}
              >
                {ret.isPending ? "Saving…" : "Record Return"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
