# Ashoka Hotel — UI/UX Audit Report

> **Date:** May 24, 2026 | **Auditor:** GitHub Copilot | **Branch:** `ui-ux-improvements`> **Date:** May 24, 2026> **Date:** May 24, 2026> **Date:** May 24, 2026> **Date:** May 24, 2026

---> **Auditor:** GitHub Copilot

## Legend> **Scope:** Full web app â€” Guest Menu, Login, Admin Panel, Captain, Kitchen, Cashier, Leads CRM> **Auditor:** GitHub Copilot

| Symbol | Meaning | | Symbol | Severity |> **Branch:** `ui-ux-improvements`

|--------|---------|---|--------|----------|

| ✅ | Completed | | 🔴 | High — broken UX / a11y / data loss |> **Scope:** Full web app â€” Guest Menu, Login, Admin Panel, Captain, Kitchen, Cashier, Leads CRM> **Auditor:** GitHub Copilot> **Auditor:** GitHub Copilot

| ❌ | Not Started | | 🟡 | Medium — noticeable friction |

| | | | 🟢 | Low — polish / nice-to-have |---

---> **Branch:** `ui-ux-improvements`

## 1. Guest Menu (`/menu`)## Progress Legend

| # | Status | Issue | Severity |> **Scope:** Full web app â€” Guest Menu, Login, Admin Panel, Captain, Kitchen, Cashier, Leads CRM> **Scope:** Full web app â€” Guest Menu, Login, Admin Panel, Captain, Kitchen, Cashier, Leads CRM

|---|--------|-------|----------|

| 1.1 | ❌ | Mobile: no sticky **category tab bar** — users must scroll to discover categories | 🟡 || Symbol | Meaning |

| 1.2 | ❌ | Cart drawer has no **item quantity stepper** — "+" always adds a new line | 🟡 |

| 1.3 | ❌ | No **empty cart illustration** when cart is cleared | 🟢 || ------ | ----------- |---

| 1.4 | ❌ | WhatsApp order button has no **estimated total preview** before sending | 🟡 |

| 1.5 | ❌ | Tablet flipbook: no **loading skeleton** on first load | 🟡 || âœ… | Completed |

| 1.6 | ❌ | No **"Back to top"** button on long category pages (mobile) | 🟢 |

| ðŸ”„ | In Progress |> **Branch:** `ui-ux-improvements`> **Branch:** `ui-ux-improvements`

---

| âŒ | Not Started |

## 2. Login Pages

## Progress Legend

| # | Status | Issue | Severity |

|---|--------|-------|----------|## Severity Legend

| 2.1 | ✅ | Role pages have no visual differentiation (Captain = amber, Kitchen = red, etc.) | 🟡 |

| 2.2 | ✅ | Role selector dropdown on `/login` is confusing UX | 🔴 |---

| 2.3 | ❌ | No inline **field highlight animation** on error | 🟢 |

| 2.4 | ❌ | No **"remember me"** / session persistence hint for mobile staff | 🟢 || Symbol | Meaning |

| 2.5 | ❌ | Generic error — no distinction between wrong password vs inactive account | 🟡 |

| --------- | ------------------------------------------------------ || Symbol | Meaning |

---

| ðŸ”´ High | Broken UX, accessibility failure, or data loss risk |

## 3. Admin Panel — Global

| ðŸŸ¡ Medium | Noticeable friction, missing feature expected by users || ------ | ----------- |## Progress Legend## Progress Legend

| # | Status | Issue | Severity |

|---|--------|-------|----------|| ðŸŸ¢ Low | Polish / nice-to-have improvement |

| 3.1 | ✅ | DaisyUI `input-bordered` forms — clunky, inconsistent focus rings | 🔴 |

| 3.2 | ✅ | `ModalShell` had no focus trap / `aria-modal` | 🔴 || âœ… | Completed |

| 3.3 | ✅ | Delete buttons fired immediately — no confirmation | 🔴 |

| 3.4 | ✅ | `z-100` non-standard Tailwind value | 🟡 |---

| 3.5 | ✅ | No skeleton loaders on CRUD pages | 🟡 |

| 3.6 | ✅ | Admin sidebar had no mobile/collapsed mode | 🔴 || ðŸ”„ | In Progress || Symbol | Meaning || Symbol | Meaning |

| 3.7 | ❌ | Inconsistent spacing across CRUD pages | 🟢 |

| 3.8 | ✅ | No `N` key shortcut to open Add modal | 🟢 |## 1. Guest Menu (`/menu`)

| 3.9 | ✅ | No pagination — 200 records loaded at once | 🟡 |

| 3.10 | ✅ | No breadcrumb trail in `PageHeader` | 🟡 || âŒ | Not Started |

---| # | Status | Issue | Severity |

## 4. Admin — CRUD Forms| --- | ------ | ------------------------------------------------------------------------------------------------ | --------- || ------ | ----------- || ------ | ----------- |

| # | Status | Issue | Severity || 1.1 | âŒ | Mobile scroll menu has no sticky **category tab bar** â€” users must scroll to discover categories | ðŸŸ¡ Medium |

|---|--------|-------|----------|

| 4.1 | ✅ | DaisyUI `form-control` verbose layout | 🔴 || 1.2 | âŒ | Cart drawer has no **item quantity stepper** â€” tapping "+" always adds a new line | ðŸŸ¡ Medium |## Severity Legend

| 4.2 | ✅ | `inputCls`/`selectCls` string helpers not composable | 🟡 |

| 4.3 | ✅ | Native `<select>` for categories — no search/combobox | 🟡 || 1.3 | âŒ | No **empty cart illustration** when cart is cleared | ðŸŸ¢ Low |

| 4.4 | ✅ | Items modal overflow hidden cuts off footer buttons | 🔴 |

| 4.5 | ✅ | Sort Order was raw number input — no drag-to-reorder | 🟡 || 1.4 | âŒ | WhatsApp order button has no **estimated total** preview before sending | ðŸŸ¡ Medium || âœ… | Completed || âœ… | Completed |

| 4.6 | ✅ | No optimistic UI on delete | 🟢 |

| 4.7 | ✅ | Modal title had no icon/colour accent for Add vs Edit | 🟢 || 1.5 | âŒ | Tablet flipbook: no **loading skeleton** while pages are fetching on first load | ðŸŸ¡ Medium |

---| 1.6 | âŒ | No **"Back to top"** button on long category pages (mobile) | ðŸŸ¢ Low || Symbol | Meaning |

## 5. Admin Dashboard---| --------- | ------------------------------------------------------ || ðŸ”„ | In Progress || ðŸ”„ | In Progress |

| # | Status | Issue | Severity |## 2. Login Pages (`/login`, `/captain/login`, etc.)| ðŸ”´ High | Broken UX, accessibility failure, or data loss risk |

|---|--------|-------|----------|

| 5.1 | ✅ | Server component — never refreshed without full reload | 🔴 || # | Status | Issue | Severity || ðŸŸ¡ Medium | Noticeable friction, missing feature expected by users || âŒ | Not Started || âŒ | Not Started |

| 5.2 | ✅ | No live polling for table status | 🔴 |

| 5.3 | ✅ | No "Active Orders" live feed | 🟡 || --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |

| 5.4 | ✅ | No trend indicators (% vs yesterday) on stat cards | 🟡 |

| 2.1 | âœ… | All role login pages are **identical in styling** â€” no visual role differentiation (Captain = amber, Kitchen = red, Cashier = green, Leads = blue) | ðŸŸ¡ Medium || ðŸŸ¢ Low | Polish / nice-to-have improvement |

---

| 2.2 | âœ… | **Role selector dropdown** on `/login` is confusing UX â€” user shouldn't have to pick their own role | ðŸ”´ High |

## 6. Metrics Page

| 2.3 | âŒ | Password field shows raw error text below â€” no inline **field highlight animation** on error | ðŸŸ¢ Low |## Severity Legend## Severity Legend

| # | Status | Issue | Severity |

|---|--------|-------|----------|| 2.4 | âŒ | **No "remember me"** or session persistence hint shown to mobile staff | ðŸŸ¢ Low |

| 6.1 | ✅ | Hardcoded tooltip background `#1a1a1a` | 🟡 |

| 6.2 | ✅ | Charts had no empty-state when data is empty | 🟡 || 2.5 | âŒ | Login error message is generic â€” no distinction between wrong password vs account inactive | ðŸŸ¡ Medium |---

| 6.3 | ✅ | Only preset range buttons — no custom date range picker | 🟡 |

| 6.4 | ✅ | Heatmap used 24h format instead of 12h | 🟢 |---| Symbol | Meaning || Symbol | Meaning |

| 6.5 | ✅ | Captain table had no click-through to filtered orders | 🟢 |

## 3. Admin Panel â€” Global## 1. ðŸ  Guest Menu (`/menu`)

---

| # | Status | Issue | Severity || --------- | ------------------------------------------------------ || --------- | ------------------------------------------------------ |

## 7. Captain App

| ---- | ------ | ------------------------------------------------------------------------------------------------ | --------- |

| # | Status | Issue | Severity |

|---|--------|-------|----------|| 3.1 | âœ… | **Forms use DaisyUI `input-bordered`** â€” clunky, low-contrast labels, inconsistent focus rings | ðŸ”´ High || # | Status | Issue | Severity |

| 7.1 | ✅ | Order builder had no item search/filter | 🟡 |

| 7.3 | ✅ | Special instructions buried at bottom — low discoverability | 🟢 || 3.2 | âœ… | `ModalShell` is a custom DIY modal â€” **no focus trap, no aria-modal**, accessibility failure | ðŸ”´ High |

| 7.4 | ✅ | No "my table only" filter on active orders list | 🟢 |

| 3.3 | âœ… | **Delete buttons fire immediately** â€” no confirmation dialog on any CRUD page | ðŸ”´ High || --- | ------ | ------------------------------------------------------------------------------------------------ | --------- || ðŸ”´ High | Broken UX, accessibility failure, or data loss risk || ðŸ”´ High | Broken UX, accessibility failure, or data loss risk |

---

| 3.4 | âœ… | `z-100` on `ModalShell` is not a standard Tailwind value â€” may silently break in some builds | ðŸŸ¡ Medium |

## 8. Kitchen Display

| 3.5 | âœ… | **No skeleton loaders** on Categories, Items, Staff, Locations pages â€” blank flash on load | ðŸŸ¡ Medium || 1.1 | âŒ | Mobile scroll menu has no sticky **category tab bar** â€” users must scroll to discover categories | ðŸŸ¡ Medium |

| # | Status | Issue | Severity |

|---|--------|-------|----------|| 3.6 | âœ… | Admin sidebar has no **collapsed/mobile mode** â€” breaks completely on iPad-size screens | ðŸ”´ High |

| 8.1 | ✅ | Table number not prominent on KOT cards | 🟡 |

