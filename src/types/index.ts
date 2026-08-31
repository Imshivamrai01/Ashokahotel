// ─── Auth & Roles ──────────────────────────────────────────────────────────

export type StaffRole =
  | "receptionist"
  | "captain"
  | "kitchen"
  | "cashier"
  | "lead_manager"
  | "inventory_manager";
export type UserRole = "admin" | StaffRole;

// ─── Branding ──────────────────────────────────────────────────────────────

export interface IBranding {
  _id: string;
  restaurantName: string;
  logoUrl?: string;
  whatsappNumber: string;
  callNumber: string;
  tagline?: string;
  primaryColor: string;
  accentColor?: string;
  coverVideoUrl?: string;
  coverImageUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  updatedAt: string;
}

// ─── Category ──────────────────────────────────────────────────────────────

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  iconEmoji?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Item ──────────────────────────────────────────────────────────────────

export interface IItem {
  _id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  videoUrl?: string;
  isVegetarian: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
  sortOrder: number;
  preparationTtlMinutes: number;
  trackInventory?: boolean;
  taxRatePercent?: number; // future use only — not used in billing
  taxIncluded?: boolean; // future use only — not used in billing
  hsn?: string;
  variations?: { name: string; price: number; recipeScale: number }[];
  addons?: {
    name: string;
    price: number;
    inventoryItemId?: string;
    qtyBase?: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface IItemWithCategory extends IItem {
  category?: ICategory;
}

// ─── Location ──────────────────────────────────────────────────────────────

export type LocationType = "room" | "table";

export interface ILocation {
  _id: string;
  type: LocationType;
  label: string;
  code: string;
  floor?: string;
  capacity?: number;
  isActive: boolean;
  isOccupied: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Staff ─────────────────────────────────────────────────────────────────

export interface IStaff {
  _id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Order / KOT ──────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending_captain"
  | "pending"
  | "preparing"
  | "partially_ready"
  | "ready"
  | "partially_delivered"
  | "delivered"
  | "cancelled"
  | "paid"
  | "cleared";

export type ItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash" | "card" | "upi";

export interface IOrderItem {
  _id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isVegetarian: boolean;
  preparationTtlMinutes: number;
  itemStatus: ItemStatus;
  orderedAt: string;
  preparingAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  isNC?: boolean;
  ncReason?: string;
  ncBy?: string;
  taxRate?: number;
  variationName?: string;
  addons?: { name: string; price: number }[];
}

export interface IOrder {
  _id: string;
  kotNumber: string;
  tableId: string;
  tableLabel: string;
  captainId?: string;
  captainName?: string;
  placedByRole?: "customer" | "captain" | "cashier" | "admin";
  isCaptainConfirmed?: boolean;
  confirmedByCaptainId?: string;
  confirmedByCaptainName?: string;
  confirmedAt?: string;
  status: OrderStatus;
  items: IOrderItem[];
  specialInstructions?: string;
  subtotal: number;
  tax?: number;
  total: number;
  discountType?: "percent" | "flat";
  discountValue?: number;
  discountAmount?: number;
  discountReason?: string;
  discountBy?: string;
  discountApproved?: boolean;
  paymentMethod?: PaymentMethod;
  paymentAmount?: number;
  cashierId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTier?: CustomerTier;
  isCustomerMarried?: boolean;
  customerDob?: string;
  customerAnniversary?: string;
  voucherCode?: string;
  voucherDiscount?: number;
  paidAt?: string;
  clearedAt?: string;
  voidReason?: string;
  voidedBy?: string;
  voidedByName?: string;
  voidedByRole?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledByRole?: string;
  cancelledAt?: string;
  transferredFrom?: string;
  reopenReason?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  refundAmount?: number;
  editedBy?: string;
  editedAt?: string;
  kotPrinted?: boolean;
  kotPrintedAt?: string;
  kotPrintAttempts?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Lead ──────────────────────────────────────────────────────────────────

export type LeadSource =
  | "walk_in"
  | "call"
  | "whatsapp"
  | "website"
  | "referral"
  | "social"
  | "other";

export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost"
  | "cold";

export type LeadPriority = "low" | "medium" | "high";

export type FollowUpType =
  | "call"
  | "whatsapp"
  | "email"
  | "meeting"
  | "site_visit";

export interface ILead {
  _id: string;
  leadManagerId: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  interest: string;
  budget?: string;
  status: LeadStatus;
  priority: LeadPriority;
  notes?: string;
  nextFollowUpAt?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IFollowUp {
  _id: string;
  leadId: string;
  staffId: string;
  staffName?: string;
  type: FollowUpType;
  notes: string;
  outcome?: string;
  nextFollowUpAt?: string;
  createdAt: string;
}

// ─── UI Helpers ────────────────────────────────────────────────────────────

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  imageUrl?: string;
  isVegetarian: boolean;
  variationName?: string;
  cartKey?: string;
}

export interface LocationContext {
  code: string;
  type: LocationType;
  label: string;
}

export interface CategoryWithItems extends ICategory {
  items: IItem[];
}

export type MenuViewMode = "mobile" | "tablet";
export type MenuMode = "room" | "table" | "none";

// ─── Metrics ───────────────────────────────────────────────────────────────

export interface OrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  avgPrepTimeMinutes: number;
  avgDeliveryTimeMinutes: number;
  ordersByPaymentMethod: Record<string, number>;
  revenueByDay: { date: string; revenue: number }[];
  topItems: { name: string; count: number }[];
}

// ─── Customer CRM & Loyalty ────────────────────────────────────────────────

export type CustomerTier = "new" | "regular" | "vip" | "platinum";

export interface ICustomer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  isMarried: boolean;
  dob?: string;
  anniversaryDate?: string;
  totalVisits: number;
  totalSpend: number;
  tier: CustomerTier;
  lastVisitAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Vouchers & Coupons ────────────────────────────────────────────────────

export interface IVoucher {
  _id: string;
  code: string;
  description?: string;
  discountType: "flat" | "percent";
  discountValue: number;
  minBillAmount?: number;
  maxDiscountAmount?: number;
  customerPhone?: string;
  validFrom: string;
  validTill: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

