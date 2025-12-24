/**
 * DecisionQuickCapture - Fast decision logging component
 * Design principle: Capture in under 15 seconds
 */
import { useEffect, useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDecisionModal, DecisionPrefill } from '@/lib/decision-modal-store';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Calendar, Tag } from 'lucide-react';

interface DecisionFormData {
  context: string;
  decision: string;
  reasoning: string;
  tags: string[];
  followUpAt: Date | null;
  source: 'evening' | 'weekly' | 'capture' | 'ai_chat' | 'manual';
}

// Follow-up presets (opinionated, with 1 week as default)
const FOLLOW_UP_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7, default: true },
  { label: '1 month', days: 30 },
];

export default function DecisionQuickCapture() {
  const { isOpen, closeDecisionModal, prefill } = useDecisionModal();
  const queryClient = useQueryClient();
  const contextInputRef = useRef<HTMLTextAreaElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<DecisionFormData>({
    context: '',
    decision: '',
    reasoning: '',
    tags: [],
    followUpAt: null,
    source: 'manual',
  });

  // Set default follow-up to 1 week
  useEffect(() => {
    if (isOpen && !formData.followUpAt) {
      const oneWeek = new Date();
      oneWeek.setDate(oneWeek.getDate() + 7);
      setFormData(prev => ({ ...prev, followUpAt: oneWeek }));
    }
  }, [isOpen]);

  // Apply prefill when modal opens
  useEffect(() => {
    if (isOpen && prefill) {
      setFormData(prev => ({
        ...prev,
        context: prefill.context || '',
        decision: prefill.decision || '',
        reasoning: prefill.reasoning || '',
        source: prefill.source || 'manual',
        tags: prefill.tags || [],
      }));
    }
  }, [isOpen, prefill]);

  // Auto-focus on context input when modal opens
  useEffect(() => {
    if (isOpen && contextInputRef.current) {
      setTimeout(() => {
        contextInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Create decision mutation
  const createDecisionMutation = useMutation({
    mutationFn: async (data: DecisionFormData) => {
      const response = await apiRequest('POST', '/api/decision-memories', {
        context: data.context,
        decision: data.decision,
        reasoning: data.reasoning || undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        followUpAt: data.followUpAt?.toISOString() || undefined,
        source: data.source,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decision-memories'] });
      resetForm();
      closeDecisionModal();
      toast({
        title: 'Decision logged',
        description: 'Follow-up reminder set. Close the loop later.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to log decision',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate() + 7);
    setFormData({
      context: '',
      decision: '',
      reasoning: '',
      tags: [],
      followUpAt: oneWeek,
      source: 'manual',
    });
    setTagInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.context.trim()) {
      toast({
        title: 'Context required',
        description: 'What situation were you facing?',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.decision.trim()) {
      toast({
        title: 'Decision required',
        description: 'What did you decide?',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    createDecisionMutation.mutate(formData, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  const handleFollowUpPreset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFormData(prev => ({ ...prev, followUpAt: date }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeDecisionModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Log Decision
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          </DialogTitle>
          <DialogDescription>
            Capture in under 15 seconds. AI will derive patterns later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Context - What situation were you facing? */}
          <div className="space-y-2">
            <Label htmlFor="context" className="text-sm font-medium">
              What situation were you facing?
            </Label>
            <Textarea
              ref={contextInputRef}
              id="context"
              placeholder="e.g., Needed to decide between two vendors for the project..."
              value={formData.context}
              onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
              className="min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          {/* Decision - What did you choose? */}
          <div className="space-y-2">
            <Label htmlFor="decision" className="text-sm font-medium">
              What did you decide?
            </Label>
            <Input
              id="decision"
              placeholder="e.g., Going with Vendor A because of better support"
              value={formData.decision}
              onChange={(e) => setFormData(prev => ({ ...prev, decision: e.target.value }))}
            />
          </div>

          {/* Reasoning - Optional */}
          <div className="space-y-2">
            <Label htmlFor="reasoning" className="text-sm text-muted-foreground">
              Why? (optional)
            </Label>
            <Textarea
              id="reasoning"
              placeholder="Brief reasoning... AI will extract principles"
              value={formData.reasoning}
              onChange={(e) => setFormData(prev => ({ ...prev, reasoning: e.target.value }))}
              className="min-h-[40px] resize-none"
              rows={2}
            />
          </div>

          {/* Follow-up presets */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Check back in
            </Label>
            <div className="flex flex-wrap gap-2">
              {FOLLOW_UP_PRESETS.map((preset) => {
                const presetDate = new Date();
                presetDate.setDate(presetDate.getDate() + preset.days);
                const isSelected = formData.followUpAt &&
                  formData.followUpAt.toDateString() === presetDate.toDateString();

                return (
                  <Button
                    key={preset.days}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFollowUpPreset(preset.days)}
                    className={preset.default && !formData.followUpAt ? 'ring-2 ring-primary/20' : ''}
                  >
                    {preset.label}
                  </Button>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, followUpAt: null }))}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            </div>
          </div>

          {/* Tags - Optional */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <X
                      className="w-3 h-3 ml-1"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeDecisionModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Log Decision'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
