import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Billable total for a single order line. No-Charge (NC) items contribute ₹0.
 * Shared by server (pricing source of truth) and client (display).
 */
export function lineTotal(item: {
  price: number;
  quantity: number;
  isNC?: boolean;
}): number {
  return item.isNC ? 0 : item.price * item.quantity;
}

/**
 * Subtotal of an order's active (non-cancelled) lines, excluding NC items.
 */
export function activeSubtotal(
  items: {
    price: number;
    quantity: number;
    isNC?: boolean;
    itemStatus?: string;
  }[],
): number {
  return items
    .filter((i) => i.itemStatus !== "cancelled")
    .reduce((sum, i) => sum + lineTotal(i), 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute order subtotal (net), tax, and total from line items, GST-aware and
 * NC-aware. `pricesIncludeTax`: when true, line `price` already includes GST and
 * is back-calculated into net + tax; when false, tax is added on top.
 * NC and cancelled lines contribute nothing.
 */
export function computeOrderTotals(
  items: {
    price: number;
    quantity: number;
    isNC?: boolean;
    itemStatus?: string;
    taxRate?: number;
  }[],
  pricesIncludeTax = false,
  billRatePercent = 0,
): { subtotal: number; tax: number; total: number } {
  // Bill-level GST: one rate on the whole order (from brand settings).
  if (billRatePercent > 0) {
    const gross = items.reduce(
      (s, i) =>
        i.itemStatus === "cancelled" || i.isNC ? s : s + i.price * i.quantity,
      0,
    );
    const rate = billRatePercent / 100;
    if (pricesIncludeTax) {
      const net = gross / (1 + rate);
      return {
        subtotal: round2(net),
        tax: round2(gross - net),
        total: round2(gross),
      };
    }
    const tax = gross * rate;
    return { subtotal: round2(gross), tax: round2(tax), total: round2(gross + tax) };
  }

  // Per-item GST.
  let subtotal = 0;
  let tax = 0;
  for (const i of items) {
    if (i.itemStatus === "cancelled" || i.isNC) continue;
    const gross = i.price * i.quantity;
    const rate = (i.taxRate ?? 0) / 100;
    if (pricesIncludeTax) {
      const net = rate > 0 ? gross / (1 + rate) : gross;
      subtotal += net;
      tax += gross - net;
    } else {
      subtotal += gross;
      tax += gross * rate;
    }
  }
  subtotal = round2(subtotal);
  tax = round2(tax);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

/** Slugify a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Format price in INR (shows decimals only when paise exist) */
export function formatPrice(amount: number): string {
  const hasDecimals = Math.abs(amount % 1) >= 0.005;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 2,
  }).format(amount);
}

/** Format date for display */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/** Format time only */
export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

/** Get elapsed minutes since a date */
export function elapsedMinutes(from: string | Date): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}

/** Format elapsed time as mm:ss string */
export function formatElapsed(from: string | Date): string {
  const totalSeconds = Math.floor(
    (Date.now() - new Date(from).getTime()) / 1000,
  );
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Get TTL status for KDS coloring */
export function getTtlStatus(
  orderedAt: string | Date,
  ttlMinutes: number,
): "ok" | "warning" | "overdue" {
  const elapsed = elapsedMinutes(orderedAt);
  const ratio = elapsed / ttlMinutes;
  if (ratio >= 1) return "overdue";
  if (ratio >= 0.5) return "warning";
  return "ok";
}

/** Split array into chunks */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Generate daily KOT number sequence string */
export function formatKotNumber(seq: number): string {
  const num = Number(seq);
  const safeSeq = Number.isFinite(num) && num > 0 ? num : 1;
  return `KOT-${String(safeSeq).padStart(3, "0")}`;
}

/** Encode WhatsApp message URL */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/** Build WhatsApp order message for room service */
export function buildRoomOrderMessage(
  restaurantName: string,
  roomLabel: string,
  items: {
    name: string;
    quantity: number;
    price: number;
    discountPrice?: number;
  }[],
  total: number,
  specialInstructions?: string,
): string {
  const itemLines = items
    .map((i) => {
      const effectivePrice = (i.discountPrice ?? i.price) * i.quantity;
      const original = i.price * i.quantity;
      const wasStr =
        i.discountPrice && i.discountPrice < i.price
          ? ` _(was ₹${original})_`
          : "";
      return `• ${i.name} ×${i.quantity} — ₹${effectivePrice}${wasStr}`;
    })
    .join("\n");

  const instructionLine = specialInstructions
    ? `\n📝 *Special Instructions:* ${specialInstructions}`
    : "";

  return `🛏️ *Room Service Order*
🏨 *${restaurantName}*

🚪 *${roomLabel}*

📋 *Items:*
${itemLines}

💰 *Total: ₹${total}*${instructionLine}

_Sent via Ashoka Hotel_`;
}

/** Detect if User-Agent is a small mobile phone (excluding tablets/iPads) */
export function isMobileUserAgent(ua: string): boolean {
  const s = ua.toLowerCase();
  // Tablets (iPad, iPad Mini, Android Tablet without 'mobile') should use tablet view
  if (/ipad|tablet|playbook|silk/i.test(s)) return false;
  return /iphone|ipod|blackberry|iemobile|opera mini|mobile/i.test(s);
}
