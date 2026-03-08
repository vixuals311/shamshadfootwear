import { useEffect, useRef, useCallback } from "react";

interface UseInactivityTimeoutOptions {
  timeoutMinutes: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export function useInactivityTimeout({ timeoutMinutes, onTimeout, enabled = true }: UseInactivityTimeoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    if (!enabled || timeoutMinutes <= 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMinutes * 60 * 1000);
  }, [enabled, timeoutMinutes]);

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    
    const handleActivity = () => resetTimer();

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    resetTimer(); // Start initial timer

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, timeoutMinutes, resetTimer]);
}
