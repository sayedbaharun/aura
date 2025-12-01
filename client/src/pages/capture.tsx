import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Inbox,
  Zap,
  ArrowRight,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

export default function CapturePage() {
  const { toast } = useToast();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);

  // Quick capture form
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("idea");
  const [source, setSource] = useState<string>("brain");
  const [domain, setDomain] = useState<string>("work");
  const [notes, setNotes] = useState("");

  // Auto-focus on mount
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const { data: captures = [], isLoading: capturesLoading } = useQuery<Capture[]>({
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

  // Create capture mutation
  const createCaptureMutation = useMutation({
    mutationFn: async (data: { title: string; type: string; source: string; domain: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/captures", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/captures?clarified=false"] });
      setTitle("");
      setNotes("");
      setShowMoreOptions(false);
      toast({
        title: "Captured!",
        description: "Added to your inbox.",
      });
      titleInputRef.current?.focus();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to capture",
        variant: "destructive",
      });
    },
  });

  const archiveCaptureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/captures/${id}`, { clarified: true });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/captures?clarified=false"] });
      toast({ title: "Archived" });
    },
  });

  const deleteCaptureMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/captures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/captures?clarified=false"] });
      toast({ title: "Deleted" });
    },
  });

  const [convertFormData, setConvertFormData] = useState({
    ventureId: "",
    projectId: "",
    priority: "P2",
    type: "business",
    domain: "work",
    dueDate: "",
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
      toast({ title: "Converted to task!" });
    },
  });

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createCaptureMutation.mutate({
      title: title.trim(),
      type,
      source,
      domain,
      notes: notes.trim() || undefined,
    });
  };

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
    if (convertFormData.ventureId) payload.ventureId = convertFormData.ventureId;
    if (convertFormData.projectId) payload.projectId = convertFormData.projectId;
    if (convertFormData.dueDate) payload.dueDate = convertFormData.dueDate;

    convertToTaskMutation.mutate({ captureId: selectedCapture.id, data: payload });
  };

  const availableProjects = Array.isArray(projects)
    ? projects.filter((p) => !convertFormData.ventureId || p.ventureId === convertFormData.ventureId)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Capture</h1>
            <p className="text-sm text-muted-foreground">Get it out of your head</p>
          </div>
        </div>

        {/* Quick Capture Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleQuickCapture} className="space-y-4">
              <div>
                <Input
                  ref={titleInputRef}
                  placeholder="What's on your mind?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                />
              </div>

              {/* Expandable options */}
              <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    {showMoreOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showMoreOptions ? "Less options" : "More options"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="idea">Idea</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="question">Question</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Source</Label>
                      <Select value={source} onValueChange={setSource}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brain">Brain</SelectItem>
                          <SelectItem value="chat">Chat</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="web">Web</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Domain</Label>
                      <Select value={domain} onValueChange={setDomain}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="learning">Learning</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      placeholder="Additional context..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                disabled={!title.trim() || createCaptureMutation.isPending}
              >
                {createCaptureMutation.isPending ? "Capturing..." : "Capture"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Inbox */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">Inbox</h2>
            {captures.length > 0 && (
              <Badge variant="secondary">{captures.length}</Badge>
            )}
          </div>

          {capturesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : captures.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 text-green-500/30 mx-auto mb-3" />
                <p className="font-medium text-green-600">Inbox Zero!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All captures have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {captures.map((capture) => (
                <Card key={capture.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
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
                        <p className="font-medium">{capture.title}</p>
                        {capture.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {capture.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConvertClick(capture)}
                          title="Convert to Task"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => archiveCaptureMutation.mutate(capture.id)}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this capture?")) {
                              deleteCaptureMutation.mutate(capture.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Convert to Task Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Task</DialogTitle>
            <DialogDescription className="sr-only">Convert a capture item to an actionable task</DialogDescription>
          </DialogHeader>
          {selectedCapture && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">From Capture</Label>
                <p className="font-medium">{selectedCapture.title}</p>
              </div>

              <div className="space-y-2">
                <Label>Venture</Label>
                <Select
                  value={convertFormData.ventureId || "none"}
                  onValueChange={(value) =>
                    setConvertFormData({ ...convertFormData, ventureId: value === "none" ? "" : value, projectId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select venture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(Array.isArray(ventures) ? ventures : []).map((venture) => (
                      <SelectItem key={venture.id} value={venture.id}>
                        {venture.icon} {venture.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {convertFormData.ventureId && (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={convertFormData.projectId || "none"}
                    onValueChange={(value) =>
                      setConvertFormData({ ...convertFormData, projectId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={convertFormData.priority}
                    onValueChange={(value) => setConvertFormData({ ...convertFormData, priority: value })}
                  >
                    <SelectTrigger>
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
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={convertFormData.dueDate}
                    onChange={(e) => setConvertFormData({ ...convertFormData, dueDate: e.target.value })}
                  />
                </div>
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
    </div>
  );
}
