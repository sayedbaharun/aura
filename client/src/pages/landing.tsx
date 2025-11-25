import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Brain, ArrowRight } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  const enterApp = useCallback(() => {
    // Store in session that user has entered
    sessionStorage.setItem("sb-os-entered", "true");
    setLocation("/dashboard");
  }, [setLocation]);

  useEffect(() => {
    // Check if already entered this session
    if (sessionStorage.getItem("sb-os-entered") === "true") {
      setLocation("/dashboard");
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        enterApp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterApp, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-2xl bg-primary flex items-center justify-center shadow-2xl">
            <Brain className="h-14 w-14 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight">SB-OS</h1>
          <p className="text-xl text-muted-foreground">
            Personal Operating System
          </p>
        </div>

        {/* Enter prompt */}
        <div
          onClick={enterApp}
          className="mt-12 cursor-pointer group"
        >
          <div className="flex items-center justify-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
            <span className="text-lg">Press</span>
            <kbd className="px-3 py-1.5 text-sm font-semibold bg-muted border rounded-lg shadow-sm">
              Enter
            </kbd>
            <span className="text-lg">to continue</span>
            <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Subtle footer */}
        <p className="text-xs text-muted-foreground/50 mt-16">
          Your second brain, reimagined
        </p>
      </div>
    </div>
  );
}
