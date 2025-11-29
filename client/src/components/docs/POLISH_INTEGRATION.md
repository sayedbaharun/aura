# Document Polish Features Integration Guide

This guide explains how to integrate the table of contents, image lightbox, and export features into the doc-detail page.

## Components Overview

### 1. TableOfContents
- **File**: `table-of-contents.tsx`
- **Purpose**: Automatically extract headings from markdown and create a navigable sidebar
- **Features**:
  - Parses h1, h2, h3 headings from markdown
  - Smooth scroll to sections
  - Highlights current section on scroll
  - Collapsible for better UX
  - Sticky positioning

### 2. ImageLightbox
- **File**: `image-lightbox.tsx`
- **Purpose**: Full-screen image viewer with zoom and navigation
- **Features**:
  - Click any image to view full-screen
  - Zoom in/out controls
  - Keyboard navigation (arrows, ESC, +/-, 0)
  - Multiple image support with navigation
  - Automatic image detection with `useImageLightbox` hook

### 3. ExportMenu
- **File**: `export-menu.tsx`
- **Purpose**: Export document in various formats
- **Features**:
  - Copy as Markdown
  - Copy as HTML
  - Download as .md file
  - Download as .html file
  - Print / Save as PDF

### 4. Export Utilities
- **File**: `lib/export-utils.ts`
- **Purpose**: Helper functions for all export operations
- **Functions**:
  - `copyAsMarkdown(content)` - Copy to clipboard
  - `copyAsHtml(content)` - Convert and copy as HTML
  - `downloadMarkdown(title, content)` - Download .md file
  - `downloadHtml(title, content)` - Download .html file
  - `printDoc()` - Open print dialog

### 5. Reading Mode Styles
- **File**: `styles/reading-mode.css`
- **Purpose**: Optimized typography and print styles
- **Features**:
  - Responsive font sizes
  - Optimal line length (65ch)
  - Enhanced heading hierarchy
  - Print-specific styles
  - Image hover effects
  - Dark mode support

## Integration Steps

### Step 1: Import CSS in main.tsx

Add the reading mode styles to your app:

```tsx
// client/src/main.tsx
import './index.css'
import './styles/reading-mode.css'  // Add this line
```

### Step 2: Update doc-detail.tsx

Here's how to integrate all features into the doc-detail page:

```tsx
import { useRef } from "react";
import { TableOfContents } from "@/components/docs/table-of-contents";
import { ImageLightbox, useImageLightbox } from "@/components/docs/image-lightbox";
import { ExportMenu } from "@/components/docs/export-menu";
import "@/styles/reading-mode.css";

export default function DocDetail() {
  // ... existing code ...

  // Add ref for markdown content
  const contentRef = useRef<HTMLDivElement>(null);

  // Setup image lightbox
  const { images, selectedIndex, lightboxOpen, setLightboxOpen } = useImageLightbox(contentRef);

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header with Export Menu */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/knowledge")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Hub
        </Button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* ... existing header content ... */}
          </div>

          <div className="flex gap-2">
            {/* Add Export Menu */}
            <ExportMenu doc={{ title: doc.title, body: doc.body }} />

            {/* Existing buttons */}
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout: TOC + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 mb-6">
        {/* Table of Contents - Hidden on mobile */}
        <aside className="hidden lg:block">
          <TableOfContents content={doc.body || ""} />
        </aside>

        {/* Main Content */}
        <div>
          <Card>
            <CardContent className="p-6">
              <div
                ref={contentRef}
                className="prose prose-sm dark:prose-invert max-w-none reading-mode"
              >
                <ReactMarkdown>{doc.body || ""}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ... existing metadata section ... */}

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={selectedIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />

      {/* ... existing modals ... */}
    </div>
  );
}
```

### Step 3: Add IDs to Markdown Headings

The TableOfContents component relies on headings having IDs. You need to customize ReactMarkdown to add IDs:

```tsx
import ReactMarkdown from "react-markdown";

// Custom component to add IDs to headings
const MarkdownComponents = {
  h1: ({ children, ...props }: any) => {
    const text = children?.toString() || '';
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');
    return <h1 id={id} {...props}>{children}</h1>;
  },
  h2: ({ children, ...props }: any) => {
    const text = children?.toString() || '';
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');
    return <h2 id={id} {...props}>{children}</h2>;
  },
  h3: ({ children, ...props }: any) => {
    const text = children?.toString() || '';
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');
    return <h3 id={id} {...props}>{children}</h3>;
  },
};

// Use in ReactMarkdown
<ReactMarkdown components={MarkdownComponents}>
  {doc.body || ""}
</ReactMarkdown>
```

