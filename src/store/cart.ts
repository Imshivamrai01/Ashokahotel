import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  locationCode: string | null;
  locationLabel: string | null;
  specialInstructions: string;

  setLocation: (code: string, label: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  setSpecialInstructions: (text: string) => void;
  clear: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      locationCode: null,
      locationLabel: null,
      specialInstructions: "",

      setLocation: (code, label) =>
        set({ locationCode: code, locationLabel: label }),

      addItem: (newItem) => {
        const existing = get().items.find((i) => i.itemId === newItem.itemId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.itemId === newItem.itemId
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            ),
          });
        } else {
          set({ items: [...get().items, { ...newItem, quantity: 1 }] });
        }
      },

      removeItem: (itemId) =>
        set({ items: get().items.filter((i) => i.itemId !== itemId) }),

      updateQuantity: (itemId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.itemId !== itemId) });
        } else {
          set({
            items: get().items.map((i) =>
              i.itemId === itemId ? { ...i, quantity: qty } : i,
            ),
          });
        }
      },

      setSpecialInstructions: (text) => set({ specialInstructions: text }),
      clear: () => set({ items: [], specialInstructions: "" }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount: () =>
        get().items.reduce(
          (sum, i) => sum + (i.discountPrice ?? i.price) * i.quantity,
          0,
        ),
    }),
    { name: "ashoka-cart" },
  ),
);
