

## Plan: Client Editing, Recovery UX, Stock Consistency, and Price Check Sizing

### 1. Enable Phone & Email Editing in Client Edit

Currently, the "Edit" dropdown menu item in Clients page has no handler — it doesn't open any dialog. Need to:
- Add an **edit client dialog** (reuse the Add Client form structure) pre-populated with current client data
- Make **phone** and **email** fields editable in this dialog
- Wire the Edit dropdown items (both card and table views) to open this dialog
- Submit updates to the `clients` table via Supabase

### 2. Add Recovery Dialog — City vs Individual Toggle

In `Clients.tsx`, the "Add Recovery" dialog currently only supports individual recovery. Changes:
- Add a **toggle button group** (segmented control) at the top of the dialog: "Individual" | "City Recovery"
- **Individual** (default): Keep current behavior — amount + notes, inserts into `recoveries` with `type: 'client'`
- **City Recovery**: When selected, the recovery will:
  1. Create/update a city recovery record for today's date for the client's city
  2. Add this client's amount to the `recovery_client_amounts` table
  3. Reuse the existing city recovery flow from `Recovery.tsx`
- Mobile-optimize the dialog to fit screen width (use `max-w-full` on mobile, proper padding)

### 3. Fix Stock Pairs Inconsistency (Inventory vs Invoice)

The inventory page calculates "Total Pairs" from `sizeBundles.reduce(qty * pairsPerBundle)` while also maintaining a legacy `stock_dozens * pairs_per_dozen` field. The invoice page uses `sb.quantity` (bundle count) as `available_quantity`.

**Root cause**: The `stock_dozens` field can drift from the actual sum of size bundle quantities. Fix:
- In Inventory display, always compute total pairs from **size bundles** (already done in card/table views)
- Ensure the `getStockStatus` function also uses size-bundle-derived totals instead of `stockDozens * pairsPerDozen`
- Verify invoice page reads the same `product_size_bundles.quantity` field

### 4. Price Check — Larger Size Cards

In `PriceCheck.tsx`:
- Increase size card padding from `p-3` to `p-4`
- Increase size range text from `text-xs` to `text-sm font-medium`
- Increase price text from `text-lg` to `text-xl` or `text-2xl`
- Increase stock text size from `text-xs` to `text-sm`

### 5. Mobile UX for Recovery Dialog

- Set dialog to `max-w-[95vw]` on mobile
- Stack the toggle and form fields vertically
- Ensure balance preview and action buttons are visible without scrolling

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Clients.tsx` | Add edit dialog with phone/email editing; add city/individual toggle to recovery dialog; mobile-optimize dialogs |
| `src/pages/PriceCheck.tsx` | Increase size card dimensions and text sizes |
| `src/pages/Inventory.tsx` | Fix `getStockStatus` to use size-bundle totals instead of `stockDozens * pairsPerDozen` |

