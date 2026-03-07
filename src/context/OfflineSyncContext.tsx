import React, { createContext, useContext, useMemo } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  cacheAllData: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const sync = useOfflineSync();

  const value = useMemo(() => ({
    isOnline: sync.isOnline,
    pendingCount: sync.pendingCount,
    isSyncing: sync.isSyncing,
    lastSyncTime: sync.lastSyncTime,
    cacheAllData: sync.cacheAllData,
    syncPendingChanges: sync.syncPendingChanges,
  }), [sync.isOnline, sync.pendingCount, sync.isSyncing, sync.lastSyncTime, sync.cacheAllData, sync.syncPendingChanges]);

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
