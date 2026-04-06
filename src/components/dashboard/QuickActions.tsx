import { FileText, CreditCard, FileCheck, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useOnlineBilling } from "@/hooks/useOnlineBilling";

const actions = [
  {
    label: "New Invoice",
    icon: FileText,
    to: "/invoices/new",
    color: "bg-primary/10 text-primary border-primary/20",
    requiresBilling: true,
  },
  {
    label: "Record Recovery",
    icon: DollarSign,
    to: "/recovery",
    color: "bg-success/10 text-success border-success/20",
    requiresBilling: false,
  },
  {
    label: "Add Cheque",
    icon: FileCheck,
    to: "/cheques",
    color: "bg-warning/10 text-warning border-warning/20",
    requiresBilling: false,
  },
  {
    label: "Quick Payment",
    icon: CreditCard,
    to: "/payments",
    color: "bg-accent/10 text-accent-foreground border-accent/20",
    requiresBilling: false,
  },
];

export function QuickActions() {
  const { onlineBillingEnabled } = useOnlineBilling();

  const visibleActions = actions.filter(
    (a) => !a.requiresBilling || onlineBillingEnabled
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      {visibleActions.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          className={`flex items-center gap-3 p-4 rounded-xl border ${action.color} hover:shadow-md transition-all duration-200 group`}
        >
          <action.icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">{action.label}</span>
        </Link>
      ))}
    </motion.div>
  );
}
