import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageKey, ROLE_DEFAULT_PAGES } from "@/types";
import { useSessionManager } from "@/hooks/useSessionManager";

export type AppRole = "admin" | "manager" | "biller" | "cashier";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface PageAccess {
  page_key: PageKey;
  has_access: boolean;
}

const AUTH_CACHE_PREFIX = "sf-auth-cache";
const SESSION_INIT_TIMEOUT_MS = 4000;
const SESSION_CHECK_TIMEOUT_MS = 3000;

function getCacheKey(userId: string, key: string) {
  return `${AUTH_CACHE_PREFIX}:${userId}:${key}`;
}

function isSessionLike(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<Session> & { user?: { id?: unknown } };

  return !!(
    typeof session.access_token === "string" &&
    typeof session.refresh_token === "string" &&
    session.user &&
    typeof session.user.id === "string"
  );
}

function getStoredSession(projectRef: string): Session | null {
  try {
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as
      | Session
      | { currentSession?: Session | null; session?: Session | null }
      | null;

    const candidate =
      parsed && typeof parsed === "object" && "currentSession" in parsed
        ? parsed.currentSession
        : parsed && typeof parsed === "object" && "session" in parsed
          ? parsed.session
          : parsed;

    return isSessionLike(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function readCachedValue<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCachedValue<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures
  }
}

function buildDefaultPageAccess(role: AppRole | null): Record<PageKey, boolean> {
  const accessMap = {} as Record<PageKey, boolean>;

  if (!role) return accessMap;

  for (const pageKey of ROLE_DEFAULT_PAGES[role]) {
    accessMap[pageKey] = true;
  }

  return accessMap;
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(480);
  const [pageAccess, setPageAccess] = useState<Record<PageKey, boolean>>({} as Record<PageKey, boolean>);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { toast } = useToast();

  const sessionManager = useSessionManager(user?.id);

  // Handle remote session termination
  useEffect(() => {
    if (sessionManager.wasTerminatedRemotely) {
      toast({
        title: "Session terminated",
        description: "Your session was ended by an administrator.",
        variant: "destructive",
      });
      supabase.auth.signOut().catch(() => {});
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setSessionTimeoutMinutes(480);
      setPageAccess({} as Record<PageKey, boolean>);
      setNotifications([]);
    }
  }, [sessionManager.wasTerminatedRemotely, toast]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      setProfile(data);

      if (data) {
        writeCachedValue(getCacheKey(userId, "profile"), data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);

      const cachedProfile = readCachedValue<Profile>(getCacheKey(userId, "profile"));
      if (cachedProfile) {
        setProfile(cachedProfile);
      }
    }
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, session_timeout_minutes")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;

      const nextRole = (data?.role as AppRole) || null;
      const nextTimeout = data?.session_timeout_minutes ?? 480;

      setRole(nextRole);
      setSessionTimeoutMinutes(nextTimeout);

      if (nextRole) {
        setPageAccess((prev) =>
          Object.keys(prev).length > 0 ? prev : buildDefaultPageAccess(nextRole)
        );
      }

      writeCachedValue(getCacheKey(userId, "role"), {
        role: nextRole,
        sessionTimeoutMinutes: nextTimeout,
      });
    } catch (error) {
      console.error("Error fetching role:", error);

      const cachedRole = readCachedValue<{ role: AppRole | null; sessionTimeoutMinutes: number }>(
        getCacheKey(userId, "role")
      );

      if (cachedRole) {
        setRole(cachedRole.role);
        setSessionTimeoutMinutes(cachedRole.sessionTimeoutMinutes ?? 480);

        if (cachedRole.role) {
          setPageAccess((prev) =>
            Object.keys(prev).length > 0 ? prev : buildDefaultPageAccess(cachedRole.role)
          );
        }
      }
    }
  }, []);

  const fetchPageAccess = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc("get_user_page_access", { _user_id: userId });
      if (error) throw error;
      
      const accessMap = {} as Record<PageKey, boolean>;
      (data || []).forEach((row: { page_key: string; has_access: boolean }) => {
        accessMap[row.page_key as PageKey] = row.has_access;
      });

      const cachedRole = readCachedValue<{ role: AppRole | null }>(getCacheKey(userId, "role"));
      const nextAccessMap = Object.keys(accessMap).length > 0
        ? accessMap
        : buildDefaultPageAccess(cachedRole?.role ?? null);

      setPageAccess(nextAccessMap);
      writeCachedValue(getCacheKey(userId, "page-access"), nextAccessMap);
    } catch (error) {
      console.error("Error fetching page access:", error);

      const cachedPageAccess = readCachedValue<Record<PageKey, boolean>>(getCacheKey(userId, "page-access"));
      const cachedRole = readCachedValue<{ role: AppRole | null }>(getCacheKey(userId, "role"));

      setPageAccess(cachedPageAccess ?? buildDefaultPageAccess(cachedRole?.role ?? null));
    }
  }, []);

  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setNotifications(data || []);
      writeCachedValue(getCacheKey(userId, "notifications"), data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);

      const cachedNotifications = readCachedValue<Notification[]>(getCacheKey(userId, "notifications"));
      if (cachedNotifications) {
        setNotifications(cachedNotifications);
      }
    }
  }, []);

  const applyCachedAuthState = useCallback((userId: string) => {
    const cachedProfile = readCachedValue<Profile>(getCacheKey(userId, "profile"));
    const cachedRole = readCachedValue<{ role: AppRole | null; sessionTimeoutMinutes: number }>(
      getCacheKey(userId, "role")
    );
    const cachedPageAccess = readCachedValue<Record<PageKey, boolean>>(getCacheKey(userId, "page-access"));
    const cachedNotifications = readCachedValue<Notification[]>(getCacheKey(userId, "notifications"));

    if (cachedProfile) {
      setProfile(cachedProfile);
    }

    if (cachedRole) {
      setRole(cachedRole.role);
      setSessionTimeoutMinutes(cachedRole.sessionTimeoutMinutes ?? 480);
    }

    if (cachedPageAccess) {
      setPageAccess(cachedPageAccess);
    } else if (cachedRole?.role) {
      setPageAccess(buildDefaultPageAccess(cachedRole.role));
    }

    if (cachedNotifications) {
      setNotifications(cachedNotifications);
    }
  }, []);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const signOut = async () => {
    try {
      const userName = profile?.name || user?.email || "Unknown";
      const userId = user?.id || null;
      
      if (user) {
        const currentSessionId = sessionStorage.getItem("app_session_id");
        if (currentSessionId) {
          // Only deactivate the current tab's session, not all sessions
          await supabase
            .from("user_sessions")
            .update({ is_active: false })
            .eq("id", currentSessionId);
        }
        sessionStorage.removeItem("app_session_id");
        sessionManager.stopHeartbeat();
      }
      
      // Log logout before signing out (while we still have auth)
      await supabase.from("audit_logs").insert({
        action: "logout",
        entity_type: "user",
        user_id: userId,
        user_name: userName,
        details: { method: "manual" },
      });
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setSessionTimeoutMinutes(480);
      setPageAccess({} as Record<PageKey, boolean>);
      setNotifications([]);
      toast({ title: "Signed out", description: "You have been signed out successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to sign out", variant: "destructive" });
    }
  };

  useEffect(() => {
    // Synchronously check localStorage to know if a session already exists
    // BEFORE any async callback fires — this prevents refresh from logging a new login
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const storedSession = getStoredSession(projectRef);
    let isRestoredSession = !!localStorage.getItem(`sb-${projectRef}-auth-token`);
    let sessionCheckDone = false;
    let initResolved = false;

    const handleSessionCheck = async (uid: string) => {
      if (sessionCheckDone) return;
      sessionCheckDone = true;
      setSessionChecked(true);

      try {
        const ok = await Promise.race<boolean>([
          sessionManager.registerSession(uid),
          new Promise<boolean>((resolve) => {
            window.setTimeout(() => resolve(true), SESSION_CHECK_TIMEOUT_MS);
          }),
        ]);

        if (ok) {
          sessionManager.startHeartbeat();
        }
      } catch (e) {
        console.error("Session registration error:", e);
      }
    };

    const restoreStoredSession = () => {
      if (!storedSession?.user) return;

      setSession(storedSession);
      setUser(storedSession.user);
      applyCachedAuthState(storedSession.user.id);
      handleSessionCheck(storedSession.user.id);
    };

    const initTimeout = window.setTimeout(() => {
      if (initResolved) return;

      console.warn("Auth initialization timed out. Restoring locally cached session state.");
      restoreStoredSession();
      setLoading(false);
    }, SESSION_INIT_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        initResolved = true;
        window.clearTimeout(initTimeout);

        if (existingSession?.user) {
          isRestoredSession = true;
          setSession(existingSession);
          setUser(existingSession.user);
          applyCachedAuthState(existingSession.user.id);
          fetchProfile(existingSession.user.id);
          fetchRole(existingSession.user.id);
          fetchPageAccess(existingSession.user.id);
          fetchNotifications(existingSession.user.id);
          handleSessionCheck(existingSession.user.id);
        }

        setLoading(false);
      })
      .catch((error) => {
        initResolved = true;
        window.clearTimeout(initTimeout);
        console.error("Error restoring session:", error);
        restoreStoredSession();
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // CRITICAL: Never await inside onAuthStateChange — it deadlocks getSession
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          // Only log login for genuine new sign-ins, NOT token refreshes or session restores
          if (event === "SIGNED_IN" && !isRestoredSession) {
            supabase.from("audit_logs").insert({
              action: "login",
              entity_type: "user",
              user_id: currentSession.user.id,
              user_name: currentSession.user.email || "Unknown",
              details: { method: "password", event },
            }).then(() => {});
          }
          // After initial restore, mark as handled so subsequent SIGNED_IN from
          // token refresh won't log again
          if (event === "SIGNED_IN") {
            isRestoredSession = true;
          }
          applyCachedAuthState(currentSession.user.id);
          handleSessionCheck(currentSession.user.id);
          fetchProfile(currentSession.user.id);
          fetchRole(currentSession.user.id);
          fetchPageAccess(currentSession.user.id);
          fetchNotifications(currentSession.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setPageAccess({} as Record<PageKey, boolean>);
          setNotifications([]);
          setSessionChecked(false);
          sessionCheckDone = false;
          isRestoredSession = false;
        }
        setLoading(false);
      }
    );

    return () => {
      initResolved = true;
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, [applyCachedAuthState, fetchProfile, fetchRole, fetchPageAccess, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    user,
    session,
    profile,
    role,
    sessionTimeoutMinutes,
    pageAccess,
    notifications,
    unreadCount,
    loading,
    sessionChecked,
    signOut,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refetchProfile: () => user && fetchProfile(user.id),
    refetchNotifications: () => user && fetchNotifications(user.id),
    refetchPageAccess: () => user && fetchPageAccess(user.id),
    deviceLimitReached: sessionManager.deviceLimitReached,
    activeSessions: sessionManager.activeSessions,
    maxDevices: sessionManager.maxDevices,
    terminateSessionAndContinue: sessionManager.terminateSessionAndContinue,
    cancelDeviceLimit: sessionManager.cancelLogin,
  };
}
