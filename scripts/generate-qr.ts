/**
 * QR Code Generator — run with:
 *   npx tsx scripts/generate-qr.ts
 *
 * Reads active locations from MongoDB and generates a QR code PNG
 * for each one in public/qr/<location-code>.png
 *
 * Requires MONGODB_URI and NEXT_PUBLIC_BASE_URL in .env.local
 *   NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
 */
import "dotenv/config";
import { config } from "dotenv";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import QRCode from "qrcode";

config({ path: ".env.local", override: true });

const MONGODB_URI = process.env.MONGODB_URI!;
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env.local");
  process.exit(1);
}

interface LocationDoc {
  _id: mongoose.Types.ObjectId;
  code: string;
  label: string;
  type: "table" | "room" | "poolside" | "other";
  isActive: boolean;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB");

  const { default: Location } = await import("../src/lib/db/models/Location");

  const locations = await Location.find({ isActive: true })
    .sort({ type: 1, label: 1 })
    .lean<LocationDoc[]>();

  if (locations.length === 0) {
    console.log("ℹ️   No active locations found — run seed.ts first.");
    await mongoose.disconnect();
    return;
  }

  const outDir = path.join(process.cwd(), "public", "qr");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const loc of locations) {
    const mode = loc.type === "room" ? "room" : "dine_in";
    const url = `${BASE_URL}/menu?loc=${encodeURIComponent(loc.code)}&mode=${mode}`;
    const filePath = path.join(outDir, `${loc.code}.png`);

    await QRCode.toFile(filePath, url, {
      type: "png",
      width: 512,
      margin: 2,
      color: { dark: "#1A1A1A", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    console.log(`✅  ${loc.label.padEnd(20)} → ${url}`);
    console.log(`    Saved: public/qr/${loc.code}.png`);
  }

  await mongoose.disconnect();
  console.log(`\n🎉  Generated ${locations.length} QR codes in public/qr/`);
  console.log(`\n📋  Print sheet tip:`);
  console.log(
    `    Open public/qr/ and print each PNG at 5×5 cm on label paper.`,
  );
}

main().catch((err) => {
  console.error("❌  QR generation failed:", err);
  process.exit(1);
});
