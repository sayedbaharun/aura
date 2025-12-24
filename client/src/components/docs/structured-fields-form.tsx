import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { AiAssistButton } from "./ai-assist-button";
import { DocRelationships } from "./doc-relationships";
import { QualityIndicator } from "./quality-indicator";
import { cn } from "@/lib/utils";

interface StructuredFieldsFormProps {
  // Current values
  summary: string;
  keyPoints: string[];
  applicableWhen: string;
  prerequisites: string[];
  owner: string;
  relatedDocs: string[];

  // For AI context
  content: string;  // Doc content for AI to analyze
  docType: string;
  docDomain?: string;
  ventureId?: number;  // Venture ID (number for database, converted to string for URL params)
  docId?: string;  // For quality indicator and relationships

  // Callbacks
  onChange: (field: string, value: any) => void;

  // Optional
  requiredFields?: string[];  // Which fields are required for this doc type
  disabled?: boolean;
}

export function StructuredFieldsForm({
  summary,
  keyPoints,
  applicableWhen,
  prerequisites,
  owner,
  relatedDocs,
  content,
  docType,
  docDomain,
  ventureId,
  docId,
  onChange,
  requiredFields = ['summary', 'keyPoints'],
  disabled = false,
}: StructuredFieldsFormProps) {
  const [newKeyPoint, setNewKeyPoint] = useState("");

  const isRequired = (field: string) => requiredFields.includes(field);

  const handleAddKeyPoint = () => {
    if (!newKeyPoint.trim()) return;
    onChange('keyPoints', [...keyPoints, newKeyPoint.trim()]);
    setNewKeyPoint("");
  };

  const handleRemoveKeyPoint = (index: number) => {
    onChange('keyPoints', keyPoints.filter((_, i) => i !== index));
  };

  const handleKeyPointKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyPoint();
    }
  };

  return (
    <div className="space-y-6">
      {/* Quality Indicator at top if docId exists */}
      {docId && (
        <div className="pb-4 border-b">
          <QualityIndicator docId={docId} showBreakdown />
        </div>
      )}

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="summary" className="flex items-center gap-1">
            Summary
            {isRequired('summary') && <span className="text-red-500">*</span>}
          </Label>
          <AiAssistButton
            field="summary"
            content={content}
            docType={docType}
            docDomain={docDomain}
            ventureId={ventureId}
            currentValue={summary}
            onSuggestion={(value) => onChange('summary', value)}
            disabled={disabled || !content}
          />
        </div>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => onChange('summary', e.target.value)}
          placeholder="1-3 sentences describing what this document is about..."
          className="min-h-[80px]"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          A brief description for AI retrieval and quick reference.
        </p>
      </div>

      {/* Key Points */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1">
            Key Points
            {isRequired('keyPoints') && <span className="text-red-500">*</span>}
            <Badge variant="outline" className="ml-2 text-xs">
              {keyPoints.length}/5
            </Badge>
          </Label>
          <AiAssistButton
            field="keyPoints"
            content={content}
            docType={docType}
            docDomain={docDomain}
            ventureId={ventureId}
            onSuggestion={(value) => {
              // Parse JSON array from AI
              try {
                const points = JSON.parse(value);
                if (Array.isArray(points)) {
                  onChange('keyPoints', points.slice(0, 5));
                }
              } catch {
                // If not valid JSON, split by newlines
                const points = value.split('\n').filter(Boolean).slice(0, 5);
                onChange('keyPoints', points);
              }
            }}
            disabled={disabled || !content}
          />
        </div>

        {/* Existing key points */}
        {keyPoints.length > 0 && (
          <div className="space-y-2">
            {keyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-2 bg-muted/50 rounded-md p-2">
                <span className="text-sm flex-1">{point}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyPoint(index)}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new key point */}
        {keyPoints.length < 5 && (
          <div className="flex gap-2">
            <Input
              value={newKeyPoint}
              onChange={(e) => setNewKeyPoint(e.target.value)}
              onKeyDown={handleKeyPointKeyDown}
              placeholder="Add a key point..."
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddKeyPoint}
              disabled={disabled || !newKeyPoint.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          3-5 key insights or takeaways from this document.
        </p>
      </div>

      {/* Applicable When */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="applicableWhen" className="flex items-center gap-1">
            Applicable When
            {isRequired('applicableWhen') && <span className="text-red-500">*</span>}
          </Label>
          <AiAssistButton
            field="applicableWhen"
            content={content}
            docType={docType}
            docDomain={docDomain}
            ventureId={ventureId}
            currentValue={applicableWhen}
            onSuggestion={(value) => onChange('applicableWhen', value)}
            disabled={disabled || !content}
          />
        </div>
        <Textarea
          id="applicableWhen"
          value={applicableWhen}
          onChange={(e) => onChange('applicableWhen', e.target.value)}
          placeholder="Describe when and in what situations this document should be used..."
          className="min-h-[60px]"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Context for when someone should reference this document.
        </p>
      </div>

      {/* Owner */}
      <div className="space-y-2">
        <Label htmlFor="owner" className="flex items-center gap-1">
          Owner
          {isRequired('owner') && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="owner"
          value={owner}
          onChange={(e) => onChange('owner', e.target.value)}
          placeholder="Who maintains this document?"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Person responsible for keeping this document up to date.
        </p>
      </div>

      {/* Prerequisites */}
      <DocRelationships
        type="prerequisites"
        selectedIds={prerequisites}
        onChange={(ids) => onChange('prerequisites', ids)}
        ventureId={ventureId?.toString()}
        excludeIds={docId ? [docId] : []}
        maxItems={5}
      />

      {/* Related Docs */}
      <DocRelationships
        type="relatedDocs"
        selectedIds={relatedDocs}
        onChange={(ids) => onChange('relatedDocs', ids)}
        ventureId={ventureId?.toString()}
        excludeIds={docId ? [docId] : []}
        maxItems={10}
      />
    </div>
  );
}
