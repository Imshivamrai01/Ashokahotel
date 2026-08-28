"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  Trash2,
  MessageCircle,
  Phone,
  Minus,
  Plus,
  BellRing,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ChefHat,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import {
  formatPrice,
  buildWhatsAppUrl,
  buildRoomOrderMessage,
} from "@/lib/utils";
import type { IBranding, ILocation } from "@/types";

interface Props {
  branding: IBranding | null;
  location: ILocation | null;
  onClose: () => void;
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

export default function TabletCartPanel({
  branding,
  location,
  onClose,
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

  const total = totalAmount();

  // Check saved active order on mount
  useEffect(() => {
    try {
      const savedId = localStorage.getItem("ah_guest_active_order_id");
      if (savedId && !activeOrderId) {
        setActiveOrderId(savedId);
      }
    } catch {}
  }, [activeOrderId]);

  useEffect(() => {
    if (!location?._id) {
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
  }, [location, selectedTableId]);

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
    const orderItems = liveOrder ? liveOrder.items : items;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = buildRoomOrderMessage(
      branding?.restaurantName ?? "Ashoka Hotel",
      location?.label ?? liveOrder?.tableLabel ?? "Room",
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
    window.open(buildWhatsAppUrl(phone, msg), "_blank");
  };

  const handleStartNewOrder = () => {
    setActiveOrderId(null);
    setLiveOrder(null);
    try {
      localStorage.removeItem("ah_guest_active_order_id");
    } catch {}
  };

  // Compute status step index
  const getStatusStep = (status: string) => {
    if (status === "delivered" || status === "cleared" || status === "paid") return 4;
    if (status === "ready" || status === "partially_delivered") return 3;
    if (status === "preparing" || status === "partially_ready") return 2;
    if (status === "pending") return 1;
    return 0;
  };

  const currentStep = liveOrder ? getStatusStep(liveOrder.status) : 0;

  return (
    <>
      {/* ── Fixed Backdrop (Click anywhere outside to close) ─────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        style={{ zIndex: 100000 }}
        onClick={onClose}
      />

      {/* ── Slide-in Drawer Panel ────────────────────────────────────── */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed top-0 right-0 bottom-0 w-88 max-w-[90vw] bg-white text-slate-900 shadow-2xl flex flex-col border-l border-slate-200"
        style={{ zIndex: 100001 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h2 className="font-extrabold text-base font-playfair tracking-wide text-slate-900">
              {liveOrder ? "Live Order Tracker" : "Your Order"}
            </h2>
            {!liveOrder && items.length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-xs">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
            {liveOrder && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!liveOrder && items.length > 0 && (
              <button
                className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-50 font-bold"
                onClick={clear}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 cursor-pointer touch-manipulation text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Items / Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {liveOrder ? (
            /* Live Order Status Tracking View */
            <div className="py-2 space-y-4">
              {/* Order header banner */}
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
                  <h3 className="text-xl font-playfair font-black text-white pt-1">
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
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Live Progress
                  </span>
                  {isPolling && (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  )}
                </div>

                <div className="space-y-3 pt-1">
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
                        KOT #{liveOrder.kotNumber} for {liveOrder.tableLabel}
                      </p>
                    </div>
                  </div>

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
                        Staff Verification
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {currentStep >= 1
                          ? "Verified & queued to kitchen"
                          : "Waiting for staff verification"}
                      </p>
                    </div>
                  </div>

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
                        Dishes being prepared fresh
                      </p>
                    </div>
                  </div>

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
                          : "Serving to your room/table"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Ordered Items ({liveOrder.items.length})
                </h4>
                <div className="divide-y divide-slate-200">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {liveOrder.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="py-1.5 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-800">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-amber-800 font-mono text-base">
                    {formatPrice(liveOrder.total)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleStartNewOrder}
                  className="btn btn-outline border-amber-400 text-amber-900 hover:bg-amber-50 w-full rounded-2xl font-bold text-xs"
                >
                  + Place Another Order
                </button>
                {branding?.whatsappNumber && (
                  <button
                    onClick={handleWhatsApp}
                    className="btn btn-success w-full gap-2 text-white font-bold rounded-2xl text-xs"
                  >
                    <MessageCircle className="w-4 h-4" /> Send Summary to WhatsApp
                  </button>
                )}
                {branding?.callNumber && (
                  <a
                    href={`tel:${branding.callNumber}`}
                    className="btn btn-outline btn-info w-full gap-2 font-bold rounded-2xl text-xs"
                  >
                    <Phone className="w-4 h-4" /> Call Reception Desk
                  </a>
                )}
              </div>
            </div>
          ) : items.length === 0 ? (
            /* Empty Cart View */
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-base text-slate-900">Your cart is empty</p>
                <p className="text-xs text-slate-500 font-medium">Add delicious dishes from the menu</p>
              </div>
              <button
                onClick={onClose}
                className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl px-6 border-none shadow-sm cursor-pointer"
              >
                Back to Menu
              </button>
            </div>
          ) : (
            <>
              {/* Location code / selector */}
              {location ? (
                <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                  <span>{location.type === "room" ? "🛏️" : "🪑"} Ordering for {location.type === "room" ? "Room" : "Table"} {location.label}</span>
                </div>
              ) : availableLocations.length > 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="text-xs text-slate-700 font-bold">Select Table / Room</label>
                  <select
                    className="select select-bordered select-sm w-full font-bold bg-white text-slate-900 border-slate-300"
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                  >
                    {availableLocations.filter(l => l.type === "table").length > 0 && (
                      <optgroup label="🍽️ Tables">
                        {availableLocations.filter(l => l.type === "table").map((tbl) => (
                          <option key={tbl._id} value={tbl._id} className="text-slate-900">
                            {tbl.label.toLowerCase().startsWith("table") ? tbl.label : `Table ${tbl.label}`}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {availableLocations.filter(l => l.type === "room").length > 0 && (
                      <optgroup label="🛏️ Rooms">
                        {availableLocations.filter(l => l.type === "room").map((rm) => (
                          <option key={rm._id} value={rm._id} className="text-slate-900">
                            {rm.label.toLowerCase().startsWith("room") || rm.label.toLowerCase().startsWith("suite") ? rm.label : `Room ${rm.label}`}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              ) : null}

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* Cart item list */}
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200"
                  >
                    {item.imageUrl && (
                      <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-slate-200">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-amber-700 font-black font-mono">
                        {formatPrice(
                          (item.discountPrice ?? item.price) * item.quantity,
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-xl px-1 py-0.5 border border-slate-200 shadow-xs">
                      <button
                        onClick={() =>
                          item.quantity === 1
                            ? removeItem(item.itemId)
                            : updateQuantity(item.itemId, item.quantity - 1)
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:scale-75 font-black cursor-pointer touch-manipulation"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-extrabold text-slate-900 w-5 text-center tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:scale-75 font-black cursor-pointer touch-manipulation"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="pt-2">
                <label className="text-xs text-slate-500 font-bold">
                  Special Instructions (optional)
                </label>
                <textarea
                  className="textarea textarea-bordered bg-slate-50 border-slate-300 text-slate-900 w-full text-xs resize-none mt-1 rounded-xl focus:bg-white focus:border-amber-500"
                  rows={2}
                  placeholder="e.g. Less spicy, extra sauce..."
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

        {/* Footer Actions */}
        {!liveOrder && items.length > 0 && (
          <div className="p-4 border-t border-slate-100 space-y-3 bg-amber-50/30">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600 text-sm font-bold">Total Amount</span>
              <span className="font-black text-2xl text-emerald-700 font-mono">
                {formatPrice(total)}
              </span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="btn bg-amber-500 hover:bg-amber-600 text-white font-bold w-full gap-2 rounded-2xl shadow-sm text-sm h-12 border-none cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Placing Order…
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4" />
                  Place Order (Send to Reception)
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
