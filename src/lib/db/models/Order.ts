import mongoose, { Schema, Document, Model } from "mongoose";

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

export interface IOrderItemDoc {
  _id: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isVegetarian: boolean;
  preparationTtlMinutes: number;
  itemStatus: ItemStatus;
  orderedAt: Date;
  preparingAt?: Date;
  readyAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId; // staff who voided the item
  cancelReason?: string;
  // No-Charge (complimentary): item is still made & served but billed at ₹0.
  // Excluded from subtotal/total; `price` keeps the menu price for the record.
  isNC?: boolean;
  ncReason?: string;
  ncBy?: mongoose.Types.ObjectId; // staff who marked it NC
  taxRate?: number; // GST % snapshot for this line
  // Chosen options (variation + add-ons) snapshot.
  variationName?: string;
  variationScale?: number;
  addons?: {
    name: string;
    price: number;
    inventoryItemId?: mongoose.Types.ObjectId;
    qtyBase?: number;
  }[];
  // Inventory deduction bookkeeping (idempotent + reversible).
  stockDeducted?: boolean;
  stockMovementIds?: mongoose.Types.ObjectId[];
}

export interface ISplitPaymentEntry {
  method: "cash" | "card" | "upi";
  amount: number;
}

export interface IOrderDoc extends Document {
  kotNumber: string;
  tableId: mongoose.Types.ObjectId;
  tableLabel: string;
  captainId?: mongoose.Types.ObjectId;
  captainName?: string;
  placedByRole?: "customer" | "captain" | "cashier" | "admin"; // who actually created the order
  isCaptainConfirmed?: boolean;
  confirmedByCaptainId?: mongoose.Types.ObjectId;
  confirmedByCaptainName?: string;
  confirmedAt?: Date;
  status: OrderStatus;
  items: IOrderItemDoc[];
  specialInstructions?: string;
  subtotal: number;
  tax?: number;
  total: number;
  pricesIncludeTax?: boolean; // snapshot of the GST setting at order time
  billTaxRatePercent?: number; // bill-level GST % snapshot
  // Bill-level discount applied at billing time (pre-GST). For a table paid as
  // one bill, the discount is distributed across its KOTs proportionally.
  discountType?: "percent" | "flat";
  discountValue?: number; // as entered by the cashier (% or ₹)
  discountAmount?: number; // resolved ₹ applied to THIS order
  discountReason?: string;
  discountBy?: mongoose.Types.ObjectId; // staff who applied the discount
  discountApproved?: boolean; // true if a manager PIN authorised it
  paymentMethod?: "cash" | "card" | "upi";
  paymentAmount?: number;
  splitPayment?: ISplitPaymentEntry[];
  cashierId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTier?: string;
  isCustomerMarried?: boolean;
  customerDob?: Date;
  customerAnniversary?: Date;
  voucherCode?: string;
  voucherDiscount?: number;
  paidAt?: Date;
  clearedAt?: Date;
  voidReason?: string; // set when a table is freed without payment (no-show/walkout)
  voidedBy?: mongoose.Types.ObjectId;
  voidedByName?: string;
  voidedByRole?: string;
  cancelReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledByName?: string;
  cancelledByRole?: string;
  cancelledAt?: Date;
  transferredFrom?: string; // previous tableLabel when order moved between tables
  reopenReason?: string; // set when admin un-clears a paid/cleared order
  reopenedBy?: mongoose.Types.ObjectId;
  reopenedAt?: Date;
  refundAmount?: number; // amount refunded on reopen, if any
  editedBy?: mongoose.Types.ObjectId; // admin who last edited items post-placement
  editedAt?: Date;
  kotDate?: string; // "YYYY-MM-DD"
  kotPrinted?: boolean; // physical KOT printed by the local print agent
  kotPrintedAt?: Date; // timestamp of first successful print
  kotPrintAttempts?: number; // retry counter
  kotReprintSeq?: number; // bumped each time staff press Print on the KOT card
  kotReprintAt?: Date; // when the last reprint was asked for
  // Customer bill (tax invoice) printing via the local agent's BILL printer.
  billPrintRequested?: boolean; // cashier asked to print the bill
  billPrinted?: boolean;
  billPrintedAt?: Date;
  billPrintAttempts?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItemDoc>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String },
    isVegetarian: { type: Boolean, default: false },
    preparationTtlMinutes: { type: Number, default: 15 },
    itemStatus: {
      type: String,
      enum: ["pending", "preparing", "ready", "delivered", "cancelled"],
      default: "pending",
    },
    orderedAt: { type: Date, default: Date.now },
    preparingAt: { type: Date },
    readyAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    cancelReason: { type: String },
    isNC: { type: Boolean, default: false },
    ncReason: { type: String },
    ncBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    taxRate: { type: Number, default: 0 },
    variationName: { type: String },
    variationScale: { type: Number },
    addons: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
          qtyBase: { type: Number },
          _id: false,
        },
      ],
      default: undefined,
    },
    stockDeducted: { type: Boolean, default: false },
    stockMovementIds: { type: [Schema.Types.ObjectId], default: undefined },
  },
  { _id: true },
);

