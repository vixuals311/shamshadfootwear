import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  History,
  User,
  Package,
  FileText,
  CreditCard,
  Settings,
  Filter,
  Download,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAudit } from "@/context/AuditContext";
import { useAuth } from "@/context/AuthContext";
import { AuditAction, AuditEntity } from "@/types";
import { format } from "date-fns";

const actionColors: Record<AuditAction, string> = {
  login: "status-badge-success",
  logout: "status-badge-default",
  create: "status-badge-success",
  update: "status-badge-warning",
  delete: "status-badge-danger",
  view: "status-badge-default",
};

const entityIcons: Record<AuditEntity, typeof User> = {
  user: User,
  product: Package,
  brand: Tag,
  client: User,
  invoice: FileText,
  recovery: CreditCard,
  payment: CreditCard,
  settings: Settings,
};

const AuditLogs = () => {
  const { logs, getRecentLogs } = useAudit();
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEntity = filterEntity === "all" || log.entity === filterEntity;
      const matchesAction = filterAction === "all" || log.action === filterAction;

      return matchesSearch && matchesEntity && matchesAction;
    });
  }, [logs, searchQuery, filterEntity, filterAction]);

  if (!hasPermission("canManageSettings")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
          <p className="text-muted-foreground">
            Track all system activity and changes
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export Logs
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total Actions</p>
          <p className="text-2xl font-bold">{logs.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Creates</p>
          <p className="text-2xl font-bold text-success">
            {logs.filter((l) => l.action === "create").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Updates</p>
          <p className="text-2xl font-bold text-warning">
            {logs.filter((l) => l.action === "update").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Deletes</p>
          <p className="text-2xl font-bold text-destructive">
            {logs.filter((l) => l.action === "delete").length}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="product">Products</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="recovery">Recoveries</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const EntityIcon = entityIcons[log.entity] || History;
                return (
                  <tr key={log.id}>
                    <td className="text-muted-foreground text-sm whitespace-nowrap">
                      {format(log.timestamp, "dd MMM yyyy, hh:mm a")}
                    </td>
                    <td className="font-medium">{log.userName}</td>
                    <td>
                      <span
                        className={cn(
                          "status-badge capitalize",
                          actionColors[log.action]
                        )}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <EntityIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">{log.entity}</span>
                        {log.entityName && (
                          <span className="text-muted-foreground">
                            ({log.entityName})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground text-sm max-w-xs truncate">
                      {log.details || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No logs found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuditLogs;
