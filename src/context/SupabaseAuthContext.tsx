import { createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useSupabaseAuth, Profile, Notification, AppRole } from "@/hooks/useAuth";
import { RolePermissions, ROLE_PERMISSIONS } from "@/types";

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  signOut: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  getPermissions: () => RolePermissions | null;
  refetchProfile: () => void;
  refetchNotifications: () => void;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!auth.role) return false;
    return ROLE_PERMISSIONS[auth.role][permission];
  };

  const getPermissions = (): RolePermissions | null => {
    if (!auth.role) return null;
    return ROLE_PERMISSIONS[auth.role];
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        ...auth,
        hasPermission,
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
