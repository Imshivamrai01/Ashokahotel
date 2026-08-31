import { z } from "zod";

// ─── Branding ───────────────────────────────────────────────────────────────
export const BrandingSchema = z.object({
  hotelName: z.string().min(1, "Business name is required").max(100),
  tagline: z.string().max(200).optional(),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  coverImageUrl: z
    .string()
    .url("Invalid cover image URL")
    .optional()
    .or(z.literal("")),
  coverVideoUrl: z
    .string()
    .url("Invalid cover video URL")
    .optional()
    .or(z.literal("")),
  // Allow "" so a blank/cleared colour never silently blocks the whole save
  // (the form validates client-side; "" ≠ undefined would fail the regex).
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .or(z.literal("")),
  whatsappNumber: z
    .string()
    .regex(/^\d{10,15}$/, "WhatsApp number must be 10–15 digits")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gstEnabled: z.boolean().optional(),
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  // A blank field arrives as ""/null/NaN/undefined; if it were left optional an
  // undefined would be dropped by JSON.stringify → Mongo $set never writes it →
  // the rate appears "not saved". Coerce blank → 5 and default omitted → 5 so
  // the server ALWAYS persists a concrete number. An explicit 0 still saves.
  gstRatePercent: z
    .preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? 5
          : v,
      z.number().min(0).max(100),
    )
    .default(5),
  pricesIncludeTax: z.boolean().optional(),
  // Discount governance. Blank number inputs → NaN; coerce to sensible defaults.
  maxDiscountPercent: z
    .preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? 20
          : v,
      z.number().min(0).max(100),
    )
    .default(20),
  discountRequiresReason: z.boolean().optional(),
  discountApprovalThresholdPercent: z
    .preprocess(
      (v) =>
        v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
          ? 10
          : v,
      z.number().min(0).max(100),
    )
    .default(10),
  // Raw PIN typed by the admin to SET/CHANGE the override PIN. "" = leave as-is.
  // Never returned to the client; hashed server-side. 4–6 digits.
  managerPin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4–6 digits")
    .optional()
    .or(z.literal("")),
});

export type BrandingInput = z.infer<typeof BrandingSchema>;

// ─── Category ────────────────────────────────────────────────────────────────
export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(60),
  description: z.string().max(300).optional(),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof CategorySchema>;

// ─── Item ────────────────────────────────────────────────────────────────────
export const ItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100),
  description: z
    .preprocess(
      (v) => (v === null || v === undefined ? "" : String(v).trim()),
      z.string().max(500).optional().or(z.literal("")),
    )
    .default(""),
  price: z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(Number(v)) ? 0 : Number(v)),
    z.number().min(0, "Price must be greater than or equal to 0"),
  ),
  categoryId: z.string().min(1, "Category is required"),
  imageUrl: z
    .preprocess(
      (v) => (v === null || v === undefined ? "" : String(v).trim()),
      z.string().url("Invalid image URL").optional().or(z.literal("")),
    )
    .default(""),
  videoUrl: z
    .preprocess(
      (v) => (v === null || v === undefined ? "" : String(v).trim()),
      z.string().url("Invalid video URL").optional().or(z.literal("")),
    )
    .default(""),
  // Item-level tax is NOT used in billing (bill GST is applied at order level
  // from branding). These two are stored per item for FUTURE use only.
  // Blank number input → NaN; coerce blank/NaN → 0 so the save never fails.
  taxRatePercent: z.preprocess(
    (v) =>
      v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
        ? 0
        : Number(v),
    z.number().min(0).max(100),
  ).default(0),
  taxIncluded: z.boolean().default(false),
  hsn: z
    .preprocess(
      (v) => (v === null || v === undefined ? "" : String(v).trim()),
      z.string().max(20).optional().or(z.literal("")),
    )
    .default(""),
  variations: z
    .preprocess(
      (val) => {
        if (!Array.isArray(val)) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleaned = val
          .filter((v: any) => v && (String(v.name || "").trim() || (Number(v.price) > 0)))
          .map((v: any) => ({
            name: String(v.name || "").trim(),
            price: Number.isNaN(Number(v.price)) ? 0 : Number(v.price),
            recipeScale:
              v.recipeScale === "" || v.recipeScale == null || Number.isNaN(Number(v.recipeScale))
                ? 1
                : Number(v.recipeScale),
          }));
        return cleaned;
      },
      z.array(
        z.object({
          name: z.string().min(1, "Variation name is required").max(40),
          price: z.number().min(0, "Price must be >= 0"),
          recipeScale: z.number().min(0).default(1),
        }),
      ).default([]),
    )
    .default([]),
  addons: z
    .preprocess(
      (val) => {
        if (!Array.isArray(val)) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleaned = val
          .filter((v: any) => v && (String(v.name || "").trim() || (Number(v.price) > 0)))
          .map((v: any) => ({
            name: String(v.name || "").trim(),
            price: Number.isNaN(Number(v.price)) ? 0 : Number(v.price),
            inventoryItemId: v.inventoryItemId || undefined,
            qtyBase:
              v.qtyBase === "" || v.qtyBase == null || Number.isNaN(Number(v.qtyBase))
                ? undefined
                : Number(v.qtyBase),
          }));
        return cleaned;
      },
      z.array(
        z.object({
          name: z.string().min(1, "Add-on name is required").max(40),
          price: z.number().min(0, "Price must be >= 0"),
          inventoryItemId: z.string().optional().or(z.literal("")),
          qtyBase: z.number().min(0).optional(),
        }),
      ).default([]),
    )
    .default([]),
  isVeg: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  preparationTtlMinutes: z.preprocess(
    (v) =>
      v === "" || v === null || Number.isNaN(Number(v)) ? 15 : Number(v),
    z.number().int().min(1).max(120).default(15),
  ),
  tags: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string().max(30)).max(10).default([]),
  ),
  allergens: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string().max(30)).max(10).default([]),
  ),
  sortOrder: z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(Number(v)) ? 0 : Number(v)),
    z.number().int().min(0).default(0),
  ),
});

