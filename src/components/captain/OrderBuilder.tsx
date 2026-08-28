"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Search, X, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useCaptainStore } from "@/store/captain";
import { formatPrice } from "@/lib/utils";
import type { ICategory, IItem } from "@/types";
import LottiePlayer from "@/components/LottiePlayer";
import { FssaiDot } from "@/components/ui/FssaiDot";

interface MenuData {
  categories: ICategory[];
  items: IItem[];
}

async function fetchMenu(): Promise<MenuData> {
  const res = await fetch("/api/menu");
  if (!res.ok) throw new Error("Failed to load menu");
  const data = await res.json();
  return {
    categories: (data.categories as ICategory[]).filter((c) => c.isActive),
    items: (data.items as IItem[]).filter((i) => i.isAvailable),
  };
}

export default function OrderBuilder() {
  const {
    orderItems,
    selectedTable,
    addItem,
    updateQuantity,
    setStep,
    totalItems,
    subtotal,
  } = useCaptainStore();

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ["captain-menu"],
    queryFn: fetchMenu,
    staleTime: 60_000,
  });

  const categories = data?.categories ?? [];

  // Filter items
  const displayItems = useMemo(() => {
    const allItems = data?.items ?? [];
    let filtered = allItems;
    if (activeCat)
      filtered = filtered.filter((i) => i.categoryId === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [data?.items, activeCat, search]);

  const getQty = (itemId: string) =>
    orderItems.find((i) => i.itemId === itemId)?.quantity ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-warning" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="text-sm text-base-content/50">Adding items to</p>
          <p className="font-bold text-lg">{selectedTable?.label}</p>
        </div>
        <button
          onClick={() => setStep("order_summary")}
          disabled={orderItems.length === 0}
          className="btn btn-warning gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Review
          {totalItems() > 0 && (
            <span className="badge badge-warning-content bg-white text-warning font-bold text-xs px-1.5">
              {totalItems()}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="input input-bordered w-full pl-9 pr-9 h-10 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <button
          onClick={() => setActiveCat(null)}
          className={`btn btn-sm rounded-full shrink-0 ${activeCat === null ? "btn-warning" : "btn-ghost border border-base-300"}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setActiveCat(cat._id)}
            className={`btn btn-sm rounded-full shrink-0 ${activeCat === cat._id ? "btn-warning" : "btn-ghost border border-base-300"}`}
          >
            {cat.iconEmoji && <span>{cat.iconEmoji}</span>}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {displayItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-2"
            >
              <LottiePlayer variant="no-results" size={100} />
              <p className="text-base-content/40 text-sm">No items found</p>
            </motion.div>
          ) : (
            displayItems.map((item) => {
              const qty = getQty(item._id);
              const effectivePrice = item.discountPrice ?? item.price;

              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-base-200 rounded-xl p-3 border border-base-300"
                >
                  {/* Image */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-base-300">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FssaiDot isVeg={item.isVegetarian} size="sm" />
                      <span className="font-medium text-sm truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-warning font-bold text-sm font-mono-jetbrains">
                        {formatPrice(effectivePrice)}
                      </span>
                      {item.discountPrice &&
                        item.discountPrice < item.price && (
                          <span className="text-xs text-base-content/40 line-through">
                            {formatPrice(item.price)}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {qty === 0 ? (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => addItem(item)}
                        className="btn btn-warning btn-sm rounded-full"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item._id, qty - 1)}
                          className="btn btn-ghost btn-xs btn-circle border border-base-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold font-mono-jetbrains text-sm">
                          {qty}
                        </span>
                        <button
                          onClick={() => addItem(item)}
                          className="btn btn-warning btn-xs btn-circle"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      {orderItems.length > 0 && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-xl flex items-center justify-between"
        >
          <div>
            <span className="text-sm text-base-content/70">
              {totalItems()} item{totalItems() !== 1 ? "s" : ""}
            </span>
            <span className="ml-3 font-bold font-mono-jetbrains text-warning">
              {formatPrice(subtotal())}
            </span>
          </div>
          <button
            onClick={() => setStep("order_summary")}
            className="btn btn-warning btn-sm"
          >
            Review Order →
          </button>
        </motion.div>
      )}
    </div>
  );
}
