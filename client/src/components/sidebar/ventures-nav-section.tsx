import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "wouter";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  Rocket,
  Building2,
  Sparkles,
  CircleDot
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Venture {
  id: string;
  name: string;
  slug?: string;
  status: string;
  domain: string;
  icon?: string;
  color?: string;
}

interface VenturesNavSectionProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

// Get icon for venture based on name or domain
function getVentureIcon(venture: Venture) {
  const name = venture.name.toLowerCase();
  if (name.includes("trading")) return TrendingUp;
  if (name.includes("mydub") || name.includes("dub")) return Rocket;
  if (name.includes("realty") || name.includes("real estate")) return Building2;
  if (name.includes("ai") || name.includes("arc")) return Sparkles;
  return CircleDot;
}

export default function VenturesNavSection({
  isCollapsed = false,
  onItemClick
}: VenturesNavSectionProps) {
  const [location] = useLocation();
  const storageKey = "nav-section-ventures-expanded";

  // Fetch ventures
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Filter to show all ventures except archived
  const activeVentures = ventures.filter(v => v.status !== "archived");

  // Initialize from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "true";
      }
    }
    return true;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, String(isExpanded));
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if any venture is active
  const isVenturesActive = location.startsWith("/ventures");
  const activeVentureId = location.match(/\/ventures\/([^/]+)/)?.[1];

  // Collapsed mode - just show icon with tooltip
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/ventures"
              className={cn(
                "flex items-center justify-center h-10 w-full rounded-md transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isVenturesActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground"
              )}
              onClick={onItemClick}
            >
              <Briefcase className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-medium">Ventures</span>
            {activeVentures.slice(0, 5).map(v => (
              <span key={v.id} className="text-xs text-muted-foreground">• {v.name}</span>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="mb-1">
      {/* Ventures Header - Clickable to expand/collapse */}
      <button
        onClick={toggleExpanded}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isVenturesActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground"
        )}
      >
        <Briefcase className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">Ventures</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Venture Sub-items */}
      {isExpanded && (
        <div className="ml-4 pl-3 border-l border-sidebar-border mt-1 space-y-0.5">
          {activeVentures.map((venture) => {
            const VentureIcon = getVentureIcon(venture);
            const isActive = activeVentureId === venture.id;

            return (
              <Link
                key={venture.id}
                href={`/ventures/${venture.slug || venture.id}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground"
                )}
                onClick={onItemClick}
              >
                <VentureIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{venture.name}</span>
              </Link>
            );
          })}

          {/* Add Venture Link */}
          <Link
            href="/ventures?new=true"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "text-muted-foreground"
            )}
            onClick={onItemClick}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Add Venture</span>
          </Link>
        </div>
      )}
    </div>
  );
}
