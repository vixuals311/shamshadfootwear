import { Bell, User, LogOut, Settings, Check, CheckCheck, FileText, Wallet, Info, Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export function UserMenu() {
  const {
    profile,
    role,
    notifications,
    unreadCount,
    signOut,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useSupabaseAuthContext();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "User";

  const extractBackupFileName = (message: string): string | null => {
    const match = message.match(/\[file:(.*?)\]/);
    return match ? match[1] : null;
  };

  const handleDownloadBackup = async (notificationId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(notificationId);
    try {
      // Try signed URL first (more reliable than download)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("backups")
        .createSignedUrl(fileName, 300);

      if (signedError) {
        // Fallback to direct download
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

      markNotificationAsRead(notificationId);
    } catch (error: any) {
      toast({ title: "Download Failed", description: error?.message || "Unable to download backup. Please try from Settings > Backup & Restore.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={markAllNotificationsAsRead}
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-72">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const backupFile = notification.type === "backup" 
                    ? extractBackupFileName(notification.message) 
                    : null;
                  const displayMessage = backupFile 
                    ? notification.message.replace(/\s*\[file:.*?\]/, '')
                    : notification.message;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                        !notification.is_read && "bg-primary/5"
                      )}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            notification.type === "invoice" ? "bg-primary/10" :
                            notification.type === "recovery" ? "bg-chart-2/10" :
                            notification.type === "backup" ? "bg-chart-4/10" :
                            "bg-muted"
                          )}
                        >
                          {notification.type === "invoice" ? (
                            <FileText className="w-3.5 h-3.5 text-primary" />
                          ) : notification.type === "recovery" ? (
                            <Wallet className="w-3.5 h-3.5 text-chart-2" />
                          ) : notification.type === "backup" ? (
                            <Database className="w-3.5 h-3.5 text-chart-4" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {displayMessage}
                          </p>
                          {backupFile && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs gap-1.5"
                              disabled={downloadingId === notification.id}
                              onClick={(e) => handleDownloadBackup(notification.id, backupFile, e)}
                            >
                              <Download className="w-3 h-3" />
                              {downloadingId === notification.id ? "Downloading..." : "Download Backup"}
                            </Button>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Check className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">
                {profile?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.email}
              </p>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full w-fit">
                {roleLabel}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings" className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={signOut}
            className="text-destructive cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
