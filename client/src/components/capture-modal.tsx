import { useEffect, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCaptureModal } from '@/lib/capture-modal-store';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface CaptureFormData {
  title: string;
  type: 'idea' | 'task' | 'note' | 'link' | 'question';
  source: 'brain' | 'whatsapp' | 'email' | 'meeting' | 'web';
  domain: 'work' | 'health' | 'finance' | 'learning' | 'personal';
  ventureId: string | null;
  projectId: string | null;
  notes: string;
}

export default function CaptureModal() {
  const { isOpen, closeCaptureModal } = useCaptureModal();
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CaptureFormData>({
    title: '',
    type: 'idea',
    source: 'brain',
    domain: 'work',
    ventureId: null,
    projectId: null,
    notes: '',
  });

  // Fetch ventures for dropdown
  const { data: ventures } = useQuery<any[]>({
    queryKey: ['/api/ventures'],
    enabled: isOpen,
  });

  // Fetch projects filtered by venture
  const { data: projects } = useQuery<any[]>({
    queryKey: ['/api/projects', formData.ventureId],
    queryFn: async () => {
      if (!formData.ventureId) return [];
      const response = await apiRequest('GET', `/api/projects?venture_id=${formData.ventureId}`);
      return response.json();
    },
    enabled: !!formData.ventureId && isOpen,
  });

  // Submit capture mutation
  const createCaptureMutation = useMutation({
    mutationFn: async (data: CaptureFormData) => {
      const response = await apiRequest('POST', '/api/captures', {
        title: data.title,
        type: data.type,
        source: data.source,
        domain: data.domain,
        ventureId: data.ventureId,
        projectId: data.projectId,
        notes: data.notes || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      resetForm();
      closeCaptureModal();
      toast({
        title: 'Captured!',
        description: 'Your thought has been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to capture',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'idea',
      source: 'brain',
      domain: 'work',
      ventureId: null,
      projectId: null,
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your capture.',
        variant: 'destructive',
      });
      return;
    }
    createCaptureMutation.mutate(formData);
  };

  // Auto-focus on title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Note: Keyboard shortcut is handled in CaptureButton component

  // Reset venture when changing venture
  useEffect(() => {
    if (!formData.ventureId) {
      setFormData(prev => ({ ...prev, projectId: null }));
    }
  }, [formData.ventureId]);

  return (
    <Dialog open={isOpen} onOpenChange={closeCaptureModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Capture</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              ref={titleInputRef}
              id="title"
              placeholder="What's on your mind?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type">
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

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={formData.source}
              onValueChange={(value: any) => setFormData({ ...formData, source: value })}
            >
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brain">Brain</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Select
              value={formData.domain}
              onValueChange={(value: any) => setFormData({ ...formData, domain: value })}
            >
              <SelectTrigger id="domain">
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

          {/* Venture */}
          <div className="space-y-2">
            <Label htmlFor="venture">Venture (optional)</Label>
            <Select
              value={formData.ventureId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, ventureId: value === 'none' ? null : value })}
            >
              <SelectTrigger id="venture">
                <SelectValue placeholder="Select venture" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {ventures?.map((venture) => (
                  <SelectItem key={venture.id} value={venture.id}>
                    {venture.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          {formData.ventureId && (
            <div className="space-y-2">
              <Label htmlFor="project">Project (optional)</Label>
              <Select
                value={formData.projectId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, projectId: value === 'none' ? null : value })}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional context..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCaptureModal}
              disabled={createCaptureMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCaptureMutation.isPending}>
              {createCaptureMutation.isPending ? 'Capturing...' : 'Capture'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
