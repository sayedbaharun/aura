import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCallback, useEffect, useState } from "react";
import { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider } from "@mantine/core";

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
        />
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
