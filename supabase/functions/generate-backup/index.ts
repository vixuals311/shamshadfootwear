import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKUP_TABLES = [
  "brands",
  "product_categories",
  "default_size_ranges",
  "payment_accounts",
  "clients",
  "products",
  "product_size_bundles",
  "invoices",
  "invoice_items",
  "recoveries",
  "recovery_client_amounts",
  "returns",
  "return_items",
  "manual_bills",
  "audit_logs",
  "application_settings",
];

const MAX_BACKUPS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Export all tables
    const backup: Record<string, any[]> = {};
    for (const table of BACKUP_TABLES) {
      let allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error(`Error exporting ${table}:`, error);
          break;
        }

        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      backup[table] = allData;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 16).replace(":", "");
    const fileName = `backup_${dateStr}_${timeStr}.json`;

    const jsonContent = JSON.stringify({
      version: "1.0",
      exported_at: now.toISOString(),
      type: "automated",
      tables: backup,
    });

    // 2. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(fileName, new Blob([jsonContent], { type: "application/json" }), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 3. Clean up old backups (keep only last MAX_BACKUPS)
    const { data: files } = await supabase.storage
      .from("backups")
      .list("", { sortBy: { column: "created_at", order: "desc" } });

    if (files && files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS).map((f) => f.name);
      if (toDelete.length > 0) {
        await supabase.storage.from("backups").remove(toDelete);
      }
    }

    // 4. Calculate backup size
    const totalRows = Object.values(backup).reduce((sum, rows) => sum + rows.length, 0);
    const sizeKB = Math.round(jsonContent.length / 1024);

    // 5. Notify admins and managers
    // Get admin and manager user IDs
    const { data: roleUsers } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "manager"]);

    if (roleUsers && roleUsers.length > 0) {
      const notifications = roleUsers.map((ru) => ({
        user_id: ru.user_id,
        title: "Daily Backup Ready",
        message: `Automated backup completed — ${totalRows} records across ${BACKUP_TABLES.length} tables (${sizeKB} KB). Download from Settings → Backup & Restore.`,
        type: "backup",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // 6. Log the backup
    await supabase.from("audit_logs").insert({
      action: "export",
      entity_type: "system",
      details: {
        type: "automated_backup",
        file_name: fileName,
        tables: BACKUP_TABLES.length,
        total_rows: totalRows,
        size_kb: sizeKB,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        file_name: fileName,
        total_rows: totalRows,
        size_kb: sizeKB,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Backup error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Backup failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