| 8.2 | ✅ | No audio indicator for new KOT on desktop | 🟡 || 3.7 | âŒ | All CRUD pages use the same table + modal pattern but with **inconsistent spacing** between them | ðŸŸ¢ Low || 1.2 | âŒ | Cart drawer has no **item quantity stepper** â€” tapping "+" always adds a new line | ðŸŸ¡ Medium || ðŸŸ¡ Medium | Noticeable friction, missing feature expected by users || ðŸŸ¡ Medium | Noticeable friction, missing feature expected by users |

| 8.3 | ✅ | "Mark all ready" fired immediately with no confirmation | 🟡 |

| 3.8 | âœ… | No **keyboard shortcut** to open "Add" modal (e.g. `N` key) on list pages | ðŸŸ¢ Low |

---

| 3.9 | âœ… | **No pagination** on Items/Orders â€” loads 200 records at once into the DOM | ðŸŸ¡ Medium || 1.3 | âŒ | No **empty cart illustration** when cart is cleared | ðŸŸ¢ Low |

## 9. Cashier App

| 3.10 | âœ… | `PageHeader` has no **breadcrumb trail** â€” user loses context on nested admin pages | ðŸŸ¡ Medium |

| # | Status | Issue | Severity |

|---|--------|-------|----------|| 1.4 | âŒ | WhatsApp order button has no **estimated total** preview before sending | ðŸŸ¡ Medium || ðŸŸ¢ Low | Polish / nice-to-have improvement || ðŸŸ¢ Low | Polish / nice-to-have improvement |

| 9.1 | ❌ | Payment modal has no **split-payment** (cash + UPI partial) | 🟡 |

| 9.2 | ❌ | No **receipt print preview** — `KOTBillPrint` fires without preview step | 🟡 |---

| 9.3 | ✅ | Table status badges were color-only — no text fallback | 🟡 |

| 1.5 | âŒ | Tablet flipbook: no **loading skeleton** while pages are fetching on first load | ðŸŸ¡ Medium |

---

## 4. Admin â€” Categories / Items / Staff / Locations (CRUD Forms)

## 10. Leads CRM

| 1.6 | âŒ | No **"Back to top"** button on long category pages (mobile) | ðŸŸ¢ Low |---

| # | Status | Issue | Severity |

|---|--------|-------|----------|| # | Status | Issue | Severity |

| 10.1 | ❌ | Kanban has no **drag-to-change-stage** | 🟡 |

| 10.2 | ❌ | Follow-up form uses raw `datetime-local` — no styled picker | 🟡 || --- | ------ | --------------------------------------------------------------------------------------------------------------------------- | --------- |---## 1. ðŸ  Guest Menu (`/menu`)## 1. ðŸ  Guest Menu (`/menu`)

| 10.3 | ❌ | No **lead detail slide-over panel** | 🟡 |

| 4.1 | âœ… | `FormField` wrapper uses DaisyUI `form-control` + `label` â€” **verbose, outdated styling** vs modern ShadCN form layout | ðŸ”´ High |

---

| 4.2 | âœ… | `inputCls` / `selectCls` are string-concatenation helpers â€” **not composable**, hard to extend | ðŸŸ¡ Medium |## 2. ðŸ” Login Pages (`/login`, `/captain/login`, etc.)| # | Status | Issue | Severity || # | Status | Issue | Severity |

## Priority Summary

| 4.3 | âœ… | Select dropdowns use native `<select>` â€” **no search/combobox** for categories on the Items form (broken at 20+ categories) | ðŸŸ¡ Medium |

| Tier | Items | Status |

|------|-------|--------|| 4.4 | âœ… | Items modal is `max-w-2xl` but opens on smaller screens without scroll â€” **overflow hidden cuts off footer buttons** | ðŸ”´ High || # | Status | Issue | Severity || --- | ------ | ------------------------------------------------------------------------------------------------ | --------- || --- | ------ | ------------------------------------------------------------------------------------------------ | --------- |

| **P0** — Do Now | 3.2, 3.3, 4.4, 5.1, 5.2 | ✅ All done |

| **P1** — This Sprint | 3.1, 4.1, 3.6, 2.2, 3.5, 4.6, 6.1, 6.2, 6.4, 8.1, 8.3, 2.1 | ✅ All done || 4.5 | âŒ | Sort Order field is a raw number input â€” **no drag-to-reorder** implemented despite `GripVertical` icon being rendered | ðŸŸ¡ Medium |

| **P2** — Next Sprint | 5.3, 5.4, 3.10, 9.3, 3.8, 4.7, 7.3, 7.4, 8.2, 3.9, 7.1 | ✅ All done |

| **P3** — Polish | 4.3, 6.5, 4.5, 6.3, 9.1, 9.2, 10.x, 1.x, 2.3–2.5, 3.7 | 🔄 6/10 done || 4.6 | âœ… | No **optimistic UI** on delete â€” spinner appears but list doesn't update until refetch completes | ðŸŸ¢ Low || --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |

---| 4.7 | âœ… | Modal title is plain text â€” no **icon + colour accent** to distinguish Add vs Edit mode | ðŸŸ¢ Low |

## Remaining Work (P3)| 2.1 | âœ… | All role login pages are **identical in styling** â€” no visual role differentiation (Captain = amber, Kitchen = red, Cashier = green, Leads = blue) | ðŸŸ¡ Medium || 1.1 | âŒ | Mobile scroll menu has no sticky **category tab bar** â€” users must scroll to discover categories | ðŸŸ¡ Medium || 1.1 | âŒ | Mobile scroll menu has no sticky **category tab bar** â€” users must scroll to discover categories | ðŸŸ¡ Medium |

### Medium Priority---

| # | Item |

|---|------|| 2.2 | âœ… | **Role selector dropdown** on `/login` is confusing UX â€” user shouldn't have to pick their own role | ðŸ”´ High |

| 9.1 | Split payment (cash + UPI) in cashier modal |

| 9.2 | Receipt print preview before printing |## 5. Admin Dashboard (`/admin/dashboard`)

| 10.1 | Drag-to-stage on leads kanban |

| 10.2 | Styled datetime picker on follow-up form || 2.3 | âŒ | Password field shows raw error text below â€” no inline **field highlight animation** on error | ðŸŸ¢ Low || 1.2 | âŒ | Cart drawer has no **item quantity stepper** â€” tapping "+" always adds a new line | ðŸŸ¡ Medium || 1.2 | âŒ | Cart drawer has no **item quantity stepper** â€” tapping "+" always adds a new line | ðŸŸ¡ Medium |

| 10.3 | Lead detail slide-over panel |

| 1.1 | Sticky category tab bar on mobile menu || # | Status | Issue | Severity |

| 1.2 | Cart quantity stepper |

| 1.4 | WhatsApp order total preview || --- | ------ | ------------------------------------------------------------------------------------------------------ | --------- || 2.4 | âŒ | **No "remember me"** or session persistence hint shown to mobile staff | ðŸŸ¢ Low |

| 1.5 | Tablet flipbook skeleton loader |

| 2.5 | Distinct error for wrong password vs inactive account || 5.1 | âœ… | **Server component only** â€” stat cards never refresh without a full page reload | ðŸ”´ High |

### Low Priority| 5.2 | âœ… | Table status grid is static HTML â€” **no live polling** (Kitchen/Cashier poll, Admin dashboard doesn't) | ðŸ”´ High || 2.5 | âŒ | Login error message is generic â€” "Invalid email or password" â€” no distinction between wrong password vs account inactive | ðŸŸ¡ Medium || 1.3 | âŒ | No **empty cart illustration** when cart is cleared | ðŸŸ¢ Low || 1.3 | âŒ | No **empty cart illustration** when cart is cleared | ðŸŸ¢ Low |

| # | Item |

|---|------|| 5.3 | âœ… | No **"Active Orders" live feed** with real-time KOT updates for the admin | ðŸŸ¡ Medium |

| 1.3 | Empty cart illustration |

| 1.6 | Back to top button (mobile) || 5.4 | âœ… | Stat cards have no **trend indicator** (% change vs yesterday/last week) | ðŸŸ¡ Medium |---| 1.4 | âŒ | WhatsApp order button has no **estimated total** preview before sending | ðŸŸ¡ Medium || 1.4 | âŒ | WhatsApp order button has no **estimated total** preview before sending | ðŸŸ¡ Medium |

| 2.3 | Field highlight animation on login error |

| 2.4 | "Remember me" hint |---## 3. ðŸŽ›ï¸ Admin Panel â€” Global| 1.5 | âŒ | Tablet flipbook: no **loading skeleton** while pages are fetching on first load | ðŸŸ¡ Medium || 1.5 | âŒ | Tablet flipbook: no **loading skeleton** while pages are fetching on first load | ðŸŸ¡ Medium |

| 3.7 | Consistent CRUD page spacing |

## 6. Metrics Page (`/admin/metrics`)| # | Status | Issue | Severity || 1.6 | âŒ | No **"Back to top"** button on long category pages (mobile) | ðŸŸ¢ Low || 1.6 | âŒ | No **"Back to top"** button on long category pages (mobile) | ðŸŸ¢ Low |

| # | Status | Issue | Severity || ---- | ------ | ------------------------------------------------------------------------------------------------ | --------- |

| --- | ------ | ---------------------------------------------------------------------------------------------------- | --------- |

| 6.1 | âœ… | Recharts tooltip background is **hardcoded `#1a1a1a`** â€” won't respect light theme if added later | ðŸŸ¡ Medium || 3.1 | âœ… | **Forms use DaisyUI `input-bordered`** â€” clunky, low-contrast labels, inconsistent focus rings | ðŸ”´ High |---

| 6.2 | âœ… | Area/Bar charts have **no empty-state illustration** when data arrays are empty (renders blank axes) | ðŸŸ¡ Medium |

| 6.3 | âŒ | Only 3 preset range buttons (7/30/90 days) â€” **no custom date range picker** | ðŸŸ¡ Medium || 3.2 | âœ… | `ModalShell` is a custom DIY modal â€” **no focus trap, no aria-modal**, accessibility failure | ðŸ”´ High |

| 6.4 | âœ… | Hourly heatmap shows `0:00`â€“`23:00` â€” should use `12 AM` / `1 PM` 12-hour format | ðŸŸ¢ Low |

| 6.5 | âœ… | Captain performance table has no **click-through** to a filtered orders view for that captain | ðŸŸ¢ Low || 3.3 | âœ… | **Delete buttons fire immediately** â€” no confirmation dialog on any CRUD page | ðŸ”´ High |## 2. ðŸ” Login Pages (`/login`, `/captain/login`, etc.)## 2. ðŸ” Login Pages (`/login`, `/captain/login`, etc.)

---| 3.4 | âœ… | `z-100` on `ModalShell` is not a standard Tailwind value â€” may silently break in some builds | ðŸŸ¡ Medium |

## 7. Captain App (`/captain`)| 3.5 | âœ… | **No skeleton loaders** on Categories, Items, Staff, Locations pages â€” blank flash on load | ðŸŸ¡ Medium || # | Status | Issue | Severity || # | Status | Issue | Severity |

| # | Status | Issue | Severity || 3.6 | âœ… | Admin sidebar has no **collapsed/mobile mode** â€” breaks completely on iPad-size screens | ðŸ”´ High |

| --- | ------ | ---------------------------------------------------------------------------------------- | --------- |

