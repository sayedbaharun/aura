import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { FileText, ExternalLink, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain: string;
  qualityScore: number;
  aiReady: boolean;
  updatedAt: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 bg-green-100";
  if (score >= 50) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

export function ReviewQueue({ limit = 10 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["docs-review-queue", limit],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/docs/quality/review-queue?limit=${limit}`);
      return response.json();
    },
  });

  const docs = data?.docs || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p>All documents meet quality standards!</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((doc: Doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate max-w-[200px]">
                  {doc.title}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{doc.type}</Badge>
            </TableCell>
            <TableCell>
              <Badge className={cn("font-mono", getScoreColor(doc.qualityScore || 0))}>
                {doc.qualityScore || 0}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(doc.updatedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Link href={`/knowledge/${doc.id}`}>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
