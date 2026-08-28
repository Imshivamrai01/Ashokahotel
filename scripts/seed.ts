/**
 * Seed script — run with:
 *   npx tsx scripts/seed.ts
 *
 * Requires MONGODB_URI in .env.local
 */
import "dotenv/config";
import mongoose from "mongoose";

// Load .env.local
import { config } from "dotenv";
config({ path: ".env.local", override: true });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env.local");
  process.exit(1);
}

/** Convert a name to a URL-safe slug */
function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB:", MONGODB_URI.split("@")[1] || "Cluster");

  // Dynamic imports so models register after connection
  const { default: AdminUser } = await import("../src/lib/db/models/AdminUser");
  const { default: Staff } = await import("../src/lib/db/models/Staff");
  const { default: Branding } = await import("../src/lib/db/models/Branding");
  const { default: Category } = await import("../src/lib/db/models/Category");
  const { default: Item } = await import("../src/lib/db/models/Item");
  const { default: Location } = await import("../src/lib/db/models/Location");

  // ─── Admin User ────────────────────────────────────────────────────────────
  const existingAdmin = await AdminUser.findOne({ email: "admin@ashoka.com" });
  if (!existingAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (AdminUser.create as any)({
      name: "Ashoka Admin",
      email: "admin@ashoka.com",
      password: "admin123",
      isActive: true,
    });
    console.log("✅  Admin user created: admin@ashoka.com / admin123");
  } else {
    existingAdmin.password = "admin123";
    await existingAdmin.save();
    console.log("ℹ️   Admin user updated: admin@ashoka.com / admin123");
  }

  // ─── Staff Accounts (Receptionist + Operations) ─────────────────────────────
  const staffAccounts = [
    {
      name: "Ashoka Reception Desk",
      email: "reception@ashoka.com",
      role: "receptionist",
      password: "reception123",
    },
    {
      name: "Captain Room Service",
      email: "captain@ashoka.com",
      role: "captain",
      password: "captain123",
    },
    {
      name: "Kitchen Head Chef",
      email: "kitchen@ashoka.com",
      role: "kitchen",
      password: "kitchen123",
    },
    {
      name: "Billing Cashier",
      email: "cashier@ashoka.com",
      role: "cashier",
      password: "cashier123",
    },
  ] as const;

  for (const staff of staffAccounts) {
    const existing = await Staff.findOne({ email: staff.email });
    if (!existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (Staff.create as any)({ ...staff, isActive: true });
      console.log(
        `✅  Staff created: ${staff.email} / ${staff.password} [${staff.role}]`,
      );
    } else {
      existing.password = staff.password as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      existing.role = staff.role as any;
      await existing.save();
      console.log(`ℹ️   Staff updated: ${staff.email} [${staff.role}]`);
    }
  }

  // ─── Branding ──────────────────────────────────────────────────────────────
  const existingBranding = await Branding.findOne({});
  if (!existingBranding) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (Branding.create as any)({
      restaurantName: "Ashoka Hotel",
      tagline: "Experience Royal Hospitality & Luxury Dining",
      primaryColor: "#0F172A",
      accentColor: "#D97706",
      whatsappNumber: "+919876543210",
      callNumber: "+919876543210",
      address: "Ashoka Hotel, Main Road, City Center",
      gstEnabled: true,
      gstRatePercent: 5,
      gstNumber: "07AAAAA0000A1Z5",
      pricesIncludeTax: false,
    });
    console.log("✅  Branding created for Ashoka Hotel");
  } else {
    existingBranding.restaurantName = "Ashoka Hotel";
    existingBranding.tagline = "Experience Royal Hospitality & Luxury Dining";
    await existingBranding.save();
    console.log("ℹ️   Branding updated for Ashoka Hotel");
  }

  // ─── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: "Breakfast", description: "Fresh morning delights & breakfast sets", sortOrder: 1 },
    { name: "Starters & Appetizers", description: "Crispy tandoori & hot appetizers", sortOrder: 2 },
    { name: "Main Course", description: "Authentic curries & royal gravies", sortOrder: 3 },
    { name: "Breads & Naan", description: "Fresh clay oven rotis & parathas", sortOrder: 4 },
    { name: "Biryani & Rice", description: "Fragrant basmati biryanis & pulao", sortOrder: 5 },
    { name: "Snacks & Quick Bites", description: "Sandwiches, pakodas, rolls & room bites", sortOrder: 6 },
    { name: "Desserts & Sweets", description: "Sweet indulgence & ice creams", sortOrder: 7 },
    { name: "Beverages & Shakes", description: "Tea, artisan coffee, fresh juices & shakes", sortOrder: 8 },
  ];

  const createdCategories: Record<string, mongoose.Types.ObjectId> = {};
  for (const cat of categories) {
    let existing = await Category.findOne({ name: cat.name });
    if (!existing) {
      existing = await Category.create({
        ...cat,
        slug: toSlug(cat.name),
        isActive: true,
      });
      console.log(`✅  Category created: ${cat.name}`);
    }
    createdCategories[cat.name] = existing._id;
  }

  // ─── Menu Items ────────────────────────────────────────────────────────────
  const sampleItems = [
    // Breakfast
    {
      name: "Masala Omelette with Toast",
      price: 140,
      categoryName: "Breakfast",
      isVegetarian: false,
      preparationTtlMinutes: 10,
      description: "2-egg fluffy omelette with onions, tomatoes, green chillies and toasted butter bread",
    },
    {
      name: "Aloo Pyaaz Paratha with Curd & Pickle",
      price: 120,
      categoryName: "Breakfast",
      isVegetarian: true,
      preparationTtlMinutes: 12,
      description: "Crispy tandoor spiced potato paratha served with fresh curd and homemade pickle",
    },
    {
      name: "Puri Bhaji Set",
      price: 130,
      categoryName: "Breakfast",
      isVegetarian: true,
      preparationTtlMinutes: 12,
      description: "4 fluffy deep fried puris served with spiced tangy potato curry",
    },
    {
      name: "South Indian Idli Sambar (4 pcs)",
      price: 110,
      categoryName: "Breakfast",
      isVegetarian: true,
      preparationTtlMinutes: 8,
      description: "Steamed rice cakes served with aromatic sambar and fresh coconut chutney",
    },
    // Starters
    {
      name: "Paneer Tikka (Tandoori)",
      price: 280,
      categoryName: "Starters & Appetizers",
      isVegetarian: true,
      preparationTtlMinutes: 18,
      description: "Juicy cottage cheese cubes marinated in tandoori spices and char-grilled",
    },
    {
      name: "Crispy Corn Chilli Pepper",
      price: 220,
      categoryName: "Starters & Appetizers",
      isVegetarian: true,
      preparationTtlMinutes: 15,
      description: "Golden fried sweet corn tossed with spring onions and crushed pepper",
    },
    {
      name: "Chicken Tikka Angara",
      price: 360,
      categoryName: "Starters & Appetizers",
      isVegetarian: false,
      preparationTtlMinutes: 20,
      description: "Spicy smoky boneless chicken cubes roasted over charcoal",
    },
    {
      name: "Tandoori Chicken (Half)",
      price: 340,
      categoryName: "Starters & Appetizers",
      isVegetarian: false,
      preparationTtlMinutes: 22,
      description: "Classic marinated chicken with bone, roasted in clay oven",
    },
    // Main Course
    {
      name: "Paneer Butter Masala",
      price: 290,
      categoryName: "Main Course",
      isVegetarian: true,
      preparationTtlMinutes: 20,
      description: "Cottage cheese simmered in rich creamy tomato and butter gravy",
    },
    {
      name: "Dal Makhani Royal",
      price: 260,
      categoryName: "Main Course",
      isVegetarian: true,
      preparationTtlMinutes: 20,
      description: "Slow-cooked black lentils finished with cream, butter and kasturi methi",
    },
    {
      name: "Kadai Paneer",
      price: 280,
      categoryName: "Main Course",
      isVegetarian: true,
      preparationTtlMinutes: 18,
      description: "Paneer with bell peppers, onions and crushed coriander in semi-dry masala",
    },
    {
      name: "Butter Chicken (Boneless)",
      price: 390,
      categoryName: "Main Course",
      isVegetarian: false,
      preparationTtlMinutes: 25,
      description: "Tender grilled chicken chunks in velvety smooth makhani gravy",
    },
    {
      name: "Chicken Curry Home Style",
      price: 360,
      categoryName: "Main Course",
      isVegetarian: false,
      preparationTtlMinutes: 22,
      description: "Traditional Indian chicken curry cooked with aromatic whole spices",
    },
    {
      name: "Mutton Rogan Josh",
      price: 480,
      categoryName: "Main Course",
      isVegetarian: false,
      preparationTtlMinutes: 30,
      description: "Kashmiri style tender lamb curry slow-cooked with ratanjot and saffron notes",
    },
    // Breads
    {
      name: "Butter Naan",
      price: 55,
      categoryName: "Breads & Naan",
      isVegetarian: true,
      preparationTtlMinutes: 6,
      description: "Clay oven leavened bread layered with melted butter",
    },
    {
      name: "Garlic Naan",
      price: 65,
      categoryName: "Breads & Naan",
      isVegetarian: true,
      preparationTtlMinutes: 6,
      description: "Naan topped with chopped garlic and coriander butter",
    },
    {
      name: "Tandoori Roti (Butter)",
      price: 30,
      categoryName: "Breads & Naan",
      isVegetarian: true,
      preparationTtlMinutes: 5,
      description: "Whole wheat bread baked in tandoor",
    },
    {
      name: "Laccha Paratha",
      price: 60,
      categoryName: "Breads & Naan",
      isVegetarian: true,
      preparationTtlMinutes: 8,
      description: "Multi-layered crispy flaky bread",
    },
    // Biryani & Rice
    {
      name: "Hyderabadi Chicken Dum Biryani",
      price: 380,
      categoryName: "Biryani & Rice",
      isVegetarian: false,
      preparationTtlMinutes: 25,
      description: "Fragrant basmati rice layered with spiced marinated chicken, served with raita & salan",
    },
    {
      name: "Royal Veg Dum Biryani",
      price: 270,
      categoryName: "Biryani & Rice",
      isVegetarian: true,
      preparationTtlMinutes: 20,
      description: "Exotic garden vegetables & basmati rice cooked on slow dum with saffron & mint",
    },
    {
      name: "Jeera Rice",
      price: 160,
      categoryName: "Biryani & Rice",
      isVegetarian: true,
      preparationTtlMinutes: 10,
      description: "Aromatic basmati rice tempered with ghee and roasted cumin",
    },
    // Snacks
    {
      name: "Veg Grilled Club Sandwich",
      price: 180,
      categoryName: "Snacks & Quick Bites",
      isVegetarian: true,
      preparationTtlMinutes: 12,
      description: "Triple-layer toasted sandwich loaded with cheese, cucumber, tomato & mint mayo",
    },
    {
      name: "Paneer Pakoda Platter",
      price: 190,
      categoryName: "Snacks & Quick Bites",
      isVegetarian: true,
      preparationTtlMinutes: 15,
      description: "Spiced paneer fritters served hot with green chutney and tomato sauce",
    },
    {
      name: "French Fries (Peri Peri)",
      price: 140,
      categoryName: "Snacks & Quick Bites",
      isVegetarian: true,
      preparationTtlMinutes: 10,
      description: "Crispy potato fries dusted with zesty peri peri seasoning",
    },
    // Desserts
    {
      name: "Gulab Jamun (2 Pcs with Rabri)",
      price: 130,
      categoryName: "Desserts & Sweets",
      isVegetarian: true,
      preparationTtlMinutes: 5,
      description: "Warm khoya dumplings topped with thickened saffron rabri",
    },
    {
      name: "Matka Malai Kulfi",
      price: 120,
      categoryName: "Desserts & Sweets",
      isVegetarian: true,
      preparationTtlMinutes: 3,
      description: "Traditional frozen milk dessert with pistachios and almonds in earthen pot",
    },
    // Beverages
    {
      name: "Special Masala Tea",
      price: 50,
      categoryName: "Beverages & Shakes",
      isVegetarian: true,
      preparationTtlMinutes: 5,
      description: "Brewed milk tea with crushed ginger, cardamom and cloves",
    },
    {
      name: "Cappuccino / Filter Coffee",
      price: 90,
      categoryName: "Beverages & Shakes",
      isVegetarian: true,
      preparationTtlMinutes: 5,
      description: "Hot freshly frothed coffee",
    },
    {
      name: "Cold Coffee with Ice Cream",
      price: 140,
      categoryName: "Beverages & Shakes",
      isVegetarian: true,
      preparationTtlMinutes: 6,
      description: "Rich chilled coffee blended and topped with vanilla ice cream",
    },
    {
      name: "Fresh Lime Soda (Sweet & Salt)",
      price: 80,
      categoryName: "Beverages & Shakes",
      isVegetarian: true,
      preparationTtlMinutes: 3,
      description: "Refreshing sparkling lime cooler",
    },
  ];

  for (const item of sampleItems) {
    const catId = createdCategories[item.categoryName];
    if (!catId) continue;
    const existing = await Item.findOne({ name: item.name });
    if (!existing) {
      const { categoryName, ...rest } = item;
      void categoryName;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (Item.create as any)({
        ...rest,
        slug: toSlug(item.name),
        categoryId: catId,
        isActive: true,
        isFeatured: false,
        sortOrder: 0,
      });
      console.log(`✅  Item created: ${item.name}`);
    }
  }

  // ─── Hotel Room & Table Locations ──────────────────────────────────────────
  const hotelLocations: Array<{
    label: string;
    code: string;
    type: "room" | "table";
    floor: string;
    capacity: number;
  }> = [
    // 1st Floor Rooms
    { label: "Room 101", code: "R101", type: "room", floor: "1st Floor", capacity: 2 },
    { label: "Room 102", code: "R102", type: "room", floor: "1st Floor", capacity: 2 },
    { label: "Room 103", code: "R103", type: "room", floor: "1st Floor", capacity: 3 },
    { label: "Room 104", code: "R104", type: "room", floor: "1st Floor", capacity: 4 },
    // 2nd Floor Rooms
    { label: "Room 201", code: "R201", type: "room", floor: "2nd Floor", capacity: 2 },
    { label: "Room 202", code: "R202", type: "room", floor: "2nd Floor", capacity: 2 },
    { label: "Room 203", code: "R203", type: "room", floor: "2nd Floor", capacity: 3 },
    { label: "Room 204", code: "R204", type: "room", floor: "2nd Floor", capacity: 4 },
    // 3rd Floor Suites
    { label: "Suite 301", code: "R301", type: "room", floor: "3rd Floor", capacity: 4 },
    { label: "Suite 302", code: "R302", type: "room", floor: "3rd Floor", capacity: 4 },
    // Dining Tables / Garden
    { label: "Restaurant Table 1", code: "T01", type: "table", floor: "Ground Floor", capacity: 4 },
    { label: "Restaurant Table 2", code: "T02", type: "table", floor: "Ground Floor", capacity: 4 },
    { label: "Restaurant Table 3", code: "T03", type: "table", floor: "Ground Floor", capacity: 6 },
    { label: "Lawn Table L1", code: "L01", type: "table", floor: "Lawn & Garden", capacity: 8 },
  ];

  for (const loc of hotelLocations) {
    const existing = await Location.findOne({ code: loc.code });
    if (!existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (Location.create as any)({
        ...loc,
        isActive: true,
        isOccupied: false,
      });
      console.log(`✅  Location created: ${loc.label} [${loc.type}]`);
    } else {
      existing.label = loc.label;
      existing.type = loc.type;
      existing.floor = loc.floor;
      await existing.save();
    }
  }

  await mongoose.disconnect();
  console.log("\n🎉  Ashoka Hotel Database Migration & Seed completed successfully!");
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
