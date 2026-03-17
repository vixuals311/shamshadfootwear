import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function PwaUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:right-4 sm:w-96">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Update Available</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A new version is ready. Update now for the latest features.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => updateServiceWorker(true)}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update Now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowPrompt(false);
                setNeedRefresh(false);
              }}
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={() => {
            setShowPrompt(false);
            setNeedRefresh(false);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
