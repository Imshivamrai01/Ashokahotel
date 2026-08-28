"use client";

import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import {
  LayoutDashboard,
  ShoppingBag,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeletons";

interface DashboardData {
  metrics: {
    todayRevenue: number;
    todayOrderCount: number;
    yesterdayRevenue: number;
    yesterdayOrderCount: number;
    activeOrders: number;
    occupiedLocations: number;
    totalLocations: number;
  };
  locations: {
    _id: string;
    label: string;
    type: string;
    isOccupied: boolean;
    isActive: boolean;
  }[];
  activeOrdersList: {
    _id: string;
    kotNumber: string;
    tableLabel: string;
    items: unknown[];
    status: string;
    createdAt: string;
  }[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useQuery<DashboardData>({
      queryKey: ["admin-dashboard"],
      queryFn: fetchDashboard,
      refetchInterval: 30_000,
    });

  const tables = (data?.locations ?? []).filter((l) => l.type === "table");
  const rooms = (data?.locations ?? []).filter((l) => l.type === "room");
  const metrics = data?.metrics;

  const pctDelta = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : null;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const statCards = metrics
    ? [
        {
          label: "Today's Revenue",
          value: formatPrice(metrics.todayRevenue),
          icon: IndianRupee,
          color: "text-success",
          bg: "bg-success/10",
          delta: pctDelta(metrics.todayRevenue, metrics.yesterdayRevenue),
        },
        {
          label: "Today's Orders",
          value: metrics.todayOrderCount,
          icon: ShoppingBag,
          color: "text-primary",
          bg: "bg-primary/10",
          delta: pctDelta(metrics.todayOrderCount, metrics.yesterdayOrderCount),
        },
        {
          label: "Active Orders",
          value: metrics.activeOrders,
          icon: Clock,
          color: "text-warning",
          bg: "bg-warning/10",
          delta: null as number | null,
        },
        {
          label: "Locations",
          value: `${metrics.occupiedLocations} / ${metrics.totalLocations}`,
          icon: MapPin,
          color: "text-info",
          bg: "bg-info/10",
          sublabel: "occupied",
          delta: null as number | null,
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of operations"
        icon={LayoutDashboard}
        action={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-ghost btn-sm gap-1.5 text-base-content/50"
            title="Refresh now"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {dataUpdatedAt
              ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Refresh"}
          </button>
        }
      />

      {isError && (
        <div className="alert alert-error mb-6 text-sm">
          Failed to load dashboard data.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      {isLoading ? (
        <div className="mb-8">
          <StatCardsSkeleton count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-base-200 border border-base-300/60 p-5 flex flex-col gap-3 hover:border-base-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                  {s.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}
                >
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                {s.sublabel && (
                  <p className="text-xs text-base-content/40 mt-1 font-medium">
                    {s.sublabel}
                  </p>
                )}
                {s.delta != null && (
                  <p
                    className={`text-xs mt-1 font-semibold flex items-center gap-0.5 ${s.delta >= 0 ? "text-success" : "text-error"}`}
                  >
                    {s.delta >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {s.delta >= 0 ? "+" : ""}
                    {s.delta}% vs yesterday
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables Grid */}
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-base-content/70">
            <MapPin className="w-4 h-4 text-primary" />
            Tables
            <span className="ml-auto text-xs text-base-content/40 font-normal">
              {tables.length} total
            </span>
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {tables.map((t) => (
                <div
                  key={t._id}
                  className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition-colors ${
                    t.isOccupied
                      ? "bg-error/10 border-error/20 text-error"
                      : "bg-success/10 border-success/20 text-success"
                  }`}
                >
                  <p className="truncate">{t.label}</p>
                  <p className="text-[10px] opacity-60 mt-0.5 font-normal">
                    {t.isOccupied ? "Occupied" : "Free"}
                  </p>
                </div>
              ))}
              {tables.length === 0 && (
                <p className="col-span-4 text-xs text-base-content/30 text-center py-6">
                  No tables added yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rooms Grid */}
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-base-content/70">
            <MapPin className="w-4 h-4 text-info" />
            Rooms
            <span className="ml-auto text-xs text-base-content/40 font-normal">
              {rooms.length} total
            </span>
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {rooms.map((r) => (
                <div
                  key={r._id}
                  className={`rounded-xl p-2.5 text-center text-xs font-semibold border transition-colors ${
                    r.isOccupied
                      ? "bg-error/10 border-error/20 text-error"
                      : "bg-success/10 border-success/20 text-success"
                  }`}
                >
                  <p className="truncate">{r.label}</p>
                  <p className="text-[10px] opacity-60 mt-0.5 font-normal">
                    {r.isOccupied ? "Occupied" : "Free"}
                  </p>
                </div>
              ))}
              {rooms.length === 0 && (
                <p className="col-span-4 text-xs text-base-content/30 text-center py-6">
                  No rooms added yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Active Orders */}
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-5 lg:col-span-2">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-base-content/70">
            <Clock className="w-4 h-4 text-warning" />
            Active Orders
            <span className="ml-auto text-xs text-base-content/40 font-normal">
              {data?.activeOrdersList.length ?? 0} running
            </span>
          </h2>
          {isLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : !data?.activeOrdersList.length ? (
            <div className="flex flex-col items-center gap-2 text-success text-sm py-8">
              <CheckCircle2 className="w-8 h-8 opacity-60" />
              <span className="font-medium">All clear — no active orders</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="border-base-300/40">
                    <th className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                      KOT
                    </th>
                    <th className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeOrdersList.slice(0, 10).map((o) => (
                    <tr
                      key={o._id}
                      className="hover:bg-base-300/30 border-base-300/20"
                    >
                      <td className="font-mono text-xs font-bold text-primary">
                        #{o.kotNumber}
                      </td>
                      <td className="text-sm font-medium">{o.tableLabel}</td>
                      <td className="text-xs text-base-content/60">
                        {(o.items as unknown[]).length} items
                      </td>
                      <td>
                        <span className="badge badge-xs badge-outline capitalize">
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/40 font-mono">
                        {new Date(o.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
