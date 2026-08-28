"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StaffUpdateSchema } from "@/lib/validations";
import PageHeader from "@/components/PageHeader";
import ModalShell from "@/components/admin/ModalShell";
import { AdminFormField } from "@/components/admin/AdminFormField";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Plus, Pencil, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ROLE_LABELS } from "@/lib/auth-constants";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/Skeletons";
import type { UserRole } from "@/types";
import type { z } from "zod";

type StaffInput = z.infer<typeof StaffUpdateSchema>;
interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string;
  pinSet?: boolean;
  isActive: boolean;
  lastLoginAt?: string;
}

const ROLE_PILL: Record<string, string> = {
  captain: "bg-info/15 text-info border-info/30",
  kitchen: "bg-warning/15 text-warning border-warning/30",
  cashier: "bg-success/15 text-success border-success/30",
  lead_manager: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function StaffPage() {
  const qc = useQueryClient();
  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["admin-staff"],
    queryFn: () => fetch("/api/admin/staff").then((r) => r.json()),
  });

  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(StaffUpdateSchema) as any,
  });

  const openAdd = () => {
    setEditTarget(null);
    reset({
      name: "",
      email: "",
      password: "",
      role: "captain",
      pin: "",
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

  const openEdit = (s: Staff) => {
    setEditTarget(s);
    reset({
      name: s.name,
      email: s.email,
      password: "",
      role: s.role as StaffInput["role"],
      pin: "",
      isActive: s.isActive,
    });
    setOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-staff"] });
      const prev = qc.getQueryData<Staff[]>(["admin-staff"]);
      qc.setQueryData<Staff[]>(["admin-staff"], (old) =>
        old ? old.filter((s) => s._id !== id) : [],
      );
      return { prev };
    },
    onSuccess: () => toast.success("Staff removed"),
    onError: (e: Error, _id, ctx) => {
      toast.error(e.message);
      if (ctx?.prev) qc.setQueryData(["admin-staff"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });

  const onSubmit = async (data: StaffInput) => {
    const url = editTarget
      ? `/api/admin/staff/${editTarget._id}`
      : "/api/admin/staff";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { ...data };
    if (!payload.password) delete payload.password;
    if (!payload.pin) delete payload.pin; // Don't send empty pin
    const res = await fetch(url, {
      method: editTarget ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Save failed");
      return;
    }
    if (data.pin && data.pin.trim()) {
      toast.success("✅ Staff saved & Security PIN set!");
    } else {
      toast.success(editTarget ? "Staff updated" : "Staff created");
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-staff"] });
  };

  return (
    <div>
      <PageHeader
        title="Staff Manager"
        subtitle={`${staff.length} staff members`}
        icon={Users}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Staff" },
        ]}
        action={
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        }
      />

      {isLoading ? (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4">
          <TableSkeleton rows={5} cols={5} />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No staff added yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead>
              <tr className="border-b border-base-300/60">
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Name
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Email
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Role
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Security PIN
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Status
                </th>
                <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Last Login
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-base-content/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id} className="hover border-b border-base-300/50">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-base-300 flex items-center justify-center text-xs font-bold">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-base-content/60">{s.email}</td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${ROLE_PILL[s.role] ?? "bg-base-300/50 text-base-content/40 border-base-300"}`}
                    >
                      {ROLE_LABELS[s.role as UserRole] ?? s.role}
                    </span>
                  </td>
                  <td>
                    {s.pinSet ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/15 text-success border border-success/30">
                        🔒 PIN Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-base-content/40 border border-dashed border-base-300">
                        No PIN
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {s.isActive ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-success" />
                      ) : null}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${s.isActive ? "bg-success/15 text-success border-success/30" : "bg-base-300/50 text-base-content/40 border-base-300"}`}
                      >
                        {s.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-base-content/40">
                    {s.lastLoginAt
                      ? new Date(s.lastLoginAt).toLocaleDateString("en-IN")
                      : "Never"}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <DeleteConfirmDialog
                        label={s.name}
                        description="This staff account will be permanently removed."
                        isPending={deleteMutation.isPending}
                        onConfirm={() => deleteMutation.mutate(s._id)}
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

      {/* Modal */}
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "Edit Staff" : "Add Staff"}
        mode={editTarget ? "edit" : "add"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <AdminFormField
            label="Full Name"
            required
            error={errors.name ? String(errors.name.message) : undefined}
          >
            <Input {...register("name")} aria-invalid={!!errors.name} />
          </AdminFormField>
          <AdminFormField
            label="Email"
            required
            error={errors.email ? String(errors.email.message) : undefined}
          >
            <Input
              {...register("email")}
              type="email"
              aria-invalid={!!errors.email}
            />
          </AdminFormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminFormField
              label="Password"
              hint={editTarget ? "(leave blank to keep)" : undefined}
              required={!editTarget}
              error={
                errors.password ? String(errors.password.message) : undefined
              }
            >
              <Input
                {...register("password")}
                type="password"
                aria-invalid={!!errors.password}
                placeholder={editTarget ? "••••••" : "Min 6 chars"}
              />
            </AdminFormField>
            <AdminFormField
              label="🔑 Security PIN (4–6 digits)"
              hint={editTarget?.pinSet ? "PIN already set · leave blank to keep" : "Required for order cancellation"}
              error={errors.pin ? String(errors.pin.message) : undefined}
            >
              <Input
                {...register("pin")}
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                aria-invalid={!!errors.pin}
                placeholder={editTarget?.pinSet ? "Enter new PIN to change" : "e.g. 1234"}
                className="tracking-widest font-mono text-center"
              />
              {editTarget?.pinSet && (
                <p className="text-[11px] text-success font-bold mt-1 flex items-center gap-1">
                  🔒 PIN is currently set for this staff member
                </p>
              )}
            </AdminFormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminFormField label="Role">
              <select
                {...register("role")}
                className={cn(
                  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                <option value="captain">Captain</option>
                <option value="kitchen">Kitchen</option>
                <option value="cashier">Cashier</option>
                <option value="lead_manager">Lead Manager</option>
                <option value="inventory_manager">Inventory Manager</option>
              </select>
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
                <option value="false">Disabled</option>
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
              {editTarget ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
