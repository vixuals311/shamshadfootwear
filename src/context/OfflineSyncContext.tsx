import React, { createContext, useContext } from "react";
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

  return (
    <OfflineSyncContext.Provider value={sync}>
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
