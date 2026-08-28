# 🍽️ Ashoka Hotel — Digital Menu & Operations — Full Project Plan

> **Version:** 2.0
> **Date:** May 19, 2026
> **Stack:** Next.js 15 (App Router), MongoDB + Mongoose, TailwindCSS, Shadcn/UI + DaisyUI, Framer Motion, React Icons, Cloudinary
> **Modes:** 🛏️ Room Service (WhatsApp order) + 🍽️ Dine-In (Captain-driven ordering)
> **Views:** 📱 Mobile (scroll cards) + 🖥️ Tablet (magazine flipbook)
> **Roles:** Admin · Captain · Kitchen · Cashier · Lead Manager

---

## Table of Contents

1. Project Overview
2. User Roles & Access Matrix
3. Core Operational Flows
4. Key Differences from Samples
5. Tech Stack & Libraries
6. Project Structure
7. Database Schema
8. Feature Breakdown
9. KDS & Smart Polling Architecture
10. KOT Design
11. Tablet Flipbook Architecture
12. Lead Manager Module
13. UI/UX Design System
14. Pages & Routes
15. API Routes
16. Component Architecture
17. Implementation Phases
18. Environment Variables
19. Definition of Done

---

## 1. Project Overview

A **fully dynamic QR-based digital menu + restaurant operations platform** for **Regalia Hotel**. Handles two completely different ordering flows based on context (room vs table), a full back-of-house operational system (KDS, KOT, Cashier), and a separate CRM module for lead management.

### What the system does

| Module             | Who Uses It        | What It Does                                         |
| ------------------ | ------------------ | ---------------------------------------------------- |
| Guest Menu (Room)  | Hotel room guests  | Browse menu → Cart → WhatsApp order                  |
| Guest Menu (Table) | Dine-in guests     | Browse menu only — view/explore, no self-ordering    |
| Captain App        | Floor staff        | Take table orders → send KOT to kitchen              |
| KDS                | Kitchen staff      | See live orders → mark ready/delivered, track TTL    |
| Cashier App        | Cashier            | See settled orders → collect payment → clear table   |
| Admin Panel        | Manager/Admin      | Full CRUD + metrics + QR + manage all staff accounts |
| Lead Manager       | Sales/Front Office | Manage leads, follow-ups, reminders                  |

---

## 2. User Roles & Access Matrix

| Role             | Login URL        | Created By | Key Capabilities                                       |
| ---------------- | ---------------- | ---------- | ------------------------------------------------------ |
| **Admin**        | `/login`         | Self-seed  | Full access: all CRUD, all staff accounts, all reports |
| **Captain**      | `/captain/login` | Admin      | Take table orders, view own order history              |
| **Kitchen**      | `/kitchen/login` | Admin      | KDS view, mark item/order ready & delivered            |
| **Cashier**      | `/cashier/login` | Admin      | View delivered orders, record payment, clear table     |
| **Lead Manager** | `/leads/login`   | Admin      | Add/edit leads, follow-ups, reminders — no menu access |
| **Guest**        | No login (QR)    | —          | View menu only (table) / WhatsApp order (room)         |

> All staff logins use NextAuth v5 credentials. Each role has its own login page and dashboard. Admin creates/deletes all staff accounts from the admin panel.

---

## 3. Core Operational Flows

### 🛏️ Room Service Flow

```
Guest scans Room QR → Menu loads on mobile (cart enabled)
         ↓
Browse Categories → Add to Cart → Special Instructions
         ↓
"Send to WhatsApp" → pre-filled message: Room 101 + items + total
         ↓
WhatsApp message received by hotel staff
```

> Room service orders go directly via WhatsApp. No KDS involvement.

---

### 🍽️ Dine-In Flow (Captain-driven)

```
Guest scans Table QR → Menu loads (VIEW ONLY — no cart, no order button)
Guest browses the magazine flipbook / mobile scroll menu
         ↓
Guest tells Captain what they want
         ↓
Captain logs in → selects table → adds items + per-item notes
Captain places order → KOT generated → sent to Kitchen KDS
         ↓
Kitchen sees KOT on KDS (with buzzer alert for new KOT)
Chef marks each item "Ready" (item-wise)  OR  marks full order "Ready"
Chef marks item "Delivered" when served   OR  marks full order "Delivered"
TTL tracked: orderedAt → preparingAt → readyAt → deliveredAt per item
         ↓
Once all items delivered → order status: "Delivered"
         ↓
Cashier sees order → selects payment method → records payment → clears table
Table status → "Free" → available for new Captain order
```

---

### 🧑‍💼 Lead Manager Flow

```
Lead Manager logs in → sees leads dashboard (overdue follow-ups highlighted)
         ↓
Add lead → (name, contact, source, interest, budget, status, priority, notes)
         ↓
Schedule follow-up → reminder shown on next login
         ↓
Log follow-up outcome → update lead status → schedule next follow-up
Admin can view all leads, reassign, export CSV, see pipeline analytics
```

---

## 4. Key Differences from Samples

| Feature              | Mobile Sample | Tab Sample     | New Project                             |
| -------------------- | ------------- | -------------- | --------------------------------------- |
| Database             | TursoDB       | Static         | MongoDB + Mongoose                      |
| File uploads         | UploadThing   | None           | Cloudinary                              |
| Table guest ordering | WhatsApp cart | None           | View-only (Captain takes order instead) |
| Room guest ordering  | WhatsApp cart | None           | Same WhatsApp cart                      |
| Captain ordering     | None          | None           | Full Captain app with table selector    |
| KDS                  | None          | None           | Full KDS with smart polling + buzzer    |
| KOT                  | None          | None           | Per-order KOT with item TTL tracking    |
| Cashier              | None          | None           | Payment methods + table clearance       |
| Lead management      | None          | None           | Full CRM module with follow-ups         |
| Tablet flipbook      | Basic grid    | Static turn.js | Dynamic react-pageflip from MongoDB     |
| Icon library         | lucide-react  | react-icons    | react-icons                             |
| Auth                 | NextAuth v5   | None           | NextAuth v5 multi-role                  |

---

## 5. Tech Stack & Libraries

### Core

| Package      | Version | Purpose                     |
| ------------ | ------- | --------------------------- |
| `next`       | ^15.x   | App Router, SSR, API Routes |
| `react`      | ^19.x   | UI Framework                |
| `typescript` | ^5.x    | Type Safety                 |

### Database

| Package    | Purpose               |
| ---------- | --------------------- |
| `mongoose` | MongoDB ODM           |
| `mongodb`  | Native MongoDB driver |

### UI & Styling

| Package         | Purpose                        |
| --------------- | ------------------------------ |
| `tailwindcss`   | Utility-first CSS              |
| `shadcn/ui`     | Accessible headless components |
| `daisyui`       | TailwindCSS component plugin   |
| `framer-motion` | Animations & transitions       |
| `react-icons`   | Comprehensive icon library     |
| `next-themes`   | Dark/Light mode                |

### Flipbook

| Package          | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `react-pageflip` | React-native magazine flipbook (no jQuery) |

### Real-time (Smart Polling)

| Package                 | Purpose                            |
| ----------------------- | ---------------------------------- |
| `@tanstack/react-query` | Smart polling with refetchInterval |
| `use-sound`             | Buzzer / audio alert for new KOTs  |

### Media & Upload

| Package           | Purpose                    |
| ----------------- | -------------------------- |
| `next-cloudinary` | Cloudinary for Next.js     |
| `cloudinary`      | Server-side Cloudinary SDK |
| `react-dropzone`  | Drag-and-drop upload UI    |

