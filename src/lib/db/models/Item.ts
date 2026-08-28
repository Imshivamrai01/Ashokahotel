import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItemDoc extends Document {
  categoryId: mongoose.Types.ObjectId;
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
  trackInventory: boolean; // when true, sales deduct raw materials via recipe
  // Item-level tax — NOT used in billing (bill GST applied at order level from
  // branding). Stored per item for FUTURE use only.
  taxRatePercent: number; // tax % for this item (future use)
  taxIncluded: boolean; // does this item's price already include tax (future use)
  hsn?: string; // HSN/SAC code for GST invoice
  // Variations (sizes): pick ONE; price replaces base. recipeScale scales the
  // base recipe's ingredient usage (Half=0.6, Full=1) for stock.
  variations?: { name: string; price: number; recipeScale: number }[];
  // Add-ons (modifiers): pick MANY; each adds price and optionally consumes one
  // extra ingredient (qty in that item's stock unit) for stock.
  addons?: {
    name: string;
    price: number;
    inventoryItemId?: mongoose.Types.ObjectId;
    qtyBase?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItemDoc>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    imageUrl: { type: String },
    videoUrl: { type: String },
    isVegetarian: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    preparationTtlMinutes: { type: Number, default: 15 },
    trackInventory: { type: Boolean, default: false },
    taxRatePercent: { type: Number, default: 0 },
    taxIncluded: { type: Boolean, default: false },
    hsn: { type: String },
    variations: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          recipeScale: { type: Number, default: 1 },
          _id: false,
        },
      ],
      default: undefined,
    },
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
  },
  { timestamps: true },
);

ItemSchema.index({ categoryId: 1, sortOrder: 1 });
ItemSchema.index({ isAvailable: 1 });
// { slug: 1 } index is already created by unique:true on the field

const Item: Model<IItemDoc> =
  mongoose.models.Item || mongoose.model<IItemDoc>("Item", ItemSchema);

export default Item;
