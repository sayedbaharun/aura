import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  parseMarkdownTable,
  serializeMarkdownTable,
  ParsedTable,
} from "@/lib/table-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VisualTableEditorProps {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
  onCancel: () => void;
}

export default function VisualTableEditor({
  initialMarkdown,
  onSave,
  onCancel,
}: VisualTableEditorProps) {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    const parsed = parseMarkdownTable(initialMarkdown);
    if (parsed) {
      setTable(parsed);
    }
  }, [initialMarkdown]);

  if (!table) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Failed to parse table
      </div>
    );
  }

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const updateCell = (
    row: number,
    col: number,
    value: string,
    isHeader: boolean = false
  ) => {
    setTable((prev) => {
      if (!prev) return prev;

      if (isHeader) {
        const newHeaders = [...prev.headers];
        newHeaders[col] = value;
        return { ...prev, headers: newHeaders };
      } else {
        const newRows = [...prev.rows];
        newRows[row] = [...newRows[row]];
        newRows[row][col] = value;
        return { ...prev, rows: newRows };
      }
    });
  };

  const addRowAbove = (rowIndex: number) => {
    setTable((prev) => {
      if (!prev) return prev;
      const newRow = Array(prev.headers.length).fill("");
      const newRows = [...prev.rows];
      newRows.splice(rowIndex, 0, newRow);
      return { ...prev, rows: newRows };
    });
    setSelectedRow(null);
  };

  const addRowBelow = (rowIndex: number) => {
    setTable((prev) => {
      if (!prev) return prev;
      const newRow = Array(prev.headers.length).fill("");
      const newRows = [...prev.rows];
      newRows.splice(rowIndex + 1, 0, newRow);
      return { ...prev, rows: newRows };
    });
    setSelectedRow(null);
  };

  const addColumnLeft = (colIndex: number) => {
    setTable((prev) => {
      if (!prev) return prev;
      const newHeaders = [...prev.headers];
      newHeaders.splice(colIndex, 0, "");
      const newRows = prev.rows.map((row) => {
        const newRow = [...row];
        newRow.splice(colIndex, 0, "");
        return newRow;
      });
      const newAlignments = [...prev.alignments];
      newAlignments.splice(colIndex, 0, null);
      return {
        headers: newHeaders,
        rows: newRows,
        alignments: newAlignments,
      };
    });
    setSelectedColumn(null);
  };

  const addColumnRight = (colIndex: number) => {
    setTable((prev) => {
      if (!prev) return prev;
      const newHeaders = [...prev.headers];
      newHeaders.splice(colIndex + 1, 0, "");
      const newRows = prev.rows.map((row) => {
        const newRow = [...row];
        newRow.splice(colIndex + 1, 0, "");
        return newRow;
      });
      const newAlignments = [...prev.alignments];
      newAlignments.splice(colIndex + 1, 0, null);
      return {
        headers: newHeaders,
        rows: newRows,
        alignments: newAlignments,
      };
    });
    setSelectedColumn(null);
  };

  const deleteRow = (rowIndex: number) => {
    if (table.rows.length <= 1) {
      alert("Cannot delete the last row");
      return;
    }
    setTable((prev) => {
      if (!prev) return prev;
      const newRows = prev.rows.filter((_, i) => i !== rowIndex);
      return { ...prev, rows: newRows };
    });
    setSelectedRow(null);
  };

  const deleteColumn = (colIndex: number) => {
    if (table.headers.length <= 1) {
      alert("Cannot delete the last column");
      return;
    }
    setTable((prev) => {
      if (!prev) return prev;
      const newHeaders = prev.headers.filter((_, i) => i !== colIndex);
      const newRows = prev.rows.map((row) => row.filter((_, i) => i !== colIndex));
      const newAlignments = prev.alignments.filter((_, i) => i !== colIndex);
      return {
        headers: newHeaders,
        rows: newRows,
        alignments: newAlignments,
      };
    });
    setSelectedColumn(null);
  };

  const setColumnAlignment = (colIndex: number, alignment: 'left' | 'center' | 'right' | null) => {
    setTable((prev) => {
      if (!prev) return prev;
      const newAlignments = [...prev.alignments];
      newAlignments[colIndex] = alignment;
      return { ...prev, alignments: newAlignments };
    });
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
    isHeader: boolean = false
  ) => {
    const colCount = table.headers.length;
    const rowCount = table.rows.length;

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Move to previous cell
        if (col > 0) {
          focusCell(row, col - 1, isHeader);
        } else if (row > 0 || isHeader) {
          focusCell(
            isHeader ? rowCount - 1 : row - 1,
            colCount - 1,
            isHeader ? false : isHeader
          );
        }
      } else {
        // Move to next cell
        if (col < colCount - 1) {
          focusCell(row, col + 1, isHeader);
        } else if (isHeader || row < rowCount - 1) {
          focusCell(isHeader ? 0 : row + 1, 0, isHeader ? false : isHeader);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isHeader) {
        // Move to first data row
        focusCell(0, col, false);
      } else if (row < rowCount - 1) {
        // Move to cell below
        focusCell(row + 1, col, false);
      } else {
        // Add new row if at bottom
        addRowBelow(row);
        setTimeout(() => focusCell(row + 1, col, false), 10);
      }
    } else if (e.key === "ArrowUp" && !isHeader && row > 0) {
      e.preventDefault();
      focusCell(row - 1, col, false);
    } else if (e.key === "ArrowDown" && !isHeader && row < rowCount - 1) {
      e.preventDefault();
      focusCell(row + 1, col, false);
    } else if (e.key === "ArrowLeft" && e.ctrlKey && col > 0) {
      e.preventDefault();
      focusCell(row, col - 1, isHeader);
    } else if (e.key === "ArrowRight" && e.ctrlKey && col < colCount - 1) {
      e.preventDefault();
      focusCell(row, col + 1, isHeader);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const focusCell = (row: number, col: number, isHeader: boolean = false) => {
    const key = isHeader ? `header-${col}` : getCellKey(row, col);
    const input = inputRefs.current.get(key);
    if (input) {
      input.focus();
      input.select();
      setFocusedCell(isHeader ? null : { row, col });
    }
  };

  const handleSave = () => {
    const markdown = serializeMarkdownTable(table);
    onSave(markdown);
  };

  const getColumnLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, etc.
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addRowAbove(selectedRow ?? 0)}
                  disabled={selectedRow === null}
                >
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Add Row Above
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedRow !== null
                  ? `Add row above row ${selectedRow + 1}`
                  : "Select a row first"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addRowBelow(selectedRow ?? table.rows.length - 1)}
                  disabled={selectedRow === null}
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Add Row Below
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedRow !== null
                  ? `Add row below row ${selectedRow + 1}`
                  : "Select a row first"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedRow !== null && deleteRow(selectedRow)}
                  disabled={selectedRow === null || table.rows.length <= 1}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Row
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedRow !== null
                  ? `Delete row ${selectedRow + 1}`
                  : "Select a row first"}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-6 bg-border" />

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addColumnLeft(selectedColumn ?? 0)}
                  disabled={selectedColumn === null}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Add Column Left
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedColumn !== null
                  ? `Add column left of ${getColumnLetter(selectedColumn)}`
                  : "Select a column first"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addColumnRight(selectedColumn ?? table.headers.length - 1)
                  }
                  disabled={selectedColumn === null}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Add Column Right
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedColumn !== null
                  ? `Add column right of ${getColumnLetter(selectedColumn)}`
                  : "Select a column first"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    selectedColumn !== null && deleteColumn(selectedColumn)
                  }
                  disabled={selectedColumn === null || table.headers.length <= 1}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Column
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedColumn !== null
                  ? `Delete column ${getColumnLetter(selectedColumn)}`
                  : "Select a column first"}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-6 bg-border" />

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    selectedColumn !== null &&
                    table.alignments[selectedColumn] === "left"
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    selectedColumn !== null &&
                    setColumnAlignment(selectedColumn, "left")
                  }
                  disabled={selectedColumn === null}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align left</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    selectedColumn !== null &&
                    table.alignments[selectedColumn] === "center"
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    selectedColumn !== null &&
                    setColumnAlignment(selectedColumn, "center")
                  }
                  disabled={selectedColumn === null}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align center</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    selectedColumn !== null &&
                    table.alignments[selectedColumn] === "right"
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    selectedColumn !== null &&
                    setColumnAlignment(selectedColumn, "right")
                  }
                  disabled={selectedColumn === null}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align right</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              Done
            </Button>
          </div>
        </div>

        {/* Table Grid */}
        <div className="overflow-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="border border-border bg-muted/50 p-2 text-xs font-medium text-muted-foreground w-12">
                  {/* Corner cell */}
                </th>
                {table.headers.map((_, colIndex) => (
                  <th
                    key={colIndex}
                    className={cn(
                      "border border-border bg-muted/50 p-2 text-xs font-medium cursor-pointer hover:bg-muted transition-colors",
                      selectedColumn === colIndex && "bg-blue-100 dark:bg-blue-900/30"
                    )}
                    onClick={() =>
                      setSelectedColumn(
                        selectedColumn === colIndex ? null : colIndex
                      )
                    }
                  >
                    {getColumnLetter(colIndex)}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="border border-border bg-muted/50 p-2 text-xs font-medium text-muted-foreground">
                  H
                </th>
                {table.headers.map((header, colIndex) => (
                  <th
                    key={colIndex}
                    className={cn(
                      "border border-border p-1",
                      selectedColumn === colIndex &&
                        "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <Input
                      ref={(el) => {
                        if (el) inputRefs.current.set(`header-${colIndex}`, el);
                      }}
                      value={header}
                      onChange={(e) => updateCell(0, colIndex, e.target.value, true)}
                      onKeyDown={(e) => handleKeyDown(e, 0, colIndex, true)}
                      onFocus={() => setSelectedColumn(colIndex)}
                      className="h-8 text-sm font-medium"
                      placeholder={`Header ${colIndex + 1}`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td
                    className={cn(
                      "border border-border bg-muted/50 p-2 text-xs font-medium text-center cursor-pointer hover:bg-muted transition-colors",
                      selectedRow === rowIndex && "bg-blue-100 dark:bg-blue-900/30"
                    )}
                    onClick={() =>
                      setSelectedRow(selectedRow === rowIndex ? null : rowIndex)
                    }
                  >
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        "border border-border p-1",
                        selectedRow === rowIndex &&
                          "bg-blue-50 dark:bg-blue-900/20",
                        selectedColumn === colIndex &&
                          "bg-blue-50 dark:bg-blue-900/20",
                        focusedCell?.row === rowIndex &&
                          focusedCell?.col === colIndex &&
                          "ring-2 ring-blue-500"
                      )}
                    >
                      <Input
                        ref={(el) => {
                          if (el)
                            inputRefs.current.set(
                              getCellKey(rowIndex, colIndex),
                              el
                            );
                        }}
                        value={cell}
                        onChange={(e) =>
                          updateCell(rowIndex, colIndex, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        onFocus={() => {
                          setFocusedCell({ row: rowIndex, col: colIndex });
                          setSelectedColumn(colIndex);
                          setSelectedRow(rowIndex);
                        }}
                        className="h-8 text-sm"
                        placeholder={`Cell ${rowIndex + 1},${colIndex + 1}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Keyboard shortcuts help */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <strong>Keyboard shortcuts:</strong> Tab/Shift+Tab to navigate cells •
          Enter to move down • Ctrl+Enter to save • Escape to cancel • Ctrl+Arrow
          keys to jump between cells
        </div>
      </div>
    </TooltipProvider>
  );
}
