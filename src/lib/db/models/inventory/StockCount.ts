import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockCountLine {
  inventoryItemId: mongoose.Types.ObjectId;
  name: string;
  unit: string; // stock unit
  systemQty: number; // theoretical at open (stock unit)
  countedQty: number; // physical
  varianceQty: number; // counted - system
  varianceValue: number; // varianceQty * avgCost
}

export interface IStockCountDoc extends Document {
  countNumber: string;
  status: "open" | "posted" | "cancelled";
  lines: IStockCountLine[];
  totalVarianceValue: number;
  notes?: string;
  countedBy?: mongoose.Types.ObjectId;
  postedBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockCountLineSchema = new Schema<IStockCountLine>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    systemQty: { type: Number, required: true },
    countedQty: { type: Number, required: true },
    varianceQty: { type: Number, required: true },
    varianceValue: { type: Number, default: 0 },
  },
  { _id: false },
);

const StockCountSchema = new Schema<IStockCountDoc>(
  {
    countNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["open", "posted", "cancelled"],
      default: "open",
    },
    lines: { type: [StockCountLineSchema], default: [] },
    totalVarianceValue: { type: Number, default: 0 },
    notes: { type: String },
    countedBy: { type: Schema.Types.ObjectId },
    postedBy: { type: Schema.Types.ObjectId },
    postedAt: { type: Date },
  },
  { timestamps: true },
);

StockCountSchema.index({ status: 1, createdAt: -1 });

const StockCount: Model<IStockCountDoc> =
  mongoose.models.StockCount ||
  mongoose.model<IStockCountDoc>("StockCount", StockCountSchema);

export default StockCount;
