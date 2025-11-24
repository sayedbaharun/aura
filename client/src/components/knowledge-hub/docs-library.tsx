import { DocCard } from "./doc-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain: string;
  status: string;
  ventureId?: string;
  projectId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface DocsLibraryProps {
  docs: Doc[];
  viewMode: "grid" | "list" | "table";
  ventures: any[];
  projects: any[];
  onEdit: (doc: Doc) => void;
  onDelete: (docId: string) => void;
  onDuplicate: (doc: Doc) => void;
}

export function DocsLibrary({
  docs,
  viewMode,
  ventures,
  projects,
  onEdit,
  onDelete,
  onDuplicate,
}: DocsLibraryProps) {
  const [, setLocation] = useLocation();

  const getVentureName = (ventureId?: string) => {
    if (!ventureId) return undefined;
    return ventures.find((v) => v.id === ventureId)?.name;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return undefined;
    return projects.find((p) => p.id === projectId)?.name;
  };

  if (docs.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents found</h3>
        <p className="text-muted-foreground">
          Create your first document to get started
        </p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <DocCard
            key={doc.id}
            doc={doc}
            ventureName={getVentureName(doc.ventureId)}
            projectName={getProjectName(doc.projectId)}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => setLocation(`/knowledge/${doc.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{doc.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {doc.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {doc.domain.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {doc.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getVentureName(doc.ventureId) && (
                    <span>{getVentureName(doc.ventureId)}</span>
                  )}
                  {getProjectName(doc.projectId) && (
                    <span>• {getProjectName(doc.projectId)}</span>
                  )}
                  <span>
                    • Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/knowledge/${doc.id}`);
                    }}
                  >
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(doc);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(doc);
                    }}
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Table view
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Venture</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer"
              onClick={() => setLocation(`/knowledge/${doc.id}`)}
            >
              <TableCell className="font-medium">{doc.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">
                  {doc.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">
                  {doc.domain.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">
                  {doc.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {getVentureName(doc.ventureId) || "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {getProjectName(doc.projectId) || "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/knowledge/${doc.id}`);
                      }}
                    >
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(doc);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(doc);
                      }}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
