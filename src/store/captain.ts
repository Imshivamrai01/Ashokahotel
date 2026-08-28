import { create } from "zustand";
import type { IItem, ILocation } from "@/types";

export interface ItemVariation {
  name: string;
  price: number;
  recipeScale: number;
}
export interface ItemAddon {
  name: string;
  price: number;
}
export interface CaptainOrderItem {
  itemId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  notes: string;
  isVegetarian: boolean;
  preparationTtlMinutes: number;
  imageUrl?: string;
  isNC?: boolean;
  ncReason?: string;
  // Options
  variations?: ItemVariation[];
  addons?: ItemAddon[];
  variationName?: string; // chosen
  addonNames?: string[]; // chosen
}

/** Effective unit price = chosen variation (or base) + chosen add-ons. */
export function lineUnitPrice(i: CaptainOrderItem): number {
  const base =
    i.variationName && i.variations
      ? (i.variations.find((v) => v.name === i.variationName)?.price ??
        i.discountPrice ??
        i.price)
      : (i.discountPrice ?? i.price);
  const addons = (i.addonNames ?? []).reduce(
    (s, n) => s + (i.addons?.find((a) => a.name === n)?.price ?? 0),
    0,
  );
  return base + addons;
}

interface CaptainStore {
  // Selected table
  selectedTable: ILocation | null;

  // Items being ordered
  orderItems: CaptainOrderItem[];

  // Overall special instructions
  specialInstructions: string;

  // UI state
  step: "table_select" | "order_build" | "order_summary" | "active_orders";

  // Actions
  selectTable: (table: ILocation) => void;
  clearTable: () => void;

  addItem: (item: IItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  toggleNC: (itemId: string, isNC: boolean, reason?: string) => void;
  setVariation: (itemId: string, name: string) => void;
  toggleAddon: (itemId: string, name: string) => void;

  setSpecialInstructions: (value: string) => void;
  setStep: (step: CaptainStore["step"]) => void;

  resetOrder: () => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
}

const defaultState = {
  selectedTable: null,
  orderItems: [],
  specialInstructions: "",
  step: "table_select" as const,
};

export const useCaptainStore = create<CaptainStore>()((set, get) => ({
  ...defaultState,

  selectTable: (table) =>
    set({ selectedTable: table, step: "order_build", orderItems: [] }),

  clearTable: () => set({ selectedTable: null, step: "table_select" }),

  addItem: (item) => {
    const { orderItems } = get();
    const existing = orderItems.find((i) => i.itemId === item._id);
    if (existing) {
      set({
        orderItems: orderItems.map((i) =>
          i.itemId === item._id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      });
    } else {
      const newItem: CaptainOrderItem = {
        itemId: item._id,
        name: item.name,
        price: item.price,
        discountPrice: item.discountPrice,
        quantity: 1,
        notes: "",
        isVegetarian: item.isVegetarian,
        preparationTtlMinutes: item.preparationTtlMinutes,
        imageUrl: item.imageUrl,
        variations: item.variations,
        addons: item.addons?.map((a) => ({ name: a.name, price: a.price })),
        variationName: item.variations?.[0]?.name,
        addonNames: [],
      };
      set({ orderItems: [...orderItems, newItem] });
    }
  },

  removeItem: (itemId) =>
    set({ orderItems: get().orderItems.filter((i) => i.itemId !== itemId) }),

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set({
      orderItems: get().orderItems.map((i) =>
        i.itemId === itemId ? { ...i, quantity } : i,
      ),
    });
  },

  updateNotes: (itemId, notes) =>
    set({
      orderItems: get().orderItems.map((i) =>
        i.itemId === itemId ? { ...i, notes } : i,
      ),
    }),

  toggleNC: (itemId, isNC, reason) =>
    set({
      orderItems: get().orderItems.map((i) =>
        i.itemId === itemId
          ? { ...i, isNC, ncReason: isNC ? reason : undefined }
          : i,
      ),
    }),

  setVariation: (itemId, name) =>
    set({
      orderItems: get().orderItems.map((i) =>
        i.itemId === itemId ? { ...i, variationName: name } : i,
      ),
    }),

  toggleAddon: (itemId, name) =>
    set({
      orderItems: get().orderItems.map((i) => {
        if (i.itemId !== itemId) return i;
        const cur = i.addonNames ?? [];
        return {
          ...i,
          addonNames: cur.includes(name)
            ? cur.filter((n) => n !== name)
            : [...cur, name],
        };
      }),
    }),

  setSpecialInstructions: (value) => set({ specialInstructions: value }),

  setStep: (step) => set({ step }),

  resetOrder: () => set(defaultState),

  totalItems: () => get().orderItems.reduce((sum, i) => sum + i.quantity, 0),

  subtotal: () =>
    get().orderItems.reduce(
      (sum, i) => sum + (i.isNC ? 0 : lineUnitPrice(i) * i.quantity),
      0,
    ),
}));
