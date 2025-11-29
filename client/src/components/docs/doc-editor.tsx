import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MarkdownEditor from "./markdown-editor";
import { AttachmentsPanel } from "./attachments-panel";
import {
  Save,
  MoreHorizontal,
  Trash2,
  Star,
  Calendar,
  Tag,
  FileText,
  FolderOpen,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain: string | null;
  status: string;
  body: string | null;
  ventureId: string | null;
  projectId: string | null;
  parentId: string | null;
  isFolder: boolean;
  icon: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface DocEditorProps {
  docId: string;
  onClose?: () => void;
  onDelete?: () => void;
}

const DOC_TYPES = [
  { value: "page", label: "Page" },
  { value: "sop", label: "SOP" },
  { value: "strategy", label: "Strategy" },
  { value: "tech_doc", label: "Tech Doc" },
  { value: "process", label: "Process" },
  { value: "reference", label: "Reference" },
  { value: "spec", label: "Spec" },
  { value: "template", label: "Template" },
  { value: "playbook", label: "Playbook" },
  { value: "meeting_notes", label: "Meeting Notes" },
  { value: "research", label: "Research" },
  { value: "prompt", label: "Prompt" },
];

const DOC_DOMAINS = [
  { value: "venture_ops", label: "Venture Ops" },
  { value: "marketing", label: "Marketing" },
  { value: "product", label: "Product" },
  { value: "sales", label: "Sales" },
  { value: "tech", label: "Tech" },
  { value: "trading", label: "Trading" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
  { value: "hr", label: "HR" },
  { value: "personal", label: "Personal" },
];

const DOC_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export default function DocEditor({ docId, onClose, onDelete }: DocEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("page");
  const [domain, setDomain] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [isFolder, setIsFolder] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const { data: doc, isLoading } = useQuery<Doc>({
    queryKey: ["/api/docs", docId],
    queryFn: async () => {
      const res = await fetch(`/api/docs/${docId}`, {
        credentials: "include",
      });
      return await res.json();
    },
    enabled: !!docId,
  });

  // Initialize form from doc data
  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setBody(doc.body || "");
      setType(doc.type);
      setDomain(doc.domain);
      setStatus(doc.status);
      setIsFolder(doc.isFolder);
      setHasUnsavedChanges(false);
    }
  }, [doc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/docs/${docId}`, {
        title,
        body,
        type,
        domain,
        status,
        isFolder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/docs/tree"] });
      toast({ title: "Saved", description: "Document saved successfully" });
      setHasUnsavedChanges(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save document", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/docs/${docId}/recursive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/docs/tree"] });
      toast({ title: "Deleted", description: "Document deleted" });
      onDelete?.();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleBodyChange = (newBody: string) => {
    setBody(newBody);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = () => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  // Auto-save on Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, title, body, type, domain, status]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Document not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 bg-transparent"
              placeholder="Untitled"
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {DOC_TYPES.find((t) => t.value === type)?.label || type}
              </Badge>
              {domain && (
                <Badge variant="secondary" className="text-xs">
                  {DOC_DOMAINS.find((d) => d.value === domain)?.label || domain}
                </Badge>
              )}
              <Badge
                variant={status === "active" ? "default" : "secondary"}
                className="text-xs"
              >
                {status}
              </Badge>
              {isFolder && (
                <Badge variant="outline" className="text-xs">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Folder
                </Badge>
              )}
              {hasUnsavedChanges && (
                <span className="text-xs text-muted-foreground">• Unsaved changes</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              <Tag className="h-4 w-4 mr-2" />
              Properties
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsFolder(!isFolder)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {isFolder ? "Convert to page" : "Convert to folder"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Properties Panel */}
        {showMetadata && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Domain</label>
                <Select
                  value={domain || ""}
                  onValueChange={(v) => {
                    setDomain(v || null);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_DOMAINS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created: {new Date(doc.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Updated: {new Date(doc.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Editor and Attachments */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Main Editor */}
        <div className="flex-1 min-h-0">
          <MarkdownEditor
            value={body}
            onChange={handleBodyChange}
            placeholder="Start writing..."
            minHeight="100%"
            className="h-full border-0 rounded-none"
            docId={docId}
          />
        </div>

        {/* Attachments Panel */}
        <div className="w-80 flex-shrink-0 border-l overflow-y-auto">
          <AttachmentsPanel docId={docId} />
        </div>
      </div>
    </div>
  );
}
