import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface InvoiceItem {
  id: string;
  product_name: string;
  article_number: string;
  size_range: string;
  quantity: number;
  total_pairs: number;
  price_per_pair: number;
  discount_per_pair: number;
  total: number;
}

interface ReturnInfo {
  id: string;
  return_number: string;
  total_amount: number;
  adjustment_type: string;
  created_at: string;
  items: { product_name: string; size_range: string; pairs_returned: number; total: number }[];
}

interface InvoiceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    created_at: string;
    client_name: string;
    client_city: string;
    subtotal: number;
    total_discount: number;
    tax: number;
    total: number;
    amount_received: number;
    balance_due: number;
    total_bundles: number;
    credit_applied?: number;
    status: string;
    payment_method?: string;
    account_name?: string;
    items: InvoiceItem[];
    returns?: ReturnInfo[];
  } | null;
  onPrint?: () => void;
}

export function InvoiceViewDialog({ open, onOpenChange, invoice, onPrint }: InvoiceViewDialogProps) {
  if (!invoice) return null;

  const hasReturns = invoice.returns && invoice.returns.length > 0;
  const totalReturned = invoice.returns?.reduce((sum, r) => sum + r.total_amount, 0) || 0;
  const isFullyReturned = totalReturned >= invoice.total;
  const paymentMethodLabel = invoice.payment_method === "account"
    ? `Account (${invoice.account_name || "N/A"})`
    : "Cash";

  const handlePrint = () => {
    const hasDiscount = invoice.items.some(i => i.discount_per_pair > 0);
    const returnsHtml = hasReturns ? `
      <div style="margin-top:8px;border-top:1px solid #ddd;padding-top:6px;">
        <h4 style="font-size:11px;margin:0 0 4px;">Returns (${invoice.returns!.length})</h4>
        ${invoice.returns!.map(ret => `
          <div style="background:#f9f9f9;border-radius:4px;padding:4px 6px;margin-bottom:4px;font-size:10px;">
            <div style="display:flex;justify-content:space-between;">
              <span><strong>${ret.return_number}</strong> <small style="background:#eee;padding:1px 4px;border-radius:8px">${ret.adjustment_type.replace('_',' ')}</small></span>
              <span style="color:#dc2626;font-weight:600">Rs ${ret.total_amount.toLocaleString()} — ${format(new Date(ret.created_at), "dd MMM yyyy")}</span>
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const printContent = `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoice_number}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 8px; color: #1a1a1a; font-size: 11px; }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #F0E8D8; border-radius: 6px; margin-bottom: 6px; }
        .header h2 { font-size: 16px; margin: 0; color: #3D3D3D; }
        .header .tagline { font-size: 8px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-top: 1px; }
        .header .contact { font-size: 9px; color: #666; margin-top: 2px; }
        .header .right { text-align: right; font-size: 11px; color: #666; }
        .header .right p { margin: 1px 0; }
        .client-row { display: flex; justify-content: space-between; margin-bottom: 6px; padding: 4px 0; }
        .client-row .label { font-size: 9px; color: #888; }
        table { width: 100%; border-collapse: collapse; margin: 4px 0; page-break-inside: auto; }
        tr { page-break-inside: avoid; }
        th { background: #f5f0eb; color: #4a3728; font-weight: 600; padding: 3px 4px; text-align: left; border: 1px solid #d4c4b0; font-size: 10px; }
        td { padding: 2px 4px; border: 1px solid #e0d6cc; font-size: 10px; }
        tbody tr:nth-child(even) { background: #faf8f5; }
        .totals { text-align: right; margin-top: 4px; font-size: 11px; }
        .totals p { margin: 2px 0; }
        .total-final { font-size: 13px; font-weight: bold; border-top: 2px solid #3D3D3D; padding-top: 4px; margin-top: 4px; }
        .footer { margin-top: 10px; padding: 6px; background: #F0E8D8; border-radius: 6px; text-align: center; font-size: 9px; color: #666; page-break-inside: avoid; }
        @media print { body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
        <div class="header">
          <div>
            <h2>Shamshad Footwear</h2>
            <div class="tagline">Wholesale Supplier</div>
            <div class="contact">0315-7162093 | 0305-5388093</div>
            <div class="contact">Faisalabad Road, Chowk Azam, Layyah</div>
          </div>
          <div class="right">
            <p><strong>${invoice.invoice_number}</strong></p>
            <p>${format(new Date(invoice.created_at), "dd MMM yyyy, hh:mm a")}</p>
          </div>
        </div>
        <div class="client-row">
          <div><span class="label">Bill To:</span><br/><strong>${invoice.client_name}</strong> ${invoice.client_city ? `— ${invoice.client_city}` : ""}</div>
          <div style="text-align:right"><span class="label">Payment:</span><br/>${paymentMethodLabel}</div>
        </div>
        <p style="font-size:10px;margin-bottom:2px"><strong>Items (${invoice.items.length})</strong> — ${invoice.total_bundles} bundles • ${invoice.items.reduce((s, i) => s + i.total_pairs, 0)} pairs</p>
        <table><thead><tr>
          <th>#</th><th>Product / Article</th><th>Size</th><th>Qty</th><th>Pairs</th><th>Rate</th>${hasDiscount ? '<th>Disc</th>' : ''}<th>Total</th>
        </tr></thead><tbody>
          ${invoice.items.map((item, idx) => `<tr>
            <td>${idx + 1}</td><td>${item.product_name}<br/><small style="color:#888">${item.article_number}</small></td>
            <td>${item.size_range}</td><td>${item.quantity}</td><td>${item.total_pairs}</td>
            <td>${item.price_per_pair}</td>${hasDiscount ? `<td>${item.discount_per_pair}</td>` : ''}<td><strong>${item.total.toLocaleString()}</strong></td>
          </tr>`).join('')}
        </tbody></table>
        <div class="totals">
          <p>Subtotal: Rs ${invoice.subtotal.toLocaleString()}</p>
          ${invoice.total_discount > 0 ? `<p>Discount: - Rs ${invoice.total_discount.toLocaleString()}</p>` : ''}
          ${invoice.tax > 0 ? `<p>Tax: Rs ${invoice.tax.toLocaleString()}</p>` : ''}
          <p class="total-final">Total: Rs ${invoice.total.toLocaleString()}</p>
          ${(invoice.credit_applied ?? 0) <= 0 && invoice.amount_received > 0 ? `<p style="color:green">Received: Rs ${invoice.amount_received.toLocaleString()} (${paymentMethodLabel})</p>` : ''}
          ${(invoice.credit_applied ?? 0) > 0 ? `<p>Credit Applied: Rs ${(invoice.credit_applied ?? 0).toLocaleString()}</p>` : ''}
          ${invoice.balance_due > 0 ? `<p style="color:#d97706;font-weight:600">Balance Due: Rs ${invoice.balance_due.toLocaleString()}</p>` : ''}
        </div>
        ${returnsHtml}
        <div class="footer">Goods once sold will not be returned without prior agreement.</div>
      </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => { printWindow.print(); }, 300);
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Invoice {invoice.invoice_number}</span>
              {hasReturns && (
                <Badge variant={isFullyReturned ? "destructive" : "secondary"} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {isFullyReturned ? "Fully Returned" : "Partial Return"}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Branded Header */}
          <div className="rounded-xl p-5 border border-border" style={{ background: 'hsl(40 30% 95%)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Shamshad Footwear" className="w-14 h-14 object-contain" />
                <div>
                  <h3 className="font-bold text-lg text-foreground">Shamshad Footwear</h3>
                  <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Wholesale Supplier</p>
                  <p className="text-xs text-muted-foreground mt-1">0315-7162093 | 0305-5388093</p>
                  <p className="text-xs text-muted-foreground">Faisalabad Road, Chowk Azam, Layyah</p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Invoice #{invoice.invoice_number}</p>
                <p>{format(new Date(invoice.created_at), "dd MMM yyyy, hh:mm a")}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bill To:</p>
                <p className="font-semibold">{invoice.client_name}</p>
                <p className="text-sm text-muted-foreground">{invoice.client_city}</p>
              </div>
              <div className="text-right space-y-1">
                <span className={`inline-block px-2 py-1 text-xs rounded-full capitalize ${
                  invoice.status === 'paid' ? 'bg-success/10 text-success' :
                  invoice.status === 'pending' ? 'bg-warning/10 text-warning' :
                  invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {invoice.status}
                </span>
                <p className="text-xs text-muted-foreground capitalize">Via: {paymentMethodLabel}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Items ({invoice.items.length})</p>
            <p className="text-sm font-semibold">{invoice.total_bundles} bundles • {invoice.items.reduce((sum, i) => sum + i.total_pairs, 0)} pairs</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">Size</th>
                  <th className="text-right py-2">Bundles</th>
                  <th className="text-right py-2">Pairs</th>
                  <th className="text-right py-2">Rate (Rs)</th>
                  {invoice.total_discount > 0 && <th className="text-right py-2">Discount (Rs)</th>}
                  <th className="text-right py-2">Total (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.article_number}</p>
                    </td>
                    <td className="py-2">{item.size_range}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{item.total_pairs}</td>
                    <td className="py-2 text-right">{item.price_per_pair}</td>
                    {invoice.total_discount > 0 && <td className="py-2 text-right">{item.discount_per_pair}</td>}
                    <td className="py-2 text-right font-medium">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>Rs {invoice.subtotal.toLocaleString()}</span>
            </div>
            {invoice.total_discount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount:</span>
                <span>- Rs {invoice.total_discount.toLocaleString()}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>Rs {invoice.tax.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>Rs {invoice.total.toLocaleString()}</span>
            </div>
            {(invoice.credit_applied ?? 0) <= 0 && invoice.amount_received > 0 && (
              <div className="flex justify-between text-success">
                <span>Received ({paymentMethodLabel}):</span>
                <span>Rs {invoice.amount_received.toLocaleString()}</span>
              </div>
            )}
            {(invoice.credit_applied ?? 0) > 0 && (
              <div className="flex justify-between text-primary">
                <span>Credit Applied:</span>
                <span>Rs {(invoice.credit_applied ?? 0).toLocaleString()}</span>
              </div>
            )}
            {invoice.balance_due > 0 && (
              <div className="flex justify-between text-warning font-medium">
                <span>Balance Due:</span>
                <span>Rs {invoice.balance_due.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Returns Section */}
          {hasReturns && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-destructive" />
                Returns ({invoice.returns!.length})
              </h4>
              {invoice.returns!.map((ret) => (
                <div key={ret.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ret.return_number}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ret.adjustment_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-destructive">Rs {ret.total_amount.toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">{format(new Date(ret.created_at), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  {ret.items.length > 0 && (
                    <div className="space-y-1">
                      {ret.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.product_name} ({item.size_range}) × {item.pairs_returned} pairs</span>
                          <span>Rs {item.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center mt-6 italic">
            Goods once sold will not be returned without prior agreement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}