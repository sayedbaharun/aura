import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plus, Bot, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VentureDetailHeader from "@/components/venture-hq/venture-detail-header";
import ProjectsBoard from "@/components/venture-hq/projects-board";
import TasksList from "@/components/venture-hq/tasks-list";
import VentureDocs from "@/components/docs/venture-docs";
import CreateProjectModal from "@/components/venture-hq/create-project-modal";
import AiAgentConfig from "@/components/venture-hq/ai-agent-config";
import VentureAiChat from "@/components/venture-hq/venture-ai-chat";

interface Venture {
  id: string;
  name: string;
  status: string;
  oneLiner: string | null;
  domain: string;
  primaryFocus: string | null;
  color: string | null;
  icon: string | null;
}

export default function VentureDetail() {
  const [, params] = useRoute("/ventures/:id");
  const ventureId = params?.id;
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");
  const [aiSubTab, setAiSubTab] = useState<"chat" | "config">("chat");

  const { data: venture, isLoading } = useQuery<Venture>({
    queryKey: ["/api/ventures", ventureId],
    queryFn: async () => {
      const res = await fetch(`/api/ventures/${ventureId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch venture");
      return await res.json();
    },
    enabled: !!ventureId,
  });

  // Fetch AI agent config for quick actions
  const { data: aiAgentConfig } = useQuery({
    queryKey: [`/api/ai-agent-prompts/venture/${ventureId}`],
    queryFn: async () => {
      const res = await fetch(`/api/ai-agent-prompts/venture/${ventureId}`, {
        credentials: "include",
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!ventureId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!venture) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Venture Not Found</h1>
          <p className="text-muted-foreground">
            The venture you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <VentureDetailHeader venture={venture} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks</TabsTrigger>
              <TabsTrigger value="docs" className="text-xs sm:text-sm whitespace-nowrap">Knowledge</TabsTrigger>
              <TabsTrigger value="ai-agent" className="text-xs sm:text-sm whitespace-nowrap">AI Agent</TabsTrigger>
            </TabsList>
          </div>

          {activeTab === "projects" && (
            <Button onClick={() => setCreateProjectModalOpen(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        <TabsContent value="projects">
          <ProjectsBoard ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksList ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="docs">
          <VentureDocs ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="ai-agent" className="space-y-4">
          {/* Sub-tabs for AI Agent */}
          <div className="flex items-center gap-2 border-b pb-4">
            <Button
              variant={aiSubTab === "chat" ? "default" : "outline"}
              size="sm"
              onClick={() => setAiSubTab("chat")}
            >
              <Bot className="h-4 w-4 mr-2" />
              Chat with AI
            </Button>
            <Button
              variant={aiSubTab === "config" ? "default" : "outline"}
              size="sm"
              onClick={() => setAiSubTab("config")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Agent
            </Button>
          </div>

          {aiSubTab === "chat" ? (
            <Card className="h-[600px]">
              <CardContent className="p-6 h-full">
                <VentureAiChat
                  ventureId={venture.id}
                  ventureName={venture.name}
                  quickActions={aiAgentConfig?.quickActions || []}
                />
              </CardContent>
            </Card>
          ) : (
            <AiAgentConfig ventureId={venture.id} />
          )}
        </TabsContent>
      </Tabs>

      <CreateProjectModal
        open={createProjectModalOpen}
        onOpenChange={setCreateProjectModalOpen}
        ventureId={venture.id}
      />
    </div>
  );
}
