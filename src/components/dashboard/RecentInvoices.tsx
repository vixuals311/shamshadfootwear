import { motion } from "framer-motion";
import { FileText, ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  client: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
}

const recentInvoices: Invoice[] = [
  { id: "INV-001", client: "Acme Corp", amount: 2500, status: "paid", date: "Today" },
  { id: "INV-002", client: "Stark Industries", amount: 8750, status: "pending", date: "Yesterday" },
  { id: "INV-003", client: "Wayne Enterprises", amount: 4200, status: "overdue", date: "3 days ago" },
  { id: "INV-004", client: "Oscorp", amount: 1890, status: "paid", date: "5 days ago" },
  { id: "INV-005", client: "Umbrella Corp", amount: 3650, status: "pending", date: "1 week ago" },
];

const statusStyles = {
  paid: "status-badge-success",
  pending: "status-badge-warning",
  overdue: "status-badge-danger",
};

export function RecentInvoices() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Recent Invoices
          </h3>
          <p className="text-sm text-muted-foreground">
            Latest billing activity
          </p>
        </div>
        <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
          View all
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {recentInvoices.map((invoice, index) => (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {invoice.client}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{invoice.id}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{invoice.date}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                ${invoice.amount.toLocaleString()}
              </span>
              <span className={cn("status-badge", statusStyles[invoice.status])}>
                {invoice.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
