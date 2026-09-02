import type { IOrder } from "@/types";

/**
 * Formats a plain text ESC/POS string for 80mm/58mm thermal printers.
 */
export function buildKotText(order: IOrder, hotelName = "ASHOKA HOTEL"): string {
  const line = "------------------------------------------";
  const dline = "==========================================";
  const items = order.items.filter((i) => i.itemStatus !== "cancelled");

  const dateStr = new Date(order.createdAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const lines: string[] = [
    hotelName.toUpperCase(),
    "KITCHEN ORDER TICKET (KOT)",
    dline,
    `KOT #: ${order.kotNumber}    Table: ${order.tableLabel}`,
    `Date : ${dateStr}`,
    `Capt : ${order.captainName || "Staff"}`,
    line,
    "QTY   ITEM",
    line,
  ];

  for (const it of items) {
    let itemLine = `${String(it.quantity).padEnd(5)} ${it.name}`;
    if (it.variationName) itemLine += ` (${it.variationName})`;
    if (it.isNC) itemLine += " [NC]";
    lines.push(itemLine);

    if (it.addons && it.addons.length > 0) {
      lines.push(`      + ${it.addons.map((a) => a.name).join(", ")}`);
    }
    if (it.notes) {
      lines.push(`      * ${it.notes}`);
    }
  }

  if (order.specialInstructions) {
    lines.push(line);
    lines.push(`SPECIAL: ${order.specialInstructions}`);
  }

  lines.push(dline);
  lines.push("\n\n\n"); // Feed for tear-off

  return lines.join("\n");
}

/**
 * Triggers RawBT on Android or fallback print dialog.
 * If RawBT app is installed via OTG, it handles silent/direct printing.
 */
export function printKotViaRawBT(order: IOrder, hotelName = "ASHOKA HOTEL"): boolean {
  if (typeof window === "undefined") return false;

  const kotText = buildKotText(order, hotelName);

  // 1. Try Android RawBT Intent URL
  // Format: rawbt:data:text/plain;base64,...
  try {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      // Base64 encode UTF-8 text safely
      const encoded = btoa(unescape(encodeURIComponent(kotText)));
      const rawbtUrl = `rawbt:data:text/plain;base64,${encoded}`;
      
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = rawbtUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
      return true;
    }
  } catch (err) {
    console.warn("RawBT print attempt failed, falling back to window.print", err);
  }

  return false;
}
