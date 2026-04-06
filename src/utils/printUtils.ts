import { format } from "date-fns";

interface PrintPageOptions {
  title: string;
  subtitle?: string;
  tableHtml: string;
  totalsHtml?: string;
  extraStyles?: string;
}

export function generateBrandedPrintPage({
  title,
  subtitle,
  tableHtml,
  totalsHtml,
  extraStyles = "",
}: PrintPageOptions): string {
  const today = format(new Date(), "dd MMM yyyy");
  const sub = subtitle ? `<div class="subtitle">${subtitle} — ${today}</div>` : `<div class="subtitle">${today}</div>`;

  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a1a; }

  .header { text-align: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 2px solid #d4a574; }
  .company-name { font-size: 26px; font-weight: 700; color: #4a3728; letter-spacing: 1px; margin-bottom: 2px; }
  .company-tagline { font-size: 11px; color: #8b7355; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .company-address { font-size: 11px; color: #666; }
  .company-phone { font-size: 11px; color: #666; margin-top: 2px; }

  .doc-title { text-align: center; font-size: 18px; font-weight: 600; margin: 14px 0 2px; color: #333; }
  .subtitle { text-align: center; font-size: 12px; color: #777; margin-bottom: 14px; }

  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { background-color: #f5f0eb; color: #4a3728; font-weight: 600; padding: 8px 6px; text-align: left; border: 1px solid #d4c4b0; }
  td { padding: 7px 6px; border: 1px solid #e0d6cc; text-align: left; }
  tbody tr:nth-child(even) { background-color: #faf8f5; }

  .totals-row { font-weight: 700; background-color: #f5f0eb !important; }
  .totals-section { margin-top: 12px; text-align: right; font-size: 13px; }
  .totals-section span { font-weight: 700; color: #4a3728; }

  .pending { color: #dc2626; font-weight: 700; }
  .recovery-input { width: 100%; border: none; border-bottom: 1px solid #999; padding: 5px 0; min-height: 20px; }
  .amount-col { width: 140px; }
  .recovery { color: #16a34a; }
  .bill { color: #333; }

  @media print { button, .no-print { display: none; } }
  ${extraStyles}
</style></head><body>
  <div class="header">
    <div class="company-name">SHAMSHAD FOOTWEAR</div>
    <div class="company-tagline">Wholesale Supplier</div>
    <div class="company-address">Faisalabad Road, Chowk Azam, Layyah</div>
    <div class="company-phone">0315-7162093 | 0305-5388093</div>
  </div>
  <div class="doc-title">${title}</div>
  ${sub}
  ${tableHtml}
  ${totalsHtml || ""}
  <script>window.print();</script>
</body></html>`;
}

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
