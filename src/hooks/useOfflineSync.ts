import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("[OfflineSync] Auth refresh failed:", error.message);
        } else {
          console.log("[OfflineSync] Auth session refreshed successfully");
        }
      } catch (e) {
        console.warn("[OfflineSync] Auth refresh error:", e);
      }

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
    if (syncInProgress.current) {
      console.log("[OfflineSync] Sync already in progress, skipping");
      return;
    }
    if (!navigator.onLine) {
      console.log("[OfflineSync] Offline, cannot sync");
      toast.error("You are offline. Please connect to the internet to sync.");
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      // Ensure we have a valid auth session before syncing
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("[OfflineSync] No active auth session — attempting refresh...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error("[OfflineSync] Auth refresh failed — user must log in");
          toast.error("Please log in first to sync your pending changes.");
          return;
        }
        console.log("[OfflineSync] Auth session refreshed successfully");
      }

      const entries = await getPendingSyncEntries();
      console.log(`[OfflineSync] Processing ${entries.length} pending entries`);

      if (entries.length === 0) {
        toast.info("No pending changes to sync.");
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const entry of entries) {
        try {
          console.log(`[OfflineSync] Syncing: ${entry.operation} on ${entry.table}`, entry.data);
          await processSyncEntry(entry);
          await removeSyncEntry(entry.id);
          synced++;
          console.log(`[OfflineSync] ✓ Synced entry ${entry.id}`);
        } catch (error: any) {
          console.error(`[OfflineSync] ✗ Sync failed for entry ${entry.id}:`, error);
          
          // If auth error, try refreshing session once and retry
          if (error?.message?.includes("JWT") || error?.code === "PGRST301" || error?.message?.includes("401")) {
            console.log("[OfflineSync] Auth error detected, refreshing session...");
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError) {
              try {
                await processSyncEntry(entry);
                await removeSyncEntry(entry.id);
                synced++;
                console.log(`[OfflineSync] ✓ Synced entry ${entry.id} after auth refresh`);
                continue;
              } catch (retryError: any) {
                console.error(`[OfflineSync] ✗ Retry also failed:`, retryError);
                await markSyncEntryFailed(entry.id, retryError.message || "Unknown error");
                failed++;
              }
            } else {
              await markSyncEntryFailed(entry.id, error.message || "Auth refresh failed");
              failed++;
            }
          } else {
            await markSyncEntryFailed(entry.id, error.message || "Unknown error");
            failed++;
          }

          if ((entry.retryCount || 0) >= 5) {
            console.warn(`[OfflineSync] Removing entry ${entry.id} after 5 failures`);
            await removeSyncEntry(entry.id);
          }
        }
      }

      await cacheAllData();
      const count = await getPendingSyncCount();
      setPendingCount(count);

      // Show result toast
      if (failed === 0 && synced > 0) {
        toast.success(`Successfully synced ${synced} change${synced !== 1 ? "s" : ""}.`);
      } else if (synced > 0 && failed > 0) {
        toast.warning(`Synced ${synced} change${synced !== 1 ? "s" : ""}, ${failed} failed. Will retry later.`);
      } else if (failed > 0 && synced === 0) {
        toast.error(`Sync failed for ${failed} change${failed !== 1 ? "s" : ""}. Will retry later.`);
      }

      console.log(`[OfflineSync] Sync complete. Synced: ${synced}, Failed: ${failed}, Remaining: ${count}`);
    } catch (error) {
      console.error("[OfflineSync] Sync process error:", error);
      toast.error("Sync failed. Please try again.");
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

// Process a single sync queue entry — smart conflict resolution:
// - Same user duplicate → skip/update existing
// - Different users, same data → keep both
// - Different users, same time → dedupe (avoid exact duplicates)
async function processSyncEntry(entry: SyncQueueEntry) {
  const { table, operation, data, recordId } = entry;

  // Handle consolidated city_recovery
  if (table === "city_recovery") {
    const { recovery, clientAmounts, clientBalanceUpdates } = data as any;
    const { id: _, ...recoveryWithoutId } = recovery;
    
    const { data: recoveryResult, error: recoveryError } = await supabase
      .from("recoveries")
      .insert(recoveryWithoutId)
      .select()
      .single();
    
    if (recoveryError) throw recoveryError;

    const amountInserts = clientAmounts.map((ca: any) => ({
      recovery_id: recoveryResult.id,
      client_id: ca.client_id,
      amount: ca.amount,
    }));
    
    const { error: amountsError } = await supabase
      .from("recovery_client_amounts")
      .insert(amountInserts);
    if (amountsError) throw amountsError;

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
    } catch { /* ignore */ }
    
    return;
  }

  const offlineUserId = (data as any)?.created_by || (data as any)?.recorded_by || null;

  switch (operation) {
    case "insert": {
      const { error } = await supabase.from(table as any).insert(data as any);
      if (error) {
        // Duplicate key conflict
        if (error.code === "23505") {
          // Check if same user made this entry
          const { data: existing } = await supabase
            .from(table as any)
            .select("*")
            .eq("id", (data as any).id)
            .maybeSingle();

          if (existing) {
            const existingRecord = existing as Record<string, any>;
            const existingUserId = existingRecord.created_by || existingRecord.recorded_by;
            
            if (existingUserId === offlineUserId) {
              // Same user → skip duplicate
              console.log(`[OfflineSync] Same user duplicate on insert — skipping`);
              return;
            }
            
            // Check for exact duplicate (same data at same time from different users)
            const existingCreatedAt = new Date(existingRecord.created_at).getTime();
            const offlineCreatedAt = new Date(entry.createdAt).getTime();
            const timeDiff = Math.abs(existingCreatedAt - offlineCreatedAt);
            
            if (timeDiff < 5000) { // Within 5 seconds = likely exact duplicate
              console.log(`[OfflineSync] Exact duplicate from different users at same time — skipping`);
              return;
            }
          }

          // Different user, different time → keep both
          console.log(`[OfflineSync] Different user conflict on insert — keeping both`);
          const newData = { ...data, id: crypto.randomUUID() };
          const { error: retryError } = await supabase.from(table as any).insert(newData as any);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      break;
    }
    case "update": {
      if (!recordId) throw new Error("recordId required for update");
      
      const { data: existing, error: fetchError } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing) {
        // Record was deleted — insert our version as new (keep both)
        console.log(`[OfflineSync] Record ${recordId} deleted remotely — inserting as new record`);
        const newData = { ...data, id: crypto.randomUUID() } as any;
        const { error: insertError } = await supabase.from(table as any).insert(newData);
        if (insertError) throw insertError;
      } else {
        const existingRecord = existing as Record<string, any>;
        const serverUpdatedAt = existingRecord.updated_at;
        const offlineCreatedAt = entry.createdAt;
        const serverUserId = existingRecord.created_by || existingRecord.recorded_by || existingRecord.updated_by;
        
        if (serverUpdatedAt && offlineCreatedAt && new Date(serverUpdatedAt) > new Date(offlineCreatedAt)) {
          // Server was modified AFTER our offline change
          
          if (serverUserId === offlineUserId) {
            // Same user made both changes → apply our update (latest wins for same user)
            console.log(`[OfflineSync] Same user updated — applying latest`);
            const { error: updateError } = await supabase
              .from(table as any)
              .update(data as any)
              .eq("id", recordId);
            if (updateError) throw updateError;
          } else {
            // Different users → keep both versions
            console.log(`[OfflineSync] Different user conflict on ${table}/${recordId} — keeping both`);
            const newData: Record<string, any> = { ...data, id: crypto.randomUUID() };
            delete newData.updated_at;
            delete newData.created_at;
            const { error: insertError } = await supabase.from(table as any).insert(newData as any);
            if (insertError) {
              console.warn(`[OfflineSync] Could not keep both — applying update instead:`, insertError.message);
              const { error: updateError } = await supabase
                .from(table as any)
                .update(data as any)
                .eq("id", recordId);
              if (updateError) throw updateError;
            }
          }
        } else {
          // No conflict or our change is newer
          const { error: updateError } = await supabase
            .from(table as any)
            .update(data as any)
            .eq("id", recordId);
          if (updateError) throw updateError;
        }
      }
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
      if (error) {
        if (error.code === "23505") {
          // Check existing record for user comparison
          const { data: existing } = await supabase
            .from(table as any)
            .select("*")
            .eq("id", (data as any).id)
            .maybeSingle();

          if (existing) {
            const existingRecord = existing as Record<string, any>;
            const existingUserId = existingRecord.created_by || existingRecord.recorded_by;
            
            if (existingUserId === offlineUserId) {
              console.log(`[OfflineSync] Same user upsert conflict — updating existing`);
              const { error: updateError } = await supabase
                .from(table as any)
                .update(data as any)
                .eq("id", (data as any).id);
              if (updateError) throw updateError;
              return;
            }
          }

          console.log(`[OfflineSync] Different user conflict on upsert — keeping both`);
          const newData = { ...data, id: crypto.randomUUID() };
          const { error: retryError } = await supabase.from(table as any).insert(newData as any);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
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
    const id = data.id || crypto.randomUUID();
    await updateCachedRecord(tableName, id, { ...data, id });
  } else if (operation === "update" && recordId) {
    await updateCachedRecord(tableName, recordId, data);
  }

  return { queued: true };
}
