"use client";

import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Printer,
  Receipt,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Heart,
  Cake,
  Gift,
  Tag,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { PaymentMethod, CustomerTier } from "@/types";
import type { TableBill } from "@/app/api/orders/cashier/route";
import DiscountControl, { useDiscount } from "@/components/pos/DiscountControl";
import { formatPrice } from "@/lib/utils";
import { TableReceiptContent } from "./TableReceipt";

interface PaymentModalProps {
  table: TableBill;
  branding?: {
    hotelName?: string;
    gstNumber?: string;
    logoUrl?: string;
  };
  onClose: () => void;
  onPaid: () => void;
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "cash", label: "Cash", icon: <Banknote className="w-3.5 h-3.5" /> },
  { value: "card", label: "Card", icon: <CreditCard className="w-3.5 h-3.5" /> },
  { value: "upi", label: "UPI", icon: <Smartphone className="w-3.5 h-3.5" /> },
];

export default function PaymentModal({
  table,
  branding,
  onClose,
  onPaid,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bill-${table?.tableLabel ?? "Table"}`,
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; } }`,
  });

  // ─── Customer CRM State ──────────────────────────────────────────────────
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [isMarried, setIsMarried] = useState(false);
  const [custDob, setCustDob] = useState("");
  const [custAnniversary, setCustAnniversary] = useState("");
  const [custTier, setCustTier] = useState<CustomerTier | null>(null);
  const [custVisits, setCustVisits] = useState<number>(0);
  const [custSpend, setCustSpend] = useState<number>(0);
  const [custLoading, setCustLoading] = useState(false);
  const [custFound, setCustFound] = useState(false);

  // ─── Voucher / Coupon State ──────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountType: "flat" | "percent";
    discountValue: number;
    discountAmount: number;
    description?: string;
  } | null>(null);

  // Bill-level manual discount control
  const rate = table.gstEnabled ? table.gstRatePercent / 100 : 0;
  const net = table.subtotal;
  const disc = useDiscount({
    net,
    rate,
    maxPercent: table.maxDiscountPercent,
    threshold: table.discountApprovalThresholdPercent,
    hasPin: table.managerPinSet,
    requiresReason: table.discountRequiresReason,
  });

  // Calculate total discount combining manual discount and applied voucher
  const voucherDiscount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const totalDiscount = Math.min(net, disc.calc.amount + voucherDiscount);
  const discountedNet = Math.max(0, net - totalDiscount);
  const tax = table.gstEnabled ? Math.round(discountedNet * rate * 100) / 100 : 0;
  const payable = Math.round((discountedNet + tax) * 100) / 100;

  // Cash "amount received": defaults to the amount due
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const amount = amountOverride ?? payable.toFixed(2);

  // Split payment state
  const [splitMode, setSplitMode] = useState(false);
  const [split1Method, setSplit1Method] = useState<PaymentMethod>("cash");
  const [split1Amount, setSplit1Amount] = useState<string>("");
  const [split2Method, setSplit2Method] = useState<PaymentMethod>("upi");

  const numAmount = parseFloat(amount) || 0;
  const change = numAmount - payable;

  const split1Num = parseFloat(split1Amount) || payable / 2;
  const split2Num = Math.max(0, Math.round((payable - split1Num) * 100) / 100);

  // ─── Auto-lookup customer on 10 digits ──────────────────────────────────
  const handlePhoneChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setCustPhone(cleaned);

    if (cleaned.length === 10) {
      setCustLoading(true);
      try {
        const res = await fetch(`/api/customers?phone=${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          if (data.customer) {
            const c = data.customer;
            setCustName(c.name || "");
            setCustEmail(c.email || "");
            setIsMarried(Boolean(c.isMarried));
            if (c.dob) setCustDob(new Date(c.dob).toISOString().slice(0, 10));
            if (c.anniversaryDate)
              setCustAnniversary(
                new Date(c.anniversaryDate).toISOString().slice(0, 10),
              );
            setCustTier(c.tier || "regular");
            setCustVisits(c.totalVisits || 1);
            setCustSpend(c.totalSpend || 0);
            setCustFound(true);
            toast.success(`Welcome back ${c.name}!`);
          } else {
            setCustFound(false);
            setCustTier("new");
            setCustVisits(0);
            setCustSpend(0);
          }
        }
      } catch {
        // quiet error
      } finally {
        setCustLoading(false);
      }
    } else {
      setCustFound(false);
      setCustTier(null);
    }
  };

  // ─── Apply Coupon Code ─────────────────────────────────────────────────
  const handleApplyCoupon = async (overrideCode?: string) => {
    const code = (overrideCode || couponCode).trim();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal: net,
          customerPhone: custPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to apply coupon");
        return;
      }
      setAppliedVoucher(data.voucher);
      setCouponCode(data.voucher.code);
      toast.success(
        `Coupon ${data.voucher.code} applied! Saved ${formatPrice(data.voucher.discountAmount)}`,
      );
    } catch {
      toast.error("Error validating coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedVoucher(null);
    setCouponCode("");
    toast.info("Coupon removed");
  };

  // ─── Settle Payment & Print Invoice ────────────────────────────────────
  const handlePay = async () => {
    if (!custPhone || custPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit Customer Mobile Number");
      return;
    }
    if (disc.calc.error) {
      toast.error(disc.calc.error);
      return;
    }
    if (!splitMode && numAmount < payable && method === "cash") {
      toast.error("Amount is less than total payable");
      return;
    }
    if (splitMode && split1Num <= 0) {
      toast.error("First payment amount must be greater than 0");
      return;
    }
    if (splitMode && split2Num <= 0) {
      toast.error("Split amounts must add up to the total");
      return;
    }
    setLoading(true);
    try {
      const basePayload = {
        action: "pay_table",
        tableId: table.tableId,
        printBill: true,
        customerPhone: custPhone,
        customerName: custName || "Guest",
        customerEmail: custEmail || undefined,
        customerTier: custTier || "new",
        isCustomerMarried: isMarried,
        customerDob: !isMarried && custDob ? custDob : undefined,
        customerAnniversary: isMarried && custAnniversary ? custAnniversary : undefined,
        voucherCode: appliedVoucher?.code || undefined,
        voucherDiscount: voucherDiscount,
        ...(voucherDiscount > 0 && !disc.calc.amount
          ? {
              discountType: appliedVoucher?.discountType,
              discountValue: appliedVoucher?.discountValue,
              discountReason: `Voucher: ${appliedVoucher?.code}`,
            }
          : disc.calc.payload),
      };

      const body = splitMode
        ? {
            ...basePayload,
            splitPayment: [
              { method: split1Method, amount: split1Num },
              { method: split2Method, amount: split2Num },
            ],
          }
        : {
            ...basePayload,
            paymentMethod: method,
            paymentAmount: numAmount,
          };

      const res = await fetch(`/api/orders/${table.anchorKotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process payment");
      }
      toast.success("Payment Recorded — Invoice Printed!");
      try {
        handlePrint();
      } catch (printErr) {
        console.error("Browser print error:", printErr);
      }
      onPaid();
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="bg-[#141414] text-white border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl max-h-[96vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base font-playfair text-white tracking-wide leading-tight">
                  Process Bill Payment
                </h2>
                <p className="text-[11px] text-white/60">
                  🪑 <strong className="text-white">{table.tableLabel}</strong> · {table.kots.length} KOT{table.kots.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white cursor-pointer"
              aria-label="Close payment modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 overflow-y-auto space-y-3 flex-1">
            {/* 1. CUSTOMER VERIFICATION & CRM SECTION */}
            <div className="bg-[#1c1c1c] border border-amber-400/30 rounded-2xl p-3 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customer Mobile Verification (Required)</span>
                </div>
                {custLoading && (
                  <span className="loading loading-spinner loading-xs text-amber-400" />
                )}
              </div>

              {/* Mobile Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/60 font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-400" /> Mobile Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={custPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="input input-sm input-bordered bg-[#262626] border-white/20 text-white font-mono font-bold w-full rounded-xl h-8 text-xs focus:border-amber-400"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/60 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3 text-amber-400" /> Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Guest Name"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="input input-sm input-bordered bg-[#262626] border-white/20 text-white font-bold w-full rounded-xl h-8 text-xs focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Loyalty Tag Banner if Existing Customer */}
              {custFound && (
                <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-white/90">
                      <strong>{custVisits}</strong> Visits · Total Spent:{" "}
                      <strong className="text-emerald-400">
                        {formatPrice(custSpend)}
                      </strong>
                    </span>
                  </div>
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Guest
                  </span>
                </div>
              )}

              {/* Email & Marital Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/60 font-semibold flex items-center gap-1">
                    <Mail className="w-3 h-3 text-white/40" /> Email ID (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="input input-sm input-bordered bg-[#262626] border-white/20 text-white w-full rounded-xl h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/60 font-semibold flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" /> Marital Status
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setIsMarried(false)}
                      className={`btn btn-xs rounded-lg font-bold h-8 min-h-0 text-[11px] ${
                        !isMarried
                          ? "bg-amber-400 text-black border-none"
                          : "btn-outline border-white/20 text-white"
                      }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMarried(true)}
                      className={`btn btn-xs rounded-lg font-bold h-8 min-h-0 text-[11px] ${
                        isMarried
                          ? "bg-rose-500 text-white border-none"
                          : "btn-outline border-white/20 text-white"
                      }`}
                    >
                      💍 Married
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic DOB or Anniversary Input */}
              <div className="pt-1">
                {isMarried ? (
                  <div className="space-y-1">
                    <label className="text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                      <Gift className="w-3 h-3 text-rose-400" /> Marriage Anniversary Date
                    </label>
                    <input
                      type="date"
                      value={custAnniversary}
                      onChange={(e) => setCustAnniversary(e.target.value)}
                      className="input input-sm input-bordered bg-[#262626] border-rose-500/40 text-white w-full rounded-xl h-8 text-xs"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                      <Cake className="w-3 h-3 text-amber-400" /> Date of Birth (DOB)
                    </label>
                    <input
                      type="date"
                      value={custDob}
                      onChange={(e) => setCustDob(e.target.value)}
                      className="input input-sm input-bordered bg-[#262626] border-amber-400/40 text-white w-full rounded-xl h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 2. VOUCHER / COUPON CODE SECTION */}
            <div className="bg-[#1c1c1c] border border-white/15 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white/90">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" /> Apply Voucher / Coupon Code
                </span>
                {appliedVoucher && (
                  <span className="badge badge-success badge-sm font-extrabold text-black flex items-center gap-1">
                    <Check className="w-3 h-3" /> {appliedVoucher.code} Active
                  </span>
                )}
              </div>

              {!appliedVoucher ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code (e.g. ASHOKA100)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    autoComplete="off"
                    spellCheck="false"
                    className="input input-sm bg-[#121212] border border-amber-400/40 text-amber-300 placeholder:text-white/40 font-mono font-extrabold text-xs w-full rounded-xl h-9 focus:border-amber-400 focus:bg-[#1a1a1a] focus:outline-none tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn btn-sm bg-amber-400 hover:bg-amber-300 disabled:bg-white/10 disabled:text-white/30 text-black font-extrabold rounded-xl text-xs h-9 min-h-0 px-4 shrink-0 border-none shadow-md"
                  >
                    {couponLoading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between text-xs shadow-inner">
                  <div>
                    <span className="font-extrabold text-emerald-300 font-mono text-sm">
                      🎟️ {appliedVoucher.code}
                    </span>
                    <span className="text-white/80 ml-2 font-medium">
                      (
                      {appliedVoucher.discountType === "flat"
                        ? `₹${appliedVoucher.discountValue} Flat Off`
                        : `${appliedVoucher.discountValue}% Off`}
                      )
                    </span>
                    <span className="text-emerald-400 font-extrabold block text-xs mt-0.5">
                      Discount: − {formatPrice(appliedVoucher.discountAmount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="btn btn-xs bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white font-extrabold rounded-lg border-none"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Bill summary — per KOT */}
            <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-2.5 space-y-1.5 max-h-28 overflow-y-auto">
              <p className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider">
                Order Breakdown ({table.kots.length} KOTs)
              </p>
              {table.kots.map((k, idx) => (
                <div
                  key={k._id || k.kotNumber || idx}
                  className="flex items-center justify-between text-xs border-b border-white/5 pb-1"
                >
                  <span className="font-mono text-amber-400 font-bold text-[11px]">
                    {k.kotNumber}
                  </span>
                  <span className="text-white/60 text-[11px]">
                    {k.items?.length ?? 0} items
                  </span>
                  <span className="font-mono text-white text-[11px]">
                    {formatPrice(k.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price calculations */}
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-white/70 text-[11px]">
                <span>Subtotal (Net)</span>
                <span className="text-white font-bold">{formatPrice(net)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-amber-400 text-[11px]">
                  <span>Total Discount</span>
                  <span className="font-bold">− {formatPrice(totalDiscount)}</span>
                </div>
              )}

              {table.gstEnabled && (
                <>
                  <div className="flex justify-between text-white/70 text-[11px]">
                    <span>GST ({table.gstRatePercent}%)</span>
                    <span className="text-white">{formatPrice(tax)}</span>
                  </div>
                  {table.pricesIncludeTax && (
                    <p className="text-[9px] text-white/40">
                      Prices are GST-inclusive
                    </p>
                  )}
                </>
              )}
              <div className="flex justify-between items-baseline font-extrabold text-base border-t border-white/10 pt-1 text-white">
                <span className="text-xs font-bold">Total Payable</span>
                <span className="font-mono text-xl text-amber-400 font-extrabold">
                  {formatPrice(payable)}
                </span>
              </div>
            </div>

            {/* Manual Discount control (collapsible/accessible) */}
            <div className="scale-95 origin-top -my-1">
              <DiscountControl d={disc} />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide">
                  Payment Method
                </p>
                <button
                  type="button"
                  onClick={() => setSplitMode((v) => !v)}
                  className={`btn btn-xs gap-1 font-bold rounded-lg text-[10px] h-6 min-h-0 ${
                    splitMode
                      ? "bg-amber-400 text-black border-none"
                      : "btn-outline border-white/20 text-white hover:bg-white/10"
                  }`}
                >
                  <Split className="w-2.5 h-2.5" />
                  {splitMode ? "Split Active" : "Split"}
                </button>
              </div>

              {!splitMode ? (
                <>
                  {/* Single Method Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_METHODS.map((pm) => {
                      const isSel = method === pm.value;
                      return (
                        <button
                          key={pm.value}
                          type="button"
                          onClick={() => setMethod(pm.value)}
                          className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 ${
                            isSel
                              ? "bg-amber-400 text-black border-amber-400 shadow-md"
                              : "bg-white/5 text-white border-white/15 hover:bg-white/10"
                          }`}
                        >
                          {pm.icon}
                          <span>{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Cash amount received input */}
                  {method === "cash" && (
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <label className="text-white/70 font-semibold">
                          Amount Received (₹)
                        </label>
                        {change >= 0 && (
                          <span className="font-bold text-emerald-400">
                            Change: {formatPrice(change)}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmountOverride(e.target.value)}
                        className="input input-sm input-bordered bg-[#202020] border-white/20 text-white font-mono font-bold text-sm w-full rounded-lg h-8"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  )}
                </>
              ) : (
                /* Split Payment Controls */
                <div className="space-y-2 p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold text-amber-400 uppercase">
                      Payment Part 1
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {PAYMENT_METHODS.map((pm) => (
                        <button
                          key={pm.value}
                          type="button"
                          onClick={() => setSplit1Method(pm.value)}
                          className={`btn btn-xs rounded-lg font-bold h-6 min-h-0 text-[10px] ${
                            split1Method === pm.value
                              ? "bg-amber-400 text-black border-none"
                              : "btn-outline border-white/20 text-white"
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      placeholder={`₹${(payable / 2).toFixed(2)}`}
                      value={split1Amount}
                      onChange={(e) => setSplit1Amount(e.target.value)}
                      className="input input-xs input-bordered bg-[#202020] border-white/20 text-white font-mono font-bold w-full rounded-lg h-7"
                      min={0}
                      max={payable}
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-extrabold text-amber-400 uppercase">
                        Part 2 (Remainder)
                      </p>
                      <span className="font-mono font-bold text-white text-[11px]">
                        {formatPrice(split2Num)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {PAYMENT_METHODS.map((pm) => (
                        <button
                          key={pm.value}
                          type="button"
                          onClick={() => setSplit2Method(pm.value)}
                          className={`btn btn-xs rounded-lg font-bold h-6 min-h-0 text-[10px] ${
                            split2Method === pm.value
                              ? "bg-amber-400 text-black border-none"
                              : "btn-outline border-white/20 text-white"
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Button */}
          <div className="p-3 border-t border-white/10 bg-white/3 flex shrink-0">
            <button
              onClick={handlePay}
              disabled={loading}
              className="btn bg-amber-400 hover:bg-amber-300 text-black font-extrabold flex-1 text-sm rounded-xl py-3 border-none shadow-lg cursor-pointer h-11 min-h-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Collect & Print Bill ({formatPrice(payable)})
            </button>
          </div>

          {/* Hidden printable receipt for direct thermal browser print */}
          <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <TableReceiptContent
              ref={printRef}
              data={{ tableLabel: table.tableLabel, kots: table.kots }}
              hotelName={branding?.hotelName}
              gstNumber={branding?.gstNumber}
              logoUrl={branding?.logoUrl}
              discountOverride={totalDiscount}
              taxOverride={tax}
              totalOverride={payable}
              paymentMethodOverride={
                splitMode
                  ? `Split (${split1Method.toUpperCase()} + ${split2Method.toUpperCase()})`
                  : method.toUpperCase()
              }
              isSettledOverride={true}
              customerName={custName || undefined}
              customerPhone={custPhone || undefined}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
