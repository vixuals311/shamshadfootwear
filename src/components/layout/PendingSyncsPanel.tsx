import { useEffect } from "react";
import { useOfflineSyncContext, type SyncEntryWithStatus } from "@/context/OfflineSyncContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Check, AlertCircle, Clock, ChevronDown, ChevronUp, Database, Trash2, User, Calendar, Hash, FileText, DollarSign, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function StatusBadge({ status }: { status: SyncEntryWithStatus["status"] }) {
  const config = {
    pending: { label: "Pending", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
    syncing: { label: "Syncing...", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
    synced: { label: "Synced", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", c.className)}>
      {status === "syncing" && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
      {status === "synced" && <Check className="w-3 h-3 mr-1" />}
      {status === "failed" && <AlertCircle className="w-3 h-3 mr-1" />}
      {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
      {c.label}
    </Badge>
  );
}

function getFieldIcon(key: string) {
  const lk = key.toLowerCase();
  if (lk.includes("user") || lk.includes("client") || lk.includes("name")) return User;
  if (lk.includes("date") || lk.includes("created") || lk.includes("updated")) return Calendar;
  if (lk.includes("id") || lk.includes("number")) return Hash;
  if (lk.includes("amount") || lk.includes("price") || lk.includes("total") || lk.includes("balance")) return DollarSign;
  if (lk.includes("product") || lk.includes("quantity") || lk.includes("stock")) return Package;
  return FileText;
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataFieldRow({ label, value }: { label: string; value: any }) {
  const Icon = getFieldIcon(label);
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-xs font-medium text-muted-foreground min-w-[80px]">{formatLabel(label)}</span>
      <span className="text-xs text-foreground break-all flex-1">{formatValue(value)}</span>
    </div>
  );
}

function getRecordSummary(table: string, data: Record<string, any>): string {
  if (table === "city_recovery") {
    const recovery = data.recovery || {};
    const count = data.clientAmounts?.length || 0;
    return `${recovery.city || "City"} Recovery — Rs. ${(recovery.amount || 0).toLocaleString()} (${count} clients)`;
  }
  if (data.invoice_number) return `Invoice: ${data.invoice_number}`;
  if (data.name) return data.name;
  if (data.client_name) return data.client_name;
  if (data.article_number) return `Article: ${data.article_number}`;
  if (data.phone) return `Phone: ${data.phone}`;
  if (data.amount) return `Amount: Rs. ${data.amount.toLocaleString()}`;
  return "Record";
}

function SyncEntryCard({ 
  entry, 
  onSync, 
  onDelete 
}: { 
  entry: SyncEntryWithStatus; 
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isSyncable = entry.status === "pending" || entry.status === "failed";

  const dataKeys = Object.keys(entry.data || {}).filter(k => !["id", "created_at", "updated_at"].includes(k));
  const importantKeys = dataKeys.filter(k => 
    ["name", "invoice_number", "amount", "client_id", "phone", "article_number", "total"].includes(k)
  );
  const previewKeys = importantKeys.length > 0 ? importantKeys.slice(0, 3) : dataKeys.slice(0, 3);

  return (
    <div className="border border-border rounded-lg p-3 bg-card space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {entry.table.replace(/_/g, " ")}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
            {entry.operation}
          </Badge>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Record Summary */}
      <p className="text-sm font-medium text-foreground truncate">
        {getRecordSummary(entry.data || {})}
      </p>

      {/* Preview fields */}
      <div className="bg-muted/30 rounded-md p-2 space-y-0.5">
        {previewKeys.map(key => (
          <DataFieldRow key={key} label={key} value={(entry.data as Record<string, any>)[key]} />
        ))}
        {dataKeys.length > previewKeys.length && (
          <p className="text-[10px] text-muted-foreground pt-1">
            +{dataKeys.length - previewKeys.length} more fields
          </p>
        )}
      </div>

      {/* Expandable full data */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground w-full justify-start gap-1">
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {open ? "Hide all fields" : "View all fields"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 bg-muted/50 rounded-md p-2 space-y-0.5 max-h-60 overflow-auto">
            {dataKeys.map(key => (
              <DataFieldRow key={key} label={key} value={(entry.data as Record<string, any>)[key]} />
            ))}
          </div>
          {entry.lastError && (
            <div className="mt-2 p-2 bg-destructive/10 rounded-md">
              <p className="text-[11px] text-destructive font-medium">Error: {entry.lastError}</p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            Queued: {new Date(entry.createdAt).toLocaleString()} · Retries: {entry.retryCount}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-between items-center pt-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete sync entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this entry from the sync queue. The data will not be synced to the server.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(entry.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="sm"
          variant={isSyncable ? "default" : "secondary"}
          className="h-7 text-xs px-3"
          disabled={!isSyncable || entry.status === "syncing"}
          onClick={() => onSync(entry.id)}
        >
          {entry.status === "syncing" ? (
            <><RefreshCw className="w-3 h-3 animate-spin mr-1" /> Syncing...</>
          ) : entry.status === "synced" ? (
            <><Check className="w-3 h-3 mr-1" /> Synced</>
          ) : (
            <><RefreshCw className="w-3 h-3 mr-1" /> Sync Now</>
          )}
        </Button>
      </div>
    </div>
  );
}

export function PendingSyncsPanel() {
  const { entries, refreshEntries, syncSingleEntry, deleteSyncEntry, syncPendingChanges, isSyncing, isOnline } = useOfflineSyncContext();

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  const pendingEntries = entries.filter(e => e.status !== "synced");
  const syncedEntries = entries.filter(e => e.status === "synced");

  return (
    <div className="flex flex-col h-full">
      {/* Header actions */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pending Syncs</h3>
          <p className="text-xs text-muted-foreground">{pendingEntries.length} pending · {syncedEntries.length} synced</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={refreshEntries}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => syncPendingChanges()}
            disabled={isSyncing || !isOnline || pendingEntries.length === 0}
          >
            {isSyncing ? (
              <><RefreshCw className="w-3 h-3 animate-spin mr-1" /> Syncing All...</>
            ) : (
              "Sync All"
            )}
          </Button>
        </div>
      </div>

      {/* Entries list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">All changes are synced!</p>
              <p className="text-xs mt-1">No pending offline changes.</p>
            </div>
          ) : (
            entries.map(entry => (
              <SyncEntryCard 
                key={entry.id} 
                entry={entry} 
                onSync={syncSingleEntry} 
                onDelete={deleteSyncEntry}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
