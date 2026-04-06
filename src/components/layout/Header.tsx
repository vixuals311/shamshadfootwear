import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, Link } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { useOnlineBilling } from "@/hooks/useOnlineBilling";
import { OfflineIndicator } from "./OfflineIndicator";
import { GlobalSearch } from "./GlobalSearch";

const pageTitle: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Inventory",
  "/clients": "Clients",
  "/invoices": "Invoices",
  "/payments": "Payments",
  "/recovery": "Recovery",
  "/reports": "Reports",
  "/settings": "Settings",
  "/users": "User Management",
  "/audit-logs": "Audit Logs",
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const title = pageTitle[location.pathname] || "Dashboard";
  const { onlineBillingEnabled } = useOnlineBilling();

  return (
    <header className="h-14 lg:h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Global Search */}
        <GlobalSearch />

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 h-9 px-3">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onlineBillingEnabled && (
              <DropdownMenuItem asChild>
                <Link to="/invoices/new">New Invoice</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/bulk-clients">Add Client</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/add-product">Add Product</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/recovery">Record Recovery</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Offline Status */}
        <OfflineIndicator />

        {/* User Menu with Notifications */}
        <UserMenu />
      </div>
    </header>
  );
}
