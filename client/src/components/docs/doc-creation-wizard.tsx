import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  FileText,
  Check,
  Loader2 
} from "lucide-react";
import { StructuredFieldsForm } from "./structured-fields-form";
import {
  DOC_TEMPLATES,
  getRequiredFieldsForType,
  type DocTemplateConfig,
} from "@/lib/doc-templates";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DocCreationWizardProps {
  ventureId?: number;
  projectId?: number;
  parentId?: number;
  onSuccess: (doc: any) => void;
  onCancel: () => void;
}

interface DocFormData {
  title: string;
  type: string;
  domain: string;
  ventureId?: number;
  projectId?: number;
  templateId?: string;
  summary: string;
  keyPoints: string[];
  applicableWhen: string;
  prerequisites: string[];
  owner: string;
  relatedDocs: string[];
  body: string;
}

const STEPS = [
  { id: 'type', label: 'Type & Template', description: 'Choose document type' },
  { id: 'fields', label: 'Metadata', description: 'Add structured fields' },
  { id: 'content', label: 'Content', description: 'Write your document' },
  { id: 'review', label: 'Review', description: 'Check quality and publish' },
];

const DOC_TYPES = [
  { value: 'sop', label: 'SOP (Standard Operating Procedure)' },
  { value: 'playbook', label: 'Playbook' },
  { value: 'spec', label: 'Specification' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'process', label: 'Process' },
  { value: 'research', label: 'Research' },
  { value: 'tech_doc', label: 'Technical Doc' },
  { value: 'meeting_notes', label: 'Meeting Notes' },
  { value: 'reference', label: 'Reference' },
  { value: 'page', label: 'Page (General)' },
];

const DOC_DOMAINS = [
  { value: 'venture_ops', label: 'Venture Ops' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'product', label: 'Product' },
  { value: 'sales', label: 'Sales' },
  { value: 'tech', label: 'Tech' },
  { value: 'trading', label: 'Trading' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'hr', label: 'HR' },
  { value: 'personal', label: 'Personal' },
];

