import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocsListProps {
  ventureId: string;
}

export default function DocsList({ ventureId }: DocsListProps) {
  // Placeholder component - Docs API will be implemented in Phase 4
  return (
    <Card>
      <CardHeader>
        <CardTitle>Docs & SOPs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Docs & SOPs management will be available in Phase 4. This will include
            procedures, prompts, specs, templates, and playbooks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