### Forms & Validation

| Package               | Purpose               |
| --------------------- | --------------------- |
| `react-hook-form`     | Form state management |
| `zod`                 | Schema validation     |
| `@hookform/resolvers` | Zod + RHF bridge      |

### Auth

| Package     | Purpose                          |
| ----------- | -------------------------------- |
| `next-auth` | Multi-role credentials auth (v5) |
| `bcryptjs`  | Password hashing                 |

### Utilities

| Package                   | Purpose                                |
| ------------------------- | -------------------------------------- |
| `zustand`                 | Client cart + captain order state      |
| `sonner`                  | Toast notifications                    |
| `clsx` + `tailwind-merge` | Conditional classnames                 |
| `qrcode`                  | QR code generation                     |
| `jszip`                   | Bulk QR ZIP export                     |
| `lottie-react`            | Lottie JSON animations                 |
| `date-fns`                | Date formatting + TTL calculations     |
| `react-to-print`          | KOT / bill thermal print               |
| `@dnd-kit/core`           | Drag-and-drop for Lead pipeline Kanban |

---

## 6. Project Structure

```
regalia-digital-menu/
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx                     # Dashboard + metrics
│   │   │       ├── categories/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── items/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── locations/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── branding/
│   │   │       │   └── page.tsx
│   │   │       ├── qr-code/
│   │   │       │   └── page.tsx
│   │   │       ├── staff/
│   │   │       │   └── page.tsx                 # Create/delete all role accounts
│   │   │       ├── orders/
│   │   │       │   └── page.tsx                 # Full order history + metrics
│   │   │       └── leads/
│   │   │           └── page.tsx                 # All leads across all managers
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/page.tsx                   # Admin login
│   │   │
│   │   ├── (menu)/
│   │   │   └── menu/page.tsx                    # Public guest menu (SSR)
│   │   │
│   │   ├── (captain)/
│   │   │   ├── layout.tsx
│   │   │   └── captain/
│   │   │       ├── login/page.tsx
│   │   │       └── page.tsx                     # Captain order-taking app
│   │   │
│   │   ├── (kitchen)/
│   │   │   ├── layout.tsx
│   │   │   └── kitchen/
│   │   │       ├── login/page.tsx
│   │   │       └── page.tsx                     # KDS screen
│   │   │
│   │   ├── (cashier)/
│   │   │   ├── layout.tsx
│   │   │   └── cashier/
│   │   │       ├── login/page.tsx
│   │   │       └── page.tsx                     # Cashier payment screen
│   │   │
│   │   ├── (leads)/
│   │   │   ├── layout.tsx
│   │   │   └── leads/
│   │   │       ├── login/page.tsx
│   │   │       └── page.tsx                     # Lead manager CRM
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── categories/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── items/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── locations/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   └── validate/route.ts
│   │       ├── branding/route.ts
│   │       ├── upload/route.ts                  # Cloudinary upload handler
│   │       ├── staff/
│   │       │   ├── route.ts                     # GET list / POST create
│   │       │   └── [id]/route.ts                # PUT / DELETE
│   │       ├── orders/
│   │       │   ├── route.ts                     # GET (filtered) / POST create
│   │       │   ├── active/route.ts              # KDS polling endpoint
│   │       │   ├── cashier/route.ts             # Cashier queue endpoint
│   │       │   ├── metrics/route.ts             # TTL & efficiency metrics
│   │       │   ├── [id]/route.ts                # GET / PATCH order status
│   │       │   └── [id]/items/[itemId]/route.ts # PATCH item status
│   │       └── leads/
│   │           ├── route.ts                     # GET / POST
│   │           ├── [id]/route.ts                # GET / PUT / DELETE
│   │           └── [id]/followups/route.ts      # GET / POST
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   ├── ItemForm.tsx                     # Includes TTL field
│   │   │   ├── LocationForm.tsx
│   │   │   ├── LocationsTable.tsx
│   │   │   ├── BrandingForm.tsx
│   │   │   ├── MediaUploader.tsx
│   │   │   ├── QRGenerator.tsx
│   │   │   ├── StaffManager.tsx                 # CRUD for all staff roles
│   │   │   ├── OrdersTable.tsx                  # Full history with filters
│   │   │   └── MetricsDashboard.tsx             # TTL charts + revenue stats
│   │   │
│   │   ├── menu/
│   │   │   ├── MenuShell.tsx                    # Device router
│   │   │   ├── mobile/
│   │   │   │   ├── MobileMenuShell.tsx
│   │   │   │   ├── MenuHeader.tsx
│   │   │   │   ├── LocationBanner.tsx
│   │   │   │   ├── CategoryTabs.tsx
│   │   │   │   ├── CategorySection.tsx
│   │   │   │   ├── ItemCard.tsx                 # Conditional: cart vs view-only
│   │   │   │   ├── ItemModal.tsx
│   │   │   │   ├── CartDrawer.tsx               # Room only
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── SearchOverlay.tsx
│   │   │   │   └── FloatingButtons.tsx          # Room: WA+Call  Table: Call only
│   │   │   └── tablet/
│   │   │       ├── TabletMenuShell.tsx
│   │   │       ├── FlipBook.tsx
│   │   │       ├── CoverPage.tsx
│   │   │       ├── CategoryIndexPage.tsx
│   │   │       ├── MenuPage.tsx
│   │   │       ├── BackCoverPage.tsx
│   │   │       ├── FlipControls.tsx
│   │   │       ├── TabletCartPanel.tsx          # Room only — slide-in from right
│   │   │       ├── TabletLocationBanner.tsx
│   │   │       └── TabletFloatingButtons.tsx    # Room: WA+Call  Table: Call only
│   │   │
│   │   ├── captain/
│   │   │   ├── TableSelector.tsx                # Grid: green=free, red=occupied
│   │   │   ├── OrderBuilder.tsx                 # Category tabs + items + qty
│   │   │   ├── OrderSummary.tsx                 # Review before placing
│   │   │   └── OrderHistory.tsx                 # Today's orders by this captain
│   │   │
│   │   ├── kitchen/
│   │   │   ├── KDSBoard.tsx                     # Main KDS grid
│   │   │   ├── KOTCard.tsx                      # One KOT card
│   │   │   ├── KOTItem.tsx                      # One item row inside KOT
│   │   │   ├── BuzzerHandler.tsx                # Audio + visual flash on new KOT
│   │   │   └── KDSFilters.tsx                   # Filter by status
│   │   │
│   │   ├── cashier/
│   │   │   ├── OrdersQueue.tsx                  # Delivered orders list
│   │   │   ├── PaymentModal.tsx                 # Method + amount + clear
│   │   │   └── TableStatusGrid.tsx              # Visual occupancy overview
│   │   │
│   │   └── leads/
│   │       ├── LeadsTable.tsx
│   │       ├── LeadForm.tsx
│   │       ├── FollowUpForm.tsx
│   │       ├── ReminderBadge.tsx
│   │       └── LeadPipeline.tsx                 # Kanban stage view
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── mongoose.ts                      # Connection singleton
│   │   │   └── models/
│   │   │       ├── Branding.ts
│   │   │       ├── Category.ts
│   │   │       ├── Item.ts
│   │   │       ├── Location.ts
│   │   │       ├── Order.ts
│   │   │       ├── Staff.ts
│   │   │       ├── Lead.ts
│   │   │       └── FollowUp.ts
│   │   ├── queries.ts
│   │   ├── auth.ts                              # Multi-role NextAuth config
│   │   ├── cloudinary.ts
│   │   ├── validations.ts
│   │   └── utils.ts
│   │
│   ├── store/
│   │   ├── cart.ts                              # Guest room cart + location context
│   │   └── captain.ts                           # Captain in-progress order state
│   │
│   ├── hooks/
│   │   ├── useDeviceView.ts                     # Mobile vs tablet detection
│   │   ├── useCart.ts
│   │   ├── useKDSPolling.ts                     # Smart adaptive polling
│   │   └── useBuzzer.ts                         # Audio alert on new KOT
│   │
│   └── types/
│       └── index.ts
│
├── public/
│   ├── lottie/
│   │   ├── loading.json
│   │   ├── empty-cart.json
│   │   ├── no-results.json
│   │   └── success.json
│   └── sounds/
│       └── buzzer.mp3                           # KDS new-KOT alert sound
│
├── middleware.ts                                # Role-based route protection
├── next.config.ts
├── tailwind.config.ts
├── components.json
└── .env.local
```