**Note**: The heading IDs must match the pattern used in TableOfContents. A better approach is to use a markdown parser plugin like `remark-slug` or create a shared utility.

### Step 4: Mobile Responsive TOC

For mobile devices, you can show the TOC in a collapsible section at the top:

```tsx
{/* Mobile TOC - Show above content on small screens */}
<div className="lg:hidden mb-6">
  <Card>
    <CardContent className="p-4">
      <TableOfContents content={doc.body || ""} />
    </CardContent>
  </Card>
</div>
```

## Customization Options

### TableOfContents

```tsx
<TableOfContents
  content={doc.body || ""}
  className="custom-class"
/>
```

- Change sticky offset: Modify `top-4` in component
- Change heading levels: Modify regex patterns to include h4, h5, h6
- Styling: Use className prop for custom styles

### ImageLightbox

```tsx
<ImageLightbox
  images={images}              // Array of image URLs
  initialIndex={selectedIndex} // Starting image index
  open={lightboxOpen}          // Control visibility
  onOpenChange={setLightboxOpen} // Handle open/close
/>
```

- Disable zoom: Remove zoom controls from component
- Change keyboard shortcuts: Modify `handleKeyDown` in component
- Custom overlay: Adjust `DialogOverlay` background opacity

### ExportMenu

```tsx
<ExportMenu
  doc={{ title: doc.title, body: doc.body }}
  variant="outline"  // "default" | "outline" | "ghost"
  size="sm"          // "default" | "sm" | "lg" | "icon"
/>
```

- Hide specific export options: Comment out `DropdownMenuItem` components
- Custom toast messages: Modify toast calls
- Add new export formats: Add new items and utility functions

### Reading Mode Styles

Customize in `reading-mode.css`:

```css
/* Change max line width */
.reading-mode p {
  max-width: 75ch; /* Default is 65ch */
}

/* Change heading colors */
.reading-mode h1 {
  color: your-custom-color;
}

/* Disable image hover effects */
.reading-mode img:hover {
  transform: none;
  box-shadow: none;
}
```

## Print Optimization

The reading mode styles include print-specific CSS that:
- Hides navigation and buttons
- Shows link URLs after links
- Optimizes page breaks
- Forces light mode for better printing
- Removes backgrounds and shadows

Elements with class `no-print` will be hidden when printing.

## Keyboard Shortcuts

### Image Lightbox
- `ESC` - Close lightbox
- `←` / `→` - Navigate images
- `+` / `-` - Zoom in/out
- `0` - Reset zoom

### Page Navigation
- Click TOC item - Smooth scroll to section

## Accessibility

All components follow accessibility best practices:
- Keyboard navigation support
- Focus visible styles
- Proper ARIA labels (add if needed)
- Semantic HTML
- Screen reader friendly

## Troubleshooting

### TOC not showing headings
- Ensure markdown content has proper heading syntax (`# H1`, `## H2`, `### H3`)
- Check that IDs are being added to rendered headings

### Images not clickable in lightbox
- Ensure `contentRef` is attached to the container with ReactMarkdown
- Check that images are rendering inside the ref container

### Export not working
- Check browser console for errors
- Ensure clipboard permissions are granted
- For HTML copy, some browsers may not support it (falls back to plain text)

### Print styles not applying
- Import `reading-mode.css` in main.tsx
- Add `reading-mode` class to content container
- Check browser print preview

## Performance Considerations

- **TableOfContents**: Extracts headings only when content changes
- **ImageLightbox**: Only processes images when container content changes
- **Export utilities**: Lazy-loaded, no performance impact until used
- **Reading mode CSS**: Minimal CSS, no JavaScript overhead

## Future Enhancements

Potential improvements:
1. Add remark/rehype plugins for better markdown processing
2. Implement heading ID synchronization utility
3. Add TOC position indicator (progress bar)
4. Support for nested code block syntax highlighting
5. Export to PDF directly (using jsPDF or similar)
6. Mermaid diagram support
7. Math equation rendering (KaTeX)
