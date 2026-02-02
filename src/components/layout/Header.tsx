import { Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, Link } from "react-router-dom";
import { UserMenu } from "./UserMenu";

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

export function Header() {
  const location = useLocation();
  const title = pageTitle[location.pathname] || "Dashboard";

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 w-48 lg:w-64 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1 sm:gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/invoices/new">New Invoice</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/clients">Add Client</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/inventory">Add Product</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/recovery">Record Recovery</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu with Notifications */}
        <UserMenu />
      </div>
    </header>
  );
}
