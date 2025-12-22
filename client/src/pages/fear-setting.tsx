import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Shield,
  Wrench,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Target,
  XCircle,
  Pause,
  HelpCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Fear {
  fear: string;
  severity: number;
}

interface Prevention {
  fearIndex: number;
  prevention: string;
  effort: number;
}

interface Repair {
  fearIndex: number;
  repair: string;
  reversibility: number;
}

interface Venture {
  id: string;
  name: string;
  icon: string | null;
}

interface Project {
  id: string;
  name: string;
  ventureId: string | null;
}

interface FearSetting {
  id: string;
  title: string;
  description: string | null;
  decisionType: string | null;
  ventureId: string | null;
  projectId: string | null;
  fears: Fear[] | null;
  preventions: Prevention[] | null;
  repairs: Repair[] | null;
  costSixMonths: string | null;
  costOneYear: string | null;
  costThreeYears: string | null;
  decision: string | null;
  decisionNotes: string | null;
  status: string;
}

const STEPS = [
  { id: 1, name: "Define", description: "What decision are you facing?", icon: Target },
  { id: 2, name: "Fears", description: "What could go wrong?", icon: AlertTriangle },
  { id: 3, name: "Prevent", description: "How to minimize each fear?", icon: Shield },
  { id: 4, name: "Repair", description: "How to recover if it happens?", icon: Wrench },
  { id: 5, name: "Inaction", description: "Cost of doing nothing?", icon: Clock },
  { id: 6, name: "Decide", description: "Make your decision", icon: CheckCircle2 },
];

