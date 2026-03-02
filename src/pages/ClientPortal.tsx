import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  FileText,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Eye,
  Lock,
  Loader2,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  opening_balance: number;
  current_balance: number;
  total_spent: number;
  invoice_count: number;
  portal_pin: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  total_discount: number;
  tax: number;
  total: number;
  status: string;
  created_at: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  product_name: string;
  brand_name: string | null;
  size_range: string;
  total_pairs: number;
  quantity: number;
  price_per_pair: number;
  discount_per_pair: number;
  total: number;
}

interface Recovery {
  id: string;
  amount: number;
  date: string;
  type: string;
  notes: string | null;
}

interface ManualBill {
  id: string;
  bill_number: string;
  amount: number;
  date: string;
  status: string;
  notes: string | null;
}

const formatPhoneNumber = (value: string) => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Format as 0XXX-XXXXXXX
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
};

const ClientPortal = () => {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [manualBills, setManualBills] = useState<ManualBill[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginPhone) {
      setLoginError("Please enter your phone number.");
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      const { data, error } = await supabase.functions.invoke("client-portal-login", {
        body: { phone: loginPhone, pin: loginPin },
      });

      if (error) throw error;

      if (data?.error) {
        setLoginError(data.error);
        return;
      }

      setCurrentClient(data.client);
      setInvoices(
        (data.invoices || []).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          subtotal: inv.subtotal,
          total_discount: inv.total_discount,
          tax: inv.tax,
          total: inv.total,
          status: inv.status,
          created_at: inv.created_at,
          items: inv.invoice_items || [],
        }))
      );

      const directRecoveries: Recovery[] = (data.directRecoveries || []).map((r: any) => ({
        id: r.id, amount: r.amount, date: r.date, type: r.type, notes: r.notes,
      }));
      const cityRecoveries: Recovery[] = (data.cityAmounts || [])
        .filter((ca: any) => ca.recoveries)
        .map((ca: any) => ({
          id: ca.recoveries.id, amount: ca.amount, date: ca.recoveries.date, type: "city", notes: ca.recoveries.notes,
        }));
      setRecoveries([...directRecoveries, ...cityRecoveries]);
      setManualBills(data.manualBills || []);

      setIsLoggedIn(true);
      setLoginError("");
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentClient(null);
    setLoginPhone("");
    setLoginPin("");
    setInvoices([]);
    setRecoveries([]);
    setManualBills([]);
  };

  // Data is now fetched at login time via edge function

  // Login Screen
  if (!isLoggedIn || !currentClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Client Portal</h1>
              <p className="text-muted-foreground mt-2">
                View your bills and payment history
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(formatPhoneNumber(e.target.value))}
                    placeholder="0XXX-XXXXXXX"
                    className="pl-10"
                    disabled={loading}
                    maxLength={12}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN (if set)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="Enter PIN"
                    className="pl-10"
                    disabled={loading}
                    maxLength={6}
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}

              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Access My Account
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Use the phone number registered with your account
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{currentClient.name}</h1>
            <p className="text-sm text-muted-foreground">{currentClient.city}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Account Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="bg-card rounded-xl p-4 shadow-card">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-xl font-bold text-primary">
                  Rs {currentClient.current_balance.toLocaleString()}
                </p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card">
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-xl font-bold">
                  Rs {currentClient.opening_balance.toLocaleString()}
                </p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold text-success">
                  Rs {currentClient.total_spent.toLocaleString()}
                </p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-card">
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold">{currentClient.invoice_count}</p>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <h3 className="font-semibold mb-3">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{currentClient.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{currentClient.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{currentClient.address || "-"}</span>
                </div>
              </div>
            </motion.div>

            {/* Bills & Recoveries */}
            <Tabs defaultValue="bills" className="w-full">
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="bills" className="flex-1 gap-2">
                  <FileText className="w-4 h-4" />
                  Bills ({invoices.length})
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 gap-2">
                  <FileText className="w-4 h-4" />
                  Manual ({manualBills.length})
                </TabsTrigger>
                <TabsTrigger value="recoveries" className="flex-1 gap-2">
                  <CreditCard className="w-4 h-4" />
                  Recoveries ({recoveries.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bills" className="mt-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl shadow-card overflow-hidden"
                >
                  {invoices.length > 0 ? (
                    <div className="divide-y divide-border">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(invoice.created_at), "dd MMM yyyy, hh:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">
                                Rs {invoice.total.toLocaleString()}
                              </p>
                              <span
                                className={cn(
                                  "status-badge text-xs",
                                  invoice.status === "paid" && "status-badge-success",
                                  invoice.status === "partial" && "status-badge-warning",
                                  invoice.status === "overdue" && "status-badge-danger",
                                  invoice.status === "pending" && "status-badge-warning"
                                )}
                              >
                                {invoice.status}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        No bills yet
                      </h3>
                      <p className="text-muted-foreground">
                        Your purchase history will appear here.
                      </p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl shadow-card overflow-hidden"
                >
                  {manualBills.length > 0 ? (
                    <div className="divide-y divide-border">
                      {manualBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{bill.bill_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(bill.date), "dd MMM yyyy")}
                            </p>
                            {bill.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{bill.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              Rs {bill.amount.toLocaleString()}
                            </p>
                            <span
                              className={cn(
                                "status-badge text-xs",
                                bill.status === "paid" ? "status-badge-success" : "status-badge-warning"
                              )}
                            >
                              {bill.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        No manual bills
                      </h3>
                      <p className="text-muted-foreground">
                        Manual bills will appear here.
                      </p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="recoveries" className="mt-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl shadow-card overflow-hidden"
                >
                  {recoveries.length > 0 ? (
                    <div className="divide-y divide-border">
                      {recoveries.map((recovery, index) => (
                        <div
                          key={`${recovery.id}-${index}`}
                          className="p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">
                              Rs {recovery.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(recovery.date), "dd MMM yyyy")}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "status-badge",
                              recovery.type === "city"
                                ? "status-badge-warning"
                                : "status-badge-success"
                            )}
                          >
                            {recovery.type === "city" ? "City Recovery" : "Individual"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        No recoveries yet
                      </h3>
                      <p className="text-muted-foreground">
                        Your payment history will appear here.
                      </p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Invoice Detail Dialog - Branded like main invoice view */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice {selectedInvoice?.invoice_number}</span>
              {selectedInvoice && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  if (!selectedInvoice || !currentClient) return;
                  const logoUrl = window.location.origin + '/favicon.png';
                  const printContent = `
                    <!DOCTYPE html>
                    <html><head><title>Invoice ${selectedInvoice.invoice_number}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #3D3D3D; }
                      .brand-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 20px; background: #F0E8D8; border-radius: 12px; }
                      .brand-left { display: flex; align-items: center; gap: 14px; }
                      .brand-left img { width: 56px; height: 56px; object-fit: contain; }
                      .brand-left h2 { margin: 0; font-size: 18px; }
                      .brand-left p { margin: 2px 0 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #888; }
                      .brand-left .contact { font-size: 11px; letter-spacing: 0; text-transform: none; color: #666; margin-top: 4px; }
                      .brand-right { text-align: right; font-size: 13px; color: #666; }
                      .client-info { margin-bottom: 20px; }
                      .client-info .label { font-size: 11px; color: #888; }
                      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                      th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                      th { background: #F0E8D8; }
                      .totals { text-align: right; margin-top: 20px; }
                      .totals p { margin: 5px 0; }
                      .total-final { font-size: 1.2em; font-weight: bold; border-top: 2px solid #3D3D3D; padding-top: 10px; margin-top: 10px; }
                      .brand-footer { margin-top: 40px; padding: 16px; background: #F0E8D8; border-radius: 12px; text-align: center; }
                      .brand-footer p { margin: 4px 0; font-size: 11px; color: #666; }
                      .brand-footer .company { font-weight: bold; color: #3D3D3D; font-size: 12px; }
                      @media print { body { padding: 0; } }
                    </style></head><body>
                    <div class="brand-header">
                      <div class="brand-left">
                        <img src="${logoUrl}" alt="Shamshad Footwear" />
                        <div>
                          <h2>Shamshad Footwear</h2>
                          <p>Wholesale Supplier</p>
                          <p class="contact">0315-7162093 | 0305-5388093</p>
                          <p class="contact">Faisalabad Road, Chowk Azam, Layyah</p>
                        </div>
                      </div>
                      <div class="brand-right">
                        <p><strong>${selectedInvoice.invoice_number}</strong></p>
                        <p>${format(new Date(selectedInvoice.created_at), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <div class="client-info">
                      <p class="label">Bill To:</p>
                      <p><strong>${currentClient.name}</strong></p>
                      <p>${currentClient.city || ""}</p>
                    </div>
                    <table><thead><tr><th>#</th><th>Product</th><th>Size</th><th>Pairs</th><th>Rate</th><th>Discount</th><th>Total</th></tr></thead>
                    <tbody>${selectedInvoice.items.map((item: any, idx: number) => `
                      <tr><td>${idx + 1}</td><td>${item.product_name}</td><td>${item.size_range}</td><td>${item.total_pairs}</td><td>Rs ${item.price_per_pair}</td><td>Rs ${item.discount_per_pair}</td><td>Rs ${item.total.toLocaleString()}</td></tr>
                    `).join("")}</tbody></table>
                    <div class="totals">
                      <p>Subtotal: Rs ${selectedInvoice.subtotal.toLocaleString()}</p>
                      ${selectedInvoice.total_discount > 0 ? `<p>Discount: - Rs ${selectedInvoice.total_discount.toLocaleString()}</p>` : ""}
                      <p class="total-final">Total: Rs ${selectedInvoice.total.toLocaleString()}</p>
                    </div>
                    <div class="brand-footer">
                      <p>Thank you for your business!</p>
                      <p class="company">Shamshad Footwear — Wholesale Supplier</p>
                      <p>0315-7162093 | 0305-5388093 | Faisalabad Road, Chowk Azam, Layyah</p>
                      <p>Goods once sold will not be returned without prior agreement.</p>
                    </div>
                    <script>window.print();</script>
                    </body></html>`;
                  const w = window.open("", "_blank");
                  if (w) { w.document.write(printContent); w.document.close(); }
                }}>
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Branded Header */}
              <div className="rounded-xl p-4 sm:p-5 border border-border" style={{ background: 'hsl(40 30% 95%)' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img src="/favicon.png" alt="Shamshad Footwear" className="w-10 h-10 sm:w-14 sm:h-14 object-contain" />
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground">Shamshad Footwear</h3>
                      <p className="text-[10px] sm:text-xs tracking-[0.2em] text-muted-foreground uppercase">Wholesale Supplier</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">0315-7162093 | 0305-5388093</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-sm text-muted-foreground">
                    <p>Invoice #{selectedInvoice.invoice_number}</p>
                    <p>{format(new Date(selectedInvoice.created_at), "dd MMM yyyy")}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Bill To:</p>
                    <p className="font-semibold">{currentClient.name}</p>
                    <p className="text-sm text-muted-foreground">{currentClient.city}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "inline-block px-2 py-1 text-xs rounded-full capitalize",
                      selectedInvoice.status === 'paid' ? 'bg-success/10 text-success' :
                      selectedInvoice.status === 'pending' ? 'bg-warning/10 text-warning' :
                      selectedInvoice.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="text-sm font-medium mb-2">Items ({selectedInvoice.items.length})</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">#</th>
                        <th className="text-left py-2">Product</th>
                        <th className="text-left py-2">Size</th>
                        <th className="text-right py-2">Pairs</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Disc.</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2">{idx + 1}</td>
                          <td className="py-2">
                            <p className="font-medium">{item.product_name}</p>
                            {item.brand_name && <p className="text-xs text-muted-foreground">{item.brand_name}</p>}
                          </td>
                          <td className="py-2">{item.size_range}</td>
                          <td className="py-2 text-right">{item.total_pairs}</td>
                          <td className="py-2 text-right">Rs {item.price_per_pair}</td>
                          <td className="py-2 text-right">Rs {item.discount_per_pair}</td>
                          <td className="py-2 text-right font-medium">Rs {item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>Rs {selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                {selectedInvoice.total_discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount:</span>
                    <span>- Rs {selectedInvoice.total_discount.toLocaleString()}</span>
                  </div>
                )}
                {selectedInvoice.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>Rs {selectedInvoice.tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>Rs {selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Branded Footer */}
              <div className="rounded-xl p-4 text-center border border-border" style={{ background: 'hsl(40 30% 95%)' }}>
                <p className="text-xs text-muted-foreground">Thank you for your business!</p>
                <p className="text-xs font-semibold text-foreground mt-1">Shamshad Footwear — Wholesale Supplier</p>
                <p className="text-[10px] text-muted-foreground mt-1">0315-7162093 | 0305-5388093 | Faisalabad Road, Chowk Azam, Layyah</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Goods once sold will not be returned without prior agreement.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPortal;
