import { create } from "zustand";

export interface FlyingItem {
  id: string;
  imageUrl?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface FlyToCartStore {
  flyingItems: FlyingItem[];
  cartBumping: boolean;
  triggerFly: (startEl: HTMLElement | null, imageUrl?: string) => void;
  removeFlyingItem: (id: string) => void;
}

export const useFlyToCartStore = create<FlyToCartStore>((set, get) => ({
  flyingItems: [],
  cartBumping: false,

  triggerFly: (startEl, imageUrl) => {
    if (!startEl) return;
    const startRect = startEl.getBoundingClientRect();
    const cartEl =
      document.getElementById("top-cart-btn") ||
      document.querySelector("[data-cart-btn]") ||
      document.getElementById("bottom-cart-btn");

    if (!cartEl) return;
    const endRect = cartEl.getBoundingClientRect();

    const id = `${Date.now()}-${Math.random()}`;
    const startX = startRect.left + startRect.width / 2 - 24;
    const startY = startRect.top + startRect.height / 2 - 24;
    const endX = endRect.left + endRect.width / 2 - 24;
    const endY = endRect.top + endRect.height / 2 - 24;

    const newItem: FlyingItem = {
      id,
      imageUrl,
      startX,
      startY,
      endX,
      endY,
    };

    set({ flyingItems: [...get().flyingItems, newItem] });

    // Trigger cart bump right as item lands (after ~650ms)
    setTimeout(() => {
      set({ cartBumping: true });
      setTimeout(() => {
        set({ cartBumping: false });
      }, 400);
    }, 650);
  },

  removeFlyingItem: (id) => {
    set({ flyingItems: get().flyingItems.filter((item) => item.id !== id) });
  },
}));
