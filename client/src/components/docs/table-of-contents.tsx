import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export function TableOfContents({ content, className }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);

  // Extract headings from markdown
  useEffect(() => {
    const extractedHeadings: Heading[] = [];
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const h1Match = line.match(/^#\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);

      if (h1Match) {
        const text = h1Match[1].trim();
        const id = `heading-${index}-${text.toLowerCase().replace(/[^\w]+/g, "-")}`;
        extractedHeadings.push({ id, text, level: 1 });
      } else if (h2Match) {
        const text = h2Match[1].trim();
        const id = `heading-${index}-${text.toLowerCase().replace(/[^\w]+/g, "-")}`;
        extractedHeadings.push({ id, text, level: 2 });
      } else if (h3Match) {
        const text = h3Match[1].trim();
        const id = `heading-${index}-${text.toLowerCase().replace(/[^\w]+/g, "-")}`;
        extractedHeadings.push({ id, text, level: 3 });
      }
    });

    setHeadings(extractedHeadings);
  }, [content]);

  // Track scroll position and update active heading
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for better UX

      // Find the heading closest to the scroll position
      let currentActiveId = "";

      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element) {
          const { top } = element.getBoundingClientRect();
          const absoluteTop = top + window.scrollY;

          if (absoluteTop <= scrollPosition) {
            currentActiveId = heading.id;
          } else {
            break;
          }
        }
      }

      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // Smooth scroll to heading
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed header if any
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={cn("sticky top-4", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between p-2">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span className="font-semibold text-sm">Table of Contents</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen ? "rotate-180" : ""
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-1">
          <nav className="space-y-1">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => scrollToHeading(heading.id)}
                className={cn(
                  "block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  heading.level === 1 && "font-medium",
                  heading.level === 2 && "pl-4 text-muted-foreground",
                  heading.level === 3 && "pl-6 text-muted-foreground text-xs",
                  activeId === heading.id && "bg-accent text-accent-foreground font-medium"
                )}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
