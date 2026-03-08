import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveSession } from "@/components/auth/DeviceLimitDialog";

const SESSION_STORAGE_KEY = "app_session_id";

export function useSessionManager(userId: string | undefined) {
  const [deviceLimitReached, setDeviceLimitReached] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [maxDevices, setMaxDevices] = useState(3);
  const [wasTerminatedRemotely, setWasTerminatedRemotely] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDeviceInfo = () => navigator.userAgent;

  const registerSession = useCallback(async (uid: string) => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("max_devices")
        .eq("user_id", uid)
        .maybeSingle();

      const limit = roleData?.max_devices ?? 3;
      setMaxDevices(limit);

      // Check if we already have a session from this browser tab
      const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (existingSessionId) {
        // Verify it's still active in the database
        const { data: existingSession } = await supabase
          .from("user_sessions")
          .select("id, is_active")
          .eq("id", existingSessionId)
          .eq("user_id", uid)
          .maybeSingle();

        if (existingSession?.is_active) {
          // Reuse existing session — just update heartbeat
          sessionIdRef.current = existingSessionId;
          return true;
        }
        // Session was terminated or doesn't exist — remove stale reference
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }

      // Clean up stale sessions (no heartbeat for 2+ minutes = dead)
      const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", uid)
        .eq("is_active", true)
        .lt("last_active_at", staleThreshold);

      // Also clean up expired sessions
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", uid)
        .eq("is_active", true)
        .lt("expires_at", new Date().toISOString());

      // Now check active sessions count
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("id, device_info, ip_address, last_active_at, created_at")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("last_active_at", { ascending: false });

      const activeCount = sessions?.length ?? 0;

      if (limit > 0 && activeCount >= limit) {
        setActiveSessions(sessions as ActiveSession[]);
        setDeviceLimitReached(true);
        return false;
      }

      await createSession(uid);
      return true;
    } catch (error) {
      console.error("Error registering session:", error);
      return true;
    }
  }, []);

  const createSession = async (uid: string) => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const sessionToken = crypto.randomUUID();

    const { data } = await supabase
      .from("user_sessions")
      .insert({
        user_id: uid,
        device_info: getDeviceInfo(),
        session_token: sessionToken,
        expires_at: expiresAt,
        is_active: true,
      })
      .select("id")
      .single();

    if (data) {
      sessionIdRef.current = data.id;
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.id);
    }
  };

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const checkAndUpdate = async () => {
      if (!sessionIdRef.current) return;

      const { data } = await supabase
        .from("user_sessions")
        .select("is_active")
        .eq("id", sessionIdRef.current)
        .maybeSingle();

      if (data && !data.is_active) {
        stopHeartbeat();
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setWasTerminatedRemotely(true);
        return;
      }

      await supabase
        .from("user_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current);
    };

    checkAndUpdate();
    heartbeatRef.current = setInterval(checkAndUpdate, 30 * 1000);
  }, [stopHeartbeat]);

  const terminateSessionAndContinue = useCallback(async (sessionId: string) => {
    if (!userId) return;
    await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    await createSession(userId);
    setDeviceLimitReached(false);
    setActiveSessions([]);
    startHeartbeat();
  }, [userId, startHeartbeat]);

  const cancelLogin = useCallback(async () => {
    setDeviceLimitReached(false);
    setActiveSessions([]);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  return {
    deviceLimitReached,
    activeSessions,
    maxDevices,
    wasTerminatedRemotely,
    registerSession,
    terminateSessionAndContinue,
    cancelLogin,
    startHeartbeat,
    stopHeartbeat,
    currentSessionId: sessionIdRef.current,
  };
}
