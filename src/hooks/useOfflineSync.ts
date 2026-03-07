import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  addToSyncQueue,
  getPendingSyncCount,
  getPendingSyncEntries,
  removeSyncEntry,
  markSyncEntryFailed,
  cacheTable,
  getCachedData,
  updateCachedRecord,
  removeCachedRecord,
  type SyncQueueEntry,
} from "@/lib/offlineDb";

// Tables to cache for offline use
const CACHEABLE_TABLES = [
  "products",
  "product_size_bundles",
  "brands",
  "clients",
  "invoices",
  "invoice_items",
  "recoveries",
  "recovery_client_amounts",
  "payment_accounts",
  "manual_bills",
] as const;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const syncInProgress = useRef(false);

  // Track online/offline status
  const syncRef = useRef<() => Promise<void>>();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncRef.current?.();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };
    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cache all tables when online
  const cacheAllData = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      for (const tableName of CACHEABLE_TABLES) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(5000);

        if (!error && data) {
          await cacheTable(tableName, data);
        }
      }
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error("Error caching data:", error);
    }
  }, []);

  // Initial cache on mount if online
  useEffect(() => {
    if (navigator.onLine) {
      cacheAllData();
    }
  }, [cacheAllData]);

  // Periodic background cache refresh (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        cacheAllData();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cacheAllData]);

  // Process sync queue
  const syncPendingChanges = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const entries = await getPendingSyncEntries();

      for (const entry of entries) {
        try {
          await processSyncEntry(entry);
          await removeSyncEntry(entry.id);
        } catch (error: any) {
          console.error(`Sync failed for entry ${entry.id}:`, error);
          await markSyncEntryFailed(entry.id, error.message || "Unknown error");

          if ((entry.retryCount || 0) >= 5) {
            console.warn(`Removing sync entry ${entry.id} after 5 failures`);
            await removeSyncEntry(entry.id);
          }
        }
      }

      await cacheAllData();
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch (error) {
      console.error("Sync process error:", error);
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [cacheAllData]);

  // Keep ref updated for event handlers
  syncRef.current = syncPendingChanges;

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    cacheAllData,
    syncPendingChanges,
  };
}

// Process a single sync queue entry
async function processSyncEntry(entry: SyncQueueEntry) {
  const { table, operation, data, recordId } = entry;

  switch (operation) {
    case "insert": {
      const { error } = await supabase.from(table as any).insert(data as any);
      if (error) throw error;
      break;
    }
    case "update": {
      if (!recordId) throw new Error("recordId required for update");
      const { error } = await supabase
        .from(table as any)
        .update(data as any)
        .eq("id", recordId);
      if (error) throw error;
      break;
    }
    case "delete": {
      if (!recordId) throw new Error("recordId required for delete");
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", recordId);
      if (error) throw error;
      break;
    }
    case "upsert": {
      const { error } = await supabase.from(table as any).upsert(data as any);
      if (error) throw error;
      break;
    }
  }
}

// Helper: Execute a Supabase query with offline fallback
export async function offlineQuery<T = any>(
  tableName: string,
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; fromCache: boolean }> {
  if (navigator.onLine) {
    try {
      const result = await queryFn();
      if (!result.error && result.data) {
        if (Array.isArray(result.data)) {
          await cacheTable(tableName, result.data);
        }
      }
      return { ...result, fromCache: false };
    } catch {
      // Network error - fall through to cache
    }
  }

  const cachedData = await getCachedData(tableName);
  return { data: cachedData as T, error: null, fromCache: true };
}

// Helper: Execute a mutation with offline queue fallback
export async function offlineMutation(
  tableName: string,
  operation: "insert" | "update" | "delete" | "upsert",
  data: Record<string, any>,
  recordId?: string
): Promise<{ queued: boolean; error?: string }> {
  if (navigator.onLine) {
    try {
      let result: any;
      switch (operation) {
        case "insert":
          result = await supabase.from(tableName as any).insert(data as any).select();
          break;
        case "update":
          result = await supabase
            .from(tableName as any)
            .update(data as any)
            .eq("id", recordId!)
            .select();
          break;
        case "delete":
          result = await supabase.from(tableName as any).delete().eq("id", recordId!);
          break;
        case "upsert":
          result = await supabase.from(tableName as any).upsert(data as any).select();
          break;
      }

      if (result?.error) throw result.error;

      // Update local cache
      if (operation === "delete" && recordId) {
        await removeCachedRecord(tableName, recordId);
      } else if (result?.data) {
        const records = Array.isArray(result.data) ? result.data : [result.data];
        for (const rec of records) {
          await updateCachedRecord(tableName, rec.id, rec);
        }
      }

      return { queued: false };
    } catch {
      // Fall through to queue
    }
  }

  // Queue for later sync
  await addToSyncQueue({ table: tableName, operation, data, recordId });

  // Update local cache for immediate UI feedback
  if (operation === "delete" && recordId) {
    await removeCachedRecord(tableName, recordId);
  } else if (operation === "insert" || operation === "upsert") {
    const id = data.id || `offline_${Date.now()}`;
    await updateCachedRecord(tableName, id, { ...data, id });
  } else if (operation === "update" && recordId) {
    await updateCachedRecord(tableName, recordId, data);
  }

  return { queued: true };
}
