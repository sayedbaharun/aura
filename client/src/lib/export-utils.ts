/**
 * Utility functions for exporting document content
 */

/**
 * Copy markdown content to clipboard
 */
export async function copyAsMarkdown(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

/**
 * Convert markdown to HTML and copy to clipboard
 * Uses a simple markdown to HTML converter
 */
export async function copyAsHtml(content: string): Promise<void> {
  const html = convertMarkdownToHtml(content);

  try {
    // Modern clipboard API supports HTML
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([content], { type: "text/plain" }),
      }),
    ]);
  } catch (error) {
    // Fallback to plain text if HTML copy fails
    await copyAsMarkdown(content);
    throw new Error("HTML copy not supported, copied as plain text instead");
  }
}

/**
 * Download markdown content as a .md file
 */
export function downloadMarkdown(title: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // Sanitize filename
  const filename = `${sanitizeFilename(title)}.md`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download HTML content as a .html file
 */
export function downloadHtml(title: string, content: string): void {
  const html = createHtmlDocument(title, content);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // Sanitize filename
  const filename = `${sanitizeFilename(title)}.html`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open browser print dialog
 */
export function printDoc(): void {
  window.print();
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 100) || "document";
}

/**
 * Check if a URL is safe (not javascript:, data:, vbscript:, etc.)
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Block dangerous protocols
  if (trimmed.startsWith('javascript:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('data:text/html')) {
    return false;
  }
  return true;
}

/**
 * Simple markdown to HTML converter
 * For more complex conversions, consider using a library like 'marked'
 */
function convertMarkdownToHtml(markdown: string): string {
  // First, escape HTML entities in the raw markdown to prevent XSS
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");

  // Inline code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Links - with URL sanitization to prevent javascript: XSS
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    if (isSafeUrl(url)) {
      return `<a href="${url}">${text}</a>`;
    }
    // For unsafe URLs, just show the text without a link
    return text;
  });

  // Images - with URL sanitization
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (isSafeUrl(src)) {
      return `<img src="${src}" alt="${alt}" />`;
    }
    return `[Image: ${alt}]`;
  });

  // Lists
  html = html.replace(/^\* (.+)$/gim, "<li>$1</li>");
  html = html.replace(/^\- (.+)$/gim, "<li>$1</li>");
  html = html.replace(/^(\d+)\. (.+)$/gim, "<li>$2</li>");

  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, "<ul>$&</ul>");

  // Line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");

  // Wrap in paragraphs
  html = `<p>${html}</p>`;

  // Clean up
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>(<h[1-6]>)/g, "$1");
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre>)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");

  return html;
}

/**
 * Create a complete HTML document with styling
 */
function createHtmlDocument(title: string, markdownContent: string): string {
  const bodyContent = convertMarkdownToHtml(markdownContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.3;
      font-weight: 600;
    }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    code {
      background-color: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }
    pre {
      background-color: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul, ol {
      padding-left: 2em;
    }
    li {
      margin-bottom: 0.5em;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }
    @media print {
      body {
        padding: 1rem;
      }
      a {
        color: #000;
        text-decoration: underline;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${bodyContent}
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
