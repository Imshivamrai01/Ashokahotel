/**
 * One-off script — marks every item in the DB as active & available.
 * Run with:  npx tsx scripts/activate-all-items.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env.local");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const result = await mongoose.connection
    .collection("items")
    .updateMany({}, { $set: { isActive: true, isAvailable: true } });

  console.log(
    `✅  Updated ${result.modifiedCount} items → isActive: true, isAvailable: true`,
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
