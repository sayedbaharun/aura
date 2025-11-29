# Attachments Panel Integration Guide

This guide explains how to integrate the AttachmentsPanel component into your document editor or detail pages.

## Overview

The attachments system allows users to:
- View all files attached to a document
- Copy attachment links to clipboard
- Insert attachments into document body (as markdown)
- Download attachments
- Delete attachments with confirmation
- See file previews for images

## Components

### 1. AttachmentsPanel (Main Component)
The main collapsible panel that displays all attachments for a document.

**Location:** `client/src/components/docs/attachments-panel.tsx`

**Props:**
- `docId: string | null | undefined` - The document ID to fetch attachments for
- `className?: string` - Optional CSS classes for styling

### 2. AttachmentItem
Individual attachment card with preview, metadata, and actions.

**Location:** `client/src/components/docs/attachment-item.tsx`

**Features:**
- Image preview for image files
- File type icon for non-images
- File size and upload time display
- Dropdown menu with actions:
  - Copy link to clipboard
  - Download file
  - Insert into doc (copies markdown)
  - Delete with confirmation

### 3. useAttachments Hook
React Query hook for managing attachment data and mutations.

**Location:** `client/src/hooks/use-attachments.ts`

**Returns:**
- `attachments: Attachment[]` - Array of attachments
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `createAttachment: UseMutationResult` - Mutation for creating attachments
- `deleteAttachment: UseMutationResult` - Mutation for deleting attachments

### 4. File Utilities
Helper functions for file operations.

**Location:** `client/src/lib/file-utils.ts`

**Functions:**
- `formatFileSize(bytes)` - Format bytes to human-readable string
- `getFileIcon(mimeType)` - Get Lucide icon for file type
- `isImageType(mimeType)` - Check if file is an image
- `getImagePreviewUrl(attachment)` - Get preview URL for images
- `getFileExtension(filename)` - Extract file extension
- `getFileTypeColor(mimeType)` - Get color class for file type
- `copyToClipboard(text)` - Copy text to clipboard
- `getMarkdownSyntax(attachment)` - Generate markdown for attachment

## Integration with doc-editor.tsx

### Option 1: Sidebar Layout (Recommended)

Add the AttachmentsPanel as a collapsible sidebar on the right side of the editor:

```tsx
import { AttachmentsPanel } from "@/components/docs/attachments-panel";

export function DocEditor({ docId }: { docId: string }) {
  return (
    <div className="flex gap-4 h-full">
      {/* Main editor area */}
      <div className="flex-1">
        <MarkdownEditor docId={docId} />
      </div>

      {/* Attachments sidebar */}
      <div className="w-80 flex-shrink-0">
        <AttachmentsPanel docId={docId} />
      </div>
    </div>
  );
}
```

### Option 2: Bottom Panel

Add as a collapsible panel below the editor:

```tsx
import { AttachmentsPanel } from "@/components/docs/attachments-panel";

export function DocEditor({ docId }: { docId: string }) {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Main editor area */}
      <div className="flex-1">
        <MarkdownEditor docId={docId} />
      </div>

      {/* Attachments panel */}
      <AttachmentsPanel docId={docId} className="h-64" />
    </div>
  );
}
```

### Option 3: Tab Layout

Add as a separate tab alongside editor:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsPanel } from "@/components/docs/attachments-panel";

export function DocEditor({ docId }: { docId: string }) {
  return (
    <Tabs defaultValue="editor">
      <TabsList>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="attachments">Attachments</TabsTrigger>
      </TabsList>

      <TabsContent value="editor">
        <MarkdownEditor docId={docId} />
      </TabsContent>

      <TabsContent value="attachments">
        <AttachmentsPanel docId={docId} />
      </TabsContent>
    </Tabs>
  );
}
```

## Integration with Image Upload

When you implement image upload functionality in the markdown editor, use the `useAttachments` hook to create attachment records:

```tsx
import { useAttachments } from "@/hooks/use-attachments";

