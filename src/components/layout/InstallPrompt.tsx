import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem("install-prompt-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    if (isIos()) {
      // Delay iOS guide to not be intrusive
      const timer = setTimeout(() => setShowIosGuide(true), 5000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
  }, []);

  if (!showPrompt && !showIosGuide) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              Install Bilal Traders
            </p>
            {showIosGuide ? (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">
                  Install this app on your device:
                </p>
                <ol className="text-xs text-muted-foreground mt-2 space-y-1.5 list-none">
                  <li className="flex items-center gap-1.5">
                    <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    Tap <Share className="w-3.5 h-3.5 inline text-primary" /> Share
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    Scroll & tap <Plus className="w-3.5 h-3.5 inline text-primary" /> Add to Home Screen
                  </li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Quick access from your home screen. Works offline too!
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {!showIosGuide && (
                <Button size="sm" onClick={handleInstall} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Install
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                {showIosGuide ? "Got it" : "Not now"}
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
