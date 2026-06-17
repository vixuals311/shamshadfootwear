import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateCacheFromFirebase } from "@/lib/firebaseFailover";
import { useToast } from "@/hooks/use-toast";

const HEALTH_INTERVAL_MS = 60_000;        // poll every 60s
const FAILURES_TO_TRIGGER = 3;            // 3 consecutive failures => outage
const RECOVERIES_TO_CLEAR = 2;            // 2 consecutive successes => recovered

export interface CloudOutageState {
  outage: boolean;
  hydrating: boolean;
  lastHydratedAt: string | null;
  lastError: string | null;
}

/**
 * Polls Lovable Cloud health. On sustained outage, pulls the latest snapshot
 * from the Firebase mirror into the local IndexedDB cache so the app keeps
 * working in read-only mode. Clears the outage flag once Cloud recovers.
 */
export function useCloudOutageFailover() {
  const [state, setState] = useState<CloudOutageState>({
    outage: false,
    hydrating: false,
    lastHydratedAt: null,
    lastError: null,
  });
  const failureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const hasHydratedThisOutageRef = useRef(false);
  const { toast } = useToast();

  const runFailover = useCallback(async () => {
    if (hasHydratedThisOutageRef.current) return;
    hasHydratedThisOutageRef.current = true;
    setState((s) => ({ ...s, hydrating: true }));
    try {
      const result = await hydrateCacheFromFirebase();
      setState((s) => ({
        ...s,
        hydrating: false,
        lastHydratedAt: new Date().toISOString(),
        lastError: result.failed.length > 0 ? `Partial: ${result.failed.join(", ")}` : null,
      }));
      toast({
        title: "Cloud unreachable — read-only failover active",
        description: `Loaded ${result.rows} records across ${result.tables} tables from backup mirror.`,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        hydrating: false,
        lastError: err?.message || "Failover hydration failed",
      }));
    }
  }, [toast]);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      try {
        const { error } = await supabase
          .from("application_settings")
          .select("id")
          .limit(1);
        if (error) throw error;

        // Success
        failureCountRef.current = 0;
        successCountRef.current += 1;
        if (successCountRef.current >= RECOVERIES_TO_CLEAR) {
          if (hasHydratedThisOutageRef.current) {
            toast({
              title: "Cloud reconnected",
              description: "Live data restored.",
            });
          }
          hasHydratedThisOutageRef.current = false;
          setState((s) => (s.outage ? { ...s, outage: false } : s));
        }
      } catch (err) {
        successCountRef.current = 0;
        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURES_TO_TRIGGER) {
          setState((s) => (s.outage ? s : { ...s, outage: true }));
          runFailover();
        }
      }
    };

    check();
    const id = window.setInterval(() => {
      if (!stopped) check();
    }, HEALTH_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [runFailover, toast]);

  return state;
}