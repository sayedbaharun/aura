import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plug } from "lucide-react";
import IntegrationCard, { type IntegrationInfo } from "./integration-card";
import { queryClient } from "@/lib/queryClient";

export default function IntegrationsStatus() {
  const { data: integrations = [], isLoading, isFetching } = useQuery<IntegrationInfo[]>({
    queryKey: ["/api/settings/integrations"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/settings/integrations"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;
  const errorCount = integrations.filter((i) => i.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Integration Status
              </CardTitle>
              <CardDescription>
                {connectedCount} connected, {errorCount} with errors, {integrations.length - connectedCount - errorCount} not configured
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Integration Cards */}
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.name} integration={integration} />
        ))}
      </div>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">How to configure integrations</h4>
          <p className="text-sm text-muted-foreground">
            Integration credentials are managed securely via environment variables in your{" "}
            <code className="bg-muted px-1 py-0.5 rounded">.env</code> file.
            For security reasons, API keys are never displayed in the UI.
          </p>
          <ul className="text-sm text-muted-foreground mt-3 space-y-1 list-disc list-inside">
            <li>OpenRouter: Set <code className="bg-muted px-1 py-0.5 rounded">OPENROUTER_API_KEY</code></li>
            <li>Google Calendar: Set <code className="bg-muted px-1 py-0.5 rounded">GOOGLE_CALENDAR_CLIENT_ID</code>, <code className="bg-muted px-1 py-0.5 rounded">CLIENT_SECRET</code>, <code className="bg-muted px-1 py-0.5 rounded">REFRESH_TOKEN</code></li>
            <li>Gmail: Set <code className="bg-muted px-1 py-0.5 rounded">GMAIL_CLIENT_ID</code>, <code className="bg-muted px-1 py-0.5 rounded">CLIENT_SECRET</code>, <code className="bg-muted px-1 py-0.5 rounded">REFRESH_TOKEN</code></li>
            <li>Telegram: Set <code className="bg-muted px-1 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