| 7.1 | âœ… | Order builder has no **item search/filter** â€” scrolling all items per category gets slow | ðŸŸ¡ Medium || 3.7 | âŒ | All CRUD pages use the same table + modal pattern but with **inconsistent spacing** between them | ðŸŸ¢ Low || --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- || --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |

| 7.3 | âœ… | Special instructions textarea is buried at the bottom â€” **low discoverability** | ðŸŸ¢ Low |

| 7.4 | âœ… | Active orders list shows all orders â€” no **"my table only"** filter applied by default | ðŸŸ¢ Low || 3.8 | âœ… | No **keyboard shortcut** to open "Add" modal (e.g. `N` key) on list pages | ðŸŸ¢ Low |

---| 3.9 | âœ… | **No pagination** on Items/Orders â€” loads 200 records at once into the DOM | ðŸŸ¡ Medium || 2.1 | âœ… | All role login pages are **identical in styling** â€” no visual role differentiation (Captain = amber, Kitchen = red, Cashier = green, Leads = blue) | ðŸŸ¡ Medium || 2.1 | âœ… | All role login pages are **identical in styling** â€” no visual role differentiation (Captain = amber, Kitchen = red, Cashier = green, Leads = blue) | ðŸŸ¡ Medium |

## 8. Kitchen Display (`/kitchen`)| 3.10 | âœ… | `PageHeader` has no **breadcrumb trail** â€” user loses context on nested admin pages | ðŸŸ¡ Medium |

| # | Status | Issue | Severity || 2.2 | âœ… | **Role selector dropdown** on `/login` is confusing UX â€” user shouldn't have to pick their own role | ðŸ”´ High || 2.2 | âœ… | **Role selector dropdown** on `/login` is confusing UX â€” user shouldn't have to pick their own role | ðŸ”´ High |

| --- | ------ | --------------------------------------------------------------------------------------------- | --------- |

| 8.1 | âœ… | KOT cards don't show **table number prominently** â€” it appears as small secondary text | ðŸŸ¡ Medium |---

| 8.2 | âœ… | No **audio indicator** when a new KOT arrives on desktop (beyond the buzzer hook on the page) | ðŸŸ¡ Medium |

| 8.3 | âœ… | "Mark all ready" button has **no visual confirmation** â€” fires immediately and silently | ðŸŸ¡ Medium || 2.3 | âŒ | Password field shows raw error text below â€” no inline **field highlight animation** on error | ðŸŸ¢ Low || 2.3 | âŒ | Password field shows raw error text below â€” no inline **field highlight animation** on error | ðŸŸ¢ Low |

---## 4. ðŸ“‹ Admin â€” Categories / Items / Staff / Locations (CRUD Forms)

## 9. Cashier App (`/cashier`)| 2.4 | âŒ | **No "remember me"** or session persistence hint shown to mobile staff | ðŸŸ¢ Low || 2.4 | âŒ | **No "remember me"** or session persistence hint shown to mobile staff | ðŸŸ¢ Low |

| # | Status | Issue | Severity || # | Status | Issue | Severity |

| --- | ------ | ------------------------------------------------------------------------------------------ | --------- |

| 9.1 | âŒ | Payment modal has no **split-payment** support (cash + UPI partial) | ðŸŸ¡ Medium || --- | ------ | --------------------------------------------------------------------------------------------------------------------------- | --------- || 2.5 | âŒ | Login error message is generic â€” "Invalid email or password" â€” no distinction between wrong password vs account inactive | ðŸŸ¡ Medium || 2.5 | âŒ | Login error message is generic â€” "Invalid email or password" â€” no distinction between wrong password vs account inactive | ðŸŸ¡ Medium |

| 9.2 | âŒ | No **receipt print preview** â€” `KOTBillPrint` exists but is triggered without preview step | ðŸŸ¡ Medium |

| 9.3 | âœ… | Table status grid badges are **color-only** â€” no text fallback for colorblind users | ðŸŸ¡ Medium || 4.1 | âœ… | `FormField` wrapper uses DaisyUI `form-control` + `label` â€” **verbose, outdated styling** vs modern ShadCN form layout | ðŸ”´ High |

---| 4.2 | âœ… | `inputCls` / `selectCls` are string-concatenation helpers â€” **not composable**, hard to extend | ðŸŸ¡ Medium |---

## 10. Leads CRM (`/leads`)| 4.3 | âŒ | Select dropdowns use native `<select>` â€” **no search/combobox** for categories on the Items form (broken at 20+ categories) | ðŸŸ¡ Medium |

| # | Status | Issue | Severity || 4.4 | âœ… | Items modal is `max-w-2xl` but opens on smaller screens without scroll â€” **overflow hidden cuts off footer buttons** | ðŸ”´ High |## 3. ðŸŽ›ï¸ Admin Panel â€” Global## 3. ðŸŽ›ï¸ Admin Panel â€” Global

| ---- | ------ | ---------------------------------------------------------------------------------------- | --------- |

| 10.1 | âŒ | Lead pipeline kanban has no **drag-to-change-stage** support | ðŸŸ¡ Medium || 4.5 | âŒ | Sort Order field is a raw number input â€” **no drag-to-reorder** implemented despite `GripVertical` icon being rendered | ðŸŸ¡ Medium |

| 10.2 | âŒ | Follow-up form uses raw `<input type="datetime-local">` â€” no **styled date-time picker** | ðŸŸ¡ Medium |

| 10.3 | âŒ | No **lead detail slide-over panel** â€” clicking a lead navigates away from the pipeline | ðŸŸ¡ Medium || 4.6 | âœ… | No **optimistic UI** on delete â€” spinner appears but list doesn't update until refetch completes | ðŸŸ¢ Low || # | Status | Issue | Severity || # | Status | Issue | Severity |

---| 4.7 | âœ… | Modal title is plain text â€” no **icon + colour accent** to distinguish Add vs Edit mode | ðŸŸ¢ Low |

## 11. ShadCN Migration Plan| ---- | ------ | ------------------------------------------------------------------------------------------------ | --------- || ---- | ------ | ------------------------------------------------------------------------------------------------ | --------- |

ShadCN was listed in the original tech stack but was never installed. The admin panel forms and modals are the primary target â€” operational UIs (Captain, Kitchen, Cashier) are fine with DaisyUI as-is.---

### Components Replaced| 3.1 | âœ… | **Forms use DaisyUI `input-bordered`** â€” clunky, low-contrast labels, inconsistent focus rings | ðŸ”´ High || 3.1 | âœ… | **Forms use DaisyUI `input-bordered`** â€” clunky, low-contrast labels, inconsistent focus rings | ðŸ”´ High |

| Current (DaisyUI / Custom) | Replace With | Status | Fixes |## 5. ðŸ“Š Admin Dashboard (`/admin/dashboard`)

| -------------------------------- | --------------------------------------- | ------ | ---------------------------------------------------- |

| `ModalShell` (custom DIY) | `Dialog` (Base UI) | âœ… | Focus trap, `aria-modal`, Escape key, backdrop click || 3.2 | âœ… | `ModalShell` is a custom DIY modal â€” **no focus trap, no aria-modal**, accessibility failure | ðŸ”´ High || 3.2 | âœ… | `ModalShell` is a custom DIY modal â€” **no focus trap, no aria-modal**, accessibility failure | ðŸ”´ High |

| `FormField` + `inputCls` | `AdminFormField` + `Label` | âœ… | Consistent layout, ShadCN Label |

| `input input-bordered` | `Input` (ShadCN) | âœ… | Proper focus ring, theme-aware, `aria-invalid` || # | Status | Issue | Severity |

| `select select-bordered` | Native `<select>` + ShadCN cn() classes | âœ… | RHF-compatible, consistent styling |

| Delete buttons (no confirm) | `DeleteConfirmDialog` (AlertDialog) | âœ… | Prevents accidental deletion || --- | ------ | ------------------------------------------------------------------------------------------------------ | --------- || 3.3 | âœ… | **Delete buttons fire immediately** â€” no confirmation dialog on any CRUD page | ðŸ”´ High || 3.3 | âœ… | **Delete buttons fire immediately** â€” no confirmation dialog on any CRUD page | ðŸ”´ High |

| Admin sidebar (no mobile) | `Sheet` for mobile drawer | âœ… | Responsive admin layout |

| Native `<select>` for categories | `CategoryCombobox` (custom) | âœ… | Searchable dropdown at scale || 5.1 | âœ… | **Server component only** â€” stat cards never refresh without a full page reload | ðŸ”´ High |

| Date range preset buttons | Custom date range picker | âŒ | Custom date filtering |

