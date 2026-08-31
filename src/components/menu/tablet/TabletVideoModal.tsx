"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Plus, Minus, Star, ShoppingBag } from "lucide-react";
import { useItemVideoStore } from "@/store/itemVideo";
import { useCartStore } from "@/store/cart";
import { useFlyToCartStore } from "@/store/flyToCart";
import { formatPrice } from "@/lib/utils";
import { FssaiDot } from "@/components/ui/FssaiDot";

/**
 * Luxury Dish Detail & Video Modal for the tablet menu.
 * Displays large high-res photo, full description, preparation details,
 * embedded video player (if available), and direct Add-to-Cart controls.
 */
export default function TabletVideoModal() {
  const { item, close } = useItemVideoStore();
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [selectedVarIndex, setSelectedVarIndex] = useState<number>(0);

  const { items: cartItems, addItem, updateQuantity, removeItem } = useCartStore();
  const triggerFly = useFlyToCartStore((s) => s.triggerFly);

  useEffect(() => {
    setSelectedVarIndex(0);
  }, [item?._id]);

  const hasVariations = !!(item?.variations && item.variations.length > 0);
  const activeVar = hasVariations && item?.variations ? item.variations[selectedVarIndex] : null;
  const effectivePrice = activeVar
    ? activeVar.price
    : (item?.discountPrice ?? item?.price ?? 0);

  const cartKey = item
    ? activeVar
      ? `${item._id}__${activeVar.name}`
      : item._id
    : "";

  const cartItem = item
    ? cartItems.find(
        (i) =>
          (i.cartKey || (i.variationName ? `${i.itemId}__${i.variationName}` : i.itemId)) ===
          cartKey,
      )
    : undefined;
  const qty = cartItem?.quantity ?? 0;

  // Auto-switch to video if it has video and no image, or reset on open
  useEffect(() => {
    if (item?.videoUrl) {
      setIsPlayingVideo(true);
    } else {
      setIsPlayingVideo(false);
    }
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  if (!item) return null;

  const hasVideo = !!item.videoUrl;
  const hasImage = !!item.imageUrl;

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    addItem({
      itemId: item._id,
      name: activeVar ? `${item.name} (${activeVar.name})` : item.name,
      price: effectivePrice,
      discountPrice: hasVariations ? undefined : item.discountPrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      isVegetarian: item.isVegetarian,
      variationName: activeVar ? activeVar.name : undefined,
      cartKey,
    });
    triggerFly(e.currentTarget, item.imageUrl);
  };

  const handleInc = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(cartKey, qty + 1);
  };

  const handleDec = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (qty === 1) {
      removeItem(cartKey);
    } else {
      updateQuantity(cartKey, qty - 1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
        style={{
          zIndex: 10000,
          background: "rgba(10, 10, 15, 0.82)",
          backdropFilter: "blur(10px)",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 flex flex-col max-h-[90vh]"
        >
          {/* Close Button */}
          <button
            onClick={close}
            aria-label="Close dish popup"
            className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-lg border border-white/20 backdrop-blur-xs"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Media Header (Video or Big Image) */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 shrink-0 overflow-hidden">
            {hasVideo && isPlayingVideo ? (
              <video
                src={item.videoUrl}
                poster={item.imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : hasImage ? (
              <Image
                src={item.imageUrl!}
                alt={item.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-amber-700/40 text-amber-300">
                <span className="font-playfair text-xl font-bold">Ashoka Culinary Art</span>
              </div>
            )}

            {/* Toggle Video/Image if both present */}
            {hasVideo && hasImage && (
              <button
                onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                className="absolute bottom-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm border border-white/20 transition-all active:scale-95"
              >
                {isPlayingVideo ? (
                  <>View Photo</>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Watch Video
                  </>
                )}
              </button>
            )}
          </div>

          {/* Details & Description Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 flex-1 bg-[#FAF9F6]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <FssaiDot isVeg={item.isVegetarian} size="md" />
                <h2 className="font-playfair text-slate-900 text-2xl sm:text-3xl font-black tracking-wide leading-tight">
                  {item.name}
                </h2>
              </div>

              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-amber-700 text-2xl font-black font-mono">
                  {formatPrice(effectivePrice)}
                </span>
                {!hasVariations && item.discountPrice && (
                  <span className="text-slate-400 text-base line-through font-mono">
                    {formatPrice(item.price)}
                  </span>
                )}
                {!hasVariations && item.discountPrice && (
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Save {formatPrice(item.price - item.discountPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Variations / Portion Selector */}
            {hasVariations && item.variations && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-950 mb-2.5 flex items-center justify-between">
                  <span>Select Portion / Size</span>
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                    Required
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {item.variations.map((v, idx) => {
                    const isSelected = idx === selectedVarIndex;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => setSelectedVarIndex(idx)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-600 bg-white text-amber-950 font-bold shadow-xs"
                            : "border-amber-200/60 bg-white/70 hover:border-amber-300 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-amber-600 bg-amber-600" : "border-slate-300"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm truncate">{v.name}</span>
                        </div>
                        <span className="text-sm font-extrabold text-amber-900 shrink-0 ml-1">
                          {formatPrice(v.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800/80 mb-1.5">
                About this Dish
              </h3>
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                {item.description ||
                  "Crafted with fresh authentic spices, prepared to culinary perfection by our master chefs at Ashoka Hotel."}
              </p>
            </div>
          </div>

          {/* Action Bar (Bottom) */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-4 shrink-0 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Price
              </span>
              <span className="text-slate-900 font-extrabold text-lg font-mono">
                {formatPrice(effectivePrice * (qty > 0 ? qty : 1))}
              </span>
            </div>

            {qty === 0 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={handleAdd}
                className="flex-1 max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5" />
                Add {activeVar ? `${activeVar.name} to Cart` : "to Cart"}
              </motion.button>
            ) : (
              <div className="flex-1 max-w-xs flex items-center justify-between bg-amber-50 border-2 border-amber-400 rounded-2xl p-1.5 shadow-sm">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleDec}
                  className="w-10 h-10 rounded-xl bg-white border border-amber-200 hover:bg-amber-100 flex items-center justify-center text-amber-900 font-black cursor-pointer shadow-xs active:scale-90"
                >
                  <Minus className="w-4 h-4" />
                </motion.button>
                <div className="flex flex-col items-center px-3">
                  <span className="font-mono font-black text-slate-900 text-base leading-tight">
                    {qty} in cart
                  </span>
                  {activeVar && (
                    <span className="text-[10px] text-amber-800 font-bold">
                      ({activeVar.name})
                    </span>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleInc}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center font-black cursor-pointer shadow-xs active:scale-90"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
