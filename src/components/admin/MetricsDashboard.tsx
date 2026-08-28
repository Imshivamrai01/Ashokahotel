"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Users,
  ChefHat,
  CreditCard,
  ExternalLink,
  CalendarRange,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MetricsData {
  period: { from: string; to: string };
  totals: {
    totalOrders: number;
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    paidOrders: number;
    clearedOrders: number;
  };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  paymentBreakdown: { method: string; count: number; revenue: number }[];
  topItems: {
    name: string;
    count: number;
    revenue: number;
    isVegetarian: boolean;
  }[];
  captainVolume: { captain: string; orders: number; revenue: number }[];
  hourlyHeatmap: { hour: string; count: number }[];
  avgPrepMinutes: number | null;
  avgDeliveryMinutes: number | null;
}

const CHART_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
];
const PAYMENT_COLORS: Record<string, string> = {
  cash: "#22c55e",
  card: "#3b82f6",
  upi: "#a855f7",
  unknown: "#6b7280",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-row items-center gap-3.5 hover:border-amber-400/60 transition-all">
      <div className={`p-3 rounded-2xl shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-bold leading-tight">{label}</p>
        <p className="font-black text-lg sm:text-xl text-slate-900 leading-tight tracking-tight mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

async function fetchMetrics(from: string, to: string): Promise<MetricsData> {
  const res = await fetch(`/api/orders/metrics?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to load metrics");
  return res.json();
}

export default function MetricsDashboard() {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const isCustom = !!(customFrom && customTo && customFrom <= customTo);

  const from = isCustom
    ? customFrom
    : format(subDays(new Date(), rangeDays - 1), "yyyy-MM-dd");
  const to = isCustom ? customTo : format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, isError } = useQuery<MetricsData>({
    queryKey: ["metrics", from, to],
    queryFn: () => fetchMetrics(from, to),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <h2 className="text-base font-extrabold text-slate-900 font-playfair">
          Efficiency Metrics
        </h2>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1.5 flex-wrap justify-end">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setRangeDays(r.days);
                }}
                className={`btn btn-xs rounded-xl font-bold px-3 transition-all ${
                  !isCustom && rangeDays === r.days
                    ? "bg-amber-500 text-white shadow-sm border-none"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (!customFrom) {
                  setCustomFrom(
                    format(subDays(new Date(), 14), "yyyy-MM-dd"),
                  );
                  setCustomTo(format(new Date(), "yyyy-MM-dd"));
                }
              }}
              className={`btn btn-xs rounded-xl font-bold px-3 gap-1 ${
                isCustom
                  ? "bg-amber-500 text-white shadow-sm border-none"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50"
              }`}
            >
              <CalendarRange className="w-3 h-3" /> Custom
            </button>
          </div>

          {/* Custom date pickers */}
          {isCustom && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
              <input
                type="date"
                value={customFrom}
                max={customTo || format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="input input-bordered input-xs bg-slate-50 border-slate-300 text-slate-900 rounded-lg text-xs"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setCustomTo(e.target.value)}
                className="input input-bordered input-xs bg-slate-50 border-slate-300 text-slate-900 rounded-lg text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="loading loading-spinner loading-lg text-amber-600" />
        </div>
      ) : isError || !data ? (
        <div className="alert alert-error text-sm rounded-2xl">
          Failed to load metrics. Please refresh or try again later.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard
              label="Total Orders"
              value={data.totals.totalOrders.toString()}
              icon={ShoppingBag}
              color="bg-amber-50 border border-amber-200 text-amber-700"
            />
            <StatCard
              label="Revenue (Collected)"
              value={formatPrice(data.totals.totalRevenue)}
              sub={
                data.totals.totalRefunds > 0
                  ? `net ${formatPrice(data.totals.netRevenue)} after refunds`
                  : `${data.totals.paidOrders + data.totals.clearedOrders} collected`
              }
              icon={TrendingUp}
              color="bg-emerald-50 border border-emerald-200 text-emerald-700"
            />
            <StatCard
              label="Avg Prep Time"
              value={
                data.avgPrepMinutes != null ? `${data.avgPrepMinutes} min` : "—"
              }
              sub="per item (ordered → ready)"
              icon={Clock}
              color="bg-orange-50 border border-orange-200 text-orange-700"
            />
            <StatCard
              label="Avg Delivery"
              value={
                data.avgDeliveryMinutes != null
                  ? `${data.avgDeliveryMinutes} min`
                  : "—"
              }
              sub="ordered → delivered"
              icon={ChefHat}
              color="bg-sky-50 border border-sky-200 text-sky-700"
            />
            <StatCard
              label="Captains Active"
              value={data.captainVolume.length.toString()}
              icon={Users}
              color="bg-purple-50 border border-purple-200 text-purple-700"
            />
            <StatCard
              label="Payment Methods"
              value={data.paymentBreakdown.length.toString()}
              icon={CreditCard}
              color="bg-indigo-50 border border-indigo-200 text-indigo-700"
            />
          </div>

          {/* Revenue area chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold mb-4 text-slate-900 font-playfair">
              Revenue by Day (₹)
            </h3>
            {data.revenueByDay.length === 0 ? (
              <div className="flex items-center justify-center h-50 text-sm text-slate-400">
                No revenue data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={data.revenueByDay}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `₹${v}`}
                    width={55}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [
                      `₹${Number(val).toFixed(0)}`,
                      "Revenue",
                    ]}
                    labelFormatter={(l) =>
                      format(new Date(l as string), "dd MMM")
                    }
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0f172a",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top items */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-extrabold mb-3 text-slate-900 font-playfair">
                Top Items (qty)
              </h3>
              {data.topItems.length === 0 ? (
                <div className="flex items-center justify-center h-55 text-sm text-slate-400">
                  No orders yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.topItems.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 15, left: 10, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 9, fill: "#334155", fontWeight: 600 }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [Number(val), "Orders"]}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "#0f172a",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {data.topItems.slice(0, 8).map((item, i) => (
                        <Cell
                          key={i}
                          fill={item.isVegetarian ? "#059669" : "#d97706"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-2">
                <span>🟢 Veg</span> <span>🟠 Non-Veg</span>
              </p>
            </div>

            {/* Payment breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-extrabold mb-3 text-slate-900 font-playfair">
                Payment Methods
              </h3>
              {data.paymentBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-xs font-medium">
                  No paid orders yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.paymentBreakdown}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ method, percent }) =>
                        `${method} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {data.paymentBreakdown.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            PAYMENT_COLORS[entry.method] ??
                            CHART_COLORS[i % CHART_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        Number(val),
                        String(name),
                      ]}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "#0f172a",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Hourly heatmap as bar chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-extrabold mb-3 text-slate-900 font-playfair">
                Peak Hours
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.hourlyHeatmap}
                  margin={{ top: 0, right: 5, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 8, fill: "#64748b" }}
                    tickFormatter={(h) => {
                      const n = Number(h);
                      if (n === 0) return "12a";
                      if (n < 12) return `${n}a`;
                      if (n === 12) return "12p";
                      return `${n - 12}p`;
                    }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 8, fill: "#64748b" }} />
                  <Tooltip
                    labelFormatter={(h) => {
                      const n = Number(h);
                      const start =
                        n === 0
                          ? "12 AM"
                          : n < 12
                            ? `${n} AM`
                            : n === 12
                              ? "12 PM"
                              : `${n - 12} PM`;
                      const end =
                        n + 1 === 0
                          ? "12 AM"
                          : n + 1 < 12
                            ? `${n + 1} AM`
                            : n + 1 === 12
                              ? "12 PM"
                              : `${n + 1 - 12} PM`;
                      return `${start} – ${end}`;
                    }}
                    formatter={(v: unknown) => [Number(v), "Orders"]}
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#0f172a",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Captain volume table */}
          {data.captainVolume.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 font-playfair">
                  Captain Performance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm text-sm w-full">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-slate-700 font-black uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th>Captain</th>
                      <th className="text-right">Orders Taken</th>
                      <th className="text-right">Total Revenue</th>
                      <th className="text-right px-4">Sales Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.captainVolume.map((c, i) => {
                      const pct =
                        data.totals.totalOrders > 0
                          ? Math.round(
                              (c.orders / data.totals.totalOrders) * 100,
                            )
                          : 0;
                      return (
                        <tr
                          key={c.captain}
                          className="hover:bg-amber-50/40 cursor-pointer group transition-colors"
                          title={`View orders for ${c.captain}`}
                          onClick={() =>
                            router.push(
                              `/admin/orders?captain=${encodeURIComponent(c.captain)}`,
                            )
                          }
                        >
                          <td className="text-slate-400 font-bold px-4">{i + 1}</td>
                          <td className="font-extrabold text-slate-900">
                            <span className="flex items-center gap-1.5 group-hover:text-amber-800">
                              👨‍✈️ {c.captain}
                              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </span>
                          </td>
                          <td className="text-right font-mono font-bold text-slate-800">{c.orders}</td>
                          <td className="text-right font-mono font-black text-emerald-700">
                            {formatPrice(c.revenue)}
                          </td>
                          <td className="w-36 text-right px-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-20 border border-slate-200">
                                <div
                                  className="bg-amber-500 h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-600 w-8 tabular-nums">
                                {pct}%
                              </span>
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
      )}
    </div>
  );
}
