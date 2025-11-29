import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Paperclip,
  Upload,
  Loader2,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAttachments } from "@/hooks/use-attachments";
import { AttachmentItem } from "./attachment-item";
import { cn } from "@/lib/utils";

interface AttachmentsPanelProps {
  docId: string | null | undefined;
  className?: string;
}

export function AttachmentsPanel({ docId, className }: AttachmentsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { attachments, isLoading, deleteAttachment } = useAttachments(docId);

  const handleDelete = (attachmentId: string) => {
    deleteAttachment.mutate(attachmentId);
  };

  const isEmpty = attachments.length === 0;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-1"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
              {!isCollapsed && attachments.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({attachments.length})
                </span>
              )}
            </CardTitle>
          </button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <>
          <Separator />
          <CardContent className="p-4 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isEmpty ? (
              <EmptyState docId={docId} />
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <AttachmentItem
                      key={attachment.id}
                      attachment={attachment}
                      onDelete={handleDelete}
                      isDeleting={deleteAttachment.isPending}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}

function EmptyState({ docId }: { docId: string | null | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <FileUp className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">No attachments</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
        Upload files or paste image URLs to attach them to this document
      </p>
      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 max-w-[240px]">
        <p className="font-medium mb-1">How to add attachments:</p>
        <ul className="text-left space-y-1 ml-4 list-disc">
          <li>Use image upload in editor</li>
          <li>Paste image URLs directly</li>
          <li>Link to external files</li>
        </ul>
      </div>
    </div>
  );
}
