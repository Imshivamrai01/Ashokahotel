"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { FssaiDot } from "@/components/ui/FssaiDot";
import FoodPlaceholder from "@/components/menu/FoodPlaceholder";
import type { IItem } from "@/types";

interface Props {
  items: IItem[];
  onSelect: (item: IItem) => void;
  logoUrl?: string | null;
}

/** Horizontal showcase of featured ("Chef's Special") dishes on mobile. */
export default function FeaturedRail({ items, onSelect, logoUrl }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Chef's specials" className="pt-4 pb-2">
      <div className="px-4 flex items-center gap-1.5 mb-3">
        <Star
          className="w-4 h-4"
          style={{ color: "var(--menu-accent)" }}
          fill="currentColor"
          aria-hidden="true"
        />
        <h2
          className="text-sm font-bold tracking-wide"
          style={{ color: "var(--menu-text)" }}
        >
          Chef&apos;s Specials
        </h2>
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((item) => (
          <button
            key={item._id}
            onClick={() => onSelect(item)}
            aria-label={`View ${item.name}`}
            className="shrink-0 w-40 rounded-2xl overflow-hidden text-left cursor-pointer touch-manipulation active:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70"
            style={{
              background: "var(--menu-surface)",
              border: "1px solid var(--menu-border)",
              scrollSnapAlign: "start",
            }}
          >
            <div
              className="relative w-full"
              style={{ aspectRatio: "4 / 3", background: "var(--menu-surface-2)" }}
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <FoodPlaceholder logoUrl={logoUrl} />
              )}
              <span className="absolute top-2 left-2">
                <FssaiDot isVeg={item.isVegetarian} size="sm" />
              </span>
            </div>
            <div className="p-2.5">
              <p
                className="text-xs font-semibold line-clamp-1"
                style={{ color: "var(--menu-text)" }}
              >
                {item.name}
              </p>
              <p
                className="text-xs font-bold mt-1"
                style={{ color: "var(--menu-accent)" }}
              >
                {formatPrice(item.discountPrice ?? item.price)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
