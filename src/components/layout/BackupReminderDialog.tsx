import { useState, useEffect } from "react";
import { Download, Database, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BACKUP_DISMISSED_KEY = "backup_reminder_dismissed";

export function BackupReminderDialog() {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [latestBackup, setLatestBackup] = useState<{ name: string; created_at: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dismissed = localStorage.getItem(BACKUP_DISMISSED_KEY);

    // Already dismissed today
    if (dismissed === today) return;

    // Show after 3 minutes if already logged in, or immediately on fresh login
    const timer = setTimeout(async () => {
      try {
        const { data: files, error } = await supabase.storage
          .from("backups")
          .list("", { sortBy: { column: "created_at", order: "desc" }, limit: 1 });

        if (error || !files || files.length === 0) return;

        const latest = files[0];
        setLatestBackup({ name: latest.name, created_at: latest.created_at || "" });
        setOpen(true);
      } catch {
        // Silent fail
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(BACKUP_DISMISSED_KEY, today);
    setOpen(false);
  };

  const handleDownload = async () => {
    if (!latestBackup) return;
    setDownloading(true);
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from("backups")
        .createSignedUrl(latestBackup.name, 300);

      if (signedError) {
        const { data, error } = await supabase.storage
          .from("backups")
          .download(latestBackup.name);
        if (error) throw new Error(error.message || "Download failed");

        const url = URL.createObjectURL(data);
        const link = document.createElement("a");
        link.href = url;
        link.download = latestBackup.name;
        link.click();
        URL.revokeObjectURL(url);
      } else if (signedData?.signedUrl) {
        const link = document.createElement("a");
        link.href = signedData.signedUrl;
        link.download = latestBackup.name;
        link.target = "_blank";
        link.click();
      }

      toast({ title: "Backup Downloaded", description: "Today's backup has been downloaded." });
      handleDismiss();
    } catch (error: any) {
      toast({ title: "Download Failed", description: error?.message || "Unable to download backup.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (!latestBackup) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Daily Backup Reminder
          </DialogTitle>
          <DialogDescription>
            Today's backup is ready. Download it to keep a local copy of your data for safety.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-1">
          <p className="text-sm font-medium text-foreground">{latestBackup.name}</p>
          {latestBackup.created_at && (
            <p className="text-xs text-muted-foreground">
              Created: {format(new Date(latestBackup.created_at), "dd MMM yyyy, hh:mm a")}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleDismiss}>
            Remind Later
          </Button>
          <Button onClick={handleDownload} disabled={downloading} className="gap-2">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Backup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
