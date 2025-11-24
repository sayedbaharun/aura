import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Search, Tags } from "lucide-react";

export default function KnowledgeHub() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Knowledge Hub</h1>
          </div>
          <p className="text-muted-foreground">
            Capture ideas, organize knowledge, and leverage AI-powered insights
          </p>
        </div>
        <Badge variant="secondary">Phase 1</Badge>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Management System</CardTitle>
          <CardDescription>
            Advanced note-taking and knowledge organization features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 py-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Quick Capture</h3>
                <p className="text-sm text-muted-foreground">
                  Instantly capture ideas, notes, and thoughts with AI categorization
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Tags className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Auto-Tagging</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered tagging and categorization for easy organization
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Search</h3>
                <p className="text-sm text-muted-foreground">
                  Powerful semantic search to find notes by context and meaning
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Knowledge Graph</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize connections between notes and discover insights
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          This module is being built as part of Phase 1. Check back soon!
        </p>
      </div>
    </div>
  );
}
