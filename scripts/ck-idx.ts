import "dotenv/config";
import mongoose from "mongoose";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("DB:", mongoose.connection.name);
  const i = await mongoose.connection.collection("orders").indexes();
  for (const x of i) console.log(x.name, JSON.stringify(x.key), x.unique ? "UNIQUE" : "");
  await mongoose.disconnect();
})();
