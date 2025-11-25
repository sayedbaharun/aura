import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVentureId?: string;
  defaultProjectId?: string;
  defaultFocusDate?: string;
  defaultFocusSlot?: string;
  onCreated?: (task: any) => void;
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

interface Milestone {
  id: string;
  name: string;
  projectId: string;
}

const DOMAIN_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "travel", label: "Travel" },
  { value: "learning", label: "Learning" },
  { value: "play", label: "Play" },
  { value: "calls", label: "Calls" },
  { value: "personal", label: "Personal" },
];

const TYPE_OPTIONS = [
  { value: "business", label: "Business" },
  { value: "deep_work", label: "Deep Work" },
  { value: "admin", label: "Admin" },
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" },
  { value: "personal", label: "Personal" },
];

const FOCUS_SLOT_OPTIONS = [
  { value: "morning_routine", label: "Morning Routine (6-9am)" },
  { value: "deep_work_1", label: "Deep Work (9-11am)" },
  { value: "admin_block_1", label: "Admin Block (11am-12pm)" },
  { value: "deep_work_2", label: "Deep Work (2-4pm)" },
  { value: "admin_block_2", label: "Admin Block (4-5pm)" },
  { value: "evening_review", label: "Evening Review (5-6pm)" },
  { value: "meetings", label: "Meetings (Flexible)" },
  { value: "buffer", label: "Buffer (Flexible)" },
];

export default function CreateTaskModal({
  open,
  onOpenChange,
  defaultVentureId,
  defaultProjectId,
  defaultFocusDate,
  defaultFocusSlot,
  onCreated,
}: CreateTaskModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    status: "next",
    priority: "P2",
    type: "business",
    domain: "work",
    ventureId: defaultVentureId || "",
    projectId: defaultProjectId || "",
    milestoneId: "",
    dueDate: "",
    focusDate: defaultFocusDate || "",
    focusSlot: defaultFocusSlot || "",
    estEffort: "",
    notes: "",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        status: "next",
        priority: "P2",
        type: "business",
        domain: "work",
        ventureId: defaultVentureId || "",
        projectId: defaultProjectId || "",
        milestoneId: "",
        dueDate: "",
        focusDate: defaultFocusDate || "",
        focusSlot: defaultFocusSlot || "",
        estEffort: "",
        notes: "",
      });
    }
  }, [open, defaultVentureId, defaultProjectId, defaultFocusDate, defaultFocusSlot]);

  // Fetch ventures
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
    enabled: open,
  });

  // Fetch projects (filtered by venture)
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", formData.ventureId],
    queryFn: async () => {
      if (!formData.ventureId) return [];
      const res = await apiRequest("GET", `/api/projects?venture_id=${formData.ventureId}`);
      return res.json();
    },
    enabled: open && !!formData.ventureId,
  });

  // Fetch milestones (filtered by project)
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["/api/milestones", formData.projectId],
    queryFn: async () => {
      if (!formData.projectId) return [];
      const res = await apiRequest("GET", `/api/milestones?project_id=${formData.projectId}`);
      return res.json();
    },
    enabled: open && !!formData.projectId,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      onOpenChange(false);
      onCreated?.(task);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      title: formData.title.trim(),
      status: formData.status,
      priority: formData.priority,
      type: formData.type,
      domain: formData.domain,
    };

    if (formData.ventureId) payload.ventureId = formData.ventureId;
    if (formData.projectId) payload.projectId = formData.projectId;
    if (formData.milestoneId) payload.milestoneId = formData.milestoneId;
    if (formData.dueDate) payload.dueDate = formData.dueDate;
    if (formData.focusDate) payload.focusDate = formData.focusDate;
    if (formData.focusSlot) payload.focusSlot = formData.focusSlot;
    if (formData.estEffort) payload.estEffort = parseFloat(formData.estEffort);
    if (formData.notes) payload.notes = formData.notes;

    createTaskMutation.mutate(payload);
  };

  // Reset project when venture changes
  useEffect(() => {
    if (!formData.ventureId) {
      setFormData((prev) => ({ ...prev, projectId: "", milestoneId: "" }));
    }
  }, [formData.ventureId]);

  // Reset milestone when project changes
  useEffect(() => {
    if (!formData.projectId) {
      setFormData((prev) => ({ ...prev, milestoneId: "" }));
    }
  }, [formData.projectId]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "Pick a date";
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return "Pick a date";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Status, Priority, Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="next">Next</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Select
              value={formData.domain}
              onValueChange={(value) => setFormData({ ...formData, domain: value })}
            >
              <SelectTrigger id="domain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Venture and Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venture">Venture</Label>
              <Select
                value={formData.ventureId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, ventureId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="venture">
                  <SelectValue placeholder="Select venture (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ventures.map((venture) => (
                    <SelectItem key={venture.id} value={venture.id}>
                      {venture.icon && `${venture.icon} `}
                      {venture.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={formData.projectId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, projectId: value === "none" ? "" : value })
                }
                disabled={!formData.ventureId}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Milestone (if project selected) */}
          {formData.projectId && milestones.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="milestone">Milestone</Label>
              <Select
                value={formData.milestoneId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, milestoneId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="milestone">
                  <SelectValue placeholder="Select milestone (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {milestones.map((milestone) => (
                    <SelectItem key={milestone.id} value={milestone.id}>
                      {milestone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Due Date and Focus Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateDisplay(formData.dueDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        dueDate: date ? date.toISOString().split("T")[0] : "",
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Focus Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.focusDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateDisplay(formData.focusDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.focusDate ? new Date(formData.focusDate) : undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        focusDate: date ? date.toISOString().split("T")[0] : "",
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Focus Slot and Estimated Effort */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="focusSlot">Focus Slot</Label>
              <Select
                value={formData.focusSlot || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, focusSlot: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="focusSlot">
                  <SelectValue placeholder="Select focus slot (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {FOCUS_SLOT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estEffort">Estimated Effort (hours)</Label>
              <Input
                id="estEffort"
                type="number"
                step="0.5"
                min="0"
                value={formData.estEffort}
                onChange={(e) => setFormData({ ...formData, estEffort: e.target.value })}
                placeholder="e.g., 2.5"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional details..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
