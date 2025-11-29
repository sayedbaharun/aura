import { useState } from "react";
import { Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import TableInsertDialog from "./table-insert-dialog";

interface TableToolbarButtonProps {
  onInsert: (markdown: string) => void;
}

/**
 * Toolbar button component for inserting markdown tables
 * Opens a dialog to configure table dimensions and generates markdown
 */
export default function TableToolbarButton({ onInsert }: TableToolbarButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Insert Table"
        onClick={() => setDialogOpen(true)}
      >
        <Table className="h-4 w-4" />
      </Button>

      <TableInsertDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onInsert={onInsert}
      />
    </>
  );
}
