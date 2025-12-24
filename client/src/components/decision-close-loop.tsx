/**
 * DecisionCloseLoop - Component for recording decision outcomes
 * Used in Evening Review to close the loop on past decisions
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react';

interface DecisionMemory {
  id: string;
  context: string;
  decision: string;
  reasoning: string | null;
  tags: string[] | null;
  followUpAt: string | null;
  outcome: string | null;
  outcomeNotes: string | null;
  outcomeRecordedAt: string | null;
  createdAt: string;
  derived: {
    canonicalSummary?: string;
    archetype?: string;
    riskLevel?: string;
    reversibility?: string;
  } | null;
}

interface DecisionCloseLoopProps {
  decision: DecisionMemory;
  type: 'due' | 'early-check';
  onClosed?: () => void;
}

const OUTCOME_OPTIONS = [
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-green-500' },
  { value: 'mixed', label: 'Mixed', icon: AlertCircle, color: 'text-yellow-500' },
  { value: 'failure', label: 'Failure', icon: XCircle, color: 'text-red-500' },
  { value: 'unknown', label: 'Too early to tell', icon: HelpCircle, color: 'text-gray-500' },
];

export default function DecisionCloseLoop({ decision, type, onClosed }: DecisionCloseLoopProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [outcome, setOutcome] = useState<string>('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeLoopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/decision-memories/${decision.id}/close`, {
        outcome,
        outcomeNotes: outcomeNotes.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/decision-memories'] });
      toast({
        title: 'Loop closed',
        description: 'Decision outcome recorded. Learning from this.',
      });
      onClosed?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to close loop',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!outcome) {
      toast({
        title: 'Select an outcome',
        description: 'How did this decision turn out?',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    closeLoopMutation.mutate(undefined, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const daysAgo = Math.floor(
    (new Date().getTime() - new Date(decision.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="border-l-4 border-l-primary/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate">
                {decision.derived?.canonicalSummary || decision.decision}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3" />
                {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                {type === 'early-check' && (
                  <Badge variant="outline" className="text-xs">Early check</Badge>
                )}
                {type === 'due' && (
                  <Badge variant="secondary" className="text-xs">Due</Badge>
                )}
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Context reminder */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">Context:</p>
              <p>{decision.context}</p>
              {decision.reasoning && (
                <>
                  <p className="font-medium mt-2 mb-1">Reasoning:</p>
                  <p>{decision.reasoning}</p>
                </>
              )}
            </div>

            {/* Tags and metadata */}
            <div className="flex flex-wrap gap-2">
              {decision.derived?.archetype && (
                <Badge variant="outline">{decision.derived.archetype}</Badge>
              )}
              {decision.derived?.riskLevel && (
                <Badge variant="outline">Risk: {decision.derived.riskLevel}</Badge>
              )}
              {decision.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            {/* Outcome selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">How did it turn out?</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = outcome === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      className={`justify-start ${isSelected ? '' : option.color}`}
                      onClick={() => setOutcome(option.value)}
                    >
                      <Icon className={`w-4 h-4 mr-2 ${isSelected ? '' : option.color}`} />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Outcome notes */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                What did you learn? (optional)
              </label>
              <Textarea
                placeholder="Key lessons, what you'd do differently..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                Skip for now
              </Button>
              <Button
                size="sm"
                disabled={!outcome || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Close the Loop'
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>

        {/* Collapsed preview with quick action */}
        {!isExpanded && (
          <CardContent className="pt-0 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {OUTCOME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${option.color}`}
                      onClick={() => {
                        setOutcome(option.value);
                        setIsExpanded(true);
                      }}
                      title={option.label}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                Quick: select outcome
              </span>
            </div>
          </CardContent>
        )}
      </Collapsible>
    </Card>
  );
}

/**
 * DecisionsDueSection - Container for showing due decisions in Evening Review
 */
interface DecisionsDueSectionProps {
  dueDecisions: DecisionMemory[];
  earlyCheckDecisions: DecisionMemory[];
  onDecisionClosed?: () => void;
}

export function DecisionsDueSection({
  dueDecisions,
  earlyCheckDecisions,
  onDecisionClosed,
}: DecisionsDueSectionProps) {
  const totalCount = dueDecisions.length + earlyCheckDecisions.length;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Decisions to Close</h3>
        <Badge variant="secondary">{totalCount}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Close the loop on past decisions to learn from outcomes.
      </p>

      <div className="space-y-3">
        {dueDecisions.map((decision) => (
          <DecisionCloseLoop
            key={decision.id}
            decision={decision}
            type="due"
            onClosed={onDecisionClosed}
          />
        ))}
        {earlyCheckDecisions.map((decision) => (
          <DecisionCloseLoop
            key={decision.id}
            decision={decision}
            type="early-check"
            onClosed={onDecisionClosed}
          />
        ))}
      </div>
    </div>
  );
}
