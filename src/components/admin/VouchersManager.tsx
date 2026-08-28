"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Percent,
  IndianRupee,
  Calendar,
  Phone,
  Layers,
  X,
  MessageCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import type { IVoucher } from "@/types";

export default function VouchersManager() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState<string>("100");
  const [minBillAmount, setMinBillAmount] = useState<string>("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [validTill, setValidTill] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [usageLimit, setUsageLimit] = useState<string>("");

  const { data, isLoading } = useQuery<{ vouchers: IVoucher[] }>({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vouchers");
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create voucher");
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher Created Successfully!");
      setModalOpen(false);
      setCode("");
      setDescription("");
      setDiscountValue("100");
      setMinBillAmount("");
      setMaxDiscountAmount("");
      setCustomerPhone("");
      setUsageLimit("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create voucher");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/vouchers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/vouchers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success("Voucher deleted");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    createMutation.mutate({
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      discountType,
      discountValue: val,
      minBillAmount: minBillAmount ? parseFloat(minBillAmount) : undefined,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
      customerPhone: customerPhone.trim() || undefined,
      validTill,
      usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
    });
  };

  const handleShareWhatsApp = (v: IVoucher) => {
    const discText =
      v.discountType === "flat"
        ? `₹${v.discountValue} FLAT OFF`
        : `${v.discountValue}% OFF${v.maxDiscountAmount ? ` (Max ₹${v.maxDiscountAmount})` : ""}`;
    const minBillText = v.minBillAmount ? `\n📌 *Min Bill:* ₹${v.minBillAmount}` : "";
    const expiryText = format(new Date(v.validTill), "dd MMM yyyy");

    const message = `🍽️ *Special Gift from Ashoka Hotel!* 🏨✨\n\nEnjoy an exclusive discount on your next visit:\n\n🎟️ *Coupon Code:* *${v.code}*\n💰 *Offer:* *${discText}*${minBillText}\n📅 *Valid Till:* *${expiryText}*\n\n👉 Show this message at the reception to redeem your discount!\nWe look forward to serving you! 🎉`;

    let waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    if (v.customerPhone) {
      const cleanPhone = v.customerPhone.replace(/\D/g, "");
      const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${encodeURIComponent(message)}`;
    }

    window.open(waUrl, "_blank");
  };

  const vouchers = data?.vouchers || [];

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 font-playfair">
            Active Discount Vouchers & Coupons
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Create flat ₹ discounts or percentage % promos for cashier billing & WhatsApp dispatch
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600 font-bold rounded-xl text-xs h-9 gap-1.5 shadow-sm border-none"
        >
          <Plus className="w-4 h-4" /> Create Voucher
        </button>
      </div>

      {/* Vouchers Table Card */}
      <div className="card bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6 rounded-2xl">
        <div className="overflow-x-auto">
          <div className="min-w-[900px] flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-amber-50/70 border-b border-amber-200/60 text-xs font-black text-slate-700 uppercase tracking-wider items-center shrink-0">
              <div className="col-span-3">Coupon Code & Description</div>
              <div className="col-span-2">Discount Rule</div>
              <div className="col-span-3">Eligibility & Limits</div>
              <div className="col-span-2">Validity & Usage</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>

            {/* Rows */}
            <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-100">
              {isLoading && (
                <div className="py-12 text-center text-sm text-slate-500">
                  <span className="loading loading-spinner loading-md text-amber-500 mr-2" />
                  Loading vouchers...
                </div>
              )}

              {!isLoading && vouchers.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-600" />
                  <p className="font-bold text-slate-800">No Vouchers Created Yet</p>
                  <p className="text-xs mt-1 text-slate-500">
                    Click &quot;Create Voucher&quot; to issue your first restaurant promo code.
                  </p>
                </div>
              )}

              {vouchers.map((v) => (
                <div
                  key={v._id}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 hover:bg-amber-50/40 items-center transition-colors text-sm bg-white"
                >
                  {/* Code & Description */}
                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-warning badge-sm font-black font-mono tracking-wider text-slate-900 px-2.5 py-1">
                        {v.code}
                      </span>
                      {v.isActive ? (
                        <span className="badge bg-emerald-100 text-emerald-900 border border-emerald-300 badge-xs font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600 border border-slate-300 badge-xs font-bold">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 font-medium block truncate mt-1">
                      {v.description || "All-purpose restaurant coupon"}
                    </span>
                  </div>

                  {/* Discount Rule */}
                  <div className="col-span-2 min-w-0">
                    <span className="font-black text-sm text-emerald-700 block font-mono">
                      {v.discountType === "flat"
                        ? `₹${v.discountValue} FLAT OFF`
                        : `${v.discountValue}% OFF`}
                    </span>
                    {v.discountType === "percent" && v.maxDiscountAmount && (
                      <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                        Max Cap: ₹{v.maxDiscountAmount}
                      </span>
                    )}
                  </div>

                  {/* Eligibility */}
                  <div className="col-span-3 min-w-0 text-xs">
                    <span className="text-slate-700 font-medium block">
                      Min Bill: <strong className="text-amber-800 font-mono font-bold">₹{v.minBillAmount ?? 0}</strong>
                    </span>
                    {v.customerPhone ? (
                      <span className="text-amber-800 font-bold block text-xs font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-600" /> Exclusive: {v.customerPhone}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Open to all guests
                      </span>
                    )}
                  </div>

                  {/* Validity & Usage */}
                  <div className="col-span-2 text-xs font-mono">
                    <span className="text-slate-700 font-medium block text-xs">
                      Expires: <strong className="text-slate-900 font-bold">{format(new Date(v.validTill), "dd MMM yyyy")}</strong>
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Used: <strong className="text-amber-800 font-bold">{v.usedCount}</strong>
                      {v.usageLimit ? ` / ${v.usageLimit}` : " (Unlimited)"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 text-center flex items-center justify-center gap-1.5 flex-wrap">
                    {/* WhatsApp Share Button */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(v)}
                      className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1 border-none shadow-xs px-2.5"
                      title="Send on WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 fill-white" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: v._id, isActive: !v.isActive })
                      }
                      className={`btn btn-xs rounded-xl font-bold text-[10px] ${
                        v.isActive
                          ? "btn-outline border-slate-300 text-slate-700 hover:bg-slate-100"
                          : "btn-success text-white font-bold border-none"
                      }`}
                    >
                      {v.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete voucher ${v.code}?`)) {
                          deleteMutation.mutate(v._id);
                        }
                      }}
                      className="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE VOUCHER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900 font-playfair">
                  Create Discount Voucher
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Voucher Code */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Voucher Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. ASHOKA100, ANNIVERSARY20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 font-mono font-extrabold w-full uppercase rounded-xl focus:bg-white focus:border-amber-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% discount on marriage anniversary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "flat" | "percent")
                    }
                    className="select select-sm select-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500"
                  >
                    <option value="flat">₹ Flat Amount Off</option>
                    <option value="percent">% Percentage Off</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {discountType === "flat" ? "Amount (₹) *" : "Percent (%) *"}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 font-mono font-bold w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                    min={0}
                    step={discountType === "flat" ? "1" : "0.5"}
                    required
                  />
                </div>
              </div>

              {/* Min Bill & Max Cap */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Min Bill (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={minBillAmount}
                    onChange={(e) => setMinBillAmount(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                  />
                </div>

                {discountType === "percent" && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Max Discount Cap (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 200"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Customer Specific & Expiry Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Assign Mobile (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 font-mono w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Valid Till *
                  </label>
                  <input
                    type="date"
                    value={validTill}
                    onChange={(e) => setValidTill(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-sm btn-ghost text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs px-4"
                >
                  {createMutation.isPending ? "Creating..." : "Save Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
