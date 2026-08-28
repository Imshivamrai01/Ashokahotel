import Counter from "@/lib/db/models/Counter";

/**
 * Sequential document numbers for POs, GRNs, stock counts, etc.
 * Reuses the existing Counter collection (one doc per sequence key).
 * Format: PREFIX-NNNN (e.g. PO-0007). Not date-scoped — monotonically grows.
 */
export async function nextNumber(prefix: string): Promise<string> {
  const key = `seq:${prefix}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collection = Counter.collection as any;
  const result = await collection.findOneAndUpdate(
    { _id: key },
    [{ $set: { seq: { $add: [{ $ifNull: ["$seq", 0] }, 1] } } }],
    { upsert: true, returnDocument: "after" },
  );
  const seq = (result as unknown as { seq: number }).seq;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
