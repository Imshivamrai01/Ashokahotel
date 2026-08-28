const { MongoClient } = require("mongodb");
const uri =
  "mongodb+srv://regalia:regalia@cluster0regalia.fcocza7.mongodb.net/regalia?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("regalia");

  // 1. Drop the old global unique kotNumber index
  try {
    await db.collection("orders").dropIndex("kotNumber_1");
    console.log("✅ Dropped old kotNumber_1 index");
  } catch (e) {
    console.log(
      "ℹ️  kotNumber_1 index not found (already dropped or never existed):",
      e.message,
    );
  }

  // 2. Reset today's counter to 0 so next order starts at KOT-001
  const today = new Date().toISOString().slice(0, 10);
  const key = `kot:${today}`;
  await db
    .collection("counters")
    .updateOne({ _id: key }, { $set: { seq: 0 } }, { upsert: true });
  console.log(`✅ Reset counter ${key} to seq=0`);

  // 3. Show current state
  const counters = await db.collection("counters").find({}).toArray();
  console.log("\n=== Counters now ===");
  console.log(JSON.stringify(counters, null, 2));

  const indexes = await db.collection("orders").indexes();
  console.log("\n=== Orders indexes now ===");
  console.log(
    JSON.stringify(
      indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique })),
      null,
      2,
    ),
  );

  await client.close();
}
main().catch(console.error);
