"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ILead, LeadStatus, LeadSource, LeadPriority } from "@/types";
import LeadForm from "./LeadForm";
import FollowUpForm from "./FollowUpForm";
import LeadSlideOver from "./LeadSlideOver";
import type { IFollowUp } from "@/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-info/15 text-info border border-info/30",
  contacted: "bg-primary/15 text-primary border border-primary/30",
  interested: "bg-accent/15 text-accent border border-accent/30",
  proposal_sent: "bg-warning/15 text-warning border border-warning/30",
  negotiating: "bg-secondary/15 text-secondary border border-secondary/30",
  won: "bg-success/15 text-success border border-success/30",
  lost: "bg-error/15 text-error border border-error/30",
  cold: "bg-base-300/60 text-base-content/50 border border-base-300",
};

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  high: "bg-error/10 text-error border border-error/30",
  medium: "bg-warning/10 text-warning border border-warning/30",
  low: "bg-base-300/50 text-base-content/40 border border-base-300",
};

type SortKey = "name" | "status" | "priority" | "nextFollowUpAt" | "createdAt";

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === "asc" ? (
    <ChevronUp className="w-3 h-3 text-info" />
  ) : (
    <ChevronDown className="w-3 h-3 text-info" />
  );
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: "Walk-in",
  call: "Call",
  whatsapp: "WhatsApp",
  website: "Website",
  referral: "Referral",
  social: "Social",
  other: "Other",
};

function isOverdue(lead: ILead) {
  return (
    lead.nextFollowUpAt &&
    new Date(lead.nextFollowUpAt) < new Date() &&
    !["won", "lost"].includes(lead.status)
  );
}

interface Props {
  leads: ILead[];
  onLeadsChange: (leads: ILead[]) => void;
}