function ImageUploadButton({ docId }: { docId: string }) {
  const { createAttachment } = useAttachments(docId);

  const handleImageUpload = async (file: File) => {
    // 1. Upload image to storage (Google Drive, S3, etc.)
    const imageUrl = await uploadToStorage(file);

    // 2. Create attachment record
    await createAttachment.mutateAsync({
      docId,
      name: file.name,
      type: file.type,
      size: file.size,
      url: imageUrl,
      storageType: "url",
    });

    // 3. Insert into editor
    const markdown = `![${file.name}](${imageUrl})`;
    insertIntoEditor(markdown);
  };

  return <Button onClick={() => /* file picker */}>Upload Image</Button>;
}
```

## API Endpoints

The components expect these API endpoints to exist:

### GET `/api/docs/:docId/attachments`
Returns array of attachments for a document.

**Response:**
```json
[
  {
    "id": "uuid",
    "docId": "uuid",
    "name": "screenshot.png",
    "type": "image/png",
    "size": 123456,
    "url": "https://...",
    "storageType": "url",
    "thumbnailUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### POST `/api/docs/:docId/attachments`
Creates a new attachment.

**Request Body:**
```json
{
  "name": "file.pdf",
  "type": "application/pdf",
  "size": 123456,
  "url": "https://...",
  "storageType": "url"
}
```

### DELETE `/api/attachments/:id`
Deletes an attachment.

**Response:** 204 No Content

## Styling Customization

The components use Tailwind CSS and shadcn/ui components. You can customize:

### Panel Size
```tsx
<AttachmentsPanel docId={docId} className="w-96 h-full" />
```

### Collapsed by Default
Modify the initial state in AttachmentsPanel:
```tsx
const [isCollapsed, setIsCollapsed] = useState(true);
```

### File Icon Colors
Edit `getFileTypeColor()` in `file-utils.ts` to change color schemes.

## Future Enhancements

Potential improvements to consider:

1. **Drag & Drop Upload**
   - Add drop zone to AttachmentsPanel
   - Accept files and auto-create attachments

2. **Inline Preview**
   - Click attachment to preview in modal
   - Support for PDFs, videos, etc.

3. **Bulk Actions**
   - Select multiple attachments
   - Bulk delete or download

4. **Sorting & Filtering**
   - Sort by name, size, date
   - Filter by file type

5. **Direct Upload**
   - Upload button in panel
   - Progress indicator

6. **Attachment Metadata**
   - Add tags or categories to attachments
   - Search within attachments

## Troubleshooting

### Attachments not loading
- Check that `docId` is valid and not null
- Verify API endpoint returns correct data
- Check browser console for errors

### Delete not working
- Verify DELETE endpoint is implemented
- Check for proper error handling in mutation

### Images not previewing
- Ensure `url` or `thumbnailUrl` is valid
- Check CORS settings if images from external domain
- Verify `storageType` is set correctly

## Example: Full Integration

Here's a complete example of integrating the AttachmentsPanel into doc-editor.tsx:

```tsx
import { useState } from "react";
import { AttachmentsPanel } from "@/components/docs/attachments-panel";
import { MarkdownEditor } from "@/components/docs/markdown-editor";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

export function DocEditor({ docId }: { docId: string }) {
  const [showAttachments, setShowAttachments] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2>Edit Document</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAttachments(!showAttachments)}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          {showAttachments ? "Hide" : "Show"} Attachments
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1">
          <MarkdownEditor docId={docId} />
        </div>

        {/* Attachments panel (conditional) */}
        {showAttachments && (
          <div className="w-80 border-l">
            <AttachmentsPanel docId={docId} className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
}
```

## Questions?

If you encounter issues or have questions about integrating the attachments system, check:
- API route implementation in `server/routes.ts`
- Database schema in `shared/schema.ts`
- Storage implementation in `server/storage.ts`
