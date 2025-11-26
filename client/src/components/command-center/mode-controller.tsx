import { useState, useEffect } from "react";
import { Sun, Zap, Moon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CommandMode = "morning" | "execution" | "evening";

interface ModeControllerProps {
  currentMode: CommandMode;
  onModeChange: (mode: CommandMode) => void;
}

const modeConfig = {
  morning: {
    label: "Morning",
    icon: Sun,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Plan your day",
  },
  execution: {
    label: "Focus",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "Get things done",
  },
  evening: {
    label: "Review",
    icon: Moon,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    description: "Reflect & prepare",
  },
};

function getSuggestedMode(): CommandMode {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "execution";
  return "evening";
}

export function useModeController() {
  const [mode, setMode] = useState<CommandMode>(() => {
    // Check localStorage for saved mode (for today)
    const today = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem(`command-mode-${today}`);
    if (saved && ["morning", "execution", "evening"].includes(saved)) {
      return saved as CommandMode;
    }
    return getSuggestedMode();
  });

  const [suggestedMode, setSuggestedMode] = useState<CommandMode | null>(null);

  // Check for mode suggestions every minute
  useEffect(() => {
    const checkSuggestion = () => {
      const suggested = getSuggestedMode();
      if (suggested !== mode) {
        setSuggestedMode(suggested);
      } else {
        setSuggestedMode(null);
      }
    };

    checkSuggestion();
    const interval = setInterval(checkSuggestion, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  const changeMode = (newMode: CommandMode) => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(`command-mode-${today}`, newMode);
    setMode(newMode);
    setSuggestedMode(null);
  };

  return { mode, suggestedMode, changeMode };
}

export default function ModeController({
  currentMode,
  onModeChange,
}: ModeControllerProps) {
  const suggestedMode = getSuggestedMode();
  const showSuggestion = suggestedMode !== currentMode;
  const config = modeConfig[currentMode];
  const suggestedConfig = showSuggestion ? modeConfig[suggestedMode] : null;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Current Mode Badge */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border",
          config.bgColor,
          config.borderColor
        )}
      >
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>
          {config.label}
        </span>
      </div>

      {/* Mode Switcher - Desktop */}
      <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-full p-1">
        {(Object.keys(modeConfig) as CommandMode[]).map((m) => {
          const cfg = modeConfig[m];
          const ModeIcon = cfg.icon;
          const isActive = m === currentMode;
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "p-2 rounded-full transition-all",
                isActive
                  ? cn(cfg.bgColor, cfg.color)
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={cfg.label}
            >
              <ModeIcon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Suggestion Banner */}
      {showSuggestion && suggestedConfig && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onModeChange(suggestedMode)}
          className={cn(
            "hidden sm:flex items-center gap-2 text-xs",
            suggestedConfig.color
          )}
        >
          <span>Switch to {suggestedConfig.label}?</span>
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
