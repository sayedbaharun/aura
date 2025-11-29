import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { CalloutBlock } from "./callout-block";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ExternalLink, ZoomIn } from "lucide-react";
import type { Components } from "react-markdown";

interface EnhancedMarkdownRendererProps {
  content: string;
  className?: string;
}

export function EnhancedMarkdownRenderer({
  content,
  className,
}: EnhancedMarkdownRendererProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const components: Components = {
    // Code blocks with syntax highlighting
    code(props) {
      const { node, inline, className, children, ...rest } = props;
      return (
        <CodeBlock className={className} inline={inline}>
          {String(children)}
        </CodeBlock>
      );
    },

    // Blockquotes with callout support
    blockquote(props) {
      const { node, children, ...rest } = props;
              // Check if this is a callout (starts with [!type])
              const childrenArray = Array.isArray(children) ? children : [children];
              const firstChild = childrenArray[0];

              // Extract text from the first paragraph
              let text = "";
              if (
                firstChild &&
                typeof firstChild === "object" &&
                "props" in firstChild &&
                firstChild.props &&
                "children" in firstChild.props
              ) {
                const paragraphChildren = firstChild.props.children;
                if (Array.isArray(paragraphChildren)) {
                  text = paragraphChildren
                    .map((child) => (typeof child === "string" ? child : ""))
                    .join("");
                } else if (typeof paragraphChildren === "string") {
                  text = paragraphChildren;
                }
              }

              // Match callout syntax: [!type]
              const calloutMatch = text.match(/^\[!(info|warning|tip|danger|note|success)\]/i);

              if (calloutMatch) {
                const type = calloutMatch[1].toLowerCase() as any;

                // Remove the [!type] marker from the content
                const contentWithoutMarker = childrenArray.map((child, index) => {
                  if (index === 0 && typeof child === "object" && "props" in child) {
                    const paragraphChildren = child.props.children;
                    if (Array.isArray(paragraphChildren)) {
                      const filtered = paragraphChildren.map((c) => {
                        if (typeof c === "string") {
                          return c.replace(/^\[!(info|warning|tip|danger|note|success)\]\s*/i, "");
                        }
                        return c;
                      });
                      return { ...child, props: { ...child.props, children: filtered } };
                    } else if (typeof paragraphChildren === "string") {
                      return {
                        ...child,
                        props: {
                          ...child.props,
                          children: paragraphChildren.replace(/^\[!(info|warning|tip|danger|note|success)\]\s*/i, ""),
                        },
                      };
                    }
                  }
                  return child;
                });

                return <CalloutBlock type={type}>{contentWithoutMarker}</CalloutBlock>;
              }

      // Regular blockquote
      return (
        <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic my-4">
          {children}
        </blockquote>
      );
    },

    // Tables with enhanced styling
    table(props) {
      const { node, children, ...rest } = props;
      return (
        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse">
            {children}
          </table>
        </div>
      );
    },
    thead(props) {
      const { node, children, ...rest } = props;
      return (
        <thead className="bg-muted/50">
          {children}
        </thead>
      );
    },
    th(props) {
      const { node, children, ...rest } = props;
      return (
        <th className="border border-border px-4 py-2 text-left font-semibold">
          {children}
        </th>
      );
    },
    td(props) {
      const { node, children, ...rest } = props;
      return (
        <td className="border border-border px-4 py-2">
          {children}
        </td>
      );
    },
    tr(props) {
      const { node, children, ...rest } = props;
      return (
        <tr className="hover:bg-muted/30 transition-colors">
          {children}
        </tr>
      );
    },

    // Links - external links open in new tab
    a(props) {
      const { node, href, children, ...rest } = props;
      const isExternal = href?.startsWith("http");
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-primary hover:underline inline-flex items-center gap-1"
          {...rest}
        >
          {children}
          {isExternal && <ExternalLink className="h-3 w-3 inline" />}
        </a>
      );
    },

    // Images with lazy loading and click to expand
    img(props) {
      const { node, src, alt, ...rest } = props;
      return (
        <div className="my-6 relative group">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="rounded-lg border shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setExpandedImage(src || null)}
            {...rest}
          />
          <button
            className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setExpandedImage(src || null)}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {alt && (
            <p className="text-center text-sm text-muted-foreground mt-2 italic">
              {alt}
            </p>
          )}
        </div>
      );
    },

    // Headings with better spacing
    h1(props) {
      const { node, children, ...rest } = props;
      return (
        <h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0" {...rest}>
          {children}
        </h1>
      );
    },
    h2(props) {
      const { node, children, ...rest } = props;
      return (
        <h2 className="text-2xl font-bold mt-6 mb-3 first:mt-0" {...rest}>
          {children}
        </h2>
      );
    },
    h3(props) {
      const { node, children, ...rest } = props;
      return (
        <h3 className="text-xl font-bold mt-5 mb-2 first:mt-0" {...rest}>
          {children}
        </h3>
      );
    },

    // Horizontal rules
    hr(props) {
      const { node, ...rest } = props;
      return <hr className="my-8 border-border" {...rest} />;
    },

    // Lists with better spacing
    ul(props) {
      const { node, children, ...rest } = props;
      return (
        <ul className="my-4 ml-6 list-disc space-y-2" {...rest}>
          {children}
        </ul>
      );
    },
    ol(props) {
      const { node, children, ...rest } = props;
      return (
        <ol className="my-4 ml-6 list-decimal space-y-2" {...rest}>
          {children}
        </ol>
      );
    },
  };

  return (
    <>
      <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Image expansion modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              className="absolute top-4 right-4 p-2 bg-background rounded-lg shadow-lg"
              onClick={() => setExpandedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
