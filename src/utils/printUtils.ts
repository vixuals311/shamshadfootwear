import { format } from "date-fns";

export type PaperSize = "A4" | "slip80";

interface PrintPageOptions {
  title: string;
  subtitle?: string;
  tableHtml: string;
  totalsHtml?: string;
  extraStyles?: string;
  paperSize?: PaperSize;
}

export function generateBrandedPrintPage({
  title,
  subtitle,
  tableHtml,
  totalsHtml,
  extraStyles = "",
  paperSize = "A4",
}: PrintPageOptions): string {
  const today = format(new Date(), "dd MMM yyyy");
  const sub = subtitle ? `<div class="subtitle">${subtitle} — ${today}</div>` : `<div class="subtitle">${today}</div>`;

  const isSlip = paperSize === "slip80";
  const sizeStyles = isSlip ? slipStyles : a4Styles;

  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  ${sizeStyles}
  @media print { button, .no-print { display: none; } }
  ${extraStyles}
</style></head><body>
  <div class="header">
    <div class="company-name">BILAL TRADERS</div>
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

/**
 * Build a self-contained HTML page for a payment / recovery receipt.
 * Renders nicely on both 80mm thermal slips and full A4 sheets.
 */
export function generatePaymentReceiptHTML(opts: {
  receiptNo?: string;
  clientName: string;
  amount: number;
  account?: string | null;
  notes?: string | null;
  date?: Date;
  paperSize?: PaperSize;
  previousBalance?: number;
}): string {
  const {
    receiptNo,
    clientName,
    amount,
    account,
    notes,
    date = new Date(),
    paperSize = "A4",
    previousBalance,
  } = opts;

  const isSlip = paperSize === "slip80";
  const styles = isSlip
    ? `@page { size: 80mm auto; margin: 3mm; }
       * { box-sizing: border-box; margin: 0; padding: 0; }
       body { font-family: Arial, sans-serif; padding: 2mm; width: 74mm; font-size: 11px; color: #000; }
       .header { text-align: center; padding-bottom: 4px; border-bottom: 1px dashed #000; margin-bottom: 6px; }
       .header .biz { font-weight: 700; font-size: 13px; }
       .header .tag { font-size: 9px; }
       .doc-title { text-align: center; font-weight: 700; font-size: 13px; margin: 4px 0; }
       .row { display: flex; justify-content: space-between; margin: 2px 0; }
       .row .label { color: #333; }
       .amount-box { text-align: center; border: 2px solid #000; padding: 6px; margin: 6px 0; font-size: 16px; font-weight: 700; }
       .footer { text-align: center; margin-top: 8px; padding-top: 4px; border-top: 1px dashed #000; font-size: 9px; }
       @media print { button { display: none; } }`
    : `@page { size: A4; margin: 15mm; }
       * { box-sizing: border-box; margin: 0; padding: 0; }
       body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 700px; margin: 0 auto; color: #1a1a1a; }
       .header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #333; margin-bottom: 20px; }
       .header .biz { font-weight: 700; font-size: 22px; }
       .header .tag { font-size: 12px; color: #555; }
       .doc-title { text-align: center; font-size: 18px; font-weight: 700; margin: 14px 0; letter-spacing: 1px; }
       .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
       .row .label { color: #555; }
       .amount-box { text-align: center; border: 2px solid #333; padding: 18px; margin: 18px 0; font-size: 22px; font-weight: 700; }
       .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px dashed #999; font-size: 11px; color: #666; }
       @media print { button { display: none; } }`;

  return `<!DOCTYPE html><html><head><title>Receipt ${receiptNo || ""}</title>
<style>${styles}</style></head><body>
  <div class="header">
    <div class="biz">BILAL TRADERS</div>
    <div class="tag">Wholesale Supplier</div>
    <div class="tag">Faisalabad Road, Chowk Azam, Layyah</div>
    <div class="tag">0315-7162093 | 0305-5388093</div>
  </div>
  <div class="doc-title">PAYMENT RECEIPT</div>
  ${receiptNo ? `<div class="row"><span class="label">Receipt #</span><span>${receiptNo}</span></div>` : ""}
  <div class="row"><span class="label">Date</span><span>${format(date, "dd MMM yyyy, hh:mm a")}</span></div>
  <div class="row"><span class="label">Received From</span><span><strong>${clientName}</strong></span></div>
  ${account ? `<div class="row"><span class="label">Account</span><span>${account}</span></div>` : ""}
  <div class="amount-box">Rs ${amount.toLocaleString()}</div>
  ${
    typeof previousBalance === "number"
      ? `<div class="row"><span class="label">Previous Balance</span><span>Rs ${previousBalance.toLocaleString()}</span></div>
         <div class="row"><span class="label">Remaining Balance</span><span><strong>Rs ${(previousBalance - amount).toLocaleString()}</strong></span></div>`
      : ""
  }
  ${notes ? `<div class="row"><span class="label">Notes</span><span>${notes}</span></div>` : ""}
  <div class="footer">Thank you for your payment.</div>
  <script>window.print();</script>
</body></html>`;
}

const a4Styles = `
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; color: #1a1a1a; }

  .header { text-align: center; padding-bottom: 6px; margin-bottom: 8px; border-bottom: 2px solid #d4a574; }
  .company-name { font-size: 18px; font-weight: 700; color: #4a3728; letter-spacing: 1px; margin-bottom: 1px; }
  .company-tagline { font-size: 9px; color: #8b7355; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; }
  .company-address { font-size: 9px; color: #666; }
  .company-phone { font-size: 9px; color: #666; margin-top: 1px; }

  .doc-title { text-align: center; font-size: 14px; font-weight: 600; margin: 6px 0 1px; color: #333; }
  .subtitle { text-align: center; font-size: 10px; color: #777; margin-bottom: 6px; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
  th { background-color: #f5f0eb; color: #4a3728; font-weight: 600; padding: 4px 3px; text-align: left; border: 1px solid #d4c4b0; }
  td { padding: 3px 3px; border: 1px solid #e0d6cc; text-align: left; }
  tbody tr:nth-child(even) { background-color: #faf8f5; }

  .totals-row { font-weight: 700; background-color: #f5f0eb !important; }
  .totals-section { margin-top: 6px; text-align: right; font-size: 11px; }
  .totals-section span { font-weight: 700; color: #4a3728; }

  .pending { color: #dc2626; font-weight: 700; }
  .recovery-input { width: 100%; border: none; border-bottom: 1px solid #999; padding: 3px 0; min-height: 16px; }
  .amount-col { width: 120px; }
  .recovery { color: #16a34a; }
  .bill { color: #333; }
  .paid-col { color: #16a34a; }
  .due-col { color: #dc2626; font-weight: 600; }
`;

const slipStyles = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 2mm; color: #000; font-size: 10px; width: 74mm; }

  .header { text-align: center; padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px dashed #000; }
  .company-name { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
  .company-tagline { font-size: 8px; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }
  .company-address { font-size: 8px; margin-top: 2px; }
  .company-phone { font-size: 8px; }

  .doc-title { text-align: center; font-size: 11px; font-weight: 700; margin: 4px 0 1px; text-transform: uppercase; }
  .subtitle { text-align: center; font-size: 9px; margin-bottom: 4px; }

  table { width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 9px; }
  th { font-weight: 700; padding: 2px 1px; text-align: left; border-bottom: 1px solid #000; border-top: 1px solid #000; }
  td { padding: 2px 1px; border-bottom: 1px dashed #ccc; text-align: left; vertical-align: top; }
  tbody tr:last-child td { border-bottom: 1px solid #000; }

  .totals-row { font-weight: 700; }
  .totals-section { margin-top: 4px; text-align: right; font-size: 10px; }
  .totals-section span { font-weight: 700; }

  .pending { font-weight: 700; }
  .recovery-input { width: 100%; border: none; border-bottom: 1px dashed #000; padding: 2px 0; min-height: 14px; }
  .amount-col { width: auto; }
  .recovery, .bill, .paid-col, .due-col { color: #000; }
  .due-col { font-weight: 700; }

  /* Hide non-essential columns on slip */
  .slip-hide { display: none !important; }
`;
