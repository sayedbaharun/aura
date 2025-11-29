import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VisualTableEditor from "./visual-table-editor";

interface TableEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableMarkdown: string;
  onSave: (markdown: string) => void;
}

/**
 * Dialog wrapper for the visual table editor
 * Provides a modal interface for editing markdown tables
 */
export default function TableEditorDialog({
  open,
  onOpenChange,
  tableMarkdown,
  onSave,
}: TableEditorDialogProps) {
  const handleSave = (markdown: string) => {
    onSave(markdown);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Table</DialogTitle>
          <DialogDescription>
            Click cells to edit, select rows/columns to add or remove them
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <VisualTableEditor
            initialMarkdown={tableMarkdown}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