const OrderSchema = new Schema<IOrderDoc>(
  {
    kotNumber: { type: String, required: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    tableLabel: { type: String, required: true },
    captainId: { type: Schema.Types.ObjectId, ref: "Staff" },
    captainName: { type: String },
    placedByRole: {
      type: String,
      enum: ["customer", "captain", "cashier", "admin", "receptionist"],
      default: "captain",
    },
    isCaptainConfirmed: { type: Boolean, default: true },
    confirmedByCaptainId: { type: Schema.Types.ObjectId, ref: "Staff" },
    confirmedByCaptainName: { type: String },
    confirmedAt: { type: Date },
    status: {
      type: String,
      enum: [
        "pending_captain",
        "pending",
        "preparing",
        "partially_ready",
        "ready",
        "partially_delivered",
        "delivered",
        "cancelled",
        "paid",
        "cleared",
      ],
      default: "pending",
    },
    items: { type: [OrderItemSchema], required: true },
    specialInstructions: { type: String },
    subtotal: { type: Number, required: true },
    tax: { type: Number },
    total: { type: Number, required: true },
    pricesIncludeTax: { type: Boolean, default: false },
    billTaxRatePercent: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percent", "flat"] },
    discountValue: { type: Number },
    discountAmount: { type: Number, default: 0 },
    discountReason: { type: String },
    discountBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    discountApproved: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi"],
    },
    paymentAmount: { type: Number },
    splitPayment: {
      type: [
        {
          method: {
            type: String,
            enum: ["cash", "card", "upi"],
            required: true,
          },
          amount: { type: Number, required: true },
        },
      ],
    },
    cashierId: { type: Schema.Types.ObjectId, ref: "Staff" },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true, index: true },
    customerEmail: { type: String, trim: true },
    customerTier: { type: String },
    isCustomerMarried: { type: Boolean },
    customerDob: { type: Date },
    customerAnniversary: { type: Date },
    voucherCode: { type: String, uppercase: true, trim: true },
    voucherDiscount: { type: Number, default: 0 },
    paidAt: { type: Date },
    clearedAt: { type: Date },
    voidReason: { type: String },
    voidedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    voidedByName: { type: String },
    voidedByRole: { type: String },
    cancelReason: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    cancelledByName: { type: String },
    cancelledByRole: { type: String },
    cancelledAt: { type: Date },
    transferredFrom: { type: String },
    reopenReason: { type: String },
    reopenedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    reopenedAt: { type: Date },
    refundAmount: { type: Number },
    editedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    editedAt: { type: Date },
    kotDate: { type: String }, // "YYYY-MM-DD" — used for compound unique index
    kotPrinted: { type: Boolean, default: false },
    kotPrintedAt: { type: Date },
    kotPrintAttempts: { type: Number, default: 0 },
    kotReprintSeq: { type: Number, default: 0 },
    kotReprintAt: { type: Date },
    billPrintRequested: { type: Boolean, default: false },
    billPrinted: { type: Boolean, default: false },
    billPrintedAt: { type: Date },
    billPrintAttempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

OrderSchema.index({ status: 1 });
OrderSchema.index({ tableId: 1, status: 1 });
OrderSchema.index({ captainId: 1 });
OrderSchema.index({ createdAt: -1 });
// Compound unique: KOT numbers reset daily — KOT-001 on Mon ≠ KOT-001 on Tue
OrderSchema.index({ kotDate: 1, kotNumber: 1 }, { unique: true, sparse: true });
// Print queue: agent polls for unprinted KOTs newest-first
OrderSchema.index({ kotPrinted: 1, createdAt: -1 });
// Force schema reload in development / hot reload
if (mongoose.models.Order) {
  delete (mongoose.models as Record<string, unknown>).Order;
}

const Order: Model<IOrderDoc> =
  mongoose.models.Order || mongoose.model<IOrderDoc>("Order", OrderSchema);

export default Order;
