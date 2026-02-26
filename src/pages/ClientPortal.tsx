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
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="+92 3XX XXXXXXX"
                    className="pl-10"
                    disabled={loading}
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
              <TabsList className="w-full max-w-xs">
                <TabsTrigger value="bills" className="flex-1 gap-2">
                  <FileText className="w-4 h-4" />
                  Bills ({invoices.length})
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

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
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
                        <div><h2>Shamshad Footwear</h2><p>Wholesale Supplier</p></div>
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
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice #</span>
                <span className="font-mono">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>
                  {format(new Date(selectedInvoice.created_at), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm bg-muted/30 p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.brand_name} • Size {item.size_range} • {item.total_pairs} pairs
                        </p>
                      </div>
                      <p className="font-medium">Rs {item.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs {selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                {selectedInvoice.total_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">
                      - Rs {selectedInvoice.total_discount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>Rs {selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPortal;
