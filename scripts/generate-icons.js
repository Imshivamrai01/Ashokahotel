const sharp = require("sharp");
const fs = require("fs");

fs.mkdirSync("public/icons", { recursive: true });

const SOURCE = "public/tajlogo.png";

async function run() {
  await sharp(SOURCE)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 15, g: 15, b: 15, alpha: 1 },
    })
    .png()
    .toFile("public/icons/icon-512.png");
  await sharp(SOURCE)
    .resize(192, 192, {
      fit: "contain",
      background: { r: 15, g: 15, b: 15, alpha: 1 },
    })
    .png()
    .toFile("public/icons/icon-192.png");
  await sharp(SOURCE)
    .resize(180, 180, {
      fit: "contain",
      background: { r: 15, g: 15, b: 15, alpha: 1 },
    })
    .png()
    .toFile("public/icons/apple-touch-icon.png");
  await sharp(SOURCE)
    .resize(32, 32, {
      fit: "contain",
      background: { r: 15, g: 15, b: 15, alpha: 1 },
    })
    .png()
    .toFile("public/icons/favicon-32.png");
  console.log("✅ PWA icons generated from tajlogo.png in public/icons/");
}

run().catch(console.error);