| Toast (sonner) | Keep sonner | âœ… | Already good || 5.2 | âœ… | Table status grid is static HTML â€” **no live polling** (Kitchen/Cashier poll, Admin dashboard doesn't) | ðŸ”´ High || 3.4 | âœ… | `z-100` on `ModalShell` is not a standard Tailwind value â€” may silently break in some builds | ðŸŸ¡ Medium || 3.4 | âœ… | `z-100` on `ModalShell` is not a standard Tailwind value â€” may silently break in some builds | ðŸŸ¡ Medium |

| Badges, spinners, KDS board | Keep DaisyUI | âœ… | Operational UIs are fine |

| 5.3 | âœ… | No **"Active Orders" live feed** with real-time KOT updates for the admin | ðŸŸ¡ Medium |

### Files Modified

| 5.4 | âœ… | Stat cards have no **trend indicator** (% change vs yesterday/last week) | ðŸŸ¡ Medium || 3.5 | âœ… | **No skeleton loaders** on Categories, Items, Staff, Locations pages â€” blank flash on load | ðŸŸ¡ Medium || 3.5 | âœ… | **No skeleton loaders** on Categories, Items, Staff, Locations pages â€” blank flash on load | ðŸŸ¡ Medium |

| File | Status | Notes |

| ------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |---| 3.6 | âœ… | Admin sidebar has no **collapsed/mobile mode** â€” breaks completely on iPad-size screens | ðŸ”´ High || 3.6 | âœ… | Admin sidebar has no **collapsed/mobile mode** â€” breaks completely on iPad-size screens | ðŸ”´ High |

| `src/components/admin/ModalShell.tsx` | âœ… | Rewritten to wrap Base UI Dialog; `mode` prop for Add (blue) / Edit (amber) accent |

| `src/components/admin/MetricsDashboard.tsx` | âœ… | Theme-aware tooltips, 12h heatmap, empty states, captain rows clickable (drill-through) |## 6. ðŸ“ˆ Metrics Page (`/admin/metrics`)| 3.7 | âŒ | All CRUD pages use the same table + modal pattern but with **inconsistent spacing** between them | ðŸŸ¢ Low || 3.7 | âŒ | All CRUD pages use the same table + modal pattern but with **inconsistent spacing** between them | ðŸŸ¢ Low |

| `src/components/admin/OrdersTable.tsx` | âœ… | Pagination (25/page), filter-aware page reset, `initialCaptain` prop |

| `src/components/admin/CategoryCombobox.tsx` | âœ… | New searchable combobox â€” replaces native select for category field || # | Status | Issue | Severity || 3.8 | âœ… | No **keyboard shortcut** to open "Add" modal (e.g. `N` key) on list pages | ðŸŸ¢ Low || 3.8 | âŒ | No **keyboard shortcut** to open "Add" modal (e.g. `N` key) on list pages | ðŸŸ¢ Low |

| `src/components/captain/OrderSummary.tsx` | âœ… | Special instructions collapsible accordion with dot indicator |

| `src/components/cashier/TableStatusGrid.tsx` | âœ… | Dot indicator + text label + `aria-label` for colorblind fallback || --- | ------ | ---------------------------------------------------------------------------------------------------- | --------- |

| `src/components/kitchen/KOTCard.tsx` | âœ… | Prominent table badge, two-step Mark All Ready confirmation |

| `src/components/PageHeader.tsx` | âœ… | `breadcrumbs` prop added â€” renders nav trail above title || 6.1 | âœ… | Recharts tooltip background is **hardcoded `#1a1a1a`** â€” won't respect light theme if added later | ðŸŸ¡ Medium || 3.9 | âŒ | **No pagination** on Items/Orders â€” loads 200 records at once into the DOM | ðŸŸ¡ Medium || 3.9 | âŒ | **No pagination** on Items/Orders â€” loads 200 records at once into the DOM | ðŸŸ¡ Medium |

| `src/app/admin/categories/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop |

| `src/app/admin/staff/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || 6.2 | âœ… | Area/Bar charts have **no empty-state illustration** when data arrays are empty (renders blank axes) | ðŸŸ¡ Medium |

| `src/app/admin/items/page.tsx` | âœ… | Migrated + skeleton + breadcrumbs + N-key + mode prop + pagination + CategoryCombobox |

| `src/app/admin/locations/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || 6.3 | âŒ | Only 3 preset range buttons (7/30/90 days) â€” **no custom date range picker** | ðŸŸ¡ Medium || 3.10 | âœ… | `PageHeader` has no **breadcrumb trail** â€” user loses context on nested admin pages | ðŸŸ¡ Medium || 3.10 | âŒ | `PageHeader` has no **breadcrumb trail** â€” user loses context on nested admin pages | ðŸŸ¡ Medium |

| `src/app/admin/leads/page.tsx` | âœ… | Breadcrumbs wired |

| `src/app/admin/metrics/page.tsx` | âœ… | Breadcrumbs wired || 6.4 | âœ… | Hourly heatmap shows `0:00`â€“`23:00` â€” should use `12 AM` / `1 PM` 12-hour format | ðŸŸ¢ Low |

| `src/app/admin/orders/page.tsx` | âœ… | Breadcrumbs + `searchParams.captain` passed to OrdersTable as initial filter |

| `src/app/admin/dashboard/page.tsx` | âœ… | Client component, 30s polling, trend indicators (% vs yesterday) on stat cards || 6.5 | âŒ | Captain performance table has no **click-through** to a filtered orders view for that captain | ðŸŸ¢ Low |---

| `src/app/api/admin/dashboard/route.ts` | âœ… | API route â€” metrics + locations + active orders |

| `src/lib/queries.ts` | âœ… | `getDashboardMetrics` returns yesterday's data for trend deltas |---## 4. ðŸ“‹ Admin â€” Categories / Items / Staff / Locations (CRUD Forms)## 4. ðŸ“‹ Admin â€” Categories / Items / Staff / Locations (CRUD Forms)

| `src/lib/utils.ts` | âœ… | Added `formatPrice`, `slugify`, `cn` utilities |

## 7. ðŸ§‘â€ðŸ³ Captain App (`/captain`)| # | Status | Issue | Severity || # | Status | Issue | Severity |

---

| # | Status | Issue | Severity || --- | ------ | --------------------------------------------------------------------------------------------------------------------------- | --------- || --- | ------ | --------------------------------------------------------------------------------------------------------------------------- | --------- |

## 12. Recommended Fix Priority

| --- | ------ | ---------------------------------------------------------------------------------------- | --------- |

| Priority | Items | Status |

| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- || 7.1 | âœ… | Order builder has no **item search/filter** â€” scrolling all items per category gets slow | ðŸŸ¡ Medium || 4.1 | âœ… | `FormField` wrapper uses DaisyUI `form-control` + `label` â€” **verbose, outdated styling** vs modern ShadCN form layout | ðŸ”´ High || 4.1 | âœ… | `FormField` wrapper uses DaisyUI `form-control` + `label` â€” **verbose, outdated styling** vs modern ShadCN form layout | ðŸ”´ High |

| **P0 â€” Do Now** | 3.2 Modal focus trap, 3.3 Delete confirmation, 4.4 Modal scroll overflow, 5.1 Dashboard live refresh, 5.2 Live table status | âœ… Done |

| **P1 â€” This Sprint** | 3.1 + 4.1 ShadCN forms, 3.6 Sidebar mobile, 2.2 Remove role selector, 3.5 Skeleton loaders, 4.6 Optimistic delete, 6.1 Tooltip theme, 6.2 Chart empty states, 6.4 12h format, 8.1 Table prominence, 8.3 Mark All Ready confirm, 2.1 Login theming | âœ… Done || 7.3 | âœ… | Special instructions textarea is buried at the bottom â€” **low discoverability** | ðŸŸ¢ Low |

| **P2 â€” Next Sprint** | 5.3 Active orders feed, 5.4 Trend indicators, 3.10 Breadcrumbs, 9.3 Color+text badges, 3.8 N-key, 4.7 Modal icon accent, 7.3 Special instructions, 7.4 My-table filter, 8.2 Audio KOT alert, 3.9 Pagination | âœ… Done |

| **P3 â€” Polish** | 4.3 Combobox, 6.5 Captain drill-through, 4.5 Drag reorder, 6.3 Custom date range, 9.1 Split payment, 9.2 Print preview, 10.x Leads CRM, 1.x Guest menu, 2.3â€“2.5 Login polish, 3.7 Spacing consistency | ðŸ”„ 2/10 done || 7.4 | âœ… | Active orders list shows all orders â€” no **"my table only"** filter applied by default | ðŸŸ¢ Low || 4.2 | âœ… | `inputCls` / `selectCls` are string-concatenation helpers â€” **not composable**, hard to extend | ðŸŸ¡ Medium || 4.2 | âœ… | `inputCls` / `selectCls` are string-concatenation helpers â€” **not composable**, hard to extend | ðŸŸ¡ Medium |

------| 4.3 | âŒ | Select dropdowns use native `<select>` â€” **no search/combobox** for categories on the Items form (broken at 20+ categories) | ðŸŸ¡ Medium || 4.3 | âŒ | Select dropdowns use native `<select>` â€” **no search/combobox** for categories on the Items form (broken at 20+ categories) | ðŸŸ¡ Medium |

## 13. Remaining Work## 8. ðŸ³ Kitchen Display (`/kitchen`)| 4.4 | âœ… | Items modal is `max-w-2xl` but opens on smaller screens without scroll â€” **overflow hidden cuts off footer buttons** | ðŸ”´ High || 4.4 | âœ… | Items modal is `max-w-2xl` but opens on smaller screens without scroll â€” **overflow hidden cuts off footer buttons** | ðŸ”´ High |

### Medium Priority| # | Status | Issue | Severity || 4.5 | âŒ | Sort Order field is a raw number input â€” **no drag-to-reorder** implemented despite `GripVertical` icon being rendered | ðŸŸ¡ Medium || 4.5 | âŒ | Sort Order field is a raw number input â€” **no drag-to-reorder** implemented despite `GripVertical` icon being rendered | ðŸŸ¡ Medium |

| # | Item || --- | ------ | --------------------------------------------------------------------------------------------- | --------- |

| ---- | ----------------------------------------------------- |

| 4.5 | ~~Drag-to-reorder for sort order~~ ✅ || 8.1 | âœ… | KOT cards don't show **table number prominently** â€” it appears as small secondary text | ðŸŸ¡ Medium || 4.6 | âœ… | No **optimistic UI** on delete â€” spinner appears but list doesn't update until refetch completes | ðŸŸ¢ Low || 4.6 | âœ… | No **optimistic UI** on delete â€” spinner appears but list doesn't update until refetch completes | ðŸŸ¢ Low |

| 6.3 | ~~Custom date range picker on Metrics page~~ ✅ |

| 9.1 | Split payment (cash + UPI) in cashier modal || 8.2 | âœ… | No **audio indicator** when a new KOT arrives on desktop (beyond the buzzer hook on the page) | ðŸŸ¡ Medium |

| 9.2 | Receipt print preview before printing |

| 10.1 | Drag-to-stage on leads kanban || 8.3 | âœ… | "Mark all ready" button has **no visual confirmation** â€” fires immediately and silently | ðŸŸ¡ Medium || 4.7 | âœ… | Modal title is plain text â€” no **icon + colour accent** to distinguish Add vs Edit mode | ðŸŸ¢ Low || 4.7 | âŒ | Modal title is plain text â€” no **icon + colour accent** to distinguish Add vs Edit mode | ðŸŸ¢ Low |

| 10.2 | Styled datetime picker on follow-up form |

| 10.3 | Lead detail slide-over panel |---

| 1.1 | Sticky category tab bar on mobile menu |

| 1.2 | Cart quantity stepper |## 9. ðŸ’³ Cashier App (`/cashier`)## 5. ðŸ“Š Admin Dashboard (`/admin/dashboard`)## 5. ðŸ“Š Admin Dashboard (`/admin/dashboard`)

| 1.4 | WhatsApp order total preview |

| 1.5 | Tablet flipbook skeleton loader || # | Status | Issue | Severity || # | Status | Issue | Severity || # | Status | Issue | Severity |

| 2.5 | Distinct error for wrong password vs inactive account |

| --- | ------ | ------------------------------------------------------------------------------------------ | --------- |

### Low Priority

| 9.1 | âŒ | Payment modal has no **split-payment** support (cash + UPI partial) | ðŸŸ¡ Medium || --- | ------ | ------------------------------------------------------------------------------------------------------ | --------- || --- | ------ | ------------------------------------------------------------------------------------------------------ | --------- |

| # | Item |

| --- | ---------------------------------------- || 9.2 | âŒ | No **receipt print preview** â€” `KOTBillPrint` exists but is triggered without preview step | ðŸŸ¡ Medium |

| 1.3 | Empty cart illustration |

| 1.6 | Back to top button on mobile || 9.3 | âœ… | Table status grid badges are **color-only** â€” no text fallback for colorblind users | ðŸŸ¡ Medium || 5.1 | âœ… | **Server component only** â€” stat cards never refresh without a full page reload | ðŸ”´ High || 5.1 | âœ… | **Server component only** â€” stat cards never refresh without a full page reload | ðŸ”´ High |

| 2.3 | Field highlight animation on login error |

| 2.4 | "Remember me" hint |---| 5.2 | âœ… | Table status grid is static HTML â€” **no live polling** (Kitchen/Cashier poll, Admin dashboard doesn't) | ðŸ”´ High || 5.2 | âœ… | Table status grid is static HTML â€” **no live polling** (Kitchen/Cashier poll, Admin dashboard doesn't) | ðŸ”´ High |

| 3.7 | Consistent CRUD page spacing |

## 10. ðŸ“ž Leads CRM (`/leads`)| 5.3 | âœ… | No **"Active Orders" live feed** with real-time KOT updates for the admin | ðŸŸ¡ Medium || 5.3 | âœ… | No **"Active Orders" live feed** with real-time KOT updates for the admin | ðŸŸ¡ Medium |

| # | Status | Issue | Severity || 5.4 | âœ… | Stat cards have no **trend indicator** (% change vs yesterday/last week) | ðŸŸ¡ Medium || 5.4 | âŒ | Stat cards have no **trend indicator** (% change vs yesterday/last week) | ðŸŸ¡ Medium |

| ---- | ------ | ---------------------------------------------------------------------------------------- | --------- |

| 10.1 | âŒ | Lead pipeline kanban has no **drag-to-change-stage** support | ðŸŸ¡ Medium |---

| 10.2 | âŒ | Follow-up form uses raw `<input type="datetime-local">` â€” no **styled date-time picker** | ðŸŸ¡ Medium |

| 10.3 | âŒ | No **lead detail slide-over panel** â€” clicking a lead navigates away from the pipeline | ðŸŸ¡ Medium |## 6. ðŸ“ˆ Metrics Page (`/admin/metrics`)## 6. ðŸ“ˆ Metrics Page (`/admin/metrics`)

---| # | Status | Issue | Severity || # | Status | Issue | Severity |

## 11. ðŸ§© ShadCN Migration Plan| --- | ------ | ---------------------------------------------------------------------------------------------------- | --------- || --- | ------ | ---------------------------------------------------------------------------------------------------- | --------- |

ShadCN was listed in the original tech stack (`PLAN.md`) but was never installed. The admin panel forms and modals are the primary target â€” operational UIs (Captain, Kitchen, Cashier) are fine with DaisyUI as-is.| 6.1 | âœ… | Recharts tooltip background is **hardcoded `#1a1a1a`** â€” won't respect light theme if added later | ðŸŸ¡ Medium || 6.1 | âœ… | Recharts tooltip background is **hardcoded `#1a1a1a`** â€” won't respect light theme if added later | ðŸŸ¡ Medium |

### Components Replaced| 6.2 | âœ… | Area/Bar charts have **no empty-state illustration** when data arrays are empty (renders blank axes) | ðŸŸ¡ Medium || 6.2 | âœ… | Area/Bar charts have **no empty-state illustration** when data arrays are empty (renders blank axes) | ðŸŸ¡ Medium |

| Current (DaisyUI / Custom) | Replace With (ShadCN) | Status | Fixes || 6.3 | âŒ | Only 3 preset range buttons (7/30/90 days) â€” **no custom date range picker** | ðŸŸ¡ Medium || 6.3 | âŒ | Only 3 preset range buttons (7/30/90 days) â€” **no custom date range picker** | ðŸŸ¡ Medium |

| -------------------------------- | --------------------------------------- | ------ | ---------------------------------------------------- |

| `ModalShell` (custom DIY) | `Dialog` (Base UI) | âœ… | Focus trap, `aria-modal`, Escape key, backdrop click || 6.4 | âœ… | Hourly heatmap shows `0:00`â€“`23:00` â€” should use `12 AM` / `1 PM` 12-hour format | ðŸŸ¢ Low || 6.4 | âœ… | Hourly heatmap shows `0:00`â€“`23:00` â€” should use `12 AM` / `1 PM` 12-hour format | ðŸŸ¢ Low |

| `FormField` + `inputCls` | `AdminFormField` + `Label` | âœ… | Consistent layout, ShadCN Label |

| `input input-bordered` | `Input` (ShadCN) | âœ… | Proper focus ring, theme-aware, `aria-invalid` || 6.5 | âŒ | Captain performance table has no **click-through** to a filtered orders view for that captain | ðŸŸ¢ Low || 6.5 | âŒ | Captain performance table has no **click-through** to a filtered orders view for that captain | ðŸŸ¢ Low |

| `select select-bordered` | Native `<select>` + ShadCN cn() classes | âœ… | RHF-compatible, consistent styling |

| Delete buttons (no confirm) | `DeleteConfirmDialog` (AlertDialog) | âœ… | Prevents accidental deletion |---

| Admin sidebar (no mobile) | `Sheet` for mobile drawer | âœ… | Responsive admin layout |

| Native `<select>` for categories | `Combobox` / `Command` | âŒ | Searchable dropdown at scale |## 7. ðŸ§‘â€ðŸ³ Captain App (`/captain`)## 7. ðŸ§‘â€ðŸ³ Captain App (`/captain`)

| Date range preset buttons | `DatePickerWithRange` (date-fns) | âŒ | Custom date filtering |

| Toast (sonner) | Keep sonner | âœ… | Already good || # | Status | Issue | Severity || # | Status | Issue | Severity |

| Badges, spinners, KDS board | Keep DaisyUI | âœ… | Operational UIs are fine |

| --- | ------ | ---------------------------------------------------------------------------------------- | --------- || --- | ------ | ---------------------------------------------------------------------------------------- | --------- |

### Files Modified

| 7.1 | âœ… | Order builder has no **item search/filter** â€” scrolling all items per category gets slow | ðŸŸ¡ Medium || 7.1 | âœ… | Order builder has no **item search/filter** â€” scrolling all items per category gets slow | ðŸŸ¡ Medium |

| File | Status | Notes |

| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------- || 7.3 | âœ… | Special instructions textarea is buried at the bottom â€” **low discoverability** | ðŸŸ¢ Low || 7.3 | âŒ | Special instructions textarea is buried at the bottom â€” **low discoverability** | ðŸŸ¢ Low |

| `src/components/ui/input.tsx` | âœ… | ShadCN Input â€” Base UI primitive |

| `src/components/ui/textarea.tsx` | âœ… | ShadCN Textarea || 7.4 | âœ… | Active orders list shows all orders â€” no **"my table only"** filter applied by default | ðŸŸ¢ Low || 7.4 | âŒ | Active orders list shows all orders â€” no **"my table only"** filter applied by default | ðŸŸ¢ Low |

| `src/components/ui/label.tsx` | âœ… | ShadCN Label |

| `src/components/ui/dialog.tsx` | âœ… | ShadCN Dialog â€” replaces ModalShell internals |---

| `src/components/ui/alert-dialog.tsx` | âœ… | ShadCN AlertDialog â€” used by DeleteConfirmDialog |

| `src/components/ui/sheet.tsx` | âœ… | Used by AdminSidebar mobile drawer |## 8. ðŸ³ Kitchen Display (`/kitchen`)## 8. ðŸ³ Kitchen Display (`/kitchen`)

| `src/components/admin/AdminFormField.tsx` | âœ… | New shared form field wrapper |

| `src/components/admin/DeleteConfirmDialog.tsx` | âœ… | New AlertDialog-based delete confirm || # | Status | Issue | Severity || # | Status | Issue | Severity |

| `src/components/admin/ModalShell.tsx` | âœ… | Rewritten to wrap ShadCN Dialog; `mode` prop for Add (blue) / Edit (amber) accent |

| `src/components/admin/MetricsDashboard.tsx` | âœ… | Theme-aware tooltips, 12h heatmap, empty states for charts || --- | ------ | --------------------------------------------------------------------------------------------- | --------- || --- | ------ | --------------------------------------------------------------------------------------------- | --------- |

| `src/components/admin/OrdersTable.tsx` | âœ… | Pagination (25/page) with filter-aware page reset |

| `src/components/captain/OrderSummary.tsx` | âœ… | Special instructions collapsible accordion with dot indicator || 8.1 | âœ… | KOT cards don't show **table number prominently** â€” it appears as small secondary text | ðŸŸ¡ Medium || 8.1 | âœ… | KOT cards don't show **table number prominently** â€” it appears as small secondary text | ðŸŸ¡ Medium |

| `src/components/cashier/TableStatusGrid.tsx` | âœ… | Dot indicator + text label + `aria-label` for colorblind fallback |

| `src/components/kitchen/KOTCard.tsx` | âœ… | Prominent table badge, two-step Mark All Ready confirmation || 8.2 | âœ… | No **audio indicator** when a new KOT arrives on desktop (beyond the buzzer hook on the page) | ðŸŸ¡ Medium || 8.2 | âŒ | No **audio indicator** when a new KOT arrives on desktop (beyond the buzzer hook on the page) | ðŸŸ¡ Medium |

| `src/components/PageHeader.tsx` | âœ… | `breadcrumbs` prop added â€” renders nav trail above title |

| `src/app/admin/categories/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || 8.3 | âœ… | "Mark all ready" button has **no visual confirmation** â€” fires immediately and silently | ðŸŸ¡ Medium || 8.3 | âœ… | "Mark all ready" button has **no visual confirmation** â€” fires immediately and silently | ðŸŸ¡ Medium |

| `src/app/admin/staff/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop |

| `src/app/admin/items/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop + pagination (20/page) |---

| `src/app/admin/locations/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop |

| `src/app/admin/leads/page.tsx` | âœ… | Breadcrumbs wired |## 9. ðŸ’³ Cashier App (`/cashier`)## 9. ðŸ’³ Cashier App (`/cashier`)

| `src/app/admin/metrics/page.tsx` | âœ… | Breadcrumbs wired |

| `src/app/admin/orders/page.tsx` | âœ… | Breadcrumbs wired || # | Status | Issue | Severity || # | Status | Issue | Severity |

| `src/app/admin/dashboard/page.tsx` | âœ… | Client component, 30s polling, trend indicators (% vs yesterday) on stat cards |

| `src/app/api/admin/dashboard/route.ts` | âœ… | API route â€” metrics + locations + active orders || --- | ------ | ------------------------------------------------------------------------------------------ | --------- || --- | ------ | ------------------------------------------------------------------------------------------ | --------- |

| `src/lib/queries.ts` | âœ… | `getDashboardMetrics` returns yesterday's data for trend deltas |

| `src/lib/utils.ts` | âœ… | Added `formatPrice`, `slugify`, `cn` utilities || 9.1 | âŒ | Payment modal has no **split-payment** support (cash + UPI partial) | ðŸŸ¡ Medium || 9.1 | âŒ | Payment modal has no **split-payment** support (cash + UPI partial) | ðŸŸ¡ Medium |

### What DaisyUI Keeps| 9.2 | âŒ | No **receipt print preview** â€” `KOTBillPrint` exists but is triggered without preview step | ðŸŸ¡ Medium || 9.2 | âŒ | No **receipt print preview** â€” `KOTBillPrint` exists but is triggered without preview step | ðŸŸ¡ Medium |

- All operational apps: Captain, Kitchen, Cashier| 9.3 | âœ… | Table status grid badges are **color-only** â€” no text fallback for colorblind users | ðŸŸ¡ Medium || 9.3 | âŒ | Table status grid badges are **color-only** â€” no text fallback for colorblind users | ðŸŸ¡ Medium |

- Badges, loading spinners, `btn`, `alert`

- KDS board cards and status indicators---

- Menu guest-facing UI

## 10. ðŸ“ž Leads CRM (`/leads`)## 10. ðŸ“ž Leads CRM (`/leads`)

---

| # | Status | Issue | Severity || # | Status | Issue | Severity |

## 12. ðŸ—“ï¸ Recommended Fix Priority

| ---- | ------ | ---------------------------------------------------------------------------------------- | --------- || ---- | ------ | ---------------------------------------------------------------------------------------- | --------- |

| Priority | Items | Status |

| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- || 10.1 | âŒ | Lead pipeline kanban has no **drag-to-change-stage** support | ðŸŸ¡ Medium || 10.1 | âŒ | Lead pipeline kanban has no **drag-to-change-stage** support | ðŸŸ¡ Medium |

| **P0 â€” Do Now** | 3.2 Modal focus trap, 3.3 Delete confirmation, 4.4 Modal scroll overflow, 5.1 Dashboard live refresh, 5.2 Live table status | âœ… Done |

| **P1 â€” This Sprint** | 3.1 + 4.1 ShadCN forms, 3.6 Sidebar mobile, 2.2 Remove role selector, 3.5 Skeleton loaders, 4.6 Optimistic delete, 6.1 Tooltip theme, 6.2 Chart empty states, 6.4 12h format, 8.1 Table prominence, 8.3 Mark All Ready confirm, 2.1 Login theming | âœ… Done || 10.2 | âŒ | Follow-up form uses raw `<input type="datetime-local">` â€” no **styled date-time picker** | ðŸŸ¡ Medium || 10.2 | âŒ | Follow-up form uses raw `<input type="datetime-local">` â€” no **styled date-time picker** | ðŸŸ¡ Medium |

| **P2 â€” Next Sprint** | 5.3 Active orders feed, 5.4 Trend indicators, 3.10 Breadcrumbs, 9.3 Color+text badges, 3.8 N-key shortcut, 4.7 Modal icon accent, 7.3 Special instructions, 7.4 My-table filter, 8.2 Audio KOT alert, 3.9 Pagination | âœ… Done |

| **P3 â€” Remaining** | 4.3 Combobox, 4.5 Drag reorder, 6.3 Custom date range, 6.5 Captain drill-through, 9.1 Split payment, 9.2 Print preview, 10.x Leads CRM, 1.x Guest menu, 2.3â€“2.5 Login polish, 3.7 Spacing consistency | âŒ Open || 10.3 | âŒ | No **lead detail slide-over panel** â€” clicking a lead navigates away from the pipeline | ðŸŸ¡ Medium || 10.3 | âŒ | No **lead detail slide-over panel** â€” clicking a lead navigates away from the pipeline | ðŸŸ¡ Medium |

---

## 13. ðŸ“‹ Remaining Work (Quick Reference)## 11. ðŸ§© ShadCN Migration Plan## 11. ðŸ§© ShadCN Migration Plan

### ðŸŸ¡ Medium Priority RemainingShadCN was listed in the original tech stack (`PLAN.md`) but was never installed. The admin panel forms and modals are the primary target â€” operational UIs (Captain, Kitchen, Cashier) are fine with DaisyUI as-is.ShadCN was listed in the original tech stack (`PLAN.md`) but was never installed. The admin panel forms and modals are the primary target â€” operational UIs (Captain, Kitchen, Cashier) are fine with DaisyUI as-is.

| # | Item |### Components Replaced### Components Replaced

| ---- | ----------------------------------------------------- |

| 4.3 | Searchable combobox for category select in Items form || Current (DaisyUI / Custom) | Replace With (ShadCN) | Status | Fixes || Current (DaisyUI / Custom) | Replace With (ShadCN) | Status | Fixes |

| 4.5 | Drag-to-reorder for sort order |

| 6.3 | Custom date range picker on Metrics page || -------------------------------- | --------------------------------------- | ------ | ---------------------------------------------------- || -------------------------------- | --------------------------------------- | ------ | ---------------------------------------------------- |

| 9.1 | Split payment (cash + UPI) in cashier modal |

| 9.2 | Receipt print preview before printing || `ModalShell` (custom DIY) | `Dialog` (Base UI) | âœ… | Focus trap, `aria-modal`, Escape key, backdrop click || `ModalShell` (custom DIY) | `Dialog` (Base UI) | âœ… | Focus trap, `aria-modal`, Escape key, backdrop click |

| 10.1 | Drag-to-stage on leads kanban |

| 10.2 | Styled datetime picker on follow-up form || `FormField` + `inputCls` | `AdminFormField` + `Label` | âœ… | Consistent layout, ShadCN Label || `FormField` + `inputCls` | `AdminFormField` + `Label` | âœ… | Consistent layout, ShadCN Label |

| 10.3 | Lead detail slide-over panel |

| 1.1 | Sticky category tab bar on mobile menu || `input input-bordered` | `Input` (ShadCN) | âœ… | Proper focus ring, theme-aware, `aria-invalid` || `input input-bordered` | `Input` (ShadCN) | âœ… | Proper focus ring, theme-aware, `aria-invalid` |

| 1.2 | Cart quantity stepper |

| 1.4 | WhatsApp order total preview || `select select-bordered` | Native `<select>` + ShadCN cn() classes | âœ… | RHF-compatible, consistent styling || `select select-bordered` | Native `<select>` + ShadCN cn() classes | âœ… | RHF-compatible, consistent styling |

| 1.5 | Tablet flipbook skeleton loader |

| 2.5 | Distinct error for wrong password vs inactive account || Delete buttons (no confirm) | `DeleteConfirmDialog` (AlertDialog) | âœ… | Prevents accidental deletion || Delete buttons (no confirm) | `DeleteConfirmDialog` (AlertDialog) | âœ… | Prevents accidental deletion |

### ðŸŸ¢ Low Priority Remaining| Admin sidebar (no mobile) | `Sheet` for mobile drawer | âœ… | Responsive admin layout || Admin sidebar (no mobile) | `Sheet` for mobile drawer | âœ… | Responsive admin layout |

| # | Item || Native `<select>` for categories | `Combobox` / `Command` | âŒ | Searchable dropdown at scale || Native `<select>` for categories | `Combobox` / `Command` | âŒ | Searchable dropdown at scale |

| --- | ---------------------------------------- |

| 1.3 | Empty cart illustration || Date range preset buttons | `DatePickerWithRange` (date-fns) | âŒ | Custom date filtering || Date range preset buttons | `DatePickerWithRange` (date-fns) | âŒ | Custom date filtering |

| 1.6 | Back to top button on mobile |

| 2.3 | Field highlight animation on login error || Toast (sonner) | Keep sonner | âœ… | Already good || Toast (sonner) | Keep sonner | âœ… | Already good |

| 2.4 | "Remember me" hint |

| 3.7 | Consistent CRUD page spacing || Badges, spinners, KDS board | Keep DaisyUI | âœ… | Operational UIs are fine || Badges, spinners, KDS board | Keep DaisyUI | âœ… | Operational UIs are fine |

| 6.5 | Captain performance drill-through |

### Files Modified### Files Modified

| File | Status | Notes || File | Status | Notes |

| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------- || ---------------------------------------------- | ------ | ----------------------------------------------------------- |

| `src/components/ui/input.tsx` | âœ… | ShadCN Input â€” Base UI primitive || `src/components/ui/input.tsx` | âœ… | ShadCN Input â€” Base UI primitive |

| `src/components/ui/textarea.tsx` | âœ… | ShadCN Textarea || `src/components/ui/textarea.tsx` | âœ… | ShadCN Textarea |

| `src/components/ui/label.tsx` | âœ… | ShadCN Label || `src/components/ui/label.tsx` | âœ… | ShadCN Label |

| `src/components/ui/dialog.tsx` | âœ… | ShadCN Dialog â€” replaces ModalShell internals || `src/components/ui/dialog.tsx` | âœ… | ShadCN Dialog â€” replaces ModalShell internals |

| `src/components/ui/alert-dialog.tsx` | âœ… | ShadCN AlertDialog â€” used by DeleteConfirmDialog || `src/components/ui/alert-dialog.tsx` | âœ… | ShadCN AlertDialog â€” used by DeleteConfirmDialog |

| `src/components/ui/sheet.tsx` | âœ… | Used by AdminSidebar mobile drawer || `src/components/ui/sheet.tsx` | âœ… | Used by AdminSidebar mobile drawer |

| `src/components/admin/AdminFormField.tsx` | âœ… | New shared form field wrapper || `src/components/admin/AdminFormField.tsx` | âœ… | New shared form field wrapper |

| `src/components/admin/DeleteConfirmDialog.tsx` | âœ… | New AlertDialog-based delete confirm || `src/components/admin/DeleteConfirmDialog.tsx` | âœ… | New AlertDialog-based delete confirm |

| `src/components/admin/ModalShell.tsx` | âœ… | Rewritten to wrap ShadCN Dialog; `mode` prop for Add (blue) / Edit (amber) accent || `src/components/admin/ModalShell.tsx` | âœ… | Rewritten to wrap ShadCN Dialog |

| `src/components/admin/MetricsDashboard.tsx` | âœ… | Theme-aware tooltips, 12h heatmap, empty states for charts || `src/app/admin/categories/page.tsx` | âœ… | Migrated + skeleton loader + optimistic delete |

| `src/components/captain/OrderSummary.tsx` | âœ… | Special instructions collapsible accordion with dot indicator || `src/app/admin/staff/page.tsx` | âœ… | Migrated + skeleton loader + optimistic delete |

| `src/components/cashier/TableStatusGrid.tsx` | âœ… | Dot indicator + text label + `aria-label` for colorblind fallback || `src/app/admin/items/page.tsx` | âœ… | Migrated + skeleton loader + optimistic delete |

| `src/components/kitchen/KOTCard.tsx` | âœ… | Prominent table badge, two-step Mark All Ready confirmation || `src/app/admin/locations/page.tsx` | âœ… | Migrated + skeleton loader + optimistic delete |

| `src/components/PageHeader.tsx` | âœ… | `breadcrumbs` prop added â€” renders nav trail above title || `src/app/admin/dashboard/page.tsx` | âœ… | Converted to client component with 30s live polling |

| `src/app/admin/categories/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || `src/app/api/admin/dashboard/route.ts` | âœ… | New API route â€” metrics + locations + active orders |

| `src/app/admin/staff/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || `src/components/admin/MetricsDashboard.tsx` | âœ… | Theme-aware tooltips, 12h heatmap, empty states for charts |

| `src/app/admin/items/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || `src/components/kitchen/KOTCard.tsx` | âœ… | Prominent table badge, two-step Mark All Ready confirmation |

| `src/app/admin/locations/page.tsx` | âœ… | Migrated + skeleton + optimistic delete + breadcrumbs + N-key + mode prop || `src/lib/utils.ts` | âœ… | Added `formatPrice`, `slugify`, `cn` utilities |

| `src/app/admin/leads/page.tsx` | âœ… | Breadcrumbs wired |

| `src/app/admin/metrics/page.tsx` | âœ… | Breadcrumbs wired |### What DaisyUI Keeps

| `src/app/admin/orders/page.tsx` | âœ… | Breadcrumbs wired |

| `src/app/admin/dashboard/page.tsx` | âœ… | Client component, 30s polling, trend indicators (% vs yesterday) on stat cards |- All operational apps: Captain, Kitchen, Cashier

| `src/app/api/admin/dashboard/route.ts` | âœ… | API route â€” metrics + locations + active orders |- Badges, loading spinners, `btn`, `alert`

| `src/lib/queries.ts` | âœ… | `getDashboardMetrics` returns yesterday's data for trend deltas |- KDS board cards and status indicators

| `src/lib/utils.ts` | âœ… | Added `formatPrice`, `slugify`, `cn` utilities |- Menu guest-facing UI

### What DaisyUI Keeps---

- All operational apps: Captain, Kitchen, Cashier## 12. ðŸ—“ï¸ Recommended Fix Priority

- Badges, loading spinners, `btn`, `alert`

- KDS board cards and status indicators| Priority | Items | Status |

- Menu guest-facing UI| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |

| **P0 â€” Do Now** | 3.2 Modal focus trap, 3.3 Delete confirmation, 4.4 Modal scroll overflow, 5.1 Dashboard live refresh, 5.2 Live table status | âœ… Done |

---| **P1 â€” This Sprint** | 3.1 + 4.1 ShadCN forms, 3.6 Sidebar mobile, 2.2 Remove role selector, 3.5 Skeleton loaders, 4.6 Optimistic delete, 6.1 Tooltip theme, 6.2 Chart empty states, 6.4 12h format, 8.1 Table prominence, 8.3 Mark All Ready confirm, 2.1 Login theming | âœ… Done |

| **P2 â€” Next Sprint** | 5.4 Trend indicators, 4.3 Combobox categories, 6.3 Custom date range, 3.9 Pagination, 3.10 Breadcrumbs, 9.3 Color+text badges, 5.3 Active orders feed | ðŸ”„ 5.3 âœ…, rest âŒ |

## 12. ðŸ—“ï¸ Recommended Fix Priority| **P3 â€” Polish** | 1.x Guest menu, 7.3 Special instructions UX, 7.4 My-table filter, 8.2 Audio KOT alert, 9.1 Split payment, 9.2 Print preview, 10.x Leads CRM, 4.5 Drag reorder, 4.7 Modal icon accent, 6.5 Captain drill-through, 2.3â€“2.5 Login UX | âŒ Not started |

| Priority | Items | Status |---

| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |

| **P0 â€” Do Now** | 3.2 Modal focus trap, 3.3 Delete confirmation, 4.4 Modal scroll overflow, 5.1 Dashboard live refresh, 5.2 Live table status | âœ… Done |## 13. ðŸ“‹ Remaining Work (Quick Reference)

| **P1 â€” This Sprint** | 3.1 + 4.1 ShadCN forms, 3.6 Sidebar mobile, 2.2 Remove role selector, 3.5 Skeleton loaders, 4.6 Optimistic delete, 6.1 Tooltip theme, 6.2 Chart empty states, 6.4 12h format, 8.1 Table prominence, 8.3 Mark All Ready confirm, 2.1 Login theming | âœ… Done |

| **P2 â€” Next Sprint** | 5.3 Active orders feed, 5.4 Trend indicators, 3.10 Breadcrumbs, 9.3 Color+text badges, 3.8 N-key shortcut, 4.7 Modal icon accent, 7.3 Special instructions, 7.4 My-table filter, 8.2 Audio KOT alert | âœ… Done |### ðŸ”´ High Priority Remaining

| **P3 â€” Remaining** | 3.9 Pagination, 4.3 Combobox, 4.5 Drag reorder, 6.3 Custom date range, 6.5 Captain drill-through, 9.1 Split payment, 9.2 Print preview, 10.x Leads CRM, 1.x Guest menu, 2.3â€“2.5 Login polish | âŒ Open |

_None â€” all P0 items resolved._

---

### ðŸŸ¡ Medium Priority Remaining

## 13. ðŸ“‹ Remaining Work (Quick Reference)

| # | Item |

### ðŸŸ¡ Medium Priority Remaining| ---- | ----------------------------------------------------- |

| 3.9 | Pagination on Items / Orders list |

| # | Item || 3.10 | Breadcrumb trail in PageHeader |

| ---- | ----------------------------------------------------- || 4.3 | Searchable combobox for category select in Items form |

| 3.9 | Pagination on Items / Orders list || 4.5 | Drag-to-reorder for sort order |

| 4.3 | Searchable combobox for category select in Items form || 5.4 | Stat card trend indicators (% vs yesterday) |

| 4.5 | Drag-to-reorder for sort order || 6.3 | Custom date range picker on Metrics page |

| 6.3 | Custom date range picker on Metrics page || 6.5 | Captain drill-through on metrics table |

| 9.1 | Split payment (cash + UPI) in cashier modal || 8.2 | Audio alert for new KOT arrival |

| 9.2 | Receipt print preview before printing || 9.1 | Split payment (cash + UPI) in cashier modal |

| 10.1 | Drag-to-stage on leads kanban || 9.2 | Receipt print preview before printing |

| 10.2 | Styled datetime picker on follow-up form || 9.3 | Color + text fallback on cashier table badges |

| 10.3 | Lead detail slide-over panel || 10.1 | Drag-to-stage on leads kanban |

| 1.1 | Sticky category tab bar on mobile menu || 10.2 | Styled datetime picker on follow-up form |

| 1.2 | Cart quantity stepper || 10.3 | Lead detail slide-over panel |

| 1.4 | WhatsApp order total preview || 1.1 | Sticky category tab bar on mobile menu |

| 1.5 | Tablet flipbook skeleton loader || 1.2 | Cart quantity stepper |

| 2.5 | Distinct error for wrong password vs inactive account || 1.4 | WhatsApp order total preview |

| 1.5 | Tablet flipbook skeleton loader |

### ðŸŸ¢ Low Priority Remaining| 2.5 | Distinct error for wrong password vs inactive account |

| # | Item |### ðŸŸ¢ Low Priority Remaining

| --- | ---------------------------------------- |

| 1.3 | Empty cart illustration || # | Item |

| 1.6 | Back to top button on mobile || --- | ---------------------------------------- |

| 2.3 | Field highlight animation on login error || 1.3 | Empty cart illustration |

| 2.4 | "Remember me" hint || 1.6 | Back to top button on mobile |

| 3.7 | Consistent CRUD page spacing || 2.3 | Field highlight animation on login error |

| 6.5 | Captain performance drill-through || 2.4 | "Remember me" hint |

| 3.7 | Consistent CRUD page spacing |
| 3.8 | `N` key shortcut to open Add modal |
| 4.7 | Modal icon accent for Add vs Edit |
| 6.5 | Captain performance drill-through |
| 7.3 | Special instructions discoverability |
| 7.4 | "My table only" filter default |

> **Date:** May 24, 2026
> **Auditor:** GitHub Copilot
> **Scope:** Full web app â€” Guest Menu, Login, Admin Panel, | Admin sidebar (no mobile) | `S| **P1 â€” This Sprint** | 3.1 + 4.1 ShadCN form migration, 3.6 Sidebar mobile mode (Sheet), 2.2 Remove role selector from login                                    | âœ… Done |eet` for mobile drawer | âœ… | Responsive admin layout |aptain, Kitchen, Cashier, Leads CRM
> **Branch:** `ui-ux-improvements`

---

## Progress Legend

| Symbol | Meaning     |
| ------ | ----------- |
| âœ…    | Completed   |
| ðŸ”„   | In Progress |
| âŒ     | Not Started |

## Severity Legend

| Symbol      | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| ðŸ”´ High   | Broken UX, accessibility failure, or data loss risk    |
| ðŸŸ¡ Medium | Noticeable friction, missing feature expected by users |
| ðŸŸ¢ Low    | Polish / nice-to-have improvement                      |

---

## 1. ðŸ  Guest Menu (`/menu`)

| #   | Status | Issue                                                                                              | Severity    |
| --- | ------ | -------------------------------------------------------------------------------------------------- | ----------- |
| 1.1 | âŒ     | Mobile scroll menu has no sticky **category tab bar** â€” users must scroll to discover categories | ðŸŸ¡ Medium |
| 1.2 | âŒ     | Cart drawer has no **item quantity stepper** â€” tapping "+" always adds a new line                | ðŸŸ¡ Medium |
| 1.3 | âŒ     | No **empty cart illustration** when cart is cleared                                                | ðŸŸ¢ Low    |
| 1.4 | âŒ     | WhatsApp order button has no **estimated total** preview before sending                            | ðŸŸ¡ Medium |
| 1.5 | âŒ     | Tablet flipbook: no **loading skeleton** while pages are fetching on first load                    | ðŸŸ¡ Medium |
| 1.6 | âŒ     | No **"Back to top"** button on long category pages (mobile)                                        | ðŸŸ¢ Low    |

---

## 2. ðŸ” Login Pages (`/login`, `/captain/login`, etc.)

| #   | Status | Issue                                                                                                                        | Severity    |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2.1 | âŒ     | All role login pages are **identical in styling** â€” no visual role differentiation (Captain = orange, Kitchen = red, etc.) | ðŸŸ¡ Medium |
| 2.2 | âœ…    | **Role selector dropdown** on `/login` is confusing UX â€” user shouldn't have to pick their own role                        | ðŸ”´ High   |
| 2.3 | âŒ     | Password field shows raw error text below â€” no inline **field highlight animation** on error                               | ðŸŸ¢ Low    |
| 2.4 | âŒ     | **No "remember me"** or session persistence hint shown to mobile staff                                                       | ðŸŸ¢ Low    |
| 2.5 | âŒ     | Login error message is generic â€” "Invalid email or password" â€” no distinction between wrong password vs account inactive | ðŸŸ¡ Medium |

---

## 3. ðŸŽ›ï¸ Admin Panel â€” Global

| #    | Status | Issue                                                                                            | Severity    |
| ---- | ------ | ------------------------------------------------------------------------------------------------ | ----------- |
| 3.1  | âœ…    | **Forms use DaisyUI `input-bordered`** â€” clunky, low-contrast labels, inconsistent focus rings | ðŸ”´ High   |
| 3.2  | âœ…    | `ModalShell` is a custom DIY modal â€” **no focus trap, no aria-modal**, accessibility failure   | ðŸ”´ High   |
| 3.3  | âœ…    | **Delete buttons fire immediately** â€” no confirmation dialog on any CRUD page                  | ðŸ”´ High   |
| 3.4  | âœ…    | `z-100` on `ModalShell` is not a standard Tailwind value â€” may silently break in some builds   | ðŸŸ¡ Medium |
| 3.5  | âŒ     | **No skeleton loaders** on Categories, Items, Staff, Locations pages â€” blank flash on load     | ðŸŸ¡ Medium |
| 3.6  | âœ…    | Admin sidebar has no **collapsed/mobile mode** â€” breaks completely on iPad-size screens        | ðŸ”´ High   |
| 3.7  | âŒ     | All CRUD pages use the same table + modal pattern but with **inconsistent spacing** between them | ðŸŸ¢ Low    |
| 3.8  | âŒ     | No **keyboard shortcut** to open "Add" modal (e.g. `N` key) on list pages                        | ðŸŸ¢ Low    |
| 3.9  | âŒ     | **No pagination** on Items/Orders â€” loads 200 records at once into the DOM                     | ðŸŸ¡ Medium |
| 3.10 | âŒ     | `PageHeader` has no **breadcrumb trail** â€” user loses context on nested admin pages            | ðŸŸ¡ Medium |

---

## 4. ðŸ“‹ Admin â€” Categories / Items / Staff / Locations (CRUD Forms)

| #   | Status | Issue                                                                                                                         | Severity    |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 4.1 | âœ…    | `FormField` wrapper uses DaisyUI `form-control` + `label` â€” **verbose, outdated styling** vs modern ShadCN form layout      | ðŸ”´ High   |
| 4.2 | âœ…    | `inputCls` / `selectCls` are string-concatenation helpers â€” **not composable**, hard to extend                              | ðŸŸ¡ Medium |
| 4.3 | âŒ     | Select dropdowns use native `<select>` â€” **no search/combobox** for categories on the Items form (broken at 20+ categories) | ðŸŸ¡ Medium |
| 4.4 | âœ…    | Items modal is `max-w-2xl` but opens on smaller screens without scroll â€” **overflow hidden cuts off footer buttons**        | ðŸ”´ High   |
| 4.5 | âŒ     | Sort Order field is a raw number input â€” **no drag-to-reorder** implemented despite `GripVertical` icon being rendered      | ðŸŸ¡ Medium |
| 4.6 | âŒ     | No **optimistic UI** on delete â€” spinner appears but list doesn't update until refetch completes                            | ðŸŸ¢ Low    |
| 4.7 | âŒ     | Modal title is plain text â€” no **icon + colour accent** to distinguish Add vs Edit mode                                     | ðŸŸ¢ Low    |

---

## 5. ðŸ“Š Admin Dashboard (`/admin/dashboard`)

| #   | Status | Issue                                                                                                    | Severity    |
| --- | ------ | -------------------------------------------------------------------------------------------------------- | ----------- |
| 5.1 | âŒ     | **Server component only** â€” stat cards never refresh without a full page reload                        | ðŸ”´ High   |
| 5.2 | âŒ     | Table status grid is static HTML â€” **no live polling** (Kitchen/Cashier poll, Admin dashboard doesn't) | ðŸ”´ High   |
| 5.3 | âŒ     | No **"Active Orders" live feed** with real-time KOT updates for the admin                                | ðŸŸ¡ Medium |
| 5.4 | âŒ     | Stat cards have no **trend indicator** (% change vs yesterday/last week)                                 | ðŸŸ¡ Medium |

---

## 6. ðŸ“ˆ Metrics Page (`/admin/metrics`)

| #   | Status | Issue                                                                                                | Severity    |
| --- | ------ | ---------------------------------------------------------------------------------------------------- | ----------- |
| 6.1 | âŒ     | Recharts tooltip background is **hardcoded `#1a1a1a`** â€” won't respect light theme if added later  | ðŸŸ¡ Medium |
| 6.2 | âŒ     | Area/Bar charts have **no empty-state illustration** when data arrays are empty (renders blank axes) | ðŸŸ¡ Medium |
| 6.3 | âŒ     | Only 3 preset range buttons (7/30/90 days) â€” **no custom date range picker**                       | ðŸŸ¡ Medium |
| 6.4 | âŒ     | Hourly heatmap shows `0:00`â€“`23:00` â€” should use `12 AM` / `1 PM` 12-hour format                 | ðŸŸ¢ Low    |
| 6.5 | âŒ     | Captain performance table has no **click-through** to a filtered orders view for that captain        | ðŸŸ¢ Low    |

---

## 7. ðŸ§‘â€ðŸ³ Captain App (`/captain`)

| #   | Status | Issue                                                                                      | Severity    |
| --- | ------ | ------------------------------------------------------------------------------------------ | ----------- |
| 7.1 | âŒ     | Order builder has no **item search/filter** â€” scrolling all items per category gets slow | ðŸŸ¡ Medium |
| 7.3 | âŒ     | Special instructions textarea is buried at the bottom â€” **low discoverability**          | ðŸŸ¢ Low    |
| 7.4 | âŒ     | Active orders list shows all orders â€” no **"my table only"** filter applied by default   | ðŸŸ¢ Low    |

---

## 8. ðŸ³ Kitchen Display (`/kitchen`)

| #   | Status | Issue                                                                                         | Severity    |
| --- | ------ | --------------------------------------------------------------------------------------------- | ----------- |
| 8.1 | âŒ     | KOT cards don't show **table number prominently** â€” it appears as small secondary text      | ðŸŸ¡ Medium |
| 8.2 | âŒ     | No **audio indicator** when a new KOT arrives on desktop (beyond the buzzer hook on the page) | ðŸŸ¡ Medium |
| 8.3 | âŒ     | "Mark all ready" button has **no visual confirmation** â€” fires immediately and silently     | ðŸŸ¡ Medium |

---

## 9. ðŸ’³ Cashier App (`/cashier`)

| #   | Status | Issue                                                                                        | Severity    |
| --- | ------ | -------------------------------------------------------------------------------------------- | ----------- |
| 9.1 | âŒ     | Payment modal has no **split-payment** support (cash + UPI partial)                          | ðŸŸ¡ Medium |
| 9.2 | âŒ     | No **receipt print preview** â€” `KOTBillPrint` exists but is triggered without preview step | ðŸŸ¡ Medium |
| 9.3 | âŒ     | Table status grid badges are **color-only** â€” no text fallback for colorblind users        | ðŸŸ¡ Medium |

---

## 10. ðŸ“ž Leads CRM (`/leads`)

| #    | Status | Issue                                                                                      | Severity    |
| ---- | ------ | ------------------------------------------------------------------------------------------ | ----------- |
| 10.1 | âŒ     | Lead pipeline kanban has no **drag-to-change-stage** support                               | ðŸŸ¡ Medium |
| 10.2 | âŒ     | Follow-up form uses raw `<input type="datetime-local">` â€” no **styled date-time picker** | ðŸŸ¡ Medium |
| 10.3 | âŒ     | No **lead detail slide-over panel** â€” clicking a lead navigates away from the pipeline   | ðŸŸ¡ Medium |

---

## 11. ðŸ§© ShadCN Migration Plan

ShadCN was listed in the original tech stack (`PLAN.md`) but was never installed. The admin panel forms and modals are the primary target â€” operational UIs (Captain, Kitchen, Cashier) are fine with DaisyUI as-is.

### Components Replaced

| Current (DaisyUI / Custom)       | Replace With (ShadCN)                   | Status | Fixes                                                |
| -------------------------------- | --------------------------------------- | ------ | ---------------------------------------------------- |
| `ModalShell` (custom DIY)        | `Dialog` (Base UI)                      | âœ…    | Focus trap, `aria-modal`, Escape key, backdrop click |
| `FormField` + `inputCls`         | `AdminFormField` + `Label`              | âœ…    | Consistent layout, ShadCN Label                      |
| `input input-bordered`           | `Input` (ShadCN)                        | âœ…    | Proper focus ring, theme-aware, `aria-invalid`       |
| `select select-bordered`         | Native `<select>` + ShadCN cn() classes | âœ…    | RHF-compatible, consistent styling                   |
| Delete buttons (no confirm)      | `DeleteConfirmDialog` (AlertDialog)     | âœ…    | Prevents accidental deletion                         |
| Admin sidebar (no mobile)        | `Sheet` for mobile drawer               | âŒ     | Responsive admin layout                              |
| Native `<select>` for categories | `Combobox` / `Command`                  | âŒ     | Searchable dropdown at scale                         |
| Date range preset buttons        | `DatePickerWithRange` (date-fns)        | âŒ     | Custom date filtering                                |
| Toast (sonner)                   | Keep sonner                             | âœ…    | Already good                                         |
| Badges, spinners, KDS board      | Keep DaisyUI                            | âœ…    | Operational UIs are fine                             |

### Files Modified

| File                                           | Status | Notes                                              |
| ---------------------------------------------- | ------ | -------------------------------------------------- |
| `src/components/ui/input.tsx`                  | âœ…    | ShadCN Input â€” Base UI primitive                 |
| `src/components/ui/textarea.tsx`               | âœ…    | ShadCN Textarea                                    |
| `src/components/ui/label.tsx`                  | âœ…    | ShadCN Label                                       |
| `src/components/ui/dialog.tsx`                 | âœ…    | ShadCN Dialog â€” replaces ModalShell internals    |
| `src/components/ui/alert-dialog.tsx`           | âœ…    | ShadCN AlertDialog â€” used by DeleteConfirmDialog |
| `src/components/ui/sheet.tsx`                  | âœ…    | Installed â€” pending sidebar mobile use           |
| `src/components/admin/AdminFormField.tsx`      | âœ…    | New shared form field wrapper                      |
| `src/components/admin/DeleteConfirmDialog.tsx` | âœ…    | New AlertDialog-based delete confirm               |
| `src/components/admin/ModalShell.tsx`          | âœ…    | Rewritten to wrap ShadCN Dialog                    |
| `src/app/admin/categories/page.tsx`            | âœ…    | Fully migrated â€” no errors                       |
| `src/app/admin/staff/page.tsx`                 | âœ…    | Fully migrated â€” no errors                       |
| `src/app/admin/items/page.tsx`                 | âœ…    | Fully migrated â€” no errors                       |
| `src/app/admin/locations/page.tsx`             | âœ…    | Fully migrated â€” no errors                       |
| `src/lib/utils.ts`                             | âœ…    | Added `formatPrice` utility                        |

### What DaisyUI Keeps

- All operational apps: Captain, Kitchen, Cashier
- Badges, loading spinners, `btn`, `alert`
- KDS board cards and status indicators
- Menu guest-facing UI

---

## 12. ðŸ—“ï¸ Recommended Fix Priority

| Priority               | Items                                                                                                                                    | Status   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **P0 â€” Do Now**      | 3.2 Modal focus trap (ShadCN Dialog), 3.3 Delete confirmation (AlertDialog), 4.4 Items modal scroll overflow, 5.1 Dashboard live refresh | âœ… Done |
| **P1 â€” This Sprint** | 3.1 + 4.1 ShadCN form migration, 3.6 Sidebar mobile mode (Sheet), 2.2 Remove role selector from login                                    | 1/3 âœ…  |
| **P2 â€” Next Sprint** | 4.3 Combobox for categories, 6.3 Custom date range picker, 7.1 Item search in captain app, 5.4 Dashboard trend indicators                | 0/4 âŒ   |
| **P3 â€” Polish**      | 1.1 Sticky category tabs, 6.4 12h hour format, 10.1 Drag kanban, 4.7 Modal icon accent                                                   | 0/4 âŒ   |