---

## 7. Database Schema

### `branding` (singleton — always 1 document)

```typescript
{
  _id: ObjectId;
  restaurantName: String;
  logoUrl: String; // Cloudinary URL
  whatsappNumber: String; // "+91XXXXXXXXXX"
  callNumber: String;
  tagline: String;
  primaryColor: String; // "#f97316"
  coverVideoUrl: String; // Flipbook cover background video
  coverImageUrl: String; // Flipbook cover fallback image
  updatedAt: Date;
}
```

### `categories`

```typescript
{
  _id: ObjectId;
  name: String;
  slug: String(unique);
  iconEmoji: String;
  imageUrl: String;
  sortOrder: Number;
  isActive: Boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### `items`

```typescript
{
  _id: ObjectId;
  categoryId: ObjectId; // ref: Category
  name: String;
  slug: String(unique);
  description: String;
  price: Number;
  discountPrice: Number | null;
  imageUrl: String; // Cloudinary (max 500KB enforced)
  videoUrl: String | null; // Cloudinary (max 5MB enforced)
  isVegetarian: Boolean;
  isFeatured: Boolean;
  isAvailable: Boolean;
  sortOrder: Number;
  preparationTtlMinutes: Number; // Target prep time — admin sets per item (e.g. 12)
  createdAt: Date;
  updatedAt: Date;
}
```

### `locations`

```typescript
{
  _id: ObjectId;
  type: "room" | "table";
  label: String; // "Room 101", "Table T5"
  code: String(unique); // "101", "T5"
  floor: String | null;
  capacity: Number | null;
  isActive: Boolean;
  isOccupied: Boolean; // true when active order exists on this table
  notes: String | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `staff` (unified for all non-admin roles)

```typescript
{
  _id: ObjectId;
  name: String;
  email: String(unique);
  password: String; // bcrypt hashed
  role: "captain" | "kitchen" | "cashier" | "lead_manager";
  isActive: Boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `orders` (core operational document)

```typescript
{
  _id: ObjectId
  kotNumber: String             // "KOT-001" — daily sequence, resets each day

  tableId: ObjectId             // ref: Location (type: "table")
  tableLabel: String            // Denormalized: "Table T5"

  captainId: ObjectId           // ref: Staff (role: captain)
  captainName: String           // Denormalized for KDS display

  status:
    | "pending"                 // Captain placed, kitchen not yet started
    | "preparing"               // Kitchen acknowledged/started
    | "partially_ready"         // Some items ready, others still cooking
    | "ready"                   // All items ready, not yet delivered
    | "partially_delivered"     // Some items delivered to table
    | "delivered"               // All items delivered — awaiting payment
    | "paid"                    // Payment recorded by cashier
    | "cleared"                 // Table cleared, isOccupied set to false

  items: [
    {
      _id: ObjectId             // Sub-document ID
      itemId: ObjectId          // ref: Item
      name: String              // Denormalized
      price: Number             // Price at time of order
      quantity: Number
      notes: String | null      // Per-item note: "no onion", "extra spicy"
      isVegetarian: Boolean     // Denormalized for KDS color-coding

      preparationTtlMinutes: Number   // Copied from item at order creation time

      itemStatus:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"

      orderedAt: Date
      preparingAt: Date | null
      readyAt: Date | null
      deliveredAt: Date | null
    }
  ]

  specialInstructions: String | null   // Overall order notes from captain

  subtotal: Number
  tax: Number | null
  total: Number

  paymentMethod: "cash" | "card" | "upi" | "room_charge" | null
  paymentAmount: Number | null
  cashierId: ObjectId | null    // ref: Staff (role: cashier)
  paidAt: Date | null
  clearedAt: Date | null

  createdAt: Date               // = order placed time
  updatedAt: Date
}
```

### `leads`

```typescript
{
  _id: ObjectId
  leadManagerId: ObjectId       // ref: Staff (role: lead_manager) — who created it

  name: String
  phone: String
  email: String | null
  source: "walk_in" | "call" | "whatsapp" | "website" | "referral" | "social" | "other"
  interest: String              // e.g. "Banquet Hall", "Wedding Package", "Corporate Stay"
  budget: String | null         // e.g. "₹5L – ₹10L"

  status:
    | "new"
    | "contacted"
    | "interested"
    | "proposal_sent"
    | "negotiating"
    | "won"
    | "lost"
    | "cold"

  priority: "low" | "medium" | "high"
  notes: String | null

  nextFollowUpAt: Date | null   // Reminder date for next action
  assignedTo: ObjectId | null   // ref: Staff (if reassigned by admin)

  createdAt: Date
  updatedAt: Date
}
```

### `followups`

```typescript
{
  _id: ObjectId;
  leadId: ObjectId; // ref: Lead
  staffId: ObjectId; // ref: Staff who logged it

  type: "call" | "whatsapp" | "email" | "meeting" | "site_visit";
  notes: String;
  outcome: String | null; // "Interested, wants proposal" / "Not answering"
  nextFollowUpAt: Date | null; // Next scheduled follow-up from this entry

  createdAt: Date;
}
```

---

## 8. Feature Breakdown

### 🔐 Admin Panel

#### Authentication & Staff Management

- [ ] Admin credentials login at `/login`
- [ ] Role-based route protection via Next.js middleware
- [ ] **Staff Manager** (`/admin/staff`):
  - Create Captain / Kitchen / Cashier / Lead Manager accounts
  - Set: name, email, password, role, active status
  - Delete / deactivate accounts
  - View last login per staff member

#### Dashboard

- [ ] Stats: active tables occupied, pending KOTs, items in prep, orders today, revenue today
- [ ] Live table occupancy grid (green = free, red = occupied)
- [ ] Quick links to all modules
- [ ] Revenue today / this week (sum of paid orders)

#### Category, Item, Location, Branding, QR

- [ ] All CRUD same as v1
- [ ] Item form now includes **Preparation TTL (minutes)** field per item
- [ ] Branding form includes **cover video + cover image** upload for flipbook
- [ ] Location form shows `isOccupied` as read-only indicator

#### Orders & Metrics (`/admin/orders`)

- [ ] Full order history with filters: date range, table, captain, status, payment method
- [ ] Per-order breakdown: KOT number, all items, TTL per item, total time, payment details
- [ ] **Efficiency Metrics Dashboard**:
  - Average item prep time vs TTL target (per category)
  - Average order-to-delivery time per table
  - Captain order volume per shift
  - KOT throughput per hour
  - Peak hours heatmap
  - Payment method breakdown (cash vs card vs UPI)
  - Revenue reports (daily / weekly / monthly charts)

---

### 📱 Guest Menu — Room Service (Mobile)

- URL: `?type=room&location=101`
- Scrollable card-based menu with **full cart enabled**
- LocationBanner: "🛏️ Room 101"
- Add to Cart → Cart Drawer → Special Instructions → WhatsApp order
- WhatsApp message: Room number + items + quantities + prices + total + special instructions
- FloatingButtons: WhatsApp (green) + Call (blue)

### 🖥️ Guest Menu — Room Service (Tablet)

- Same room context
- Magazine flipbook view (react-pageflip)
- Floating cart icon → slide-in cart panel from right
- WhatsApp order from cart panel
- FloatingButtons: WhatsApp + Call

### 📱 Guest Menu — Dine-In (Mobile)

- URL: `?type=table&location=T5`
- Same scrollable menu — **NO cart, NO add-to-cart button, NO order UI**
- Items are view-only cards
- LocationBanner: "🍽️ Table T5"
- Message shown where cart would be: _"Your captain will take your order"_
- FloatingButtons: **Call only**

### 🖥️ Guest Menu — Dine-In (Tablet)

- Same table context
- Magazine flipbook — **view-only, no cart panel**
- Pure browsing / inspiration experience
- FloatingButtons: Call only

---

### 👨‍💼 Captain App (`/captain`)

- [ ] Login at `/captain/login` (role: "captain")
- [ ] **Table Selector** — visual grid of all active tables
  - 🟢 Green = free (can take new order)
  - 🔴 Red/Orange = occupied (has active order — shows KOT number)
  - Selecting an occupied table → option to "Add Items to Existing Order"
- [ ] **Order Builder** (after table selected):
  - Category tabs (sticky) + item list
  - Each item: image, name, price, veg/non-veg dot
  - Quantity selector (+ / −)
  - Per-item notes field (e.g., "no onion", "extra spicy")
  - Running order summary in sidebar or bottom panel
- [ ] **Order Summary** (before placing):
  - All items, quantities, per-item notes
  - Overall special instructions field
  - Table number shown prominently
  - Captain name/ID auto-filled
  - "Place Order" → generates KOT → table `isOccupied: true` → KOT appears on KDS
- [ ] **Add to Existing Order** — captain can append more items to an occupied table
- [ ] **Order History** — today's KOTs placed by this captain
- [ ] KOT number: auto-generated daily sequence (`KOT-001`, `KOT-002`..., resets midnight)

---

### 🍳 Kitchen KDS (`/kitchen`)

- [ ] Login at `/kitchen/login` (role: "kitchen")
- [ ] **Live KDS Board** — all active KOT cards, sorted oldest-first (longest waiting at top)
- [ ] **Smart Polling** (see Section 9 for adaptive intervals)
- [ ] **Buzzer alert** on new KOT arrival: audio clip + Framer Motion yellow board flash
- [ ] Filter bar: All / Pending / Preparing / Partially Ready / Ready

#### KOT Card (per order)

```
┌──────────────────────────────────────┐
│  KOT-007              🪑 Table T5    │
│  Captain: Rahul       ⏱ 3 mins ago  │
├──────────────────────────────────────┤
│ 🟢 Paneer Tikka  ×2  (extra spicy)  │
│                             [Delivered]│
│ 🟡 Dal Makhani   ×1                  │
│                             [Ready ✓] │
│ 🔴 Butter Naan   ×3  (no butter top) │
│                             [Preparing]│
├──────────────────────────────────────┤
│ [Mark All Ready]   [Mark All Delivered]│
└──────────────────────────────────────┘
```

- Item row colors: 🔴 Red=pending, 🟡 Amber=preparing, 🟢 Green=ready, ⚫ Grey=delivered
- Elapsed time counter (live, counts up since `createdAt`)
- Counter turns amber → red when elapsed exceeds item's `preparationTtlMinutes`
- Overdue indicator: warning strip on KOT card if any item is past its TTL

#### Item-Level Actions

- [ ] **[Preparing]** → `itemStatus: "preparing"`, sets `preparingAt`
- [ ] **[Ready ✓]** → `itemStatus: "ready"`, sets `readyAt`
- [ ] **[Delivered]** → `itemStatus: "delivered"`, sets `deliveredAt`

#### Order-Level Actions

- [ ] **[Mark All Ready]** → all pending/preparing items → ready
- [ ] **[Mark All Delivered]** → all items → delivered → `order.status: "delivered"`
- [ ] Delivered orders move to greyed-out "Completed" section at bottom

---

### 💰 Cashier App (`/cashier`)

- [ ] Login at `/cashier/login` (role: "cashier")
- [ ] **Orders Queue** — all orders with status `"delivered"` (polled every 5s)
  - Shows: Table label, KOT #, Items summary, Total, Time delivered
  - Sorted oldest-first
- [ ] **Table Status Grid** — visual occupancy of all tables (quick reference)
- [ ] Click any order → **Payment Modal**:
  - Full itemized bill (item name × qty = amount, all rows)
  - Payment method selector: Cash / Card / UPI / Room Charge
  - Amount paid field
  - Change due calculation for cash
  - **"Pay & Clear Table"** button:
    - Sets `order.status: "paid"` + `paidAt` + `cashierId`
    - Sets `order.status: "cleared"` + `clearedAt`
    - Sets `location.isOccupied: false`
  - Table cell turns green in grid immediately
- [ ] **KOT/Bill Print** via `react-to-print` (thermal printer optimized layout)
- [ ] Cleared orders disappear from queue automatically

---

## 9. KDS & Smart Polling Architecture

### Adaptive Polling Strategy

```typescript
// hooks/useKDSPolling.ts
const useKDSPolling = () => {
  const [hasActiveOrders, setHasActiveOrders] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ["kds-orders"],
    queryFn: fetchActiveOrders,
    // Adaptive interval: fast when busy, slow when quiet
    refetchInterval: hasActiveOrders ? 3000 : 15000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const active =
      orders?.some((o) =>
        ["pending", "preparing", "partially_ready"].includes(o.status),
      ) ?? false;
    setHasActiveOrders(active);
  }, [orders]);

  return orders;
};
```

| Situation                | Poll Interval | Reason                              |
| ------------------------ | ------------- | ----------------------------------- |
| Active pending/preparing | 3 seconds     | Kitchen needs real-time awareness   |
| Only ready/delivered     | 8 seconds     | Lower urgency                       |
| No active orders (quiet) | 15 seconds    | Save server and DB load             |
| Tab in background        | 30 seconds    | Browser throttling + save resources |

### New KOT Buzzer

```typescript
// hooks/useBuzzer.ts
// Maintains a Set of known KOT IDs in useRef.
// On each poll response: compare new IDs vs known IDs.
// If new ID found → play buzzer.mp3 (use-sound) + trigger board flash.
// Board flash: Framer Motion animate({ backgroundColor: ["#fbbf24", "transparent"] })
```

### Captain App Polling (table occupancy)

- Polls `/api/locations?type=table` every **5 seconds**
- Ensures captain sees table freed by cashier without manual refresh

### Cashier App Polling

- Polls `/api/orders/cashier` every **5 seconds**
- Always needs to catch newly delivered orders promptly

---

## 10. KOT Design

### KOT Print Layout (thermal printer / A4 friendly)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━
       REGALIA HOTEL
    Kitchen Order Ticket
━━━━━━━━━━━━━━━━━━━━━━━━━━
KOT #: KOT-007
Date : 19 May 2026  14:32
Table: T5  (Ground Floor)
Cpt  : Rahul
━━━━━━━━━━━━━━━━━━━━━━━━━━
  QTY   ITEM
──────────────────────────
   2    Paneer Tikka
        * Extra spicy
   1    Dal Makhani
   3    Butter Naan
        * No butter on top
──────────────────────────
Special: Urgent — VIP guest
━━━━━━━━━━━━━━━━━━━━━━━━━━
         [Tear Here]
```

