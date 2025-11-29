import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Download,
  Copy,
  FileCode,
  Printer,
  FileDown,
} from "lucide-react";
import {
  copyAsMarkdown,
  copyAsHtml,
  downloadMarkdown,
  downloadHtml,
  printDoc,
} from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

interface ExportMenuProps {
  doc: {
    title: string;
    body?: string;
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportMenu({ doc, variant = "outline", size = "sm" }: ExportMenuProps) {
  const { toast } = useToast();

  const handleCopyMarkdown = async () => {
    try {
      await copyAsMarkdown(doc.body || "");
      toast({
        title: "Copied as Markdown",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const handleCopyHtml = async () => {
    try {
      await copyAsHtml(doc.body || "");
      toast({
        title: "Copied as HTML",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("plain text")) {
        toast({
          title: "Copied as Plain Text",
          description: "HTML copy not supported, copied as plain text instead",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to copy content",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      downloadMarkdown(doc.title, doc.body || "");
      toast({
        title: "Downloaded",
        description: `${doc.title}.md has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDownloadHtml = () => {
    try {
      downloadHtml(doc.title, doc.body || "");
      toast({
        title: "Downloaded",
        description: `${doc.title}.html has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    try {
      printDoc();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open print dialog",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyMarkdown}>
          <Copy className="h-4 w-4 mr-2" />
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyHtml}>
          <FileCode className="h-4 w-4 mr-2" />
          Copy as HTML
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDownloadMarkdown}>
          <FileDown className="h-4 w-4 mr-2" />
          Download as .md
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadHtml}>
          <FileCode className="h-4 w-4 mr-2" />
          Download as .html
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
