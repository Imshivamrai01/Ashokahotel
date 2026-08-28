/**
 * Unit-of-measure helpers. Everything in the inventory ledger is stored in a
 * base unit per measure type (weight→g, volume→ml, count→pcs). Staff pick a
 * friendly unit (kg, L, dozen…); we convert to/from base invisibly.
 *
 * This is the single source of truth for conversions — the #1 source of bugs in
 * F&B inventory systems is ad-hoc unit math, so it all lives here and is tested.
 */

export type MeasureType = "weight" | "volume" | "count";

export const BASE_UNIT: Record<MeasureType, string> = {
  weight: "g",
  volume: "ml",
  count: "pcs",
};

/** Every selectable unit → its measure type + factor to the base unit. */
export const UNIT_TO_BASE: Record<
  string,
  { type: MeasureType; factor: number }
> = {
  // weight (base g)
  kg: { type: "weight", factor: 1000 },
  g: { type: "weight", factor: 1 },
  mg: { type: "weight", factor: 0.001 },
  // volume (base ml)
  l: { type: "volume", factor: 1000 },
  L: { type: "volume", factor: 1000 },
  ml: { type: "volume", factor: 1 },
  // count (base pcs)
  pcs: { type: "count", factor: 1 },
  pc: { type: "count", factor: 1 },
  dozen: { type: "count", factor: 12 },
  pair: { type: "count", factor: 2 },
};

/** Units offered in pickers, grouped by measure type. */
export const UNITS_BY_TYPE: Record<MeasureType, string[]> = {
  weight: ["kg", "g"],
  volume: ["L", "ml"],
  count: ["pcs", "dozen"],
};

export function unitMeasureType(unit: string): MeasureType | null {
  return UNIT_TO_BASE[unit]?.type ?? null;
}

/** Convert a quantity in `unit` to the base unit of its measure type. */
export function toBase(qty: number, unit: string): number {
  const u = UNIT_TO_BASE[unit];
  if (!u) throw new Error(`Unknown unit: ${unit}`);
  return qty * u.factor;
}

/** Convert a base-unit quantity back to `unit`. */
export function fromBase(qtyBase: number, unit: string): number {
  const u = UNIT_TO_BASE[unit];
  if (!u) throw new Error(`Unknown unit: ${unit}`);
  return qtyBase / u.factor;
}

/** True if two units belong to the same measure type (so they can convert). */
export function compatible(a: string, b: string): boolean {
  const ua = UNIT_TO_BASE[a];
  const ub = UNIT_TO_BASE[b];
  return !!ua && !!ub && ua.type === ub.type;
}

/**
 * Pretty quantity in the unit a human thinks in: keep small counts in base,
 * promote large weights/volumes to kg/L. Returns "{value} {unit}".
 */
export function displayQty(qtyBase: number, type: MeasureType): string {
  if (type === "count") return `${round(qtyBase)} pcs`;
  if (type === "weight")
    return qtyBase >= 1000
      ? `${round(qtyBase / 1000)} kg`
      : `${round(qtyBase)} g`;
  // volume
  return qtyBase >= 1000 ? `${round(qtyBase / 1000)} L` : `${round(qtyBase)} ml`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
