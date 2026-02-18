import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, pin } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up client by phone (bypasses RLS with service role)
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, email, phone, address, city, opening_balance, current_balance, total_spent, invoice_count, portal_pin")
      .eq("phone", phone);

    if (error) throw error;

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ error: "No account found with this phone number." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = clients[0];

    // Verify PIN if set
    if (client.portal_pin && client.portal_pin !== pin) {
      return new Response(JSON.stringify({ error: "Invalid PIN." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't expose the PIN in the response
    const { portal_pin, ...safeClient } = client;

    // Fetch invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    // Fetch direct recoveries
    const { data: directRecoveries } = await supabase
      .from("recoveries")
      .select("*")
      .eq("client_id", client.id)
      .order("date", { ascending: false });

    // Fetch city recovery amounts
    const { data: cityAmounts } = await supabase
      .from("recovery_client_amounts")
      .select("*, recoveries(*)")
      .eq("client_id", client.id);

    return new Response(
      JSON.stringify({
        client: safeClient,
        invoices: invoices || [],
        directRecoveries: directRecoveries || [],
        cityAmounts: cityAmounts || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Client portal error:", err);
    return new Response(JSON.stringify({ error: "An error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
