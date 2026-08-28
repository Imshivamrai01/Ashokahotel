import { create } from "zustand";
import type { IItem } from "@/types";

/**
 * Holds the dish whose video clip is currently playing in the tablet menu.
 * Lives in a store (not local state) because the item card is rendered deep
 * inside the react-pageflip flipbook, while the player modal must mount at the
 * shell level to overlay the whole screen without being clipped by a page.
 */
interface ItemVideoStore {
  item: IItem | null;
  open: (item: IItem) => void;
  close: () => void;
}

export const useItemVideoStore = create<ItemVideoStore>((set) => ({
  item: null,
  open: (item) => set({ item }),
  close: () => set({ item: null }),
}));
