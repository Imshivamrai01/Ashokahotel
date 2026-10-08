import mongoose, { Schema, Model } from "mongoose";

// One document (_id "default") describing what the local print agent can see:
// the thermal printers it found, and which of them prints customer invoices.
// KOTs go to every working printer; the invoice goes to `billPrinterId` only.

export interface IStationPrinter {
  id: string; // agent-side id, e.g. "usb:\\?\USB#VID_…" or "tcp:192.168.1.50"
  name: string;
  transport: "usb" | "tcp" | "bt";
  address: string; // USB port, IP, or COM port — shown to staff
  usable: boolean; // answered as a working receipt printer at last scan
}

export interface IPrintStationDoc {
  _id: string;
  printers: IStationPrinter[];
  billPrinterId?: string;
  lastSeenAt?: Date; // last heartbeat from the agent
}

const PrintStationSchema = new Schema<IPrintStationDoc>(
  {
    _id: { type: String, required: true },
    printers: [
      {
        _id: false,
        id: { type: String, required: true },
        name: { type: String, required: true },
        transport: { type: String, enum: ["usb", "tcp", "bt"], required: true },
        address: { type: String, default: "" },
        usable: { type: Boolean, default: false },
      },
    ],
    billPrinterId: { type: String, default: "" },
    lastSeenAt: { type: Date },
  },
  { versionKey: false },
);

const PrintStation: Model<IPrintStationDoc> =
  mongoose.models.PrintStation ??
  mongoose.model<IPrintStationDoc>("PrintStation", PrintStationSchema);

export default PrintStation;

export const PRINT_STATION_ID = "default";
