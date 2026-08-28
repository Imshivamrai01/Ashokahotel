"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LocationSchema } from "@/lib/validations";
import PageHeader from "@/components/PageHeader";
import ModalShell from "@/components/admin/ModalShell";
import { AdminFormField } from "@/components/admin/AdminFormField";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/Skeletons";
import { MapPin, Plus, Pencil, Check, QrCode } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { QRCodeManager } from "@/components/admin/QRCodeManager";
import type { QRLocation, QRBranding } from "@/components/admin/QRCodeManager";
import { naturalSortLocations } from "@/lib/location-utils";

type LocationInput = z.infer<typeof LocationSchema>;
interface Location extends LocationInput {
  _id: string;
  code: string;
  isOccupied: boolean;
}

export default function LocationsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"manage" | "qr">("manage");

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["admin-locations"],
    queryFn: () => fetch("/api/admin/locations").then((r) => r.json()),
  });

  const { data: branding } = useQuery<QRBranding>({
    queryKey: ["admin-branding-qr"],
    queryFn: () => fetch("/api/admin/branding").then((r) => r.json()),
  });

  // Map Location[] → QRLocation[]
  const qrLocations: QRLocation[] = locations.map((l) => ({
    id: l._id,
    label: l.label,
    code: l.code,
    type: l.type as "table" | "room",
    floor: l.floor,
    isActive: l.isActive,
  }));

  const appUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin)
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(LocationSchema) as any,
  });

  const openAdd = () => {
    setEditTarget(null);
    reset({ label: "", type: "table", floor: "", isActive: true });
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

  const openEdit = (loc: Location) => {
    setEditTarget(loc);
    reset({
      label: loc.label,
      type: loc.type,
      floor: loc.floor ?? "",
      capacity: loc.capacity,
      isActive: loc.isActive,
    });
    setOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/locations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin-locations"] });
      const prev = qc.getQueryData<Location[]>(["admin-locations"]);
      qc.setQueryData<Location[]>(["admin-locations"], (old) =>
        old ? old.filter((l) => l._id !== id) : [],
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success("Location deleted");
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["captain-locations"] });
    },
    onError: (e: Error, _id, ctx) => {
      toast.error(e.message);
      if (ctx?.prev) qc.setQueryData(["admin-locations"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["captain-locations"] });
    },
  });

  // Manual occupied/free override — fixes a stuck table without going via cashier.
  const occupyMutation = useMutation({
    mutationFn: async ({
      id,
      isOccupied,
    }: {
      id: string;
      isOccupied: boolean;
    }) => {
      const res = await fetch(`/api/admin/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOccupied }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    },
    onSuccess: () => {
      toast.success("Table status updated");
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = async (data: LocationInput) => {
    const url = editTarget
      ? `/api/admin/locations/${editTarget._id}`
      : "/api/admin/locations";
    const res = await fetch(url, {
      method: editTarget ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Save failed");
      return;
    }
    toast.success(editTarget ? "Updated" : "Location created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-locations"] });
  };

  const tables = naturalSortLocations(locations.filter((l) => l.type === "table"));
  const rooms = naturalSortLocations(locations.filter((l) => l.type === "room"));

  return (
    <div>
      <PageHeader
        title="Locations & QR Codes"
        subtitle={`${locations.length} locations`}
        icon={MapPin}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Locations" },
        ]}
        action={
          activeTab === "manage" ? (
            <Button size="sm" className="gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Location
            </Button>
          ) : null
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-base-300">
        <button
          onClick={() => setActiveTab("manage")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === "manage" ? "border-primary text-primary" : "border-transparent text-base-content/50 hover:text-base-content"}`}
        >
          <MapPin className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          Manage Locations
        </button>
        <button
          onClick={() => setActiveTab("qr")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === "qr" ? "border-primary text-primary" : "border-transparent text-base-content/50 hover:text-base-content"}`}
        >
          <QrCode className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          QR Generator
        </button>
      </div>

      {activeTab === "qr" ? (
        <QRCodeManager
          locations={qrLocations}
          branding={branding ?? null}
          appUrl={appUrl}
        />
      ) : isLoading ? (
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4">
          <TableSkeleton rows={5} cols={4} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[
            { label: "Tables", items: tables },
            { label: "Rooms", items: rooms },
          ].map(
            ({ label: groupLabel, items }) =>
              items.length > 0 && (
                <div
                  key={groupLabel}
                  className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden"
                >
                  <div className="px-4 pt-4 pb-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                    {groupLabel}
                  </div>
                  <div className="overflow-x-auto">
                  <table className="table table-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-base-300/60">
                        <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                          Label
                        </th>
                        <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                          Code
                        </th>
                        <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                          Floor
                        </th>
                        <th className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
                          Capacity
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
                      {items.map((loc) => (
                        <tr
                          key={loc._id}
                          className="hover border-b border-base-300/50"
                        >
                          <td className="font-medium">{loc.label}</td>
                          <td>
                            <code className="text-xs bg-base-300 px-1.5 py-0.5 rounded">
                              {loc.code}
                            </code>
                          </td>
                          <td className="text-sm text-base-content/60">
                            {loc.floor ?? "—"}
                          </td>
                          <td className="text-sm">{loc.capacity ?? "—"}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                occupyMutation.mutate({
                                  id: loc._id,
                                  isOccupied: !loc.isOccupied,
                                })
                              }
                              disabled={occupyMutation.isPending}
                              title="Click to toggle occupied/free"
                              className="cursor-pointer"
                            >
                              <Pill
                                variant={
                                  loc.isOccupied
                                    ? "error"
                                    : loc.isActive
                                      ? "success"
                                      : "ghost"
                                }
                              >
                                {loc.isOccupied
                                  ? "Occupied"
                                  : loc.isActive
                                    ? "Free"
                                    : "Inactive"}
                              </Pill>
                            </button>
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEdit(loc)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <DeleteConfirmDialog
                                onConfirm={() => deleteMutation.mutate(loc._id)}
                                isPending={deleteMutation.isPending}
                                label={loc.label}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ),
          )}
          {locations.length === 0 && (
            <div className="text-center py-16 text-base-content/40">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No locations added yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "Edit Location" : "Add Location"}
        mode={editTarget ? "edit" : "add"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <AdminFormField
            label="Label"
            required
            error={errors.label ? String(errors.label.message) : undefined}
          >
            <Input
              {...register("label")}
              placeholder="e.g. Table 1 or Room 101"
              aria-invalid={!!errors.label}
            />
          </AdminFormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminFormField label="Type" required error={errors.type ? String(errors.type.message) : undefined}>
              <select
                {...register("type")}
                className="flex h-8 w-full items-center rounded-lg border border-input bg-base-100 px-2.5 text-sm text-base-content focus:border-amber-500 focus:outline-none"
              >
                <option value="table">🍽️ Table</option>
                <option value="room">🛏️ Room</option>
              </select>
            </AdminFormField>
            <AdminFormField label="Floor">
              <Input {...register("floor")} placeholder="e.g. Ground" />
            </AdminFormField>
            <AdminFormField label="Capacity">
              <Input
                {...register("capacity", { valueAsNumber: true })}
                type="number"
                min={1}
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
                <option value="false">Inactive</option>
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
