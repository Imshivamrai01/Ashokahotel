import bcrypt from "bcryptjs";

// Server-authoritative discount policy check. Never trust the client — even
// though the UI validates, this is the real gate before a discount is applied.

export interface DiscountLimits {
  maxDiscountPercent?: number;
  discountRequiresReason?: boolean;
  discountApprovalThresholdPercent?: number;
  managerPinHash?: string;
}

export type DiscountCheck =
  | { ok: true; approved: boolean }
  | { ok: false; status: number; error: string };

/**
 * Validate a resolved discount against the branding policy.
 * - amount 0 → always ok.
 * - over maxDiscountPercent → reject (hard cap; PIN cannot override it).
 * - reason required but missing → reject.
 * - over threshold AND a PIN is configured → require a correct PIN.
 * Returns `approved: true` only when a PIN authorised an above-threshold discount.
 */
export async function checkDiscountAllowed(opts: {
  discountAmount: number;
  net: number;
  reason?: string;
  pin?: string;
  limits: DiscountLimits;
}): Promise<DiscountCheck> {
  const { discountAmount, net, reason, pin, limits } = opts;
  if (!discountAmount || discountAmount <= 0) return { ok: true, approved: false };

  const max = limits.maxDiscountPercent ?? 100;
  const pct = net > 0 ? (discountAmount / net) * 100 : 0;

  if (pct > max + 0.01) {
    return { ok: false, status: 400, error: `Discount exceeds the ${max}% limit` };
  }
  if ((limits.discountRequiresReason ?? true) && !reason?.trim()) {
    return { ok: false, status: 400, error: "A discount reason is required" };
  }

  const threshold = limits.discountApprovalThresholdPercent ?? 100;
  if (pct > threshold + 0.01 && limits.managerPinHash) {
    if (!pin?.trim()) {
      return { ok: false, status: 403, error: "Manager PIN required for this discount" };
    }
    const good = await bcrypt.compare(pin.trim(), limits.managerPinHash);
    if (!good) return { ok: false, status: 403, error: "Incorrect manager PIN" };
    return { ok: true, approved: true };
  }
  return { ok: true, approved: false };
}
