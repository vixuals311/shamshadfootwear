import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineBilling() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchSetting = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("application_settings")
        .select("setting_value")
        .eq("setting_key", "online_billing_enabled")
        .maybeSingle();

      if (data?.setting_value !== undefined) {
        const val = data.setting_value;
        setEnabled(val === true || val === "true");
      }
    } catch {
      // default to enabled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetting();

    const handler = () => fetchSetting();
    window.addEventListener("online-billing-changed", handler);
    return () => window.removeEventListener("online-billing-changed", handler);
  }, [fetchSetting]);

  return { onlineBillingEnabled: enabled, loading };
}
