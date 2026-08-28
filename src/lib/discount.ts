// Pure, client-safe discount math + validation (no bcrypt / no DB). The server
// re-validates authoritatively in discount-guard.ts; this drives the live UI.

export interface DiscountInput {
  type: "percent" | "flat";
  value: number; // raw entered value
  reason: string;
  pin: string;
}

export interface DiscountConfig {
  net: number; // pre-discount taxable base
  rate: number; // GST fraction (e.g. 0.05)
  maxPercent: number; // hard cap
  threshold: number; // discounts above this % need the manager PIN
  hasPin: boolean; // a manager PIN is configured
  requiresReason: boolean;
}

export interface DiscountCalc {
  amount: number; // resolved ₹ discount
  percentOfNet: number;
  taxable: number;
  tax: number;
  payable: number;
  needsPin: boolean; // this discount exceeds the approval threshold
  error: string | null; // blocking validation error (null = ok)
  payload: {
    discountType?: "percent" | "flat";
    discountValue?: number;
    discountReason?: string;
    managerPin?: string;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeDiscount(
  input: DiscountInput,
  cfg: DiscountConfig,
): DiscountCalc {
  const raw = input.value > 0 ? input.value : 0;
  let amount =
    raw <= 0
      ? 0
      : input.type === "percent"
        ? (cfg.net * Math.min(raw, 100)) / 100
        : raw;
  amount = round2(Math.min(Math.max(amount, 0), cfg.net));
  const percentOfNet = cfg.net > 0 ? (amount / cfg.net) * 100 : 0;
  const taxable = cfg.net - amount;
  const tax = round2(taxable * cfg.rate);
  const payable = round2(taxable + tax);
  const needsPin = cfg.hasPin && percentOfNet > cfg.threshold + 0.01;

  let error: string | null = null;
  if (amount > 0) {
    if (percentOfNet > cfg.maxPercent + 0.01) {
      error = `Max discount is ${cfg.maxPercent}%`;
    } else if (cfg.requiresReason && !input.reason.trim()) {
      error = "A reason is required";
    } else if (needsPin && !input.pin.trim()) {
      error = "Manager PIN required";
    }
  }

  const payload =
    amount > 0
      ? {
          discountType: input.type,
          discountValue:
            input.type === "percent" ? Math.min(raw, 100) : raw,
          discountReason: input.reason.trim() || undefined,
          managerPin: input.pin.trim() || undefined,
        }
      : {};

  return { amount, percentOfNet, taxable, tax, payable, needsPin, error, payload };
}
