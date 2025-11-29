# Image Upload Integration Guide

This guide explains how to integrate the image upload functionality into your SB-OS application.

## Backend Integration

### 1. Register Upload Routes

In `server/routes.ts`, add the upload routes after registering other routes:

```typescript
import uploadRoutes from './upload-routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // ... existing routes ...

  // ============================================================================
  // FILE UPLOADS
  // ============================================================================

  app.use('/api', uploadRoutes);

  // ... rest of routes ...
}
```

**Important**: The upload routes should be registered before the error handler middleware.

### 2. Environment Configuration

The upload system creates an `uploads/` directory automatically at startup. This directory is already added to `.gitignore` to prevent uploaded files from being committed to the repository.

**Directory structure**:
```
/home/user/aura/
├── uploads/           # Auto-created, gitignored
│   └── [uuid].jpg     # Uploaded files with UUID filenames
├── server/
│   ├── upload.ts      # Multer configuration
│   └── upload-routes.ts  # Upload endpoints
```

**Configuration options** (in `server/upload.ts`):
- Max file size: 10MB
- Allowed types: JPG, PNG, GIF, WebP
- Storage: Local filesystem with UUID filenames
- Directory: `uploads/` (relative to project root)

### 3. API Endpoints

Once integrated, the following endpoints will be available:

- **POST** `/api/upload` - Upload single image
  - Body: `multipart/form-data` with `image` field
  - Query params (optional): `docId` - Link upload to a document
  - Returns: `{ success, url, filename, originalName, size, mimeType }`

- **POST** `/api/upload/multiple` - Upload multiple images
  - Body: `multipart/form-data` with `images` field (max 10 files)
  - Query params (optional): `docId` - Link uploads to a document
  - Returns: `{ success, files: [...] }`

- **GET** `/api/uploads/:filename` - Serve uploaded file
  - Returns: Image file

- **DELETE** `/api/uploads/:filename` - Delete uploaded file
  - Returns: `{ success, message }`

### 4. Database Integration

Uploads are automatically saved to the `attachments` table when a `docId` is provided:

```sql
-- Schema (already exists in shared/schema.ts)
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  doc_id UUID REFERENCES docs(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  url TEXT,
  storage_type TEXT DEFAULT 'local',
  data TEXT,
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Frontend Integration

### Option 1: Integrate with Markdown Editor Toolbar

Replace the existing image button in `client/src/components/docs/markdown-editor.tsx`:

**Before** (around line 136-139):
```typescript
{
  icon: <Image className="h-4 w-4" />,
  label: "Image",
  action: () => insertText("![", "](url)", "alt text"),
},
```

**After**:
```typescript
// At the top, add imports:
import { ImageUploadButton } from "./image-upload-button";

// In the component, add docId prop:
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
  docId?: string;  // Add this
}

// In the toolbar rendering section (around line 152-175):
<div className="flex items-center gap-0.5">
  {toolbarActions
    .filter(action => action.label !== "Image") // Remove default image button
    .map((action, index) => {
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

  {/* Add upload button */}
  <ImageUploadButton
    onInsert={(markdown) => {
      // Insert markdown at cursor position
      const textarea = textareaRef.current;
      if (!textarea) {
        onChange(value + "\n\n" + markdown);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText =
        value.substring(0, start) +
        markdown +
        value.substring(end);

      onChange(newText);

      // Restore cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + markdown.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }}
    docId={docId}
  />
</div>
```

### Option 2: Standalone Upload Button

Use the `ImageUploadButton` component anywhere in your app:

```typescript
import { ImageUploadButton } from "@/components/docs/image-upload-button";

function MyComponent() {
  const [content, setContent] = useState("");

  return (
    <div>
      <ImageUploadButton
        onInsert={(markdown) => {
          setContent(content + "\n\n" + markdown);
        }}
        docId="optional-doc-id"
        variant="default"
        size="sm"
      />
    </div>
  );
}
```

### Props Reference

**ImageUploadButton**:
- `onInsert: (markdown: string) => void` - Callback when upload completes
- `docId?: string` - Optional document ID to link attachment
- `variant?: 'default' | 'ghost' | 'outline'` - Button variant (default: 'ghost')
- `size?: 'default' | 'sm' | 'lg' | 'icon'` - Button size (default: 'sm')

**ImageUploadDialog**:
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Callback to change open state
- `onInsert: (markdown: string) => void` - Callback when upload completes
- `docId?: string` - Optional document ID to link attachment

## Usage Example

After integration, users can:

1. Click the **Image** button in the markdown editor toolbar
2. Drag and drop an image or click to select
3. Optionally add alt text for accessibility
4. Click **Upload & Insert**
5. The image is uploaded and markdown syntax is inserted: `![alt text](/api/uploads/uuid.jpg)`

## Production Considerations

### File Storage

For production, consider migrating from local filesystem to cloud storage:

1. **AWS S3**: Use `multer-s3` package
2. **Google Cloud Storage**: Use `@google-cloud/storage`
3. **Cloudinary**: Use `cloudinary` package

Update `server/upload.ts` to use cloud storage instead of local filesystem.

### Security

- File uploads are restricted to images only (JPG, PNG, GIF, WebP)
- Maximum file size is 10MB
- Filenames are UUIDs to prevent collisions and path traversal
- Directory traversal protection in GET/DELETE endpoints
- Session authentication required (same as other API routes)

### Performance

- Consider adding image optimization (resize, compress) before saving
- Implement CDN for serving uploaded images in production
- Add cleanup job to remove orphaned uploads (files not in database)

## Troubleshooting

### Upload fails with "No file uploaded"

- Ensure `multipart/form-data` is set in the request
- Check that the field name is `image` (single) or `images` (multiple)

### Files not serving

- Verify uploads directory exists and has correct permissions
- Check that upload routes are registered in `server/routes.ts`
- Ensure Express static middleware is not interfering

### Database attachment records not created

- Verify `docId` is passed as query parameter: `/api/upload?docId=xxx`
- Check that the document exists in the database
- Review server logs for errors

## Next Steps

- [ ] Add image optimization (sharp, jimp)
- [ ] Implement cloud storage (S3, GCS)
- [ ] Add thumbnail generation for large images
- [ ] Create attachment management UI
- [ ] Add paste-from-clipboard image upload
- [ ] Implement drag-and-drop directly into editor
