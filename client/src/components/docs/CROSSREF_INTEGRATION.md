# Cross-Reference Integration Guide

This guide explains how to integrate wiki-style document linking into the SB-OS docs system.

## Overview

The cross-reference system provides:

1. **Wiki-style linking**: Use `[[Doc Title]]` syntax to link between documents
2. **Autocomplete**: Type `[[` to trigger doc search and autocomplete
3. **Link rendering**: Clickable links with hover previews
4. **Backlinks**: See which docs reference the current doc

## Components

### 1. DocLinkPopover

Provides autocomplete when typing `[[` in the editor.

**Location**: `/client/src/components/docs/doc-link-popover.tsx`

**Features**:
- Detects `[[` trigger automatically
- Searches docs as you type
- Keyboard navigation (arrows, Enter, Escape)
- Inserts `[[Doc Title]](doc-id)` syntax

### 2. DocLinkRenderer

Parses and renders doc links in markdown content.

**Location**: `/client/src/components/docs/doc-link-renderer.tsx`

**Features**:
- Parses `[[Title]](doc-id)` syntax
- Renders clickable links to `/knowledge/:id`
- Hover preview cards showing doc excerpt
- Handles missing/deleted docs gracefully

### 3. BacklinksPanel

Shows documents that reference the current doc.

**Location**: `/client/src/components/docs/backlinks-panel.tsx`

**Features**:
- Displays "Referenced By" section
- Lists all docs linking to current doc
- Collapsible panel
- Click to navigate

### 4. Hooks

**useDocSearch** (`/client/src/hooks/use-doc-search.ts`):
- Debounced search query (default 300ms)
- Fetches from `/api/docs/search?q=...`
- Returns loading state, results, error

**useBacklinks** (`/client/src/hooks/use-backlinks.ts`):
- Finds docs that reference current doc
- Searches for `[[Title]]` in doc bodies
- Filters out current doc from results

## Integration Steps

### Step 1: Add DocLinkPopover to MarkdownEditor

Update `/client/src/components/docs/markdown-editor.tsx`:

```tsx
import { useRef } from "react";
import { DocLinkPopover } from "./doc-link-popover";

export default function MarkdownEditor({ value, onChange, ... }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="...">
      {renderToolbar()}

      {/* Add DocLinkPopover */}
      <DocLinkPopover
        textareaRef={textareaRef}
        value={value}
        onChange={onChange}
      />

      {/* Update textarea to use ref */}
      {viewMode === "edit" && (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // ... rest of props
        />
      )}
    </div>
  );
}
```

### Step 2: Update ReactMarkdown to Render Doc Links

Update `/client/src/pages/doc-detail.tsx` and any other places using ReactMarkdown:

```tsx
import ReactMarkdown from "react-markdown";
import { parseDocLinks } from "@/components/docs/doc-link-renderer";

// Option A: Use custom text renderer
<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown
    components={{
      // Custom text renderer to parse doc links
      text: ({ children }) => {
        const parsed = parseDocLinks(String(children));
        return <>{parsed}</>;
      },
    }}
  >
    {doc.body || ""}
  </ReactMarkdown>
</div>

// Option B: Pre-process the content
<div className="prose prose-sm dark:prose-invert max-w-none">
  {parseDocLinks(doc.body || "")}
</div>
```

**Note**: Option B is simpler but may not work with complex markdown. Option A integrates better with ReactMarkdown's rendering pipeline.

### Step 3: Add BacklinksPanel to Doc Detail Page

Update `/client/src/pages/doc-detail.tsx`:

```tsx
import { BacklinksPanel } from "@/components/docs/backlinks-panel";

export default function DocDetail() {
  // ... existing code

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* ... existing content ... */}

      {/* Metadata Card */}
      <Card>
        {/* ... existing metadata ... */}
      </Card>

      {/* Add Backlinks Panel */}
      {doc && (
        <div className="mt-6">
          <BacklinksPanel
            docId={doc.id}
            docTitle={doc.title}
            defaultCollapsed={false}
          />
        </div>
      )}
    </div>
  );
}
```

## Link Syntax

### Full Syntax (Recommended)

```markdown
Check out the [[Marketing Playbook]](550e8400-e29b-41d4-a716-446655440000)
```

- **Format**: `[[Display Title]](doc-id)`
- **Renders**: Clickable link with hover preview
- **Navigation**: Links to `/knowledge/doc-id`

### Incomplete Syntax

```markdown
See [[Marketing Playbook]]
```

- **Format**: `[[Title]]` (without doc ID)
- **Renders**: Styled text (amber color) but not clickable
- **Use case**: Draft links or placeholders

## Usage Examples

### Example 1: Linking in a SOP

```markdown
# Customer Onboarding SOP

## Prerequisites

Before starting, review:
- [[Sales Handoff Checklist]](abc123)
- [[Product Demo Template]](def456)

## Step 1: Initial Contact

Use the [[Welcome Email Template]](ghi789) to reach out...
```

### Example 2: Linking in Trading Strategy

```markdown
# VWAP Scalping Strategy

## Related Strategies

This builds on:
- [[Momentum Trading Basics]](jkl012)
- [[Order Flow Analysis]](mno345)

Conflicts with:
- [[Mean Reversion Strategy]](pqr678)
```

