# Table Component Integration Guide

This guide explains how to integrate the table insertion components into the markdown editor.

## Overview

The table insertion feature consists of two main components:
- **TableInsertDialog**: Dialog component for configuring table dimensions
- **TableToolbarButton**: Toolbar button that opens the dialog and inserts markdown

## Integration Steps

### 1. Add remark-gfm Plugin to react-markdown

First, ensure that `react-markdown` can render GitHub Flavored Markdown tables by adding the `remark-gfm` plugin.

**File:** `client/src/components/docs/markdown-editor.tsx`

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// In the renderPreview function, update the ReactMarkdown component:
const renderPreview = () => (
  <ScrollArea className="flex-1 p-4" style={{ minHeight }}>
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {value ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {value}
        </ReactMarkdown>
      ) : (
        <p className="text-muted-foreground italic">{placeholder}</p>
      )}
    </div>
  </ScrollArea>
);
```

### 2. Add Table Button to Toolbar

Import the `TableToolbarButton` component and add it to the toolbar actions.

**File:** `client/src/components/docs/markdown-editor.tsx`

```tsx
import TableToolbarButton from "./table-toolbar-button";

// In the renderToolbar function, add the button after the existing toolbar actions:
const renderToolbar = () => {
  if (readOnly) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
      <div className="flex items-center gap-0.5">
        {toolbarActions.map((action, index) => {
          if (action.type === "separator") {
            return (
              <div
                key={`sep-${index}`}
                className="w-px h-6 bg-border mx-1"
              />
            );
          }
          return (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title={action.label}
              onClick={action.action}
            >
              {action.icon}
            </Button>
          );
        })}

        {/* ADD SEPARATOR AND TABLE BUTTON HERE */}
        <div className="w-px h-6 bg-border mx-1" />
        <TableToolbarButton onInsert={insertText} />
      </div>

      {/* ... rest of toolbar ... */}
    </div>
  );
};
```

### 3. Alternative: Add Table to toolbarActions Array

Alternatively, you can add the table action directly to the `toolbarActions` array:

```tsx
import { Table } from "lucide-react";
import { useState } from "react";
import TableInsertDialog from "./table-insert-dialog";

// Add state for dialog
const [tableDialogOpen, setTableDialogOpen] = useState(false);

// Add to toolbarActions array:
const toolbarActions = [
  // ... existing actions ...
  { type: "separator" as const },
  {
    icon: <Table className="h-4 w-4" />,
    label: "Insert Table",
    action: () => setTableDialogOpen(true),
  },
];

// Add dialog at the end of the component, before the closing div:
return (
  <div className={cn("border rounded-lg overflow-hidden flex flex-col", className)}>
    {renderToolbar()}
    {/* ... existing content ... */}

    <TableInsertDialog
      open={tableDialogOpen}
      onOpenChange={setTableDialogOpen}
      onInsert={(markdown) => {
        insertText(markdown);
        setTableDialogOpen(false);
      }}
    />
  </div>
);
```

## Generated Markdown Format

The table generator creates GFM-compliant markdown tables:

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1,1 | Cell 1,2 | Cell 1,3 |
| Cell 2,1 | Cell 2,2 | Cell 2,3 |
```

## Table Styling

Table styles have been added to `client/src/index.css` and will automatically apply to any tables rendered within `.prose` containers (which is used in the markdown preview).

Features:
- Bordered cells with consistent padding
- Header row with background color
- Alternating row colors for better readability
- Hover effects on rows
- Responsive design with smaller text on mobile
- Horizontal scroll on small screens for wide tables

## Customization

### Modify Default Table Dimensions

In `table-insert-dialog.tsx`, change the initial state:

```tsx
const [rows, setRows] = useState(5); // Change default rows
const [columns, setColumns] = useState(4); // Change default columns
const [hasHeader, setHasHeader] = useState(false); // No header by default
```

### Customize Table Generation

The `generateMarkdownTable` function in `table-insert-dialog.tsx` can be customized to:
- Change cell placeholder text
- Adjust alignment indicators (`:---`, `:---:`, `---:`)
- Add custom formatting

Example with center-aligned columns:

```tsx
// Generate separator row with center alignment
const separatorCells = Array(columns)
  .fill(":--------:")  // Center aligned
  .join(" | ");
```

### Style Customization

Modify table styles in `client/src/index.css`:

```css
.prose table {
  /* Customize table appearance */
  @apply border-2 border-primary; /* Thicker colored border */
}

.prose th {
  @apply bg-primary text-primary-foreground; /* Primary color header */
}
```

## Testing

To test the table insertion:

1. Navigate to a doc detail page with the markdown editor
2. Click the Table icon in the toolbar
3. Configure rows, columns, and header options
4. Click "Insert Table"
5. Switch to preview mode to see the rendered table
6. Edit the table cells directly in the markdown

## Notes

- The `insertText` function from the markdown editor handles cursor positioning
- Tables are inserted with newlines before and after for proper markdown parsing
- The dialog resets to default values after insertion
- Tables can be edited manually in the markdown after insertion
- remark-gfm supports additional table features like alignment (`:---:` for center, `---:` for right)
