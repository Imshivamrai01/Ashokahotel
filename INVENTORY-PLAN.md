# Inventory & Recipe Management — End-to-End Plan

> Industry-level inventory + recipe (BOM) management for Ashoka Hotel, with automatic raw-material deduction on every sale.
> Benchmarked against Petpooja, Toast, Oracle Simphony, Supy, Restaurant365, MarketMan, Lightspeed.
> Target stack: Next.js 16 (App Router) · MongoDB/Mongoose · NextAuth · existing Order/Item/Location models + `withTransaction`.

---

## 0. Goals & Scope

**What we are building**

1. **Inventory management** — track raw materials (ingredients) and direct-sale goods: stock on hand, units, costs, suppliers, purchasing, goods receipt, wastage, physical counts, and a full audit ledger.
2. **Recipe management (BOM)** — map every menu item to the ingredients (and sub-recipes) it consumes, with quantities, yield, and auto-calculated cost.
3. **Auto stock deduction** — when an item is sold, the system explodes its recipe into raw materials and deducts them from stock in real time, atomically with the order write.

**Design principles (from the research)**

- **One ledger, one truth.** Every stock change is an immutable `StockMovement`. `currentStock` is a cached running balance, never edited directly.
- **Recipe-driven (theoretical) consumption** on sale; **physical counts** reconcile theoretical vs actual and surface variance.
- **Atomic with orders.** Deduction happens inside the same Mongo transaction as the order write (reuse `withTransaction`) — a sale and its stock impact never diverge.
- **Unit-of-measure discipline.** Purchase unit ≠ recipe unit ≠ stock unit; conversions are explicit (the #1 source of errors in F&B systems).
- **Phased.** Ledger + items first; deduction last. Each phase ships standalone value.
- **Easy for restaurant staff.** Non-technical owners/managers must run this daily without training. Hide accounting jargon, default everything sensible, make the common actions one or two taps. Power lives underneath; the surface stays simple (see §0.1).

### 0.1 Ease-of-Use Principles (non-negotiable)

The target user is a restaurant owner/manager/storekeeper, not an accountant. Every screen is built mobile-first and tap-friendly (same as the existing admin).

- **Plain words, not jargon.** UI says "Stock In / Received", "Wastage", "Stock Check", "Recipe", "Low Stock" — never "GRN", "BOM", "moving-average COGS variance". Keep the precise terms in code/DB only.
- **Sensible defaults, minimal required fields.** Adding an ingredient needs only **name + unit + (optional) low-stock alert**. Cost/supplier/par auto-fill or stay optional. A recipe can be built by just picking ingredients and typing quantities.
- **Smart units.** Pick the unit once per ingredient (kg / L / pcs); the app handles g/ml conversions invisibly. Quantities shown in the unit staff think in (250 g, not 0.25 kg), never raw base units.
- **Guided, not gated.** The system never blocks a sale or a receipt because data is incomplete — it accepts it and shows a gentle "needs recipe / needs cost" nudge in a to-do list.
- **One-tap common actions.** "Receive stock" (type quantities against a supplier), "Log wastage" (pick item, qty, reason), "Stock check" (count list pre-filled with current numbers) — each ≤ 3 taps to finish.
- **Visual stock health.** Color chips (green OK / amber low / red out) instead of numbers-only tables. Dashboard answers "what do I need to buy today?" at a glance.
- **Recipe = picture of the dish.** Build a recipe on the dish's own edit screen: search ingredient → type qty → done. Live "cost ₹X · margin Y%" shown plainly. Optional, never forced.
- **Forgiving.** Wrong count or qty? Edit/undo with one tap (a compensating ledger entry under the hood — staff just see "corrected"). Nothing is scary or irreversible-looking.
- **Onboarding.** Empty states teach (e.g. "Add your first ingredient" with an example), and a short setup checklist walks a new restaurant from zero → tracking. CSV import for bulk first-time ingredient/recipe entry so they don't hand-type 200 items.
- **Progressive disclosure.** Advanced features (sub-recipes, suppliers, POs, variance reports) are tucked behind clear sections; a small café can ignore them and still get "sell → stock drops".

### 0.2 In-Panel Instructions & Guidance (required on every screen)

Staff should never need an external manual. Each panel teaches itself.

- **Panel intro line.** Every screen has a one-line plain-language "what this does" under its title (e.g. Stock In: *"Add stock you received from a supplier. Just type how much came in."*). Reuse the existing `PageHeader` `subtitle`.
- **How-it-works tip.** A small dismissible "ℹ️ How this works" callout at the top of each panel with 2–4 bullet steps. Dismiss state saved per-user in localStorage so it stops nagging but can be reopened from a "?" icon in the header.
- **Helpful empty states.** No data yet → friendly illustration + one-line explanation + primary action (e.g. *"No ingredients yet. Add your first ingredient to start tracking stock."* → **Add Ingredient**). Reuse existing Lottie/empty-state patterns.
- **Inline field hints.** Each non-obvious field has a short helper under it (e.g. Low-stock alert: *"We'll warn you when stock drops to this number."*). Reuse `AdminFormField` hint slot.
- **Confirm + consequence text.** Destructive/important actions state the effect in plain words (e.g. posting a stock count: *"This will set stock to your counted numbers and record the difference."*).
- **Setup checklist (onboarding).** A dismissible checklist on the inventory dashboard guides a new restaurant: ① add ingredients ② set recipes ③ receive stock ④ turn on auto-deduct. Shows progress; collapses once done.
- **Field-level examples.** Placeholders show real examples (`e.g. Tomato`, `e.g. 250`, `kg`) not abstract hints.
- **Glossary tooltips.** The few unavoidable terms (e.g. "yield %", "par level") get an info-tooltip with a one-sentence plain definition.
- **Consistency.** All guidance uses the same components/styling across panels (a shared `<PanelHelp>` + `<HelpTip>` component) so it feels built-in, not bolted-on. Applies to **all** panels (existing POS panels too, where useful), not only inventory.

**Out of scope for v1 (designed-for, built later):** multi-outlet/central kitchen transfers, FEFO batch/expiry costing, OCR supplier invoices, accounting integration. Schema carries an optional `branchId` from day one so multi-outlet is additive, not a rewrite.

---

## 1. Industry Feature Map (what "proper" means)

| Capability | Petpooja / Toast / Supy / R365 | In our plan |
|---|---|---|
| Raw material master with UoM | ✅ | Phase 1 |
| Suppliers / vendors | ✅ | Phase 2 |
| Purchase Orders (raise, track) | ✅ | Phase 2 |
| Goods Received Note + PO matching + price/qty variance | ✅ | Phase 2 |
| Moving-average cost on receipt | ✅ | Phase 2 |
| Multi-stage recipes / sub-recipes (semi-finished) | ✅ | Phase 3 |
| Recipe costing (auto from ingredient cost) | ✅ | Phase 3 |
| Auto deduction per dish sold | ✅ | Phase 4 |
| Modifier / NC / void aware deduction | ✅ | Phase 4 |
| Auto-86 (out-of-stock → menu unavailable) | ✅ | Phase 4 |
| Wastage logging with reasons | ✅ | Phase 5 |
| Physical stock count & reconciliation | ✅ | Phase 5 |
| Theoretical vs actual variance report | ✅ | Phase 5 |
| Low-stock / par-level / expiry alerts | ✅ | Phase 5 |
| Reports: stock value, consumption, food-cost %, purchase, supplier ledger | ✅ | Phase 6 |
| Multi-outlet / central kitchen / indents | ✅ | Future |

Sources: see end of doc.

---

## 2. Core Concepts & Vocabulary

- **Inventory Item (raw material):** a thing you buy/stock — `Tomato`, `Chicken`, `Cooking Oil`, `Coke 300ml bottle`. Has a **stock unit** (base unit it's counted in).
- **Unit of Measure (UoM):** belongs to a *measure type* — `weight` (base g), `volume` (base ml), `count` (base pcs). Conversions only valid within a type. Each item declares:
  - **Stock unit** — base unit the ledger uses (e.g. `g`).
  - **Purchase unit** + **purchase→stock factor** — buy oil in `L`, factor `1000` → stored as `ml`.
  - **Recipe unit** (per component) — recipes reference the stock unit or a convertible unit.
- **Yield %:** usable fraction after trim/cleaning loss (e.g. whole chicken 80% usable). Effective consumption = recipe qty ÷ yield.
- **Recipe / BOM:** the ingredient list (+ sub-recipes) that makes **one sellable portion** of a menu Item. Has a **yield (portions)** so batch recipes scale.
- **Sub-recipe / Preparation (semi-finished):** a batch-made intermediate (`Gravy Base`, `Mint Chutney`) that is *produced* (consuming raw items, yielding stock) and then *consumed* by menu recipes. Has its own stock + cost.
- **Direct-sale good:** a menu item sold 1:1 as a stocked item (bottled water) — no recipe, deducts itself.
- **Stock Movement (ledger entry):** signed quantity change with type, cost, and a reference to what caused it.
- **Theoretical stock:** what the ledger says you should have (purchases − recipe-based sales − logged wastage). **Actual stock:** physical count. **Variance:** actual − theoretical.

---

## 3. Data Model (Mongoose)

New collections live under `src/lib/db/models/inventory/`. All money in the smallest sensible decimal (store as Number, paise-safe rounding at report time). All quantities stored in the item's **stock (base) unit**.

### 3.1 `Unit` (optional reference) / measure helper
Rather than a collection, ship a typed helper `src/lib/inventory/units.ts`:
```ts
export type MeasureType = "weight" | "volume" | "count";
export const BASE_UNIT: Record<MeasureType, string> = { weight: "g", volume: "ml", count: "pcs" };
// Convertible units → factor to base. e.g. kg:1000, g:1, L:1000, ml:1, pcs:1, dozen:12
export const UNIT_TO_BASE: Record<string, { type: MeasureType; factor: number }> = {...};
export function toBase(qty: number, unit: string): number;     // recipe/purchase → stock
export function fromBase(qty: number, unit: string): number;   // display
```
Keeps conversions centralized and testable.

### 3.2 `InventoryItem`
```ts
{
  _id,
  name: string, sku?: string,
  category: string,                 // "Vegetables" | "Dairy" | "Meat" | "Beverage" | ...
  measureType: "weight"|"volume"|"count",
  stockUnit: string,                // base unit, e.g. "g"
  purchaseUnit: string,             // e.g. "kg"
  purchaseToStock: number,          // factor purchase→stock (kg→g = 1000)
  yieldPercent: number,             // default 100; usable % after trim
  currentStock: number,             // cached running balance in stockUnit
  avgCost: number,                  // moving-average cost per stockUnit
  reorderLevel: number,             // low-stock threshold (par)
  reorderQty?: number,              // suggested PO qty
  isPerishable: boolean,
  shelfLifeDays?: number,
  defaultSupplierId?: ObjectId,
  isDirectSale: boolean,            // sold 1:1 as a menu item (no recipe)
  isActive: boolean,
  branchId?: ObjectId,              // future multi-outlet (null = main)
  createdAt, updatedAt
}
// indexes: { name }, { category, isActive }, { currentStock }, { branchId }
```

### 3.3 `Supplier`
```ts
{ _id, name, phone?, email?, gstin?, address?, paymentTermsDays?, notes?, isActive, createdAt, updatedAt }
```

### 3.4 `PurchaseOrder`
```ts
{
  _id, poNumber: string,            // PO-YYYYMMDD-### (daily counter, like KOT)
  supplierId, status: "draft"|"sent"|"partially_received"|"received"|"cancelled",
  expectedDate?: Date,
  lines: [{ inventoryItemId, name, qty, unit, rate, amount }],  // qty in purchaseUnit
  subtotal, tax?, total,
  createdBy, createdAt, updatedAt
}
// index: { poNumber } unique, { supplierId }, { status }
```

### 3.5 `GoodsReceivedNote` (GRN)
```ts
{
  _id, grnNumber: string, purchaseOrderId?, supplierId,
  lines: [{
    inventoryItemId, name,
    qtyOrdered?, qtyReceived,        // purchaseUnit
    rate, amount,
    batchNo?, expiryDate?,
    qtyVariance?, priceVariance?     // vs PO line
  }],
  receivedBy, receivedAt, notes?, createdAt
}
```
**On post:** for each line → convert to stock unit, push `purchase_in` movement, update `currentStock` and **moving-average** `avgCost`:
`newAvg = (oldStock*oldAvg + inQtyBase*lineUnitCostBase) / (oldStock + inQtyBase)`.

### 3.6 `StockMovement` (the ledger — heart of the system)
```ts
{
  _id,
  inventoryItemId,
  type: "purchase_in" | "sale_out" | "wastage_out" | "adjustment"
      | "production_in" | "production_out" | "transfer_in" | "transfer_out"
      | "reversal",
  qtyBase: number,                  // signed: +in / -out, in stockUnit
  unitCost: number,                 // cost/stockUnit at time of movement
  balanceAfter: number,             // running balance snapshot (audit)
  refType?: "order" | "grn" | "wastage" | "stock_count" | "production" | "adjustment",
  refId?: ObjectId,
  orderItemId?: ObjectId,           // for sale_out reversal targeting
  reason?: string,
  byUser: ObjectId,
  branchId?: ObjectId,
  createdAt
}
// indexes: { inventoryItemId, createdAt }, { refType, refId }, { type, createdAt }
```
Rule: **never edit; only append.** Corrections = compensating `reversal`/`adjustment`. `currentStock` is recomputable by summing `qtyBase` (use cached field for speed, ledger for truth + a verify job).

### 3.7 `Recipe` (BOM)
```ts
{
  _id,
  kind: "menu" | "sub",             // menu item recipe vs sub-recipe
  menuItemId?: ObjectId,            // when kind=menu → links to Item
  subRecipeName?: string,           // when kind=sub
  outputUnit?: string,              // sub-recipe batch output unit (e.g. "ml")
  yieldQty: number,                 // portions (menu) or batch output (sub)
  components: [{
    kind: "item" | "sub",
    inventoryItemId?: ObjectId,     // when kind=item
    subRecipeId?: ObjectId,         // when kind=sub
    qty: number, unit: string       // per single yield unit
  }],
  costCache?: number,               // computed cost per yield unit
  isActive: boolean, branchId?, createdAt, updatedAt
}
// index: { menuItemId } unique-ish (one active menu recipe per item), { kind }
```
Sub-recipes nest. **Cost** computed recursively: `cost(recipe) = Σ component qty(base)/yield × (item.avgCost | cost(subRecipe))`. Guard against cyclic sub-recipe references.

### 3.8 `WastageEntry`
```ts
{ _id, lines:[{ inventoryItemId, qty, unit, reason }], wastedBy, wastedAt, notes? }
// reasons: "spoilage" | "overproduction" | "spillage" | "expiry" | "staff_meal" | "training" | "other"
```
On post → `wastage_out` movements.

### 3.9 `StockCount` (physical count / reconciliation)
```ts
{
  _id, countNumber, status: "open"|"posted"|"cancelled",
  lines:[{ inventoryItemId, systemQty, countedQty, varianceQty, varianceValue }],
  countedBy, postedBy?, countedAt, postedAt?, notes?
}
```
On post → one `adjustment` movement per line for the variance, `currentStock` set to `countedQty`.

### 3.10 `ProductionEntry` (make a sub-recipe batch)
```ts
{ _id, subRecipeId, batchQty, producedBy, producedAt }
```
On post → `production_out` for each ingredient consumed, `production_in` for the sub-recipe's own stock (sub-recipes are stocked items too — modelled as `InventoryItem` with `isSubRecipe=true`, or a parallel balance on the Recipe). **Decision:** represent each sub-recipe as an `InventoryItem` (`measureType` = its output) so it flows through the same ledger uniformly.

### 3.11 Counters
Reuse the existing daily-counter pattern (`Counter` model + `nextDailyKotSeq`) for `poNumber`, `grnNumber`, `countNumber`.

### 3.12 Touch points on existing models
- **`Item`** (menu) — add `recipeId?` (or rely on Recipe.menuItemId), and `trackInventory: boolean` (off = never deduct). `isAvailable` continues to gate the menu; auto-86 toggles it.
- **`Order.items[]`** — already carries `itemId`, `quantity`, `isNC`, `itemStatus`. Add `stockDeducted?: boolean` + `stockMovementIds?: ObjectId[]` per line so deduction is idempotent and reversible.

---

## 4. Stock Deduction Flow (the critical path)

### 4.1 When does stock leave?
**Decision: deduct at order-line creation** (real-time, matches Petpooja/Toast "deduct as placed"). Rationale: kitchen starts cooking immediately on KOT; the raw material is committed the moment the KOT prints.

Hooked into the two existing write paths:
- `POST /api/orders` (new order) — after order built, before/within the same `withTransaction`.
- `PATCH /api/orders/[id]` `edit_items` → **added** lines deduct; **removed (cancelled)** lines reverse; **qty changes** apply the delta.
- `PATCH /api/orders/[id]/items/[itemId]` → status `cancelled` reverses that line's deduction.

**NC items still deduct** — the guest receives the dish, kitchen consumes raw material; NC only zeroes the *bill*, not the *stock*. (Confirmed against requirement: NC = made, served, ₹0 charged, still tracked.)

### 4.2 The deduction service
`src/lib/inventory/deduct.ts`:
```ts
// Explode one order line → flat list of {inventoryItemId, qtyBase, unitCost}
async function explodeRecipe(menuItemId, qty): Component[]   // recursive through sub-recipes, applies yield%
async function deductForOrderLine(orderLine, session, byUser) // writes sale_out movements, decrements stock, stamps line.stockMovementIds + stockDeducted=true
async function reverseOrderLine(orderLine, session, byUser)   // writes reversal movements, increments stock, clears flags
```
All called **inside the order's `withTransaction`** so order + ledger commit together (Mongo replica-set txn; the app already uses `withTransaction`).

### 4.3 Sequence (new order)
```
Captain places order
  → POST /api/orders
     withTransaction:
        create Order (status pending, items)
        for each line where Item.trackInventory:
           components = explodeRecipe(itemId, qty)
           for each component:
              movement sale_out (-qtyBase, unitCost=avgCost)
              InventoryItem.currentStock -= qtyBase
           line.stockDeducted = true; line.stockMovementIds = [...]
        occupy table
     commit
  → after commit: run auto-86 check on affected items (async, non-blocking)
```

### 4.4 Cancel / void / edit
- **Cancel item** (captain 3-min void, cashier, admin, kitchen) → `reverseOrderLine` inside the existing item-PATCH transaction. Restores stock.
- **Policy decision (configurable):** restore on cancel only if item not yet `preparing`/`ready`; if already cooked, cancelling should book **wastage** instead of restoring (the raw material is gone). v1 default: **always restore** (simple, theoretical); add the "cooked → wastage" rule in Phase 5 as a setting.
- **Edit qty** → reverse old, deduct new (or apply delta).
- **Reopen paid order** → no stock change (already deducted at placement). Re-editing after reopen follows edit rules.

### 4.5 Idempotency & safety
- `line.stockDeducted` guards against double-deduction on retries (the order route already retries on KOT clash).
- If a recipe is missing and `trackInventory` is on → **don't block the sale**; log a `needs_recipe` flag/alert and skip deduction (never fail a customer order over inventory config). Surface in a "Items missing recipes" report.
- Allow `currentStock` to go negative (sale never blocked); negative = data/recipe problem, flagged in reports. (Optionally a hard-block mode per item later.)

### 4.6 Auto-86 (out of stock)
After any movement on an item, recompute affected menu items:
- For each menu Item, compute *max portions sellable* = min over components of `floor(available / perPortionBase)`.
- If 0 (or below a buffer) → set `Item.isAvailable = false` (auto-86) and emit alert. When stock replenished via GRN → optionally auto-re-enable (configurable; default manual re-enable to avoid flapping).
- The QR menu already respects `isAvailable`, so 86'd dishes vanish from the guest menu automatically.

---

## 5. Purchasing & Receiving Flow

```
Low stock detected (currentStock ≤ reorderLevel) → dashboard alert + suggested PO
  → Admin creates PurchaseOrder (supplier, lines in purchase units, rates) → status sent
  → Goods arrive → create GRN against PO
       per line: enter qtyReceived, rate, (batch/expiry)
       system computes qty & price variance vs PO line
     post GRN:
        withTransaction:
           for each line: purchase_in movement, currentStock += toBase(qtyReceived),
                          recompute moving-avg avgCost
           PO status → partially_received | received
  → recipe costs using these items recompute (costCache refresh job)
```
Direct receipt (no PO) supported: GRN with `purchaseOrderId = null`.

---

## 6. Recipe Management UX

- **Recipe editor** lives on the menu Item edit screen (new "Recipe" tab) + a standalone **Sub-recipes** screen.
- Add components: search inventory item or sub-recipe, enter qty + unit (unit picker constrained to the item's measure type), set recipe yield (portions).
- Live **cost & margin** panel: recipe cost vs menu price → food-cost % and contribution margin (the number operators care about).
- **Yield %** and **waste %** per ingredient feed effective consumption.
- Validation: prevent cyclic sub-recipes; warn on unit-type mismatch; warn if menu item has `trackInventory` but no recipe.

---

## 7. API Surface (App Router, admin-guarded)

```
src/app/api/admin/inventory/
  items/route.ts                 GET list, POST create
  items/[id]/route.ts            GET, PUT, PATCH, DELETE
  suppliers/route.ts             GET, POST
  suppliers/[id]/route.ts        GET, PUT, DELETE
  purchase-orders/route.ts       GET, POST
  purchase-orders/[id]/route.ts  GET, PUT(status), DELETE
  grn/route.ts                   GET, POST (post receipt → movements)
  recipes/route.ts               GET, POST
  recipes/[id]/route.ts          GET, PUT, DELETE
  wastage/route.ts               GET, POST
  stock-counts/route.ts          GET, POST (open)
  stock-counts/[id]/route.ts     GET, PUT (post)
  adjustments/route.ts           POST
  movements/route.ts             GET (ledger view, filters)
  reports/route.ts               GET (?type=stock_value|consumption|variance|food_cost|low_stock|purchase|wastage)
```
Internal (not HTTP): `src/lib/inventory/deduct.ts`, `costing.ts`, `units.ts`, `auto86.ts` — called from order routes + GRN/recipe routes.

All routes: `auth()` + role check. See §7.1 for the role (decided).

### 7.1 Roles & Permissions (DECIDED — new Inventory Manager role)

Add **`inventory_manager`** to `StaffRole` (in `Staff` model + `src/types`). It is a dedicated storekeeper/manager login: full inventory power, **no POS/billing**.

| Area | admin | inventory_manager | kitchen | captain / cashier |
|---|---|---|---|---|
| Inventory items, recipes, suppliers | ✅ | ✅ | — | — |
| Purchase Orders, Goods Received (Stock In) | ✅ | ✅ | — | — |
| Wastage log | ✅ | ✅ | — | — |
| Stock count / reconciliation | ✅ | ✅ | — | — |
| Reports & dashboard | ✅ | ✅ | — | — |
| Mark item 86 / unavailable | ✅ | ✅ | — | — |
| POS / orders / billing | ✅ | **—** | (existing) | (existing) |
| Other admin (menu, staff, branding, locations) | ✅ | **—** | — | — |
| Auto-deduction on sale | system | system | triggers via KOT | triggers via KOT |

Implementation notes:
- Extend `StaffRole = "captain" | "kitchen" | "cashier" | "lead_manager" | "inventory_manager"` (Staff schema enum + `src/types`).
- `ROLE_REDIRECTS.inventory_manager = "/admin/inventory"`, `ROLE_LABELS.inventory_manager = "Inventory Manager"` in `auth-constants.ts`; add a demo login button on the login page.
- **Page gating:** the inventory manager may open `/admin/inventory/**` but NOT other `/admin/**` pages. Since `proxy.ts` only checks "is authenticated", add a role check at the inventory layout (`/admin/inventory/layout.tsx` → allow `admin` + `inventory_manager`) and on every other admin page/layout → allow `admin` only (or redirect inventory_manager to `/admin/inventory`). Each inventory API route guards `["admin","inventory_manager"]`.
- Auto-deduction itself runs as the **system** inside the order transaction — it does not require the acting POS user to have any inventory permission.
- Audit: every movement already records `byUser`, so who-did-what is tracked regardless of role.

---

## 8. UI Screens (admin panel)

```
/admin/inventory                 Dashboard: stock value, low-stock, expiring soon, top consumers, food-cost %
/admin/inventory/items           Item master (CRUD, current stock, avg cost, par)
/admin/inventory/suppliers       Suppliers
/admin/inventory/purchase-orders PO list + create/receive
/admin/inventory/grn             Goods receipt
/admin/inventory/recipes         Sub-recipes (menu recipes edited on the Item screen)
/admin/inventory/wastage         Wastage log
/admin/inventory/stock-count     Physical count / reconciliation
/admin/inventory/ledger          Stock movement audit trail
/admin/inventory/reports         Reports & exports (CSV)
```
Reuse existing admin components (`AdminFormField`, `ModalShell`, `PageHeader`, `Pill`, TanStack Query patterns) and the new signed Cloudinary upload for any item images.

---

## 9. Reports (Phase 6)

- **Stock on hand & valuation** (qty × avgCost) by category.
- **Low-stock / reorder** list (≤ par) with suggested PO.
- **Consumption** (sale_out by item, period) — theoretical usage.
- **Variance** = actual (counts/GRN) − theoretical (recipe × sales); flags over-portioning/theft/waste.
- **Food-cost %** per dish and overall (recipe cost ÷ price; actual COGS ÷ sales).
- **Wastage** by reason/period.
- **Purchase & supplier ledger**; price-variance trend.
- **Expiry / FEFO** (when batch tracking lands).

---

## 10. Phased Delivery

| Phase | Scope | Ships value |
|---|---|---|
| **P1 — Foundation** | `units.ts`, `InventoryItem`, `StockMovement` ledger, manual `adjustment`, item master UI, current-stock + ledger views | Track stock manually; audit trail |
| **P2 — Purchasing** | `Supplier`, `PurchaseOrder`, `GoodsReceivedNote`, moving-avg costing, PO/GRN UI, counters | Stock-in + costs from real purchases |
| **P3 — Recipes** | `Recipe` (menu + sub), sub-recipes as stocked items, `ProductionEntry`, recipe editor + costing/margin panel | Recipe costing, food-cost % |
| **P4 — Auto deduction** | `deduct.ts` wired into order create/edit/cancel, NC-aware, idempotency flags on `Order.items`, auto-86 | The core ask: sell → stock drops |
| **P5 — Control** | `WastageEntry`, `StockCount`/reconciliation, variance report, low-stock + expiry alerts (reuse web-push) | Loss control, accuracy |
| **P6 — Insight & roles** | Reports/exports, dashboard, `inventory_manager` role, polish | Decisions + delegation |
| **Future** | Multi-outlet/central kitchen, indents/transfers, FEFO batch costing, OCR invoices, accounting export | Scale |

Each phase: models → API → UI → tests (`tsc` + targeted manual verify). P4 is gated on P3 (needs recipes) and is the highest-risk (touches the money path) — wrap in transactions, ship behind a per-item `trackInventory` flag so it can be rolled out dish-by-dish.

---

## 11. Open Decisions (confirm before P1)

1. **Deduction timing** — at KOT placement (recommended) vs at billing/clear? Plan assumes **placement**.
2. **Cancel-after-cook** — restore stock (default v1) vs auto-wastage? 
3. **Negative stock** — allow & flag (recommended) vs hard-block sale?
4. **Auto-re-enable 86'd items** on restock — auto vs manual (default manual)?
5. ~~**Inventory role**~~ — **DECIDED: new `inventory_manager` role** (full inventory, no POS). See §7.1.
6. **Single outlet** confirmed for v1 (schema keeps `branchId` for later)?
7. **Tax on purchases** — track input GST per GRN line now or later?

---

## 12. Risks & Mitigations

- **Money-path regressions (P4).** Mitigate: `trackInventory` per-item rollout, full transaction wrapping, idempotency flags, never block a sale on inventory errors, deduction unit-tested with the recipe exploder.
- **Unit conversion bugs.** Centralize in `units.ts`, store everything in base units, unit tests for every conversion.
- **Recipe drift / missing recipes.** "Items missing recipes" report + non-blocking skip.
- **Performance.** Cache `currentStock`/`avgCost`; ledger is append-only with proper indexes; auto-86 recompute scoped to affected items only, run post-commit.
- **Cyclic sub-recipes.** Cycle detection in cost + explode functions.
- **Counts vs live sales race.** Counts post as variance adjustments against the system qty captured at count open.

---

## Sources

- [Petpooja — Restaurant Inventory Management Software](https://www.petpooja.com/poss/restaurant-inventory-management-software)
- [Petpooja — Must-have Features For Your Inventory Management System](https://blog.petpooja.com/procurement-cost-control/features-for-inventory-management-system/)
- [Petpooja — Ultimate Guide to Inventory Management for Multiple Outlets](https://blog.petpooja.com/poss/ultimate-guide-to-restaurant-inventory-management/)
- [BillBoox — How Restaurant Inventory Management Works in POS Software](https://billboox.com/blog/how-restaurant-inventory-management-works-in-pos-software)
- [DineOpen — Restaurant Inventory Management Software Guide 2026](https://www.dineopen.com/blog/restaurant-inventory-management-software-guide)
- [Toast — Restaurant Inventory Management](https://pos.toasttab.com/products/inventory-management)
- [Oracle — Restaurant Inventory Management Software](https://www.oracle.com/food-beverage/restaurant-pos-systems/restaurant-inventory-management-software/)
- [Supy — Inventory Management Software for Restaurants](https://supy.io/blog/learn-inventory-management-software-for-restaurants)
- [Lightspeed — Complete Guide to Inventory Reconciliation](https://www.lightspeedhq.com/blog/inventory-reconciliation/)
- [SynergySuite — Inventory Variance in Restaurants](https://www.synergysuite.com/blog/inventory-variance/)
- [Restaurant365 — Unit of Measure Conversions](https://docs.restaurant365.com/docs/unit-of-measure-conversions)
- [Paperchase — Implementing Inventory and Recipe Costing Software](https://www.paperchase.ac/management/how-to-implement-inventory-and-recipe-costing-software-in-your-restaurant/)
- [ConnectPOS — Advanced POS Features (auto-86)](https://www.connectpos.com/pos-system-for-fast-food-chains/)
