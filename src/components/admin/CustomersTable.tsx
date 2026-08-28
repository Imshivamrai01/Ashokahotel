"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Search,
  Gift,
  Cake,
  Heart,
  Phone,
  Mail,
  Sparkles,
  Award,
  Calendar,
  Filter,
  MessageCircle,
  Tag,
  X,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import type { ICustomer, CustomerTier, IVoucher } from "@/types";

export default function CustomersTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "birthdays" | "anniversaries">("all");

  // Allot Voucher Modal State
  const [allotModalCustomer, setAllotModalCustomer] = useState<ICustomer | null>(null);
  const [allotCode, setAllotCode] = useState("");
  const [allotDescription, setAllotDescription] = useState("");
  const [allotDiscountType, setAllotDiscountType] = useState<"flat" | "percent">("flat");
  const [allotDiscountValue, setAllotDiscountValue] = useState("100");
  const [allotMinBill, setAllotMinBill] = useState("");
  const [allotMaxCap, setAllotMaxCap] = useState("");
  const [allotValidTill, setAllotValidTill] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  // WhatsApp Message Modal State
  const [waModalCustomer, setWaModalCustomer] = useState<ICustomer | null>(null);
  const [waMessageType, setWaMessageType] = useState<"greeting" | "birthday" | "anniversary" | "vip">("greeting");
  const [waCustomCode, setWaCustomCode] = useState("");

  const { data, isLoading } = useQuery<{
    customers: ICustomer[];
    stats: {
      totalCustomers: number;
      totalRevenue: number;
      vipCount: number;
      upcomingBirthdaysCount: number;
      upcomingAnniversariesCount: number;
    };
    upcomingBirthdays: ICustomer[];
    upcomingAnniversaries: ICustomer[];
  }>({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: templateData } = useQuery<{
    templates: { key: string; name: string; templateText: string }[];
  }>({
    queryKey: ["admin-crm-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crm-templates");
      if (!res.ok) return { templates: [] };
      return res.json();
    },
    staleTime: 300_000,
  });

  const [createdVoucherSuccess, setCreatedVoucherSuccess] = useState<{
    customer: ICustomer;
    voucher: IVoucher;
  } | null>(null);

  const createVoucherMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to assign voucher");
      return resData;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      toast.success(`Voucher ${resData.voucher?.code} assigned to ${allotModalCustomer?.name}!`);
      
      if (allotModalCustomer && resData.voucher) {
        setCreatedVoucherSuccess({
          customer: allotModalCustomer,
          voucher: resData.voucher,
        });
      }
      setAllotModalCustomer(null);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign voucher");
    },
  });

  const handleAllotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotModalCustomer) return;
    if (!allotCode.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }
    const val = parseFloat(allotDiscountValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid discount amount");
      return;
    }

    createVoucherMutation.mutate({
      code: allotCode.trim().toUpperCase(),
      description: allotDescription.trim() || `Exclusive gift for ${allotModalCustomer.name}`,
      discountType: allotDiscountType,
      discountValue: val,
      minBillAmount: allotMinBill ? parseFloat(allotMinBill) : 0,
      maxCapAmount: allotMaxCap ? parseFloat(allotMaxCap) : undefined,
      assignedCustomerId: allotModalCustomer._id,
      assignedCustomerName: allotModalCustomer.name,
      assignedCustomerPhone: allotModalCustomer.phone,
      validFrom: new Date(),
      validTill: new Date(allotValidTill + "T23:59:59"),
      maxUses: 1,
      isActive: true,
    });
  };

  const sendVoucherViaWhatsApp = (c: ICustomer, v: IVoucher) => {
    const discText =
      v.discountType === "flat"
        ? `₹${v.discountValue} FLAT OFF`
        : `${v.discountValue}% OFF${v.maxDiscountAmount ? ` (Max ₹${v.maxDiscountAmount})` : ""}`;
    const minBillText = v.minBillAmount ? `\n📌 *Min Bill:* ₹${v.minBillAmount}` : "";
    const expiryText = format(new Date(v.validTill), "dd MMM yyyy");

    const tpl = templateData?.templates.find((t) => t.key === "voucher")?.templateText;
    let message = "";
    if (tpl) {
      message = tpl
        .replace(/{name}/g, c.name || "Guest")
        .replace(/{hotel_name}/g, "Ashoka Hotel")
        .replace(/{code}/g, v.code)
        .replace(/{discount}/g, discText)
        .replace(/{min_bill}/g, String(v.minBillAmount ?? 0))
        .replace(/{valid_till}/g, expiryText);
    } else {
      message = `Namaste *${c.name}* ji! 🍽️✨\n\nGreetings from *Ashoka Hotel*! 🏨\nWe have created an exclusive gift voucher specially for you:\n\n🎟️ *Coupon Code:* *${v.code}*\n💰 *Offer:* *${discText}*${minBillText}\n📅 *Valid Till:* *${expiryText}*\n\n👉 Show this message to our reception on your next visit to redeem!\nWe look forward to serving you! 🎉`;
    }

    const cleanPhone = c.phone.replace(/\D/g, "");
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleSendQuickWhatsApp = () => {
    if (!waModalCustomer) return;
    const c = waModalCustomer;
    const tpl = templateData?.templates.find((t) => t.key === waMessageType)?.templateText;
    const voucherBlock = waCustomCode
      ? `🎁 *Special Coupon Code:* *${waCustomCode.toUpperCase()}*\n`
      : "";

    let message = "";
    if (tpl) {
      message = tpl
        .replace(/{name}/g, c.name || "Guest")
        .replace(/{hotel_name}/g, "Ashoka Hotel")
        .replace(/{code}/g, waCustomCode.toUpperCase() || "ASHOKA100")
        .replace(/{voucher_block}/g, voucherBlock);
    } else {
      if (waMessageType === "birthday") {
        message = `Dear *${c.name}* ji, 🎂💐\n\n*Happy Birthday* from the entire family at *Ashoka Hotel*! 🎊✨\n\nCelebrate your special day with delicious food! Come dine with us and enjoy an exclusive celebratory experience.\n${voucherBlock}\nWe wish you a wonderful year ahead! 🎉🥂`;
      } else if (waMessageType === "anniversary") {
        message = `Dear *${c.name}* ji, 💍💐\n\n*Happy Marriage Anniversary* from *Ashoka Hotel*! 🥂✨\n\nCelebrate your love and togetherness with a special candle-light dining experience at Ashoka Hotel.\n${voucherBlock}\nBook your table today or walk in! 🎉`;
      } else if (waMessageType === "vip") {
        message = `Namaste *${c.name}* ji! 🍽️✨\n\nThank you for choosing *Ashoka Hotel*! 🏨\n\nWe have a special treat prepared for your next visit with us.\n${voucherBlock}\nLooking forward to welcoming you soon! 🎉`;
      } else {
        message = `Namaste *${c.name}* ji! 🍽️✨\n\nGreetings from *Ashoka Hotel*! 🏨\nWe invite you to taste our new sizzling dishes and chef's specials.\n\n📍 *Ashoka Hotel*\nReservations & Room Service: Call us or walk in!\nHave a delightful day ahead! ✨`;
      }
    }

    const cleanPhone = c.phone.replace(/\D/g, "");
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${encodeURIComponent(message)}`, "_blank");
    setWaModalCustomer(null);
  };

  const openAllotModal = (c: ICustomer) => {
    setAllotModalCustomer(c);
    const suffix = c.phone.slice(-4);
    setAllotCode(`ASHOKA${suffix}`);
    setAllotDescription(`Special discount for ${c.name}`);
    setAllotDiscountType("flat");
    setAllotDiscountValue("100");
    setAllotMinBill("500");
    setAllotMaxCap("");
  };

  const openWaModal = (c: ICustomer, type: "greeting" | "birthday" | "anniversary" | "vip" = "greeting") => {
    setWaModalCustomer(c);
    setWaMessageType(type);
    setWaCustomCode("");
  };

  const rawList =
    tab === "birthdays"
      ? data?.upcomingBirthdays || []
      : tab === "anniversaries"
        ? data?.upcomingAnniversaries || []
        : data?.customers || [];

  const filtered = rawList.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchPhone = c.phone?.includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card bg-white border border-slate-200 p-4 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold tracking-wide">
              Total Guests
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="font-black text-2xl text-slate-900 mt-2">
            {data?.stats?.totalCustomers ?? 0}
          </span>
        </div>

        <div className="card bg-white border border-slate-200 p-4 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold tracking-wide">
              Total Guest Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="font-black text-2xl text-emerald-700 mt-2">
            {formatPrice(data?.stats?.totalRevenue ?? 0)}
          </span>
        </div>

        <div className="card bg-white border border-slate-200 p-4 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-bold tracking-wide">
              Upcoming Birthdays
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <span className="font-black text-2xl text-amber-700 mt-2">
            {data?.stats?.upcomingBirthdaysCount ?? 0}
          </span>
        </div>

        <div className="card bg-white border border-slate-200 p-4 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-700 font-bold tracking-wide">
              Upcoming Anniversaries
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <span className="font-black text-2xl text-rose-700 mt-2">
            {data?.stats?.upcomingAnniversariesCount ?? 0}
          </span>
        </div>
      </div>

      {/* 2. Filter Bar & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTab("all")}
            className={`btn btn-sm rounded-xl font-bold text-xs h-9 min-h-0 ${
              tab === "all"
                ? "bg-amber-500 text-white shadow-sm border-none"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
            }`}
          >
            All Guests ({data?.customers?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("birthdays")}
            className={`btn btn-sm rounded-xl font-bold text-xs h-9 min-h-0 ${
              tab === "birthdays"
                ? "bg-amber-500 text-white shadow-sm border-none"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200"
            }`}
          >
            🎂 Upcoming Birthdays ({data?.stats?.upcomingBirthdaysCount ?? 0})
          </button>
          <button
            onClick={() => setTab("anniversaries")}
            className={`btn btn-sm rounded-xl font-bold text-xs h-9 min-h-0 ${
              tab === "anniversaries"
                ? "bg-rose-600 text-white shadow-sm border-none"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-200"
            }`}
          >
            💍 Upcoming Anniversaries ({data?.stats?.upcomingAnniversariesCount ?? 0})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm input-bordered pl-8 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium rounded-xl w-full text-xs h-9 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Customers Table Card */}
      <div className="card bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6 rounded-2xl">
        <div className="overflow-x-auto">
          <div className="min-w-[960px] flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-amber-50/70 border-b border-amber-200/60 text-xs font-black text-slate-700 uppercase tracking-wider items-center shrink-0">
              <div className="col-span-4">Guest Profile</div>
              <div className="col-span-3">Contact Details</div>
              <div className="col-span-2 text-right">Visits & Total Spend</div>
              <div className="col-span-1 text-center">Occasions</div>
              <div className="col-span-2 text-center">Marketing & Vouchers</div>
            </div>

            {/* Rows */}
            <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-100">
              {isLoading && (
                <div className="py-12 text-center text-sm text-slate-500">
                  <span className="loading loading-spinner loading-md text-amber-500 mr-2" />
                  Loading customers...
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-600" />
                  <p className="font-bold text-slate-800">No Guests Found</p>
                  <p className="text-xs mt-1 text-slate-500">
                    Customers are automatically registered when cashier settles a bill with their mobile number.
                  </p>
                </div>
              )}

              {filtered.map((c) => (
                <div
                  key={c._id}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 hover:bg-amber-50/40 items-center transition-colors text-sm bg-white"
                >
                  {/* Guest Name & Last Visit */}
                  <div className="col-span-4 min-w-0">
                    <span className="font-extrabold text-sm text-slate-900 block truncate">
                      👤 {c.name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium block mt-0.5">
                      Last Visited: {c.lastVisitAt ? format(new Date(c.lastVisitAt), "dd MMM yyyy") : "—"}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="col-span-3 min-w-0 font-mono text-xs">
                    <span className="text-amber-800 font-bold block flex items-center gap-1.5 text-sm">
                      <Phone className="w-3.5 h-3.5 text-amber-600" /> {c.phone}
                    </span>
                    {c.email ? (
                      <span className="text-xs text-slate-600 truncate block mt-0.5">
                        ✉️ {c.email}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>

                  {/* Visits & Spend */}
                  <div className="col-span-2 text-right font-mono text-xs">
                    <span className="text-slate-800 font-extrabold text-xs block">
                      {c.totalVisits} Visit{c.totalVisits > 1 ? "s" : ""}
                    </span>
                    <span className="text-emerald-700 font-black text-sm block mt-0.5">
                      {formatPrice(c.totalSpend)}
                    </span>
                  </div>

                  {/* Special Occasions (DOB / Anniversary) */}
                  <div className="col-span-1 text-center text-xs">
                    <div className="flex flex-col items-center justify-center gap-1">
                      {c.dob && (
                        <button
                          onClick={() => openWaModal(c, "birthday")}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] hover:bg-amber-200"
                          title="Click to send Birthday Wish"
                        >
                          <Cake className="w-2.5 h-2.5 text-amber-700" />
                          {format(new Date(c.dob), "dd MMM")}
                        </button>
                      )}
                      {c.anniversaryDate && (
                        <button
                          onClick={() => openWaModal(c, "anniversary")}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[10px] hover:bg-rose-200"
                          title="Click to send Anniversary Wish"
                        >
                          <Heart className="w-2.5 h-2.5 text-rose-700" />
                          {format(new Date(c.anniversaryDate), "dd MMM")}
                        </button>
                      )}
                      {!c.dob && !c.anniversaryDate && (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: 1-Click WhatsApp & Assign Voucher */}
                  <div className="col-span-2 text-center flex items-center justify-center gap-1.5 flex-wrap">
                    {/* 1-Click WhatsApp */}
                    <button
                      type="button"
                      onClick={() => openWaModal(c, "greeting")}
                      className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1 border-none shadow-xs h-7 min-h-0 px-2.5"
                      title="Send message on WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 fill-white" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Assign Voucher */}
                    <button
                      type="button"
                      onClick={() => openAllotModal(c)}
                      className="btn btn-xs bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl gap-1 border-none shadow-xs h-7 min-h-0 px-2.5"
                      title="Allot exclusive discount voucher"
                    >
                      <Gift className="w-3 h-3" />
                      <span>Allot Code</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ALLOT VOUCHER MODAL */}
      {allotModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 font-playfair">
                    Allot Voucher to Guest
                  </h3>
                  <p className="text-xs text-amber-800 font-bold">
                    👤 {allotModalCustomer.name} ({allotModalCustomer.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllotModalCustomer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAllotSubmit} className="space-y-3">
              {/* Voucher Code */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Voucher Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP200, BIRTHDAY50"
                  value={allotCode}
                  onChange={(e) => setAllotCode(e.target.value.toUpperCase())}
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
                  placeholder="e.g. Exclusive anniversary gift"
                  value={allotDescription}
                  onChange={(e) => setAllotDescription(e.target.value)}
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
                    value={allotDiscountType}
                    onChange={(e) =>
                      setAllotDiscountType(e.target.value as "flat" | "percent")
                    }
                    className="select select-sm select-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500"
                  >
                    <option value="flat">₹ Flat Amount Off</option>
                    <option value="percent">% Percentage Off</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {allotDiscountType === "flat" ? "Amount (₹) *" : "Percent (%) *"}
                  </label>
                  <input
                    type="number"
                    value={allotDiscountValue}
                    onChange={(e) => setAllotDiscountValue(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 font-mono font-bold w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                    min={0}
                    step={allotDiscountType === "flat" ? "1" : "0.5"}
                    required
                  />
                </div>
              </div>

              {/* Min Bill & Expiry Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Min Bill (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={allotMinBill}
                    onChange={(e) => setAllotMinBill(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Valid Till *
                  </label>
                  <input
                    type="date"
                    value={allotValidTill}
                    onChange={(e) => setAllotValidTill(e.target.value)}
                    className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 w-full rounded-xl text-xs focus:bg-white focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAllotModalCustomer(null)}
                  className="btn btn-sm btn-ghost text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVoucherMutation.isPending}
                  className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs px-4"
                >
                  {createVoucherMutation.isPending ? "Assigning..." : "Assign Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP MESSAGE TEMPLATE MODAL */}
      {waModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                  <MessageCircle className="w-4 h-4 fill-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 font-playfair">
                    Send WhatsApp Greeting
                  </h3>
                  <p className="text-xs text-slate-500">
                    To: <strong className="text-amber-800">{waModalCustomer.name}</strong> ({waModalCustomer.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWaModalCustomer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Message Type Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Message Type
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWaMessageType("greeting")}
                    className={`btn btn-xs rounded-xl font-bold h-8 min-h-0 text-xs ${
                      waMessageType === "greeting"
                        ? "bg-amber-500 text-white border-none"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    🍽️ General Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaMessageType("birthday")}
                    className={`btn btn-xs rounded-xl font-bold h-8 min-h-0 text-xs ${
                      waMessageType === "birthday"
                        ? "bg-amber-500 text-white border-none"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    🎂 Birthday Wish
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaMessageType("anniversary")}
                    className={`btn btn-xs rounded-xl font-bold h-8 min-h-0 text-xs ${
                      waMessageType === "anniversary"
                        ? "bg-rose-600 text-white border-none"
                        : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    💍 Anniversary Wish
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaMessageType("vip")}
                    className={`btn btn-xs rounded-xl font-bold h-8 min-h-0 text-xs ${
                      waMessageType === "vip"
                        ? "bg-purple-600 text-white border-none"
                        : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    🎁 Special Offer
                  </button>
                </div>
              </div>

              {/* Optional Coupon Code to include */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Include Coupon Code in Message (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ASHOKA100 or BIRTHDAY20"
                  value={waCustomCode}
                  onChange={(e) => setWaCustomCode(e.target.value.toUpperCase())}
                  className="input input-sm input-bordered bg-slate-50 border-slate-300 text-slate-900 font-mono font-bold w-full uppercase rounded-xl text-xs focus:bg-white focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWaModalCustomer(null)}
                  className="btn btn-sm btn-ghost text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendQuickWhatsApp}
                  className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-4 gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Open WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATED VOUCHER SUCCESS MODAL */}
      {createdVoucherSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white border border-amber-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 font-playfair">
                Voucher Assigned Successfully! 🎉
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Exclusive discount promo created for{" "}
                <strong className="text-amber-800 font-bold">
                  {createdVoucherSuccess.customer.name}
                </strong>
              </p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Coupon Code:</span>
                <span className="badge badge-warning badge-sm font-black font-mono tracking-wider text-slate-900 px-2.5 py-1">
                  {createdVoucherSuccess.voucher.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Discount:</span>
                <span className="text-emerald-700 font-black font-mono text-sm">
                  {createdVoucherSuccess.voucher.discountType === "flat"
                    ? `₹${createdVoucherSuccess.voucher.discountValue} FLAT OFF`
                    : `${createdVoucherSuccess.voucher.discountValue}% OFF`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Valid Till:</span>
                <span className="text-slate-900 font-mono font-bold">
                  {format(new Date(createdVoucherSuccess.voucher.validTill), "dd MMM yyyy")}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  sendVoucherViaWhatsApp(
                    createdVoucherSuccess.customer,
                    createdVoucherSuccess.voucher,
                  );
                  setCreatedVoucherSuccess(null);
                }}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs h-11 gap-2 border-none shadow-sm"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                Send Code on WhatsApp Now
              </button>
              <button
                type="button"
                onClick={() => setCreatedVoucherSuccess(null)}
                className="btn btn-sm btn-ghost text-slate-500 hover:bg-slate-100 rounded-xl text-xs h-9"
              >
                Close / Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
