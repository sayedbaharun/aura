import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Trash2,
  Plus,
  GripVertical,
  Building2,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventureId?: string; // Optional - if not provided, can create new venture
  ventureName?: string;
}

interface ScaffoldingOptions {
  categories: Array<{ value: string; label: string }>;
  scopes: Array<{ value: string; label: string; description: string }>;
  ventureDomains: Array<{ value: string; label: string }>;
}

interface GeneratedTask {
  title: string;
  type: "business" | "deep_work" | "admin" | "learning";
  priority: "P0" | "P1" | "P2" | "P3";
  estEffort: number;
  notes?: string;
}

interface GeneratedPhase {
  name: string;
  order: number;
  notes?: string;
  tasks: GeneratedTask[];
}

interface GeneratedVenture {
  name: string;
  domain: string;
  oneLiner: string;
  primaryFocus: string;
  icon: string;
  color: string;
}

interface GeneratedProjectPlan {
  venture?: GeneratedVenture;
  project: {
    name: string;
    category: string;
    outcome: string;
    notes: string;
    priority: "P0" | "P1" | "P2" | "P3";
  };
  phases: GeneratedPhase[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  P1: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  P2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  P3: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ProjectWizard({
  open,
  onOpenChange,
  ventureId,
  ventureName,
}: ProjectWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"venture" | "intake" | "preview" | "commit">(
    ventureId ? "intake" : "venture"
  );
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedProjectPlan | null>(null);

  // Venture selection state
  const [ventureMode, setVentureMode] = useState<"existing" | "new">(
    ventureId ? "existing" : "new"
  );
  const [selectedVentureId, setSelectedVentureId] = useState(ventureId || "");

  // New venture state
  const [newVenture, setNewVenture] = useState({
    ventureName: "",
    ventureDomain: "saas" as string,
    ventureOneLiner: "",
  });

  // Intake form state
  const [intake, setIntake] = useState({
    projectName: "",
    projectCategory: "product",
    desiredOutcome: "",
    scope: "medium" as "small" | "medium" | "large",
    keyConstraints: "",
    domainContext: "",
  });

  // Commit options
  const [commitOptions, setCommitOptions] = useState({
    startDate: "",
    targetEndDate: "",
  });

  // Fetch scaffolding options
  const { data: options } = useQuery<ScaffoldingOptions>({
    queryKey: ["/api/project-scaffolding/options"],
    queryFn: async () => {
      const res = await fetch("/api/project-scaffolding/options", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch options");
      return res.json();
    },
  });

  // Fetch ventures for selection
  const { data: ventures = [] } = useQuery<Array<{ id: string; name: string; icon: string | null }>>({
    queryKey: ["/api/ventures"],
  });

  // Generate plan mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...intake,
      };

      if (ventureMode === "existing") {
        payload.ventureId = selectedVentureId || ventureId;
      } else {
        payload.newVenture = newVenture;
      }

      const res = await apiRequest("POST", "/api/project-scaffolding/generate", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate plan");
      }
      return res.json();
    },
    onSuccess: (plan: GeneratedProjectPlan) => {
      setGeneratedPlan(plan);
      setStep("preview");
      const ventureMsg = plan.venture ? ` and venture "${plan.venture.name}"` : "";
      toast({
        title: "Plan Generated",
        description: `Created ${plan.phases.length} phases with ${plan.phases.reduce((sum, p) => sum + p.tasks.length, 0)} tasks${ventureMsg}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Commit plan mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        plan: generatedPlan,
        ...commitOptions,
      };

      // Only include ventureId if using existing venture
      if (ventureMode === "existing") {
        payload.ventureId = selectedVentureId || ventureId;
      }

      const res = await apiRequest("POST", "/api/project-scaffolding/commit", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to commit plan");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ventures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      const ventureMsg = result.venture ? ` and venture "${result.venture.name}"` : "";
      toast({
        title: "Success!",
        description: `Created project with ${result.phases.length} phases and ${result.tasks.length} tasks${ventureMsg}`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep(ventureId ? "intake" : "venture");
    setGeneratedPlan(null);
    setVentureMode(ventureId ? "existing" : "new");
    setSelectedVentureId(ventureId || "");
    setNewVenture({
      ventureName: "",
      ventureDomain: "saas",
      ventureOneLiner: "",
    });
    setIntake({
      projectName: "",
      projectCategory: "product",
      desiredOutcome: "",
      scope: "medium",
      keyConstraints: "",
      domainContext: "",
    });
    setCommitOptions({ startDate: "", targetEndDate: "" });
    onOpenChange(false);
  };

  const handleVentureNext = () => {
    if (ventureMode === "existing" && !selectedVentureId) {
      toast({
        title: "Validation Error",
        description: "Please select a venture",
        variant: "destructive",
      });
      return;
    }
    if (ventureMode === "new") {
      if (!newVenture.ventureName.trim()) {
        toast({
          title: "Validation Error",
          description: "Venture name is required",
          variant: "destructive",
        });
        return;
      }
      if (!newVenture.ventureOneLiner.trim()) {
        toast({
          title: "Validation Error",
          description: "Venture description is required",
          variant: "destructive",
        });
        return;
      }
    }
    setStep("intake");
  };

  const handleGenerate = () => {
    if (!intake.projectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    if (!intake.desiredOutcome.trim()) {
      toast({
        title: "Validation Error",
        description: "Desired outcome is required",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  // Plan editing functions
  const updatePhase = (phaseIndex: number, updates: Partial<GeneratedPhase>) => {
    if (!generatedPlan) return;
    const newPhases = [...generatedPlan.phases];
    newPhases[phaseIndex] = { ...newPhases[phaseIndex], ...updates };
    setGeneratedPlan({ ...generatedPlan, phases: newPhases });
  };

  const deletePhase = (phaseIndex: number) => {
    if (!generatedPlan) return;
    const newPhases = generatedPlan.phases.filter((_, i) => i !== phaseIndex);
    newPhases.forEach((phase, i) => (phase.order = i + 1));
    setGeneratedPlan({ ...generatedPlan, phases: newPhases });
  };

  const updateTask = (
    phaseIndex: number,
    taskIndex: number,
    updates: Partial<GeneratedTask>
  ) => {
    if (!generatedPlan) return;
    const newPhases = [...generatedPlan.phases];
    const newTasks = [...newPhases[phaseIndex].tasks];
    newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
    newPhases[phaseIndex] = { ...newPhases[phaseIndex], tasks: newTasks };
    setGeneratedPlan({ ...generatedPlan, phases: newPhases });
  };

  const deleteTask = (phaseIndex: number, taskIndex: number) => {
    if (!generatedPlan) return;
    const newPhases = [...generatedPlan.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      tasks: newPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex),
    };
    setGeneratedPlan({ ...generatedPlan, phases: newPhases });
  };

  const addTask = (phaseIndex: number) => {
    if (!generatedPlan) return;
    const newPhases = [...generatedPlan.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      tasks: [
        ...newPhases[phaseIndex].tasks,
        {
          title: "New Task",
          type: "business",
          priority: "P2",
          estEffort: 1,
        },
      ],
    };
    setGeneratedPlan({ ...generatedPlan, phases: newPhases });
  };

  // Calculate totals
  const totalTasks = generatedPlan?.phases.reduce((sum, p) => sum + p.tasks.length, 0) || 0;
  const totalEffort =
    generatedPlan?.phases.reduce(
      (sum, p) => sum + p.tasks.reduce((s, t) => s + t.estEffort, 0),
      0
    ) || 0;

  // Determine steps based on whether ventureId was provided
  const steps = ventureId
    ? ["intake", "preview", "commit"]
    : ["venture", "intake", "preview", "commit"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Project Wizard
            {ventureName && ventureId && (
              <span className="text-muted-foreground font-normal">
                for {ventureName}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "venture" && "Choose an existing venture or create a new one"}
            {step === "intake" && "Describe your project and AI will generate a complete plan"}
            {step === "preview" && "Review and customize the generated plan"}
            {step === "commit" && "Set dates and create your project"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : currentStepIndex > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStepIndex > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    currentStepIndex > i ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {/* Step 0: Venture Selection (only if no ventureId provided) */}
          {step === "venture" && (
            <div className="space-y-6">
              <RadioGroup
                value={ventureMode}
                onValueChange={(v) => setVentureMode(v as "existing" | "new")}
                className="space-y-4"
              >
                {/* Existing Venture Option */}
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="existing" id="existing" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4" />
                      Use Existing Venture
                    </Label>
                    {ventureMode === "existing" && (
                      <div className="mt-3">
                        <Select
                          value={selectedVentureId}
                          onValueChange={setSelectedVentureId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a venture" />
                          </SelectTrigger>
                          <SelectContent>
                            {ventures.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.icon} {v.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* New Venture Option */}
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="new" id="new" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
                      <FolderPlus className="h-4 w-4" />
                      Create New Venture
                    </Label>
                    {ventureMode === "new" && (
                      <div className="mt-3 space-y-4">
                        <div>
                          <Label htmlFor="ventureName">Venture Name *</Label>
                          <Input
                            id="ventureName"
                            value={newVenture.ventureName}
                            onChange={(e) =>
                              setNewVenture({ ...newVenture, ventureName: e.target.value })
                            }
                            placeholder="e.g., MyStartup, Side Project, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="ventureDomain">Domain</Label>
                          <Select
                            value={newVenture.ventureDomain}
                            onValueChange={(v) =>
                              setNewVenture({ ...newVenture, ventureDomain: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {options?.ventureDomains.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="ventureOneLiner">Description *</Label>
                          <Textarea
                            id="ventureOneLiner"
                            value={newVenture.ventureOneLiner}
                            onChange={(e) =>
                              setNewVenture({ ...newVenture, ventureOneLiner: e.target.value })
                            }
                            placeholder="One sentence describing what this venture is about..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 1: Intake Form */}
          {step === "intake" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={intake.projectName}
                    onChange={(e) =>
                      setIntake({ ...intake, projectName: e.target.value })
                    }
                    placeholder="e.g., Launch Marketing Campaign, Build MVP, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="projectCategory">Category</Label>
                  <Select
                    value={intake.projectCategory}
                    onValueChange={(value) =>
                      setIntake({ ...intake, projectCategory: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options?.categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scope">Scope *</Label>
                  <Select
                    value={intake.scope}
                    onValueChange={(value: "small" | "medium" | "large") =>
                      setIntake({ ...intake, scope: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options?.scopes.map((scope) => (
                        <SelectItem key={scope.value} value={scope.value}>
                          <div className="flex flex-col">
                            <span>{scope.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {scope.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="desiredOutcome">Desired Outcome *</Label>
                  <Textarea
                    id="desiredOutcome"
                    value={intake.desiredOutcome}
                    onChange={(e) =>
                      setIntake({ ...intake, desiredOutcome: e.target.value })
                    }
                    placeholder="What does success look like? e.g., '10k MRR by Q2', 'MVP shipped to beta users', etc."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="keyConstraints">Key Constraints (optional)</Label>
                  <Textarea
                    id="keyConstraints"
                    value={intake.keyConstraints}
                    onChange={(e) =>
                      setIntake({ ...intake, keyConstraints: e.target.value })
                    }
                    placeholder="Budget limitations, deadlines, dependencies, etc."
                    rows={2}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="domainContext">Additional Context (optional)</Label>
                  <Textarea
                    id="domainContext"
                    value={intake.domainContext}
                    onChange={(e) =>
                      setIntake({ ...intake, domainContext: e.target.value })
                    }
                    placeholder="Tech stack, target audience, industry specifics, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview & Edit */}
          {step === "preview" && generatedPlan && (
            <div className="space-y-4">
              {/* Venture Summary (if creating new) */}
              {generatedPlan.venture && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{generatedPlan.venture.icon}</span>
                      <span>{generatedPlan.venture.name}</span>
                      <Badge variant="outline">New Venture</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {generatedPlan.venture.oneLiner}
                    </p>
                    <p className="text-sm">
                      <strong>Focus:</strong> {generatedPlan.venture.primaryFocus}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Project Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{generatedPlan.project.name}</span>
                    <Badge className={PRIORITY_COLORS[generatedPlan.project.priority]}>
                      {generatedPlan.project.priority}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Outcome:</strong> {generatedPlan.project.outcome}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Strategy:</strong> {generatedPlan.project.notes}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span>
                      <strong>{generatedPlan.phases.length}</strong> phases
                    </span>
                    <span>
                      <strong>{totalTasks}</strong> tasks
                    </span>
                    <span>
                      <strong>{totalEffort.toFixed(1)}</strong> hrs estimated
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Phases */}
              {generatedPlan.phases.map((phase, phaseIndex) => (
                <Card key={phaseIndex}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={phase.name}
                          onChange={(e) =>
                            updatePhase(phaseIndex, { name: e.target.value })
                          }
                          className="h-8 font-medium w-auto"
                        />
                        <Badge variant="outline">Phase {phase.order}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deletePhase(phaseIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {phase.notes && (
                      <p className="text-sm text-muted-foreground ml-6">
                        {phase.notes}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {phase.tasks.map((task, taskIndex) => (
                        <div
                          key={taskIndex}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                        >
                          <Input
                            value={task.title}
                            onChange={(e) =>
                              updateTask(phaseIndex, taskIndex, {
                                title: e.target.value,
                              })
                            }
                            className="h-8 flex-1"
                          />
                          <Select
                            value={task.type}
                            onValueChange={(value) =>
                              updateTask(phaseIndex, taskIndex, {
                                type: value as any,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deep_work">Deep Work</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="learning">Learning</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={task.priority}
                            onValueChange={(value) =>
                              updateTask(phaseIndex, taskIndex, {
                                priority: value as any,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="P0">P0</SelectItem>
                              <SelectItem value="P1">P1</SelectItem>
                              <SelectItem value="P2">P2</SelectItem>
                              <SelectItem value="P3">P3</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={task.estEffort}
                              onChange={(e) =>
                                updateTask(phaseIndex, taskIndex, {
                                  estEffort: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="h-8 w-16 text-center"
                              step="0.5"
                              min="0.5"
                            />
                            <span className="text-xs text-muted-foreground">hrs</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => deleteTask(phaseIndex, taskIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addTask(phaseIndex)}
                        className="w-full border-dashed border"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 3: Commit */}
          {step === "commit" && generatedPlan && (
            <div className="space-y-6">
              {/* Venture Summary (if creating new) */}
              {generatedPlan.venture && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{generatedPlan.venture.icon}</span>
                      New Venture: {generatedPlan.venture.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {generatedPlan.venture.oneLiner}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Project Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Project</Label>
                      <p className="font-medium">{generatedPlan.project.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Priority</Label>
                      <Badge className={PRIORITY_COLORS[generatedPlan.project.priority]}>
                        {generatedPlan.project.priority}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phases</Label>
                      <p className="font-medium">{generatedPlan.phases.length}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Tasks</Label>
                      <p className="font-medium">{totalTasks}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estimated Effort</Label>
                      <p className="font-medium">{totalEffort.toFixed(1)} hours</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Outcome</Label>
                      <p className="font-medium">{generatedPlan.project.outcome}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Set Dates (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={commitOptions.startDate}
                        onChange={(e) =>
                          setCommitOptions({
                            ...commitOptions,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="targetEndDate">Target End Date</Label>
                      <Input
                        id="targetEndDate"
                        type="date"
                        value={commitOptions.targetEndDate}
                        onChange={(e) =>
                          setCommitOptions({
                            ...commitOptions,
                            targetEndDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can set or adjust dates later. Tasks will be created with
                    status "idea" so you can promote them to "next" when ready.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (step === "venture") handleClose();
              else if (step === "intake") setStep(ventureId ? "intake" : "venture");
              else if (step === "preview") setStep("intake");
              else if (step === "commit") setStep("preview");
              if (step === "intake" && ventureId) handleClose();
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {(step === "venture" || (step === "intake" && ventureId)) ? "Cancel" : "Back"}
          </Button>

          {step === "venture" && (
            <Button onClick={handleVentureNext}>
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === "intake" && (
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          )}

          {step === "preview" && (
            <Button onClick={() => setStep("commit")}>
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === "commit" && (
            <Button onClick={() => commitMutation.mutate()} disabled={commitMutation.isPending}>
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {generatedPlan?.venture ? "Create Venture & Project" : "Create Project"}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
