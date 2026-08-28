/**
 * Sample inventory data matching the seeded menu.
 *   npx tsx scripts/seed-inventory.ts
 * Idempotent: skips ingredients/recipes that already exist.
 * Quantities are in BASE units (g / ml / pcs). Costs are per base unit.
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not set");
  process.exit(1);
}

type MT = "weight" | "volume" | "count";
const BASE: Record<MT, string> = { weight: "g", volume: "ml", count: "pcs" };
const PURCHASE: Record<MT, { unit: string; factor: number }> = {
  weight: { unit: "kg", factor: 1000 },
  volume: { unit: "L", factor: 1000 },
  count: { unit: "pcs", factor: 1 },
};

// name, measureType, cost per base unit (₹), initial stock (base), reorder (base)
const INGREDIENTS: [string, string, MT, number, number, number][] = [
  ["Chicken", "Meat", "weight", 0.25, 20000, 3000],
  ["Mutton", "Meat", "weight", 0.6, 10000, 2000],
  ["Paneer", "Dairy", "weight", 0.4, 5000, 1000],
  ["Egg", "Dairy", "count", 6, 200, 30],
  ["Potato", "Vegetables", "weight", 0.03, 30000, 5000],
  ["Onion", "Vegetables", "weight", 0.04, 30000, 5000],
  ["Tomato", "Vegetables", "weight", 0.05, 20000, 4000],
  ["Mushroom", "Vegetables", "weight", 0.2, 4000, 1000],
  ["Mint", "Vegetables", "weight", 0.2, 1000, 200],
  ["Lemon", "Vegetables", "count", 5, 100, 20],
  ["Cashew", "Dry Goods", "weight", 0.8, 3000, 500],
  ["Basmati Rice", "Dry Goods", "weight", 0.12, 50000, 10000],
  ["Wheat Flour", "Dry Goods", "weight", 0.04, 40000, 8000],
  ["Maida", "Dry Goods", "weight", 0.05, 20000, 4000],
  ["Lentils", "Dry Goods", "weight", 0.12, 15000, 3000],
  ["Sugar", "Dry Goods", "weight", 0.045, 20000, 4000],
  ["Salt", "Dry Goods", "weight", 0.02, 10000, 2000],
  ["Spice Mix", "Dry Goods", "weight", 0.5, 5000, 1000],
  ["Cereal", "Dry Goods", "weight", 0.3, 3000, 500],
  ["Coffee Powder", "Beverage", "weight", 1.2, 2000, 300],
  ["Tea Leaves", "Beverage", "weight", 0.8, 2000, 300],
  ["Khoya", "Dairy", "weight", 0.4, 3000, 500],
  ["Butter", "Dairy", "weight", 0.5, 5000, 1000],
  ["Cooking Oil", "Dry Goods", "volume", 0.15, 20000, 4000],
  ["Milk", "Dairy", "volume", 0.06, 20000, 5000],
  ["Cream", "Dairy", "volume", 0.2, 4000, 1000],
  ["Pineapple Juice", "Beverage", "volume", 0.2, 5000, 1000],
  ["Soda", "Beverage", "volume", 0.05, 10000, 2000],
];

// menu item name → [ingredient name, qty in base unit per portion]
const RECIPES: Record<string, [string, number][]> = {
  "Masala Omelette": [["Egg", 2], ["Onion", 20], ["Tomato", 20], ["Cooking Oil", 10], ["Spice Mix", 3]],
  "Aloo Paratha": [["Wheat Flour", 100], ["Potato", 120], ["Cooking Oil", 15], ["Salt", 3]],
  "Cereal & Milk": [["Cereal", 50], ["Milk", 200], ["Sugar", 10]],
  "Chicken Lollipop": [["Chicken", 200], ["Cooking Oil", 30], ["Spice Mix", 8], ["Maida", 20]],
  "Paneer Tikka": [["Paneer", 180], ["Spice Mix", 8], ["Cooking Oil", 15], ["Onion", 30]],
  "Chilli Mushroom": [["Mushroom", 150], ["Onion", 40], ["Cooking Oil", 20], ["Spice Mix", 6]],
  "Butter Chicken": [["Chicken", 220], ["Tomato", 80], ["Butter", 30], ["Cream", 30], ["Spice Mix", 10]],
  "Dal Makhani": [["Lentils", 120], ["Butter", 20], ["Cream", 20], ["Onion", 30], ["Spice Mix", 8]],
  "Mutton Rogan Josh": [["Mutton", 250], ["Onion", 60], ["Cooking Oil", 30], ["Spice Mix", 12]],
  "Kaju Masala": [["Cashew", 80], ["Onion", 40], ["Tomato", 50], ["Cream", 20], ["Spice Mix", 8]],
  "Butter Naan": [["Maida", 100], ["Butter", 15], ["Milk", 30], ["Salt", 2]],
  "Laccha Paratha": [["Wheat Flour", 110], ["Cooking Oil", 20], ["Salt", 2]],
  "Chicken Biryani": [["Basmati Rice", 180], ["Chicken", 150], ["Onion", 40], ["Cooking Oil", 25], ["Spice Mix", 12]],
  "Veg Fried Rice": [["Basmati Rice", 180], ["Onion", 30], ["Cooking Oil", 20], ["Spice Mix", 5]],
  "Gulab Jamun": [["Khoya", 60], ["Sugar", 50], ["Cooking Oil", 30]],
  "Kulfi": [["Milk", 150], ["Sugar", 30], ["Cashew", 10]],
  "Masala Chai": [["Tea Leaves", 5], ["Milk", 100], ["Sugar", 15]],
  "Cold Coffee": [["Coffee Powder", 8], ["Milk", 200], ["Sugar", 20]],
  "Fresh Lime Soda": [["Lemon", 1], ["Soda", 200], ["Sugar", 15]],
  "Virgin Mojito": [["Mint", 10], ["Lemon", 1], ["Soda", 200], ["Sugar", 20]],
  "Piña Colada (Mock)": [["Pineapple Juice", 150], ["Cream", 30], ["Sugar", 15], ["Milk", 50]],
};

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected");

  const { default: InventoryItem } = await import(
    "../src/lib/db/models/inventory/InventoryItem"
  );
  const { default: StockMovement } = await import(
    "../src/lib/db/models/inventory/StockMovement"
  );
  const { default: Supplier } = await import(
    "../src/lib/db/models/inventory/Supplier"
  );
  const { default: Recipe } = await import(
    "../src/lib/db/models/inventory/Recipe"
  );
  const { default: Item } = await import("../src/lib/db/models/Item");

  // Supplier
  let supplier = await Supplier.findOne({ name: "Local Market" });
  if (!supplier) {
    supplier = await Supplier.create({ name: "Local Market", phone: "+910000000000" });
    console.log("✅  Supplier: Local Market");
  }

  // Ingredients + opening stock
  const idByName = new Map<string, mongoose.Types.ObjectId>();
  for (const [name, category, mt, cost, init, reorder] of INGREDIENTS) {
    let item = await InventoryItem.findOne({ name });
    if (!item) {
      item = await InventoryItem.create({
        name,
        category,
        measureType: mt,
        stockUnit: BASE[mt],
        purchaseUnit: PURCHASE[mt].unit,
        purchaseToStock: PURCHASE[mt].factor,
        currentStock: init,
        avgCost: cost,
        reorderLevel: reorder,
        defaultSupplierId: supplier._id,
        isActive: true,
      });
      // Opening-stock ledger entry
      await StockMovement.create({
        inventoryItemId: item._id,
        type: "purchase_in",
        qtyBase: init,
        unitCost: cost,
        balanceAfter: init,
        refType: "adjustment",
        reason: "Opening stock (sample seed)",
      });
      console.log(`✅  Ingredient: ${name} (${init}${BASE[mt]} @ ₹${cost}/${BASE[mt]})`);
    }
    idByName.set(name, item._id);
  }

  // Recipes + enable tracking on matching menu items
  for (const [dish, comps] of Object.entries(RECIPES)) {
    const menuItem = await Item.findOne({ name: dish });
    if (!menuItem) {
      console.log(`⚠️   Menu item not found, skipping recipe: ${dish}`);
      continue;
    }
    const existing = await Recipe.findOne({ kind: "menu", menuItemId: menuItem._id });
    if (existing) {
      console.log(`ℹ️   Recipe exists: ${dish}`);
      if (!menuItem.trackInventory) {
        menuItem.trackInventory = true;
        await menuItem.save();
      }
      continue;
    }
    let cost = 0;
    const components = comps.map(([ingName, qty]) => {
      const id = idByName.get(ingName)!;
      const ing = INGREDIENTS.find((x) => x[0] === ingName)!;
      const mt = ing[2];
      cost += qty * ing[3];
      return {
        kind: "item" as const,
        inventoryItemId: id,
        name: ingName,
        qty,
        unit: BASE[mt],
      };
    });
    await Recipe.create({
      kind: "menu",
      menuItemId: menuItem._id,
      yieldQty: 1,
      components,
      costCache: cost,
      isActive: true,
    });
    menuItem.trackInventory = true;
    await menuItem.save();
    console.log(`✅  Recipe: ${dish} (cost ₹${cost.toFixed(2)})`);
  }

  // ─── Sub-recipe demo: Gravy Base (used by Butter Chicken & Dal Makhani) ───
  const GRAVY_YIELD = 500; // makes 500 ml per batch definition
  // per-batch components (total for 500ml)
  const gravyComps: [string, number][] = [
    ["Tomato", 300],
    ["Onion", 250],
    ["Butter", 60],
    ["Cream", 60],
    ["Spice Mix", 30],
  ];
  const gravyBatchCost = gravyComps.reduce((s, [n, q]) => {
    const ing = INGREDIENTS.find((x) => x[0] === n)!;
    return s + q * ing[3];
  }, 0);
  const gravyCostPerMl = gravyBatchCost / GRAVY_YIELD;

  let gravyItem = await InventoryItem.findOne({ name: "Gravy Base" });
  if (!gravyItem) {
    gravyItem = await InventoryItem.create({
      name: "Gravy Base",
      category: "Prep",
      measureType: "volume",
      stockUnit: "ml",
      purchaseUnit: "ml",
      purchaseToStock: 1,
      isSubRecipe: true,
      currentStock: 5000, // opening prep stock (10 batches)
      avgCost: gravyCostPerMl,
      reorderLevel: 1000,
    });
    await StockMovement.create({
      inventoryItemId: gravyItem._id,
      type: "production_in",
      qtyBase: 5000,
      unitCost: gravyCostPerMl,
      balanceAfter: 5000,
      refType: "production",
      reason: "Opening prep stock (sample seed)",
    });
    await Recipe.create({
      kind: "sub",
      subRecipeName: "Gravy Base",
      outputItemId: gravyItem._id,
      outputUnit: "ml",
      yieldQty: GRAVY_YIELD,
      components: gravyComps.map(([n, q]) => {
        const ing = INGREDIENTS.find((x) => x[0] === n)!;
        return {
          kind: "item",
          inventoryItemId: idByName.get(n),
          name: n,
          qty: q,
          unit: BASE[ing[2]],
        };
      }),
      costCache: gravyCostPerMl,
    });
    console.log(`✅  Sub-recipe: Gravy Base (₹${gravyCostPerMl.toFixed(3)}/ml, 5000ml opening)`);
  }
  const gravySub = await Recipe.findOne({ kind: "sub", subRecipeName: "Gravy Base" });

  // Rewire Butter Chicken & Dal Makhani to use Gravy Base.
  const subRecipes: Record<string, { items: [string, number][]; gravy: number }> = {
    "Butter Chicken": { items: [["Chicken", 220], ["Cream", 15], ["Spice Mix", 5]], gravy: 150 },
    "Dal Makhani": { items: [["Lentils", 120], ["Butter", 10], ["Cream", 10]], gravy: 100 },
  };
  for (const [dish, def] of Object.entries(subRecipes)) {
    const menuItem = await Item.findOne({ name: dish });
    if (!menuItem || !gravySub) continue;
    let cost = def.gravy * gravyCostPerMl;
    const components = [
      ...def.items.map(([n, q]) => {
        const ing = INGREDIENTS.find((x) => x[0] === n)!;
        cost += q * ing[3];
        return {
          kind: "item" as const,
          inventoryItemId: idByName.get(n),
          name: n,
          qty: q,
          unit: BASE[ing[2]],
        };
      }),
      {
        kind: "sub" as const,
        subRecipeId: gravySub._id,
        name: "Gravy Base",
        qty: def.gravy,
        unit: "ml",
      },
    ];
    await Recipe.findOneAndUpdate(
      { kind: "menu", menuItemId: menuItem._id },
      { kind: "menu", menuItemId: menuItem._id, yieldQty: 1, components, costCache: cost, isActive: true },
      { upsert: true },
    );
    menuItem.trackInventory = true;
    await menuItem.save();
    console.log(`✅  Recipe (uses Gravy Base): ${dish} (cost ₹${cost.toFixed(2)})`);
  }

  await mongoose.disconnect();
  console.log("\n🎉  Inventory sample seed complete!");
}

main().catch((e) => {
  console.error("❌  Failed:", e);
  process.exit(1);
});
