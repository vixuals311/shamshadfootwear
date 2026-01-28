import { motion } from "framer-motion";
import { Package, AlertTriangle, ArrowUpRight } from "lucide-react";

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  threshold: number;
}

const lowStockItems: LowStockItem[] = [
  { id: "1", name: "Wireless Mouse", stock: 5, threshold: 10 },
  { id: "2", name: "USB-C Cable (3ft)", stock: 8, threshold: 20 },
  { id: "3", name: "Laptop Stand", stock: 3, threshold: 5 },
  { id: "4", name: "Webcam HD", stock: 2, threshold: 10 },
];

export function LowStockAlert() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-xl p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Low Stock Alert
            </h3>
            <p className="text-sm text-muted-foreground">
              {lowStockItems.length} items need attention
            </p>
          </div>
        </div>
        <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
          View inventory
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {lowStockItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-warning">
                {item.stock} left
              </span>
              <span className="text-xs text-muted-foreground">
                / {item.threshold} min
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
