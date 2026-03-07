import Dexie, { type Table } from "dexie";

// Offline sync queue entry
export interface SyncQueueEntry {
  id?: number;
  table: string;
  operation: "insert" | "update" | "delete" | "upsert";
  data: Record<string, any>;
  recordId?: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

// Cache metadata
export interface CacheMeta {
  table: string;
  lastSynced: string;
  count: number;
}

class OfflineDatabase extends Dexie {
  // Sync queue
  syncQueue!: Table<SyncQueueEntry, number>;
  cacheMeta!: Table<CacheMeta, string>;

  // Cached tables (mirror of Supabase)
  products!: Table<any, string>;
  product_size_bundles!: Table<any, string>;
  brands!: Table<any, string>;
  clients!: Table<any, string>;
  invoices!: Table<any, string>;
  invoice_items!: Table<any, string>;
  recoveries!: Table<any, string>;
  recovery_client_amounts!: Table<any, string>;
  payments_cache!: Table<any, string>;
  returns_cache!: Table<any, string>;
  return_items_cache!: Table<any, string>;
  payment_accounts!: Table<any, string>;
  manual_bills!: Table<any, string>;

  constructor() {
    super("ShamshadFootwearOffline");

    this.version(1).stores({
      syncQueue: "++id, table, operation, createdAt",
      cacheMeta: "table",

      // Cached tables - index by id and common query fields
      products: "id, article_number, brand_id, gender, category, name",
      product_size_bundles: "id, product_id, size_range",
      brands: "id, name",
      clients: "id, name, city, phone",
      invoices: "id, invoice_number, client_id, status, created_at",
      invoice_items: "id, invoice_id, product_id",
      recoveries: "id, client_id, city, date, type",
      recovery_client_amounts: "id, recovery_id, client_id",
      payments_cache: "id, date, type",
      returns_cache: "id, invoice_id, client_id, created_at",
      return_items_cache: "id, return_id, product_id",
      payment_accounts: "id, name",
      manual_bills: "id, client_id, bill_number",
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Add an operation to the sync queue
export async function addToSyncQueue(entry: Omit<SyncQueueEntry, "id" | "createdAt" | "retryCount">) {
  await offlineDb.syncQueue.add({
    ...entry,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  return await offlineDb.syncQueue.count();
}

// Get all pending sync entries
export async function getPendingSyncEntries(): Promise<SyncQueueEntry[]> {
  return await offlineDb.syncQueue.orderBy("createdAt").toArray();
}

// Remove a sync entry after successful sync
export async function removeSyncEntry(id: number) {
  await offlineDb.syncQueue.delete(id);
}

// Update retry count on failure
export async function markSyncEntryFailed(id: number, error: string) {
  await offlineDb.syncQueue.update(id, {
    retryCount: (await offlineDb.syncQueue.get(id))?.retryCount ?? 0 + 1,
    lastError: error,
  });
}

// Cache a full table from Supabase
export async function cacheTable(tableName: string, data: any[]) {
  const table = getOfflineTable(tableName);
  if (!table) return;

  await offlineDb.transaction("rw", table, offlineDb.cacheMeta, async () => {
    await table.clear();
    if (data.length > 0) {
      await table.bulkPut(data);
    }
    await offlineDb.cacheMeta.put({
      table: tableName,
      lastSynced: new Date().toISOString(),
      count: data.length,
    });
  });
}

// Get cached data for a table
export async function getCachedData(tableName: string): Promise<any[]> {
  const table = getOfflineTable(tableName);
  if (!table) return [];
  return await table.toArray();
}

// Get the Dexie table by name
function getOfflineTable(tableName: string): Table | null {
  const tableMap: Record<string, Table> = {
    products: offlineDb.products,
    product_size_bundles: offlineDb.product_size_bundles,
    brands: offlineDb.brands,
    clients: offlineDb.clients,
    invoices: offlineDb.invoices,
    invoice_items: offlineDb.invoice_items,
    recoveries: offlineDb.recoveries,
    recovery_client_amounts: offlineDb.recovery_client_amounts,
    payments_cache: offlineDb.payments_cache,
    returns_cache: offlineDb.returns_cache,
    return_items_cache: offlineDb.return_items_cache,
    payment_accounts: offlineDb.payment_accounts,
    manual_bills: offlineDb.manual_bills,
  };
  return tableMap[tableName] || null;
}

// Clear all offline data
export async function clearOfflineData() {
  await offlineDb.transaction(
    "rw",
    [
      offlineDb.syncQueue,
      offlineDb.cacheMeta,
      offlineDb.products,
      offlineDb.product_size_bundles,
      offlineDb.brands,
      offlineDb.clients,
      offlineDb.invoices,
      offlineDb.invoice_items,
      offlineDb.recoveries,
      offlineDb.recovery_client_amounts,
      offlineDb.payments_cache,
      offlineDb.returns_cache,
      offlineDb.return_items_cache,
      offlineDb.payment_accounts,
      offlineDb.manual_bills,
    ],
    async () => {
      await offlineDb.syncQueue.clear();
      await offlineDb.cacheMeta.clear();
      await offlineDb.products.clear();
      await offlineDb.product_size_bundles.clear();
      await offlineDb.brands.clear();
      await offlineDb.clients.clear();
      await offlineDb.invoices.clear();
      await offlineDb.invoice_items.clear();
      await offlineDb.recoveries.clear();
      await offlineDb.recovery_client_amounts.clear();
      await offlineDb.payments_cache.clear();
      await offlineDb.returns_cache.clear();
      await offlineDb.return_items_cache.clear();
      await offlineDb.payment_accounts.clear();
      await offlineDb.manual_bills.clear();
    }
  );
}
