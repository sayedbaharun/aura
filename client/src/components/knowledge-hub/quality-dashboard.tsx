import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface QualityMetrics {
  totalDocs: number;
  aiReadyDocs: number;
  aiReadyPercent: number;
  averageScore: number;
  needsReview: number;
}

export function QualityDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["docs-quality-metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/docs/quality/metrics");
      return response.json() as Promise<QualityMetrics>;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Docs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalDocs}</div>
          <p className="text-xs text-muted-foreground">
            Active documents in knowledge base
          </p>
        </CardContent>
      </Card>

      {/* AI Ready */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Ready</CardTitle>
          <Sparkles className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.aiReadyPercent}%
          </div>
          <Progress
            value={metrics.aiReadyPercent}
            className="h-2 mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.aiReadyDocs} of {metrics.totalDocs} docs
          </p>
        </CardContent>
      </Card>

      {/* Average Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              metrics.averageScore >= 70 ? "text-green-600 border-green-600" :
              metrics.averageScore >= 50 ? "text-yellow-600 border-yellow-600" :
              "text-red-600 border-red-600"
            )}
          >
            {metrics.averageScore}/100
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.averageScore}</div>
          <Progress
            value={metrics.averageScore}
            className="h-2 mt-2"
          />
        </CardContent>
      </Card>

      {/* Needs Review */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          <AlertTriangle className={cn(
            "h-4 w-4",
            metrics.needsReview > 0 ? "text-yellow-500" : "text-muted-foreground"
          )} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.needsReview}</div>
          <p className="text-xs text-muted-foreground">
            Docs below 70 quality score
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
