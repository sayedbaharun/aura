import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
  node?: any;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract language from className (e.g., "language-javascript")
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline code
  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
        {children}
      </code>
    );
  }

  // Code block
  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity",
            copied && "opacity-100"
          )}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border">
        {language && language !== "text" && (
          <div className="px-4 py-2 bg-muted/50 border-b text-xs font-mono text-muted-foreground">
            {language}
          </div>
        )}
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "0.875rem",
            lineHeight: "1.5",
          }}
          showLineNumbers={true}
          wrapLines={true}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