export function DocCreationWizard({
  ventureId: initialVentureId,
  projectId: initialProjectId,
  parentId,
  onSuccess,
  onCancel,
}: DocCreationWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<DocFormData>({
    title: '',
    type: 'sop',
    domain: 'venture_ops',
    ventureId: initialVentureId,
    projectId: initialProjectId,
    templateId: undefined,
    summary: '',
    keyPoints: [],
    applicableWhen: '',
    prerequisites: [],
    owner: '',
    relatedDocs: [],
    body: '',
  });

  // Fetch ventures for dropdown
  const { data: ventures = [] } = useQuery({
    queryKey: ["ventures"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ventures");
      return response.json();
    },
  });

  // Fetch projects filtered by venture
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", formData.ventureId],
    queryFn: async () => {
      if (!formData.ventureId) return [];
      const response = await apiRequest("GET", `/api/projects?ventureId=${formData.ventureId}`);
      return response.json();
    },
    enabled: !!formData.ventureId,
  });

  // Create doc mutation
  const createDoc = useMutation({
    mutationFn: async (data: DocFormData & { status: string }) => {
      const response = await apiRequest("POST", "/api/docs", {
        title: data.title,
        type: data.type,
        domain: data.domain,
        ventureId: data.ventureId || null,
        projectId: data.projectId || null,
        parentId: parentId || null,
        summary: data.summary || null,
        keyPoints: data.keyPoints,
        applicableWhen: data.applicableWhen || null,
        prerequisites: data.prerequisites,
        owner: data.owner || null,
        relatedDocs: data.relatedDocs,
        body: data.body,
        status: data.status,
      });
      return response.json();
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast({ title: "Document created", description: `"${doc.title}" has been created.` });
      onSuccess(doc);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create document.", 
        variant: "destructive" 
      });
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyTemplate = (templateId: string) => {
    const template = DOC_TEMPLATES.find((t: DocTemplateConfig) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        templateId,
        type: template.defaultType || prev.type,
        domain: template.defaultDomain || prev.domain,
        body: template.body,
        title: prev.title || template.name,
      }));
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.title.trim().length > 0 && formData.type;
      case 1:
        const required = getRequiredFieldsForType(formData.type);
        if (required.includes('summary') && !formData.summary.trim()) return false;
        if (required.includes('keyPoints') && formData.keyPoints.length < 3) return false;
        return true;
      case 2:
        return formData.body.trim().length > 100;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    createDoc.mutate({ ...formData, status: 'draft' });
  };

  const handlePublish = () => {
    createDoc.mutate({ ...formData, status: 'active' });
  };

  const requiredFields = getRequiredFieldsForType(formData.type);

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Step indicator */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                index < currentStep
                  ? "bg-primary text-primary-foreground"
                  : index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {index < STEPS.length - 1 && (
              <div className="hidden sm:block w-12 h-px bg-border mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Step 1: Type & Template */}
        {currentStep === 0 && (
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enter document title..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => updateField('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Domain</Label>
                <Select
                  value={formData.domain}
                  onValueChange={(value) => updateField('domain', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_DOMAINS.map((domain) => (
                      <SelectItem key={domain.value} value={domain.value}>
                        {domain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Venture (Optional)</Label>
                <Select
                  value={formData.ventureId ? String(formData.ventureId) : "none"}
                  onValueChange={(value) => updateField('ventureId', value === "none" ? undefined : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select venture..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {ventures.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project (Optional)</Label>
                <Select
                  value={formData.projectId ? String(formData.projectId) : "none"}
                  onValueChange={(value) => updateField('projectId', value === "none" ? undefined : Number(value))}
                  disabled={!formData.ventureId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template selection */}
            <div className="space-y-2">
              <Label>Start from Template (Optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                {DOC_TEMPLATES.slice(0, 12).map((template: DocTemplateConfig) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={cn(
                      "p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors",
                      formData.templateId === template.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{template.icon}</span>
                      <span className="text-sm font-medium">{template.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Structured Fields */}
        {currentStep === 1 && (
          <div className="max-w-2xl">
            <div className="mb-4">
              <Badge variant="outline">
                Required for {formData.type}: {requiredFields.join(', ')}
              </Badge>
            </div>
            <StructuredFieldsForm
              summary={formData.summary}
              keyPoints={formData.keyPoints}
              applicableWhen={formData.applicableWhen}
              prerequisites={formData.prerequisites}
              owner={formData.owner}
              relatedDocs={formData.relatedDocs}
              content={formData.body || formData.title}
              docType={formData.type}
              docDomain={formData.domain}
              ventureId={formData.ventureId}
              onChange={updateField}
              requiredFields={requiredFields}
            />
          </div>
        )}

        {/* Step 3: Content */}
        {currentStep === 2 && (
          <div className="max-w-4xl">
            <div className="space-y-2">
              <Label htmlFor="content">Document Content *</Label>
              <Textarea
                id="content"
                value={formData.body}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Write your document content here... (Markdown supported)"
                className="min-h-[400px] font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 100 characters. Markdown formatting is supported.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {formData.title}
                </CardTitle>
                <CardDescription>
                  {formData.type} • {formData.domain}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.summary && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Summary</Label>
                    <p className="text-sm">{formData.summary}</p>
                  </div>
                )}
                {formData.keyPoints.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Key Points</Label>
                    <ul className="text-sm list-disc list-inside">
                      {formData.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {formData.applicableWhen && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Applicable When</Label>
                    <p className="text-sm">{formData.applicableWhen}</p>
                  </div>
                )}
                {formData.owner && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Owner</Label>
                    <p className="text-sm">{formData.owner}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quality preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quality Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {formData.summary.length > 50 ? <Check className="h-4 w-4 text-green-600" /> : <span className="h-4 w-4 text-red-400">✗</span>}
                    <span>Summary ({formData.summary.length} chars)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.keyPoints.length >= 3 ? <Check className="h-4 w-4 text-green-600" /> : <span className="h-4 w-4 text-red-400">✗</span>}
                    <span>Key Points ({formData.keyPoints.length}/3+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.body.length > 500 ? <Check className="h-4 w-4 text-green-600" /> : <span className="h-4 w-4 text-red-400">✗</span>}
                    <span>Content ({formData.body.length} chars)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.owner ? <Check className="h-4 w-4 text-green-600" /> : <span className="h-4 w-4 text-muted-foreground">○</span>}
                    <span>Owner {formData.owner ? '✓' : '(optional)'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer with navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
        <Button
          type="button"
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex gap-2">
          {currentStep === STEPS.length - 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={createDoc.isPending}
              >
                {createDoc.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={createDoc.isPending}
              >
                {createDoc.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Publish
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
