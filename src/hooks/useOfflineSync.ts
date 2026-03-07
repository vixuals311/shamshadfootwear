import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  offlineDb,
  addToSyncQueue,
  getPendingSyncCount,
  getPendingSyncEntries,
  removeSyncEntry,
  markSyncEntryFailed,
  cacheTable,
  getCachedData,
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

type CacheableTable = (typeof CACHEABLE_TABLES)[number];

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const syncInProgress = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncPendingChanges();
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

  // Periodic background cache refresh (every 5 minutes when online)
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
          await removeSyncEntry(entry.id!);
        } catch (error: any) {
          console.error(`Sync failed for entry ${entry.id}:`, error);
          await markSyncEntryFailed(entry.id!, error.message || "Unknown error");

          // Skip entries that have failed too many times
          if ((entry.retryCount || 0) >= 5) {
            console.warn(`Removing sync entry ${entry.id} after 5 failures`);
            await removeSyncEntry(entry.id!);
          }
        }
      }

      // Refresh cache after sync
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

  // Map cache table names back to real Supabase table names
  const realTable = table
    .replace("_cache", "")
    .replace("payments_cache", "invoices"); // payments are derived, not a direct table

  switch (operation) {
    case "insert": {
      const { error } = await supabase.from(realTable).insert(data);
      if (error) throw error;
      break;
    }
    case "update": {
      if (!recordId) throw new Error("recordId required for update");
      const { error } = await supabase
        .from(realTable)
        .update(data)
        .eq("id", recordId);
      if (error) throw error;
      break;
    }
    case "delete": {
      if (!recordId) throw new Error("recordId required for delete");
      const { error } = await supabase
        .from(realTable)
        .delete()
        .eq("id", recordId);
      if (error) throw error;
      break;
    }
    case "upsert": {
      const { error } = await supabase.from(realTable).upsert(data);
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
        // Update cache with fresh data
        if (Array.isArray(result.data)) {
          await cacheTable(tableName, result.data);
        }
      }
      return { ...result, fromCache: false };
    } catch {
      // Network error - fall through to cache
    }
  }

  // Offline or network error: use cache
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
      let result;
      switch (operation) {
        case "insert":
          result = await supabase.from(tableName).insert(data).select();
          break;
        case "update":
          result = await supabase
            .from(tableName)
            .update(data)
            .eq("id", recordId!)
            .select();
          break;
        case "delete":
          result = await supabase.from(tableName).delete().eq("id", recordId!);
          break;
        case "upsert":
          result = await supabase.from(tableName).upsert(data).select();
          break;
      }

      if (result?.error) {
        throw result.error;
      }

      // Also update local cache
      if (operation === "delete") {
        const table = (offlineDb as any)[tableName];
        if (table && recordId) {
          await table.delete(recordId);
        }
      } else if (result?.data) {
        const table = (offlineDb as any)[tableName];
        if (table) {
          await table.bulkPut(Array.isArray(result.data) ? result.data : [result.data]);
        }
      }

      return { queued: false };
    } catch {
      // Fall through to queue
    }
  }

  // Queue for later sync
  await addToSyncQueue({ table: tableName, operation, data, recordId });

  // Also update local cache for immediate UI feedback
  const table = (offlineDb as any)[tableName];
  if (table) {
    if (operation === "delete" && recordId) {
      await table.delete(recordId);
    } else if (operation === "insert" || operation === "upsert") {
      await table.put(data);
    } else if (operation === "update" && recordId) {
      const existing = await table.get(recordId);
      if (existing) {
        await table.put({ ...existing, ...data });
      }
    }
  }

  return { queued: true };
}
