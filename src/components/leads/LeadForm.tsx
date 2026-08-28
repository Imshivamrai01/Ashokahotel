"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { ILead, LeadSource, LeadStatus, LeadPriority } from "@/types";

const SOURCES: LeadSource[] = [
  "walk_in",
  "call",
  "whatsapp",
  "website",
  "referral",
  "social",
  "other",
];
const STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "interested",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
  "cold",
];
const PRIORITIES: LeadPriority[] = ["low", "medium", "high"];

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: "Walk-in",
  call: "Phone Call",
  whatsapp: "WhatsApp",
  website: "Website",
  referral: "Referral",
  social: "Social Media",
  other: "Other",
};

interface Props {
  lead?: ILead | null;
  onClose: () => void;
  onSaved: (lead: ILead) => void;
}

export default function LeadForm({ lead, onClose, onSaved }: Props) {
  const isEdit = !!lead;

  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: (lead?.source ?? "call") as LeadSource,
    interest: lead?.interest ?? "",
    budget: lead?.budget ?? "",
    status: (lead?.status ?? "new") as LeadStatus,
    priority: (lead?.priority ?? "medium") as LeadPriority,
    notes: lead?.notes ?? "",
    nextFollowUpAt: lead?.nextFollowUpAt
      ? lead.nextFollowUpAt.slice(0, 16)
      : "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.source || !form.interest) {
      toast.error("Name, phone, source and interest are required");
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/leads/${lead!._id}` : "/api/leads";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nextFollowUpAt: form.nextFollowUpAt || undefined,
          email: form.email || undefined,
          budget: form.budget || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: ILead = await res.json();
      toast.success(isEdit ? "Lead updated" : "Lead created");
      onSaved(saved);
    } catch {
      toast.error("Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl border border-base-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300 shrink-0">
          <h2 className="text-lg font-bold">
            {isEdit ? "Edit Lead" : "New Lead"}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 p-5 overflow-y-auto"
        >
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Name *</span>
              </label>
              <input
                className="input input-bordered input-sm"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Guest name"
              />
            </div>
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Phone *</span>
              </label>
              <input
                className="input input-bordered input-sm"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-control gap-1">
            <label className="label py-0">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              className="input input-bordered input-sm"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="optional"
            />
          </div>

          {/* Source + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Source *</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Priority</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interest + Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Interest *</span>
              </label>
              <input
                className="input input-bordered input-sm"
                value={form.interest}
                onChange={(e) => set("interest", e.target.value)}
                placeholder="e.g. Banquet Hall"
              />
            </div>
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Budget</span>
              </label>
              <input
                className="input input-bordered input-sm"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="e.g. ₹1,50,000"
              />
            </div>
          </div>

          {/* Status */}
          <div className="form-control gap-1">
            <label className="label py-0">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Next Follow-up */}
          <div className="form-control gap-1">
            <label className="label py-0">
              <span className="label-text">Next Follow-up</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered input-sm"
              value={form.nextFollowUpAt}
              onChange={(e) => set("nextFollowUpAt", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="form-control gap-1">
            <label className="label py-0">
              <span className="label-text">Notes</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-sm resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional info..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-base-300">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-info btn-sm"
              disabled={saving}
            >
              {saving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Lead"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
