import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";
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
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceViewDialog } from "@/components/dashboard/InvoiceViewDialog";
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

interface ReturnInfo {
  id: string;
  return_number: string;
  total_amount: number;
  adjustment_type: string;
  created_at: string;
  invoice_id: string;
  items: { product_name: string; size_range: string; pairs_returned: number; total: number }[];
}

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  total_discount: number;
  tax: number;
  total: number;
  amount_received: number;
  balance_due: number;
  total_bundles: number;
  credit_applied: number;
  status: string;
  created_at: string;
  items: InvoiceItem[];
  returns: ReturnInfo[];
}

interface InvoiceItem {
  id: string;
  product_name: string;
  article_number: string;
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

      // Build returns map by invoice_id
      const allReturns: ReturnInfo[] = (data.returns || []).map((r: any) => ({
        id: r.id,
        return_number: r.return_number,
        total_amount: r.total_amount,
        adjustment_type: r.adjustment_type,
        created_at: r.created_at,
        invoice_id: r.invoice_id,
        items: (r.return_items || []).map((ri: any) => ({
          product_name: ri.product_name,
          size_range: ri.size_range,
          pairs_returned: ri.pairs_returned,
          total: ri.total,
        })),
      }));

      setCurrentClient(data.client);
      setInvoices(
        (data.invoices || []).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          subtotal: inv.subtotal,
          total_discount: inv.total_discount,
          tax: inv.tax,
          total: inv.total,
          amount_received: inv.amount_received || 0,
          balance_due: inv.balance_due || 0,
          total_bundles: inv.total_bundles || 0,
          credit_applied: inv.credit_applied || 0,
          status: inv.status,
          created_at: inv.created_at,
          items: inv.invoice_items || [],
          returns: allReturns.filter((r: ReturnInfo) => r.invoice_id === inv.id),
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
              <img src={logoImg} alt="Shamshad Footwear" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-contain" />
              <h1 className="text-2xl font-bold text-foreground">Shamshad Footwear</h1>
              <p className="text-sm text-muted-foreground mt-1">Client Portal</p>
              <p className="text-xs text-muted-foreground mt-1">
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
              Faisalabad Road, Chowk Azam, Layyah | 0315-7162093
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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Shamshad Footwear" className="w-10 h-10 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Shamshad Footwear</h1>
              <p className="text-xs text-muted-foreground">{currentClient.name} • {currentClient.city}</p>
            </div>
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
                <p className="text-xl font-bold">{invoices.length}</p>
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

      {/* Invoice Detail Dialog - Same as admin view */}
      <InvoiceViewDialog
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
        invoice={selectedInvoice ? {
          id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoice_number,
          created_at: selectedInvoice.created_at,
          client_name: currentClient.name,
          client_city: currentClient.city || '',
          subtotal: selectedInvoice.subtotal,
          total_discount: selectedInvoice.total_discount,
          tax: selectedInvoice.tax,
          total: selectedInvoice.total,
          amount_received: selectedInvoice.amount_received,
          balance_due: selectedInvoice.balance_due,
          total_bundles: selectedInvoice.total_bundles,
          credit_applied: selectedInvoice.credit_applied,
          status: selectedInvoice.status,
          items: selectedInvoice.items,
          returns: selectedInvoice.returns,
        } : null}
      />
    </div>
  );
};

export default ClientPortal;
