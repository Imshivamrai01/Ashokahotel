"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { X, Star } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useFlyToCartStore } from "@/store/flyToCart";
import { formatPrice } from "@/lib/utils";
import { FssaiDot } from "@/components/ui/FssaiDot";
import FoodPlaceholder from "@/components/menu/FoodPlaceholder";
import type { IItem } from "@/types";

interface Props {
  item: IItem | null;
  isRoom: boolean;
  onClose: () => void;
  logoUrl?: string | null;
}

/**
 * Mobile bottom-sheet showing a single dish in detail — full description,
 * large media (video when available, else image), and an inline add control.
 */
export default function ItemDetailSheet({
  item,
  isRoom,
  onClose,
  logoUrl,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const triggerFly = useFlyToCartStore((s) => s.triggerFly);
  const qty = item
    ? (items.find((i) => i.itemId === item._id)?.quantity ?? 0)
    : 0;

  const effectivePrice = item?.discountPrice ?? item?.price ?? 0;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col max-h-[88vh]"
            style={{
              background: "var(--menu-bg)",
              border: "1px solid var(--menu-border)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Grabber + Header Close */}
            <div className="relative flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
              <div className="w-8" />
              <div
                className="w-12 h-1.5 rounded-full bg-slate-300"
              />
              <button
                onClick={onClose}
                aria-label="Close details"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-200 shadow-xs cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-5">
              {/* Media */}
              <div
                className="relative w-full rounded-2xl overflow-hidden mb-4"
                style={{ aspectRatio: "16 / 10", background: "var(--menu-surface)" }}
              >
                {item.videoUrl ? (
                  <video
                    src={item.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={item.imageUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                ) : (
                  <FoodPlaceholder logoUrl={logoUrl} />
                )}
                {item.isFeatured && (
                  <span
                    className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: "var(--menu-accent)",
                      color: "var(--menu-on-accent)",
                    }}
                  >
                    <Star className="w-3 h-3" fill="currentColor" /> Chef&apos;s
                    Special
                  </span>
                )}
              </div>

              {/* Title row */}
              <div className="flex items-start gap-2 mb-2">
                <span className="mt-1">
                  <FssaiDot isVeg={item.isVegetarian} size="md" />
                </span>
                <h2
                  className="text-lg font-bold leading-snug flex-1 text-slate-900"
                >
                  {item.name}
                </h2>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--menu-accent)" }}
                >
                  {formatPrice(effectivePrice)}
                </span>
                {item.discountPrice && (
                  <>
                    <span
                      className="text-sm line-through"
                      style={{ color: "var(--menu-text-faint)" }}
                    >
                      {formatPrice(item.price)}
                    </span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                    >
                      {Math.round(
                        ((item.price - item.discountPrice) / item.price) * 100,
                      )}
                      % off
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: "var(--menu-text-muted)" }}
                >
                  {item.description}
                </p>
              )}

              {/* Add control */}
              {isRoom &&
                (qty === 0 ? (
                  <button
                    onClick={(e) => {
                      triggerFly(e.currentTarget, item.imageUrl);
                      addItem({
                        itemId: item._id,
                        name: item.name,
                        price: item.price,
                        discountPrice: item.discountPrice,
                        quantity: 1,
                        imageUrl: item.imageUrl,
                        isVegetarian: item.isVegetarian,
                      });
                    }}
                    className="w-full min-h-12 rounded-2xl font-semibold text-sm cursor-pointer touch-manipulation active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70"
                    style={{
                      background: "var(--menu-accent)",
                      color: "var(--menu-on-accent)",
                    }}
                  >
                    Add to Order +
                  </button>
                ) : (
                  <div
                    className="flex items-center justify-between rounded-2xl overflow-hidden min-h-12"
                    style={{ background: "var(--menu-accent)" }}
                  >
                    <button
                      onClick={() =>
                        qty === 1
                          ? removeItem(item._id)
                          : updateQuantity(item._id, qty - 1)
                      }
                      aria-label="Decrease quantity"
                      className="min-w-14 h-12 flex items-center justify-center text-xl font-bold cursor-pointer touch-manipulation active:opacity-70"
                      style={{ color: "var(--menu-on-accent)" }}
                    >
                      −
                    </button>
                    <span
                      className="font-bold tabular-nums"
                      style={{ color: "var(--menu-on-accent)" }}
                    >
                      {qty} in order
                    </span>
                    <button
                      onClick={(e) => {
                        triggerFly(e.currentTarget, item.imageUrl);
                        updateQuantity(item._id, qty + 1);
                      }}
                      aria-label="Increase quantity"
                      className="min-w-14 h-12 flex items-center justify-center text-xl font-bold cursor-pointer touch-manipulation active:opacity-70"
                      style={{ color: "var(--menu-on-accent)" }}
                    >
                      +
                    </button>
                  </div>
                ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
