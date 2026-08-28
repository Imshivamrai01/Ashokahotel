import mongoose, { Schema, Document, Model } from "mongoose";

/** A batch of a sub-recipe (prep) being made: consumes ingredients, yields prep stock. */
export interface IProductionEntryDoc extends Document {
  subRecipeId: mongoose.Types.ObjectId;
  subRecipeName: string;
  outputItemId: mongoose.Types.ObjectId;
  batchQty: number; // in the sub-recipe's output unit
  outputUnit: string;
  batchCost: number; // total ingredient cost of the batch
  producedBy?: mongoose.Types.ObjectId;
  producedAt: Date;
  createdAt: Date;
}

const ProductionEntrySchema = new Schema<IProductionEntryDoc>(
  {
    subRecipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    subRecipeName: { type: String, required: true },
    outputItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    batchQty: { type: Number, required: true },
    outputUnit: { type: String, required: true },
    batchCost: { type: Number, default: 0 },
    producedBy: { type: Schema.Types.ObjectId },
    producedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ProductionEntrySchema.index({ producedAt: -1 });

const ProductionEntry: Model<IProductionEntryDoc> =
  mongoose.models.ProductionEntry ||
  mongoose.model<IProductionEntryDoc>("ProductionEntry", ProductionEntrySchema);

export default ProductionEntry;
