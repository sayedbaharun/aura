import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Inbox, ArrowRight, Archive, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Capture {
  id: string;
  title: string;
  type: string;
  source: string;
  domain: string;
  ventureId: string | null;
  projectId: string | null;
  linkedTaskId: string | null;
  clarified: boolean;
  notes: string | null;
  createdAt: string;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface Project {
  id: string;
  name: string;
  ventureId: string;
}

export default function CaptureInbox() {
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);

  const { data: captures = [], isLoading } = useQuery<Capture[]>({
    queryKey: ["/api/captures?clarified=false"],
    queryFn: async () => {
      const res = await fetch("/api/captures?clarified=false");
      if (!res.ok) throw new Error("Failed to fetch captures");
      return await res.json();
    },
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const [convertFormData, setConvertFormData] = useState({
    ventureId: "",
    projectId: "",
    priority: "P2",
    type: "business",
    domain: "work",
    dueDate: "",
  });

  const archiveCaptureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/captures/${id}`, { clarified: true });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/captures?clarified=false"] });
      toast({
        title: "Success",
        description: "Capture archived",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive capture",
        variant: "destructive",
      });
    },
  });

  const deleteCaptureMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/captures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/captures?clarified=false"] });
      toast({
        title: "Success",
        description: "Capture deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete capture",
        variant: "destructive",
      });
    },
  });

  const convertToTaskMutation = useMutation({
    mutationFn: async ({ captureId, data }: { captureId: string; data: any }) => {
      const res = await apiRequest("POST", `/api/captures/${captureId}/convert`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/captures?clarified=false"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setConvertDialogOpen(false);
      setSelectedCapture(null);
      toast({
        title: "Success",
        description: "Capture converted to task",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert capture",
        variant: "destructive",
      });
    },
  });

  const handleConvertClick = (capture: Capture) => {
    setSelectedCapture(capture);
    setConvertFormData({
      ventureId: capture.ventureId || "",
      projectId: capture.projectId || "",
      priority: "P2",
      type: "business",
      domain: capture.domain,
      dueDate: "",
    });
    setConvertDialogOpen(true);
  };

  const handleConvertSubmit = () => {
    if (!selectedCapture) return;

    const payload: any = {
      priority: convertFormData.priority,
      type: convertFormData.type,
      domain: convertFormData.domain,
    };

    if (convertFormData.ventureId) {
      payload.ventureId = convertFormData.ventureId;
    }
    if (convertFormData.projectId) {
      payload.projectId = convertFormData.projectId;
    }
    if (convertFormData.dueDate) {
      payload.dueDate = convertFormData.dueDate;
    }

    convertToTaskMutation.mutate({
      captureId: selectedCapture.id,
      data: payload,
    });
  };

  const handleArchive = (id: string) => {
    archiveCaptureMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this capture?")) {
      deleteCaptureMutation.mutate(id);
    }
  };

  const availableProjects = projects.filter(
    (p) => !convertFormData.ventureId || p.ventureId === convertFormData.ventureId
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Capture Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (captures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Capture Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Inbox className="h-16 w-16 text-green-500/20 mb-4" />
            <p className="text-lg font-medium">Inbox zero!</p>
            <p className="text-sm text-muted-foreground mt-1">
              All your captures have been clarified.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Capture Inbox ({captures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {captures.map((capture) => (
              <div key={capture.id} className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-xs">
                      {capture.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {capture.source}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(capture.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{capture.title}</p>
                  {capture.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{capture.notes}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConvertClick(capture)}
                    title="Convert to Task"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(capture.id)}
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(capture.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Task</DialogTitle>
          </DialogHeader>
          {selectedCapture && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">From Capture</Label>
                <p className="text-sm font-medium">{selectedCapture.title}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venture">Venture</Label>
                <Select
                  value={convertFormData.ventureId}
                  onValueChange={(value) =>
                    setConvertFormData({ ...convertFormData, ventureId: value, projectId: "" })
                  }
                >
                  <SelectTrigger id="venture">
                    <SelectValue placeholder="Select venture (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ventures.map((venture) => (
                      <SelectItem key={venture.id} value={venture.id}>
                        {venture.icon} {venture.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={convertFormData.projectId}
                  onValueChange={(value) => setConvertFormData({ ...convertFormData, projectId: value })}
                  disabled={!convertFormData.ventureId}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={convertFormData.priority}
                    onValueChange={(value) => setConvertFormData({ ...convertFormData, priority: value })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - Urgent</SelectItem>
                      <SelectItem value="P1">P1 - High</SelectItem>
                      <SelectItem value="P2">P2 - Medium</SelectItem>
                      <SelectItem value="P3">P3 - Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={convertFormData.type}
                    onValueChange={(value) => setConvertFormData({ ...convertFormData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="deep_work">Deep Work</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={convertFormData.dueDate}
                  onChange={(e) => setConvertFormData({ ...convertFormData, dueDate: e.target.value })}
                />
              </div>

              <Button
                onClick={handleConvertSubmit}
                className="w-full"
                disabled={convertToTaskMutation.isPending}
              >
                {convertToTaskMutation.isPending ? "Converting..." : "Convert to Task"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
