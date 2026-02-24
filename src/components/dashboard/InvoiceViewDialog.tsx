import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";

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
  } | null;
  onPrint: () => void;
}

export function InvoiceViewDialog({ open, onOpenChange, invoice, onPrint }: InvoiceViewDialogProps) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoice.invoice_number}</span>
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex justify-between border-b pb-4">
            <div>
              <p className="text-sm text-muted-foreground">Bill To:</p>
              <p className="font-semibold">{invoice.client_name}</p>
              <p className="text-sm text-muted-foreground">{invoice.client_city}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date:</p>
              <p className="font-medium">{format(new Date(invoice.created_at), "dd MMM yyyy")}</p>
              <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full capitalize ${
                invoice.status === 'paid' ? 'bg-success/10 text-success' :
                invoice.status === 'pending' ? 'bg-warning/10 text-warning' :
                invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                {invoice.status}
              </span>
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
              <div className="flex justify-between text-blue-600">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
