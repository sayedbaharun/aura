import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VentureDetailHeader from "@/components/venture-hq/venture-detail-header";
import ProjectsBoard from "@/components/venture-hq/projects-board";
import TasksList from "@/components/venture-hq/tasks-list";
import VentureDocs from "@/components/docs/venture-docs";

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

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="docs">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ProjectsBoard ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksList ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="docs">
          <VentureDocs ventureId={venture.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
