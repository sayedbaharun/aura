/**
 * Knowledge Files Browser
 *
 * Upload and browse PDFs, images, and documents with AI extraction
 */
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Download,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface KnowledgeFile {
  id: string;
  name: string;
  description?: string;
  category: string;
  originalFileName: string;
  mimeType: string;
  fileSize?: number;
  storageType: string;
  googleDriveUrl?: string;
  processingStatus: string;
  extractedText?: string;
  aiSummary?: string;
  aiTags?: string[];
  ventureId?: string;
  projectId?: string;
  createdAt: string;
}

interface Venture {
  id: string;
  name: string;
}

interface Props {
  ventures: Venture[];
  selectedVentureId?: string;
  onVentureChange?: (ventureId: string) => void;
}

const CATEGORIES = [
  { value: "document", label: "Document" },
  { value: "strategy", label: "Strategy" },
  { value: "playbook", label: "Playbook" },
  { value: "notes", label: "Notes" },
  { value: "research", label: "Research" },
  { value: "reference", label: "Reference" },
  { value: "template", label: "Template" },
  { value: "image", label: "Image" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <File className="h-5 w-5 text-blue-500" />;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Processed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeFilesBrowser({ ventures, selectedVentureId, onVentureChange }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("document");
  const [uploadVentureId, setUploadVentureId] = useState(selectedVentureId || "");

  // Fetch files
  const { data: files = [], isLoading, refetch } = useQuery<KnowledgeFile[]>({
    queryKey: ["/api/knowledge-files", selectedVentureId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVentureId) params.append("ventureId", selectedVentureId);
      const response = await fetch(`/api/knowledge-files?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/knowledge-files", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-files"] });
      setUploadDialogOpen(false);
      resetUploadForm();
      toast({
        title: "File uploaded",
        description: "Your file is being processed. AI extraction may take a moment.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-files"] });
      toast({
        title: "File deleted",
        description: "The file has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/knowledge-files/${id}/reprocess`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-files"] });
      toast({
        title: "Reprocessing started",
        description: "The file is being processed again.",
      });
    },
  });

  // AI Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async ({ id, detailed }: { id: string; detailed?: boolean }): Promise<{ summary: string; tags: string[] }> => {
      const response = await fetch(`/api/knowledge-files/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ detailed }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-files"] });
      toast({
        title: "Analysis complete",
        description: "AI analysis has been updated.",
      });
      if (selectedFile) {
        setSelectedFile({
          ...selectedFile,
          aiSummary: data.summary,
          aiTags: data.tags,
        });
      }
    },
  });

  function resetUploadForm() {
    setUploadFile(null);
    setUploadName("");
    setUploadDescription("");
    setUploadCategory("document");
    setUploadVentureId(selectedVentureId || "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  }

  function handleUpload() {
    if (!uploadFile || !uploadVentureId) {
      toast({
        title: "Missing required fields",
        description: "Please select a file and venture.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName || uploadFile.name);
    formData.append("description", uploadDescription);
    formData.append("category", uploadCategory);
    formData.append("ventureId", uploadVentureId);

    uploadMutation.mutate(formData);
  }

  // Filter files
  const filteredFiles = files.filter((file) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = file.name.toLowerCase().includes(query);
      const matchesSummary = file.aiSummary?.toLowerCase().includes(query);
      const matchesTags = file.aiTags?.some((tag) => tag.toLowerCase().includes(query));
      if (!matchesName && !matchesSummary && !matchesTags) return false;
    }
    if (filterCategory !== "all" && file.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Knowledge Files</h2>
          <p className="text-sm text-muted-foreground">
            Upload PDFs, images, and documents with AI-powered text extraction
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Files Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No files found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterCategory !== "all"
                ? "Try adjusting your filters"
                : "Upload your first file to get started"}
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedFile(file);
                setViewDialogOpen(true);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.mimeType)}
                    <div>
                      <CardTitle className="text-sm font-medium line-clamp-1">
                        {file.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatFileSize(file.fileSize)} • {file.category}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(file.processingStatus)}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {file.aiSummary ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {file.aiSummary}
                  </p>
                ) : file.processingStatus === "processing" ? (
                  <p className="text-sm text-muted-foreground italic">
                    AI is analyzing this file...
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No summary available
                  </p>
                )}
                {file.aiTags && file.aiTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {file.aiTags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {file.aiTags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{file.aiTags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Knowledge File</DialogTitle>
            <DialogDescription>
              Upload a PDF, image, or document. AI will automatically extract text and generate a
              summary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>File</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    {getFileIcon(uploadFile.type)}
                    <span className="text-sm">{uploadFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Images (JPG, PNG, WebP), Text files
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md,.csv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="File name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description of this file"
                rows={2}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venture */}
            <div className="space-y-2">
              <Label>Venture *</Label>
              <Select value={uploadVentureId} onValueChange={setUploadVentureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venture" />
                </SelectTrigger>
                <SelectContent>
                  {ventures.map((venture) => (
                    <SelectItem key={venture.id} value={venture.id}>
                      {venture.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending || !uploadFile}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View File Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          {selectedFile && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.mimeType)}
                  <div>
                    <DialogTitle>{selectedFile.name}</DialogTitle>
                    <DialogDescription>
                      {formatFileSize(selectedFile.fileSize)} • {selectedFile.category} •{" "}
                      {new Date(selectedFile.createdAt).toLocaleDateString()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(selectedFile.processingStatus)}
                  </div>

                  {/* Summary */}
                  {selectedFile.aiSummary && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">AI Summary</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {selectedFile.aiSummary}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedFile.aiTags && selectedFile.aiTags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">AI Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedFile.aiTags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Text */}
                  {selectedFile.extractedText && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Extracted Text</h4>
                      <div className="bg-muted p-3 rounded-md max-h-[300px] overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {selectedFile.extractedText.length > 5000
                            ? selectedFile.extractedText.substring(0, 5000) + "\n\n[... truncated ...]"
                            : selectedFile.extractedText}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedFile.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedFile.description}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  {selectedFile.googleDriveUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedFile.googleDriveUrl, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View in Drive
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(`/api/knowledge-files/${selectedFile.id}/download`, "_blank");
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      analyzeMutation.mutate({ id: selectedFile.id, detailed: true });
                    }}
                    disabled={analyzeMutation.isPending || selectedFile.processingStatus !== "completed"}
                  >
                    {analyzeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Re-analyze
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reprocessMutation.mutate(selectedFile.id)}
                    disabled={reprocessMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocess
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteMutation.mutate(selectedFile.id);
                      setViewDialogOpen(false);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
