/** GST-relevant branding fields (subset). */
export interface BrandingGst {
  gstEnabled?: boolean;
  pricesIncludeTax?: boolean;
  gstRatePercent?: number;
}

/** A bill-level discount applied at billing time (before GST). */
export interface Discount {
  type: "percent" | "flat";
  value: number;
}

export interface OrderTotals {
  subtotal: number; // taxable base BEFORE discount (net of GST if inclusive)
  discount: number; // discount amount in ₹
  tax: number; // GST on (subtotal - discount)
  total: number; // amount payable
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Single source of truth for bill totals. Given an order's line items, the
 * CURRENT branding GST settings, and an optional bill-level discount, compute
 * subtotal / discount / tax / total.
 *
 * GST is bill-level only (per-item tax ignored). NC and cancelled lines
 * contribute nothing. The discount is applied to the pre-GST taxable base
 * (Indian norm): GST is charged on the discounted amount. Reads item fields
 * explicitly (NOT object-spread) so it works on mongoose subdocuments too.
 */
export function billOrderTotals(
  items: {
    price: number;
    quantity: number;
    isNC?: boolean;
    itemStatus?: string;
  }[],
  branding?: BrandingGst | null,
  discount?: Discount | null,
): OrderTotals {
  const gstOn = !!branding?.gstEnabled;
  const incl = !!branding?.pricesIncludeTax;
  const rate = (gstOn ? branding?.gstRatePercent ?? 0 : 0) / 100;

  // Gross of active, non-NC lines (menu prices as charged).
  const gross = items.reduce(
    (s, i) =>
      i.itemStatus === "cancelled" || i.isNC ? s : s + i.price * i.quantity,
    0,
  );

  // Taxable base before discount. If prices already include GST, back it out.
  const net = incl && rate > 0 ? gross / (1 + rate) : gross;

  // Discount on the pre-GST base, clamped to [0, net].
  let disc = 0;
  if (discount && discount.value > 0) {
    disc =
      discount.type === "percent"
        ? (net * discount.value) / 100
        : discount.value;
    disc = Math.min(Math.max(disc, 0), net);
  }

  const taxable = net - disc;
  const tax = taxable * rate;
  return {
    subtotal: round2(net),
    discount: round2(disc),
    tax: round2(tax),
    total: round2(taxable + tax),
  };
}
