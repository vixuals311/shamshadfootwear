import { DollarSign, FileText, Package, Users, TrendingUp, TrendingDown, Loader2, FileCheck, Calendar } from "lucide-react";
import { MetricCard, SalesChart, RecentInvoices, LowStockAlert, QuickActions, MobileDashboardActions } from "@/components/dashboard";
import { motion } from "framer-motion";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isAfter, isBefore, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface UpcomingCheque {
  id: string;
  cheque_number: string;
  amount: number;
  cheque_date: string;
  given_to: string;
}

const Dashboard = () => {
  const { role, profile } = useSupabaseAuthContext();
  const { stats, recentInvoices, lowStockProducts, monthlySales, loading } = useDashboardData();
  const [upcomingCheques, setUpcomingCheques] = useState<UpcomingCheque[]>([]);

  const isRestrictedRole = role === "biller" || role === "cashier";

  useEffect(() => {
    const fetchUpcomingCheques = async () => {
      const today = new Date();
      const sevenDaysLater = addDays(today, 7);
      const { data } = await supabase
        .from("cheques")
        .select("id, cheque_number, amount, cheque_date, given_to")
        .eq("status", "pending")
        .gte("cheque_date", format(today, "yyyy-MM-dd"))
        .lte("cheque_date", format(sevenDaysLater, "yyyy-MM-dd"))
        .order("cheque_date", { ascending: true })
        .limit(7);
      setUpcomingCheques(data || []);
    };
    fetchUpcomingCheques();
  }, []);

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
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.name || "User"}
          </h2>
          <p className="text-muted-foreground">
            {isRestrictedRole 
              ? "View low stock alerts and recent invoices."
              : "Here's what's happening with your business today."
            }
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </motion.div>

      {/* Mobile Quick Action Screen */}
      <div className="lg:hidden">
        <MobileDashboardActions />
      </div>

      {/* Desktop Quick Action Shortcuts */}
      <div className="hidden lg:block">
        <QuickActions />
      </div>

      {/* Upcoming Cheques Reminder */}
      {upcomingCheques.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-warning/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-warning" />
              <h3 className="text-lg font-semibold text-foreground">Upcoming Cheques (Next 7 Days)</h3>
            </div>
            <Link to="/cheques" className="text-sm text-primary hover:underline">View All</Link>
          </div>
          <div className="space-y-2">
            {upcomingCheques.map((cheque) => (
              <div key={cheque.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-4 h-4 text-warning shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      #{cheque.cheque_number} — {cheque.given_to}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(parseISO(cheque.cheque_date), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-warning whitespace-nowrap ml-2">
                  Rs {cheque.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Full Dashboard for Admin */}
      {!isRestrictedRole && stats && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue"
              value={`Rs ${stats.totalRevenue.toLocaleString()}`}
              change={stats.revenueChange}
              changeType={stats.revenueChange.startsWith('+') ? "positive" : "negative"}
              icon={DollarSign}
              variant="primary"
            />
            <MetricCard
              title="Active Invoices"
              value={stats.activeInvoices.toString()}
              change={stats.invoiceChange}
              changeType="positive"
              icon={FileText}
              variant="success"
            />
            <MetricCard
              title="Products in Stock"
              value={stats.productsInStock.toLocaleString()}
              change={stats.stockChange || "pairs"}
              changeType="neutral"
              icon={Package}
              variant="warning"
            />
            <MetricCard
              title="Active Clients"
              value={stats.activeClients.toString()}
              change={stats.clientChange}
              changeType="positive"
              icon={Users}
              variant="default"
            />
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SalesChart data={monthlySales} />
            </div>
            <div>
              <LowStockAlert items={lowStockProducts} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentInvoices invoices={recentInvoices} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-xl p-6 shadow-card"
            >
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-success/5 border border-success/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingUp className="w-5 h-5 text-success shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Paid This Month</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">Collected revenue</p>
                    </div>
                  </div>
                  <span className="text-base sm:text-xl font-bold text-success whitespace-nowrap">Rs {stats.paidThisMonth.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-warning/5 border border-warning/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingDown className="w-5 h-5 text-warning shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Pending</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">Outstanding</p>
                    </div>
                  </div>
                  <span className="text-base sm:text-xl font-bold text-warning whitespace-nowrap">Rs {stats.pendingPayments.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingDown className="w-5 h-5 text-destructive shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Overdue</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">Needs follow-up</p>
                    </div>
                  </div>
                  <span className="text-base sm:text-xl font-bold text-destructive whitespace-nowrap">Rs {stats.overdueAmount.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Restricted Dashboard for Biller/Cashier */}
      {isRestrictedRole && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LowStockAlert items={lowStockProducts} />
          <RecentInvoices invoices={recentInvoices} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
