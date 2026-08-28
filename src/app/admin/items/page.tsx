"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ItemSchema } from "@/lib/validations";
import PageHeader from "@/components/PageHeader";
import ModalShell from "@/components/admin/ModalShell";
import { AdminFormField } from "@/components/admin/AdminFormField";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/Skeletons";
import ImageUploadField from "@/components/admin/ImageUploadField";
import VideoUploadField from "@/components/admin/VideoUploadField";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import { UtensilsCrossed, Plus, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPrice } from "@/lib/utils";
import type { z } from "zod";

type ItemInput = z.infer<typeof ItemSchema>;
interface Item extends Omit<ItemInput, "categoryId"> {
  _id: string;
  categoryId: string;
  slug?: string;
}
interface Category {
  _id: string;
  name: string;
}

export default function ItemsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["admin-items"],
    queryFn: async () => {
      const raw = await fetch("/api/admin/items").then((r) => r.json());
      // Normalize DB field names (isAvailable/isVegetarian) → schema names (isActive/isVeg)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return raw.map((item: any) => ({
        ...item,
        isActive: item.isAvailable ?? item.isActive ?? true,
        isVeg: item.isVegetarian ?? item.isVeg ?? false,
      }));
    },
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: () => fetch("/api/admin/categories").then((r) => r.json()),
  });

  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ItemSchema) as any,
  });
  const varArr = useFieldArray({ control, name: "variations" });
  const addonArr = useFieldArray({ control, name: "addons" });

  const imageUrl = watch("imageUrl");
  const videoUrl = watch("videoUrl");
  const categoryId = watch("categoryId");

  const openAdd = () => {
    setEditTarget(null);
    reset({
      name: "",
      price: 0,
      categoryId: categories[0]?._id ?? "",
      isVeg: true,
      isActive: true,
      preparationTtlMinutes: 15,
      taxRatePercent: 0,
      taxIncluded: false,
      tags: [],
      sortOrder: 0,
    });
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "n" &&
        !open &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        openAdd();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openEdit = (item: Item) => {
    setEditTarget(item);
    reset({ ...item, price: item.price });
    setOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-items"] });
      const prev = qc.getQueryData<Item[]>(["admin-items"]);
      qc.setQueryData<Item[]>(["admin-items"], (old) =>
        old ? old.filter((it) => it._id !== id) : [],
      );
      return { prev };
    },
    onSuccess: () => toast.success("Item deleted"),
    onError: (e: Error, _id, ctx) => {
      toast.error(e.message);
      if (ctx?.prev) qc.setQueryData(["admin-items"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-items"] }),
  });

  // Inline toggle active/inactive
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
    },
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ["admin-items"] });
      const prev = qc.getQueryData<Item[]>(["admin-items"]);
      qc.setQueryData<Item[]>(["admin-items"], (old) =>
        old ? old.map((i) => (i._id === id ? { ...i, isActive } : i)) : [],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-items"], ctx.prev);
      toast.error("Failed to update status");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-items"] }),
  });

  // Inline toggle veg/non-veg
  const vegMutation = useMutation({
    mutationFn: async ({ id, isVeg }: { id: string; isVeg: boolean }) => {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVeg }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
    },
    onMutate: async ({ id, isVeg }) => {
      await qc.cancelQueries({ queryKey: ["admin-items"] });
      const prev = qc.getQueryData<Item[]>(["admin-items"]);
      qc.setQueryData<Item[]>(["admin-items"], (old) =>
        old ? old.map((i) => (i._id === id ? { ...i, isVeg } : i)) : [],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-items"], ctx.prev);
      toast.error("Failed to update type");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-items"] }),
  });

  const onSubmit = async (data: ItemInput) => {
    const url = editTarget
      ? `/api/admin/items/${editTarget._id}`
      : "/api/admin/items";
    const res = await fetch(url, {
      method: editTarget ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message ?? json.error ?? "Save failed");
      return;
    }
    toast.success(editTarget ? "Item updated" : "Item created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-items"] });
  };

  const getCatName = (id: string) =>
    categories.find((c) => c._id === id)?.name ?? "—";
  const filtered =
    filterCat === "all"
      ? items
      : items.filter((i) => i.categoryId === filterCat);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Menu Items"
        subtitle={`${items.length} items`}
        icon={UtensilsCrossed}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Menu Items" },
        ]}
        action={
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => {
            setFilterCat("all");
            setPage(1);
          }}
          className={`btn btn-xs rounded-lg ${filterCat === "all" ? "btn-primary" : "btn-ghost"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => {
              setFilterCat(c._id);
              setPage(1);
            }}
            className={`btn btn-xs rounded-lg ${filterCat === c._id ? "btn-primary" : "btn-ghost"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4">
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No items found.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="table table-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-base-300/60">
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Item
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Category
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Price
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  TTL
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Veg
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Active
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => (
                <tr
                  key={item._id}
                  className="hover border-b border-base-300/50"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-base-300 flex items-center justify-center">
                          <UtensilsCrossed className="w-4 h-4 text-base-content/30" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-base-content/60">
                    {getCatName(item.categoryId)}
                  </td>
                  <td className="font-mono text-sm font-semibold">
                    {formatPrice(item.price)}
                  </td>
                  <td className="text-xs text-base-content/60">
                    {item.preparationTtlMinutes}m
                  </td>
                  <td>
                    {/* Veg/Non-veg pill toggle — same pattern as Active */}
                    <button
                      role="switch"
                      aria-checked={item.isVeg}
                      disabled={vegMutation.isPending}
                      onClick={() =>
                        vegMutation.mutate({ id: item._id, isVeg: !item.isVeg })
                      }
                      className={[
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                        "transition-colors duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        item.isVeg ? "bg-[#16a34a]" : "bg-[#92400e]",
                      ].join(" ")}
                      title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                    >
                      <span
                        className={[
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm",
                          "transition-transform duration-200 ease-in-out",
                          item.isVeg ? "translate-x-4" : "translate-x-0",
                        ].join(" ")}
                      />
                    </button>
                  </td>
                  <td>
                    {/* Active/Inactive pill toggle */}
                    <button
                      role="switch"
                      aria-checked={item.isActive}
                      disabled={toggleMutation.isPending}
                      onClick={() =>
                        toggleMutation.mutate({
                          id: item._id,
                          isActive: !item.isActive,
                        })
                      }
                      className={[
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                        "transition-colors duration-200 ease-in-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/60",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        item.isActive ? "bg-success" : "bg-base-300",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm",
                          "transition-transform duration-200 ease-in-out",
                          item.isActive ? "translate-x-4" : "translate-x-0",
                        ].join(" ")}
                      />
                    </button>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <DeleteConfirmDialog
                        onConfirm={() => deleteMutation.mutate(item._id)}
                        isPending={deleteMutation.isPending}
                        label={item.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-base-content/50">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="join">
            <button
              className="join-item btn btn-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`join-item btn btn-xs ${p === page ? "btn-primary" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="join-item btn btn-xs"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "Edit Item" : "Add Item"}
        mode={editTarget ? "edit" : "add"}
        maxWidth="sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Section: Basic Info ── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
              Basic Info
            </p>
            <AdminFormField
              label="Item Name"
              required
              error={errors.name ? String(errors.name.message) : undefined}
            >
              <Input
                {...register("name")}
                placeholder="e.g. Paneer Butter Masala"
                aria-invalid={!!errors.name}
              />
            </AdminFormField>
            <AdminFormField label="Description">
              <Textarea
                {...register("description")}
                rows={2}
                placeholder="Short description shown on the menu (optional)"
              />
            </AdminFormField>
          </div>

          {/* ── Section: Pricing & Category ── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
              Pricing & Category
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminFormField
                label="Price (₹)"
                required
                error={errors.price ? String(errors.price.message) : undefined}
              >
                <Input
                  {...register("price", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0"
                  aria-invalid={!!errors.price}
                />
              </AdminFormField>
              <AdminFormField label="Prep Time (min)" required>
                <Input
                  {...register("preparationTtlMinutes", {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min={1}
                  max={120}
                  placeholder="15"
                />
              </AdminFormField>
              <AdminFormField label="Price includes tax (future use)">
                <select
                  {...register("taxIncluded", {
                    setValueAs: (v) => v === "true" || v === true,
                  })}
                  className={cn(
                    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                    "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                >
                  <option value="false">No — price is tax-exclusive</option>
                  <option value="true">Yes — price includes tax</option>
                </select>
              </AdminFormField>
              <AdminFormField label="Tax % (future use)">
                <Input
                  {...register("taxRatePercent", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  placeholder="0"
                />
              </AdminFormField>
            </div>
            <AdminFormField
              label="Category"
              required
              error={
                errors.categoryId
                  ? String(errors.categoryId.message)
                  : undefined
              }
            >
              <CategoryCombobox
                options={categories}
                value={categoryId}
                onChange={(val) =>
                  setValue("categoryId", val, { shouldValidate: true })
                }
                hasError={!!errors.categoryId}
              />
            </AdminFormField>
          </div>

          {/* ── Section: Type & Visibility ── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
              Type & Visibility
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminFormField label="Food Type">
                <select
                  {...register("isVeg", {
                    setValueAs: (v) => v === "true" || v === true,
                  })}
                  className={cn(
                    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                    "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                >
                  <option value="true">🟢 Vegetarian</option>
                  <option value="false">🔴 Non-Vegetarian</option>
                </select>
              </AdminFormField>
              <AdminFormField label="Visibility">
                <select
                  {...register("isActive", {
                    setValueAs: (v) => v === "true" || v === true,
                  })}
                  className={cn(
                    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                    "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                >
                  <option value="true">✅ Active — shown on menu</option>
                  <option value="false">🚫 Hidden — not shown</option>
                </select>
              </AdminFormField>
            </div>
          </div>

          {/* ── Section: Image ── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
              Item Image
            </p>
            <ImageUploadField
              label="Photo"
              uploadType="item"
              value={imageUrl ?? ""}
              onChange={(url) =>
                setValue("imageUrl", url, { shouldDirty: true })
              }
            />
          </div>

          {/* ── Section: Video ── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
              Item Video
            </p>
            <VideoUploadField
              label="Clip"
              uploadType="item-video"
              maxSizeMB={4}
              value={videoUrl ?? ""}
              onChange={(url) =>
                setValue("videoUrl", url, { shouldDirty: true })
              }
              hint="Max 4 MB · plays when a guest taps the dish on the menu"
            />
          </div>

          {/* ── Section: Variations & Add-ons ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
                Variations (sizes)
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  varArr.append({ name: "", price: 0, recipeScale: 1 })
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {varArr.fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <Input
                  {...register(`variations.${i}.name`)}
                  placeholder="e.g. Half"
                  className="flex-1"
                />
                <Input
                  {...register(`variations.${i}.price`, { valueAsNumber: true })}
                  type="number"
                  placeholder="price"
                  className="w-24"
                />
                <Input
                  {...register(`variations.${i}.recipeScale`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  step="0.1"
                  placeholder="scale"
                  title="Recipe scale: Half=0.6, Full=1"
                  className="w-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => varArr.remove(i)}
                >
                  <Check className="hidden" />✕
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
                Add-ons
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => addonArr.append({ name: "", price: 0 })}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {addonArr.fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <Input
                  {...register(`addons.${i}.name`)}
                  placeholder="e.g. Extra cheese"
                  className="flex-1"
                />
                <Input
                  {...register(`addons.${i}.price`, { valueAsNumber: true })}
                  type="number"
                  placeholder="price"
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => addonArr.remove(i)}
                >
                  ✕
                </Button>
              </div>
            ))}
            <p className="text-[11px] text-base-content/40">
              Variation price replaces base price; scale adjusts ingredient use.
              Add-on stock mapping (ingredient + qty) can be set later.
            </p>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-2 pt-2 border-t border-base-300/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {editTarget ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
