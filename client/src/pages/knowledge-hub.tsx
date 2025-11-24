import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { KnowledgeHubHeader } from "@/components/knowledge-hub/knowledge-hub-header";
import { FiltersSidebar, DocsFilters } from "@/components/knowledge-hub/filters-sidebar";
import { DocsLibrary } from "@/components/knowledge-hub/docs-library";
import { DocEditorModal } from "@/components/knowledge-hub/doc-editor-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

interface Doc {
  id: string;
  title: string;
  type: string;
  domain: string;
  status: string;
  ventureId?: string;
  projectId?: string;
  tags?: string[];
  body?: string;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgeHub() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<DocsFilters>({
    types: [],
    domains: [],
    statuses: [],
    tags: [],
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  // Fetch all docs
  const { data: allDocs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["/api/docs"],
  });

  // Fetch search results if there's a search query
  const { data: searchResults = [] } = useQuery<Doc[]>({
    queryKey: ["/api/docs/search", searchQuery],
    enabled: searchQuery.length > 0,
  });

  // Fetch ventures and projects for filters
  const { data: ventures = [] } = useQuery<any[]>({
    queryKey: ["/api/ventures"],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/docs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter and search logic
  const displayedDocs = useMemo(() => {
    let docs = searchQuery.length > 0 ? searchResults : allDocs;

    // Apply filters
    if (filters.types.length > 0) {
      docs = docs.filter((doc) => filters.types.includes(doc.type));
    }
    if (filters.domains.length > 0) {
      docs = docs.filter((doc) => filters.domains.includes(doc.domain));
    }
    if (filters.statuses.length > 0) {
      docs = docs.filter((doc) => filters.statuses.includes(doc.status));
    }
    if (filters.ventureId) {
      docs = docs.filter((doc) => doc.ventureId === filters.ventureId);
    }
    if (filters.projectId) {
      docs = docs.filter((doc) => doc.projectId === filters.projectId);
    }
    if (filters.tags.length > 0) {
      docs = docs.filter((doc) =>
        filters.tags.some((tag) => doc.tags?.includes(tag))
      );
    }

    return docs;
  }, [allDocs, searchResults, searchQuery, filters]);

  const handleNewDoc = () => {
    setEditingDoc(null);
    setEditorOpen(true);
  };

  const handleEditDoc = (doc: Doc) => {
    setEditingDoc(doc);
    setEditorOpen(true);
  };

  const handleDuplicateDoc = (doc: Doc) => {
    const duplicated = {
      ...doc,
      id: undefined,
      title: `${doc.title} (Copy)`,
      status: "draft",
    };
    setEditingDoc(duplicated as Doc);
    setEditorOpen(true);
  };

  const handleDeleteDoc = (docId: string) => {
    setDocToDelete(docId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (docToDelete) {
      deleteMutation.mutate(docToDelete);
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <KnowledgeHubHeader
        onNewDoc={handleNewDoc}
        onSearch={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DocsLibrary
            docs={displayedDocs}
            viewMode={viewMode}
            ventures={ventures}
            projects={projects}
            onEdit={handleEditDoc}
            onDelete={handleDeleteDoc}
            onDuplicate={handleDuplicateDoc}
          />
        </div>

        <div>
          <FiltersSidebar filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>

      {/* Editor Modal */}
      <DocEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingDoc(null);
        }}
        doc={editingDoc}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
