import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  Download,
  Trash2,
  Link2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Attachment } from "@/hooks/use-attachments";
import {
  formatFileSize,
  getFileIcon,
  getImagePreviewUrl,
  isImageType,
  copyToClipboard,
  getMarkdownSyntax,
} from "@/lib/file-utils";
import { cn } from "@/lib/utils";

interface AttachmentItemProps {
  attachment: Attachment;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function AttachmentItem({
  attachment,
  onDelete,
  isDeleting = false,
}: AttachmentItemProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const FileIcon = getFileIcon(attachment.type);
  const previewUrl = getImagePreviewUrl(attachment);
  const isImage = isImageType(attachment.type);

  const handleCopyLink = async () => {
    if (attachment.url) {
      const success = await copyToClipboard(attachment.url);
      if (success) {
        toast({
          title: "Link copied",
          description: "Attachment URL copied to clipboard.",
        });
      } else {
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleInsertToDoc = async () => {
    const markdown = getMarkdownSyntax(attachment);
    const success = await copyToClipboard(markdown);
    if (success) {
      toast({
        title: "Markdown copied",
        description: "Paste into your document to insert this file.",
      });
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy markdown to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (attachment.url) {
      window.open(attachment.url, "_blank");
    }
  };

  const handleDelete = () => {
    onDelete(attachment.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
          isDeleting && "opacity-50 pointer-events-none"
        )}
      >
        {/* Preview/Icon */}
        <div className="flex-shrink-0">
          {isImage && previewUrl ? (
            <div className="w-12 h-12 rounded overflow-hidden border bg-muted">
              <img
                src={previewUrl}
                alt={attachment.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            {attachment.url && (
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(attachment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {attachment.url && (
                <>
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleInsertToDoc}>
                <FileText className="h-4 w-4 mr-2" />
                Insert into doc
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{attachment.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
