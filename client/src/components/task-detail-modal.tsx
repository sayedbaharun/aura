import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTaskDetailModal } from '@/lib/task-detail-modal-store';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, cleanFormData } from '@/lib/utils';
import { CalendarIcon, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'P0' | 'P1' | 'P2' | 'P3' | null;
  type: 'business' | 'deep_work' | 'admin' | 'health' | 'learning' | 'personal' | null;
  domain: 'home' | 'work' | 'health' | 'finance' | 'travel' | 'learning' | 'play' | 'calls' | 'personal' | null;
  ventureId: string | null;
  projectId: string | null;
  phaseId: string | null;
  dayId: string | null;
  dueDate: string | null;
  focusDate: string | null;
  focusSlot: 'morning_routine' | 'deep_work_1' | 'admin_block' | 'lunch' | 'gym' | 'afternoon' | 'evening_review' | 'meetings' | 'buffer' | null;
  estEffort: number | null;
  actualEffort: number | null;
  notes: string | null;
  tags: string[] | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
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

interface Phase {
  id: string;
  name: string;
  projectId: string;
  status: string;
}

export default function TaskDetailModal() {
  const { isOpen, taskId, mode, closeTaskDetail, setMode } = useTaskDetailModal();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state for edit mode
  const [formData, setFormData] = useState<Partial<Task>>({});

  // Fetch task data
  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ['/api/tasks', taskId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tasks/${taskId}`);
      return response.json();
    },
    enabled: !!taskId && isOpen,
  });

  // Fetch ventures
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ['/api/ventures'],
    enabled: isOpen,
  });

  // Fetch projects (filtered by venture if selected)
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects', formData.ventureId],
    queryFn: async () => {
      if (!formData.ventureId) return [];
      const response = await apiRequest('GET', `/api/projects?venture_id=${formData.ventureId}`);
      return response.json();
    },
    enabled: !!formData.ventureId && isOpen && mode === 'edit',
  });

  // Fetch phases (filtered by project if selected)
  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ['/api/phases', formData.projectId],
    queryFn: async () => {
      if (!formData.projectId) return [];
      const response = await apiRequest('GET', `/api/phases?project_id=${formData.projectId}`);
      return response.json();
    },
    enabled: !!formData.projectId && isOpen && mode === 'edit',
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      // Remove read-only fields that aren't part of the update schema
      // (insertTaskSchema omits: id, createdAt, updatedAt)
      const { id, createdAt, updatedAt, ...updateData } = data;
      // Clean data to only send non-empty values
      const cleanData = cleanFormData(updateData);
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, cleanData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/today'] });
      setMode('view');
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/today'] });
      closeTaskDetail();
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });

  // Toggle completed/reopen mutation
  const toggleDoneMutation = useMutation({
    mutationFn: async (newStatus: 'completed' | 'todo') => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/today'] });
    },
  });

  // Initialize form data when task loads
  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData(task);
    }
  }, [task, mode]);

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
    }
  }, [isOpen]);

  // Reset project when changing venture in edit mode
  useEffect(() => {
    if (mode === 'edit' && !formData.ventureId) {
      setFormData((prev) => ({ ...prev, projectId: null, phaseId: null }));
    }
  }, [formData.ventureId, mode]);

  // Reset phase when changing project in edit mode
  useEffect(() => {
    if (mode === 'edit' && !formData.projectId) {
      setFormData((prev) => ({ ...prev, phaseId: null }));
    }
  }, [formData.projectId, mode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        if (mode === 'edit') {
          setMode('view');
        } else {
          closeTaskDetail();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setMode(mode === 'view' ? 'edit' : 'view');
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's' && mode === 'edit') {
        e.preventDefault();
        handleSave();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (task) {
          toggleDoneMutation.mutate(task.status === 'completed' ? 'todo' : 'completed');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, task, formData]);

  const handleSave = () => {
    if (!formData.title?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }
    updateTaskMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData(task || {});
    setMode('view');
  };

  const handleDelete = () => {
    deleteTaskMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleToggleDone = () => {
    if (task) {
      toggleDoneMutation.mutate(task.status === 'completed' ? 'todo' : 'completed');
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'P1':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'P2':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'P3':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'business':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'deep_work':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'admin':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'personal':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'learning':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'health':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getVentureName = (ventureId: string | null) => {
    if (!ventureId) return null;
    const venture = ventures.find((v) => v.id === ventureId);
    return venture ? `${venture.icon || ''} ${venture.name}`.trim() : null;
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name || null;
  };

  const getPhaseName = (phaseId: string | null) => {
    if (!phaseId) return null;
    const phase = phases.find((m) => m.id === phaseId);
    return phase?.name || null;
  };

  const formatFocusSlot = (slot: string | null) => {
    if (!slot) return null;
    const slotLabels: Record<string, string> = {
      morning_routine: 'Morning Routine (7-9am)',
      deep_work_1: 'Deep Work 1 (9-11am)',
      admin_block: 'Admin Block (11am-12pm)',
      lunch: 'Lunch (12-1pm)',
      gym: 'Gym / Workout (1-3pm)',
      afternoon: 'Afternoon (3-11pm)',
      evening_review: 'Evening Review (11pm-12am)',
      meetings: 'Meetings (Flexible)',
      buffer: 'Buffer (Flexible)',
    };
    return slotLabels[slot] || slot;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
    } catch {
      return timestamp;
    }
  };

  if (!isOpen) return null;

  if (taskLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={closeTaskDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <DialogDescription className="sr-only">Loading task details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-8">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return (
      <Dialog open={isOpen} onOpenChange={closeTaskDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task not found</DialogTitle>
            <DialogDescription className="sr-only">The requested task could not be found</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground">The task you're looking for doesn't exist.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeTaskDetail}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'view' ? 'Task Details' : 'Edit Task'}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'view' ? 'View task information and details' : 'Edit task properties and settings'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' ? (
          // VIEW MODE
          <div className="space-y-6">
            {/* Header Section */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">{task.title}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.priority && (
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                )}
                {task.type && (
                  <Badge className={getTypeColor(task.type)}>{task.type.replace('_', ' ')}</Badge>
                )}
                {task.domain && (
                  <Badge variant="outline">{task.domain}</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getVentureName(task.ventureId) && (
                <div>
                  <Label className="text-muted-foreground">Venture</Label>
                  <p className="font-medium">{getVentureName(task.ventureId)}</p>
                </div>
              )}
              {getProjectName(task.projectId) && (
                <div>
                  <Label className="text-muted-foreground">Project</Label>
                  <p className="font-medium">{getProjectName(task.projectId)}</p>
                </div>
              )}
              {getPhaseName(task.phaseId) && (
                <div>
                  <Label className="text-muted-foreground">Phase</Label>
                  <p className="font-medium">{getPhaseName(task.phaseId)}</p>
                </div>
              )}
              {task.dueDate && (
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p className="font-medium">{formatDate(task.dueDate)}</p>
                </div>
              )}
              {task.focusDate && (
                <div>
                  <Label className="text-muted-foreground">Focus Date</Label>
                  <p className="font-medium">{formatDate(task.focusDate)}</p>
                </div>
              )}
              {task.focusSlot && (
                <div>
                  <Label className="text-muted-foreground">Focus Slot</Label>
                  <p className="font-medium">{formatFocusSlot(task.focusSlot)}</p>
                </div>
              )}
              {task.estEffort !== null && (
                <div>
                  <Label className="text-muted-foreground">Estimated Effort</Label>
                  <p className="font-medium">{task.estEffort} hours</p>
                </div>
              )}
              {task.actualEffort !== null && (
                <div>
                  <Label className="text-muted-foreground">Actual Effort</Label>
                  <p className="font-medium">{task.actualEffort} hours</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p>{formatTimestamp(task.createdAt)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Updated</Label>
                <p>{formatTimestamp(task.updatedAt)}</p>
              </div>
              {task.completedAt && (
                <div>
                  <Label className="text-muted-foreground">Completed</Label>
                  <p>{formatTimestamp(task.completedAt)}</p>
                </div>
              )}
            </div>

            {/* Notes Section */}
            {task.notes && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <Card className="p-4 mt-2">
                    <p className="whitespace-pre-wrap">{task.notes}</p>
                  </Card>
                </div>
              </>
            )}

            {/* Tags Section */}
            {task.tags && task.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Actions Section */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => setMode('edit')}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant={task.status === 'completed' ? 'outline' : 'default'}
                onClick={handleToggleDone}
                disabled={toggleDoneMutation.isPending}
              >
                {task.status === 'completed' ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Completed
                  </>
                )}
              </Button>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The task will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          // EDIT MODE
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Status, Priority, Type - Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'todo'}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value === 'none' ? null : (value as any) })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="P0">P0</SelectItem>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                    <SelectItem value="P3">P3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value === 'none' ? null : (value as any) })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="deep_work">Deep Work</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Select
                value={formData.domain || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, domain: value === 'none' ? null : (value as any) })
                }
              >
                <SelectTrigger id="domain">
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="play">Play</SelectItem>
                  <SelectItem value="calls">Calls</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Venture and Project */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Venture */}
              <div className="space-y-2">
                <Label htmlFor="venture">Venture</Label>
                <Select
                  value={formData.ventureId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, ventureId: value === 'none' ? null : value })
                  }
                >
                  <SelectTrigger id="venture">
                    <SelectValue placeholder="Select venture" />
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

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.projectId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value === 'none' ? null : value })
                  }
                  disabled={!formData.ventureId}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
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

            {/* Phase */}
            {formData.projectId && (
              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Select
                  value={formData.phaseId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, phaseId: value === 'none' ? null : value })
                  }
                >
                  <SelectTrigger id="phase">
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Due Date and Focus Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? formatDate(formData.dueDate) : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          dueDate: date ? date.toISOString().split('T')[0] : null,
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Focus Date */}
              <div className="space-y-2">
                <Label>Focus Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.focusDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.focusDate ? formatDate(formData.focusDate) : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.focusDate ? new Date(formData.focusDate) : undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          focusDate: date ? date.toISOString().split('T')[0] : null,
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Focus Slot */}
            <div className="space-y-2">
              <Label htmlFor="focusSlot">Focus Slot</Label>
              <Select
                value={formData.focusSlot || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, focusSlot: value === 'none' ? null : (value as any) })
                }
              >
                <SelectTrigger id="focusSlot">
                  <SelectValue placeholder="Select focus slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="morning_routine">Morning Routine (7-9am)</SelectItem>
                  <SelectItem value="deep_work_1">Deep Work 1 (9-11am)</SelectItem>
                  <SelectItem value="admin_block">Admin Block (11am-12pm)</SelectItem>
                  <SelectItem value="lunch">Lunch (12-1pm)</SelectItem>
                  <SelectItem value="gym">Gym / Workout (1-3pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (3-11pm)</SelectItem>
                  <SelectItem value="evening_review">Evening Review (11pm-12am)</SelectItem>
                  <SelectItem value="meetings">Meetings (Flexible)</SelectItem>
                  <SelectItem value="buffer">Buffer (Flexible)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Effort */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estimated Effort */}
              <div className="space-y-2">
                <Label htmlFor="estEffort">Estimated Effort (hours)</Label>
                <Input
                  id="estEffort"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estEffort ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estEffort: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="e.g., 2.5"
                />
              </div>

              {/* Actual Effort */}
              <div className="space-y-2">
                <Label htmlFor="actualEffort">Actual Effort (hours)</Label>
                <Input
                  id="actualEffort"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.actualEffort ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actualEffort: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="e.g., 3"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                placeholder="Additional details, context, or thoughts..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
