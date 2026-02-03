import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  UserCog,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
  ].filter((item) => item.show);

  const bottomNavItems = [
    { icon: UserCog, label: "Users", path: "/users", show: hasPermission("canManageUsers") || role === "admin" },
    { icon: History, label: "Audit Logs", path: "/audit-logs", show: hasPermission("canManageSettings") || role === "admin" },
    { icon: Settings, label: "Settings", path: "/settings", show: hasPermission("canManageSettings") || role === "admin" },
  ].filter((item) => item.show);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col"
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <motion.div
          initial={false}
          animate={{ opacity: collapsed ? 0 : 1 }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sidebar-foreground font-semibold text-lg whitespace-nowrap">
              BillFlow
            </span>
          )}
        </motion.div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <motion.span
                initial={false}
                animate={{ 
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto"
                }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary-foreground"
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      {bottomNavItems.length > 0 && (
        <div className="py-4 px-2 border-t border-sidebar-border space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <motion.span
                  initial={false}
                  animate={{ 
                    opacity: collapsed ? 0 : 1,
                    width: collapsed ? 0 : "auto"
                  }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>
      )}
    </motion.aside>
  );
}
