import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link as WouterLink } from "wouter";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, FileCode, Layout, Book, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocLinkProps {
  docId: string;
  title: string;
}

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

const typeIcons = {
  sop: FileText,
  prompt: Sparkles,
  spec: FileCode,
  template: Layout,
  playbook: Book,
  page: FileText,
};

/**
 * DocLink component - Renders a clickable link to a document with hover preview
 * @param docId - ID of the linked document
 * @param title - Display title for the link
 */
function DocLink({ docId, title }: DocLinkProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: doc, isLoading } = useQuery<Doc>({
    queryKey: [`/api/docs/${docId}`],
    enabled: isOpen, // Only fetch on hover
    staleTime: 60000, // Cache for 60 seconds
  });

  const Icon = doc ? typeIcons[doc.type as keyof typeof typeIcons] || FileText : FileText;

  // Extract first 200 characters of body for preview
  const preview = doc?.body
    ? doc.body.substring(0, 200) + (doc.body.length > 200 ? "..." : "")
    : "";

  const linkContent = (
    <WouterLink
      href={`/knowledge/${docId}`}
      className={cn(
        "text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium",
        !doc && "text-red-600 dark:text-red-400"
      )}
    >
      {title}
    </WouterLink>
  );

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <span className="inline-block">{linkContent}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top" align="start">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : doc ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{doc.title}</h4>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {doc.type === "sop" ? "SOP" : doc.type}
                  </Badge>
                  {doc.domain && (
                    <Badge variant="outline" className="text-xs">
                      {doc.domain.replace("_", " ")}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      doc.status === "active" && "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300",
                      doc.status === "draft" && "bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                      doc.status === "archived" && "bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    )}
                  >
                    {doc.status}
                  </Badge>
                </div>
              </div>
            </div>

            {preview && (
              <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                <p className="line-clamp-4">{preview}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">Document not found</h4>
              <p className="text-xs text-muted-foreground mt-1">
                This document may have been deleted or you don't have access to it.
              </p>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Parses markdown text and replaces [[Title]](doc-id) syntax with DocLink components
 * @param text - Raw markdown text containing doc links
 * @returns Array of React nodes (text and DocLink components)
 */
export function parseDocLinks(text: string): React.ReactNode[] {
  // Regex to match [[Title]](doc-id) or [[Title]] patterns
  const linkPattern = /\[\[([^\]]+)\]\](?:\(([^)]+)\))?/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    const [fullMatch, title, docId] = match;
    const matchStart = match.index;

    // Add text before the link
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }

    // Add the link component
    if (docId) {
      // Full syntax with ID: [[Title]](doc-id)
      parts.push(<DocLink key={`${docId}-${matchStart}`} docId={docId} title={title} />);
    } else {
      // Incomplete syntax without ID: [[Title]]
      // Render as plain text but styled to indicate it's a potential link
      parts.push(
        <span key={`incomplete-${matchStart}`} className="text-amber-600 dark:text-amber-400">
          [[{title}]]
        </span>
      );
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * DocLinkRenderer component - Wraps content and renders doc links
 * Use this as a wrapper around markdown content that may contain [[doc links]]
 */
export function DocLinkRenderer({ children }: { children: string }) {
  const parsedContent = parseDocLinks(children);

  return <>{parsedContent}</>;
}
