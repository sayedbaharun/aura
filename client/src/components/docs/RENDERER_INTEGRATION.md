# Enhanced Markdown Renderer Integration Guide

This guide explains how to replace basic `react-markdown` with the enhanced `EnhancedMarkdownRenderer` component throughout the SB-OS application.

## Components Overview

### 1. EnhancedMarkdownRenderer
The main renderer component that wraps `react-markdown` with enhanced features:
- **Syntax highlighting** for code blocks
- **Callout blocks** (info, warning, tip, danger, note, success)
- **Enhanced tables** with hover states
- **External links** open in new tabs
- **Image lazy loading** with click-to-expand
- **GitHub Flavored Markdown** support via `remark-gfm`

### 2. CodeBlock
Syntax-highlighted code blocks with:
- Language detection
- Copy to clipboard button
- Line numbers
- Dark theme matching app design
- Inline code formatting

### 3. CalloutBlock
Alert-style callouts for different message types:
- Info (blue)
- Warning (yellow)
- Tip (green)
- Danger (red)
- Note (purple)
- Success (emerald)

### 4. BlockInsertMenu
Dropdown menu for inserting markdown blocks:
- All callout types
- Code blocks
- Tables
- Images
- Horizontal dividers

## Files to Update

### 1. `/client/src/pages/doc-detail.tsx`

**Current implementation (line 221):**
```tsx
<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown>{doc.body || ""}</ReactMarkdown>
</div>
```

**Replace with:**
```tsx
import { EnhancedMarkdownRenderer } from "@/components/docs/enhanced-markdown-renderer";

// In the render method:
<EnhancedMarkdownRenderer content={doc.body || ""} />
```

**Remove:**
```tsx
import ReactMarkdown from "react-markdown";
```

### 2. `/client/src/components/docs/markdown-editor.tsx`

**Current implementation (lines 225-231):**
```tsx
const renderPreview = () => (
  <ScrollArea className="flex-1 p-4" style={{ minHeight }}>
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {value ? (
        <ReactMarkdown>{value}</ReactMarkdown>
      ) : (
        <p className="text-muted-foreground italic">{placeholder}</p>
      )}
    </div>
  </ScrollArea>
);
```

**Replace with:**
```tsx
import { EnhancedMarkdownRenderer } from "./enhanced-markdown-renderer";
import { BlockInsertMenu } from "./block-insert-menu";

const renderPreview = () => (
  <ScrollArea className="flex-1 p-4" style={{ minHeight }}>
    {value ? (
      <EnhancedMarkdownRenderer content={value} />
    ) : (
      <p className="text-muted-foreground italic">{placeholder}</p>
    )}
  </ScrollArea>
);
```

**Optional: Add BlockInsertMenu to toolbar (after line 175 in toolbarActions):**
```tsx
// In the toolbar rendering section, add after the existing toolbar buttons:
<BlockInsertMenu onInsert={(markdown) => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const newText = value.substring(0, start) + markdown + value.substring(start);
  onChange(newText);

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + markdown.length, start + markdown.length);
  }, 0);
}} />
```

**Remove:**
```tsx
import ReactMarkdown from "react-markdown";
```

## Usage Examples

### Callout Blocks
```markdown
> [!info]
> This is an informational callout with helpful context.

> [!warning]
> Be careful! This action cannot be undone.

> [!tip]
> Pro tip: Use keyboard shortcuts to speed up your workflow.

> [!danger]
> Critical: This will delete all data permanently.

> [!note]
> Additional context or side notes go here.

> [!success]
> Great job! The operation completed successfully.
```

### Code Blocks
```markdown
```javascript
function hello() {
  console.log("Hello, world!");
}
```
```

### Tables
```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| Callouts | ✅ | Fully supported |
| Code | ✅ | With syntax highlighting |
| Tables | ✅ | Hover states included |
```

### Images
```markdown
![Dashboard screenshot](https://example.com/image.png)
```

## Benefits

1. **Better UX**: Syntax highlighting makes code more readable
2. **Visual Hierarchy**: Callouts draw attention to important information
3. **Copy functionality**: Easy code copying improves developer experience
4. **Responsive tables**: Better mobile experience with scroll containers
5. **Image previews**: Click to expand provides better viewing
6. **Consistent styling**: Matches the overall SB-OS design system

## Testing

After integration, test the following:

1. **Code blocks**: Verify syntax highlighting works for common languages (JavaScript, Python, TypeScript, Bash)
2. **Callouts**: Check all 6 callout types render with correct colors
3. **Tables**: Ensure hover states work and tables are responsive
4. **Links**: External links should open in new tabs
5. **Images**: Click to expand should work, lazy loading should prevent initial load delays
6. **Dark mode**: All components should work in both light and dark themes

## Rollback Plan

If issues arise, simply revert to the original `ReactMarkdown` implementation:

```tsx
import ReactMarkdown from "react-markdown";

// Replace EnhancedMarkdownRenderer with:
<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

## Future Enhancements

Potential improvements for future iterations:

1. **Mermaid diagrams**: Add support for flowcharts and diagrams
2. **LaTeX math**: Support mathematical notation
3. **Video embeds**: YouTube/Vimeo embedding
4. **Collapsible sections**: Expandable content blocks
5. **Task lists**: Interactive checkboxes for task management
6. **Diff highlighting**: Show code changes with +/- indicators
