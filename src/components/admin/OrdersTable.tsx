"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Filter, DownloadCloud } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { IOrder, OrderStatus } from "@/types";
import { pillCls } from "@/components/ui/Pill";
import type { PillVariant } from "@/components/ui/Pill";
import AdminOrderActions from "./AdminOrderActions";
import KotPrintButton from "./KotPrintButton";

interface BrandingLite {
  hotelName?: string;
  gstNumber?: string;
}

const STATUS_PILL: Record<string, PillVariant> = {
  pending: "error",
  preparing: "warning",
  partially_ready: "info",
  ready: "success",
  partially_delivered: "success",
  delivered: "ghost",
  paid: "success",
  cleared: "ghost",
  cancelled: "error",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "💵 Cash",
  card: "💳 Card",
  upi: "📱 UPI",
};

const STATUS_OPTIONS: (OrderStatus | "all")[] = [
  "all",
  "pending",
  "preparing",
  "partially_ready",
  "ready",
  "partially_delivered",
  "delivered",
  "paid",
  "cleared",
  "cancelled",
];

interface Filters {
  from: string;
  to: string;
  status: OrderStatus | "all";
  captainName: string;
  tableLabel: string;
}

async function fetchOrders(f: Filters): Promise<IOrder[]> {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to + "T23:59:59");
  if (f.status && f.status !== "all") p.set("status", f.status);
  const res = await fetch(`/api/orders?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

function exportCSV(orders: IOrder[]) {
  const rows = [
    [
      "KOT",
      "Table",
      "Captain",
      "Items",
      "Total",
      "Status",
      "Cancelled By",
      "Cancel Reason",
      "Payment",
      "Date",
    ],
    ...orders.map((o) => [
      o.kotNumber,
      o.tableLabel,
      o.captainName,
      o.items.length,
      o.total.toFixed(2),
      o.status,
      o.cancelledByName || o.voidedByName || "",
      o.cancelReason || o.voidReason || "",
      o.paymentMethod ?? "",
      format(new Date(o.createdAt), "dd MMM yyyy HH:mm"),
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrderRow({ order }: { order: IOrder }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: branding } = useQuery<BrandingLite>({
    queryKey: ["admin-branding-lite"],
    queryFn: () => fetch("/api/admin/branding").then((r) => r.json()),
    staleTime: 300_000,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  return (
    <>
      <tr className="hover border-b border-base-300">
        <td>
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="Expand order details"
          >
            {open ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </td>
        <td className="font-mono font-bold text-sm">{order.kotNumber}</td>
        <td>
          <span className="font-semibold text-sm">{order.tableLabel}</span>
          {order.customerName && (
            <p className="text-xs text-base-content/50">
              {order.customerName}
            </p>
          )}
        </td>
        <td className="text-sm">
          {order.captainName ? (
            <span className="badge badge-outline badge-sm">
              👤 {order.captainName}
            </span>
          ) : (
            <span className="text-base-content/40 text-xs">Direct</span>
          )}
          {order.placedByRole && order.placedByRole !== "captain" && (
            <span className="text-[10px] text-base-content/40 block">
              ({order.placedByRole})
            </span>
          )}
        </td>
        <td className="text-sm">{order.items.length} items</td>
        <td className="font-semibold text-sm">{formatPrice(order.total)}</td>
        <td>
          {order.status === "cancelled" ? (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black bg-rose-500/15 text-rose-600 border border-rose-500/30">
                🚫 Cancelled
              </span>
              {(order.cancelledByName || order.voidedByName) && (
                <span className="text-[11px] font-extrabold text-rose-700">
                  By: {order.cancelledByName || order.voidedByName}
                </span>
              )}
            </div>
          ) : (
            <span className={pillCls(STATUS_PILL[order.status] ?? "ghost")}>
              {order.status}
            </span>
          )}
        </td>
        <td className="text-xs text-base-content/50">
          {order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod] : "—"}
        </td>
        <td className="text-xs text-base-content/40">
          {format(new Date(order.createdAt), "dd MMM, HH:mm")}
        </td>
      </tr>
      {open && (
        <tr className="bg-base-200/60">
          <td colSpan={9} className="px-6 py-3">
            <div className="text-xs space-y-1">
              {order.specialInstructions && (
                <p className="text-amber-400 mb-2">
                  ⚠️ {order.specialInstructions}
                </p>
              )}

              {/* Cancellation Record Banner */}
              {(order.status === "cancelled" || order.cancelReason || order.voidReason) && (
                <div className="p-3 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 space-y-1">
                  <p className="font-extrabold text-xs flex items-center gap-1.5 text-rose-900">
                    🚫 Order Cancellation Details
                  </p>
                  <p className="text-xs font-semibold">
                    <strong>Reason:</strong> {order.cancelReason || order.voidReason || "Not specified"}
                  </p>
                  {(order.cancelledByName || order.voidedByName) && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      Cancelled by: <strong>{order.cancelledByName || order.voidedByName}</strong> {order.cancelledByRole || order.voidedByRole ? `(${order.cancelledByRole || order.voidedByRole})` : ""}
                      {order.cancelledAt && ` · at ${format(new Date(order.cancelledAt), "dd MMM yyyy, HH:mm")}`}
                    </p>
                  )}
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr className="text-base-content/40 border-b border-base-300">
                    <th className="text-left pb-1 font-normal">Item</th>
                    <th className="text-right pb-1 font-normal">Qty</th>
                    <th className="text-right pb-1 font-normal">Price</th>
                    <th className="text-right pb-1 font-normal">Status</th>
                    <th className="text-left pb-1 font-normal pl-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item._id} className="border-b border-base-300/30">
                      <td className="py-1 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${item.isVegetarian ? "bg-success" : "bg-error"}`}
                        />
                        {item.name}
                      </td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">
                        {formatPrice(item.price * item.quantity)}
                      </td>
                      <td className="text-right">
                        <span
                          className={pillCls(
                            STATUS_PILL[item.itemStatus] ?? "ghost",
                          )}
                        >
                          {item.itemStatus}
                        </span>
                      </td>
                      <td className="pl-4 text-base-content/40 italic">
                        {item.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.paymentMethod && (
                <p className="mt-2 text-base-content/50">
                  Paid: {PAYMENT_LABELS[order.paymentMethod]} · ₹
                  {order.paymentAmount?.toFixed(2)} ·{" "}
                  {order.paidAt ? format(new Date(order.paidAt), "HH:mm") : ""}
                </p>
              )}
              {order.reopenReason && (
                <p className="mt-1 text-warning/70">
                  ♻️ Reopened: {order.reopenReason}
                  {order.refundAmount
                    ? ` · refund ₹${order.refundAmount.toFixed(2)}`
                    : ""}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <AdminOrderActions order={order} onChanged={refresh} />
                <KotPrintButton order={order} hotelName={branding?.hotelName} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OrdersTableClient({
  initialCaptain = "",
}: {
  initialCaptain?: string;
}) {
  // Compute default dates outside render — stable initial values via useState initialiser
  const [filters, setFilters] = useState<Filters>(() => {
    const now = new Date();
    const ago = new Date(now);
    ago.setDate(ago.getDate() - 6);
    return {
      from: format(ago, "yyyy-MM-dd"),
      to: format(now, "yyyy-MM-dd"),
      status: "all",
      captainName: initialCaptain,
      tableLabel: "",
    };
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const {
    data: orders = [],
    isLoading,
    isError,
  } = useQuery<IOrder[]>({
    queryKey: ["admin-orders", filters],
    queryFn: () => fetchOrders(filters),
  });

  // Client-side captain / table filter (the API doesn't support those fields natively yet)
  const filtered = orders.filter((o) => {
    if (
      filters.captainName &&
      !(o.captainName ?? "").toLowerCase().includes(filters.captainName.toLowerCase())
    )
      return false;
    if (
      filters.tableLabel &&
      !o.tableLabel.toLowerCase().includes(filters.tableLabel.toLowerCase())
    )
      return false;
    return true;
  });

  const totalRevenue = filtered
    .filter((o) => ["paid", "cleared"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  const set = useCallback((key: keyof Filters, value: string) => {
    setPage(1);
    setFilters((p) => ({ ...p, [key]: value }));
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card bg-base-200 border border-base-300 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-sm font-medium text-base-content/60 mb-0.5">
            <Filter className="w-4 h-4" /> Filters
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">
              From
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
              className="input input-sm input-bordered w-36"
            />
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">
              To
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => set("to", e.target.value)}
              className="input input-sm input-bordered w-36"
            />
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                set("status", e.target.value as OrderStatus | "all")
              }
              className="select select-sm select-bordered w-40"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">
              Captain
            </label>
            <input
              type="text"
              value={filters.captainName}
              placeholder="Search captain…"
              onChange={(e) => set("captainName", e.target.value)}
              className="input input-sm input-bordered w-36"
            />
          </div>
          <div className="form-control gap-0.5">
            <label className="label-text text-xs text-base-content/50">
              Table
            </label>
            <input
              type="text"
              value={filters.tableLabel}
              placeholder="e.g. T5…"
              onChange={(e) => set("tableLabel", e.target.value)}
              className="input input-sm input-bordered w-28"
            />
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            className="btn btn-sm btn-outline gap-1.5 ml-auto"
          >
            <DownloadCloud className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 text-sm text-base-content/60 px-1">
        <span>
          <span className="font-bold text-base-content">{filtered.length}</span>{" "}
          orders
        </span>
        <span>·</span>
        <span>
          Revenue (paid):{" "}
          <span className="font-bold text-success">
            {formatPrice(totalRevenue)}
          </span>
        </span>
        {isLoading && (
          <span className="loading loading-spinner loading-xs ml-2" />
        )}
      </div>

      {/* Table */}
      {isError && (
        <div className="alert alert-error text-sm">Failed to load orders.</div>
      )}
      <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 border-b border-base-300">
                <th />
                <th>KOT</th>
                <th>Table</th>
                <th>Captain</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-10 text-base-content/30 text-sm"
                  >
                    No orders match the selected filters.
                  </td>
                </tr>
              )}
              {paged.map((o) => (
                <OrderRow key={o._id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-base-content/50">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="join">
            <button
              className="join-item btn btn-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              «
            </button>
            {Array.from(
              { length: Math.min(totalPages, 10) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                className={`join-item btn btn-xs ${p === page ? "btn-primary" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            {totalPages > 10 && page > 10 && (
              <button className="join-item btn btn-xs btn-primary">
                {page}
              </button>
            )}
            <button
              className="join-item btn btn-xs"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
