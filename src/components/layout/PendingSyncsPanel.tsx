import { useEffect } from "react";
import { useOfflineSyncContext, type SyncEntryWithStatus } from "@/context/OfflineSyncContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Check, AlertCircle, Clock, ChevronDown, ChevronUp, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

function SyncEntryCard({ entry, onSync }: { entry: SyncEntryWithStatus; onSync: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const isSyncable = entry.status === "pending" || entry.status === "failed";

  const dataKeys = Object.keys(entry.data || {}).filter(k => !["id", "created_at", "updated_at"].includes(k));
  const previewFields = dataKeys.slice(0, 3);

  return (
    <div className="border border-border rounded-lg p-3 bg-card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {entry.table}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
            {entry.operation}
          </Badge>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Preview fields */}
      <div className="flex flex-wrap gap-1">
        {previewFields.map(key => {
          const val = (entry.data as Record<string, any>)[key];
          const display = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");
          return (
            <span key={key} className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[140px]">
              <span className="font-medium">{key}:</span> {display.slice(0, 30)}
            </span>
          );
        })}
        {dataKeys.length > 3 && (
          <span className="text-[11px] text-muted-foreground">+{dataKeys.length - 3} more</span>
        )}
      </div>

      {/* Expandable full data */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground w-full justify-start gap-1">
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {open ? "Hide details" : "View full data"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 bg-muted/50 rounded p-2 text-[11px] font-mono overflow-auto max-h-40">
            <pre className="whitespace-pre-wrap break-all text-muted-foreground">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
          {entry.lastError && (
            <p className="text-[11px] text-destructive mt-1">Error: {entry.lastError}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Queued: {new Date(entry.createdAt).toLocaleString()} · Retries: {entry.retryCount}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Sync button */}
      <div className="flex justify-end">
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
  const { entries, refreshEntries, syncSingleEntry, syncPendingChanges, isSyncing, isOnline } = useOfflineSyncContext();

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
              <SyncEntryCard key={entry.id} entry={entry} onSync={syncSingleEntry} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
