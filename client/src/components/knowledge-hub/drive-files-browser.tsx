import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HardDrive,
  Folder,
  FileText,
  File,
  Image,
  Video,
  Music,
  Archive,
  Search,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Upload,
  FolderPlus,
  Cloud,
  CloudOff,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
}

interface DriveFilesResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

interface DriveStatusResponse {
  configured: boolean;
  connected: boolean;
  message?: string;
}

const MIME_TYPE_ICONS: Record<string, React.ReactNode> = {
  "application/vnd.google-apps.folder": <Folder className="h-5 w-5 text-blue-500" />,
  "application/vnd.google-apps.document": <FileText className="h-5 w-5 text-blue-600" />,
  "application/vnd.google-apps.spreadsheet": <FileText className="h-5 w-5 text-green-600" />,
  "application/vnd.google-apps.presentation": <FileText className="h-5 w-5 text-orange-500" />,
  "application/pdf": <FileText className="h-5 w-5 text-red-500" />,
  "image/": <Image className="h-5 w-5 text-purple-500" />,
  "video/": <Video className="h-5 w-5 text-pink-500" />,
  "audio/": <Music className="h-5 w-5 text-cyan-500" />,
  "application/zip": <Archive className="h-5 w-5 text-yellow-600" />,
};

function getFileIcon(mimeType: string): React.ReactNode {
  for (const [key, icon] of Object.entries(MIME_TYPE_ICONS)) {
    if (mimeType.startsWith(key) || mimeType === key) {
      return icon;
    }
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function DriveFilesBrowser() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : undefined;

  // Check Drive status
  const { data: driveStatus, isLoading: isStatusLoading } = useQuery<DriveStatusResponse>({
    queryKey: ["/api/drive/status"],
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch files in current folder
  const { data: filesData, isLoading: isFilesLoading, isFetching } = useQuery<DriveFilesResponse>({
    queryKey: ["/api/drive/files", currentFolderId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("folderId", currentFolderId);
      if (searchQuery) params.set("search", searchQuery);
      const res = await apiRequest("GET", `/api/drive/files?${params.toString()}`);
      return res.json();
    },
    enabled: driveStatus?.connected === true,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/drive/folders", {
        name,
        parentId: currentFolderId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/files"] });
      toast({ title: "Folder created", description: "New folder has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create folder", variant: "destructive" });
    },
  });

  const handleFolderClick = (file: DriveFile) => {
    setFolderPath([...folderPath, { id: file.id, name: file.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setFolderPath([]);
    } else {
      setFolderPath(folderPath.slice(0, index + 1));
    }
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      handleFolderClick(file);
    } else if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/drive/files"] });
    queryClient.invalidateQueries({ queryKey: ["/api/drive/status"] });
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name?.trim()) {
      createFolderMutation.mutate(name.trim());
    }
  };

  // Not configured state
  if (isStatusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!driveStatus?.configured || !driveStatus?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-muted-foreground" />
            Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CloudOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {!driveStatus?.configured
                ? "Google Drive is not configured"
                : "Failed to connect to Google Drive"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {!driveStatus?.configured
                ? "Configure GOOGLE_DRIVE_* or GOOGLE_CALENDAR_* credentials with Drive scope"
                : driveStatus.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Google Drive
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateFolder}>
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm mt-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleBreadcrumbClick(-1)}
          >
            <HardDrive className="h-4 w-4 mr-1" />
            Knowledge Base
          </Button>
          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleBreadcrumbClick(index)}
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isFilesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !filesData?.files || filesData.files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No files in this folder</p>
            <p className="text-sm mt-1">Create a folder or upload files to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filesData.files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors",
                  file.mimeType === "application/vnd.google-apps.folder" && "hover:border-blue-300"
                )}
              >
                {/* Icon */}
                <div className="shrink-0">{getFileIcon(file.mimeType)}</div>

                {/* Name and metadata */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {file.modifiedTime && (
                      <span>Modified {format(new Date(file.modifiedTime), "MMM d, yyyy")}</span>
                    )}
                    {file.size && <span>• {formatFileSize(file.size)}</span>}
                  </div>
                </div>

                {/* Actions */}
                {file.webViewLink && file.mimeType !== "application/vnd.google-apps.folder" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(file.webViewLink, "_blank");
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
