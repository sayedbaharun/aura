import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, FolderKanban, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import CreateProjectModal from "./create-project-modal";
import ProjectDetailModal from "./project-detail-modal";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Project {
  id: string;
  name: string;
  ventureId: string;
  status: string;
  category: string;
  priority: "P0" | "P1" | "P2" | "P3";
  startDate: string | null;
  targetEndDate: string | null;
  outcome: string | null;
}

interface Task {
  id: string;
  projectId: string | null;
  status: string;
}

interface ProjectsBoardProps {
  ventureId: string;
}

const STATUS_COLUMNS = [
  { value: "not_started", label: "Not Started", color: "bg-gray-500" },
  { value: "planning", label: "Planning", color: "bg-yellow-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "blocked", label: "Blocked", color: "bg-red-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
];

export default function ProjectsBoard({ ventureId }: ProjectsBoardProps) {
  const isMobile = useIsMobile();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["in_progress", "planning"]);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDetailModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setDetailModalOpen(false);
    setEditingProject(project);
    setCreateModalOpen(true);
  };

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", ventureId],
    queryFn: async () => {
      const res = await fetch(`/api/projects?venture_id=${ventureId}`, {
        credentials: "include",
      });
      return await res.json();
    },
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "P1":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "P2":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "P3":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "product":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "marketing":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
      case "operations":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "finance":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "research":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getProjectTasks = (projectId: string) => {
    return allTasks.filter((t) => t.projectId === projectId);
  };

  const getProjectProgress = (projectId: string) => {
    const tasks = getProjectTasks(projectId);
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter((t) => t.status === "completed").length;
    return Math.round((doneTasks / tasks.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const toggleSection = (value: string) => {
    setOpenSections((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const renderProjectCard = (project: Project) => {
    const tasks = getProjectTasks(project.id);
    const progress = getProjectProgress(project.id);
    const doneTasks = tasks.filter((t) => t.status === "completed").length;

    return (
      <Card
        key={project.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleProjectClick(project.id)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {project.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            <Badge
              className={getPriorityColor(project.priority)}
              variant="secondary"
            >
              {project.priority}
            </Badge>
            <Badge
              className={getCategoryColor(project.category)}
              variant="secondary"
            >
              {project.category}
            </Badge>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tasks</span>
                <span>
                  {doneTasks}/{tasks.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {project.targetEndDate && (
            <div className="text-xs text-muted-foreground">
              Target: {new Date(project.targetEndDate).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile: Collapsible Sections */}
      {isMobile ? (
        <div className="space-y-3">
          {STATUS_COLUMNS.map((column) => {
            const columnProjects = projects.filter((p) => p.status === column.value);
            const isOpen = openSections.includes(column.value);

            return (
              <Collapsible
                key={column.value}
                open={isOpen}
                onOpenChange={() => toggleSection(column.value)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between p-4 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", column.color)} />
                      <span className="font-semibold">{column.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {columnProjects.length}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {columnProjects.map(renderProjectCard)}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        /* Desktop: Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto">
          {STATUS_COLUMNS.map((column) => {
            const columnProjects = projects.filter((p) => p.status === column.value);

            return (
              <div key={column.value} className="min-w-[250px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", column.color)} />
                      <h3 className="font-semibold text-sm">
                        {column.label}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnProjects.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {columnProjects.map(renderProjectCard)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[400px] text-center border-2 border-dashed rounded-lg">
          <FolderKanban className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to get started
          </p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      )}

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingProject(null);
        }}
        ventureId={ventureId}
        project={editingProject}
      />

      <ProjectDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        projectId={selectedProjectId}
        onEdit={handleEditProject}
      />
    </>
  );
}
