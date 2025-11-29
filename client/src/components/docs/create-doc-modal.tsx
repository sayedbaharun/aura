import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, FolderPlus, ArrowLeft } from "lucide-react";
import TemplateSelector from "./template-selector";
import type { DocTemplate } from "@/lib/doc-templates";

interface CreateDocModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventureId: string;
  parentId: string | null;
  onCreated?: (docId: string) => void;
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

export default function CreateDocModal({
  open,
  onOpenChange,
  ventureId,
  parentId,
  onCreated,
}: CreateDocModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("page");
  const [isFolder, setIsFolder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/docs", {
        title: title.trim() || selectedTemplate?.name || "Untitled",
        type,
        ventureId,
        parentId,
        isFolder,
        status: "draft",
        body: selectedTemplate?.body || "",
      });
      return await res.json();
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/docs/tree"] });
      toast({
        title: "Created",
        description: `${isFolder ? "Folder" : "Page"} created successfully`,
      });
      handleClose();
      onCreated?.(doc.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleClose = () => {
    setTitle("");
    setType("page");
    setIsFolder(false);
    setSelectedTemplate(null);
    setShowTemplateSelector(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showTemplateSelector ? "Create New Document" : "Document Details"}
          </DialogTitle>
        </DialogHeader>

        {showTemplateSelector ? (
          <TemplateSelector
            onSelect={(template) => {
              if (template.id === 'blank') {
                setSelectedTemplate(null);
                setShowTemplateSelector(false);
              } else {
                setSelectedTemplate(template);
                setType(template.defaultType);
                setTitle(template.name);
                setShowTemplateSelector(false);
              }
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedTemplate && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateSelector(true)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </div>
            )}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isFolder ? "Folder name" : "Page title"}
              autoFocus
            />
          </div>

          {!isFolder && (
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
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
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-folder">Create as folder</Label>
              <p className="text-xs text-muted-foreground">
                Folders can contain other pages
              </p>
            </div>
            <Switch
              id="is-folder"
              checked={isFolder}
              onCheckedChange={setIsFolder}
            />
          </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
