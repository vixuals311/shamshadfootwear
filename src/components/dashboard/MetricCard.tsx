import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  variant?: "primary" | "success" | "warning" | "default";
}

const gradientClasses = {
  primary: "from-primary to-primary/80",
  success: "from-success to-success/80",
  warning: "from-warning to-warning/80",
  default: "from-muted to-muted",
};

const iconBgClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  default: "bg-muted text-muted-foreground",
};

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "default",
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="metric-card group"
    >
      <div
        className={cn(
          "metric-card-gradient bg-gradient-to-br",
          gradientClasses[variant]
        )}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
              iconBgClasses[variant]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {change && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                changeType === "positive" && "bg-success/10 text-success",
                changeType === "negative" && "bg-destructive/10 text-destructive",
                changeType === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {change}
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