export default function LeadsTable({ leads, onLeadsChange }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("");
  const [filterSource, setFilterSource] = useState<LeadSource | "">("");
  const [filterPriority, setFilterPriority] = useState<LeadPriority | "">("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<ILead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<ILead | null>(null);
  const [followUps, setFollowUps] = useState<IFollowUp[]>([]);
  const [loadingFU, setLoadingFU] = useState(false);
  const [detailLead, setDetailLead] = useState<ILead | null>(null);

  const sorted = useMemo(() => {
    let list = [...leads];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.interest.toLowerCase().includes(q),
      );
    }
    if (filterStatus) list = list.filter((l) => l.status === filterStatus);
    if (filterSource) list = list.filter((l) => l.source === filterSource);
    if (filterPriority)
      list = list.filter((l) => l.priority === filterPriority);

    list.sort((a, b) => {
      const av: string = String(a[sortKey] ?? "");
      const bv: string = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [
    leads,
    search,
    filterStatus,
    filterSource,
    filterPriority,
    sortKey,
    sortDir,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openFollowUp = async (lead: ILead) => {
    setFollowUpLead(lead);
    setLoadingFU(true);
    try {
      const res = await fetch(`/api/leads/${lead._id}/followups`);
      if (res.ok) setFollowUps(await res.json());
    } catch {
      /* ignore */
    }
    setLoadingFU(false);
  };

  const handleInlineStatus = async (lead: ILead, status: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated: ILead = await res.json();
      onLeadsChange(leads.map((l) => (l._id === updated._id ? updated : l)));
    } catch {
      toast.error("Failed to update status");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Phone",
      "Email",
      "Source",
      "Interest",
      "Budget",
      "Status",
      "Priority",
      "Next Follow-up",
      "Created",
    ];
    const rows = sorted.map((l) => [
      l.name,
      l.phone,
      l.email ?? "",
      SOURCE_LABELS[l.source],
      l.interest,
      l.budget ?? "",
      l.status,
      l.priority,
      l.nextFollowUpAt
        ? format(new Date(l.nextFollowUpAt), "dd/MM/yyyy HH:mm")
        : "",
      format(new Date(l.createdAt), "dd/MM/yyyy"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Search + Add + CSV */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              className="input input-bordered input-sm pl-9 w-full"
              placeholder="Search name, phone, interest…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={exportCSV}
            className="btn btn-ghost btn-sm btn-circle"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-info btn-sm gap-1"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>

        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-4 h-4 text-base-content/40 shrink-0" />
          <select
            className="select select-bordered select-xs flex-1 min-w-24"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as LeadStatus | "")}
          >
            <option value="">All Status</option>
            {(
              [
                "new",
                "contacted",
                "interested",
                "proposal_sent",
                "negotiating",
                "won",
                "lost",
                "cold",
              ] as LeadStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered select-xs flex-1 min-w-24"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as LeadSource | "")}
          >
            <option value="">All Sources</option>
            {(
              [
                "walk_in",
                "call",
                "whatsapp",
                "website",
                "referral",
                "social",
                "other",
              ] as LeadSource[]
            ).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered select-xs flex-1 min-w-24"
            value={filterPriority}
            onChange={(e) =>
              setFilterPriority(e.target.value as LeadPriority | "")
            }
          >
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-sm table-zebra w-full">
          <thead>
            <tr>
              <th
                className="cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                <span className="flex items-center gap-1">
                  Name{" "}
                  <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
              <th>Phone / Email</th>
              <th className="hidden md:table-cell">Source</th>
              <th className="hidden sm:table-cell">Interest</th>
              <th
                className="cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                <span className="flex items-center gap-1">
                  Status{" "}
                  <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
              <th
                className="hidden sm:table-cell cursor-pointer select-none"
                onClick={() => toggleSort("priority")}
              >
                <span className="flex items-center gap-1">
                  Priority{" "}
                  <SortIcon
                    col="priority"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </span>
              </th>
              <th
                className="hidden lg:table-cell cursor-pointer select-none"
                onClick={() => toggleSort("nextFollowUpAt")}
              >
                <span className="flex items-center gap-1">
                  Next Follow-up{" "}
                  <SortIcon
                    col="nextFollowUpAt"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </span>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-base-content/40 py-12"
                >
                  No leads found
                </td>
              </tr>
            )}
            {sorted.map((lead) => (
              <tr
                key={lead._id}
                className={`cursor-pointer hover:bg-base-200/60 transition-colors ${
                  isOverdue(lead) ? "bg-error/5 border-l-2 border-error" : ""
                }`}
                onClick={() => setDetailLead(lead)}
              >
                <td>
                  <span className="font-medium">{lead.name}</span>
                  {isOverdue(lead) && (
                    <AlertCircle className="inline w-3.5 h-3.5 text-error ml-1" />
                  )}
                </td>
                <td>
                  <div className="text-sm">{lead.phone}</div>
                  {lead.email && (
                    <div className="text-xs text-base-content/40">
                      {lead.email}
                    </div>
                  )}
                </td>
                <td className="hidden md:table-cell">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-base-300/60 text-base-content/60 border border-base-300">
                    {SOURCE_LABELS[lead.source]}
                  </span>
                </td>
                <td className="hidden sm:table-cell">
                  <div className="max-w-32 truncate text-sm">
                    {lead.interest}
                  </div>
                  {lead.budget && (
                    <div className="text-xs text-base-content/40">
                      {lead.budget}
                    </div>
                  )}
                </td>
                <td>
                  <select
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer outline-none focus:outline-none ${STATUS_STYLES[lead.status]}`}
                    value={lead.status}
                    onChange={(e) =>
                      handleInlineStatus(lead, e.target.value as LeadStatus)
                    }
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(
                      [
                        "new",
                        "contacted",
                        "interested",
                        "proposal_sent",
                        "negotiating",
                        "won",
                        "lost",
                        "cold",
                      ] as LeadStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="hidden sm:table-cell">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[lead.priority]}`}
                  >
                    {lead.priority.charAt(0).toUpperCase() +
                      lead.priority.slice(1)}
                  </span>
                </td>
                <td className="hidden lg:table-cell">
                  {lead.nextFollowUpAt ? (
                    <span
                      className={`text-xs ${isOverdue(lead) ? "text-error font-semibold" : "text-base-content/60"}`}
                    >
                      {format(new Date(lead.nextFollowUpAt), "dd MMM, h:mm a")}
                    </span>
                  ) : (
                    <span className="text-xs text-base-content/30">—</span>
                  )}
                </td>
                <td>
                  <div
                    className="dropdown dropdown-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      tabIndex={0}
                      className="btn btn-ghost btn-xs btn-circle"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-10 menu menu-xs bg-base-100 rounded-box shadow border border-base-300 w-36"
                    >
                      <li>
                        <button
                          onClick={() => setEditLead(lead)}
                          className="flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => openFollowUp(lead)}
                          className="flex items-center gap-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Follow-up
                        </button>
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <LeadForm
          onClose={() => setShowAdd(false)}
          onSaved={(l) => {
            onLeadsChange([l, ...leads]);
            setShowAdd(false);
          }}
        />
      )}
      {editLead && (
        <LeadForm
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={(l) => {
            onLeadsChange(leads.map((x) => (x._id === l._id ? l : x)));
            setEditLead(null);
          }}
        />
      )}
      {followUpLead && !loadingFU && (
        <FollowUpForm
          leadId={followUpLead._id}
          followUps={followUps}
          onClose={() => {
            setFollowUpLead(null);
            setFollowUps([]);
          }}
          onAdded={(f) => {
            setFollowUps((prev) => [f, ...prev]);
            // update lead's nextFollowUpAt in list
            if (f.nextFollowUpAt) {
              onLeadsChange(
                leads.map((l) =>
                  l._id === followUpLead._id
                    ? { ...l, nextFollowUpAt: f.nextFollowUpAt }
                    : l,
                ),
              );
            }
          }}
        />
      )}
      {detailLead && (
        <LeadSlideOver
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onLeadUpdated={(updated) => {
            onLeadsChange(
              leads.map((l) => (l._id === updated._id ? updated : l)),
            );
            setDetailLead(updated);
          }}
        />
      )}
    </div>
  );
}
