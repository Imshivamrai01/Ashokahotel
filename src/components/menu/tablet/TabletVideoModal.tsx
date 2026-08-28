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

  const { items: cartItems, addItem, updateQuantity } = useCartStore();
  const triggerFly = useFlyToCartStore((s) => s.triggerFly);

  const cartItem = item ? cartItems.find((i) => i.itemId === item._id) : undefined;
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
      name: item.name,
      price: item.price,
      discountPrice: item.discountPrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      isVegetarian: item.isVegetarian,
    });
    triggerFly(e.currentTarget, item.imageUrl);
  };

  const handleInc = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(item._id, qty + 1);
  };

  const handleDec = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(item._id, qty - 1);
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
                controls
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : hasImage ? (
              <div className="relative w-full h-full">
                <Image
                  src={item.imageUrl!}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Switch to Video button if video exists */}
                {hasVideo && (
                  <button
                    onClick={() => setIsPlayingVideo(true)}
                    className="absolute inset-0 flex items-center justify-center group cursor-pointer"
                  >
                    <span className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/70 border border-amber-400/80 text-white text-xs font-bold shadow-xl backdrop-blur-md group-hover:scale-105 transition-transform">
                      <Play className="w-4 h-4 fill-white" /> Watch Preparation Video
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-950 via-slate-900 to-black text-center p-6">
                <span className="text-amber-400 text-5xl mb-2">✦</span>
                <p className="font-playfair text-amber-200 font-bold text-xl uppercase tracking-widest">
                  {item.name}
                </p>
              </div>
            )}

            {/* Badges on Top-Left */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <div className="bg-white/95 backdrop-blur-xs p-1.5 rounded-lg shadow-md border border-slate-200">
                <FssaiDot isVeg={item.isVegetarian} size="md" />
              </div>
              {item.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-black shadow-md">
                  <Star className="w-3.5 h-3.5 fill-black" /> Chef Special
                </span>
              )}
            </div>

            {/* Media Toggle Switch (Image vs Video) */}
            {hasVideo && hasImage && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/20">
                <button
                  onClick={() => setIsPlayingVideo(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    !isPlayingVideo ? "bg-amber-400 text-black" : "text-white hover:text-amber-300"
                  }`}
                >
                  Photo
                </button>
                <button
                  onClick={() => setIsPlayingVideo(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isPlayingVideo ? "bg-amber-400 text-black" : "text-white hover:text-amber-300"
                  }`}
                >
                  Video
                </button>
              </div>
            )}
          </div>

          {/* Details & Description Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 flex-1 bg-[#FAF9F6]">
            <div>
              <h2 className="font-playfair text-slate-900 text-2xl sm:text-3xl font-black tracking-wide leading-tight">
                {item.name}
              </h2>

              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-amber-700 text-2xl font-black font-mono">
                  {formatPrice(item.discountPrice ?? item.price)}
                </span>
                {item.discountPrice && (
                  <span className="text-slate-400 text-base line-through font-mono">
                    {formatPrice(item.price)}
                  </span>
                )}
                {item.discountPrice && (
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Save {formatPrice(item.price - item.discountPrice)}
                  </span>
                )}
              </div>
            </div>

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
                {formatPrice((item.discountPrice ?? item.price) * (qty > 0 ? qty : 1))}
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
                Add to Cart
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
                <span className="font-mono font-black text-slate-900 text-lg px-4">
                  {qty} in cart
                </span>
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
