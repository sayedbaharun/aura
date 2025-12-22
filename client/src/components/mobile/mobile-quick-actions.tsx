import { useState } from "react";
import { Plus, X, Zap, Heart, Sun, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useCaptureModal } from "@/lib/capture-modal-store";

/**
 * Mobile Quick Actions - Floating action button for mobile
 *
 * Shows a floating + button that expands to reveal quick actions:
 * - Quick Capture
 * - New Task
 * - Log Health
 * - Morning Ritual
 */
export default function MobileQuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const { openCaptureModal } = useCaptureModal();

  const actions = [
    {
      icon: Zap,
      label: "Capture",
      color: "bg-amber-500 hover:bg-amber-600",
      action: () => {
        openCaptureModal();
        setIsOpen(false);
      },
    },
    {
      icon: CheckSquare,
      label: "Task",
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => {
        navigate("/tasks?new=true");
        setIsOpen(false);
      },
    },
    {
      icon: Heart,
      label: "Health",
      color: "bg-red-500 hover:bg-red-600",
      action: () => {
        navigate("/health-hub?log=true");
        setIsOpen(false);
      },
    },
    {
      icon: Sun,
      label: "Morning",
      color: "bg-orange-500 hover:bg-orange-600",
      action: () => {
        navigate("/morning");
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {/* Action buttons - shown when expanded */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-200",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {actions.map((action, index) => (
          <div
            key={action.label}
            className="flex items-center gap-2 justify-end"
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
            }}
          >
            <span className="text-sm font-medium bg-background/90 backdrop-blur px-2 py-1 rounded shadow-lg">
              {action.label}
            </span>
            <Button
              size="icon"
              className={cn("h-12 w-12 rounded-full shadow-lg", action.color)}
              onClick={action.action}
            >
              <action.icon className="h-5 w-5 text-white" />
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-200",
          isOpen
            ? "bg-gray-800 hover:bg-gray-900 rotate-45"
            : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
