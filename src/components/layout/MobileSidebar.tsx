import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Package, Users, FileText, CreditCard, BarChart3, 
  Settings, Wallet, UserCog, History, X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const { hasPermission, role } = useSupabaseAuthContext();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/", show: true },
    { icon: Package, label: "Inventory", path: "/inventory", show: hasPermission("canManageInventory") || role === "admin" },
    { icon: Users, label: "Clients", path: "/clients", show: hasPermission("canManageClients") || role === "admin" },
    { icon: FileText, label: "Invoices", path: "/invoices", show: hasPermission("canCreateInvoices") || role === "admin" },
    { icon: CreditCard, label: "Payments", path: "/payments", show: hasPermission("canRecordPayments") || role === "admin" },
    { icon: Wallet, label: "Recovery", path: "/recovery", show: hasPermission("canManageRecoveries") || role === "admin" || role === "cashier" },
    { icon: BarChart3, label: "Reports", path: "/reports", show: hasPermission("canViewReports") || role === "admin" },
  ].filter(item => item.show);

  const bottomNavItems = [
    { icon: UserCog, label: "Users", path: "/users", show: hasPermission("canManageUsers") || role === "admin" },
    { icon: History, label: "Audit Logs", path: "/audit-logs", show: hasPermission("canManageSettings") || role === "admin" },
    { icon: Settings, label: "Settings", path: "/settings", show: hasPermission("canManageSettings") || role === "admin" },
  ].filter(item => item.show);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-0 top-0 h-screen w-[280px] z-50 flex flex-col lg:hidden"
            style={{ background: "var(--gradient-sidebar)" }}
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <FileText className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <span className="text-sidebar-foreground font-semibold text-lg">Shamshad Footwear</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-auto">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      isActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Navigation */}
            {bottomNavItems.length > 0 && (
              <div className="py-4 px-3 border-t border-sidebar-border space-y-1">
                {bottomNavItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
