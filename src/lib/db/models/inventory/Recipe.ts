import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A recipe (BOM). Two kinds:
 *  - "menu": makes one sellable portion of a menu Item (menuItemId set).
 *  - "sub":  a batch-made semi-finished prep (e.g. Gravy Base). Its output is
 *            stored as an InventoryItem (outputItemId) so it flows through the
 *            same ledger; menu recipes can consume it as a component.
 * Components reference either a raw InventoryItem or another sub-recipe.
 */
export interface IRecipeComponent {
  kind: "item" | "sub";
  inventoryItemId?: mongoose.Types.ObjectId; // kind=item
  subRecipeId?: mongoose.Types.ObjectId; // kind=sub
  name: string;
  qty: number; // per single yield unit, in `unit`
  unit: string;
}

export interface IRecipeDoc extends Document {
  kind: "menu" | "sub";
  menuItemId?: mongoose.Types.ObjectId; // kind=menu → Item
  subRecipeName?: string; // kind=sub
  outputItemId?: mongoose.Types.ObjectId; // kind=sub → its stocked InventoryItem
  outputUnit?: string; // kind=sub batch output unit
  yieldQty: number; // portions (menu) or batch output qty (sub)
  components: IRecipeComponent[];
  costCache?: number; // cost per yield unit
  isActive: boolean;
  branchId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComponentSchema = new Schema<IRecipeComponent>(
  {
    kind: { type: String, enum: ["item", "sub"], required: true },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    subRecipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
  },
  { _id: false },
);

const RecipeSchema = new Schema<IRecipeDoc>(
  {
    kind: { type: String, enum: ["menu", "sub"], required: true },
    menuItemId: { type: Schema.Types.ObjectId, ref: "Item" },
    subRecipeName: { type: String },
    outputItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    outputUnit: { type: String },
    yieldQty: { type: Number, required: true, default: 1, min: 0.0001 },
    components: { type: [ComponentSchema], default: [] },
    costCache: { type: Number },
    isActive: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Location" },
  },
  { timestamps: true },
);

// One active menu recipe per menu item.
RecipeSchema.index(
  { menuItemId: 1 },
  { unique: true, partialFilterExpression: { kind: "menu" } },
);
RecipeSchema.index({ kind: 1 });

const Recipe: Model<IRecipeDoc> =
  mongoose.models.Recipe || mongoose.model<IRecipeDoc>("Recipe", RecipeSchema);

export default Recipe;
