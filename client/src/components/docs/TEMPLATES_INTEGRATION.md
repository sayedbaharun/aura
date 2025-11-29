# Document Templates Integration Guide

This guide explains how to integrate the template selector into the CreateDocModal component.

## Overview

The template system consists of:
- **doc-templates.ts**: Template definitions with markdown content
- **TemplateSelector**: Grid UI for browsing and selecting templates
- **TemplatePreview**: Detailed preview of a template
- **useTemplates**: Hook for managing template data

## Integration Flow

### 1. Add TemplateSelector to CreateDocModal

The recommended flow is:
1. User opens CreateDocModal
2. User sees TemplateSelector as the first step
3. User selects a template (or chooses "Blank Page")
4. Modal shows title input and type selector
5. User can still edit the pre-filled body before saving

### 2. Implementation Steps

#### Step 1: Add State for Template Selection

```typescript
const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
const [showTemplateSelector, setShowTemplateSelector] = useState(true);
```

#### Step 2: Add Template Selection UI

```typescript
{showTemplateSelector ? (
  <TemplateSelector
    onSelect={(template) => {
      if (template.id === 'blank') {
        // User wants blank page
        setSelectedTemplate(null);
        setShowTemplateSelector(false);
      } else {
        // User selected a template
        setSelectedTemplate(template);
        setType(template.defaultType);
        setShowTemplateSelector(false);
      }
    }}
  />
) : (
  <form onSubmit={handleSubmit}>
    {/* Existing form fields */}
  </form>
)}
```

#### Step 3: Include Template Body in Mutation

```typescript
const createMutation = useMutation({
  mutationFn: async () => {
    const res = await apiRequest("POST", "/api/docs", {
      title: title.trim() || "Untitled",
      type,
      ventureId,
      parentId,
      isFolder,
      status: "draft",
      body: selectedTemplate?.body || "", // Pre-fill with template
    });
    return await res.json();
  },
  // ... rest of mutation config
});
```

#### Step 4: Add "Change Template" Button

```typescript
<div className="flex justify-between items-center">
  {selectedTemplate && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setShowTemplateSelector(true)}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Change Template
    </Button>
  )}
</div>
```

#### Step 5: Reset State on Close

```typescript
const handleClose = () => {
  setTitle("");
  setType("page");
  setIsFolder(false);
  setSelectedTemplate(null);
  setShowTemplateSelector(true);
  onOpenChange(false);
};
```

## Complete Example

```typescript
import { useState } from "react";
import TemplateSelector from "@/components/docs/template-selector";
import type { DocTemplate } from "@/lib/doc-templates";

export default function CreateDocModal({
  open,
  onOpenChange,
  ventureId,
  parentId,
  onCreated,
}: CreateDocModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("page");
  const [isFolder, setIsFolder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/docs", {
        title: title.trim() || selectedTemplate?.name || "Untitled",
        type,
        ventureId,
        parentId,
        isFolder,
        status: "draft",
        body: selectedTemplate?.body || "",
      });
      return await res.json();
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      toast({ title: "Created", description: "Document created successfully" });
      handleClose();
      onCreated?.(doc.id);
    },
  });

  const handleClose = () => {
    setTitle("");
    setType("page");
    setIsFolder(false);
    setSelectedTemplate(null);
    setShowTemplateSelector(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showTemplateSelector ? "Create New Document" : "Document Details"}
          </DialogTitle>
        </DialogHeader>

        {showTemplateSelector ? (
          <TemplateSelector
            onSelect={(template) => {
              if (template.id === 'blank') {
                setSelectedTemplate(null);
                setShowTemplateSelector(false);
              } else {
                setSelectedTemplate(template);
                setType(template.defaultType);
                setTitle(template.name); // Pre-fill title
                setShowTemplateSelector(false);
              }
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedTemplate && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateSelector(true)}
                >
                  Change
                </Button>
              </div>
            )}

            {/* Rest of your form fields */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                autoFocus
              />
            </div>

            {!isFolder && (
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-folder">Create as folder</Label>
                <p className="text-xs text-muted-foreground">
                  Folders can contain other pages
                </p>
              </div>
              <Switch
                id="is-folder"
                checked={isFolder}
                onCheckedChange={setIsFolder}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

## Alternative: Two-Step Modal

For a cleaner separation, you can use a two-step approach:

### Step 1: Template Selection Dialog
```typescript
<Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
  <DialogContent className="sm:max-w-4xl">
    <DialogHeader>
      <DialogTitle>Choose a Template</DialogTitle>
    </DialogHeader>
    <TemplateSelector
      onSelect={(template) => {
        setSelectedTemplate(template);
        setShowTemplateSelector(false);
        setShowDetailsForm(true);
      }}
    />
  </DialogContent>
</Dialog>
```

### Step 2: Details Form Dialog
```typescript
<Dialog open={showDetailsForm} onOpenChange={setShowDetailsForm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Document Details</DialogTitle>
    </DialogHeader>
    {/* Form fields */}
  </DialogContent>
</Dialog>
```

## Template Preview Integration

To show a preview before finalizing selection:

```typescript
const [previewTemplate, setPreviewTemplate] = useState<DocTemplate | null>(null);

<Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
  <DialogContent className="sm:max-w-4xl max-h-[90vh]">
    {previewTemplate && (
      <TemplatePreview
        template={previewTemplate}
        onUseTemplate={(template) => {
          setSelectedTemplate(template);
          setPreviewTemplate(null);
          setShowTemplateSelector(false);
        }}
        onClose={() => setPreviewTemplate(null)}
      />
    )}
  </DialogContent>
</Dialog>
```

## Tips

1. **Pre-fill title**: Use `template.name` as default title
2. **Pre-fill type**: Use `template.defaultType` to set document type
3. **Allow editing**: Users should be able to edit the template body after creation
4. **Reset state**: Always reset template selection when modal closes
5. **Validation**: Ensure template body is properly handled in backend

## Adding New Templates

To add a new template, edit `client/src/lib/doc-templates.ts`:

```typescript
{
  id: 'my-new-template',
  name: 'My Template',
  description: 'Description of what this template does',
  icon: '🎯',
  category: 'tracking', // or 'planning', 'reference', 'process'
  defaultType: 'page', // or 'sop', 'reference', etc.
  body: `# Template Content

Your markdown content here with tables, lists, etc.
`,
}
```

## Future Enhancements

1. **Custom templates**: Allow users to save their own templates
2. **Template variables**: Support placeholders like {{VENTURE_NAME}}
3. **Template categories**: Add more categories as needed
4. **Template search**: Add search/filter functionality
5. **Template tags**: Add tags for better organization
6. **Recent templates**: Track and show recently used templates
7. **Template sharing**: Export/import templates between ventures
