import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { getPendingSyncEntries, removeSyncEntry, markSyncEntryFailed, type SyncQueueEntry } from "@/lib/offlineDb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SyncEntryStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncEntryWithStatus extends SyncQueueEntry {
  status: SyncEntryStatus;
}

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  cacheAllData: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  entries: SyncEntryWithStatus[];
  refreshEntries: () => Promise<void>;
  syncSingleEntry: (entryId: string) => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const sync = useOfflineSync();
  const [entries, setEntries] = useState<SyncEntryWithStatus[]>([]);

  const refreshEntries = useCallback(async () => {
    const pending = await getPendingSyncEntries();
    setEntries(pending.map(e => ({ ...e, status: "pending" as SyncEntryStatus })));
  }, []);

  const syncSingleEntry = useCallback(async (entryId: string) => {
    if (!navigator.onLine) {
      toast.error("You are offline. Cannot sync now.");
      return;
    }

    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "syncing" } : e));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          toast.error("Please log in first to sync.");
          setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "failed" } : e));
          return;
        }
      }

      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      // Process single entry using inline logic
      const { table, operation, data, recordId } = entry;
      let error: any = null;

      switch (operation) {
        case "insert": {
          const res = await supabase.from(table as any).insert(data as any);
          error = res.error;
          break;
        }
        case "update": {
          if (!recordId) throw new Error("recordId required");
          const res = await supabase.from(table as any).update(data as any).eq("id", recordId);
          error = res.error;
          break;
        }
        case "delete": {
          if (!recordId) throw new Error("recordId required");
          const res = await supabase.from(table as any).delete().eq("id", recordId);
          error = res.error;
          break;
        }
        case "upsert": {
          const res = await supabase.from(table as any).upsert(data as any);
          error = res.error;
          break;
        }
      }

      if (error) {
        // If duplicate key, still consider it synced (already exists)
        if (error.code === "23505") {
          await removeSyncEntry(entryId);
          setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "synced" } : e));
          toast.success("Entry already exists — marked as synced.");
          return;
        }
        throw error;
      }

      await removeSyncEntry(entryId);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "synced" } : e));
      toast.success("Entry synced successfully.");
    } catch (err: any) {
      console.error(`[OfflineSync] Single sync failed for ${entryId}:`, err);
      await markSyncEntryFailed(entryId, err.message || "Unknown error");
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "failed", lastError: err.message } : e));
      toast.error(`Sync failed: ${err.message || "Unknown error"}`);
    }
  }, [entries]);

  const value = useMemo(() => ({
    isOnline: sync.isOnline,
    pendingCount: sync.pendingCount,
    isSyncing: sync.isSyncing,
    lastSyncTime: sync.lastSyncTime,
    cacheAllData: sync.cacheAllData,
    syncPendingChanges: sync.syncPendingChanges,
    entries,
    refreshEntries,
    syncSingleEntry,
  }), [sync.isOnline, sync.pendingCount, sync.isSyncing, sync.lastSyncTime, sync.cacheAllData, sync.syncPendingChanges, entries, refreshEntries, syncSingleEntry]);

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSyncContext must be used within OfflineSyncProvider");
  }
  return context;
}
