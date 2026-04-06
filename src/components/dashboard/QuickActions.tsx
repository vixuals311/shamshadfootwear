import { useState } from "react";
import { FileText, FileCheck, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useOnlineBilling } from "@/hooks/useOnlineBilling";
import { QuickRecoveryDialog } from "./QuickRecoveryDialog";

const linkActions = [
  {
    label: "New Invoice",
    icon: FileText,
    to: "/invoices/new",
    color: "bg-primary/10 text-primary border-primary/20",
    requiresBilling: true,
  },
  {
    label: "Add Cheque",
    icon: FileCheck,
    to: "/cheques",
    color: "bg-warning/10 text-warning border-warning/20",
    requiresBilling: false,
  },
];

export function QuickActions() {
  const { onlineBillingEnabled } = useOnlineBilling();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const visibleLinkActions = linkActions.filter(
    (a) => !a.requiresBilling || onlineBillingEnabled
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {visibleLinkActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex items-center gap-3 p-4 rounded-xl border ${action.color} hover:shadow-md transition-all duration-200 group`}
          >
            <action.icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}

        {/* Record Recovery - opens dialog */}
        <button
          onClick={() => setRecoveryOpen(true)}
          className="flex items-center gap-3 p-4 rounded-xl border bg-success/10 text-success border-success/20 hover:shadow-md transition-all duration-200 group text-left"
        >
          <DollarSign className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Record Recovery</span>
        </button>
      </motion.div>

      <QuickRecoveryDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />
    </>
  );
}