export type ItemInput = z.infer<typeof ItemSchema>;

// ─── Location ────────────────────────────────────────────────────────────────
export const LocationSchema = z.object({
  label: z.string().min(1, "Location label is required").max(60),
  type: z.enum(["table", "room"]),
  floor: z.string().max(20).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  isActive: z.boolean().default(true),
});

export type LocationInput = z.infer<typeof LocationSchema>;

// ─── Staff ───────────────────────────────────────────────────────────────────
export const StaffSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72)
    .optional(),
  role: z.enum([
    "receptionist",
    "captain",
    "kitchen",
    "cashier",
    "lead_manager",
    "inventory_manager",
  ]),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4–6 digits")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(15).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const StaffUpdateSchema = StaffSchema.extend({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72)
    .optional()
    .or(z.literal("")),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4–6 digits")
    .optional()
    .or(z.literal("")),
});

export type StaffInput = z.infer<typeof StaffSchema>;
export type StaffUpdateInput = z.infer<typeof StaffUpdateSchema>;

// ─── Order ───────────────────────────────────────────────────────────────────
export const OrderItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(200).optional(),
});

export const CreateOrderSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  guestName: z.string().max(100).optional(),
  guestPhone: z.string().max(15).optional(),
  notes: z.string().max(500).optional(),
  source: z
    .enum(["qr_room", "qr_table", "captain", "whatsapp"])
    .default("captain"),
});

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "delivered",
    "cancelled",
    "billed",
  ]),
  itemId: z.string().optional(), // for per-item status updates
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

// ─── Lead ────────────────────────────────────────────────────────────────────
export const LeadSchema = z.object({
  guestName: z.string().min(1, "Guest name is required").max(100),
  phone: z
    .string()
    .regex(/^\d{10,15}$/, "Phone must be 10–15 digits")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  company: z.string().max(100).optional(),
  source: z.enum([
    "walk_in",
    "website",
    "referral",
    "social_media",
    "whatsapp",
    "phone",
    "email",
    "other",
  ]),
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal_sent",
      "negotiation",
      "won",
      "lost",
      "on_hold",
    ])
    .default("new"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  estimatedValue: z.number().min(0).optional(),
  eventDate: z.string().datetime().optional().or(z.literal("")),
  eventType: z.string().max(100).optional(),
  guestCount: z.number().int().min(1).optional(),
  notes: z.string().max(2000).optional(),
  nextFollowUpAt: z.string().datetime().optional().or(z.literal("")),
  leadManagerId: z.string().optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;

// ─── Follow-up ───────────────────────────────────────────────────────────────
export const FollowUpSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  type: z.enum(["call", "email", "whatsapp", "meeting", "note"]),
  notes: z.string().min(1, "Notes are required").max(2000),
  outcome: z.string().max(500).optional(),
  nextFollowUpAt: z.string().datetime().optional().or(z.literal("")),
  scheduledAt: z.string().datetime().optional(),
});

export type FollowUpInput = z.infer<typeof FollowUpSchema>;

// ─── Login ───────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  role: z
    .enum(["admin", "captain", "kitchen", "cashier", "lead_manager"])
    .optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
