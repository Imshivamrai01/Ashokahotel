# Deployment Guide — Ashoka Hotel

## 1. Environment Variables

Copy `.env.local.example` → `.env.local` and fill in:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/regalia?retryWrites=true&w=majority
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-vercel-domain.vercel.app

# Cloudinary (for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 2. MongoDB Atlas Setup

1. Create a **free M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Add database user with `readWrite` on `regalia` database
3. Whitelist IP: `0.0.0.0/0` (Vercel uses dynamic IPs)
4. Copy the connection string into `MONGODB_URI`

### Recommended Atlas Indexes (auto-created by `ensureIndexes()` on first connect):

| Collection | Index                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- |
| orders     | `{ status: 1 }`, `{ tableId: 1, status: 1 }`, `{ createdAt: -1 }`, `{ kotNumber: 1 }` |
| leads      | `{ leadManagerId: 1 }`, `{ status: 1 }`, `{ nextFollowUpAt: 1 }`                      |
| items      | `{ categoryId: 1, sortOrder: 1 }`, `{ isAvailable: 1 }`                               |
| staff      | `{ email: 1 }` (unique), `{ role: 1, isActive: 1 }`                                   |

## 3. Seed the Database

```bash
# One-time setup — creates admin, staff accounts, categories, items, locations
npx tsx scripts/seed.ts
```

**Default credentials after seeding:**

| Role         | Email               | Password   |
| ------------ | ------------------- | ---------- |
| Admin        | admin@ashoka.com    | admin123   |
| Captain      | captain@ashoka.com  | captain123 |
| Kitchen      | kitchen@ashoka.com  | kitchen123 |
| Cashier      | cashier@ashoka.com  | cashier123 |
| Lead Manager | leads@ashoka.com    | leads123   |

> ⚠️ Change all passwords immediately after first login in production.

## 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repo in the [Vercel dashboard](https://vercel.com/new).

**Vercel Settings:**

- Framework: Next.js
- Build Command: `next build` (set in `vercel.json`)
- Region: `bom1` (Mumbai — set in `vercel.json`)
- Add all env vars in **Project → Settings → Environment Variables**

## 5. Generate QR Codes

Run the QR generator script:

```bash
npx tsx scripts/generate-qr.ts
```

This creates `/public/qr/` with a QR code PNG for each active location.

**QR URL format:**

- Table: `https://your-domain.vercel.app/menu?loc=T1&mode=dine_in`
- Room: `https://your-domain.vercel.app/menu?loc=R101&mode=room`

## 6. End-to-End Test Checklist

- [ ] Guest scans QR → Menu loads with correct location
- [ ] Captain logs in → selects table → builds order → submits
- [ ] Kitchen KDS shows new KOT with buzzer
- [ ] Kitchen marks items ready → captain sees status update
- [ ] Cashier sees ready order → processes payment → prints KOT
- [ ] Table status clears in captain app
- [ ] Admin dashboard shows order in metrics
- [ ] Lead Manager logs in → creates lead → adds follow-up
- [ ] Admin sees all leads in `/admin/leads`

## 7. Production Hardening

- [ ] Set `NEXTAUTH_SECRET` to a strong random value
- [ ] Enable MongoDB Atlas **IP Allowlist** (add Vercel IPs or use `0.0.0.0/0`)
- [ ] Enable Vercel **DDoS protection** in project settings
- [ ] Set up Vercel **Cron** for stale order cleanup (optional)
- [ ] Configure Cloudinary **upload presets** for admin image uploads
- [ ] Test on real devices: iPhone Safari, Android Chrome, iPad Safari
