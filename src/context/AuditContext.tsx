import { createContext, useContext, useState, ReactNode } from "react";
import { AuditLog, AuditAction, AuditEntity } from "@/types";

interface AuditContextType {
  logs: AuditLog[];
  addLog: (
    userId: string,
    userName: string,
    action: AuditAction,
    entity: AuditEntity,
    entityId?: string,
    entityName?: string,
    details?: string
  ) => void;
  getLogsByEntity: (entity: AuditEntity) => AuditLog[];
  getLogsByUser: (userId: string) => AuditLog[];
  getRecentLogs: (limit?: number) => AuditLog[];
  clearLogs: () => void;
}

const AuditContext = createContext<AuditContextType | null>(null);

const initialLogs: AuditLog[] = [
  {
    id: "1",
    userId: "1",
    userName: "Admin User",
    action: "login",
    entity: "user",
    details: "Logged in successfully",
    timestamp: new Date("2026-02-02T09:00:00"),
  },
  {
    id: "2",
    userId: "1",
    userName: "Admin User",
    action: "create",
    entity: "product",
    entityId: "1",
    entityName: "Classic Chappal",
    details: "Added new product to inventory",
    timestamp: new Date("2026-02-02T09:15:00"),
  },
  {
    id: "3",
    userId: "2",
    userName: "Biller User",
    action: "create",
    entity: "invoice",
    entityId: "INV-2026-0001",
    entityName: "Ahmed Traders",
    details: "Created invoice for Rs 5,280",
    timestamp: new Date("2026-02-02T10:30:00"),
  },
];

export function AuditProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);

  const addLog = (
    userId: string,
    userName: string,
    action: AuditAction,
    entity: AuditEntity,
    entityId?: string,
    entityName?: string,
    details?: string
  ) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      userId,
      userName,
      action,
      entity,
      entityId,
      entityName,
      details,
      timestamp: new Date(),
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const getLogsByEntity = (entity: AuditEntity): AuditLog[] => {
    return logs.filter((log) => log.entity === entity);
  };

  const getLogsByUser = (userId: string): AuditLog[] => {
    return logs.filter((log) => log.userId === userId);
  };

  const getRecentLogs = (limit: number = 50): AuditLog[] => {
    return logs.slice(0, limit);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <AuditContext.Provider
      value={{
        logs,
        addLog,
        getLogsByEntity,
        getLogsByUser,
        getRecentLogs,
        clearLogs,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error("useAudit must be used within an AuditProvider");
  }
  return context;
}
