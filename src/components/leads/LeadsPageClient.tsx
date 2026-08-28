"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  Users,
  LayoutGrid,
  Table2,
  Bell,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { ILead } from "@/types";
import LeadsTable from "./LeadsTable";
import LeadPipeline from "./LeadPipeline";

type Tab = "table" | "pipeline";

function LeadsPageInner({ staffName }: { staffName: string }) {
  const [tab, setTab] = useState<Tab>("table");
  const queryClient = useQueryClient();

  const {
    data: leads = [],
    isLoading,
    error,
  } = useQuery<ILead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to load leads");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Overdue count
  const overdueCount = leads.filter(
    (l) =>
      l.nextFollowUpAt &&
      new Date(l.nextFollowUpAt) < new Date() &&
      !["won", "lost"].includes(l.status),
  ).length;

  // Update browser tab title
  useEffect(() => {
    document.title =
      overdueCount > 0
        ? `⚡ ${overdueCount} Follow-up${overdueCount > 1 ? "s" : ""} Due — Ashoka Hotel Leads`
        : "Ashoka Hotel Leads";
    return () => {
      document.title = "Ashoka Hotel";
    };
  }, [overdueCount]);

  const handleLeadsChange = useCallback(
    (updated: ILead[]) => {
      queryClient.setQueryData(["leads"], updated);
    },
    [queryClient],
  );

  if (error) {
    toast.error("Failed to load leads");
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-300 px-4 py-3 flex items-center gap-2 shrink-0">
        <div className="p-2 rounded-xl bg-info/10 border border-info/20 shrink-0">
          <Users className="w-5 h-5 text-info" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-none truncate">
            Ashoka Hotel Leads
          </h1>
          <p className="text-xs text-base-content/40 mt-0.5 truncate">
            Welcome, {staffName}
          </p>
        </div>

        {/* Overdue badge — text hidden on xs */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 bg-error/10 border border-error/20 text-error rounded-lg px-2 py-1.5 shrink-0">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-semibold">
              {overdueCount} overdue
            </span>
            <span className="inline sm:hidden text-sm font-semibold">
              {overdueCount}
            </span>
          </div>
        )}

        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}
          className="btn btn-ghost btn-sm btn-circle shrink-0"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            signOut({ redirect: false }).then(() => {
              window.location.replace("/login");
            })
          }
          className="btn btn-ghost btn-sm gap-1 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      {/* Overdue reminder strip */}
      {overdueCount > 0 && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-2 flex items-center gap-2 text-sm text-error">
          <Bell className="w-4 h-4 shrink-0" />
          <span>
            You have <strong>{overdueCount}</strong> overdue follow-up
            {overdueCount > 1 ? "s" : ""} that need attention.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-base-100 border-b border-base-300 px-2 sm:px-4 flex items-center gap-1">
        <button
          onClick={() => setTab("table")}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "table"
              ? "border-info text-info"
              : "border-transparent text-base-content/50 hover:text-base-content"
          }`}
        >
          <Table2 className="w-4 h-4" />
          <span>Table</span>
        </button>
        <button
          onClick={() => setTab("pipeline")}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "pipeline"
              ? "border-info text-info"
              : "border-transparent text-base-content/50 hover:text-base-content"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Pipeline</span>
        </button>
        <span className="ml-auto text-xs text-base-content/30 pb-2 self-end hidden sm:block">
          {leads.length} total lead{leads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg text-info" />
          </div>
        ) : tab === "table" ? (
          <LeadsTable leads={leads} onLeadsChange={handleLeadsChange} />
        ) : (
          <LeadPipeline leads={leads} onLeadsChange={handleLeadsChange} />
        )}
      </main>
    </div>
  );
}

// ─── Export with QueryClientProvider ─────────────────────────────────────────
const qc = new QueryClient();

export default function LeadsPageClient({ staffName }: { staffName: string }) {
  return (
    <QueryClientProvider client={qc}>
      <LeadsPageInner staffName={staffName} />
    </QueryClientProvider>
  );
}
