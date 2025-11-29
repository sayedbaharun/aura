import { useState, useEffect, RefObject } from "react";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TableEditorDialog from "./table-editor-dialog";
import { findTableInText } from "@/lib/table-utils";

interface EditTableButtonProps {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Toolbar button that detects if cursor is inside a table
 * Opens visual table editor when clicked
 */
export default function EditTableButton({
  textareaRef,
  value,
  onChange,
}: EditTableButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isInTable, setIsInTable] = useState(false);
  const [tableData, setTableData] = useState<{
    markdown: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);

  // Check if cursor is in a table whenever cursor position changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const checkCursorPosition = () => {
      const cursorPosition = textarea.selectionStart;
      const result = findTableInText(value, cursorPosition);

      if (result) {
        setIsInTable(true);
        setTableData({
          markdown: value.substring(result.startIndex, result.endIndex),
          startIndex: result.startIndex,
          endIndex: result.endIndex,
        });
      } else {
        setIsInTable(false);
        setTableData(null);
      }
    };

    // Add event listeners for cursor movement
    textarea.addEventListener("click", checkCursorPosition);
    textarea.addEventListener("keyup", checkCursorPosition);
    textarea.addEventListener("focus", checkCursorPosition);

    // Initial check
    checkCursorPosition();

    return () => {
      textarea.removeEventListener("click", checkCursorPosition);
      textarea.removeEventListener("keyup", checkCursorPosition);
      textarea.removeEventListener("focus", checkCursorPosition);
    };
  }, [textareaRef, value]);

  const handleEdit = () => {
    if (!tableData) return;
    setDialogOpen(true);
  };

  const handleSave = (newMarkdown: string) => {
    if (!tableData) return;

    const newText =
      value.substring(0, tableData.startIndex) +
      newMarkdown +
      value.substring(tableData.endIndex);

    onChange(newText);

    // Update cursor position to end of new table
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newPosition = tableData.startIndex + newMarkdown.length;
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleEdit}
            disabled={!isInTable}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isInTable
            ? "Edit Table"
            : "Place cursor in table to edit"}
        </TooltipContent>
      </Tooltip>

      {tableData && (
        <TableEditorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tableMarkdown={tableData.markdown}
          onSave={handleSave}
        />
      )}
    </TooltipProvider>
  );
}
