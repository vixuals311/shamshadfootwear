import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageKey } from "@/types";
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

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(480);
  const [pageAccess, setPageAccess] = useState<Record<PageKey, boolean>>({} as Record<PageKey, boolean>);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
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
      setRole(data?.role as AppRole || null);
      setSessionTimeoutMinutes(data?.session_timeout_minutes ?? 480);
    } catch (error) {
      console.error("Error fetching role:", error);
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
      setPageAccess(accessMap);
    } catch (error) {
      console.error("Error fetching page access:", error);
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
    } catch (error) {
      console.error("Error fetching notifications:", error);
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
        await supabase
          .from("user_sessions")
          .update({ is_active: false })
          .eq("user_id", user.id);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          // Log login event
          if (event === "SIGNED_IN") {
            supabase.from("audit_logs").insert({
              action: "login",
              entity_type: "user",
              user_id: currentSession.user.id,
              user_name: currentSession.user.email || "Unknown",
              details: { method: "password", event },
            }).then(() => {});
          }
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
            fetchRole(currentSession.user.id);
            fetchPageAccess(currentSession.user.id);
            fetchNotifications(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setPageAccess({} as Record<PageKey, boolean>);
          setNotifications([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
        fetchRole(existingSession.user.id);
        fetchPageAccess(existingSession.user.id);
        fetchNotifications(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRole, fetchPageAccess, fetchNotifications]);

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
    signOut,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refetchProfile: () => user && fetchProfile(user.id),
    refetchNotifications: () => user && fetchNotifications(user.id),
    refetchPageAccess: () => user && fetchPageAccess(user.id),
  };
}
