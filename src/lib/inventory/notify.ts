import webpush from "web-push";
import InventoryItem from "@/lib/db/models/inventory/InventoryItem";
import PushSubscription from "@/lib/db/models/PushSubscription";
import { displayQty } from "@/lib/inventory/units";

let configured = false;
function ensureVapid() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  webpush.setVapidDetails("mailto:admin@ashokahotel.com", pub, priv);
  configured = true;
}

/**
 * Best-effort low-stock push to admin + inventory_manager devices. Fires once
 * per item per low episode (lowStockNotified flag), re-armed on restock.
 * Never throws — called post-commit, must not affect the order/sale.
 */
export async function notifyLowStock(itemIds: string[]) {
  try {
    ensureVapid();
    if (!configured || itemIds.length === 0) return;

    const items = await InventoryItem.find({
      _id: { $in: itemIds },
      isActive: true,
      reorderLevel: { $gt: 0 },
      lowStockNotified: { $ne: true },
      $expr: { $lte: ["$currentStock", "$reorderLevel"] },
    });
    if (items.length === 0) return;

    const subs = await PushSubscription.find({
      role: { $in: ["admin", "inventory_manager"] },
    });
    if (subs.length === 0) {
      // No subscribers yet — still mark notified so we don't recheck endlessly.
      await InventoryItem.updateMany(
        { _id: { $in: items.map((i) => i._id) } },
        { lowStockNotified: true },
      );
      return;
    }

    for (const item of items) {
      const payload = JSON.stringify({
        title: "Low stock",
        body: `${item.name} is low — ${displayQty(item.currentStock, item.measureType)} left.`,
        url: "/inventory",
      });
      await Promise.all(
        subs.map((sub) =>
          webpush
            .sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
              },
              payload,
            )
            .catch(async (err) => {
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                await PushSubscription.deleteOne({ endpoint: sub.endpoint });
              }
            }),
        ),
      );
      item.lowStockNotified = true;
      await item.save();
    }
  } catch {
    // best-effort
  }
}
