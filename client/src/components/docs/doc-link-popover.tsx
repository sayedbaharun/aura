import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useDocSearch } from "@/hooks/use-doc-search";
import { FileText, Sparkles, FileCode, Layout, Book, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain?: string;
  status: string;
}

interface DocLinkPopoverProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

const typeIcons = {
  sop: FileText,
  prompt: Sparkles,
  spec: FileCode,
  template: Layout,
  playbook: Book,
  page: FileText,
};

/**
 * DocLinkPopover component - Provides autocomplete for [[doc links]]
 *
 * Usage:
 * 1. Type `[[` in the editor to trigger
 * 2. Start typing doc title to search
 * 3. Use arrow keys to navigate results
 * 4. Press Enter or click to insert link
 * 5. Press Escape to close
 *
 * Inserts syntax: [[Doc Title]](doc-id)
 */
export function DocLinkPopover({ textareaRef, value, onChange }: DocLinkPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [triggerPosition, setTriggerPosition] = useState<{ start: number; end: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  const { docs, isLoading } = useDocSearch(searchQuery, 200);

  // Detect [[ trigger
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);

      // Look for [[ pattern that hasn't been closed yet
      const lastDoubleBracket = textBeforeCursor.lastIndexOf("[[");

      if (lastDoubleBracket !== -1) {
        // Check if there's a closing ]] after the [[
        const textAfterTrigger = textBeforeCursor.substring(lastDoubleBracket + 2);
        const hasClosingBracket = textAfterTrigger.includes("]]");

        if (!hasClosingBracket) {
          // Extract search query (text after [[)
          const query = textAfterTrigger;

          // Calculate popover position
          const { top, left, height } = getCaretCoordinates(textarea, cursorPos);
          setPopoverPosition({
            top: top + height + 4,
            left: left,
          });

          setTriggerPosition({ start: lastDoubleBracket, end: cursorPos });
          setSearchQuery(query);
          setIsOpen(true);
          setSelectedIndex(0);
          return;
        }
      }

      // Close if no trigger found
      setIsOpen(false);
    };

    handleInput();
  }, [value, textareaRef]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, docs.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && docs.length > 0) {
        e.preventDefault();
        insertLink(docs[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, docs, selectedIndex]);

  const insertLink = (doc: Doc) => {
    if (!triggerPosition) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Build the link syntax: [[Doc Title]](doc-id)
    const linkText = `[[${doc.title}]](${doc.id})`;

    // Replace [[ and search query with the full link
    const newValue =
      value.substring(0, triggerPosition.start) +
      linkText +
      value.substring(triggerPosition.end);

    onChange(newValue);

    // Move cursor after the inserted link
    setTimeout(() => {
      const newCursorPos = triggerPosition.start + linkText.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setIsOpen(false);
    setSearchQuery("");
    setTriggerPosition(null);
  };

  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement("div");
    const style = getComputedStyle(element);
    const props = [
      "boxSizing",
      "width",
      "height",
      "overflowX",
      "overflowY",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "letterSpacing",
    ];

    props.forEach((prop) => {
      div.style[prop as any] = style[prop as any];
    });

    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";

    div.textContent = element.value.substring(0, position);

    const span = document.createElement("span");
    span.textContent = element.value.substring(position) || ".";
    div.appendChild(span);

    document.body.appendChild(div);

    const rect = element.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();

    const top = spanRect.top - rect.top + element.scrollTop;
    const left = spanRect.left - rect.left + element.scrollLeft;

    document.body.removeChild(div);

    return { top, left, height: spanRect.height };
  };

  if (!isOpen) return null;

  const Icon = (type: string) => {
    const IconComponent = typeIcons[type as keyof typeof typeIcons] || FileText;
    return <IconComponent className="h-4 w-4 mr-2 text-muted-foreground" />;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverContent
        className="p-0 w-80"
        align="start"
        side="bottom"
        style={{
          position: "fixed",
          top: popoverPosition.top,
          left: popoverPosition.left,
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : docs.length === 0 ? (
              <CommandEmpty>
                {searchQuery.length === 0
                  ? "Start typing to search docs..."
                  : "No docs found"}
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Documents">
                {docs.map((doc, index) => (
                  <CommandItem
                    key={doc.id}
                    value={doc.id}
                    onSelect={() => insertLink(doc)}
                    className={cn(
                      "cursor-pointer",
                      index === selectedIndex && "bg-accent"
                    )}
                  >
                    {Icon(doc.type)}
                    <div className="flex-1">
                      <div className="font-medium">{doc.title}</div>
                      {doc.domain && (
                        <div className="text-xs text-muted-foreground">
                          {doc.domain.replace("_", " ")}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
