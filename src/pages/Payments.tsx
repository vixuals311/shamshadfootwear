import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Loader2,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/utils/exportUtils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

interface Payment {
  id: string;
  client: string;
  amount: number;
  method: string;
  account: string | null;
  date: string;
  type: "incoming" | "outgoing";
}

interface PaymentAccount {
  id: string;
  name: string;
}

const Payments = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: accountsData, error: accountsError } = await supabase
        .from("payment_accounts")
        .select("*")
        .order("name");

      if (accountsError) throw accountsError;
      setAccounts((accountsData || []).map((a) => ({ id: a.id, name: a.name })));

      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(`id, created_at, amount_received, payment_method, clients (name), payment_accounts (name)`)
        .gt("amount_received", 0)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      const { data: recoveriesData, error: recoveriesError } = await supabase
        .from("recoveries")
        .select(`id, date, amount, type, clients (name), city`)
        .order("date", { ascending: false });

      if (recoveriesError) throw recoveriesError;

      const invoicePayments: Payment[] = (invoicesData || []).map((inv: any) => ({
        id: `inv-${inv.id}`,
        client: inv.clients?.name || "Unknown Client",
        amount: inv.amount_received,
        method: inv.payment_method === "cash" ? "Cash" : "Bank Transfer",
        account: inv.payment_accounts?.name || null,
        date: inv.created_at,
        type: "incoming",
      }));

      const recoveryPayments: Payment[] = (recoveriesData || []).map((r: any) => ({
        id: `rec-${r.id}`,
        client: r.type === "city" ? `${r.city} (City)` : r.clients?.name || "Unknown",
        amount: r.amount,
        method: "Cash",
        account: null,
        date: r.date,
        type: "incoming",
      }));

      const allPayments = [...invoicePayments, ...recoveryPayments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setPayments(allPayments);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load payment data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredPayments = useMemo(() => {
    if (!selectedDate) return payments;
    return payments.filter(
      (p) => format(new Date(p.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
    );
  }, [payments, selectedDate]);

  // Date total
  const dateTotal = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  // Per-account totals for filtered payments
  const accountTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    // Initialize all accounts + Cash
    accounts.forEach((a) => (totals[a.name] = 0));
    totals["Cash"] = 0;

    filteredPayments.forEach((p) => {
      if (p.account && totals[p.account] !== undefined) {
        totals[p.account] += p.amount;
      } else if (p.method === "Cash") {
        totals["Cash"] += p.amount;
      }
    });
    return totals;
  }, [filteredPayments, accounts]);

  // Overall stats (only show when no date filter)
  const stats = useMemo(() => {
    const totalReceived = payments
      .filter((p) => p.type === "incoming")
      .reduce((sum, p) => sum + p.amount, 0);
    return { totalReceived };
  }, [payments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Payments</h2>
          <p className="text-muted-foreground">Track payments and manage accounts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            exportToCSV(filteredPayments, [
              { key: "client", header: "Client" },
              { key: "amount", header: "Amount" },
              { key: "method", header: "Method" },
              { key: "account", header: "Account", format: (v: any) => v || "N/A" },
              { key: "date", header: "Date", format: (v: any) => new Date(v).toLocaleDateString() },
              { key: "type", header: "Type" },
            ], "payments");
            log({ action: "export", entityType: "payment", details: { format: "csv", count: filteredPayments.length } });
          }}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2", selectedDate && "text-primary")}>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedDate ? format(selectedDate, "dd MMM yyyy") : "Filter by date"}</span>
                <span className="sm:hidden">{selectedDate ? format(selectedDate, "dd/MM") : "Date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
              {selectedDate && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedDate(undefined)}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      {/* Stats - show total received, hide pending/overdue */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">
            {selectedDate ? `Total for ${format(selectedDate, "dd MMM yyyy")}` : "Total Received"}
          </p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-lg sm:text-2xl font-bold text-foreground">
              Rs {(selectedDate ? dateTotal : stats.totalReceived).toLocaleString()}
            </p>
            <span className="text-xs sm:text-sm font-medium text-success whitespace-nowrap">
              {filteredPayments.length} txns
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            {selectedDate && (
              <span className="text-sm text-muted-foreground">
                Showing {format(selectedDate, "dd MMM yyyy")}
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.type === "incoming" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {payment.type === "incoming" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{payment.client}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{payment.method}</span>
                        {payment.account && (<><span>•</span><span>{payment.account}</span></>)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${payment.type === "incoming" ? "text-success" : "text-destructive"}`}>
                      {payment.type === "incoming" ? "+" : ""}Rs {Math.abs(payment.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(payment.date), "dd MMM yyyy")}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No payments found for this date</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Payment Accounts with per-date totals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Payment Accounts</h3>
            <div className="space-y-3">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div key={account.id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-primary" />
                        <span className="font-medium">{account.name}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        Rs {(accountTotals[account.name] || 0).toLocaleString()}
                      </span>
                    </div>
                    {selectedDate && (
                      <p className="text-xs text-muted-foreground mt-1 ml-8">
                        on {format(selectedDate, "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No payment accounts configured</p>
              )}
              
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-warning" />
                    <span className="font-medium">Cash</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    Rs {(accountTotals["Cash"] || 0).toLocaleString()}
                  </span>
                </div>
                {selectedDate && (
                  <p className="text-xs text-muted-foreground mt-1 ml-8">
                    on {format(selectedDate, "dd MMM yyyy")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payment Methods</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bank Transfer</span>
                <span className="font-medium">
                  {Math.round((filteredPayments.filter((p) => p.method === "Bank Transfer").length / Math.max(filteredPayments.length, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{
                  width: `${Math.round((filteredPayments.filter((p) => p.method === "Bank Transfer").length / Math.max(filteredPayments.length, 1)) * 100)}%`,
                }} />
              </div>
              <div className="flex items-center justify-between text-sm mt-3">
                <span className="text-muted-foreground">Cash</span>
                <span className="font-medium">
                  {Math.round((filteredPayments.filter((p) => p.method === "Cash").length / Math.max(filteredPayments.length, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{
                  width: `${Math.round((filteredPayments.filter((p) => p.method === "Cash").length / Math.max(filteredPayments.length, 1)) * 100)}%`,
                }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Payments;
