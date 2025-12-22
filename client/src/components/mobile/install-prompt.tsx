import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA Install Prompt
 *
 * Shows a prompt encouraging users to install the PWA on mobile.
 * Only shows on mobile devices that haven't installed the app yet.
 *
 * Features:
 * - Detects if app can be installed (beforeinstallprompt event)
 * - Shows iOS-specific instructions (iOS doesn't support beforeinstallprompt)
 * - Dismissible with "Don't show again" option
 * - Remembers dismissal in localStorage
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Listen for beforeinstallprompt (Chrome/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS, show prompt after a delay (if on mobile)
    if (ios && /Mobile/.test(navigator.userAgent)) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = (permanent: boolean) => {
    setShowPrompt(false);
    if (permanent) {
      localStorage.setItem("pwa-install-dismissed", "true");
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden animate-in slide-in-from-bottom-4">
      <Card className="shadow-xl border-2">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Install SB-OS</h3>
              {isIOS ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Tap <span className="inline-flex items-center"><Download className="h-3 w-3 mx-1" /></span> then "Add to Home Screen" for the best experience.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Install the app for quick access and offline support.
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mt-1 -mr-1 h-8 w-8"
              onClick={() => handleDismiss(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!isIOS && deferredPrompt && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleInstall}
              >
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDismiss(true)}
              >
                Don't show again
              </Button>
            </div>
          )}

          {isIOS && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => handleDismiss(true)}
            >
              Got it, don't show again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
