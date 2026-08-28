"use client";

import { useState, useEffect } from "react";
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  Users,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { IFollowUp, FollowUpType } from "@/types";

const TYPES: FollowUpType[] = [
  "call",
  "whatsapp",
  "email",
  "meeting",
  "site_visit",
];

const TYPE_ICONS: Record<FollowUpType, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  meeting: <Users className="w-3.5 h-3.5" />,
  site_visit: <MapPin className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<FollowUpType, string> = {
  call: "Phone Call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
  site_visit: "Site Visit",
};

interface Props {
  leadId: string;
  followUps: IFollowUp[];
  onClose: () => void;
  onAdded: (f: IFollowUp) => void;
}

export default function FollowUpForm({
  leadId,
  followUps,
  onClose,
  onAdded,
}: Props) {
  const [form, setForm] = useState({
    type: "call" as FollowUpType,
    notes: "",
    outcome: "",
    nextFollowUpAt: "",
  });
  const [fuDate, setFuDate] = useState("");
  const [fuTime, setFuTime] = useState("10:00");
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
    if (!form.notes.trim()) {
      toast.error("Notes are required");
      return;
    }
    setSaving(true);
    try {
      const nextFollowUpAt = fuDate
        ? `${fuDate}T${fuTime || "10:00"}`
        : undefined;
      const res = await fetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nextFollowUpAt,
          outcome: form.outcome || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: IFollowUp = await res.json();
      toast.success("Follow-up logged");
      onAdded(saved);
      setForm({ type: "call", notes: "", outcome: "", nextFollowUpAt: "" });
      setFuDate("");
      setFuTime("10:00");
    } catch {
      toast.error("Failed to log follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl border border-base-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300 shrink-0">
          <h2 className="text-lg font-bold">Follow-up Log</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden">
          {/* Timeline */}
          {followUps.length > 0 && (
            <div className="p-5 border-b border-base-300 overflow-y-auto max-h-56">
              <p className="text-xs font-semibold text-base-content/40 uppercase mb-3">
                History
              </p>
              <ol className="relative border-l border-base-300 space-y-4 ml-2">
                {followUps.map((f) => (
                  <li key={f._id} className="ml-4">
                    <span className="absolute -left-1.75 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-info/20 ring-2 ring-info/30 text-info">
                      {TYPE_ICONS[f.type]}
                    </span>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-info">
                        {TYPE_LABELS[f.type]}
                      </span>
                      <span className="text-xs text-base-content/40">
                        {format(new Date(f.createdAt), "dd MMM yy, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm">{f.notes}</p>
                    {f.outcome && (
                      <p className="text-xs text-base-content/50 mt-0.5">
                        Outcome: {f.outcome}
                      </p>
                    )}
                    {f.nextFollowUpAt && (
                      <p className="text-xs text-warning mt-0.5">
                        Next:{" "}
                        {format(
                          new Date(f.nextFollowUpAt),
                          "dd MMM yy, h:mm a",
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Add new */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
            <p className="text-xs font-semibold text-base-content/40 uppercase">
              Log New Follow-up
            </p>

            {/* Type */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Type</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    className={`btn btn-xs gap-1 ${form.type === t ? "btn-info" : "btn-ghost border border-base-300"}`}
                  >
                    {TYPE_ICONS[t]}
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Notes *</span>
              </label>
              <textarea
                className="textarea textarea-bordered textarea-sm resize-none"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="What was discussed?"
              />
            </div>

            {/* Outcome */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text">Outcome</span>
              </label>
              <input
                className="input input-bordered input-sm"
                value={form.outcome}
                onChange={(e) => set("outcome", e.target.value)}
                placeholder="e.g. Interested, sent brochure"
              />
            </div>

            {/* Next follow-up */}
            <div className="form-control gap-1">
              <label className="label py-0">
                <span className="label-text flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-base-content/40" />
                  Next Follow-up
                </span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/30 pointer-events-none" />
                  <input
                    type="date"
                    className="input input-bordered input-sm w-full pl-8"
                    value={fuDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFuDate(e.target.value)}
                  />
                </div>
                <div className="relative w-32">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/30 pointer-events-none" />
                  <input
                    type="time"
                    className="input input-bordered input-sm w-full pl-8"
                    value={fuTime}
                    disabled={!fuDate}
                    onChange={(e) => setFuTime(e.target.value)}
                  />
                </div>
              </div>
              {fuDate && (
                <button
                  type="button"
                  className="text-xs text-base-content/40 hover:text-error self-start mt-0.5"
                  onClick={() => {
                    setFuDate("");
                    setFuTime("10:00");
                  }}
                >
                  Clear date
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end border-t border-base-300 pt-3">
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
                ) : (
                  "Log Follow-up"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
