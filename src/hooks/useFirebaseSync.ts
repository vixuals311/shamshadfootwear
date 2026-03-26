import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  syncTableToFirebase,
  syncRecordToFirebase,
  deleteRecordFromFirebase,
  updateSyncMetadata,
} from "@/lib/firebase";

// All tables to keep in sync
const SYNC_TABLES = [
  "clients",
  "products",
  "product_size_bundles",
  "invoices",
  "invoice_items",
  "recoveries",
  "recovery_client_amounts",
  "returns",
  "return_items",
  "manual_bills",
  "brands",
  "payment_accounts",
  "product_categories",
  "default_size_ranges",
  "audit_logs",
  "cheques",
] as const;

type SyncTable = typeof SYNC_TABLES[number];

export function useFirebaseSync() {
  const channelsRef = useRef<any[]>([]);
  const initialSyncDoneRef = useRef(false);

  const isBackendUnavailableError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : String(error ?? "");

    return (
      message.includes("schema cache") ||
      message.includes("Failed to fetch") ||
      message.includes("Connection terminated") ||
      message.includes("database not available")
    );
  };

  // Full initial sync of all tables
  const runFullSync = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    console.log("[FirebaseSync] Starting full sync...");
    for (const table of SYNC_TABLES) {
      try {
        const { data, error } = await supabase.from(table as any).select("*");
        if (error) {
          console.error(`[FirebaseSync] Error fetching ${table}:`, error.message);

          if (isBackendUnavailableError(error)) {
            console.warn("[FirebaseSync] Backend temporarily unavailable. Pausing initial sync.");
            return false;
          }

          continue;
        }
        if (data) {
          await syncTableToFirebase(table, data);
          await updateSyncMetadata(table);
        }
      } catch (err) {
        console.error(`[FirebaseSync] Failed to sync ${table}:`, err);

        if (isBackendUnavailableError(err)) {
          console.warn("[FirebaseSync] Backend temporarily unavailable. Pausing initial sync.");
          return false;
        }
      }
    }
    console.log("[FirebaseSync] Full sync complete.");
    initialSyncDoneRef.current = true;
    return true;
  }, []);

  // Set up realtime listeners for incremental sync
  useEffect(() => {
    let isMounted = true;

    const initSync = async () => {
      const ready = await runFullSync();
      if (!isMounted || !ready) return;

      for (const table of SYNC_TABLES) {
        const channel = supabase
          .channel(`firebase-sync-${table}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            async (payload) => {
              if (!initialSyncDoneRef.current) return;

              const { eventType, new: newRecord, old: oldRecord } = payload;
              console.log(`[FirebaseSync] ${eventType} on ${table}`, payload);

              try {
                switch (eventType) {
                  case "INSERT":
                  case "UPDATE":
                    if (newRecord && (newRecord as any).id) {
                      await syncRecordToFirebase(table, (newRecord as any).id, newRecord);
                      await updateSyncMetadata(table);
                    }
                    break;
                  case "DELETE":
                    if (oldRecord && (oldRecord as any).id) {
                      await deleteRecordFromFirebase(table, (oldRecord as any).id);
                      await updateSyncMetadata(table);
                    }
                    break;
                }
              } catch (err) {
                console.error(`[FirebaseSync] Realtime sync failed for ${table}:`, err);
              }
            }
          )
          .subscribe();

        channelsRef.current.push(channel);
      }
    };

    initSync();

    return () => {
      isMounted = false;

      // Cleanup channels
      for (const channel of channelsRef.current) {
        supabase.removeChannel(channel);
      }
      channelsRef.current = [];
    };
  }, [runFullSync]);
}
