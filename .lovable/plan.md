

## Plan: Dual Printer Support (A4 + 80mm Slip)

Add per-document-type defaults so each printable view automatically uses the right paper size, with an option to override at print time. Uses standard browser print dialog — user picks the physical printer in the OS dialog.

### Architecture

1. **Extend `printUtils.ts`** with a `PaperSize` type (`"A4" | "slip80"`) and inject conditional `@page` + body styles:
   - **A4**: current layout (210mm, 10mm margins, 11px font)
   - **Slip 80mm**: `@page { size: 80mm auto; margin: 3mm }`, narrower body, 10px font, single-column rows, no zebra stripes, header/totals stacked vertically (no side-by-side tables), thinner borders, optional dashed dividers between rows for thermal aesthetic.

2. **Create `src/utils/printPreferences.ts`** — small localStorage-backed store:
   ```ts
   getPrintDefault(docType): "A4" | "slip80"
   setPrintDefault(docType, size)
   ```
   Doc types: `invoice`, `paymentReceipt`, `recoveryList`, `clientHistory`, `cheques`, `returns`.

3. **Settings page → new "Printing" section**: a Select per document type (A4 / Slip 80mm) so the shop can configure once. Defaults: invoice & paymentReceipt → `slip80`; everything else → `A4`.

4. **Print trigger UX** — wherever a Print button exists today, replace single button with a small split-button:
   - Main click → uses saved default for that doc type
   - Dropdown caret → "Print A4" / "Print Slip" one-time override
   
   New shared component: `src/components/common/PrintButton.tsx`.

5. **Refactor existing print call sites** to pass `paperSize` through:
   - `Invoices.tsx`, `NewInvoice.tsx`, `InvoiceViewDialog.tsx` (invoice template gets a slip variant — single-column items list, total at bottom, "THANK YOU" footer)
   - `Recovery.tsx`, `CityRecovery.tsx` (recovery list — slip variant truncates to client + amount columns)
   - `Clients.tsx` (client history — slip variant)
   - `Payments.tsx` if it has print, plus a new payment receipt slip when recording payment
   - `Cheques.tsx`, `Returns.tsx`

6. **Slip-specific invoice template**: company header stacked, items list as `Article × Qty = Amount` rows, totals block, balance due highlighted, no borders on item rows (just dashed separators), auto-height page so thermal printer cuts correctly.

### Technical Notes

- Browser `window.print()` honors `@page size: 80mm auto` on Chrome/Edge; user selects the thermal printer in the OS dialog (it will then print at 80mm). User can mark thermal printer as default in Windows for one-click flow.
- We keep `<script>window.print()</script>` auto-trigger so flow stays one-click.
- No new dependencies, no native APIs — fully PWA-compatible.

### Files Touched
- `src/utils/printUtils.ts` (extend with paper size variants)
- `src/utils/printPreferences.ts` (new)
- `src/components/common/PrintButton.tsx` (new)
- `src/pages/Settings.tsx` (add Printing section)
- `src/pages/Invoices.tsx`, `src/pages/NewInvoice.tsx`, `src/pages/Recovery.tsx`, `src/pages/CityRecovery.tsx`, `src/pages/Clients.tsx`, `src/pages/Payments.tsx`, `src/pages/Cheques.tsx`, `src/pages/Returns.tsx`
- `src/components/dashboard/InvoiceViewDialog.tsx`
- `DOCUMENTATION.md` (document dual-printer setup)

