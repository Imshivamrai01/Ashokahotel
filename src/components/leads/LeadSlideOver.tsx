"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  X,
  Phone,
  Mail,
  Tag,
  DollarSign,
  Calendar,
  MessageSquare,
  Edit2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { ILead, IFollowUp, LeadStatus } from "@/types";
import FollowUpForm from "./FollowUpForm";
import LeadForm from "./LeadForm";
import { Pill } from "@/components/ui/Pill";
import type { PillVariant } from "@/components/ui/Pill";

const STATUS_PILL: Record<LeadStatus, PillVariant> = {
  new: "info",
  contacted: "primary",
  interested: "accent",
  proposal_sent: "warning",
  negotiating: "secondary",
  won: "success",
  lost: "error",
  cold: "ghost",
};

const PRIORITY_PILL: Record<string, PillVariant> = {
  high: "error",
  medium: "warning",
  low: "ghost",
};

function isOverdue(lead: ILead) {
  return (
    lead.nextFollowUpAt &&
    new Date(lead.nextFollowUpAt) < new Date() &&
    !["won", "lost"].includes(lead.status)
  );
}

interface Props {
  lead: ILead;
  onClose: () => void;
  onLeadUpdated: (lead: ILead) => void;
}

export default function LeadSlideOver({ lead, onClose, onLeadUpdated }: Props) {
  const [followUps, setFollowUps] = useState<IFollowUp[]>([]);
  const [loadingFU, setLoadingFU] = useState(true);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showFollowUp && !showEdit) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, showFollowUp, showEdit]);

  useEffect(() => {
    fetch(`/api/leads/${lead._id}/followups`)
      .then((r) => r.json())
      .then(setFollowUps)
      .catch(() => toast.error("Failed to load follow-ups"))
      .finally(() => setLoadingFU(false));
  }, [lead._id]);

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
        <motion.aside
          key="panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-base-100 shadow-2xl flex flex-col border-l border-base-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-base-300 shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg leading-tight">{lead.name}</h2>
                {isOverdue(lead) && (
                  <span className="flex items-center gap-1 text-xs text-error font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> Overdue
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Pill variant={STATUS_PILL[lead.status]}>
                  {lead.status.replace(/_/g, " ")}
                </Pill>
                <Pill variant={PRIORITY_PILL[lead.priority] ?? "ghost"}>
                  {lead.priority.toUpperCase()}
                </Pill>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowEdit(true)}
                className="btn btn-ghost btn-sm btn-circle"
                title="Edit lead"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Contact info */}
            <div className="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">
                Contact
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-base-content/40 shrink-0" />
                <a href={`tel:${lead.phone}`} className="hover:text-info">
                  {lead.phone}
                </a>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-base-content/40 shrink-0" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="hover:text-info truncate"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
            </div>

            {/* Interest & Budget */}
            <div className="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">
                Details
              </p>
              <div className="flex items-start gap-2 text-sm">
                <Tag className="w-4 h-4 text-base-content/40 shrink-0 mt-0.5" />
                <span>{lead.interest}</span>
              </div>
              {lead.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-base-content/40 shrink-0" />
                  <span>{lead.budget}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-base-content/40 shrink-0" />
                <span className="text-base-content/60">
                  Added {format(new Date(lead.createdAt), "dd MMM yyyy")}
                </span>
              </div>
              {lead.nextFollowUpAt && (
                <div
                  className={`flex items-center gap-2 text-sm ${isOverdue(lead) ? "text-error font-semibold" : "text-base-content/60"}`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  Next:{" "}
                  {format(new Date(lead.nextFollowUpAt), "dd MMM yyyy, h:mm a")}
                </div>
              )}
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">
                  Notes
                </p>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            {/* Follow-up history */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-base-content/40">
                  Follow-up History ({followUps.length})
                </p>
                <button
                  onClick={() => setShowFollowUp(true)}
                  className="btn btn-info btn-xs gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  Log
                </button>
              </div>

              {loadingFU && (
                <div className="flex justify-center py-4">
                  <span className="loading loading-spinner loading-sm text-info" />
                </div>
              )}

              {!loadingFU && followUps.length === 0 && (
                <p className="text-xs text-base-content/30 text-center py-6">
                  No follow-ups logged yet
                </p>
              )}

              {!loadingFU && followUps.length > 0 && (
                <ol className="relative border-l border-base-300 space-y-4 ml-2">
                  {followUps.map((f) => (
                    <li key={f._id} className="ml-4">
                      <span className="absolute -left-1.5 flex items-center justify-center w-3 h-3 rounded-full bg-info/30 ring-2 ring-info/20" />
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-info capitalize">
                          {f.type.replace(/_/g, " ")}
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
              )}
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Follow-up form (opens on top of slide-over) */}
      {showFollowUp && (
        <FollowUpForm
          leadId={lead._id}
          followUps={followUps}
          onClose={() => setShowFollowUp(false)}
          onAdded={(f) => {
            setFollowUps((prev) => [f, ...prev]);
            if (f.nextFollowUpAt) {
              onLeadUpdated({ ...lead, nextFollowUpAt: f.nextFollowUpAt });
            }
            setShowFollowUp(false);
          }}
        />
      )}

      {/* Edit lead form */}
      {showEdit && (
        <LeadForm
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            onLeadUpdated(updated);
            setShowEdit(false);
          }}
        />
      )}
    </>
  );
}
