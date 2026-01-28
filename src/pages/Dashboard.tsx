import { DollarSign, FileText, Package, Users, TrendingUp, TrendingDown } from "lucide-react";
import { MetricCard, SalesChart, RecentInvoices, LowStockAlert } from "@/components/dashboard";
import { motion } from "framer-motion";

const Dashboard = () => {
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
            Welcome back, Admin
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your business today.
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value="$45,231"
          change="+12.5%"
          changeType="positive"
          icon={DollarSign}
          variant="primary"
        />
        <MetricCard
          title="Active Invoices"
          value="23"
          change="+3 new"
          changeType="positive"
          icon={FileText}
          variant="success"
        />
        <MetricCard
          title="Products in Stock"
          value="1,248"
          change="-42 items"
          changeType="negative"
          icon={Package}
          variant="warning"
        />
        <MetricCard
          title="Active Clients"
          value="156"
          change="+8 new"
          changeType="positive"
          icon={Users}
          variant="default"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div>
          <LowStockAlert />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoices />
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
            <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/10">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">Paid Invoices</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
              </div>
              <span className="text-xl font-bold text-success">$32,450</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/10">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">Pending Payments</p>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </div>
              </div>
              <span className="text-xl font-bold text-warning">$12,780</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/10">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Overdue</p>
                  <p className="text-xs text-muted-foreground">Needs follow-up</p>
                </div>
              </div>
              <span className="text-xl font-bold text-destructive">$3,420</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
