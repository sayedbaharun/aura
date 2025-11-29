import { useBacklinks } from "@/hooks/use-backlinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  FileText,
  Sparkles,
  FileCode,
  Layout,
  Book,
  Loader2,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain?: string;
  status: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
}

interface BacklinksPanelProps {
  docId: string;
  docTitle: string;
  className?: string;
  defaultCollapsed?: boolean;
}

const typeIcons = {
  sop: FileText,
  prompt: Sparkles,
  spec: FileCode,
  template: Layout,
  playbook: Book,
  page: FileText,
};

const domainColors = {
  venture_ops: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  product: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  sales: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  tech: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  personal: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

/**
 * BacklinksPanel component - Shows documents that reference the current doc
 *
 * Displays a collapsible panel showing all docs that contain links to the current doc.
 * Useful for understanding document relationships and navigation.
 *
 * @param docId - ID of the current document
 * @param docTitle - Title of the current document
 * @param className - Optional CSS class name
 * @param defaultCollapsed - Whether the panel should start collapsed (default: false)
 */
export function BacklinksPanel({
  docId,
  docTitle,
  className,
  defaultCollapsed = false,
}: BacklinksPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [, setLocation] = useLocation();

  const { data: backlinks, isLoading, error } = useBacklinks(docId, docTitle);

  const handleDocClick = (docId: string) => {
    setLocation(`/knowledge/${docId}`);
  };

  if (error) {
    return null; // Silently fail - backlinks are a nice-to-have feature
  }

  const backlinkCount = backlinks?.length || 0;
  const hasBacklinks = backlinkCount > 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Referenced By</CardTitle>
            {hasBacklinks && (
              <Badge variant="secondary" className="ml-2">
                {backlinkCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading backlinks...</span>
            </div>
          ) : !hasBacklinks ? (
            <div className="text-center py-8">
              <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents link to this page yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Other docs that reference this one will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backlinks?.map((doc) => {
                const Icon = typeIcons[doc.type as keyof typeof typeIcons] || FileText;

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleDocClick(doc.id)}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer group"
                  >
                    <Icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {doc.title}
                      </h4>
                      <div className="flex gap-1 flex-wrap items-center">
                        <Badge variant="outline" className="text-xs">
                          {doc.type === "sop" ? "SOP" : doc.type}
                        </Badge>
                        {doc.domain && (
                          <Badge
                            className={cn(
                              "text-xs",
                              domainColors[doc.domain as keyof typeof domainColors]
                            )}
                          >
                            {doc.domain.replace("_", " ")}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                        </span>
                      </div>

                      {doc.body && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {doc.body.substring(0, 150)}
                          {doc.body.length > 150 && "..."}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
