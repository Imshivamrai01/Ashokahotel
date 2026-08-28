import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import AdminUser from "@/lib/db/models/AdminUser";
import Staff from "@/lib/db/models/Staff";
import Branding from "@/lib/db/models/Branding";
import Category from "@/lib/db/models/Category";
import Item from "@/lib/db/models/Item";
import Location from "@/lib/db/models/Location";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function GET() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI!;
    console.log("Connecting to:", MONGODB_URI.replace(/:([^:@]+)@/, ":****@"));
    
    // Connect with a 6-second timeout so it doesn't hang if Atlas network/IP is blocked
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });
    console.log("Connected to MongoDB database:", mongoose.connection.name);

    // 1. Admin User
    let admin = await AdminUser.findOne({ email: "admin@ashoka.com" });
    if (!admin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin = await (AdminUser.create as any)({
        name: "Ashoka Admin",
        email: "admin@ashoka.com",
        password: "admin123",
        isActive: true,
      });
    } else {
      admin.password = "admin123";
      admin.isActive = true;
      await admin.save();
    }

    // 2. Staff Accounts (Receptionist + Operations)
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
    ];

    for (const staff of staffAccounts) {
      let existing = await Staff.findOne({ email: staff.email });
      if (!existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (Staff.create as any)({ ...staff, isActive: true });
      } else {
        existing.password = staff.password;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existing.role = staff.role as any;
        existing.isActive = true;
        await existing.save();
      }
    }

    // 3. Branding
    let branding = await Branding.findOne({});
    if (!branding) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      branding = await (Branding.create as any)({
        restaurantName: "Ashoka Hotel",
        hotelName: "Ashoka Hotel",
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
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (branding as any).restaurantName = "Ashoka Hotel";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (branding as any).hotelName = "Ashoka Hotel";
      branding.tagline = "Experience Royal Hospitality & Luxury Dining";
      await branding.save();
    }

    // 4. Categories
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdCategories: Record<string, any> = {};
    for (const cat of categories) {
      let existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        existing = await Category.create({
          ...cat,
          slug: toSlug(cat.name),
          isActive: true,
        });
      }
      createdCategories[cat.name] = existing._id;
    }

    // 5. Sample Items
    const sampleItems = [
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
      const slug = toSlug(item.name);
      let existing = await Item.findOne({ slug });
      if (!existing) {
        const { categoryName, ...rest } = item;
        void categoryName;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (Item.create as any)({
          ...rest,
          slug,
          categoryId: catId,
          isActive: true,
          isFeatured: false,
          sortOrder: 0,
        });
      } else {
        existing.price = item.price;
        existing.categoryId = catId;
        existing.description = item.description;
        existing.isVegetarian = item.isVegetarian;
        await existing.save();
      }
    }

    // 6. Hotel Rooms & Tables
    const hotelLocations: Array<{
      label: string;
      code: string;
      type: "room" | "table";
      floor: string;
      capacity: number;
    }> = [
      { label: "Room 101", code: "R101", type: "room", floor: "1st Floor", capacity: 2 },
      { label: "Room 102", code: "R102", type: "room", floor: "1st Floor", capacity: 2 },
      { label: "Room 103", code: "R103", type: "room", floor: "1st Floor", capacity: 3 },
      { label: "Room 104", code: "R104", type: "room", floor: "1st Floor", capacity: 4 },
      { label: "Room 201", code: "R201", type: "room", floor: "2nd Floor", capacity: 2 },
      { label: "Room 202", code: "R202", type: "room", floor: "2nd Floor", capacity: 2 },
      { label: "Room 203", code: "R203", type: "room", floor: "2nd Floor", capacity: 3 },
      { label: "Room 204", code: "R204", type: "room", floor: "2nd Floor", capacity: 4 },
      { label: "Suite 301", code: "R301", type: "room", floor: "3rd Floor", capacity: 4 },
      { label: "Suite 302", code: "R302", type: "room", floor: "3rd Floor", capacity: 4 },
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
      } else {
        existing.label = loc.label;
        existing.type = loc.type;
        existing.floor = loc.floor;
        await existing.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Ashoka Hotel database migrated and initialized successfully!",
      admin: "admin@ashoka.com / admin123",
      receptionist: "reception@ashoka.com / reception123",
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || String(error), stack: error?.stack },
      { status: 200 }
    );
  }
}
