import { useState, useEffect } from "react";
import PageTreeSidebar from "./page-tree-sidebar";
import DocEditor from "./doc-editor";
import CreateDocModal from "./create-doc-modal";
import { FileText, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VentureDocsProps {
  ventureId: string;
}

export default function VentureDocs({ ventureId }: VentureDocsProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleCreateDoc = (parentId: string | null) => {
    setCreateParentId(parentId);
    setCreateModalOpen(true);
  };

  const handleDocCreated = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleDocDeleted = () => {
    setSelectedDocId(null);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background">
      {/* Sidebar */}
      <PageTreeSidebar
        ventureId={ventureId}
        selectedDocId={selectedDocId}
        onSelectDoc={handleSelectDoc}
        onCreateDoc={handleCreateDoc}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedDocId ? (
          <DocEditor
            docId={selectedDocId}
            onDelete={handleDocDeleted}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
            <BookOpen className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Knowledge Base</h3>
            <p className="text-sm text-center max-w-sm mb-6">
              Store your SOPs, strategies, tech documentation, and all important
              information for this venture.
            </p>
            <Button onClick={() => handleCreateDoc(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Page
            </Button>
          </div>
        )}
      </div>

      {/* Create Doc Modal */}
      <CreateDocModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        ventureId={ventureId}
        parentId={createParentId}
        onCreated={handleDocCreated}
      />
    </div>
  );
}
