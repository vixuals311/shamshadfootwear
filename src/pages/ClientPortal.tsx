import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  FileText,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Eye,
  Download,
  Printer,
  ArrowLeft,
  Lock,
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
import { Client, Invoice, Recovery } from "@/types";
import { initialClients, initialInvoices, initialRecoveries } from "@/data/mockData";
import { format } from "date-fns";

const ClientPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const handleLogin = () => {
    const client = initialClients.find((c) => c.phone === loginPhone);
    if (client) {
      setCurrentClient(client);
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("No account found with this phone number.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentClient(null);
    setLoginPhone("");
  };

  const getClientInvoices = (clientId: string) => {
    return initialInvoices.filter((inv) => inv.clientId === clientId);
  };

  const getClientRecoveries = (clientId: string) => {
    const directRecoveries = initialRecoveries.filter((rec) => rec.clientId === clientId);
    const cityRecoveries = initialRecoveries
      .filter(
        (rec) =>
          rec.type === "city" && rec.clientAmounts?.some((ca) => ca.clientId === clientId)
      )
      .map((rec) => {
        const clientAmount = rec.clientAmounts?.find((ca) => ca.clientId === clientId);
        return {
          ...rec,
          amount: clientAmount?.amount || 0,
          isFromCity: true,
        };
      });

    return [...directRecoveries.map((r) => ({ ...r, isFromCity: false })), ...cityRecoveries];
  };

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
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}

              <Button className="w-full" onClick={handleLogin}>
                <Lock className="w-4 h-4 mr-2" />
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

  const clientInvoices = getClientInvoices(currentClient.id);
  const clientRecoveries = getClientRecoveries(currentClient.id);

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
        {/* Account Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold text-primary">
              Rs {currentClient.currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className="text-xl font-bold">
              Rs {currentClient.openingBalance.toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold text-success">
              Rs {currentClient.totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-xl font-bold">{currentClient.invoiceCount}</p>
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
              <span>{currentClient.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{currentClient.address}</span>
            </div>
          </div>
        </motion.div>

        {/* Bills & Recoveries */}
        <Tabs defaultValue="bills" className="w-full">
          <TabsList className="w-full max-w-xs">
            <TabsTrigger value="bills" className="flex-1 gap-2">
              <FileText className="w-4 h-4" />
              Bills ({clientInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="recoveries" className="flex-1 gap-2">
              <CreditCard className="w-4 h-4" />
              Recoveries ({clientRecoveries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bills" className="mt-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-xl shadow-card overflow-hidden"
            >
              {clientInvoices.length > 0 ? (
                <div className="divide-y divide-border">
                  {clientInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(invoice.createdAt, "dd MMM yyyy, hh:mm a")}
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
                              invoice.status === "overdue" && "status-badge-danger"
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
              {clientRecoveries.length > 0 ? (
                <div className="divide-y divide-border">
                  {clientRecoveries.map((recovery: any, index) => (
                    <div
                      key={`${recovery.id}-${index}`}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          Rs {recovery.amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(recovery.date, "dd MMM yyyy, hh:mm a")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "status-badge",
                          recovery.isFromCity
                            ? "status-badge-warning"
                            : "status-badge-success"
                        )}
                      >
                        {recovery.isFromCity ? "City Recovery" : "Individual"}
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
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice #</span>
                <span className="font-mono">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>
                  {format(selectedInvoice.createdAt, "dd MMM yyyy, hh:mm a")}
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
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.brandName} • Size {item.sizeRange} • {item.totalPairs || item.quantity * 6} pairs
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
                {selectedInvoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">
                      - Rs {selectedInvoice.totalDiscount.toLocaleString()}
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
