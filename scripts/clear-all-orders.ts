import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";
import Order from "../src/lib/db/models/Order";
import Counter from "../src/lib/db/models/Counter";
import CaptainCall from "../src/lib/db/models/CaptainCall";
import Location from "../src/lib/db/models/Location";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not defined.");
  process.exit(1);
}

async function clearOrdersAndKots() {
  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);

  try {
    console.log("🗑️ Deleting all Orders, Invoices & KOTs...");
    const orderRes = await Order.deleteMany({});
    console.log(`✅ Deleted ${orderRes.deletedCount} orders.`);

    console.log("🔄 Resetting KOT & Sequence Counters...");
    const counterRes = await Counter.deleteMany({});
    console.log(`✅ Deleted ${counterRes.deletedCount} counter records.`);

    console.log("🔔 Clearing Captain Calls & Alerts...");
    const callRes = await CaptainCall.deleteMany({});
    console.log(`✅ Cleared ${callRes.deletedCount} captain calls.`);

    console.log("🪑 Freeing all occupied Tables...");
    const locRes = await Location.updateMany({}, { isOccupied: false });
    console.log(`✅ Reset ${locRes.modifiedCount} table statuses to Free.`);

    console.log("\n🎉 ALL ORDERS, KOTS & INVOICES HAVE BEEN CLEARED FRESH!");
    console.log("New orders will now start from fresh sequence numbers (KOT #1).");
  } catch (err) {
    console.error("❌ Error while clearing orders:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

clearOrdersAndKots();
