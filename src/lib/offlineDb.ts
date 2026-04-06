import { get, set, del, keys, clear, createStore } from "idb-keyval";

// Create separate stores for data and sync queue
const dataStore = createStore("sf-offline-data", "cache");
const syncStore = createStore("sf-offline-sync", "queue");

// Sync queue entry
export interface SyncQueueEntry {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete" | "upsert";
  data: Record<string, any>;
  recordId?: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

// --- Sync Queue Operations ---

export async function addToSyncQueue(
  entry: Omit<SyncQueueEntry, "id" | "createdAt" | "retryCount">
) {
  const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: SyncQueueEntry = {
    ...entry,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await set(id, full, syncStore);
}

export async function getPendingSyncCount(): Promise<number> {
  const allKeys = await keys(syncStore);
  return allKeys.length;
}

export async function getPendingSyncEntries(): Promise<SyncQueueEntry[]> {
  const allKeys = await keys(syncStore);
  const entries: SyncQueueEntry[] = [];
  for (const key of allKeys) {
    const entry = await get<SyncQueueEntry>(key, syncStore);
    if (entry) entries.push(entry);
  }
  return entries.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function removeSyncEntry(id: string) {
  await del(id, syncStore);
}

export async function markSyncEntryFailed(id: string, error: string) {
  const entry = await get<SyncQueueEntry>(id, syncStore);
  if (entry) {
    entry.retryCount += 1;
    entry.lastError = error;
    await set(id, entry, syncStore);
  }
}

// --- Data Cache Operations ---

function cacheKey(table: string) {
  return `table_${table}`;
}

export async function cacheTable(tableName: string, data: any[]) {
  await set(cacheKey(tableName), data, dataStore);
  await set(
    `meta_${tableName}`,
    { lastSynced: new Date().toISOString(), count: data.length },
    dataStore
  );
}

export async function getCachedData(tableName: string): Promise<any[]> {
  return (await get<any[]>(cacheKey(tableName), dataStore)) || [];
}

export async function getCacheMeta(tableName: string): Promise<{ lastSynced: string; count: number } | null> {
  return (await get<{ lastSynced: string; count: number }>(`meta_${tableName}`, dataStore)) || null;
}

export async function getLastCacheTime(): Promise<string | null> {
  // Get the oldest "lastSynced" across all cached tables to represent overall freshness
  const allKeys = await keys(dataStore);
  const metaKeys = (allKeys as string[]).filter((k) => typeof k === "string" && k.startsWith("meta_"));
  let oldest: string | null = null;
  for (const key of metaKeys) {
    const meta = await get<{ lastSynced: string }>(key, dataStore);
    if (meta?.lastSynced) {
      if (!oldest || meta.lastSynced < oldest) oldest = meta.lastSynced;
    }
  }
  return oldest;
}

export async function updateCachedRecord(
  tableName: string,
  recordId: string,
  data: Record<string, any>
) {
  const cached = await getCachedData(tableName);
  const idx = cached.findIndex((r) => r.id === recordId);
  if (idx >= 0) {
    cached[idx] = { ...cached[idx], ...data };
  } else {
    cached.push(data);
  }
  await set(cacheKey(tableName), cached, dataStore);
}

export async function removeCachedRecord(tableName: string, recordId: string) {
  const cached = await getCachedData(tableName);
  await set(
    cacheKey(tableName),
    cached.filter((r) => r.id !== recordId),
    dataStore
  );
}

export async function clearOfflineData() {
  await clear(dataStore);
  await clear(syncStore);
}
