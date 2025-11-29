import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface TableInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (markdown: string) => void;
}

/**
 * Generates a markdown table string based on the provided parameters
 */
export function generateMarkdownTable(
  rows: number,
  columns: number,
  hasHeader: boolean
): string {
  const lines: string[] = [];

  // Generate header row
  const headerCells = Array(columns)
    .fill(null)
    .map((_, i) => `Header ${i + 1}`)
    .join(" | ");
  lines.push(`| ${headerCells} |`);

  // Generate separator row
  const separatorCells = Array(columns)
    .fill("----------")
    .join(" | ");
  lines.push(`| ${separatorCells} |`);

  // Generate data rows
  const dataRowCount = hasHeader ? rows - 1 : rows;
  for (let i = 0; i < dataRowCount; i++) {
    const cells = Array(columns)
      .fill(null)
      .map((_, j) => `Cell ${i + 1},${j + 1}`)
      .join(" | ");
    lines.push(`| ${cells} |`);
  }

  return "\n" + lines.join("\n") + "\n";
}

export default function TableInsertDialog({
  open,
  onOpenChange,
  onInsert,
}: TableInsertDialogProps) {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [hasHeader, setHasHeader] = useState(true);

  const handleInsert = () => {
    const markdown = generateMarkdownTable(rows, columns, hasHeader);
    onInsert(markdown);
    onOpenChange(false);

    // Reset to defaults
    setRows(3);
    setColumns(3);
    setHasHeader(true);
  };

  const handleCancel = () => {
    onOpenChange(false);

    // Reset to defaults
    setRows(3);
    setColumns(3);
    setHasHeader(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Insert Table</DialogTitle>
          <DialogDescription>
            Create a markdown table with custom dimensions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rows" className="text-right">
              Rows
            </Label>
            <Input
              id="rows"
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="columns" className="text-right">
              Columns
            </Label>
            <Input
              id="columns"
              type="number"
              min="1"
              max="10"
              value={columns}
              onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-1" />
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="hasHeader"
                checked={hasHeader}
                onCheckedChange={(checked) => setHasHeader(checked === true)}
              />
              <Label
                htmlFor="hasHeader"
                className="text-sm font-normal cursor-pointer"
              >
                Include header row (counts toward total rows)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleInsert}>Insert Table</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
