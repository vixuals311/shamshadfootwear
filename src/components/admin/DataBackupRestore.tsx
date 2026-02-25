import { useState } from "react";
import { Download, Upload, Loader2, Database, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";
import { triggerFileInput } from "@/utils/importUtils";

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
  "audit_logs",
  "application_settings",
] as const;

type TableName = typeof BACKUP_TABLES[number];

export function DataBackupRestore() {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [confirmImport, setConfirmImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExportAll = async () => {
    setExporting(true);
    setProgress(0);
    setProgressLabel("Starting export...");

    try {
      const backup: Record<string, any[]> = {};
      
      for (let i = 0; i < BACKUP_TABLES.length; i++) {
        const table = BACKUP_TABLES[i];
        setProgressLabel(`Exporting ${table}...`);
        setProgress(((i + 1) / BACKUP_TABLES.length) * 100);

        const { data, error } = await supabase
          .from(table)
          .select("*")
          .limit(10000);

        if (error) {
          console.error(`Error exporting ${table}:`, error);
          backup[table] = [];
        } else {
          backup[table] = data || [];
        }
      }

      const json = JSON.stringify({
        version: "1.0",
        exported_at: new Date().toISOString(),
        tables: backup,
      }, null, 2);

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${format(new Date(), "yyyy-MM-dd_HHmm")}.json`;
      link.click();
      URL.revokeObjectURL(url);

      await log({
        action: "export",
        entityType: "system",
        details: { type: "full_backup", tables: BACKUP_TABLES.length },
      });

      toast({ title: "Export Complete", description: "Full backup downloaded successfully" });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setExporting(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const handleImportClick = () => {
    triggerFileInput(".json", (file) => {
      setImportFile(file);
      setConfirmImport(true);
    });
  };

  const handleImportAll = async () => {
    if (!importFile) return;
    setConfirmImport(false);
    setImporting(true);
    setProgress(0);
    setProgressLabel("Reading file...");

    try {
      const text = await importFile.text();
      const backup = JSON.parse(text);

      if (!backup.tables || !backup.version) {
        throw new Error("Invalid backup file format");
      }

      const tables = backup.tables as Record<string, any[]>;
      const tableNames = Object.keys(tables).filter(t => 
        BACKUP_TABLES.includes(t as TableName)
      );

      // Import in order (respecting foreign keys)
      const orderedTables: TableName[] = [
        "brands",
        "product_categories",
        "default_size_ranges",
        "payment_accounts",
        "application_settings",
        "clients",
        "products",
        "product_size_bundles",
        "invoices",
        "invoice_items",
        "recoveries",
        "recovery_client_amounts",
        "returns",
        "return_items",
        "audit_logs",
      ];

      let imported = 0;
      const importOrder = orderedTables.filter(t => tableNames.includes(t));

      for (let i = 0; i < importOrder.length; i++) {
        const table = importOrder[i];
        const rows = tables[table];
        if (!rows || rows.length === 0) continue;

        setProgressLabel(`Importing ${table} (${rows.length} rows)...`);
        setProgress(((i + 1) / importOrder.length) * 100);

        // Import in batches of 500
        const BATCH_SIZE = 500;
        for (let j = 0; j < rows.length; j += BATCH_SIZE) {
          const batch = rows.slice(j, j + BATCH_SIZE);
          const { error } = await supabase.from(table).upsert(batch, { 
            onConflict: "id",
            ignoreDuplicates: false 
          });
          if (error) {
            console.error(`Error importing ${table} batch:`, error);
          } else {
            imported += batch.length;
          }
          // Yield to UI
          await new Promise(r => setTimeout(r, 50));
        }
      }

      await log({
        action: "import",
        entityType: "system",
        details: { type: "full_restore", rows_imported: imported },
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${imported} records across ${importOrder.length} tables`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setProgress(0);
      setProgressLabel("");
      setImportFile(null);
    }
  };

  const isProcessing = exporting || importing;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Backup & Restore</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Export all system data (clients, invoices, inventory, payments, recoveries, returns, logs, settings) as a single backup file, or restore from a previous backup.
      </p>

      {isProcessing && (
        <div className="mb-4 space-y-2">
          <p className="text-sm text-muted-foreground">{progressLabel}</p>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExportAll}
          disabled={isProcessing}
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export All Data
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleImportClick}
          disabled={isProcessing}
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import All Data
        </Button>
      </div>

      {/* Import Confirmation */}
      <AlertDialog open={confirmImport} onOpenChange={setConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Confirm Data Import
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will merge data from the backup file into your database. Existing records with the same IDs will be overwritten. This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportAll}>
              Yes, Import Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