### KOT Card Visual Rules (KDS Screen)

| Card State                   | Border Color | Header Background |
| ---------------------------- | ------------ | ----------------- |
| New / Pending (just arrived) | Red pulse    | Dark red          |
| Preparing (in progress)      | Amber        | Dark amber        |
| Partially Ready              | Amber-green  | Dark teal         |
| All Ready                    | Green        | Dark green        |

- KOT number: large, bold, monospaced — most prominent element
- Table label: second-most prominent
- Elapsed time counter: top-right, turns amber at 50% TTL, red at 100%
- Items sorted: pending first, then preparing, then ready, then delivered (grey at bottom)
- Per-item status buttons use icon + label: ▶ Preparing / ✓ Ready / ✈ Delivered

---

## 11. Tablet Flipbook Architecture

### Overview

Tablet (`≥ 768px`) renders `react-pageflip` — a React-native magazine component. 100% dynamic from MongoDB. No hardcoded pages.

### Page Generation Algorithm

```typescript
// lib/generateFlipbookPages.ts
type FlipbookPage =
  | { type: "cover" }
  | { type: "index"; categories: Category[] }
  | { type: "menu"; category: Category; items: Item[]; chunkIndex: number }
  | { type: "blank" }
  | { type: "back_cover" };

function generateFlipbookPages(
  categoriesWithItems: CategoryWithItems[],
): FlipbookPage[] {
  const pages: FlipbookPage[] = [
    { type: "cover" },
    { type: "index", categories },
  ];

  for (const cat of categoriesWithItems) {
    const chunks = chunk(cat.items, 6); // 6 items per page (configurable)
    chunks.forEach((items, i) =>
      pages.push({ type: "menu", category: cat, items, chunkIndex: i }),
    );
  }

  if (pages.length % 2 !== 0) pages.push({ type: "blank" }); // even count for spreads

  pages.push({ type: "back_cover" });
  return pages;
}
```

