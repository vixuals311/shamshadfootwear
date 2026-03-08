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
  const hasCachedInitially = useRef(false);

  // Track online/offline status
  const syncRef = useRef<() => Promise<void>>();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log("[OfflineSync] Back online — refreshing auth session before syncing...");
      
      try {
        // Force refresh the auth token first
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("[OfflineSync] Auth refresh failed:", error.message);
          // Still try to sync — the token might still be valid
        } else {
          console.log("[OfflineSync] Auth session refreshed successfully");
        }
      } catch (e) {
        console.warn("[OfflineSync] Auth refresh error:", e);
      }

      // Small delay to let everything settle, then sync
      setTimeout(() => {
        console.log("[OfflineSync] Starting sync of pending changes...");
        syncRef.current?.();
      }, 1000);
    };
    const handleOffline = () => {
      console.log("[OfflineSync] Went offline");
      setIsOnline(false);
    };

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
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Cache all tables when online
  const cacheAllData = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const promises = CACHEABLE_TABLES.map(async (tableName) => {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(5000);

        if (!error && data) {
          await cacheTable(tableName, data);
        }
      });

      await Promise.all(promises);
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error("Error caching data:", error);
    }
  }, []);

  // Initial cache on first load when online (once only)
  useEffect(() => {
    if (navigator.onLine && !hasCachedInitially.current) {
      hasCachedInitially.current = true;
      cacheAllData();
    }
  }, [cacheAllData]);

  // Process sync queue
  const syncPendingChanges = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) {
      console.log("[OfflineSync] Sync skipped:", { inProgress: syncInProgress.current, online: navigator.onLine });
      return;
    }
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const entries = await getPendingSyncEntries();
      console.log(`[OfflineSync] Processing ${entries.length} pending entries`);

      for (const entry of entries) {
        try {
          console.log(`[OfflineSync] Syncing: ${entry.operation} on ${entry.table}`, entry.data);
          await processSyncEntry(entry);
          await removeSyncEntry(entry.id);
          console.log(`[OfflineSync] ✓ Synced entry ${entry.id}`);
        } catch (error: any) {
          console.error(`[OfflineSync] ✗ Sync failed for entry ${entry.id}:`, error);
          await markSyncEntryFailed(entry.id, error.message || "Unknown error");

          if ((entry.retryCount || 0) >= 5) {
            console.warn(`[OfflineSync] Removing entry ${entry.id} after 5 failures`);
            await removeSyncEntry(entry.id);
          }
        }
      }

      await cacheAllData();
      const count = await getPendingSyncCount();
      setPendingCount(count);
      console.log(`[OfflineSync] Sync complete. Remaining: ${count}`);
    } catch (error) {
      console.error("[OfflineSync] Sync process error:", error);
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
    } catch (err) {
      console.warn("[OfflineSync] Online mutation failed, queuing for later:", err);
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
