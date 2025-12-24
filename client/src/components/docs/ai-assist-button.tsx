import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Check, X, RefreshCw, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AiAssistButtonProps {
  field: 'summary' | 'keyPoints' | 'applicableWhen';
  content: string;
  docType: string;
  docDomain?: string;
  ventureId?: number;
  currentValue?: string;
  onSuggestion: (suggestion: string) => void;
  onFeedback?: (feedback: FeedbackData) => void;
  disabled?: boolean;
}

interface FeedbackData {
  field: string;
  aiSuggestion: string;
  userAction: 'accepted' | 'edited' | 'rejected' | 'regenerated';
  userFinal?: string;
  aiModel: string;
  aiPromptHash: string;
}

export function AiAssistButton({
  field,
  content,
  docType,
  docDomain,
  ventureId,
  currentValue,
  onSuggestion,
  onFeedback,
  disabled = false,
}: AiAssistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [aiMeta, setAiMeta] = useState<{ model: string; promptHash: string } | null>(null);
  const startTimeRef = useRef<number>(0);

  const generateSuggestion = async () => {
    setIsLoading(true);
    startTimeRef.current = Date.now();

    try {
      const response = await apiRequest('POST', '/api/docs/ai/generate-field', {
        content,
        field,
        docType,
        docDomain,
        ventureId,
      });

      const data = await response.json();
      setSuggestion(data.suggestion);
      setEditedValue(data.suggestion);
      setAiMeta({ model: data.model, promptHash: data.promptHash });
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
      // Could show toast here
    } finally {
      setIsLoading(false);
    }
  };

  const recordFeedback = async (
    action: 'accepted' | 'edited' | 'rejected' | 'regenerated',
    finalValue?: string
  ) => {
    if (!aiMeta || !suggestion) return;

    const timeToDecide = Math.round((Date.now() - startTimeRef.current) / 1000);

    const feedbackData = {
      fieldName: field,
      aiSuggestion: suggestion,
      userAction: action,
      userFinal: finalValue,
      aiModel: aiMeta.model,
      aiPromptHash: aiMeta.promptHash,
      docType,
      docDomain,
      ventureId,
      timeToDecide,
    };

    try {
      await apiRequest('POST', '/api/docs/ai/feedback', feedbackData);
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }

    onFeedback?.({
      field,
      aiSuggestion: suggestion,
      userAction: action,
      userFinal: finalValue,
      aiModel: aiMeta.model,
      aiPromptHash: aiMeta.promptHash,
    });
  };

  const handleAccept = () => {
    if (suggestion) {
      onSuggestion(suggestion);
      recordFeedback('accepted', suggestion);
      setIsOpen(false);
      setSuggestion(null);
    }
  };

  const handleApplyEdited = () => {
    onSuggestion(editedValue);
    recordFeedback('edited', editedValue);
    setIsOpen(false);
    setSuggestion(null);
  };

  const handleReject = () => {
    recordFeedback('rejected');
    setIsOpen(false);
    setSuggestion(null);
  };

  const handleRegenerate = async () => {
    recordFeedback('regenerated');
    await generateSuggestion();
  };

  const isEdited = editedValue !== suggestion;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={generateSuggestion}
          disabled={disabled || isLoading || !content}
          className="h-7 px-2 text-xs"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Generate
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Suggestion</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isLoading}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <Textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder="AI suggestion will appear here..."
          />

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReject}
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={isEdited ? handleApplyEdited : handleAccept}
            >
              <Check className="h-3 w-3 mr-1" />
              {isEdited ? 'Apply Edited' : 'Accept'}
            </Button>
          </div>

          {isEdited && (
            <p className="text-xs text-muted-foreground">
              You've edited the suggestion. Click "Apply Edited" to use your version.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