### Example 3: Cross-Domain References

```markdown
# Q4 Marketing Plan

## Resources

- Marketing: [[Content Calendar Template]](stu901)
- Product: [[Feature Roadmap]](vwx234)
- Sales: [[Territory Assignments]](yza567)
```

## API Endpoints Used

### GET /api/docs/search

Search docs by title or content.

**Query params**:
- `q` (required): Search query string

**Response**: Array of matching docs

```typescript
[
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Marketing Playbook",
    type: "playbook",
    domain: "marketing",
    status: "active",
    body: "...",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z"
  }
]
```

### GET /api/docs/:id

Fetch single document by ID (used for hover previews).

**Response**: Single doc object

## Server-Side Considerations

### Backlinks Query Optimization

Currently, backlinks are found by:
1. Searching for `[[Doc Title]]` in all docs
2. Filtering results that contain the reference in body
3. Excluding the current doc

**Future optimization**: Add a dedicated backlinks endpoint:

```typescript
// server/routes.ts
app.get("/api/docs/:id/backlinks", async (req, res) => {
  const docId = req.params.id;
  const doc = await storage.getDoc(docId);

  if (!doc) {
    return res.status(404).json({ error: "Doc not found" });
  }

  // Search for docs containing references to this doc
  const backlinks = await storage.searchDocs(`[[${doc.title}]]`);

  // Filter to only docs with actual references
  const filtered = backlinks.filter(d =>
    d.id !== docId &&
    d.body?.includes(`[[${doc.title}]]`)
  );

  res.json(filtered);
});
```

### Database Index Recommendation

For better search performance, consider adding a full-text search index:

```sql
-- PostgreSQL
CREATE INDEX idx_docs_body_fulltext ON docs USING gin(to_tsvector('english', body));

-- Then use in queries:
SELECT * FROM docs WHERE to_tsvector('english', body) @@ plainto_tsquery('english', $1);
```

## Keyboard Shortcuts

When DocLinkPopover is active:

- **`[[`**: Trigger autocomplete
- **`Arrow Up/Down`**: Navigate search results
- **`Enter`**: Insert selected link
- **`Escape`**: Close autocomplete

## Best Practices

### 1. Use Descriptive Titles

Good:
```markdown
[[Customer Onboarding Checklist]](doc-id)
```

Bad:
```markdown
[[Checklist]](doc-id)
```

### 2. Link to Related Docs

Create a "Related Documents" section:

```markdown
## Related Documents

- [[Parent Topic]](id1)
- [[Sibling Topic]](id2)
- [[Child Topic]](id3)
```

### 3. Avoid Circular References

Be mindful of creating circular link chains:

```
Doc A → Doc B → Doc C → Doc A (circular)
```

### 4. Keep Link Text Updated

If you rename a document, update all references:

1. Change doc title in database
2. Search for old `[[Old Title]]` references
3. Update to `[[New Title]]`

### 5. Use Backlinks for Navigation

The BacklinksPanel shows:
- Who references your doc
- Where this doc is used
- Related context

## Troubleshooting

### Links Not Clickable

**Problem**: Links appear as text, not clickable

**Solution**: Ensure DocLinkRenderer is integrated into markdown rendering (see Step 2)

### Autocomplete Not Working

**Problem**: Typing `[[` doesn't trigger autocomplete

**Solution**:
1. Check DocLinkPopover is added to MarkdownEditor
2. Ensure textareaRef is properly passed
3. Verify editor has focus

### Backlinks Not Showing

**Problem**: BacklinksPanel shows "No documents link to this page"

**Solution**:
1. Check doc links use correct syntax: `[[Title]](doc-id)`
2. Verify search API is working: `/api/docs/search?q=[[Doc Title]]`
3. Check network tab for errors

### Hover Preview Not Loading

**Problem**: Hovering over link doesn't show preview

**Solution**:
1. Check `/api/docs/:id` endpoint is accessible
2. Verify doc ID in link is correct
3. Check browser console for errors

## Future Enhancements

### 1. Bidirectional Links

Automatically create reverse links when linking from A to B.

### 2. Link Graph Visualization

Show document relationships as a network graph.

### 3. Broken Link Detection

Scan all docs and report broken `[[Title]](invalid-id)` links.

### 4. Smart Suggestions

Suggest related docs based on:
- Same venture/project
- Similar tags
- Content similarity

### 5. Link Analytics

Track:
- Most linked-to docs
- Orphaned docs (no incoming links)
- Hub docs (many incoming/outgoing links)

## Component API Reference

### DocLinkPopover Props

```typescript
interface DocLinkPopoverProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}
```

### BacklinksPanel Props

```typescript
interface BacklinksPanelProps {
  docId: string;
  docTitle: string;
  className?: string;
  defaultCollapsed?: boolean;
}
```

### useDocSearch Hook

```typescript
function useDocSearch(
  query: string,
  debounceMs?: number = 300
): {
  docs: Doc[];
  isLoading: boolean;
  error: Error | null;
  isSearching: boolean;
}
```

### useBacklinks Hook

```typescript
function useBacklinks(
  docId: string | undefined,
  docTitle: string | undefined
): {
  data: Doc[];
  isLoading: boolean;
  error: Error | null;
}
```

## License

Part of SB-OS - Sayed Baharun Operating System