### Page Structure

| Page         | Type       | Content                                                    |
| ------------ | ---------- | ---------------------------------------------------------- |
| Page 0       | HARD COVER | Full-bleed video/image from branding + hotel logo centered |
| Page 1       | SOFT       | Category index (TOC) — click category → jump to its page   |
| Pages 2 to N | SOFT       | MenuPage: 3×2 item grid (room: +Add button, table: none)   |
| Page N+1     | HARD COVER | Tagline + QR code for the location + call/WhatsApp info    |

### Controls & UX

- Left/Right animated arrow buttons (Framer Motion spring on press)
- Swipe gestures (react-pageflip native touch support)
- Keyboard ← → arrow keys for page navigation
- Page counter with animated number flip animation
- Fullscreen toggle button
- Double-spread in landscape, single in portrait
- Orientation change → auto re-renders with correct spread mode
- Cover video: plays on page 0, pauses when flipped away (IntersectionObserver / page event)

### Tablet Cart (Room only)

- Floating cart icon (top-right overlay) with item count badge
- Click → Framer Motion slide-in panel from right (`x: 400 → 0`)
- Full cart UI: location pill, items, qty controls, special instructions, WhatsApp button
- Panel overlays the flipbook without destroying flipbook state

---

## 12. Lead Manager Module

### Login

- `/leads/login` — role: `"lead_manager"`
- Completely isolated from menu and operations modules

### Dashboard

- [ ] Stats cards: Total Leads, New This Week, Follow-ups Due Today, Won This Month
- [ ] **Overdue follow-up alert strip** — all leads with `nextFollowUpAt` < now, shown at top
- [ ] Browser tab title shows count: "⚡ 3 Follow-ups Due — Regalia Leads"

### Leads Table View

- [ ] Sortable/filterable columns: status, priority, source, assigned to, next follow-up date
- [ ] Inline status update dropdown
- [ ] Search by name / phone / email
- [ ] "Add Lead" button → LeadForm modal

### Lead Form (Add / Edit)

- [ ] Fields: Name, Phone, Email, Source (dropdown), Interest, Budget, Status, Priority, Notes, Next Follow-up date
- [ ] `leadManagerId` auto-assigned to logged-in user

### Follow-up Log (per lead)

- [ ] Chronological timeline of all follow-up entries
- [ ] Add follow-up: type, notes, outcome, next follow-up date
- [ ] Each entry shows: staff name, timestamp, type icon

### Pipeline Kanban View

- [ ] Columns = lead statuses: New → Contacted → Interested → Proposal → Negotiating → Won / Lost
- [ ] Drag card (via `@dnd-kit/core`) → updates lead status
- [ ] Each column shows: count of leads + sum of budgets
- [ ] Won column: green highlight. Lost column: muted.

### Reminders

- [ ] Overdue follow-ups shown prominently on dashboard load
- [ ] Sidebar badge shows count of due reminders
- [ ] Clicking reminder → opens that lead's detail view

### Admin View of Leads

- [ ] `/admin/leads` — all leads across all managers
- [ ] Reassign lead to different manager
- [ ] Export all leads to CSV
- [ ] Conversion funnel: New → Contacted → Interested → Won (with drop-off %)

---

## 13. UI/UX Design System

### Color Palette

```
Primary:          Orange gradient    #f97316 → #ea580c
Background:       Near black         #0a0a0a (dark) / #fafafa (light)
Surface:          Dark card          #141414 (dark) / #ffffff (light)
Border:           Subtle             #262626 (dark) / #e5e5e5 (light)
Success:          Green              #22c55e
WhatsApp:         #25D366
---
KDS Pending:      #ef4444 (red)
KDS Preparing:    #f59e0b (amber)
KDS Ready:        #22c55e (green)
KDS Delivered:    #6b7280 (grey)
---
Table Free:       #22c55e (green)
Table Occupied:   #ef4444 (red)
---
Lead New:         #3b82f6 (blue)
Lead Won:         #22c55e (green)
Lead Lost:        #ef4444 (red)
Lead Cold:        #6b7280 (grey)
```

### Typography

- **Display / Flipbook headers:** `Playfair Display` — elegant serif
- **UI Body:** `Plus Jakarta Sans` — clean sans-serif
- **Prices / KOT numbers / Counters:** `JetBrains Mono` — monospaced

### Animation Principles

| Element                  | Animation                                                  |
| ------------------------ | ---------------------------------------------------------- |
| Flipbook page turn       | react-pageflip 3D CSS physics                              |
| KDS new KOT card arrives | Slide-in from top + yellow board flash (Framer Motion)     |
| KDS buzzer               | Audio + pulsing border ring on new card                    |
| KDS item marked ready    | Green checkmark scale-in + row background transition       |
| KDS time counter         | Turns amber at 50% TTL exceeded, red at 100%               |
| Captain order placed     | Lottie success animation                                   |
| Table freed (cashier)    | Cell flips red → green with Framer Motion layout animation |
| Lead stage drag-drop     | Smooth layout animation via @dnd-kit + framer-motion       |
| Mobile item cards        | Stagger fade + scale from 0.95                             |
| Cart drawer (mobile)     | Slide-up from bottom                                       |
| Cart panel (tablet)      | Slide-in from right                                        |
| Floating buttons         | Bounce-in on load, scale on hover                          |
| Modal open               | Scale + fade backdrop                                      |
| Search overlay           | Blur-in backdrop + slide-down input                        |

