import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, X, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface QualityFactor {
  name: string;
  score: number;
  maxScore: number;
  met: boolean;
  suggestion?: string;
}

interface QualityBreakdown {
  score: number;
  maxScore: number;
  factors: QualityFactor[];
  aiReady: boolean;
  missingRequired: string[];
  suggestions?: string[];
}

interface QualityIndicatorProps {
  docId?: string;  // If provided, fetch quality from API
  qualityData?: QualityBreakdown;  // Or pass data directly
  showBreakdown?: boolean;  // Show detailed breakdown
  compact?: boolean;  // Compact mode for inline display
  onRecalculate?: () => void;  // Callback after recalculation
}

// Color based on score
function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 bg-green-100";
  if (score >= 50) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

function getProgressColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

// Format factor name for display
function formatFactorName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export function QualityIndicator({
  docId,
  qualityData,
  showBreakdown = false,
  compact = false,
  onRecalculate,
}: QualityIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch quality if docId provided
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["doc-quality", docId],
    queryFn: async () => {
      if (!docId) return null;
      const response = await apiRequest("GET", `/api/docs/${docId}/quality`);
      return response.json();
    },
    enabled: !!docId && !qualityData,
  });

  const quality = qualityData || data;

  const handleRecalculate = async () => {
    if (!docId) return;
    await apiRequest("POST", `/api/docs/${docId}/recalculate-quality`);
    refetch();
    onRecalculate?.();
  };

  if (isLoading) {
    return <Badge variant="outline" className="animate-pulse">Loading...</Badge>;
  }

  if (!quality) {
    return null;
  }

  // Compact mode - just badge
  if (compact) {
    return (
      <Badge className={cn("font-mono", getScoreColor(quality.score))}>
        {quality.aiReady && <Sparkles className="h-3 w-3 mr-1" />}
        {quality.score}/{quality.maxScore}
      </Badge>
    );
  }

  // Full mode with breakdown
  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Quality Score</span>
              <Badge className={cn("font-mono", getScoreColor(quality.score))}>
                {quality.score}/{quality.maxScore}
              </Badge>
              {quality.aiReady && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Ready
                </Badge>
              )}
            </div>
            <Progress
              value={(quality.score / quality.maxScore) * 100}
              className="h-2"
            />
          </div>

          {docId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRecalculate}
              className="h-7"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}

          {showBreakdown && (
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7">
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {showBreakdown && (
          <CollapsibleContent className="pt-3">
            <div className="space-y-2 text-sm">
              {quality.factors.map((factor: QualityFactor) => (
                <div key={factor.name} className="flex items-center gap-2">
                  {factor.met ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-400" />
                  )}
                  <span className={factor.met ? "" : "text-muted-foreground"}>
                    {formatFactorName(factor.name)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {factor.score}/{factor.maxScore}
                  </span>
                </div>
              ))}
            </div>

            {quality.suggestions && quality.suggestions.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Suggestions to improve:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {quality.suggestions.slice(0, 3).map((suggestion: string, i: number) => (
                    <li key={i} className="flex gap-1">
                      <span>•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

// Export a simpler badge variant
export function QualityBadge({ score, aiReady }: { score: number; aiReady: boolean }) {
  return (
    <Badge className={cn("font-mono text-xs", getScoreColor(score))}>
      {aiReady && <Sparkles className="h-3 w-3 mr-1" />}
      {score}
    </Badge>
  );
}
