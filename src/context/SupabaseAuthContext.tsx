import { createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useSupabaseAuth, Profile, Notification, AppRole } from "@/hooks/useAuth";
import { RolePermissions, ROLE_PERMISSIONS, PageKey } from "@/types";
import type { ActiveSession } from "@/components/auth/DeviceLimitDialog";

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  sessionTimeoutMinutes: number;
  pageAccess: Record<PageKey, boolean>;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  sessionChecked: boolean;
  signOut: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  hasPageAccess: (pageKey: PageKey) => boolean;
  getPermissions: () => RolePermissions | null;
  refetchProfile: () => void;
  refetchNotifications: () => void;
  refetchPageAccess: () => void;
  deviceLimitReached: boolean;
  activeSessions: ActiveSession[];
  maxDevices: number;
  terminateSessionAndContinue: (sessionId: string) => Promise<void>;
  cancelDeviceLimit: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!auth.role) return false;
    return ROLE_PERMISSIONS[auth.role]?.[permission] ?? false;
  };

  const hasPageAccess = (pageKey: PageKey): boolean => {
    if (!auth.role) return false;
    if (auth.role === "admin") return true;
    if (pageKey === "users") return false;

    if (pageKey in auth.pageAccess) {
      return auth.pageAccess[pageKey] ?? false;
    }

    return ROLE_PERMISSIONS[auth.role]?.canManageUsers === true && pageKey === "users"
      ? true
      : false;
  };

  const getPermissions = (): RolePermissions | null => {
    if (!auth.role) return null;
    return ROLE_PERMISSIONS[auth.role] ?? null;
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        ...auth,
        hasPermission,
        hasPageAccess,
        getPermissions,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuthContext() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuthContext must be used within a SupabaseAuthProvider");
  }
  return context;
}
