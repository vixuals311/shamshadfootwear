import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DollarSign, Tag, Users } from "lucide-react";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { QuickRecoveryDialog } from "./QuickRecoveryDialog";
import type { PageKey } from "@/types";

interface MobileAction {
  key: PageKey;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  to?: string;
}

const actions: MobileAction[] = [
  {
    key: "recovery",
    label: "Add Recovery",
    sublabel: "Record a client payment",
    icon: DollarSign,
    color: "bg-success/10 text-success border-success/20",
  },
  {
    key: "price_check",
    label: "Price Check",
    sublabel: "Lookup product prices",
    icon: Tag,
    color: "bg-primary/10 text-primary border-primary/20",
    to: "/price-check",
  },
  {
    key: "clients",
    label: "Clients",
    sublabel: "View & manage clients",
    icon: Users,
    color: "bg-accent/10 text-accent border-accent/20",
    to: "/clients",
  },
];

export function MobileDashboardActions() {
  const { hasPageAccess } = useSupabaseAuthContext();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const visibleActions = actions.filter((a) => hasPageAccess(a.key));

  if (visibleActions.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const [bgColor] = action.color.split(" ");

            const content = (
              <>
                <div
                  className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="block text-base font-semibold text-foreground">
                    {action.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {action.sublabel}
                  </span>
                </div>
              </>
            );

            if (action.key === "recovery") {
              return (
                <button
                  key={action.key}
                  onClick={() => setRecoveryOpen(true)}
                  className={`flex items-center gap-4 p-5 rounded-xl border ${action.color} bg-card hover:shadow-md transition-all duration-200 active:scale-[0.98] text-left w-full`}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={action.key}
                to={action.to!}
                className={`flex items-center gap-4 p-5 rounded-xl border ${action.color} bg-card hover:shadow-md transition-all duration-200 active:scale-[0.98] text-left w-full`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </motion.div>

      <QuickRecoveryDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />
    </>
  );
}