export default function FearSettingPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [fearSettingId, setFearSettingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [decisionType, setDecisionType] = useState<string>("other");
  const [ventureId, setVentureId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [fears, setFears] = useState<Fear[]>([{ fear: "", severity: 5 }]);
  const [preventions, setPreventions] = useState<Prevention[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [costSixMonths, setCostSixMonths] = useState("");
  const [costOneYear, setCostOneYear] = useState("");
  const [costThreeYears, setCostThreeYears] = useState("");
  const [decision, setDecision] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState("");

  // Fetch ventures
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const activeVentures = Array.isArray(ventures) ? ventures.filter((v: any) => v.status !== "archived") : [];
  const filteredProjects = ventureId
    ? projects.filter((p) => p.ventureId === ventureId)
    : projects;

  // Fetch existing fear settings list
  const { data: fearSettingsList = [] } = useQuery<FearSetting[]>({
    queryKey: ["/api/fear-settings"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description: description || null,
        decisionType,
        ventureId: ventureId || null,
        projectId: projectId || null,
        fears: fears.filter((f) => f.fear.trim()),
        preventions,
        repairs,
        costSixMonths: costSixMonths || null,
        costOneYear: costOneYear || null,
        costThreeYears: costThreeYears || null,
        decision: decision || null,
        decisionNotes: decisionNotes || null,
        status: decision ? "decided" : "draft",
      };

      if (fearSettingId) {
        const res = await apiRequest("PATCH", `/api/fear-settings/${fearSettingId}`, payload);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/fear-settings", payload);
        return await res.json();
      }
    },
    onSuccess: (data) => {
      setFearSettingId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/fear-settings"] });
      toast({
        title: "Saved",
        description: "Your fear setting has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save fear setting.",
        variant: "destructive",
      });
    },
  });

  // Initialize preventions and repairs when fears change
  useEffect(() => {
    const validFears = fears.filter((f) => f.fear.trim());

    // Update preventions to match fears
    const newPreventions = validFears.map((_, index) => {
      const existing = preventions.find((p) => p.fearIndex === index);
      return existing || { fearIndex: index, prevention: "", effort: 5 };
    });
    setPreventions(newPreventions);

    // Update repairs to match fears
    const newRepairs = validFears.map((_, index) => {
      const existing = repairs.find((r) => r.fearIndex === index);
      return existing || { fearIndex: index, repair: "", reversibility: 5 };
    });
    setRepairs(newRepairs);
  }, [fears.length]);

  const addFear = () => {
    setFears([...fears, { fear: "", severity: 5 }]);
  };

  const removeFear = (index: number) => {
    if (fears.length > 1) {
      setFears(fears.filter((_, i) => i !== index));
    }
  };

  const updateFear = (index: number, field: keyof Fear, value: any) => {
    const updated = [...fears];
    updated[index] = { ...updated[index], [field]: value };
    setFears(updated);
  };

  const updatePrevention = (index: number, field: keyof Prevention, value: any) => {
    const updated = [...preventions];
    updated[index] = { ...updated[index], [field]: value };
    setPreventions(updated);
  };

  const updateRepair = (index: number, field: keyof Repair, value: any) => {
    const updated = [...repairs];
    updated[index] = { ...updated[index], [field]: value };
    setRepairs(updated);
  };

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      createMutation.mutate(); // Auto-save on step change
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return title.trim().length > 0;
      case 2:
        return fears.some((f) => f.fear.trim().length > 0);
      case 3:
      case 4:
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const validFears = fears.filter((f) => f.fear.trim());
  const progressPercent = (currentStep / 6) * 100;

  const loadFearSetting = (fs: FearSetting) => {
    setFearSettingId(fs.id);
    setTitle(fs.title);
    setDescription(fs.description || "");
    setDecisionType(fs.decisionType || "other");
    setVentureId(fs.ventureId || "");
    setProjectId(fs.projectId || "");
    setFears(fs.fears && fs.fears.length > 0 ? fs.fears : [{ fear: "", severity: 5 }]);
    setPreventions(fs.preventions || []);
    setRepairs(fs.repairs || []);
    setCostSixMonths(fs.costSixMonths || "");
    setCostOneYear(fs.costOneYear || "");
    setCostThreeYears(fs.costThreeYears || "");
    setDecision(fs.decision || "");
    setDecisionNotes(fs.decisionNotes || "");
    setCurrentStep(1);
  };

  const startNew = () => {
    setFearSettingId(null);
    setTitle("");
    setDescription("");
    setDecisionType("other");
    setVentureId("");
    setProjectId("");
    setFears([{ fear: "", severity: 5 }]);
    setPreventions([]);
    setRepairs([]);
    setCostSixMonths("");
    setCostOneYear("");
    setCostThreeYears("");
    setDecision("");
    setDecisionNotes("");
    setCurrentStep(1);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/weekly-planning">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full shrink-0">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Fear Setting</h1>
            <p className="text-sm text-muted-foreground">
              Tim Ferriss-style decision making
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startNew}>
            New Exercise
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            size="sm"
          >
            {createMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Previous Exercises */}
      {fearSettingsList.length > 0 && !fearSettingId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Previous Exercises</CardTitle>
            <CardDescription>Continue a previous fear-setting exercise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fearSettingsList.slice(0, 5).map((fs) => (
                <div
                  key={fs.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => loadFearSetting(fs)}
                >
                  <div>
                    <p className="font-medium">{fs.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {fs.decisionType} • {fs.status}
                    </p>
                  </div>
                  <Badge
                    variant={
                      fs.decision === "proceed"
                        ? "default"
                        : fs.decision === "abandon"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {fs.decision || fs.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center gap-1 ${
                      isActive
                        ? "text-primary"
                        : isCompleted
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        isActive
                          ? "bg-primary/10"
                          : isCompleted
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{step.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = STEPS[currentStep - 1].icon;
              return <Icon className="h-5 w-5" />;
            })()}
            Step {currentStep}: {STEPS[currentStep - 1].name}
          </CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Define */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>What decision are you facing?</Label>
                <Input
                  placeholder="e.g., Launch new SaaS product, Quit my job, Start a new venture..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Add more context about this decision..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Decision Type</Label>
                  <Select value={decisionType} onValueChange={setDecisionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venture">New Venture</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="life_change">Life Change</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Related Venture (optional)</Label>
                  <Select
                    value={ventureId || "__none__"}
                    onValueChange={(val) => setVentureId(val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select venture..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeVentures.map((v: Venture) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.icon} {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Related Project (optional)</Label>
                  <Select
                    value={projectId || "__none__"}
                    onValueChange={(val) => setProjectId(val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {filteredProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Define Fears */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                What are all the things that could go wrong? List your fears and rate their
                severity from 1 (minor) to 10 (catastrophic).
              </p>
              {fears.map((fear, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <Label>Fear #{index + 1}</Label>
                      <Textarea
                        placeholder="What could go wrong?"
                        value={fear.fear}
                        onChange={(e) => updateFear(index, "fear", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeFear(index)}
                      disabled={fears.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Severity</span>
                      <span className="font-medium">{fear.severity}/10</span>
                    </div>
                    <Slider
                      value={[fear.severity]}
                      onValueChange={([value]) => updateFear(index, "severity", value)}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Minor inconvenience</span>
                      <span>Catastrophic</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addFear} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Fear
              </Button>
            </div>
          )}

          {/* Step 3: Prevent */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                For each fear, what could you do to prevent or minimize the chance of it
                happening?
              </p>
              {validFears.map((fear, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{fear.fear}</p>
                      <Badge variant="outline" className="mt-1">
                        Severity: {fear.severity}/10
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>How can you prevent or minimize this?</Label>
                    <Textarea
                      placeholder="What steps can you take to reduce the likelihood of this happening?"
                      value={preventions[index]?.prevention || ""}
                      onChange={(e) => updatePrevention(index, "prevention", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Effort to prevent</span>
                      <span className="font-medium">{preventions[index]?.effort || 5}/10</span>
                    </div>
                    <Slider
                      value={[preventions[index]?.effort || 5]}
                      onValueChange={([value]) => updatePrevention(index, "effort", value)}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Easy</span>
                      <span>Very difficult</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Repair */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                If the worst happens, how would you recover? How reversible is the damage?
              </p>
              {validFears.map((fear, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="font-medium">{fear.fear}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>How would you recover if this happened?</Label>
                    <Textarea
                      placeholder="What would you do to get back on track?"
                      value={repairs[index]?.repair || ""}
                      onChange={(e) => updateRepair(index, "repair", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Reversibility</span>
                      <span className="font-medium">{repairs[index]?.reversibility || 5}/10</span>
                    </div>
                    <Slider
                      value={[repairs[index]?.reversibility || 5]}
                      onValueChange={([value]) => updateRepair(index, "reversibility", value)}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Permanent damage</span>
                      <span>Fully reversible</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Cost of Inaction */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                What is the cost of NOT taking action? What happens if you do nothing?
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />6 Months from Now
                  </Label>
                  <Textarea
                    placeholder="If you do nothing, what will your situation look like in 6 months?"
                    value={costSixMonths}
                    onChange={(e) => setCostSixMonths(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />1 Year from Now
                  </Label>
                  <Textarea
                    placeholder="If you do nothing, what will your situation look like in 1 year?"
                    value={costOneYear}
                    onChange={(e) => setCostOneYear(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />3 Years from Now
                  </Label>
                  <Textarea
                    placeholder="If you do nothing, what will your situation look like in 3 years?"
                    value={costThreeYears}
                    onChange={(e) => setCostThreeYears(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Decision */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Based on your analysis, what is your decision?
              </p>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Fears Analyzed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{validFears.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Avg Reversibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {repairs.length > 0
                        ? (
                            repairs.reduce((acc, r) => acc + r.reversibility, 0) / repairs.length
                          ).toFixed(1)
                        : "-"}
                      /10
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Your Decision</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant={decision === "proceed" ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col gap-2 ${
                      decision === "proceed" ? "bg-green-600 hover:bg-green-700" : ""
                    }`}
                    onClick={() => setDecision("proceed")}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                    <span>Proceed</span>
                  </Button>
                  <Button
                    variant={decision === "pause" ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col gap-2 ${
                      decision === "pause" ? "bg-amber-600 hover:bg-amber-700" : ""
                    }`}
                    onClick={() => setDecision("pause")}
                  >
                    <Pause className="h-6 w-6" />
                    <span>Pause</span>
                  </Button>
                  <Button
                    variant={decision === "abandon" ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col gap-2 ${
                      decision === "abandon" ? "bg-red-600 hover:bg-red-700" : ""
                    }`}
                    onClick={() => setDecision("abandon")}
                  >
                    <XCircle className="h-6 w-6" />
                    <span>Abandon</span>
                  </Button>
                  <Button
                    variant={decision === "need_more_info" ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col gap-2 ${
                      decision === "need_more_info" ? "bg-blue-600 hover:bg-blue-700" : ""
                    }`}
                    onClick={() => setDecision("need_more_info")}
                  >
                    <HelpCircle className="h-6 w-6" />
                    <span>Need Info</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Decision Notes</Label>
                <Textarea
                  placeholder="Capture your reasoning, next steps, and any conditions for your decision..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentStep < 6 ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                createMutation.mutate();
                toast({
                  title: "Decision recorded",
                  description: "Your fear-setting exercise has been completed.",
                });
              }}
              disabled={!decision}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Exercise
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
