import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  Edit,
  RefreshCw,
  BookOpen,
  Lightbulb,
  GraduationCap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface AiMetrics {
  totalSuggestions: number;
  acceptedCount: number;
  editedCount: number;
  rejectedCount: number;
  regeneratedCount: number;
  acceptanceRate: number;
  acceptWithMinorEditRate: number;
  averageEditDistance: number;
  trend: 'improving' | 'stable' | 'declining';
  byField: { field: string; total: number; acceptanceRate: number }[];
  examplesCount: number;
  patternsCount: number;
  teachingsCount: number;
}

export function AiPerformance() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["ai-learning-metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ai/learning/metrics");
      return response.json() as Promise<AiMetrics>;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const TrendIcon = metrics.trend === 'improving' ? TrendingUp :
                    metrics.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = metrics.trend === 'improving' ? 'text-green-500' :
                     metrics.trend === 'declining' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Acceptance Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <TrendIcon className={cn("h-4 w-4", trendColor)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.acceptanceRate * 100)}%
            </div>
            <Progress
              value={metrics.acceptanceRate * 100}
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.acceptedCount} of {metrics.totalSuggestions} accepted as-is
            </p>
          </CardContent>
        </Card>

        {/* Effective Rate (accepted + minor edits) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Effective Rate</CardTitle>
            <Badge variant="outline">+minor edits</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.acceptWithMinorEditRate * 100)}%
            </div>
            <Progress
              value={metrics.acceptWithMinorEditRate * 100}
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Accepted or edited &lt;20%
            </p>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Base</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{metrics.examplesCount}</span>
                <span className="text-muted-foreground">examples</span>
              </div>
              <div className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{metrics.patternsCount}</span>
                <span className="text-muted-foreground">patterns</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.teachingsCount} direct teachings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">User Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{metrics.acceptedCount} Accepted</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-blue-500" />
              <span>{metrics.editedCount} Edited</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <span>{metrics.rejectedCount} Rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-yellow-500" />
              <span>{metrics.regeneratedCount} Regenerated</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-field breakdown */}
      {metrics.byField.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">By Field</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.byField.map((field) => (
                <div key={field.field} className="flex items-center gap-4">
                  <span className="text-sm w-32 capitalize">{field.field}</span>
                  <Progress
                    value={field.acceptanceRate * 100}
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-muted-foreground w-16">
                    {Math.round(field.acceptanceRate * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
