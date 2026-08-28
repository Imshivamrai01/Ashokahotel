"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Search, Filter, UserCog, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ILead, LeadStatus, LeadSource } from "@/types";
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

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: "Walk-in",
  call: "Call",
  whatsapp: "WhatsApp",
  website: "Website",
  referral: "Referral",
  social: "Social",
  other: "Other",
};

interface StaffOption {
  _id: string;
  name: string;
  role: string;
}

export default function AdminLeadsClient() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("");
  const [filterSource, setFilterSource] = useState<LeadSource | "">("");
  const [filterManager, setFilterManager] = useState("");

  const {
    data: leads = [],
    isLoading,
    refetch,
  } = useQuery<ILead[]>({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: staffList = [] } = useQuery<StaffOption[]>({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 120_000,
  });

  const managers = staffList.filter((s) => s.role === "lead_manager");

  const filtered = useMemo(() => {
    let list = [...leads];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.interest.toLowerCase().includes(q),
      );
    }
    if (filterStatus) list = list.filter((l) => l.status === filterStatus);
    if (filterSource) list = list.filter((l) => l.source === filterSource);
    if (filterManager)
      list = list.filter((l) => l.leadManagerId === filterManager);
    return list;
  }, [leads, search, filterStatus, filterSource, filterManager]);

  // Funnel stats
  const funnelStats = useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      interested: 0,
      proposal_sent: 0,
      negotiating: 0,
      won: 0,
      lost: 0,
      cold: 0,
    };
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const handleReassign = async (leadId: string, assignedTo: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lead reassigned");
      refetch();
    } catch {
      toast.error("Failed to reassign");
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
      "Manager ID",
      "Next Follow-up",
      "Created",
    ];
    const rows = filtered.map((l) => [
      l.name,
      l.phone,
      l.email ?? "",
      SOURCE_LABELS[l.source],
      l.interest,
      l.budget ?? "",
      l.status,
      l.priority,
      l.leadManagerId,
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
    a.download = `all-leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overdueCount = leads.filter(
    (l) =>
      l.nextFollowUpAt &&
      new Date(l.nextFollowUpAt) < new Date() &&
      !["won", "lost"].includes(l.status),
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Funnel Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {(Object.entries(funnelStats) as [LeadStatus, number][]).map(
          ([status, count]) => (
            <div
              key={status}
              className="bg-white rounded-2xl p-3 text-center border border-slate-200 shadow-sm hover:border-amber-400/60 transition-colors"
            >
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{count}</div>
              <div className="mt-1.5 flex justify-center">
                <Pill variant={STATUS_PILL[status]} className="capitalize font-bold">
                  {status.replace(/_/g, " ")}
                </Pill>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-rose-800 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="text-sm font-bold">
            {overdueCount} overdue follow-up{overdueCount > 1 ? "s" : ""} across
            all managers
          </span>
        </div>
      )}

      {/* Toolbar & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-wrap gap-2.5 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input input-sm input-bordered pl-9 w-full bg-slate-50 border-slate-300 text-slate-900 rounded-xl focus:bg-white focus:border-amber-500 font-medium"
            placeholder="Search leads by name, phone, interest…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Filters:</span>
          </div>
          <select
            className="select select-bordered select-sm bg-slate-50 border-slate-300 text-slate-900 rounded-xl font-bold text-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as LeadStatus | "")}
          >
            <option value="">All Statuses</option>
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
            className="select select-bordered select-sm bg-slate-50 border-slate-300 text-slate-900 rounded-xl font-bold text-xs"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as LeadSource | "")}
          >
            <option value="">All Sources</option>
            {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="select select-bordered select-sm bg-slate-50 border-slate-300 text-slate-900 rounded-xl font-bold text-xs"
            value={filterManager}
            onChange={(e) => setFilterManager(e.target.value)}
          >
            <option value="">All Managers</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl gap-1.5 border-none shadow-xs text-xs px-3"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <span className="text-xs font-bold text-slate-500 px-1">
            {filtered.length} leads
          </span>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="loading loading-spinner loading-md text-amber-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-200/60 text-slate-700 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Interest / Budget</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Next Follow-up</th>
                  <th className="text-right px-4">Reassign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center text-slate-400 py-12 text-sm font-medium"
                    >
                      No leads found matching your filter criteria.
                    </td>
                  </tr>
                )}
                {filtered.map((lead) => {
                  const overdue =
                    lead.nextFollowUpAt &&
                    new Date(lead.nextFollowUpAt) < new Date() &&
                    !["won", "lost"].includes(lead.status);
                  return (
                    <tr
                      key={lead._id}
                      className={
                        overdue
                          ? "bg-rose-50/40 border-l-4 border-rose-500"
                          : "hover:bg-amber-50/40 transition-colors"
                      }
                    >
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 text-sm">{lead.name}</span>
                        {overdue && (
                          <AlertCircle className="inline w-3.5 h-3.5 text-rose-600 ml-1.5 mb-0.5" />
                        )}
                      </td>
                      <td className="text-sm font-mono font-bold text-amber-800">{lead.phone}</td>
                      <td>
                        <span className="badge badge-sm bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {SOURCE_LABELS[lead.source]}
                        </span>
                      </td>
                      <td>
                        <div className="max-w-40 truncate text-xs font-bold text-slate-800">
                          {lead.interest}
                        </div>
                        {lead.budget && (
                          <div className="text-[11px] text-emerald-700 font-mono font-bold">
                            {lead.budget}
                          </div>
                        )}
                      </td>
                      <td>
                        <Pill variant={STATUS_PILL[lead.status]} className="capitalize font-bold">
                          {lead.status.replace(/_/g, " ")}
                        </Pill>
                      </td>
                      <td>
                        <span
                          className={`text-xs font-black uppercase ${
                            lead.priority === "high"
                              ? "text-rose-600"
                              : lead.priority === "medium"
                                ? "text-amber-600"
                                : "text-slate-500"
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td>
                        {lead.nextFollowUpAt ? (
                          <span
                            className={`text-xs font-medium ${
                              overdue ? "text-rose-600 font-bold" : "text-slate-600"
                            }`}
                          >
                            {format(
                              new Date(lead.nextFollowUpAt),
                              "dd MMM, h:mm a",
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="text-right px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <UserCog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <select
                            className="select select-bordered select-xs bg-slate-50 border-slate-300 text-slate-900 rounded-lg font-bold text-xs"
                            value={lead.assignedTo ?? lead.leadManagerId}
                            onChange={(e) =>
                              handleReassign(lead._id, e.target.value)
                            }
                          >
                            {managers.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
