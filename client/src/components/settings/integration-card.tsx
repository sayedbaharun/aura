import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Circle, AlertTriangle } from "lucide-react";

export type IntegrationStatus = "connected" | "error" | "not_configured";

export interface IntegrationInfo {
  name: string;
  status: IntegrationStatus;
  description: string;
  lastChecked: string;
  errorMessage?: string;
}

interface IntegrationCardProps {
  integration: IntegrationInfo;
}

export default function IntegrationCard({ integration }: IntegrationCardProps) {
  const getStatusIcon = () => {
    switch (integration.status) {
      case "connected":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "not_configured":
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (integration.status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            Error
          </Badge>
        );
      case "not_configured":
        return (
          <Badge variant="secondary">
            Not Configured
          </Badge>
        );
    }
  };

  const getIntegrationIcon = () => {
    // Return appropriate icon based on integration name
    const iconClasses = "h-8 w-8";
    switch (integration.name.toLowerCase()) {
      case "openai":
        return (
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
            </svg>
          </div>
        );
      case "google calendar":
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15v11.25zM7.5 10.5v1.5h1.5v-1.5H7.5zm0 3v1.5h1.5v-1.5H7.5zm3-3v1.5H12v-1.5h-1.5zm0 3v1.5H12v-1.5h-1.5zm3-3v1.5h1.5v-1.5H13.5zm0 3v1.5h1.5v-1.5H13.5zm3-3v1.5H18v-1.5h-1.5zm0 3v1.5H18v-1.5h-1.5z" />
            </svg>
          </div>
        );
      case "gmail":
        return (
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            </svg>
          </div>
        );
      case "telegram":
        return (
          <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
            <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </div>
        );
      case "notion":
        return (
          <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
            <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.877.466L16.293.086c1.635-.14 2.055.093 2.756.607l3.876 2.709c.466.326.6.466.6.886v15.324c0 .84-.327 1.12-.84 1.166L8.124 21.7c-.373.046-.56-.047-.793-.373L4.18 16.793c-.42-.56-.607-.98-.607-1.447V1.399c0-.56.28-.98.84-1.026z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
            <Circle className={iconClasses} />
          </div>
        );
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {getIntegrationIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{integration.name}</h3>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {integration.description}
            </p>
            {integration.status === "error" && integration.errorMessage && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {integration.errorMessage}
              </div>
            )}
            {integration.status === "not_configured" && (
              <p className="text-xs text-muted-foreground mt-2">
                Configure in .env file to enable this integration
              </p>
            )}
          </div>
          {getStatusIcon()}
        </div>
      </CardContent>
    </Card>
  );
}
