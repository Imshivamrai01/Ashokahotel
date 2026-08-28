"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CategorySchema } from "@/lib/validations";
import PageHeader from "@/components/PageHeader";
import ModalShell from "@/components/admin/ModalShell";
import { AdminFormField } from "@/components/admin/AdminFormField";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tag, Plus, Pencil, Check, GripVertical } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/Skeletons";
import type { z } from "zod";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type CategoryInput = z.infer<typeof CategorySchema>;
interface Category extends CategoryInput {
  _id: string;
}

const fetchCategories = async (): Promise<Category[]> => {
  const res = await fetch("/api/admin/categories");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

function SortableRow({
  cat,
  onEdit,
  onDelete,
  isDeleting,
}: {
  cat: Category;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat._id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? "relative" : undefined,
      }}
      className="hover border-b border-base-300/50"
    >
      <td
        className="text-base-content/30 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </td>
      <td className="font-medium">{cat.name}</td>
      <td className="text-sm text-base-content/60 max-w-xs truncate">
        {cat.description || "—"}
      </td>
      <td className="text-sm">{cat.sortOrder}</td>
      <td>
        <Pill variant={cat.isActive ? "success" : "ghost"}>
          {cat.isActive ? "Active" : "Hidden"}
        </Pill>
      </td>
      <td>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit(cat)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <DeleteConfirmDialog
            label={cat.name}
            description="This category will be permanently deleted."
            isPending={isDeleting}
            onConfirm={() => onDelete(cat._id)}
          />
        </div>
      </td>
    </tr>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CategorySchema) as any,
  });

  const openAdd = () => {
    setEditTarget(null);
    reset({
      name: "",
      description: "",
      sortOrder: categories.length,
      isActive: true,
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

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    reset({
      name: cat.name,
      description: cat.description ?? "",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-categories"] });
      const prev = qc.getQueryData<Category[]>(["admin-categories"]);
      qc.setQueryData<Category[]>(["admin-categories"], (old) =>
        old ? old.filter((c) => c._id !== id) : [],
      );
      return { prev };
    },
    onSuccess: () => toast.success("Category deleted"),
    onError: (e: Error, _id, ctx) => {
      toast.error(e.message);
      if (ctx?.prev) qc.setQueryData(["admin-categories"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sortOrder: number }[]) => {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    },
    onError: () => {
      toast.error("Reorder failed — please refresh");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = categories.findIndex((c) => c._id === active.id);
    const newIdx = categories.findIndex((c) => c._id === over.id);
    const reordered = arrayMove(categories, oldIdx, newIdx);

    // Optimistic update — assign correct sortOrder (1-based)
    const withNewOrder = reordered.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    qc.setQueryData<Category[]>(["admin-categories"], withNewOrder);

    // Single bulk request
    const updates = withNewOrder.map(({ _id, sortOrder }) => ({
      id: _id,
      sortOrder,
    }));
    reorderMutation.mutate(updates);
  };

  const onSubmit = async (data: CategoryInput) => {
    const url = editTarget
      ? `/api/admin/categories/${editTarget._id}`
      : "/api/admin/categories";
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
    toast.success(editTarget ? "Category updated" : "Category created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} categories`}
        icon={Tag}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Categories" },
        ]}
        action={
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        }
      />

      {isLoading ? (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4">
          <TableSkeleton rows={5} cols={4} />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No categories yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
          <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="table min-w-[640px]">
              <thead>
              <tr className="border-b border-base-300/60">
                <th className="w-8"></th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Name
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Description
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Order
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Status
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                  items={categories.map((c) => c._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categories.map((cat) => (
                    <SortableRow
                      key={cat._id}
                      cat={cat}
                      onEdit={openEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                  </SortableContext>
              </tbody>
            </table>
          </DndContext>
          </div>
        </div>
      )}

      {/* Modal */}
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "Edit Category" : "Add Category"}
        mode={editTarget ? "edit" : "add"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <AdminFormField
            label="Name"
            required
            error={errors.name ? String(errors.name.message) : undefined}
          >
            <Input
              {...register("name")}
              aria-invalid={!!errors.name}
              placeholder="e.g. Starters"
            />
          </AdminFormField>
          <AdminFormField label="Description">
            <Textarea
              {...register("description")}
              rows={2}
              placeholder="Short description (optional)"
            />
          </AdminFormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminFormField label="Sort Order">
              <Input
                {...register("sortOrder", { valueAsNumber: true })}
                type="number"
                min={0}
              />
            </AdminFormField>
            <AdminFormField label="Status">
              <select
                {...register("isActive", {
                  setValueAs: (v) => v === "true" || v === true,
                })}
                className={cn(
                  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </AdminFormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
              {editTarget ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
