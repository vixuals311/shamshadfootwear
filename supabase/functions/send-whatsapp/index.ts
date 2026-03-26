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
    const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
    const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_API_URL || !WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp API not configured", 
          configured: false,
          message: "Please configure WHATSAPP_API_URL, WHATSAPP_API_KEY, and WHATSAPP_PHONE_NUMBER_ID in your project secrets." 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const body = await req.json();
    const { phone, message, templateName, templateData, clientId, messageType } = body;

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone number is required" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Format phone for WhatsApp (remove spaces, ensure country code)
    const formattedPhone = phone.replace(/[\s\-\(\)]/g, "").replace(/^0/, "92");

    let waPayload: any;

    if (templateName) {
      // Template message (for automated notifications)
      waPayload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: templateData || [],
        },
      };
    } else {
      // Text message (for custom messages)
      waPayload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      };
    }

    // Send via WhatsApp API
    const waResponse = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waPayload),
      }
    );

    const waResult = await waResponse.json();

    if (!waResponse.ok) {
      throw new Error(`WhatsApp API error [${waResponse.status}]: ${JSON.stringify(waResult)}`);
    }

    // Log the message
    const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await serviceSupabase.from("whatsapp_messages").insert({
      client_id: clientId || null,
      phone: formattedPhone,
      message_type: messageType || "custom",
      message_content: message || `Template: ${templateName}`,
      status: "sent",
      sent_by: claims.claims.sub,
      wa_message_id: waResult.messages?.[0]?.id || null,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: waResult.messages?.[0]?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send WhatsApp message" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
