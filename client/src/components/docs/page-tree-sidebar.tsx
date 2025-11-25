import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  FileText,
  BookOpen,
  Lightbulb,
  Code,
  ListChecks,
  FileCode,
  Search,
  Menu,
} from "lucide-react";

interface Doc {
  id: string;
  title: string;
  type: string;
  parentId: string | null;
  ventureId: string | null;
  order: number;
  isFolder: boolean;
  icon: string | null;
  status: string;
}

interface TreeNode extends Doc {
  children: TreeNode[];
}

interface PageTreeSidebarProps {
  ventureId: string;
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onCreateDoc?: (parentId: string | null) => void;
}

const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  page: <FileText className="h-4 w-4" />,
  sop: <ListChecks className="h-4 w-4" />,
  strategy: <Lightbulb className="h-4 w-4" />,
  tech_doc: <Code className="h-4 w-4" />,
  process: <ListChecks className="h-4 w-4" />,
  reference: <BookOpen className="h-4 w-4" />,
  spec: <FileCode className="h-4 w-4" />,
  template: <File className="h-4 w-4" />,
  playbook: <BookOpen className="h-4 w-4" />,
  meeting_notes: <FileText className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  prompt: <FileCode className="h-4 w-4" />,
};

function buildTree(docs: Doc[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create nodes
  docs.forEach((doc) => {
    map.set(doc.id, { ...doc, children: [] });
  });

  // Second pass: build tree
  docs.forEach((doc) => {
    const node = map.get(doc.id)!;
    if (doc.parentId && map.has(doc.parentId)) {
      map.get(doc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by order
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

function TreeItem({
  node,
  level,
  selectedDocId,
  onSelectDoc,
  onCreateDoc,
  expandedNodes,
  toggleExpand,
  onDeleteDoc,
  onRenameDoc,
}: {
  node: TreeNode;
  level: number;
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onCreateDoc?: (parentId: string | null) => void;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onRenameDoc: (id: string, title: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0 || node.isFolder;
  const isSelected = selectedDocId === node.id;

  const getIcon = () => {
    if (node.isFolder) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-amber-500" />
      ) : (
        <Folder className="h-4 w-4 text-amber-500" />
      );
    }
    return DOC_TYPE_ICONS[node.type] || <FileText className="h-4 w-4" />;
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-muted/80",
          isSelected && "bg-primary/10 text-primary font-medium"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onSelectDoc(node.id)}
        >
          {getIcon()}
          <span className="truncate text-sm">{node.title}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(node.isFolder || hasChildren) && onCreateDoc && (
              <DropdownMenuItem onClick={() => onCreateDoc(node.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add subpage
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                const newTitle = prompt("Enter new title:", node.title);
                if (newTitle && newTitle !== node.title) {
                  onRenameDoc(node.id, newTitle);
                }
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(`Delete "${node.title}"${hasChildren ? " and all its contents" : ""}?`)) {
                  onDeleteDoc(node.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedDocId={selectedDocId}
              onSelectDoc={onSelectDoc}
              onCreateDoc={onCreateDoc}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              onDeleteDoc={onDeleteDoc}
              onRenameDoc={onRenameDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageTreeSidebar({
  ventureId,
  selectedDocId,
  onSelectDoc,
  onCreateDoc,
}: PageTreeSidebarProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["/api/docs/tree", ventureId],
    queryFn: async () => {
      const res = await fetch(`/api/docs/tree/${ventureId}`, {
        credentials: "include",
      });
      return await res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("DELETE", `/api/docs/${docId}/recursive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs/tree"] });
      toast({ title: "Deleted", description: "Page deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete page", variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ docId, title }: { docId: string; title: string }) => {
      await apiRequest("PATCH", `/api/docs/${docId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs/tree"] });
      toast({ title: "Renamed", description: "Page renamed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to rename page", variant: "destructive" });
    },
  });

  const tree = useMemo(() => buildTree(docs), [docs]);

  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matchesSearch = node.title.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = filterNodes(node.children);

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
          });
        }
        return acc;
      }, []);
    };

    return filterNodes(tree);
  }, [tree, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteDoc = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleRenameDoc = (id: string, title: string) => {
    renameMutation.mutate({ docId: id, title });
  };

  const handleSelectDoc = (docId: string) => {
    onSelectDoc(docId);
    if (isMobile) {
      setSheetOpen(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? (
                <p>No pages match your search</p>
              ) : (
                <>
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pages yet</p>
                  <p className="text-xs mt-1">Create your first page to get started</p>
                </>
              )}
            </div>
          ) : (
            filteredTree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                selectedDocId={selectedDocId}
                onSelectDoc={handleSelectDoc}
                onCreateDoc={onCreateDoc}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                onDeleteDoc={handleDeleteDoc}
                onRenameDoc={handleRenameDoc}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => onCreateDoc?.(null)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>
    </>
  );

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Pages</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col flex-1 overflow-hidden">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {sidebarContent}
    </div>
  );
}
