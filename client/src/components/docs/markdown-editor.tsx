import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Edit3,
  Columns,
  Minus,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
}

type ViewMode = "edit" | "preview" | "split";

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Start writing in markdown...",
  minHeight = "400px",
  className,
  readOnly = false,
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(readOnly ? "preview" : "edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (readOnly) {
      setViewMode("preview");
    }
  }, [readOnly]);

  const insertText = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || placeholder;
      const newText =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newText);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + before.length + selectedText.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    },
    [value, onChange]
  );

  const toolbarActions = [
    {
      icon: <Bold className="h-4 w-4" />,
      label: "Bold",
      action: () => insertText("**", "**", "bold text"),
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: "Italic",
      action: () => insertText("*", "*", "italic text"),
    },
    { type: "separator" as const },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: "Heading 1",
      action: () => insertText("\n# ", "", "Heading 1"),
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: "Heading 2",
      action: () => insertText("\n## ", "", "Heading 2"),
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      label: "Heading 3",
      action: () => insertText("\n### ", "", "Heading 3"),
    },
    { type: "separator" as const },
    {
      icon: <List className="h-4 w-4" />,
      label: "Bullet List",
      action: () => insertText("\n- ", "", "list item"),
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: "Numbered List",
      action: () => insertText("\n1. ", "", "list item"),
    },
    {
      icon: <Quote className="h-4 w-4" />,
      label: "Quote",
      action: () => insertText("\n> ", "", "quote"),
    },
    { type: "separator" as const },
    {
      icon: <Code className="h-4 w-4" />,
      label: "Code",
      action: () => insertText("`", "`", "code"),
    },
    {
      icon: <Link className="h-4 w-4" />,
      label: "Link",
      action: () => insertText("[", "](url)", "link text"),
    },
    {
      icon: <Image className="h-4 w-4" />,
      label: "Image",
      action: () => insertText("![", "](url)", "alt text"),
    },
    {
      icon: <Minus className="h-4 w-4" />,
      label: "Horizontal Rule",
      action: () => insertText("\n---\n"),
    },
  ];

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
        </div>

        <div className="flex-1" />

        <div className="flex items-center border rounded-md bg-background">
          <Button
            variant={viewMode === "edit" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 rounded-r-none"
            onClick={() => setViewMode("edit")}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant={viewMode === "split" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 rounded-none border-x"
            onClick={() => setViewMode("split")}
          >
            <Columns className="h-3.5 w-3.5 mr-1" />
            Split
          </Button>
          <Button
            variant={viewMode === "preview" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 rounded-l-none"
            onClick={() => setViewMode("preview")}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </Button>
        </div>
      </div>
    );
  };

  const renderEditor = () => (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 resize-none border-0 focus-visible:ring-0 font-mono text-sm rounded-none"
      style={{ minHeight }}
    />
  );

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

  return (
    <div className={cn("border rounded-lg overflow-hidden flex flex-col", className)}>
      {renderToolbar()}

      {viewMode === "edit" && renderEditor()}

      {viewMode === "preview" && renderPreview()}

      {viewMode === "split" && (
        <div className="flex flex-1">
          <div className="flex-1 border-r">{renderEditor()}</div>
          <div className="flex-1">{renderPreview()}</div>
        </div>
      )}
    </div>
  );
}
