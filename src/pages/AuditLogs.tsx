import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  History,
  User,
  Package,
  FileText,
  CreditCard,
  Settings,
  Download,
  Tag,
  Loader2,
  RefreshCcw,
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
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV } from "@/utils/exportUtils";

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  login: "status-badge-success",
  logout: "status-badge-default",
  create: "status-badge-success",
  update: "status-badge-warning",
  delete: "status-badge-danger",
  view: "status-badge-default",
  save_draft: "status-badge-warning",
  export: "status-badge-default",
  import: "status-badge-success",
  print: "status-badge-default",
};

const entityIcons: Record<string, typeof User> = {
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
  const { hasPermission } = useSupabaseAuthContext();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : "";
      const matchesSearch =
        (log.user_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (log.entity_id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        detailsStr.includes(searchQuery.toLowerCase());

      const matchesEntity = filterEntity === "all" || log.entity_type === filterEntity;
      const matchesAction = filterAction === "all" || log.action === filterAction;

      return matchesSearch && matchesEntity && matchesAction;
    });
  }, [logs, searchQuery, filterEntity, filterAction]);

  const handleExportLogs = () => {
    exportToCSV(
      filteredLogs,
      [
        { 
          key: "created_at", 
          header: "Timestamp",
          format: (val: string) => format(new Date(val), "dd MMM yyyy, hh:mm a")
        },
        { key: "user_name", header: "User" },
        { key: "action", header: "Action" },
        { key: "entity_type", header: "Entity Type" },
        { key: "entity_id", header: "Entity ID" },
        { 
          key: "details", 
          header: "Details",
          format: (val: any) => val ? JSON.stringify(val) : "-"
        },
      ],
      "audit-logs"
    );
    toast({ title: "Success", description: "Audit logs exported successfully" });
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchLogs}>
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportLogs}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Logs</span>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Actions</p>
          <p className="text-xl sm:text-2xl font-bold">{logs.length}</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Creates</p>
          <p className="text-xl sm:text-2xl font-bold text-success">
            {logs.filter((l) => l.action === "create").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Updates</p>
          <p className="text-xl sm:text-2xl font-bold text-warning">
            {logs.filter((l) => l.action === "update" || l.action === "save_draft").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
          <p className="text-xs sm:text-sm text-muted-foreground">Deletes</p>
          <p className="text-xl sm:text-2xl font-bold text-destructive">
            {logs.filter((l) => l.action === "delete").length}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 sm:gap-4"
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
        <div className="flex gap-2">
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="brand">Brands</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="recovery">Recoveries</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="save_draft">Save Draft</SelectItem>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="print">Print</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Logs - Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden hidden sm:block"
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
                const EntityIcon = entityIcons[log.entity_type] || History;
                const detailsPreview = log.details 
                  ? Object.entries(log.details)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")
                  : "-";
                
                return (
                  <tr key={log.id}>
                    <td className="text-muted-foreground text-sm whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}
                    </td>
                    <td className="font-medium">{log.user_name || "System"}</td>
                    <td>
                      <span
                        className={cn(
                          "status-badge capitalize",
                          actionColors[log.action] || "status-badge-default"
                        )}
                      >
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <EntityIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-muted-foreground text-xs">
                            ({log.entity_id.slice(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground text-sm max-w-xs truncate">
                      {detailsPreview}
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

      {/* Logs - Mobile Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="sm:hidden space-y-3"
      >
        {filteredLogs.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No logs found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const EntityIcon = entityIcons[log.entity_type] || History;
            const detailsPreview = log.details 
              ? Object.entries(log.details)
                  .slice(0, 2)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
              : null;

            return (
              <div key={log.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <EntityIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate capitalize">
                        {log.action.replace("_", " ")} {log.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user_name || "System"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "status-badge capitalize text-xs shrink-0",
                      actionColors[log.action] || "status-badge-default"
                    )}
                  >
                    {log.action.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}</span>
                  {log.entity_id && (
                    <span>ID: {log.entity_id.slice(0, 8)}...</span>
                  )}
                </div>
                {detailsPreview && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/30 rounded-lg px-2.5 py-1.5 truncate">
                    {detailsPreview}
                  </p>
                )}
              </div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};

export default AuditLogs;
