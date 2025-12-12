import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Upload,
  Trash2,
  Plus,
  BookOpen,
  Brain,
  FileUp,
  File,
  Image,
  X,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TradingKnowledgeDoc {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  storageType: string | null;
  fileData: string | null;
  extractedText: string | null;
  summary: string | null;
  includeInContext: boolean;
  priority: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "strategy", label: "Strategy", icon: <Brain className="h-4 w-4" /> },
  { value: "playbook", label: "Playbook", icon: <BookOpen className="h-4 w-4" /> },
  { value: "notes", label: "Notes", icon: <FileText className="h-4 w-4" /> },
  { value: "research", label: "Research", icon: <FileText className="h-4 w-4" /> },
  { value: "psychology", label: "Psychology", icon: <Brain className="h-4 w-4" /> },
  { value: "education", label: "Education", icon: <BookOpen className="h-4 w-4" /> },
  { value: "other", label: "Other", icon: <File className="h-4 w-4" /> },
];

const getCategoryLabel = (category: string) => {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <FileText className="h-5 w-5" />;
  if (fileType.startsWith("image/")) return <Image className="h-5 w-5" />;
  if (fileType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <FileText className="h-5 w-5" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function TradingKnowledgeManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TradingKnowledgeDoc | null>(null);

  // Form state for upload
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadExtractedText, setUploadExtractedText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadIncludeInContext, setUploadIncludeInContext] = useState(true);

  // Fetch knowledge docs
  const { data: docs = [], isLoading } = useQuery<TradingKnowledgeDoc[]>({
    queryKey: ["/api/trading/knowledge-docs"],
    queryFn: async () => {
      const res = await fetch("/api/trading/knowledge-docs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch knowledge docs");
      return await res.json();
    },
  });

  // Create doc mutation
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/trading/knowledge-docs", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create document");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/knowledge-docs"] });
      toast({
        title: "Document Uploaded",
        description: "Your knowledge document has been added.",
      });
      resetUploadForm();
      setIsUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update doc mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TradingKnowledgeDoc> }) => {
      const res = await apiRequest("PATCH", `/api/trading/knowledge-docs/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/knowledge-docs"] });
      toast({
        title: "Document Updated",
        description: "Your changes have been saved.",
      });
      setIsEditOpen(false);
      setSelectedDoc(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update document",
        variant: "destructive",
      });
    },
  });

  // Delete doc mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/trading/knowledge-docs/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/knowledge-docs"] });
      toast({
        title: "Document Deleted",
        description: "The document has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadCategory("other");
    setUploadTags("");
    setUploadExtractedText("");
    setUploadFile(null);
    setUploadIncludeInContext(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-fill title from filename if empty
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = () => {
    if (!uploadTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the document",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", uploadTitle.trim());
    formData.append("category", uploadCategory);
    formData.append("includeInContext", uploadIncludeInContext.toString());

    if (uploadDescription) formData.append("description", uploadDescription);
    if (uploadTags) formData.append("tags", uploadTags);
    if (uploadExtractedText) formData.append("extractedText", uploadExtractedText);
    if (uploadFile) formData.append("file", uploadFile);

    createMutation.mutate(formData);
  };

  const handleEdit = (doc: TradingKnowledgeDoc) => {
    setSelectedDoc(doc);
    setIsEditOpen(true);
  };

  const handleToggleContext = (doc: TradingKnowledgeDoc) => {
    updateMutation.mutate({
      id: doc.id,
      data: { includeInContext: !doc.includeInContext },
    });
  };

  const docsIncludedCount = docs.filter(d => d.includeInContext).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>
                  Upload documents to train your Trading AI Agent
                </CardDescription>
              </div>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Knowledge Document</DialogTitle>
                  <DialogDescription>
                    Upload a document or add text content for the AI to learn from.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>File (Optional)</Label>
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadFile ? (
                        <div className="flex items-center justify-center gap-2">
                          {getFileIcon(uploadFile.type)}
                          <span className="text-sm">{uploadFile.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <FileUp className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Click to upload (PDF, TXT, MD, Images)</p>
                          <p className="text-xs">Max 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., ICT Market Structure Rules"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              {cat.icon}
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this document..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Extracted Text (for manual input if no file) */}
                  {!uploadFile && (
                    <div className="space-y-2">
                      <Label htmlFor="extractedText">Content (Text)</Label>
                      <Textarea
                        id="extractedText"
                        placeholder="Paste or type the content you want the AI to learn..."
                        value={uploadExtractedText}
                        onChange={(e) => setUploadExtractedText(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      placeholder="e.g., ict, market-structure, entries"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                    />
                  </div>

                  {/* Include in Context */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include in AI Context</Label>
                      <p className="text-xs text-muted-foreground">
                        The AI will reference this document when chatting
                      </p>
                    </div>
                    <Switch
                      checked={uploadIncludeInContext}
                      onCheckedChange={setUploadIncludeInContext}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    resetUploadForm();
                    setIsUploadOpen(false);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={createMutation.isPending}>
                    <Upload className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>
              {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded
              {docsIncludedCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({docsIncludedCount} active in AI context)
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No Documents Yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload trading strategies, playbooks, or notes to train your AI assistant.
            </p>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {docs.map(doc => (
                  <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-1">
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium truncate">{doc.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(doc.category)}
                            </Badge>
                            {doc.includeInContext ? (
                              <Badge variant="default" className="text-xs bg-amber-500">
                                <Eye className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {doc.fileName && (
                              <span>{doc.fileName}</span>
                            )}
                            {doc.fileSize && (
                              <span>{formatFileSize(doc.fileSize)}</span>
                            )}
                            <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleContext(doc)}
                          title={doc.includeInContext ? "Remove from AI context" : "Add to AI context"}
                        >
                          {doc.includeInContext ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setSelectedDoc(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update the document details and AI context settings.
            </DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={selectedDoc.title}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, title: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={selectedDoc.category}
                  onValueChange={(value) => setSelectedDoc({ ...selectedDoc, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          {cat.icon}
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedDoc.description || ""}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Extracted Text */}
              <div className="space-y-2">
                <Label htmlFor="edit-extractedText">Content (Text)</Label>
                <Textarea
                  id="edit-extractedText"
                  value={selectedDoc.extractedText || ""}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, extractedText: e.target.value })}
                  rows={4}
                  placeholder="Text content for AI to reference..."
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  value={selectedDoc.tags || ""}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, tags: e.target.value })}
                />
              </div>

              {/* Include in Context */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include in AI Context</Label>
                  <p className="text-xs text-muted-foreground">
                    The AI will reference this document when chatting
                  </p>
                </div>
                <Switch
                  checked={selectedDoc.includeInContext}
                  onCheckedChange={(checked) => setSelectedDoc({ ...selectedDoc, includeInContext: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditOpen(false);
              setSelectedDoc(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedDoc) {
                  updateMutation.mutate({
                    id: selectedDoc.id,
                    data: {
                      title: selectedDoc.title,
                      description: selectedDoc.description,
                      category: selectedDoc.category,
                      tags: selectedDoc.tags,
                      extractedText: selectedDoc.extractedText,
                      includeInContext: selectedDoc.includeInContext,
                    },
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
