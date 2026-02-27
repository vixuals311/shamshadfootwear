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
    items: InvoiceItem[];
    returns?: ReturnInfo[];
  } | null;
  onPrint: () => void;
}

export function InvoiceViewDialog({ open, onOpenChange, invoice, onPrint }: InvoiceViewDialogProps) {
  if (!invoice) return null;

  const hasReturns = invoice.returns && invoice.returns.length > 0;
  const totalReturned = invoice.returns?.reduce((sum, r) => sum + r.total_amount, 0) || 0;
  const isFullyReturned = totalReturned >= invoice.total;

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
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-2">
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
                <p>{format(new Date(invoice.created_at), "dd MMM yyyy")}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bill To:</p>
                <p className="font-semibold">{invoice.client_name}</p>
                <p className="text-sm text-muted-foreground">{invoice.client_city}</p>
              </div>
              <div className="text-right">
              <span className={`inline-block px-2 py-1 text-xs rounded-full capitalize ${
                invoice.status === 'paid' ? 'bg-success/10 text-success' :
                invoice.status === 'pending' ? 'bg-warning/10 text-warning' :
                invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                {invoice.status}
              </span>
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
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Discount</th>
                  <th className="text-right py-2">Total</th>
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
                    <td className="py-2 text-right">Rs {item.price_per_pair}</td>
                    <td className="py-2 text-right">Rs {item.discount_per_pair}</td>
                    <td className="py-2 text-right font-medium">Rs {item.total.toLocaleString()}</td>
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
            {invoice.amount_received > 0 && (
              <div className="flex justify-between text-success">
                <span>Received:</span>
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

          {/* Branded Footer */}
          <div className="rounded-xl p-4 text-center border border-border" style={{ background: 'hsl(40 30% 95%)' }}>
            <p className="text-xs text-muted-foreground">Thank you for your business!</p>
            <p className="text-xs font-semibold text-foreground mt-1">Shamshad Footwear — Wholesale Supplier</p>
            <p className="text-[10px] text-muted-foreground mt-1">0315-7162093 | 0305-5388093 | Faisalabad Road, Chowk Azam, Layyah</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Goods once sold will not be returned without prior agreement. All disputes subject to local jurisdiction.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
