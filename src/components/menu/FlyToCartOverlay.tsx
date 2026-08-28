"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useFlyToCartStore } from "@/store/flyToCart";
import Image from "next/image";
import { Utensils } from "lucide-react";

export default function FlyToCartOverlay() {
  const { flyingItems, removeFlyingItem } = useFlyToCartStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-99999 overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.startX,
              y: item.startY,
              scale: 1,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              x: [item.startX, item.startX + (item.endX - item.startX) * 0.45, item.endX],
              y: [item.startY, Math.min(item.startY, item.endY) - 60, item.endY],
              scale: [1, 1.25, 0.25],
              opacity: [1, 0.95, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1], // smooth cubic-bezier curve
            }}
            onAnimationComplete={() => removeFlyingItem(item.id)}
            className="absolute top-0 left-0 w-12 h-12 rounded-full overflow-hidden shadow-2xl border-2 border-[var(--menu-accent,#C9A96E)] bg-black flex items-center justify-center"
            style={{
              boxShadow: "0 0 20px rgba(201, 169, 110, 0.8)",
            }}
          >
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt="Adding dish to cart"
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full bg-[var(--menu-accent,#C9A96E)] text-black flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
