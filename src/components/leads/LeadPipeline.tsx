"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { AlertCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import type { ILead, LeadStatus } from "@/types";
import { Pill } from "@/components/ui/Pill";

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new", label: "New", color: "border-info" },
  { status: "contacted", label: "Contacted", color: "border-primary" },
  { status: "interested", label: "Interested", color: "border-accent" },
  { status: "proposal_sent", label: "Proposal Sent", color: "border-warning" },
  { status: "negotiating", label: "Negotiating", color: "border-secondary" },
  { status: "won", label: "Won 🎉", color: "border-success" },
  { status: "lost", label: "Lost", color: "border-error" },
  { status: "cold", label: "Cold ❄️", color: "border-base-300" },
];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-error",
  medium: "bg-warning",
  low: "bg-base-content/20",
};

function isOverdue(lead: ILead) {
  return (
    lead.nextFollowUpAt &&
    new Date(lead.nextFollowUpAt) < new Date() &&
    !["won", "lost"].includes(lead.status)
  );
}

// ─── Draggable Lead Card ─────────────────────────────────────────────────────
function LeadCard({
  lead,
  overlay = false,
}: {
  lead: ILead;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead._id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        bg-base-200 rounded-xl p-3 border border-base-300 cursor-grab active:cursor-grabbing select-none
        ${isDragging && !overlay ? "opacity-30" : ""}
        ${overlay ? "shadow-2xl rotate-1 scale-105" : "hover:border-info/40 transition-colors"}
        ${isOverdue(lead) ? "border-l-2 border-l-error" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="font-semibold text-sm leading-snug">{lead.name}</span>
        <span
          className={`w-2 h-2 rounded-full mt-1 shrink-0 ${PRIORITY_DOT[lead.priority]}`}
        />
      </div>
      <p className="text-xs text-base-content/50 truncate">{lead.interest}</p>
      {lead.budget && (
        <p className="text-xs text-base-content/40">{lead.budget}</p>
      )}
      <div className="flex items-center gap-2 mt-2 text-xs text-base-content/40">
        <Phone className="w-3 h-3" />
        <span>{lead.phone}</span>
        {lead.email && (
          <>
            <Mail className="w-3 h-3 ml-1" />
            <span className="truncate max-w-20">{lead.email}</span>
          </>
        )}
      </div>
      {lead.nextFollowUpAt && (
        <div
          className={`flex items-center gap-1 mt-1 text-xs ${isOverdue(lead) ? "text-error" : "text-base-content/40"}`}
        >
          {isOverdue(lead) && <AlertCircle className="w-3 h-3" />}
          {format(new Date(lead.nextFollowUpAt), "dd MMM, h:mm a")}
        </div>
      )}
    </div>
  );
}

// ─── Droppable Column ────────────────────────────────────────────────────────
function KanbanColumn({
  status,
  label,
  color,
  leads,
}: {
  status: LeadStatus;
  label: string;
  color: string;
  leads: ILead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const totalBudget = leads
    .filter((l) => l.budget)
    .reduce((acc, l) => {
      const num = parseFloat((l.budget ?? "0").replace(/[^0-9.]/g, ""));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);

  return (
    <div
      className={`flex flex-col w-60 shrink-0 rounded-2xl bg-base-200/50 border-t-4 ${color} ${isOver ? "ring-2 ring-info/40" : ""}`}
    >
      <div className="px-3 py-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{label}</span>
          <Pill variant="neutral">{leads.length}</Pill>
        </div>
        {totalBudget > 0 && (
          <p className="text-xs text-base-content/40 mt-0.5">
            ₹{totalBudget.toLocaleString("en-IN")}
          </p>
        )}
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 p-2 min-h-32 overflow-y-auto max-h-[calc(100vh-240px)]"
      >
        {leads.map((l) => (
          <LeadCard key={l._id} lead={l} />
        ))}
        {leads.length === 0 && (
          <div className="text-center text-xs text-base-content/20 mt-6">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────
interface Props {
  leads: ILead[];
  onLeadsChange: (leads: ILead[]) => void;
}

export default function LeadPipeline({ leads, onLeadsChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeLead = activeId ? leads.find((l) => l._id === activeId) : null;

  const byStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status),
    [leads],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newStatus = String(over.id) as LeadStatus;
    const lead = leads.find((l) => l._id === active.id);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    onLeadsChange(
      leads.map((l) => (l._id === lead._id ? { ...l, status: newStatus } : l)),
    );

    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert
      onLeadsChange(leads);
      toast.error("Failed to update status");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            leads={byStatus(col.status)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
