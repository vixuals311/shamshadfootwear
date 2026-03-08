import { useState } from "react";
import { format } from "date-fns";
import { Monitor, Smartphone, Loader2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActiveSession {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  last_active_at: string;
  created_at: string;
}

interface DeviceLimitDialogProps {
  open: boolean;
  sessions: ActiveSession[];
  maxDevices: number;
  onTerminateAndContinue: (sessionId: string) => Promise<void>;
  onCancel: () => void;
}

function parseDeviceInfo(ua: string | null): { label: string; isMobile: boolean } {
  if (!ua) return { label: "Unknown Device", isMobile: false };
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i);
  const browser = browserMatch ? browserMatch[1] : "Browser";
  const osMatch = ua.match(/(Windows|Mac OS|Linux|Android|iOS|iPhone OS)[\s/]?[\d._]*/i);
  const os = osMatch ? osMatch[0].replace(/_/g, ".") : "";
  return { label: `${browser} on ${os || (isMobile ? "Mobile" : "Desktop")}`, isMobile };
}

export function DeviceLimitDialog({
  open, sessions, maxDevices, onTerminateAndContinue, onCancel,
}: DeviceLimitDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onTerminateAndContinue(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Device Limit Reached</DialogTitle>
          <DialogDescription>
            You can only be logged in on {maxDevices} device{maxDevices !== 1 ? "s" : ""} at a time. 
            Select a session to end before continuing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto py-2">
          {sessions.map((s) => {
            const { label, isMobile } = parseDeviceInfo(s.device_info);
            const isSelected = selected === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                  isSelected
                    ? "border-destructive bg-destructive/5"
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  isSelected ? "bg-destructive/10" : "bg-muted"
                )}>
                  {isMobile
                    ? <Smartphone className={cn("w-5 h-5", isSelected ? "text-destructive" : "text-muted-foreground")} />
                    : <Monitor className={cn("w-5 h-5", isSelected ? "text-destructive" : "text-muted-foreground")} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {format(new Date(s.last_active_at), "dd MMM, h:mm a")}
                  </p>
                  {s.ip_address && (
                    <p className="text-xs text-muted-foreground">IP: {s.ip_address}</p>
                  )}
                </div>
                {isSelected && <X className="w-4 h-4 text-destructive shrink-0" />}
              </button>
            );
          })}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel & Sign Out
          </Button>
          <Button
            variant="destructive"
            onClick={handleContinue}
            disabled={!selected || loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            End Session & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
