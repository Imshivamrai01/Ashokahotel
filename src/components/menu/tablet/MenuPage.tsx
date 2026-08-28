"use client";

import Image from "next/image";
import { UtensilsCrossed, Star, Play } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useItemVideoStore } from "@/store/itemVideo";
import { useFlyToCartStore } from "@/store/flyToCart";
import { formatPrice } from "@/lib/utils";
import type { CategoryWithItems, IItem } from "@/types";
import { FssaiDot } from "@/components/ui/FssaiDot";
import FoodPlaceholder from "@/components/menu/FoodPlaceholder";

interface Props {
  category: CategoryWithItems;
  items: IItem[];
  chunkIndex: number;
  totalChunks: number;
  isRoom: boolean;
  width: number;
  height: number;
  logoUrl?: string | null;
}

export default function MenuPage({
  category,
  items,
  chunkIndex,
  totalChunks,
  width,
  height,
  logoUrl,
}: Props) {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden select-none"
      style={{ width, height, background: "var(--menu-page-bg, #FAF9F6)" }}
    >
      {/* Category header */}
      <div className="px-5 sm:px-6 py-2.5 sm:py-3 pr-36 sm:pr-40 border-b border-amber-200/50 flex items-center justify-between shrink-0 bg-amber-50/50 min-h-[48px] sm:min-h-[52px]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {category.iconEmoji ? (
            <span className="text-xl sm:text-2xl">{category.iconEmoji}</span>
          ) : (
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
          )}
          <div>
            <h2 className="font-playfair text-slate-900 text-base sm:text-xl font-black tracking-tight leading-tight">
              {category.name}
            </h2>
            {totalChunks > 1 && (
              <p className="text-amber-800 text-[10px] sm:text-xs font-semibold leading-tight">
                Page {chunkIndex + 1} of {totalChunks}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items grid — 2x2 grid fitted perfectly without clipping */}
      <div className="flex-1 min-h-0 p-2.5 sm:p-4 grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3.5 overflow-hidden">
        {items.map((item) => (
          <TabletItemCard
            key={item._id}
            item={item}
            logoUrl={logoUrl}
          />
        ))}
      </div>
    </div>
  );
}

function TabletItemCard({
  item,
  logoUrl,
}: {
  item: IItem;
  logoUrl?: string | null;
}) {
  const {
    items: cartItems,
    addItem,
    updateQuantity,
    removeItem,
  } = useCartStore();
  const openVideo = useItemVideoStore((s) => s.open);
  const triggerFly = useFlyToCartStore((s) => s.triggerFly);

  const cartItem = cartItems.find((i) => i.itemId === item._id);
  const qty = cartItem?.quantity ?? 0;

  const handleAdd = () =>
    addItem({
      itemId: item._id,
      name: item.name,
      price: item.price,
      discountPrice: item.discountPrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      isVegetarian: item.isVegetarian,
    });

  const hasVideo = !!item.videoUrl;
  const hasDetails = !!(
    item.imageUrl ||
    item.videoUrl ||
    (item.description && item.description.trim().length > 0)
  );

  return (
    <div
      className={`h-full flex flex-col min-h-0 bg-white rounded-2xl overflow-hidden border transition-all shadow-xs ${
        hasDetails ? "hover:shadow-md hover:border-amber-400" : ""
      } ${
        item.isFeatured ? "border-amber-400 ring-1.5 ring-amber-400/50" : "border-slate-200/90"
      }`}
    >
      {/* Image Container — flexes with available space */}
      <div
        onClick={hasDetails ? () => openVideo(item) : undefined}
        className={`relative flex-1 min-h-[70px] w-full bg-slate-100 shrink overflow-hidden ${
          hasDetails ? "cursor-pointer group" : ""
        }`}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className={`object-cover transition-transform duration-300 ${
              hasDetails ? "group-hover:scale-105" : ""
            }`}
            sizes="(max-width: 768px) 50vw, 320px"
          />
        ) : (
          <FoodPlaceholder logoUrl={logoUrl} />
        )}

        {/* Veg/Non-veg indicator */}
        <div className="absolute top-2 left-2 z-10 drop-shadow">
          <FssaiDot isVeg={item.isVegetarian} size="sm" />
        </div>

        {/* Play video button */}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 group-hover:scale-110 shadow-lg"
              style={{
                background: "rgba(0,0,0,0.65)",
                border: "1.5px solid rgba(255,255,255,0.85)",
              }}
            >
              <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
            </span>
          </div>
        )}

        {item.isFeatured && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold z-10 bg-amber-400 text-black shadow">
            <Star className="w-2.5 h-2.5 fill-black" /> Special
          </span>
        )}
      </div>

      {/* Info & Bottom Action Row */}
      <div className="p-2 sm:p-3 flex flex-col justify-between shrink-0 gap-1 sm:gap-1.5 bg-white">
        <div
          onClick={hasDetails ? () => openVideo(item) : undefined}
          className={hasDetails ? "cursor-pointer group" : ""}
        >
          <p
            className={`text-slate-900 text-xs sm:text-sm font-extrabold line-clamp-1 leading-snug transition-colors ${
              hasDetails ? "group-hover:text-amber-700" : ""
            }`}
          >
            {item.name}
          </p>

          {item.description && (
            <p
              className={`text-slate-500 text-[10px] sm:text-[11px] line-clamp-1 leading-tight font-normal mt-0.5 transition-colors ${
                hasDetails ? "group-hover:text-slate-700" : ""
              }`}
            >
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-amber-700 text-xs sm:text-sm font-black font-mono tracking-tight leading-none">
              {formatPrice(item.discountPrice ?? item.price)}
            </span>
            {item.discountPrice && (
              <span className="text-slate-400 text-[10px] line-through font-mono leading-none">
                {formatPrice(item.price)}
              </span>
            )}
          </div>

          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {qty === 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFly(e.currentTarget, item.imageUrl);
                  handleAdd();
                }}
                aria-label={`Add ${item.name} to order`}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs cursor-pointer touch-manipulation transition-all shadow-xs flex items-center gap-1 leading-normal"
              >
                ADD +
              </button>
            ) : (
              <div className="flex items-center bg-amber-50 rounded-lg sm:rounded-xl h-6 sm:h-7 border border-amber-300 px-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    qty === 1
                      ? removeItem(item._id)
                      : updateQuantity(item._id, qty - 1);
                  }}
                  aria-label={`Decrease ${item.name} quantity`}
                  className="text-amber-800 font-extrabold text-xs w-5 h-full flex items-center justify-center cursor-pointer active:scale-75"
                >
                  −
                </button>
                <span className="text-slate-900 font-black text-[11px] sm:text-xs tabular-nums px-1 min-w-4 text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFly(e.currentTarget, item.imageUrl);
                    updateQuantity(item._id, qty + 1);
                  }}
                  aria-label={`Increase ${item.name} quantity`}
                  className="text-amber-800 font-extrabold text-xs w-5 h-full flex items-center justify-center cursor-pointer active:scale-75"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