---

## 14. Pages & Routes

### Public (Guest)

| Route                          | Description                      |
| ------------------------------ | -------------------------------- |
| `/menu`                        | Menu — no location context       |
| `/menu?type=room&location=101` | Room 101 — cart + WhatsApp order |
| `/menu?type=table&location=T5` | Table T5 — view only, no cart    |

### Admin

| Route               | Description                              |
| ------------------- | ---------------------------------------- |
| `/login`            | Admin login                              |
| `/admin`            | Dashboard + live table grid              |
| `/admin/categories` | Category CRUD                            |
| `/admin/items`      | Item CRUD (includes TTL field)           |
| `/admin/locations`  | Room & Table management                  |
| `/admin/branding`   | Branding + flipbook cover media          |
| `/admin/qr-code`    | Per-location QR + bulk ZIP export        |
| `/admin/staff`      | Create/delete Captain/Kitchen/Cashier/LM |
| `/admin/orders`     | Full history + efficiency metrics        |
| `/admin/leads`      | All leads across all managers            |

### Captain

| Route            | Description                    |
| ---------------- | ------------------------------ |
| `/captain/login` | Login                          |
| `/captain`       | Table selector + order builder |

### Kitchen

| Route            | Description |
| ---------------- | ----------- |
| `/kitchen/login` | Login       |
| `/kitchen`       | KDS board   |

### Cashier

| Route            | Description                       |
| ---------------- | --------------------------------- |
| `/cashier/login` | Login                             |
| `/cashier`       | Payment queue + table status grid |

### Lead Manager

| Route          | Description              |
| -------------- | ------------------------ |
| `/leads/login` | Login                    |
| `/leads`       | CRM dashboard + pipeline |

---

## 15. API Routes

### Menu & Branding

| Method | Endpoint                  | Auth   | Description                   |
| ------ | ------------------------- | ------ | ----------------------------- |
| GET    | `/api/categories`         | Public | List active categories        |
| POST   | `/api/categories`         | Admin  | Create                        |
| PUT    | `/api/categories/[id]`    | Admin  | Update                        |
| DELETE | `/api/categories/[id]`    | Admin  | Delete                        |
| GET    | `/api/items`              | Public | List items (`?category=slug`) |
| POST   | `/api/items`              | Admin  | Create                        |
| PUT    | `/api/items/[id]`         | Admin  | Update                        |
| DELETE | `/api/items/[id]`         | Admin  | Delete                        |
| GET    | `/api/locations`          | Public | List locations                |
| POST   | `/api/locations`          | Admin  | Create                        |
| PUT    | `/api/locations/[id]`     | Admin  | Update                        |
| DELETE | `/api/locations/[id]`     | Admin  | Delete                        |
| GET    | `/api/locations/validate` | Public | Validate QR location param    |
| GET    | `/api/branding`           | Public | Get branding                  |
| PUT    | `/api/branding`           | Admin  | Update branding               |
| POST   | `/api/upload`             | Admin  | Cloudinary upload             |

### Staff Management

| Method | Endpoint          | Auth  | Description                            |
| ------ | ----------------- | ----- | -------------------------------------- |
| GET    | `/api/staff`      | Admin | List all staff (`?role=captain` etc.)  |
| POST   | `/api/staff`      | Admin | Create staff account                   |
| PUT    | `/api/staff/[id]` | Admin | Update (name, password, active status) |
| DELETE | `/api/staff/[id]` | Admin | Delete staff account                   |

### Orders

| Method | Endpoint                          | Auth              | Description                        |
| ------ | --------------------------------- | ----------------- | ---------------------------------- |
| GET    | `/api/orders`                     | Admin             | Full history with filters          |
| POST   | `/api/orders`                     | Captain           | Create new order (KOT)             |
| GET    | `/api/orders/active`              | Kitchen           | KDS polling — active orders only   |
| GET    | `/api/orders/cashier`             | Cashier           | Delivered + unpaid orders          |
| GET    | `/api/orders/metrics`             | Admin             | TTL & efficiency metrics           |
| GET    | `/api/orders/[id]`                | Admin/Cap/Kit/Cas | Single order detail                |
| PATCH  | `/api/orders/[id]`                | Kitchen/Cashier   | Update order status / payment info |
| PATCH  | `/api/orders/[id]/items/[itemId]` | Kitchen           | Update single item status          |

### Leads

| Method | Endpoint                    | Auth       | Description                  |
| ------ | --------------------------- | ---------- | ---------------------------- |
| GET    | `/api/leads`                | LM / Admin | List leads (own or all)      |
| POST   | `/api/leads`                | LM         | Create lead                  |
| GET    | `/api/leads/[id]`           | LM / Admin | Lead detail + follow-up list |
| PUT    | `/api/leads/[id]`           | LM / Admin | Update lead                  |
| DELETE | `/api/leads/[id]`           | Admin      | Delete lead                  |
| GET    | `/api/leads/[id]/followups` | LM / Admin | All follow-ups for a lead    |
| POST   | `/api/leads/[id]/followups` | LM         | Add follow-up entry          |

---

## 16. Component Architecture

### Menu Page (Server Component)

```
app/(menu)/menu/page.tsx
 └── reads: searchParams (type, location) + User-Agent header
 └── fetches: branding, categoriesWithItems, validatedLocation (all parallel)
 └── renders: <MenuShell initialView="mobile|tablet" type locationType ... />
```

### MenuShell — device + mode router

```
MenuShell
 ├── type=room  + mobile  → MobileMenuShell  (cart enabled)
 ├── type=table + mobile  → MobileMenuShell  (cart disabled, view-only props)
 ├── type=room  + tablet  → TabletMenuShell  (cart panel enabled)
 └── type=table + tablet  → TabletMenuShell  (cart panel disabled)
```

### Captain App

```
/captain/page.tsx
 └── TableSelector
     └── [select table] → OrderBuilder
         ├── CategoryTabs
         ├── ItemList (qty selector + per-item notes)
         └── OrderSummaryPanel
             └── "Place Order" → POST /api/orders → redirect to success
```

### Kitchen KDS

```
/kitchen/page.tsx
 └── useKDSPolling()     → React Query smart adaptive polling
 └── useBuzzer()         → plays sound + board flash on new KOT
 └── KDSFilters          → status filter tabs
 └── KDSBoard
     └── KOTCard × N (sorted by createdAt asc)
         ├── KOTItem × N (per item with status buttons)
         └── [Mark All Ready] [Mark All Delivered]
```

### Cashier App

```
/cashier/page.tsx
 └── useQuery({ refetchInterval: 5000 }) → /api/orders/cashier
 └── TableStatusGrid     → live table occupancy
 └── OrdersQueue
     └── [click order] → PaymentModal
         ├── Itemized bill
         ├── Payment method + amount input
         └── "Pay & Clear" → PATCH order + location
```

### Lead Manager

