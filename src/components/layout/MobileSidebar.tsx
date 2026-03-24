import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Package, Users, FileText, CreditCard, BarChart3, 
  Settings, Wallet, UserCog, History, X, RotateCcw, Tag, FileCheck, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { useOnlineBilling } from "@/hooks/useOnlineBilling";
import logo from "@/assets/logo.png";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const { hasPageAccess } = useSupabaseAuthContext();
  const { onlineBillingEnabled } = useOnlineBilling();

  const navItems = [
    { icon: Package, label: "Inventory", path: "/inventory", show: hasPageAccess("inventory") },
    { icon: Tag, label: "Price Check", path: "/price-check", show: hasPageAccess("price_check") },
    { icon: Users, label: "Clients", path: "/clients", show: hasPageAccess("clients") },
    { icon: Wallet, label: "Recovery", path: "/recovery", show: hasPageAccess("recovery") },
    { icon: LayoutDashboard, label: "Dashboard", path: "/", show: hasPageAccess("dashboard") },
    { icon: FileText, label: "Invoices", path: "/invoices", show: hasPageAccess("invoices") && onlineBillingEnabled },
    { icon: CreditCard, label: "Payments", path: "/payments", show: hasPageAccess("payments") },
    { icon: FileCheck, label: "Cheques", path: "/cheques", show: hasPageAccess("cheques") },
    { icon: RotateCcw, label: "Returns", path: "/returns", show: hasPageAccess("returns") },
    { icon: BarChart3, label: "Reports", path: "/reports", show: hasPageAccess("reports") },
  ].filter(item => item.show);

  const bottomNavItems = [
    { icon: UserCog, label: "Users", path: "/users", show: hasPageAccess("users") },
    { icon: History, label: "Audit Logs", path: "/audit-logs", show: hasPageAccess("audit_logs") },
    { icon: Settings, label: "Settings", path: "/settings", show: hasPageAccess("settings") },
  ].filter(item => item.show);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-0 top-0 h-screen w-[280px] z-50 flex flex-col lg:hidden"
            style={{ background: "var(--gradient-sidebar)" }}
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Shamshad Footwear" className="w-8 h-8 object-contain rounded" />
                <span className="text-sidebar-foreground font-semibold text-lg">Shamshad Footwear</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-auto">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={onClose}
                    className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            {bottomNavItems.length > 0 && (
              <div className="py-4 px-3 border-t border-sidebar-border space-y-1">
                {bottomNavItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={onClose}
                      className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}>
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
