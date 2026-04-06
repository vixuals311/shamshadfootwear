import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, List } from "lucide-react";
import { useOfflineSyncContext } from "@/context/OfflineSyncContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PendingSyncsPanel } from "./PendingSyncsPanel";
import { useState } from "react";

function formatCacheAge(isoString: string | null): string {
  if (!isoString) return "Never synced";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPendingChanges, refreshEntries, lastCacheTime } =
    useOfflineSyncContext();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleOpenSheet = () => {
    refreshEntries();
    setSheetOpen(true);
  };

  const cacheAgeText = formatCacheAge(lastCacheTime);

  return (
    <div className="flex items-center gap-1.5">
      {/* Pending syncs sheet trigger */}
      {pendingCount > 0 && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 relative"
                  onClick={handleOpenSheet}
                >
                  <List className="w-4 h-4" />
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                  >
                    {pendingCount}
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View pending syncs</TooltipContent>
            </Tooltip>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[420px] p-0">
            <PendingSyncsPanel />
          </SheetContent>
        </Sheet>
      )}

      {/* Sync button */}
      {pendingCount > 0 && isOnline && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => syncPendingChanges()}
              disabled={isSyncing}
            >
              <RefreshCw
                className={cn("w-4 h-4", isSyncing && "animate-spin")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncing
              ? "Syncing..."
              : `Sync ${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}`}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Online/Offline status with cache freshness */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              isOnline
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            {isOnline ? (
              <Cloud className="w-3.5 h-3.5" />
            ) : (
              <CloudOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>
              {isOnline
                ? pendingCount > 0
                  ? `Online — ${pendingCount} changes waiting to sync`
                  : "Connected — all data synced"
                : "Offline — changes will sync when connected"}
            </p>
            <p className="text-xs opacity-75">Cache updated: {cacheAgeText}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
