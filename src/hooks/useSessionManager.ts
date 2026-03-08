import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveSession } from "@/components/auth/DeviceLimitDialog";

export function useSessionManager(userId: string | undefined) {
  const [deviceLimitReached, setDeviceLimitReached] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [maxDevices, setMaxDevices] = useState(3);
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDeviceInfo = () => navigator.userAgent;

  const registerSession = useCallback(async (uid: string) => {
    try {
      // Get max_devices for user
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("max_devices")
        .eq("user_id", uid)
        .maybeSingle();

      const limit = roleData?.max_devices ?? 3;
      setMaxDevices(limit);

      // Count active sessions
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("id, device_info, ip_address, last_active_at, created_at")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("last_active_at", { ascending: false });

      const activeCount = sessions?.length ?? 0;

      if (limit > 0 && activeCount >= limit) {
        // Device limit reached — show dialog
        setActiveSessions(sessions as ActiveSession[]);
        setDeviceLimitReached(true);
        return false; // Signal: don't proceed yet
      }

      // Create new session
      await createSession(uid);
      return true;
    } catch (error) {
      console.error("Error registering session:", error);
      return true; // Don't block login on error
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
    }
  };

  const terminateSessionAndContinue = useCallback(async (sessionId: string) => {
    if (!userId) return;
    await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    await createSession(userId);
    setDeviceLimitReached(false);
    setActiveSessions([]);
  }, [userId]);

  const cancelLogin = useCallback(async () => {
    setDeviceLimitReached(false);
    setActiveSessions([]);
    await supabase.auth.signOut();
  }, []);

  // Heartbeat: update last_active_at every 5 minutes
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      if (sessionIdRef.current) {
        await supabase
          .from("user_sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", sessionIdRef.current);
      }
    }, 5 * 60 * 1000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  return {
    deviceLimitReached,
    activeSessions,
    maxDevices,
    registerSession,
    terminateSessionAndContinue,
    cancelLogin,
    startHeartbeat,
    stopHeartbeat,
    currentSessionId: sessionIdRef.current,
  };
}
