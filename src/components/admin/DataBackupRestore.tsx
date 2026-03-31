import { useState, useEffect } from "react";
import { Download, Upload, Loader2, Database, AlertTriangle, Clock, RefreshCw, Trash2 } from "lucide-react";
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
  "manual_bills",
  "cheques",
  "notifications",
  "audit_logs",
  "application_settings",
] as const;

type TableName = typeof BACKUP_TABLES[number];

interface BackupFile {
  name: string;
  created_at: string;
  metadata: { size: number } | null;
}

export function DataBackupRestore() {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [confirmImport, setConfirmImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const fetchBackupFiles = async () => {
    setLoadingBackups(true);
    try {
      const { data, error } = await supabase.storage
        .from("backups")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;
      setBackupFiles(
        (data || []).map((f) => ({
          name: f.name,
          created_at: f.created_at || "",
          metadata: f.metadata as { size: number } | null,
        }))
      );
    } catch (error: any) {
      console.error("Error fetching backups:", error);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchBackupFiles();
  }, []);

  const handleDownloadBackup = async (fileName: string) => {
    setDownloadingFile(fileName);
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from("backups")
        .createSignedUrl(fileName, 300);

      if (signedError) {
        const { data, error } = await supabase.storage
          .from("backups")
          .download(fileName);
        if (error) throw new Error(error.message || "Could not download backup file");

        const url = URL.createObjectURL(data);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else if (signedData?.signedUrl) {
        const link = document.createElement("a");
        link.href = signedData.signedUrl;
        link.download = fileName;
        link.target = "_blank";
        link.click();
      }
    } catch (error: any) {
      toast({ title: "Download Failed", description: error?.message || "Unable to download backup file.", variant: "destructive" });
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleTriggerBackup = async () => {
    setTriggeringBackup(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-backup");

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Backup Generated",
        description: `Backup created — ${data.total_rows} records (${data.size_kb} KB)`,
      });

      await fetchBackupFiles();
    } catch (error: any) {
      toast({ title: "Backup Failed", description: error.message, variant: "destructive" });
    } finally {
      setTriggeringBackup(false);
    }
  };

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

      await supabase.rpc("notify_admins", {
        _title: "Backup Exported",
        _message: `Full system backup exported on ${format(new Date(), "dd MMM yyyy, hh:mm a")} — ${BACKUP_TABLES.length} tables`,
        _type: "info",
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
        "manual_bills",
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Backup & Restore</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Automated daily backups run at midnight. You can also trigger a manual backup or export/import data directly.
      </p>

      {isProcessing && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{progressLabel}</p>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="default"
          className="gap-2"
          onClick={handleTriggerBackup}
          disabled={isProcessing || triggeringBackup}
        >
          {triggeringBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Generate Backup Now
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExportAll}
          disabled={isProcessing}
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export to Browser
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleImportClick}
          disabled={isProcessing}
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import Data
        </Button>
      </div>

      {/* Automated Backup History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Backup History (Last 7)
          </h4>
          <Button variant="ghost" size="sm" onClick={fetchBackupFiles} disabled={loadingBackups}>
            {loadingBackups ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>

        {loadingBackups && backupFiles.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : backupFiles.length > 0 ? (
          <div className="border border-border rounded-lg divide-y divide-border">
            {backupFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.created_at
                      ? format(new Date(file.created_at), "dd MMM yyyy, hh:mm a")
                      : "Unknown date"}
                    {file.metadata?.size ? ` • ${formatFileSize(file.metadata.size)}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => handleDownloadBackup(file.name)}
                  disabled={downloadingFile === file.name}
                >
                  {downloadingFile === file.name ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Download
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No automated backups yet. Click "Generate Backup Now" to create one.
          </div>
        )}
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
