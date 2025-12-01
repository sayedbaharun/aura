import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
  PartialBlock,
} from "@blocknote/core";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider } from "@mantine/core";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Ban,
} from "lucide-react";

// Custom Alert/Callout Block
const alertTypes = {
  info: {
    icon: Info,
    color: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  warning: {
    icon: AlertTriangle,
    color: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  tip: {
    icon: Lightbulb,
    color: "#10b981",
    backgroundColor: "#ecfdf5",
  },
  success: {
    icon: CheckCircle,
    color: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  danger: {
    icon: Ban,
    color: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  note: {
    icon: AlertCircle,
    color: "#6b7280",
    backgroundColor: "#f9fafb",
  },
} as const;

type AlertType = keyof typeof alertTypes;

interface BlockEditorProps {
  initialContent?: PartialBlock[];
  initialMarkdown?: string;
  onChange?: (blocks: PartialBlock[]) => void;
  onMarkdownChange?: (markdown: string) => void;
  editable?: boolean;
  className?: string;
}

export default function BlockEditor({
  initialContent,
  initialMarkdown,
  onChange,
  onMarkdownChange,
  editable = true,
  className,
}: BlockEditorProps) {
  const [mounted, setMounted] = useState(false);

  // Create editor with custom schema
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0
      ? initialContent
      : undefined,
  });

  // Initialize from markdown if provided and no initialContent
  useEffect(() => {
    const initFromMarkdown = async () => {
      if (initialMarkdown && (!initialContent || initialContent.length === 0)) {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
          editor.replaceBlocks(editor.document, blocks);
        } catch (error) {
          console.error("Failed to parse markdown:", error);
        }
      }
    };
    initFromMarkdown();
  }, [editor, initialMarkdown, initialContent]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle content changes
  const handleChange = useCallback(async () => {
    const blocks = editor.document;
    onChange?.(blocks as PartialBlock[]);

    // Also provide markdown output if needed
    if (onMarkdownChange) {
      try {
        const markdown = await editor.blocksToMarkdownLossy(blocks);
        onMarkdownChange(markdown);
      } catch (error) {
        console.error("Failed to convert to markdown:", error);
      }
    }
  }, [editor, onChange, onMarkdownChange]);

  // Custom slash menu items
  const getCustomSlashMenuItems = useCallback(
    (editor: BlockNoteEditor) => {
      const defaultItems = getDefaultReactSlashMenuItems(editor);

      // Add custom callout blocks
      const calloutItems = [
        {
          title: "Info Callout",
          onItemClick: () => {
            insertOrUpdateBlock(editor, {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "ℹ️ Info: ",
                  styles: { bold: true, textColor: "blue" },
                },
              ],
            });
          },
          aliases: ["info", "callout"],
          group: "Callouts",
          icon: <Info className="h-4 w-4" />,
          subtext: "Add an info callout",
        },
        {
          title: "Warning Callout",
          onItemClick: () => {
            insertOrUpdateBlock(editor, {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "⚠️ Warning: ",
                  styles: { bold: true, textColor: "yellow" },
                },
              ],
            });
          },
          aliases: ["warning", "caution"],
          group: "Callouts",
          icon: <AlertTriangle className="h-4 w-4" />,
          subtext: "Add a warning callout",
        },
        {
          title: "Tip Callout",
          onItemClick: () => {
            insertOrUpdateBlock(editor, {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "💡 Tip: ",
                  styles: { bold: true, textColor: "green" },
                },
              ],
            });
          },
          aliases: ["tip", "hint"],
          group: "Callouts",
          icon: <Lightbulb className="h-4 w-4" />,
          subtext: "Add a tip callout",
        },
        {
          title: "Success Callout",
          onItemClick: () => {
            insertOrUpdateBlock(editor, {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "✅ Success: ",
                  styles: { bold: true, textColor: "green" },
                },
              ],
            });
          },
          aliases: ["success", "done"],
          group: "Callouts",
          icon: <CheckCircle className="h-4 w-4" />,
          subtext: "Add a success callout",
        },
        {
          title: "Danger Callout",
          onItemClick: () => {
            insertOrUpdateBlock(editor, {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "🚫 Danger: ",
                  styles: { bold: true, textColor: "red" },
                },
              ],
            });
          },
          aliases: ["danger", "error"],
          group: "Callouts",
          icon: <Ban className="h-4 w-4" />,
          subtext: "Add a danger callout",
        },
      ];

      return [...defaultItems, ...calloutItems];
    },
    []
  );

  if (!mounted) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <MantineProvider>
      <div className={className}>
        <BlockNoteView
          editor={editor}
          editable={editable}
          onChange={handleChange}
          theme="light"
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getCustomSlashMenuItems(editor), query)
            }
          />
        </BlockNoteView>
      </div>
    </MantineProvider>
  );
}

// Helper to convert blocks to/from JSON for storage
export function blocksToJson(blocks: PartialBlock[]): string {
  return JSON.stringify(blocks);
}

export function jsonToBlocks(json: string): PartialBlock[] | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
