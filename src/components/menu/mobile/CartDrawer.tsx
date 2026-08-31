"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingBag,
  Trash2,
  MessageCircle,
  Phone,
  Minus,
  Plus,
  CheckCircle2,
  BellRing,
  Loader2,
  AlertCircle,
  Clock,
  ChefHat,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import {
  formatPrice,
  buildWhatsAppUrl,
  buildRoomOrderMessage,
} from "@/lib/utils";
import Image from "next/image";
import type { IBranding, ILocation } from "@/types";
import LottiePlayer from "@/components/LottiePlayer";

interface Props {
  open: boolean;
  onClose: () => void;
  branding: IBranding | null;
  location: ILocation | null;
}

interface LiveOrderTrack {
  _id: string;
  kotNumber: string;
  tableLabel: string;
  status: string;
  isCaptainConfirmed: boolean;
  total: number;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    itemStatus: string;
    isVegetarian: boolean;
  }>;
}

export default function CartDrawer({
  open,
  onClose,
  branding,
  location,
}: Props) {
  const {
    items,
    removeItem,
    updateQuantity,
    setSpecialInstructions,
    specialInstructions,
    clear,
    totalAmount,
  } = useCartStore();
  const [instrValue, setInstrValue] = useState(specialInstructions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [liveOrder, setLiveOrder] = useState<LiveOrderTrack | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const [availableLocations, setAvailableLocations] = useState<ILocation[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>(location?._id || "");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const total = totalAmount();
  const isRoom = location?.type === "room";

  // Check saved active order on mount/open
  useEffect(() => {
    try {
      const savedId = localStorage.getItem("ah_guest_active_order_id");
      if (savedId && !activeOrderId) {
        setActiveOrderId(savedId);
      }
    } catch {}
  }, [activeOrderId]);

  // Load locations if no QR location passed
  useEffect(() => {
    if (!location?._id && open) {
      fetch("/api/locations")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableLocations(data);
            if (data.length > 0 && !selectedTableId) {
              setSelectedTableId(data[0]._id);
            }
          }
        })
        .catch(() => {});
    }
  }, [location, open, selectedTableId]);

  // Poll active order status
  const pollOrderStatus = useCallback(async (orderId: string) => {
    try {
      setIsPolling(true);
      const res = await fetch(`/api/orders/self-order?orderId=${orderId}`);
      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem("ah_guest_active_order_id");
          setActiveOrderId(null);
          setLiveOrder(null);
        }
        return;
      }
      const data = await res.json();
      if (data?.success && data.order) {
        setLiveOrder(data.order);
      }
    } catch {} finally {
      setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId) return;
    pollOrderStatus(activeOrderId);
    const timer = setInterval(() => {
      pollOrderStatus(activeOrderId);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeOrderId, pollOrderStatus]);

  // Modal a11y: Escape to close, focus trap
  useEffect(() => {
    if (!open) {
      setError("");
      return;
    }
    prevFocusRef.current = document.activeElement as HTMLElement;

    const focusables = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));

    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || isSubmitting) return;
    const targetTableId = location?._id || selectedTableId;
    if (!targetTableId) {
      setError("Please select a table or room to place your order.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/orders/self-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: targetTableId,
          locationCode: location?.code,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            variationName: i.variationName,
            notes: undefined,
          })),
          specialInstructions: instrValue,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to place order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const newId = data.order._id;
      setActiveOrderId(newId);
      try {
        localStorage.setItem("ah_guest_active_order_id", newId);
      } catch {}

      clear();
      pollOrderStatus(newId);
    } catch {
      setError("Network error. Please ask reception directly or check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = branding?.whatsappNumber ?? "";
    const restaurantName = branding?.restaurantName ?? "Ashoka Hotel";
    const roomLabel = location?.label ?? liveOrder?.tableLabel ?? "Room";
    const orderItems = liveOrder ? liveOrder.items : items;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = buildRoomOrderMessage(
      restaurantName,
      roomLabel,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderItems.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        discountPrice: i.discountPrice,
      })),
      liveOrder ? liveOrder.total : total,
      instrValue || undefined,
    );
    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, "_blank");
  };

  const handleStartNewOrder = () => {
    setActiveOrderId(null);
    setLiveOrder(null);
    try {
      localStorage.removeItem("ah_guest_active_order_id");
    } catch {}
    onClose();
  };

  // If user has added items to cart, ALWAYS show the new Cart.
  // Only show Tracker if cart is empty and an active non-delivered order exists.
  const isOrderActive =
    liveOrder &&
    !["delivered", "cleared", "paid", "cancelled"].includes(liveOrder.status);

  const showTracker = items.length === 0 && (isOrderActive || (liveOrder && liveOrder.status === "delivered"));

  // Compute status step index
  const getStatusStep = (status: string) => {
    if (status === "delivered" || status === "cleared" || status === "paid") return 4;
    if (status === "ready" || status === "partially_delivered") return 3;
    if (status === "preparing" || status === "partially_ready") return 2;
    if (status === "pending") return 1; // Verified by staff / In kitchen queue
    return 0; // pending_captain / unverified
  };

  const currentStep = liveOrder ? getStatusStep(liveOrder.status) : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF9F6] text-slate-900 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl border-t border-amber-900/15"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-amber-900/10 bg-white/70">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
                <h2 className="font-extrabold text-base text-slate-900">
                  {showTracker ? "Live Order Tracker" : "Your Order Cart"}
                </h2>
                {!showTracker && items.length > 0 && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black bg-amber-100 text-amber-900 border border-amber-300/80">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                )}
                {showTracker && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!showTracker && items.length > 0 && (
                  <button
                    className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 active:scale-95 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    onClick={clear}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 shadow-xs cursor-pointer touch-manipulation focus-visible:outline-none"
                  onClick={onClose}
                  aria-label="Close cart"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {showTracker && liveOrder ? (
                /* Live Order Tracking View */
                <div className="py-2 space-y-4">
                  {/* Order header card */}
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute right-3 top-3 opacity-15">
                      <ChefHat className="w-24 h-24 text-white" />
                    </div>
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                          {liveOrder.tableLabel}
                        </span>
                        <span className="text-xs font-mono font-black bg-black/20 px-2.5 py-0.5 rounded-full">
                          #{liveOrder.kotNumber}
                        </span>
                      </div>
                      <h3 className="text-2xl font-playfair font-black text-white pt-1">
                        {currentStep === 4
                          ? "Delivered & Enjoy!"
                          : currentStep === 3
                            ? "Food is Ready!"
                            : currentStep === 2
                              ? "Kitchen Preparing…"
                              : currentStep === 1
                                ? "Verified & Queued"
                                : "Order Placed!"}
                      </h3>
                      <p className="text-xs text-amber-100 font-medium">
                        {currentStep === 4
                          ? "Your order has been delivered. Thank you!"
                          : currentStep === 3
                            ? "Staff is bringing your fresh meal right now."
                            : currentStep === 2
                              ? "Head Chef is cooking your fresh dishes."
                              : currentStep === 1
                                ? "Order verified. Sent to the kitchen line."
                                : "Reception / Staff notified for quick confirmation."}
                      </p>
                    </div>
                  </div>

                  {/* Stepper Progress Card */}
                  <div className="bg-white rounded-2xl p-4 border border-amber-900/10 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Live Order Progress
                      </span>
                      {isPolling && (
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      )}
                    </div>

                    <div className="space-y-3 pt-1">
                      {/* Step 1: Received */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            currentStep >= 0
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          ✓
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Order Received
                          </p>
                          <p className="text-[11px] text-slate-500">
                            KOT #{liveOrder.kotNumber} generated for {liveOrder.tableLabel}
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Confirmed by Reception */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            currentStep >= 1
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-amber-100 text-amber-800 animate-pulse border border-amber-300"
                          }`}
                        >
                          {currentStep >= 1 ? "✓" : "2"}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Reception / Staff Verification
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {currentStep >= 1
                              ? "Confirmed and queued to kitchen"
                              : "Waiting for quick staff confirmation"}
                          </p>
                        </div>
                      </div>

                      {/* Step 3: Kitchen Preparing */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            currentStep >= 2
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {currentStep >= 2 ? "✓" : "3"}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Kitchen Cooking
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Dishes are being prepared fresh
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Ready / Delivered */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            currentStep >= 3
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {currentStep >= 4 ? "✓" : "4"}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            Food Delivery
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {currentStep >= 4
                              ? "Delivered to room/table"
                              : "Served hot to your table or room"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ordered Items Summary */}
                  <div className="bg-white rounded-2xl p-4 border border-amber-900/10 shadow-xs space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Ordered Items ({liveOrder.items.length})
                    </h4>
                    <div className="divide-y divide-slate-100">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {liveOrder.items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-800">
                              {item.quantity}×
                            </span>
                            <span className="font-bold text-slate-800">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-bold font-mono text-slate-700">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                      <span>Total Amount</span>
                      <span className="text-amber-800 font-mono text-base">
                        {formatPrice(liveOrder.total)}
                      </span>
                    </div>
                  </div>

                  {/* Actions for active order */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleStartNewOrder}
                      className="btn btn-outline border-amber-400 text-amber-900 hover:bg-amber-50 w-full rounded-2xl font-bold text-xs cursor-pointer"
                    >
                      + Order More Items / Place Another Order
                    </button>

                    {branding?.whatsappNumber && (
                      <button
                        onClick={handleWhatsApp}
                        className="btn btn-success w-full gap-2 text-white font-bold rounded-2xl text-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Send Order Summary to WhatsApp
                      </button>
                    )}

                    {branding?.callNumber && (
                      <a
                        href={`tel:${branding.callNumber}`}
                        className="btn btn-outline btn-info w-full gap-2 font-bold rounded-2xl text-xs cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        Call Reception Desk
                      </a>
                    )}
                  </div>
                </div>
              ) : items.length === 0 ? (
                /* Empty Cart */
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <LottiePlayer variant="empty-cart" size={110} />
                  <p className="text-base-content/50 text-sm font-medium">
                    Your cart is empty
                  </p>
                  <button
                    onClick={onClose}
                    className="btn btn-sm btn-outline btn-primary rounded-xl px-6 cursor-pointer"
                  >
                    Back to Menu
                  </button>
                </div>
              ) : (
                /* Cart Items List */
                <>
                  {/* Location identifier badge / selector */}
                  {location ? (
                    <div className="px-3.5 py-2 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs font-bold text-amber-950 inline-flex items-center gap-1.5 shadow-xs">
                      <span>
                        {location.type === "room" ? "🛏️" : "🪑"} Ordering for{" "}
                        {location.type === "room" ? "Room" : "Table"}{" "}
                        {location.label}
                      </span>
                    </div>
                  ) : availableLocations.length > 0 ? (
                    <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1">
                      <label className="text-xs text-amber-900 font-bold">
                        Select Table / Room
                      </label>
                      <select
                        className="select select-bordered select-sm w-full font-bold bg-white text-slate-900 border-amber-300"
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                      >
                        {availableLocations.filter((l) => l.type === "table")
                          .length > 0 && (
                          <optgroup label="🍽️ Tables">
                            {availableLocations
                              .filter((l) => l.type === "table")
                              .map((tbl) => (
                                <option key={tbl._id} value={tbl._id}>
                                  {tbl.label.toLowerCase().startsWith("table")
                                    ? tbl.label
                                    : `Table ${tbl.label}`}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        {availableLocations.filter((l) => l.type === "room")
                          .length > 0 && (
                          <optgroup label="🛏️ Rooms">
                            {availableLocations
                              .filter((l) => l.type === "room")
                              .map((rm) => (
                                <option key={rm._id} value={rm._id}>
                                  {rm.label.toLowerCase().startsWith("room") ||
                                  rm.label.toLowerCase().startsWith("suite")
                                    ? rm.label
                                    : `Room ${rm.label}`}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  ) : null}

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span className="font-semibold">{error}</span>
                    </div>
                  )}

                  {items.map((item) => {
                    const itemKey =
                      item.cartKey ||
                      (item.variationName
                        ? `${item.itemId}__${item.variationName}`
                        : item.itemId);
                    return (
                      <div
                        key={itemKey}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-amber-900/10 shadow-xs"
                      >
                        {item.imageUrl && (
                          <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-amber-50 border border-amber-200/60">
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.variationName && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                {item.variationName}
                              </span>
                            )}
                            <p className="text-xs text-amber-700 font-extrabold">
                              {formatPrice(
                                (item.discountPrice ?? item.price) *
                                  item.quantity,
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 rounded-full px-1 py-0.5">
                          <button
                            onClick={() =>
                              item.quantity === 1
                                ? removeItem(itemKey)
                                : updateQuantity(itemKey, item.quantity - 1)
                            }
                            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-700 hover:bg-amber-100 active:scale-90 cursor-pointer touch-manipulation focus-visible:outline-none"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-extrabold w-4 text-center tabular-nums text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(itemKey, item.quantity + 1)
                            }
                            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-700 hover:bg-amber-100 active:scale-90 cursor-pointer touch-manipulation focus-visible:outline-none"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Special Instructions */}
                  <div className="mt-3">
                    <label className="text-xs text-slate-600 font-bold">
                      Special Instructions (optional)
                    </label>
                    <textarea
                      ref={inputRef}
                      className="textarea textarea-bordered bg-white text-slate-900 border-amber-300/80 w-full text-sm mt-1 rounded-xl resize-none focus:border-amber-500 focus:outline-none"
                      rows={2}
                      placeholder="e.g. Less spicy, no onions, extra napkins..."
                      value={instrValue}
                      onChange={(e) => {
                        setInstrValue(e.target.value);
                        setSpecialInstructions(e.target.value);
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!showTracker && items.length > 0 && (
              <div className="px-5 py-4 border-t border-amber-900/10 bg-white/80 backdrop-blur-md space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm font-semibold">
                    Total
                  </span>
                  <span className="font-extrabold text-xl text-slate-900">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Primary Action Button: Places direct digital order to Reception/Kitchen */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="w-full min-h-12 py-3 px-4 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer touch-manipulation disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Placing Order…
                    </>
                  ) : (
                    <>
                      <BellRing className="w-5 h-5" />
                      Place Order (Send to Reception)
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
