"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Pencil,
  ArrowRightLeft,
  Banknote,
  Ban,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { billOrderTotals } from "@/lib/billing";
import DiscountControl, { useDiscount } from "@/components/pos/DiscountControl";
import AdminEditOrderModal from "./AdminEditOrderModal";
import type { IOrder, ILocation, OrderStatus, PaymentMethod } from "@/types";

interface BrandingPolicy {
  gstEnabled?: boolean;
  gstRatePercent?: number;
  pricesIncludeTax?: boolean;
  maxDiscountPercent?: number;
  discountRequiresReason?: boolean;
  discountApprovalThresholdPercent?: number;
  managerPinSet?: boolean;
}

const TERMINAL = ["cleared", "paid", "cancelled"];
const STATUS_CHOICES: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];
const METHODS: PaymentMethod[] = ["cash", "card", "upi"];

type Modal = "edit" | "status" | "pay" | "transfer" | "reopen" | null;

async function patchOrder(id: string, body: object) {
  const res = await fetch(`/api/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Action failed");
  }
}

export default function AdminOrderActions({
  order,
  onChanged,
}: {
  order: IOrder;
  onChanged: () => void;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [nextStatus, setNextStatus] = useState<OrderStatus>(order.status);

  const { data: locations = [] } = useQuery<ILocation[]>({
    queryKey: ["admin-loc-all"],
    queryFn: async () => {
      const r = await fetch("/api/locations", { cache: "no-store" });
      return r.ok ? r.json() : [];
    },
    enabled: modal === "transfer",
  });

  const { data: branding } = useQuery<BrandingPolicy>({
    queryKey: ["admin-branding-lite"],
    queryFn: () => fetch("/api/admin/branding").then((r) => r.json()),
    staleTime: 300_000,
  });

  // Bill-level discount for the admin collect flow (parity with the cashier).
  const rate = branding?.gstEnabled ? (branding.gstRatePercent ?? 0) / 100 : 0;
  const net = billOrderTotals(order.items, branding).subtotal;
  const disc = useDiscount({
    net,
    rate,
    maxPercent: branding?.maxDiscountPercent ?? 20,
    threshold: branding?.discountApprovalThresholdPercent ?? 10,
    hasPin: !!branding?.managerPinSet,
    requiresReason: branding?.discountRequiresReason ?? true,
  });
  const payable = disc.calc.payable;

  const isTerminal = TERMINAL.includes(order.status);
  const isReopenable = ["cleared", "paid"].includes(order.status);

  const runningRef = useRef(false);

  async function run(fn: () => Promise<void>, ok: string) {
    // Synchronous guard — `busy` state updates after re-render, so a fast second
    // click (e.g. two transfer tiles) could fire twice before `disabled` applies.
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setModal(null);
      setReason("");
      setRefund("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
      runningRef.current = false;
    }
  }

  return (
    <div className="mt-3 pt-2 border-t border-base-300/50">
      <div className="flex flex-wrap gap-1.5">
        {!isTerminal && (
          <>
            <button
              onClick={() => setModal("edit")}
              className="btn btn-xs btn-outline gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => {
                setNextStatus(order.status);
                setModal("status");
              }}
              className="btn btn-xs btn-outline gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" /> Status
            </button>
            <button
              onClick={() => setModal("pay")}
              className="btn btn-xs btn-outline btn-success gap-1"
            >
              <Banknote className="w-3 h-3" /> Collect
            </button>
            <button
              onClick={() => setModal("transfer")}
              className="btn btn-xs btn-outline btn-info gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" /> Transfer
            </button>
            <button
              onClick={() =>
                run(
                  () => patchOrder(order._id, { status: "cancelled" }),
                  "Order cancelled",
                )
              }
              disabled={busy}
              className="btn btn-xs btn-outline btn-error gap-1"
            >
              <Ban className="w-3 h-3" /> Cancel
            </button>
          </>
        )}
        {isReopenable && (
          <button
            onClick={() => setModal("reopen")}
            className="btn btn-xs btn-outline btn-warning gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reopen / Refund
          </button>
        )}
        {order.status === "cancelled" && (
          <span className="text-xs text-base-content/40 italic py-1">
            Cancelled — no actions
          </span>
        )}
      </div>

      {/* ── Edit ── */}
      {modal === "edit" && (
        <AdminEditOrderModal
          order={order}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            onChanged();
          }}
        />
      )}

      {/* ── Status ── */}
      {modal === "status" && (
        <Sheet title="Change status" onClose={() => setModal(null)}>
          <select
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
            className="select select-bordered w-full"
          >
            {STATUS_CHOICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={() =>
              run(
                () => patchOrder(order._id, { status: nextStatus }),
                "Status updated",
              )
            }
            className="btn btn-primary w-full mt-3"
          >
            Apply
          </button>
        </Sheet>
      )}

      {/* ── Collect payment ── */}
      {modal === "pay" && (
        <Sheet
          title={`Collect ${formatPrice(payable)}`}
          onClose={() => setModal(null)}
        >
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`btn btn-sm ${method === m ? "btn-success" : "btn-outline"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <DiscountControl d={disc} />
          </div>

          {disc.calc.amount > 0 && (
            <div className="mt-2 text-sm flex justify-between">
              <span className="text-warning">
                Discount
                {disc.type === "percent" ? ` (${disc.value}%)` : ""}
              </span>
              <span className="text-warning">
                − {formatPrice(disc.calc.amount)}
              </span>
            </div>
          )}
          <div className="mt-1 text-sm flex justify-between font-bold">
            <span>Total Payable</span>
            <span className="text-success">{formatPrice(payable)}</span>
          </div>

          <button
            disabled={busy || !!disc.calc.error}
            onClick={() =>
              run(
                () =>
                  patchOrder(order._id, {
                    action: "pay_and_clear",
                    paymentMethod: method,
                    paymentAmount: payable,
                    ...disc.calc.payload,
                  }),
                "Payment collected — table cleared",
              )
            }
            className="btn btn-success w-full mt-3"
          >
            Collect &amp; Clear
          </button>
        </Sheet>
      )}

      {/* ── Transfer ── */}
      {modal === "transfer" && (
        <Sheet title="Transfer to…" onClose={() => setModal(null)}>
          <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {locations
              .filter((l) => l._id !== order.tableId)
              .map((l) => (
                <button
                  key={l._id}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        patchOrderTransfer(order.tableId, l._id),
                      `Moved to ${l.label}`,
                    )
                  }
                  className={`rounded-xl border p-2 text-center text-xs ${l.isOccupied ? "border-error/40 bg-error/5" : "border-success/40 bg-success/5"}`}
                >
                  <div className="font-bold">
                    {l.type === "room" ? "🛏️" : "🍽️"} {l.label}
                  </div>
                  <div className="opacity-60 text-[10px]">
                    {l.isOccupied ? "Busy · merge" : "Free"}
                  </div>
                </button>
              ))}
          </div>
        </Sheet>
      )}

      {/* ── Reopen / refund ── */}
      {modal === "reopen" && (
        <Sheet title="Reopen / refund" onClose={() => setModal(null)}>
          <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-2">
            Un-clears this paid order, wipes payment, re-occupies the table.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            className="input input-bordered w-full mb-2"
          />
          <input
            value={refund}
            onChange={(e) => setRefund(e.target.value)}
            type="number"
            placeholder="Refund amount (optional)"
            className="input input-bordered w-full"
          />
          <button
            disabled={busy || !reason.trim()}
            onClick={() =>
              run(
                () =>
                  patchOrder(order._id, {
                    action: "reopen",
                    reason: reason.trim(),
                    ...(refund ? { refundAmount: parseFloat(refund) } : {}),
                  }),
                "Order reopened",
              )
            }
            className="btn btn-warning w-full mt-3"
          >
            Reopen
          </button>
        </Sheet>
      )}
    </div>
  );
}

async function patchOrderTransfer(fromTableId: string, toTableId: string) {
  const res = await fetch("/api/orders/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromTableId, toTableId }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Transfer failed");
  }
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl w-full max-w-sm shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}
