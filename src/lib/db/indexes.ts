/**
 * ensureIndexes — call this once at app startup (e.g. in mongoose.ts)
 * to guarantee all performance-critical indexes exist on the Atlas cluster.
 *
 * Mongoose auto-creates indexes in dev, but on Atlas you may have
 * `autoIndex: false` set for production — this helper bridges the gap.
 */
import Order from "./models/Order";
import Lead from "./models/Lead";
import Item from "./models/Item";
import Staff from "./models/Staff";
import Location from "./models/Location";
import FollowUp from "./models/FollowUp";

export async function ensureIndexes() {
  await Promise.all([
    // Orders — KDS polling, cashier queue, metrics aggregation
    Order.collection.createIndex({ status: 1 }),
    Order.collection.createIndex({ tableId: 1, status: 1 }),
    Order.collection.createIndex({ captainId: 1 }),
    Order.collection.createIndex({ createdAt: -1 }),
    Order.collection.dropIndex("kotNumber_1").catch(() => {}), // Clean up incorrect global unique index
    Order.collection.createIndex({ kotDate: 1, kotNumber: 1 }, { unique: true }), // Correct daily unique index
    Order.collection.createIndex({ kotPrinted: 1, createdAt: -1 }),

    // Leads — LM dashboard filters
    Lead.collection.createIndex({ leadManagerId: 1 }),
    Lead.collection.createIndex({ status: 1 }),
    Lead.collection.createIndex({ nextFollowUpAt: 1 }),
    Lead.collection.createIndex({ assignedTo: 1 }),

    // Follow-ups — timeline query
    FollowUp.collection.createIndex({ leadId: 1, createdAt: -1 }),

    // Items — menu render
    Item.collection.createIndex({ categoryId: 1, sortOrder: 1 }),
    Item.collection.createIndex({ isAvailable: 1 }),

    // Staff — auth lookup
    Staff.collection.createIndex({ email: 1 }, { unique: true }),
    Staff.collection.createIndex({ role: 1, isActive: 1 }),

    // Locations — captain table selector
    Location.collection.createIndex({ type: 1, isActive: 1 }),
  ]);
}
