# Ashoka Hotel — Code Audit

> Generated audit of bugs, security issues, and dead code found during a whole-project review.
> Work top-down: 🔴 Critical first, then 🟡, then 🟢. Each item has file refs and a concrete fix.

---

## 🔴 CRITICAL — Secrets committed to git

**Problem:** Both `.env` and `.env.local` are tracked in git, and `.gitignore` has no env rule (only ignores `next-env.d.ts`). Committed secret keys:

| Key | Impact if leaked |
|---|---|
| `MONGODB_URI` | Full database read/write access |
| `NEXTAUTH_SECRET` | Anyone with this can forge a valid session JWT and impersonate **admin** |
| `CLOUDINARY_API_SECRET` | Upload/delete on the Cloudinary account |
| `VAPID_PRIVATE_KEY` | Send push notifications as the app |

The values live in git history even after the files are deleted — treat all four as compromised.

**Fix (in order — do not skip step 1):**

- [ ] 1. **Rotate all four secrets** at their providers (MongoDB Atlas, generate new `NEXTAUTH_SECRET`, Cloudinary, regenerate VAPID keypair).
- [ ] 2. Add env rule to `.gitignore`:
      ```
      .env
      .env.*
      !.env.example
      ```
- [ ] 3. Untrack the files:
      ```bash
      git rm --cached .env .env.local
      git commit -m "chore: stop tracking env files"
      ```
- [ ] 4. Purge from history if repo is shared/public (`git filter-repo` or BFG).
- [ ] 5. Add a committed `.env.example` with keys only (no values) for onboarding.

---

## 🟡 MEDIUM — Correctness & dead code

### 1. Dead + drifted Zod schemas — `src/lib/validations.ts`

Four schemas are never imported anywhere AND their fields no longer match the real Mongoose models. A future dev wiring one in gets silent runtime breakage.

| Schema | Drift vs real model |
|---|---|
| `CreateOrderSchema` (L111) | Uses `locationId`; order route uses `tableId`. Order POST hand-validates instead — schema unused. |
| `UpdateOrderStatusSchema` (L122) | Enum has `confirmed`, `billed` — these statuses do **not** exist in real `OrderStatus`. |
| `LeadSchema` (L140) | Fields `guestName/company/estimatedValue/eventDate`, enums `qualified/negotiation/on_hold`. Real `Lead` model: `name/interest/budget`, enums `interested/negotiating/cold`. Leads route hand-validates instead. |
| `FollowUpSchema` (L184) | Type enum has `note`; real `FollowUp` model uses `site_visit`. |

**Used and correct (keep):** `ItemSchema`, `CategorySchema`, `BrandingSchema`, `StaffSchema`/`StaffUpdateSchema`, `LocationSchema`.

- [ ] Decision: either **delete** the 4 dead schemas, or **rewrite** them to match the models and wire them into the order/leads/followup routes (replacing the hand-rolled validation). Recommend rewrite + wire — gives real input validation the routes currently lack.

### 2. Broken / dead query helpers — `src/lib/queries.ts`

- [ ] `getLocationBySlug` (L47) — queries `{ slug }`; `Location` model has no `slug` field (it's `code`). Always returns `null`. **Never called** → delete, or fix to `getLocationByCode` (already exists at L54).
- [ ] `getOrdersByDateRange` (L119) — `.populate("locationId")`; Order field is `tableId`. Populate silently no-ops. **Never called** → delete or fix field name.
- [ ] `getOrdersByLocation` (L99) — **never called** → delete if unused.
- [ ] `getAllLocations` (L68) — **live** (admin dashboard uses it) but `.sort({ name: 1 })`; Location has `label` not `name`, so sort silently does nothing. Fix → `.sort({ type: 1, label: 1 })`.

### 3. Order POST trusts client-supplied prices — `src/app/api/orders/route.ts:101-122`

Order total is recomputed server-side (good) but **from client-sent `price`/`discountPrice`/`name`/`isVegetarian`** — no DB `Item` lookup. Captain is staff (semi-trusted), so risk is low, but pricing is fully client-controlled.

- [ ] Look up each item by `itemId` from the `Item` collection server-side; use DB `price`/`discountPrice`/`name`/`isVegetarian` instead of the request body. Reject unknown/unavailable items.

---

## 🟢 LOW — Hardening & smells

- [ ] **Middleware role gap** — `src/proxy.ts` only checks auth *presence*, not role. Comment refers to a non-existent `middleware.ts`. Role is correctly re-checked in every layout + API route, so defense holds; this is cleanup. Fix the stale comment; optionally add role-prefix checks here as defense-in-depth.
- [ ] **`captain-call` POST is public** — `src/app/api/captain-call/route.ts:16`. Intentional (guest calls waiter, no login). Has per-location anti-spam, but unauthenticated write is a spam/DoS vector. Add rate-limit (per-IP or per-location cooldown).
- [ ] **VAPID env crash risk** — `src/app/api/captain-call/route.ts:11` uses non-null assertions on `NEXT_PUBLIC_VAPID_PUBLIC_KEY!` / `VAPID_PRIVATE_KEY!` at module load. If unset, route import throws. Guard or fail soft.
- [ ] **Branding field-name divergence** — `hotelName` (Zod) vs `restaurantName` (model), bridged by `dbToForm`/`formToDb` in `src/app/api/admin/branding/route.ts`. Works; rename one side to delete the translators.
- [ ] **`orders/[id]` GET** — any authenticated staff can read any order by id (`src/app/api/orders/[id]/route.ts`). Low sensitivity; scope to relevant roles if needed.

---

## Architecture note (not a bug)

Realtime is interval polling, no websockets: KDS 3s, captain 6s, cashier 5s, captain-call. Each poll = a Mongo query (and a Vercel function invocation). Fine for a single restaurant. Cost grows linear with `devices × frequency`. If multi-tenant scale arrives, move hot paths (KDS) to SSE/websockets or push-driven updates.

---

## ✅ Already solid (do not "fix")

- `Counter.ts` — atomic daily KOT sequence via `findOneAndUpdate` pipeline + `$ifNull` seeding. Correct under concurrency.
- Order totals recomputed server-side (not trusting client `subtotal`/`total`).
- `mongoose.ts` — global connection cache + `bufferCommands:false`.
- Compound unique index `{ kotDate, kotNumber }` — daily KOT reset without collision.
- Edge-safe auth split (`auth.config.ts` / `auth.ts`).
- Push: stale-subscription cleanup on 410/404, `Promise.allSettled` fire-and-forget.
- Centralized indexes in `indexes.ts`, ensured on connect.

---

## Fix order (suggested)

1. 🔴 Secrets — rotate + untrack (blocks everything; do today).
2. 🟡 Order POST price lookup (real money correctness).
3. 🟡 Dead query helpers + `getAllLocations` sort.
4. 🟡 Validation schemas — rewrite + wire, or delete.
5. 🟢 Hardening pass (rate-limit, VAPID guard, comment cleanup).
