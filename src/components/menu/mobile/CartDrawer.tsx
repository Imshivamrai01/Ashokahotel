"use client";

import { useState, useRef, useEffect } from "react";
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
  const [placedOrder, setPlacedOrder] = useState<{
    kotNumber: string;
    tableLabel: string;
  } | null>(null);

  const [availableLocations, setAvailableLocations] = useState<ILocation[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>(location?._id || "");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const total = totalAmount();
  const isRoom = location?.type === "room";

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

  // Modal a11y: Escape to close, focus trap, and restore focus on close.
  useEffect(() => {
    if (!open) {
      setPlacedOrder(null);
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
      setError("Please select a table to place your order.");
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

      clear();
      setPlacedOrder({
        kotNumber: data.order.kotNumber,
        tableLabel: data.order.tableLabel || location?.label || "Table",
      });
    } catch {
      setError("Network error. Please ask your captain directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = branding?.whatsappNumber ?? "";
    const restaurantName = branding?.restaurantName ?? "Ashoka Hotel";
    const roomLabel = location?.label ?? "Room";
    const msg = buildRoomOrderMessage(
      restaurantName,
      roomLabel,
      items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        discountPrice: i.discountPrice,
      })),
      total,
      instrValue || undefined,
    );
    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, "_blank");
  };

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF9F6] text-slate-900 rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl border-t border-amber-900/15"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-amber-900/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
                <h2 className="font-extrabold text-base text-slate-900">
                  {placedOrder ? "Order Status" : "Your Order"}
                </h2>
                {!placedOrder && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black bg-amber-100 text-amber-900 border border-amber-300/80">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!placedOrder && items.length > 0 && (
                  <button
                    className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 active:scale-95 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    onClick={clear}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 shadow-xs cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  onClick={onClose}
                  aria-label="Close cart"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {placedOrder ? (
                /* Success Confirmation State */
                <div className="py-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center text-success">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Order Received!</h3>
                    <p className="text-xs text-base-content/60">
                      KOT <span className="font-mono font-bold text-primary">#{placedOrder.kotNumber}</span> · Table <span className="font-semibold">{placedOrder.tableLabel}</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-base-200 border border-base-300 text-xs space-y-2 max-w-sm">
                    <div className="flex items-center gap-2 text-warning font-semibold">
                      <BellRing className="w-4 h-4 animate-bounce" />
                      <span>Captain Notified for Confirmation</span>
                    </div>
                    <p className="text-base-content/70 leading-relaxed">
                      Your captain is coming to your table to verify and confirm your order. Once confirmed, it will go straight to the kitchen.
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="btn btn-primary w-full max-w-xs rounded-xl mt-2"
                  >
                    Done / Back to Menu
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <LottiePlayer variant="empty-cart" size={110} />
                  <p className="text-base-content/50 text-sm font-medium">
                    Your cart is empty
                  </p>
                  <button
                    onClick={onClose}
                    className="btn btn-sm btn-outline btn-primary rounded-xl px-6"
                  >
                    Back to Menu
                  </button>
                </div>
              ) : (
                <>
                  {/* Location identifier badge / selector */}
                  {location ? (
                    <div className="px-3.5 py-2 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs font-bold text-amber-950 inline-flex items-center gap-1.5 shadow-xs">
                      <span>{location.type === "room" ? "🛏️" : "🪑"} Ordering for {location.type === "room" ? "Room" : "Table"} {location.label}</span>
                    </div>
                  ) : availableLocations.length > 0 ? (
                    <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1">
                      <label className="text-xs text-amber-900 font-bold">Select Table / Room</label>
                      <select
                        className="select select-bordered select-sm w-full font-bold bg-white text-slate-900 border-amber-300"
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                      >
                        {availableLocations.filter(l => l.type === "table").length > 0 && (
                          <optgroup label="🍽️ Tables">
                            {availableLocations.filter(l => l.type === "table").map((tbl) => (
                              <option key={tbl._id} value={tbl._id}>
                                {tbl.label.toLowerCase().startsWith("table") ? tbl.label : `Table ${tbl.label}`}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {availableLocations.filter(l => l.type === "room").length > 0 && (
                          <optgroup label="🛏️ Rooms">
                            {availableLocations.filter(l => l.type === "room").map((rm) => (
                              <option key={rm._id} value={rm._id}>
                                {rm.label.toLowerCase().startsWith("room") || rm.label.toLowerCase().startsWith("suite") ? rm.label : `Room ${rm.label}`}
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

                  {items.map((item) => (
                    <div
                      key={item.itemId}
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
                        <p className="text-xs text-amber-700 font-extrabold">
                          {formatPrice(
                            (item.discountPrice ?? item.price) * item.quantity,
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 rounded-full px-1 py-0.5">
                        <button
                          onClick={() =>
                            item.quantity === 1
                              ? removeItem(item.itemId)
                              : updateQuantity(item.itemId, item.quantity - 1)
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
                            updateQuantity(item.itemId, item.quantity + 1)
                          }
                          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-700 hover:bg-amber-100 active:scale-90 cursor-pointer touch-manipulation focus-visible:outline-none"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

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
            {!placedOrder && items.length > 0 && (
              <div className="px-5 py-4 border-t border-amber-900/10 bg-white/60 backdrop-blur-md space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm font-semibold">Total</span>
                  <span className="font-extrabold text-xl text-slate-900">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Primary Action Button */}
                {isRoom ? (
                  <>
                    <button
                      onClick={handleWhatsApp}
                      className="btn btn-success w-full gap-2 text-white font-bold rounded-2xl shadow-md"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Send Order via WhatsApp
                    </button>
                    {branding?.callNumber && (
                      <a
                        href={`tel:${branding.callNumber}`}
                        className="btn btn-outline btn-info w-full gap-2 font-bold rounded-2xl"
                      >
                        <Phone className="w-4 h-4" />
                        Call Reception
                      </a>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full min-h-12 py-3 px-4 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer touch-manipulation"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Placing Order…
                      </>
                    ) : (
                      <>
                        <BellRing className="w-5 h-5" />
                        Place Order (Send to Captain)
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
