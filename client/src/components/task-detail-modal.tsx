import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTaskDetailModal } from '@/lib/task-detail-modal-store';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils';
import { CalendarIcon, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'idea' | 'next' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
  priority: 'P0' | 'P1' | 'P2' | 'P3' | null;
  type: 'business' | 'deep_work' | 'admin' | 'health' | 'learning' | 'personal' | null;
  domain: 'home' | 'work' | 'health' | 'finance' | 'travel' | 'learning' | 'play' | 'calls' | 'personal' | null;
  ventureId: string | null;
  projectId: string | null;
  milestoneId: string | null;
  dayId: string | null;
  dueDate: string | null;
  focusDate: string | null;
  focusSlot: 'morning_routine' | 'deep_work_1' | 'admin_block_1' | 'deep_work_2' | 'admin_block_2' | 'evening_review' | 'meetings' | 'buffer' | null;
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

interface Milestone {
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

  // Fetch milestones (filtered by project if selected)
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ['/api/milestones', formData.projectId],
    queryFn: async () => {
      if (!formData.projectId) return [];
      const response = await apiRequest('GET', `/api/milestones?project_id=${formData.projectId}`);
      return response.json();
    },
    enabled: !!formData.projectId && isOpen && mode === 'edit',
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, data);
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

  // Toggle done/reopen mutation
  const toggleDoneMutation = useMutation({
    mutationFn: async (newStatus: 'done' | 'next') => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, { status: newStatus });
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
      setFormData((prev) => ({ ...prev, projectId: null, milestoneId: null }));
    }
  }, [formData.ventureId, mode]);

  // Reset milestone when changing project in edit mode
  useEffect(() => {
    if (mode === 'edit' && !formData.projectId) {
      setFormData((prev) => ({ ...prev, milestoneId: null }));
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
          toggleDoneMutation.mutate(task.status === 'done' ? 'next' : 'done');
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
      toggleDoneMutation.mutate(task.status === 'done' ? 'next' : 'done');
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
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'next':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'idea':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
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

  const getMilestoneName = (milestoneId: string | null) => {
    if (!milestoneId) return null;
    const milestone = milestones.find((m) => m.id === milestoneId);
    return milestone?.name || null;
  };

  const formatFocusSlot = (slot: string | null) => {
    if (!slot) return null;
    const slotLabels: Record<string, string> = {
      morning_routine: 'Morning Routine (6-9am)',
      deep_work_1: 'Deep Work (9-11am)',
      admin_block_1: 'Admin Block (11am-12pm)',
      deep_work_2: 'Deep Work (2-4pm)',
      admin_block_2: 'Admin Block (4-5pm)',
      evening_review: 'Evening Review (5-6pm)',
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
              {getMilestoneName(task.milestoneId) && (
                <div>
                  <Label className="text-muted-foreground">Milestone</Label>
                  <p className="font-medium">{getMilestoneName(task.milestoneId)}</p>
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
                variant={task.status === 'done' ? 'outline' : 'default'}
                onClick={handleToggleDone}
                disabled={toggleDoneMutation.isPending}
              >
                {task.status === 'done' ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Done
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
                  value={formData.status || 'idea'}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="next">Next</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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

            {/* Milestone */}
            {formData.projectId && (
              <div className="space-y-2">
                <Label htmlFor="milestone">Milestone</Label>
                <Select
                  value={formData.milestoneId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, milestoneId: value === 'none' ? null : value })
                  }
                >
                  <SelectTrigger id="milestone">
                    <SelectValue placeholder="Select milestone" />
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
                  <SelectItem value="morning_routine">Morning Routine (6-9am)</SelectItem>
                  <SelectItem value="deep_work_1">Deep Work (9-11am)</SelectItem>
                  <SelectItem value="admin_block_1">Admin Block (11am-12pm)</SelectItem>
                  <SelectItem value="deep_work_2">Deep Work (2-4pm)</SelectItem>
                  <SelectItem value="admin_block_2">Admin Block (4-5pm)</SelectItem>
                  <SelectItem value="evening_review">Evening Review (5-6pm)</SelectItem>
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
