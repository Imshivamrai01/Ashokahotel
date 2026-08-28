import mongoose, { Schema, Document, Model } from "mongoose";

export type CrmTemplateKey =
  | "greeting"
  | "birthday"
  | "anniversary"
  | "vip"
  | "voucher";

export interface ICrmTemplateDoc extends Document {
  key: CrmTemplateKey;
  title: string;
  description: string;
  templateText: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CRM_TEMPLATES: Record<
  CrmTemplateKey,
  { title: string; description: string; templateText: string }
> = {
  greeting: {
    title: "General Dine-In & Menu Invite",
    description: "Send a friendly greeting and restaurant invitation to customers",
    templateText: `Namaste *{name}* ji! 🍽️✨

Greetings from *{hotel_name}*! 🏨
We invite you to taste our sizzling new specials and chef's delicacies.

📍 *{hotel_name}*
Reservations & Dine-in: Call us or walk in!
We look forward to welcoming you! 🎉`,
  },
  birthday: {
    title: "Birthday Celebration & Discount Gift",
    description: "Sent on or before customer birthday with festive wishes and promo code",
    templateText: `Dear *{name}* ji, 🎂💐

*Happy Birthday* from the entire family at *{hotel_name}*! 🎊✨

Celebrate your special day with delicious food! Come dine with us and enjoy an exclusive celebratory gift:
{voucher_block}
We wish you a wonderful and blessed year ahead! 🎉🥂`,
  },
  anniversary: {
    title: "Marriage Anniversary Celebration",
    description: "Sent to married couples with anniversary greetings and romantic dine-in offer",
    templateText: `Dear *{name}* ji, 💍💐

*Happy Marriage Anniversary* from *{hotel_name}*! 🥂✨

Celebrate your love and togetherness with a special candle-light dine-in experience at *{hotel_name}*.
{voucher_block}
Book your table today or walk in! We look forward to making your evening memorable! 🎉`,
  },
  vip: {
    title: "VIP Loyalty Appreciation",
    description: "Sent to regular and VIP Gold/Platinum guests to reward their loyalty",
    templateText: `Namaste *{name}* ji! 👑✨

Thank you for being one of our most valued *VIP Guests* at *{hotel_name}*! 🏨

Your loyalty means the world to us. On your next visit, enjoy our finest hospitality and royal menu.
{voucher_block}
Looking forward to welcoming you soon! 🍽️`,
  },
  voucher: {
    title: "Exclusive Voucher / Promo Code Dispatch",
    description: "Direct voucher code broadcast with discount details and validity",
    templateText: `🍽️ *Special Gift from {hotel_name}!* 🏨✨

Namaste *{name}* ji! We have created an exclusive gift voucher specially for you:

🎟️ *Coupon Code:* *{code}*
💰 *Offer:* *{discount}*
📌 *Min Bill:* *₹{min_bill}*
📅 *Valid Till:* *{valid_till}*

👉 Show this message to our cashier on your next visit to redeem!
We look forward to serving you! 🎉`,
  },
};

const CrmTemplateSchema = new Schema<ICrmTemplateDoc>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["greeting", "birthday", "anniversary", "vip", "voucher"],
    },
    title: { type: String, required: true },
    description: { type: String },
    templateText: { type: String, required: true },
  },
  { timestamps: true },
);

const CrmTemplate: Model<ICrmTemplateDoc> =
  mongoose.models.CrmTemplate ||
  mongoose.model<ICrmTemplateDoc>("CrmTemplate", CrmTemplateSchema);

export default CrmTemplate;