```
/leads/page.tsx
 ├── OverdueReminderStrip  (top alert)
 ├── LeadsStats            (count cards)
 ├── Tab: Table View → LeadsTable
 │   └── [Add Lead] / [Edit Lead] → LeadForm modal
 │   └── [View Lead] → Follow-up timeline + FollowUpForm
 └── Tab: Pipeline → LeadPipeline (Kanban)
     └── Drag cards between columns → PATCH lead status
```

---

## 17. Implementation Phases

### Phase 1 — Foundation (Days 1–2) ✅ COMPLETE

- [x] Initialize Next.js 16 + TypeScript — project at `regalia-digital-menu/`
- [x] Configure TailwindCSS v4 + DaisyUI v5 (`@plugin` syntax) + custom CSS vars + KDS animations
- [x] Root layout with Plus Jakarta Sans, Playfair Display, JetBrains Mono fonts
- [x] All TypeScript interfaces & types (`src/types/index.ts`)
- [x] Shared utility functions — `cn`, `formatPrice`, `getTtlStatus`, `buildWhatsAppUrl`, etc.
- [x] MongoDB connection singleton (`src/lib/db/mongoose.ts`)
- [x] All 8 Mongoose models: Branding, Category, Item, Location, Staff, Order, Lead, FollowUp, AdminUser
- [x] Cloudinary v2 SDK init + `uploadToCloudinary` / `deleteFromCloudinary` helpers
- [x] NextAuth v5 multi-role credentials config (admin + 4 staff roles)
- [x] Role-based middleware — `/admin`, `/captain`, `/kitchen`, `/cashier`, `/leads` protected
- [x] Zod validation schemas for all 8 forms
- [x] Server-side DB query functions (`src/lib/queries.ts`)
- [x] `.env.local` template + all env vars configured
- [x] Seed script: admin user + 8 categories + 21 items + 9 locations (`npm run seed`)

### Phase 2 — Admin Panel (Days 3–6) ✅ COMPLETE

- [x] Admin layout (sidebar + header)
- [x] Admin login page
- [x] Dashboard with stats + live table grid
- [x] Category / Item / Location / Branding / QR CRUD
- [x] Item form: add Preparation TTL field
- [x] **Staff Manager** — create/delete Captain / Kitchen / Cashier / Lead Manager accounts
- [x] Orders history page (data display, full metrics in Phase 6)

### Phase 3 — Guest Menu (Days 7–9) ✅ COMPLETE

- [x] Cart store (Zustand + persist) — `src/store/cart.ts`
- [x] Menu SSR page + User-Agent device detection — `src/app/menu/page.tsx`
- [x] `MenuShell` — device router (mobile/tablet)
- [x] MobileMenuShell:
  - [x] Room mode: full cart + WhatsApp order
  - [x] Table mode: view-only (no cart elements rendered at all)
  - [x] Sticky header + scrollable category tabs + scroll spy
  - [x] Search overlay
  - [x] ItemRow with qty controls (room) / view-only (table)
  - [x] CartDrawer with WhatsApp send
  - [x] FloatingButtons (WA + Call / Call only)
- [x] TabletMenuShell (react-pageflip):
  - [x] Flipbook page generator utility (in menu/page.tsx)
  - [x] CoverPage, CategoryIndexPage, MenuPage, BackCoverPage
  - [x] FlipControls (arrows, page counter)
  - [x] Room mode: TabletCartPanel + TabletFloatingButtons (WA + Call)
  - [x] Table mode: view-only + FloatingButtons (Call only)
- [x] Lottie animations — `LottiePlayer` wrapper + 4 JSON assets (loading, empty-cart, no-results, success)
  - [x] Integrated into `CartDrawer` (empty cart state)
  - [x] Integrated into `MobileMenuShell` (search no-results)
  - [x] Integrated into `OrderSummary` (captain success screen)
  - [x] Integrated into `OrderBuilder` (no items state)

### Phase 4 — Captain App (Days 10–11) ✅ COMPLETE

- [x] Captain login + session (`/captain/login`)
- [x] Captain layout + middleware fix (login page exempted)
- [x] Zustand captain store (`src/store/captain.ts`) — selectedTable, orderItems, notes, step
- [x] TableSelector with live occupancy polling (5s) — green=free, red=occupied
- [x] OrderBuilder (category tabs + search + items + qty controls)
- [x] OrderSummary — per-item notes, special instructions, subtotal, place order
- [x] KOT number generation (daily sequence: KOT-001, KOT-002…)
- [x] POST /api/orders → table isOccupied: true
- [x] GET/PATCH /api/orders/[id] — order detail + status update
- [x] PATCH /api/orders/[id]/items/[itemId] — item-level status + order status recalc
- [x] GET /api/orders/active — KDS polling endpoint
- [x] GET /api/orders/cashier — cashier queue endpoint
- [x] GET /api/locations — authenticated staff locations endpoint
- [x] GET /api/menu — authenticated staff menu endpoint

### Phase 5 — KDS + Cashier (Days 12–14) ✅ COMPLETE

