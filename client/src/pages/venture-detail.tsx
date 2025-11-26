import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import VentureDetailHeader from "@/components/venture-hq/venture-detail-header";
import ProjectsBoard from "@/components/venture-hq/projects-board";
import TasksList from "@/components/venture-hq/tasks-list";
import VentureDocs from "@/components/docs/venture-docs";
import CreateProjectModal from "@/components/venture-hq/create-project-modal";
import AiAgentConfig from "@/components/venture-hq/ai-agent-config";

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
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="docs">Knowledge Base</TabsTrigger>
            <TabsTrigger value="ai-agent">AI Agent</TabsTrigger>
          </TabsList>

          {activeTab === "projects" && (
            <Button onClick={() => setCreateProjectModalOpen(true)}>
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

        <TabsContent value="ai-agent">
          <AiAgentConfig ventureId={venture.id} />
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
