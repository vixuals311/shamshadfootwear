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
  deleteSyncEntry: (entryId: string) => Promise<void>;
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

      // Handle consolidated city_recovery specially
      if (table === "city_recovery") {
        const { recovery, clientAmounts, clientBalanceUpdates } = data as any;
        
        // Insert recovery (without the offline ID)
        const { id: _, ...recoveryWithoutId } = recovery;
        const { data: recoveryResult, error: recoveryError } = await supabase
          .from("recoveries")
          .insert(recoveryWithoutId)
          .select()
          .single();
        
        if (recoveryError) {
          error = recoveryError;
        } else {
          // Insert client amounts with the real recovery ID
          const amountInserts = clientAmounts.map((ca: any) => ({
            recovery_id: recoveryResult.id,
            client_id: ca.client_id,
            amount: ca.amount,
          }));
          
          const { error: amountsError } = await supabase
            .from("recovery_client_amounts")
            .insert(amountInserts);
          
          if (amountsError) {
            error = amountsError;
          } else {
            // Update client balances
            for (const update of clientBalanceUpdates) {
              await supabase
                .from("clients")
                .update({ current_balance: update.new_balance })
                .eq("id", update.client_id);
            }
            
            // Log audit
            try {
              await supabase.from("audit_logs").insert({
                action: "create",
                entity_type: "recovery",
                entity_id: recoveryResult.id,
                details: { type: "city", city: recovery.city, amount: recovery.amount, clients: clientAmounts.length, synced_from_offline: true },
              });
            } catch { /* ignore audit error */ }
          }
        }
      } else {
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

  const deleteSyncEntry = useCallback(async (entryId: string) => {
    try {
      await removeSyncEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast.success("Entry removed from sync queue.");
    } catch (err: any) {
      console.error(`[OfflineSync] Failed to delete entry ${entryId}:`, err);
      toast.error("Failed to remove entry.");
    }
  }, []);

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
    deleteSyncEntry,
  }), [sync.isOnline, sync.pendingCount, sync.isSyncing, sync.lastSyncTime, sync.cacheAllData, sync.syncPendingChanges, entries, refreshEntries, syncSingleEntry, deleteSyncEntry]);

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
