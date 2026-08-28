import mongoose, { type ClientSession } from "mongoose";

/**
 * Runs `fn` inside a MongoDB transaction so multi-document writes (order status
 * + table occupancy + payment) commit atomically and concurrent operations on
 * the same documents are serialized by write-conflict retries.
 *
 * Requires a replica set / Atlas (which this app uses). If the deployment does
 * NOT support transactions, Mongo throws on `startSession().withTransaction` —
 * we surface that rather than silently running non-atomically, so the gap is
 * visible instead of corrupting data quietly.
 *
 * Every DB call inside `fn` MUST pass `{ session }` (or `.session(session)`),
 * otherwise that write escapes the transaction.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    // result is always assigned — withTransaction throws if fn throws.
    return result!;
  } finally {
    await session.endSession();
  }
}
