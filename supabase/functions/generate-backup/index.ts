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

// Tiered retention
const MAX_DAILY = 30;    // ~1 month of daily snapshots
const MAX_WEEKLY = 12;   // ~3 months of weekly snapshots
const MAX_MONTHLY = 12;  // ~1 year of monthly snapshots

function pruneByPrefix(files: { name: string }[], prefix: string, keep: number): string[] {
  const matching = files
    .filter((f) => f.name.startsWith(prefix))
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first by name (ISO date in name)
  return matching.slice(keep).map((f) => f.name);
}

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
    // Always write a daily snapshot. Additionally write a weekly snapshot on Sundays
    // and a monthly snapshot on the 1st of the month.
    const dayOfWeek = now.getUTCDay();   // 0 = Sunday
    const dayOfMonth = now.getUTCDate(); // 1..31
    const tiers: { prefix: "daily" | "weekly" | "monthly"; fileName: string }[] = [
      { prefix: "daily", fileName: `daily_${dateStr}_${timeStr}.json` },
    ];
    if (dayOfWeek === 0) {
      tiers.push({ prefix: "weekly", fileName: `weekly_${dateStr}.json` });
    }
    if (dayOfMonth === 1) {
      tiers.push({ prefix: "monthly", fileName: `monthly_${dateStr.slice(0, 7)}.json` });
    }

    const jsonContent = JSON.stringify({
      version: "1.1",
      exported_at: now.toISOString(),
      type: "automated",
      tables: backup,
    });
    const blob = new Blob([jsonContent], { type: "application/json" });

    // 2. Upload each tier
    const uploadedFiles: string[] = [];
    for (const tier of tiers) {
      const { error: uploadError } = await supabase.storage
        .from("backups")
        .upload(tier.fileName, blob, { contentType: "application/json", upsert: true });
      if (uploadError) {
        throw new Error(`Upload failed for ${tier.fileName}: ${uploadError.message}`);
      }
      uploadedFiles.push(tier.fileName);
    }
    const fileName = uploadedFiles[0];

    // 3. Tiered cleanup. Treat legacy "backup_" files as daily for pruning.
    const { data: files } = await supabase.storage
      .from("backups")
      .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });

    if (files && files.length > 0) {
      const toDelete: string[] = [
        ...pruneByPrefix(files, "daily_", MAX_DAILY),
        ...pruneByPrefix(files, "weekly_", MAX_WEEKLY),
        ...pruneByPrefix(files, "monthly_", MAX_MONTHLY),
        ...pruneByPrefix(files, "backup_", MAX_DAILY), // legacy filenames
      ];
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
      const tierLabel = uploadedFiles.length > 1
        ? ` (${uploadedFiles.map((f) => f.split("_")[0]).join(" + ")})`
        : "";
      const notifications = roleUsers.map((ru) => ({
        user_id: ru.user_id,
        title: "Daily Backup Ready",
        message: `Automated backup completed${tierLabel} — ${totalRows} records across ${BACKUP_TABLES.length} tables (${sizeKB} KB). [file:${fileName}]`,
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
        files: uploadedFiles,
        tables: BACKUP_TABLES.length,
        total_rows: totalRows,
        size_kb: sizeKB,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        file_name: fileName,
        files: uploadedFiles,
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
