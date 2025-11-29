import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Info,
  AlertTriangle,
  Lightbulb,
  XCircle,
  Code,
  Minus,
  Table,
  Image,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface BlockInsertMenuProps {
  onInsert: (markdown: string) => void;
}

export function BlockInsertMenu({ onInsert }: BlockInsertMenuProps) {
  const [open, setOpen] = useState(false);

  const handleInsert = (markdown: string) => {
    onInsert(markdown);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Insert Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Callouts</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n> [!info]\n> This is an info callout. Add your content here.\n\n"
            )
          }
        >
          <Info className="h-4 w-4 mr-2 text-blue-600" />
          Info Callout
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n> [!tip]\n> This is a tip callout. Share helpful advice here.\n\n"
            )
          }
        >
          <Lightbulb className="h-4 w-4 mr-2 text-green-600" />
          Tip Callout
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n> [!warning]\n> This is a warning callout. Highlight important cautions.\n\n"
            )
          }
        >
          <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
          Warning Callout
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n> [!danger]\n> This is a danger callout. Mark critical warnings.\n\n"
            )
          }
        >
          <XCircle className="h-4 w-4 mr-2 text-red-600" />
          Danger Callout
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n> [!note]\n> This is a note callout. Add additional context.\n\n"
            )
          }
        >
          <AlertCircle className="h-4 w-4 mr-2 text-purple-600" />
          Note Callout
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n> [!success]\n> This is a success callout. Celebrate achievements.\n\n"
            )
          }
        >
          <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
          Success Callout
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Code & Content</DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n```javascript\n// Your code here\nconsole.log('Hello, world!');\n```\n\n"
            )
          }
        >
          <Code className="h-4 w-4 mr-2" />
          Code Block
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() =>
            handleInsert(
              "\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n\n"
            )
          }
        >
          <Table className="h-4 w-4 mr-2" />
          Table
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleInsert("\n![Image alt text](image-url)\n\n")}
        >
          <Image className="h-4 w-4 mr-2" />
          Image
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleInsert("\n---\n\n")}>
          <Minus className="h-4 w-4 mr-2" />
          Horizontal Divider
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
