import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Package, Users, FileText, CreditCard, BarChart3, Settings, ChevronLeft, ChevronRight, Wallet, UserCog, History, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import logo from "@/assets/logo.png";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasPageAccess } = useSupabaseAuthContext();

  const navItems = [
    { icon: Package, label: "Inventory", path: "/inventory", show: hasPageAccess("inventory") },
    { icon: Users, label: "Clients", path: "/clients", show: hasPageAccess("clients") },
    { icon: Wallet, label: "Recovery", path: "/recovery", show: hasPageAccess("recovery") },
    { icon: LayoutDashboard, label: "Dashboard", path: "/", show: hasPageAccess("dashboard") },
    { icon: FileText, label: "Invoices", path: "/invoices", show: hasPageAccess("invoices") },
    { icon: CreditCard, label: "Payments", path: "/payments", show: hasPageAccess("payments") },
    { icon: RotateCcw, label: "Returns", path: "/returns", show: hasPageAccess("returns") },
    { icon: BarChart3, label: "Reports", path: "/reports", show: hasPageAccess("reports") },
  ].filter(item => item.show);

  const bottomNavItems = [
    { icon: UserCog, label: "Users", path: "/users", show: hasPageAccess("users") },
    { icon: History, label: "Audit Logs", path: "/audit-logs", show: hasPageAccess("audit_logs") },
    { icon: Settings, label: "Settings", path: "/settings", show: hasPageAccess("settings") },
  ].filter(item => item.show);

  return <motion.aside initial={false} animate={{
    width: collapsed ? 64 : 256
  }} transition={{
    duration: 0.3,
    ease: "easeInOut"
  }} className="fixed left-0 top-0 h-screen z-50 flex flex-col" style={{
    background: "var(--gradient-sidebar)"
  }}>
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <motion.div initial={false} animate={{
        opacity: collapsed ? 0 : 1
      }} className="flex items-center gap-3 overflow-hidden">
          <img src={logo} alt="Shamshad Footwear" className="w-8 h-8 object-contain rounded" />
          {!collapsed && <span className="text-sidebar-foreground font-semibold text-lg whitespace-nowrap">Shamshad Footwear</span>}
        </motion.div>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return <Link key={item.path} to={item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
              <item.icon className="w-5 h-5 shrink-0" />
              <motion.span initial={false} animate={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : "auto"
          }} className="text-sm font-medium whitespace-nowrap overflow-hidden">
                {item.label}
              </motion.span>
              {isActive && <motion.div layoutId="activeIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary-foreground" transition={{
            duration: 0.2
          }} />}
            </Link>;
      })}
      </nav>

      {/* Bottom Navigation */}
      {bottomNavItems.length > 0 && <div className="py-4 px-2 border-t border-sidebar-border space-y-1">
          {bottomNavItems.map(item => {
        const isActive = location.pathname === item.path;
        return <Link key={item.path} to={item.path} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                <item.icon className="w-5 h-5 shrink-0" />
                <motion.span initial={false} animate={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : "auto"
          }} className="text-sm font-medium whitespace-nowrap overflow-hidden">
                  {item.label}
                </motion.span>
              </Link>;
      })}
        </div>}
    </motion.aside>;
}
