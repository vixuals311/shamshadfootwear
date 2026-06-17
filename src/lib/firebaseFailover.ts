import { readTableFromFirebase } from "./firebase";
import { cacheTable } from "./offlineDb";

// Tables to hydrate from Firebase mirror when Cloud is unreachable.
// Mirrors the list in useFirebaseSync.ts.
const FAILOVER_TABLES = [
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
  "cheques",
] as const;

export interface FailoverResult {
  ok: boolean;
  tables: number;
  rows: number;
  failed: string[];
}

/**
 * Pulls latest snapshots from the Firebase mirror into the local IndexedDB
 * cache. The offline-first layer will then serve reads from this cache while
 * the primary backend is unreachable.
 */
export async function hydrateCacheFromFirebase(): Promise<FailoverResult> {
  let totalRows = 0;
  let okTables = 0;
  const failed: string[] = [];

  for (const table of FAILOVER_TABLES) {
    try {
      const rows = await readTableFromFirebase(table);
      await cacheTable(table, rows);
      totalRows += rows.length;
      okTables += 1;
    } catch (err) {
      console.error(`[Failover] Could not hydrate ${table} from Firebase:`, err);
      failed.push(table);
    }
  }

  return {
    ok: failed.length === 0,
    tables: okTables,
    rows: totalRows,
    failed,
  };
}