- [x] Kitchen login + session (`/kitchen/login`) — Flame/red theme
- [x] Kitchen layout + middleware exemption
- [x] `useKDSPolling` hook — adaptive polling (3 s active / 15 s quiet), new KOT detection via Set diff
- [x] `useBuzzer` hook — plays `public/buzzer.mp3` (real file added), WebAudio API fallback
- [x] KDS board with smart polling (`KDSBoard.tsx`)
- [x] `KOTCard` — header (KOT#, table, captain, elapsed timer), collapsible, status-colored borders
- [x] `KOTItem` — veg/non-veg dot, qty badge, status badge, action buttons (Prep / Ready / Sent)
- [x] `KDSFilters` — All / Pending / Preparing / Partially Ready / Ready tabs with live counts
- [x] `BuzzerHandler` — Framer Motion amber screen flash on new KOT
- [x] `KitchenPageClient` — QueryClientProvider shell + sign-out header
- [x] TTL elapsed counter: turns amber (≥10 min) → red (≥20 min) per KOT card
- [x] Item-level actions: Preparing → Ready → Delivered with optimistic PATCH
- [x] Order-level: Mark All Ready + Mark All Delivered footer buttons
- [x] Cashier login + session (`/cashier/login`) — Landmark/green theme
- [x] Cashier layout + middleware exemption
- [x] `OrdersQueue` — 5 s polling of `/api/orders/cashier`, click to open modal
- [x] `TableStatusGrid` — live table occupancy panel (5 s poll), green=free / red=occupied
- [x] `PaymentModal` — itemized bill, Cash/Card/UPI/Room Charge selector, change calculation
- [x] Pay & Clear → `PATCH /api/orders/[id]` with `action: "pay_and_clear"` → table freed
- [x] `CashierPageClient` — two-panel layout (queue + table grid)
- [ ] KOT/bill thermal print via `react-to-print` _(deferred to Phase 8 polish)_

### Phase 6 — Metrics & Admin Orders (Day 15) ✅ COMPLETE

- [x] `/api/orders/metrics` — full MongoDB aggregation pipeline:
  - Total orders + revenue + paid/cleared counts
  - Revenue by day (area chart data)
  - Payment method breakdown (pie chart data)
  - Top 10 items by quantity ordered
  - Captain order volume + revenue
  - Hourly heatmap (0–23, full 24-hour array)
  - Avg item prep time (orderedAt → readyAt) and avg delivery time
- [x] `OrdersTable.tsx` (client) — full filter bar:
  - Date range (from/to), status dropdown, captain search, table search
  - Expandable rows: itemised view with veg/non-veg dots, per-item status, notes
  - CSV export button (`DownloadCloud` → blob download)
  - Revenue summary strip
- [x] `MetricsDashboard.tsx` — recharts charts:
  - 6 stat cards (total orders, revenue, avg prep, avg delivery, captains, payment methods)
  - Revenue area chart (30-day default, range selector: 7 / 30 / 90 days)
  - Top items horizontal bar chart (green=veg, orange=non-veg)
  - Payment methods pie chart
  - Peak hours bar chart (hourly heatmap)
  - Captain performance table with progress bars
- [x] `admin/orders/page.tsx` — replaced stub with full page: MetricsDashboard + OrdersTableClient
- [x] Admin leads overview page (`/admin/leads`) _(Phase 7 — complete)_

### Phase 7 — Lead Manager Module (Days 16–17) ✅ COMPLETE

- [x] Lead manager login + session (`/leads/login`) — info/blue theme
- [x] Leads table + filter (status, source, priority) + search + sortable columns
- [x] LeadForm modal (add/edit) — all fields: name, phone, email, source, interest, budget, status, priority, notes, nextFollowUpAt
- [x] Follow-up timeline + FollowUpForm — type selector, notes, outcome, next follow-up date, chronological history
- [x] Overdue reminder strip at top of page + browser tab title `⚡ N Follow-ups Due`
- [x] Pipeline Kanban view (`@dnd-kit/core`) — 8 columns, drag card → PATCH status, budget sum per column
- [x] `LeadsPageClient` — Table ↔ Pipeline tabs, React Query polling, refresh button, sign-out
- [x] `AdminLeadsClient` — all leads across all managers, funnel stat cards, reassign dropdown, CSV export
- [x] `/admin/leads` page + sidebar nav item added
- [x] `/api/leads` GET + POST (LM scoped / admin all)
- [x] `/api/leads/[id]` GET + PUT + DELETE
- [x] `/api/leads/[id]/followups` GET + POST
- [x] `/api/staff` GET (admin only — for reassign dropdown)
- [x] `tsc --noEmit` → exit code 0

### Phase 8 — Polish, QA & Deployment (Days 18–20) 🔄

#### Completed ✅

- [x] `/admin/metrics` stub → `redirect("/admin/orders")`
- [x] Global `not-found.tsx` (404 page) + `global-error.tsx` (error boundary)
- [x] **KOT/bill thermal print** — `KOTBillPrint.tsx` via `react-to-print` v3, integrated into `PaymentModal` (Print button + Pay & Clear button)
- [x] `vercel.json` — buildCommand, region `bom1` (Mumbai), security headers for `/api/*`
- [x] `Skeletons.tsx` — `TableSkeleton`, `CardSkeleton`, `StatCardsSkeleton` shared components
- [x] Loading skeletons for all admin + leads routes:
  - `admin/orders/loading.tsx`, `admin/leads/loading.tsx`, `admin/staff/loading.tsx`
  - `admin/dashboard/loading.tsx`, `admin/categories/loading.tsx`, `admin/items/loading.tsx`
  - `admin/locations/loading.tsx`, `admin/branding/loading.tsx`, `leads/loading.tsx`
- [x] `admin/error.tsx` — per-section error boundary with reset button
- [x] **KDS keyboard shortcuts** — `←`/`→` navigate cards, `R` = mark all ready, `D` = delivered, `Esc`/`F5` = refresh; visual focus ring on active card + shortcut hint bar (desktop only)
- [x] **Flipbook keyboard nav** — `←`/`→` arrow keys flip pages; keyboard hint shown below controls
- [x] **Accessibility** — `aria-label` added to all icon-only buttons across KDSBoard, PaymentModal, CartDrawer, TabletCartPanel, FlipControls, TabletMenuShell, LeadForm, FloatingButtons
- [x] **Seed script updated** — all staff roles seeded: captain, kitchen, cashier, lead_manager
- [x] `scripts/generate-qr.ts` — generates `public/qr/<code>.png` (512×512) per active location; `npm run generate-qr` added to `package.json`
- [x] `src/lib/db/indexes.ts` — `ensureIndexes()` for all compound indexes (Orders, Leads, Items, Staff, Locations, FollowUps)
- [x] `mongoose.ts` — calls `ensureIndexes()` on first connect (non-fatal)
- [x] **Security audit** — all API routes verified role-guarded with tight allow-lists
- [x] `DEPLOY.md` — full deployment guide: Atlas setup, seed, Vercel deploy, QR generation, E2E checklist, production hardening
- [x] `tsc --noEmit` → EXIT:0 ✅

#### Remaining ⛔

- [ ] Full responsive QA: 375px / 768px / 1024px / 1440px
- [ ] Dark/Light mode completeness audit
- [ ] Performance: lazy images, code splitting, React Query caching tuning
- [ ] Deploy to Vercel (see `DEPLOY.md`)
- [ ] End-to-end smoke test: Captain → Kitchen KDS → Cashier → Table freed (see `DEPLOY.md` checklist)

---

## 18. Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://regalia:regalia@cluster0regalia.fcocza7.mongodb.net/regalia

# NextAuth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=dfxxwquds
CLOUDINARY_API_KEY=832593681241466
CLOUDINARY_API_SECRET=HF-Ywzl77QKTDBRPIjvY0HdJKTM

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 19. Definition of Done

**Guest Menu**

- [ ] Room QR → mobile cart menu loads in < 2s
- [ ] Table QR → mobile view-only menu, zero cart UI visible
- [ ] Room QR on tablet → flipbook with cart panel overlay
- [ ] Table QR on tablet → flipbook view-only, no cart
- [ ] WhatsApp message includes room number + all items + total

**Captain App**

- [ ] Captain selects free table → builds and places order successfully
- [ ] KOT number auto-increments daily (resets to KOT-001 at midnight)
- [ ] Table immediately goes occupied (red) after order placed
- [ ] Captain can append items to an existing occupied table's order

**KDS**

- [ ] New KOT appears on KDS within 3 seconds of captain placing order
- [ ] Audio buzzer plays on new KOT arrival
- [ ] Board flashes yellow on new KOT
- [ ] Kitchen marks each item individually: Preparing → Ready → Delivered
- [ ] Kitchen marks entire order ready/delivered in one click
- [ ] TTL counter turns amber then red when overdue
- [ ] `preparingAt`, `readyAt`, `deliveredAt` accurately recorded per item

**Cashier**

- [ ] Delivered orders appear in cashier queue within 5 seconds
- [ ] Cashier records payment with any method and correct amount
- [ ] Table turns green (free) immediately after "Pay & Clear"
- [ ] KOT/bill prints in thermal-compatible format

**Metrics (Admin)**

- [ ] Avg prep time per item category displayed with TTL comparison
- [ ] Revenue reports match sum of paid orders for the selected period
- [ ] Per-captain order volume visible in dashboard

**Lead Manager**

- [ ] Lead manager adds lead and schedules follow-up
- [ ] Overdue follow-ups displayed on login
- [ ] Kanban drag-and-drop updates lead status
- [ ] Admin sees all leads and can reassign

**General**

- [ ] All role-based routes protected — wrong role → redirected to own login
- [ ] No layout breaks in dark/light mode at any breakpoint
- [ ] All animations run at 60fps on mid-range devices
- [ ] MongoDB queries < 200ms on indexed collections

---

_Plan: Regalia Digital Menu & Operations v2.0 | May 19, 2026_
