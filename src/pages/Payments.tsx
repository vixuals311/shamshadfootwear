import { motion } from "framer-motion";
import { CreditCard, Building2, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const paymentStats = [
  { label: "Total Received", value: "$45,230", change: "+12%", type: "positive" },
  { label: "Pending", value: "$12,780", change: "8 invoices", type: "neutral" },
  { label: "Overdue", value: "$3,420", change: "-5%", type: "negative" },
];

const recentPayments = [
  { id: "1", client: "Acme Corp", amount: 2500, method: "Bank Transfer", account: "Bank A", date: "Today", type: "incoming" },
  { id: "2", client: "Stark Industries", amount: 5000, method: "Bank Transfer", account: "Bank B", date: "Yesterday", type: "incoming" },
  { id: "3", client: "Wayne Enterprises", amount: 1200, method: "Cash", account: null, date: "2 days ago", type: "incoming" },
  { id: "4", client: "Supplier Payment", amount: -3500, method: "Bank Transfer", account: "Bank A", date: "3 days ago", type: "outgoing" },
  { id: "5", client: "Oscorp", amount: 890, method: "Cash", account: null, date: "1 week ago", type: "incoming" },
];

const Payments = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Payments</h2>
        <p className="text-muted-foreground">
          Track payments and manage accounts
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {paymentStats.map((stat, index) => (
          <div key={index} className="bg-card rounded-xl p-5 shadow-card">
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <span
                className={`text-sm font-medium ${
                  stat.type === "positive"
                    ? "text-success"
                    : stat.type === "negative"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.type === "incoming"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {payment.type === "incoming" ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{payment.client}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{payment.method}</span>
                      {payment.account && (
                        <>
                          <span>•</span>
                          <span>{payment.account}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      payment.type === "incoming" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {payment.type === "incoming" ? "+" : ""}${Math.abs(payment.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{payment.date}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Payment Accounts
            </h3>
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">Bank A - Main</span>
                </div>
                <p className="text-xl font-bold text-foreground">$28,450</p>
              </div>
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">Bank B - Business</span>
                </div>
                <p className="text-xl font-bold text-foreground">$12,780</p>
              </div>
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-warning" />
                  <span className="font-medium">Cash</span>
                </div>
                <p className="text-xl font-bold text-foreground">$4,000</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Payment Methods
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bank Transfer</span>
                <span className="font-medium">68%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "68%" }} />
              </div>
              <div className="flex items-center justify-between text-sm mt-3">
                <span className="text-muted-foreground">Cash</span>
                <span className="font-medium">32%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{ width: "32%" }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Payments;
