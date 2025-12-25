import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  FlaskConical,
  Copy,
  Check,
  Sparkles,
  FileText,
  ArrowRight,
  Search,
  Target,
  ChevronDown,
  ChevronUp,
  Save,
  ExternalLink,
  Loader2,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AIProvider = "gemini" | "perplexity";
type ResearchStage = "idea" | "prompt" | "research" | "review";

interface IdeaInput {
  name: string;
  description: string;
  domain: string;
  targetCustomer: string;
  initialThoughts: string;
}

const DOMAIN_OPTIONS = [
  { value: "saas", label: "SaaS / Software" },
  { value: "media", label: "Media / Content" },
  { value: "ecommerce", label: "E-commerce / Retail" },
  { value: "services", label: "Services / Consulting" },
  { value: "marketplace", label: "Marketplace / Platform" },
  { value: "fintech", label: "Fintech / Finance" },
  { value: "healthtech", label: "Healthtech / Wellness" },
  { value: "edtech", label: "Edtech / Education" },
  { value: "realty", label: "Real Estate" },
  { value: "other", label: "Other" },
];

function generateResearchPrompt(idea: IdeaInput, provider: AIProvider): string {
  const sourceNote = provider === "perplexity"
    ? "Include sources and citations for all data points."
    : "";

  const domainLabel = idea.domain ? DOMAIN_OPTIONS.find(d => d.value === idea.domain)?.label || idea.domain : "";

  return `Act as a venture analyst.
Evaluate "${idea.name}" strictly for commercial feasibility.
${sourceNote}

**The Idea:** ${idea.description}
${domainLabel ? `**Domain:** ${domainLabel}` : ""}
${idea.targetCustomer ? `**Target Customer:** ${idea.targetCustomer}` : ""}
${idea.initialThoughts ? `**Hypothesis:** ${idea.initialThoughts}` : ""}

Produce:

1. **Problem Definition**
   - Who feels this pain? How badly? (severity 1-10)
   - What triggers them to seek a solution?
   - How are they solving it today?

2. **Target Buyer with Budget**
   - Who specifically pays for this? (job title, company size)
   - Do they have budget authority?
   - What do they currently spend on alternatives?

3. **Market Demand Signals**
   - Search volume for related terms
   - Active communities/forums discussing this problem
   - Evidence of spending (existing products, services, workarounds)

4. **Competitive Landscape**
   - Direct competitors (name specific companies)
   - Indirect competitors and alternatives
   - What's their pricing, positioning, and weaknesses?

5. **Differentiation Angle**
   - What would make this defensible?
   - Is there a unique insight or unfair advantage?
   - Why wouldn't an incumbent just copy this?

6. **Revenue Model + Unit Economics**
   - Best revenue model for this space (subscription, transaction, etc.)
   - Realistic pricing based on alternatives
   - Estimated CAC and LTV potential

7. **Distribution Path to First 100 Customers**
   - Specific channels to reach this customer
   - What's the sales motion? (self-serve, sales-led, PLG)
   - Where do these customers already congregate?

8. **Regulatory/Compliance Risks**
   - Industry-specific regulations
   - Data privacy considerations
   - Licensing or certification requirements

9. **AI Leverage Opportunities**
   - Where could AI provide 10x improvement?
   - What manual processes could be automated?
   - Competitive moat from AI capabilities?

10. **Top 3 Failure Modes**
    - What kills this business?
    - Key assumptions that must be true
    - External risks (market, technology, regulation)

**Verdict:** GO / NO-GO / NEEDS VALIDATION
One-line reasoning.`;
}

function generateResearchDocTemplate(idea: IdeaInput): string {
  const today = new Date().toISOString().split('T')[0];

  return `# Venture Research: ${idea.name}

**Status:** Researching
**Research Date:** ${today}
**Research Source:** [Gemini / Perplexity]
**Decision:** Pending

---

## The Idea
**Name:** ${idea.name}
**Description:** ${idea.description}
${idea.domain ? `**Domain:** ${DOMAIN_OPTIONS.find(d => d.value === idea.domain)?.label || idea.domain}` : ""}
${idea.targetCustomer ? `**Target Customer:** ${idea.targetCustomer}` : ""}

---

## Research Findings

### 1. Problem Definition
- **Who feels this pain:**
- **Severity (1-10):**
- **Current solutions:**

### 2. Target Buyer with Budget
- **Who pays:**
- **Budget authority:**
- **Current spend on alternatives:**

### 3. Market Demand Signals
- **Search volume:**
- **Active communities:**
- **Spending evidence:**

### 4. Competitive Landscape
| Competitor | Positioning | Pricing | Weakness |
|------------|-------------|---------|----------|
| | | | |
| | | | |
| | | | |

### 5. Differentiation Angle
- **Defensibility:**
- **Unique insight:**
- **Why incumbents won't copy:**

### 6. Revenue Model + Unit Economics
- **Revenue model:**
- **Pricing:**
- **CAC estimate:**
- **LTV potential:**

### 7. Distribution Path to First 100 Customers
- **Primary channel:**
- **Sales motion:**
- **Where customers congregate:**

### 8. Regulatory/Compliance Risks
- **Industry regulations:**
- **Data privacy:**
- **Licensing requirements:**

### 9. AI Leverage Opportunities
- **10x improvement areas:**
- **Automation potential:**
- **AI moat:**

### 10. Top 3 Failure Modes
1.
2.
3.

---

## Verdict

**Decision:** GO / NO-GO / NEEDS VALIDATION

**One-line reasoning:**

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| ${today} | Research Started | Initial idea evaluation |

---

## Raw Research Output
[Paste full AI research output below]

`;
}

export default function VentureLabPage() {
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Stage tracking
  const [stage, setStage] = useState<ResearchStage>("idea");

  // Idea input
  const [idea, setIdea] = useState<IdeaInput>({
    name: "",
    description: "",
    domain: "",
    targetCustomer: "",
    initialThoughts: "",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Prompt generation
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  // Research results
  const [researchResults, setResearchResults] = useState("");

  // Track if AI was used for the prompt
  const [promptMethod, setPromptMethod] = useState<"ai" | "template">("template");

  // Auto-focus on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // AI-powered prompt generation mutation
  const generatePromptMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      domain?: string;
      targetCustomer?: string;
      initialThoughts?: string;
      provider: "gemini" | "perplexity";
    }) => {
      const res = await apiRequest("POST", "/api/venture-lab/generate-prompt", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setGeneratedPrompt(data.prompt);
      setPromptMethod(data.method || "ai");
      setStage("prompt");

      if (data.method === "ai") {
        toast({
          title: "Intelligent prompt generated",
          description: `AI has analyzed your idea and created a customized research prompt for ${selectedProvider === "gemini" ? "Gemini" : "Perplexity"}.`,
        });
      } else {
        toast({
          title: "Prompt generated",
          description: `Research prompt ready for ${selectedProvider === "gemini" ? "Gemini" : "Perplexity"}.`,
        });
      }
    },
    onError: (error: any) => {
      // Fall back to template-based prompt on error
      const prompt = generateResearchPrompt(idea, selectedProvider);
      setGeneratedPrompt(prompt);
      setPromptMethod("template");
      setStage("prompt");

      toast({
        title: "Using template prompt",
        description: "AI unavailable - generated template-based prompt instead.",
      });
    },
  });

  const handleGeneratePrompt = () => {
    if (!idea.name.trim() || !idea.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide at least an idea name and description.",
        variant: "destructive",
      });
      return;
    }

    // Call AI-powered prompt generation
    generatePromptMutation.mutate({
      name: idea.name,
      description: idea.description,
      domain: idea.domain || undefined,
      targetCustomer: idea.targetCustomer || undefined,
      initialThoughts: idea.initialThoughts || undefined,
      provider: selectedProvider,
    });
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard. Paste it in your AI tool.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please select and copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleProceedToResearch = () => {
    setStage("research");
  };

  const saveResearchMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; type: string; domain: string }) => {
      const res = await apiRequest("POST", "/api/docs", {
        title: data.title,
        body: data.body,
        type: data.type,
        domain: data.domain,
        status: "draft",
        tags: "venture-lab,research",
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      toast({
        title: "Research saved!",
        description: "Document saved to Knowledge Base.",
      });
      setStage("review");
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save research document.",
        variant: "destructive",
      });
    },
  });

  const handleSaveResearch = () => {
    if (!researchResults.trim()) {
      toast({
        title: "No research to save",
        description: "Please paste your research results first.",
        variant: "destructive",
      });
      return;
    }

    // Combine the template with actual research
    const docTemplate = generateResearchDocTemplate(idea);
    const fullDoc = docTemplate.replace(
      "[Paste full AI research output below]",
      researchResults
    );

    saveResearchMutation.mutate({
      title: `Venture Research: ${idea.name}`,
      body: fullDoc,
      type: "research",
      domain: "venture_ops",
    });
  };

  const handleStartOver = () => {
    setIdea({
      name: "",
      description: "",
      domain: "",
      targetCustomer: "",
      initialThoughts: "",
    });
    setGeneratedPrompt("");
    setResearchResults("");
    setStage("idea");
    setCopied(false);
    nameInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Venture Lab</h1>
            <p className="text-sm text-muted-foreground">
              Research and validate business ideas before committing
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={stage === "idea" ? "default" : "secondary"} className="gap-1">
            <Target className="h-3 w-3" />
            1. Idea
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={stage === "prompt" ? "default" : "secondary"} className="gap-1">
            <Sparkles className="h-3 w-3" />
            2. Prompt
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={stage === "research" ? "default" : "secondary"} className="gap-1">
            <Search className="h-3 w-3" />
            3. Research
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={stage === "review" ? "default" : "secondary"} className="gap-1">
            <FileText className="h-3 w-3" />
            4. Review
          </Badge>
        </div>

        {/* Stage 1: Idea Input */}
        {stage === "idea" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Describe Your Idea
              </CardTitle>
              <CardDescription>
                Provide details about the business idea you want to research
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Idea Name *</Label>
                <Input
                  ref={nameInputRef}
                  id="name"
                  placeholder="e.g., AI-Powered Resume Builder"
                  value={idea.name}
                  onChange={(e) => setIdea({ ...idea, name: e.target.value })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the core idea. What does it do? What problem does it solve?"
                  value={idea.description}
                  onChange={(e) => setIdea({ ...idea, description: e.target.value })}
                  rows={4}
                />
              </div>

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showAdvanced ? "Less details" : "Add more details (optional)"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Domain / Industry</Label>
                      <Select
                        value={idea.domain}
                        onValueChange={(value) => setIdea({ ...idea, domain: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOMAIN_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetCustomer">Target Customer</Label>
                      <Input
                        id="targetCustomer"
                        placeholder="e.g., Job seekers, HR managers"
                        value={idea.targetCustomer}
                        onChange={(e) => setIdea({ ...idea, targetCustomer: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialThoughts">Initial Thoughts / Hypotheses</Label>
                    <Textarea
                      id="initialThoughts"
                      placeholder="Any initial thoughts, assumptions, or hypotheses you want to validate?"
                      value={idea.initialThoughts}
                      onChange={(e) => setIdea({ ...idea, initialThoughts: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* AI Provider Selection */}
              <div className="pt-4 border-t">
                <Label className="mb-3 block">Which AI will you use for research?</Label>
                <Tabs value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as AIProvider)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gemini" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Gemini
                    </TabsTrigger>
                    <TabsTrigger value="perplexity" className="gap-2">
                      <Search className="h-4 w-4" />
                      Perplexity
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="gemini" className="mt-3">
                    <p className="text-sm text-muted-foreground">
                      Best for: Deep analysis, strategic thinking, comprehensive reasoning.
                      Gemini excels at synthesizing information and providing nuanced recommendations.
                    </p>
                  </TabsContent>
                  <TabsContent value="perplexity" className="mt-3">
                    <p className="text-sm text-muted-foreground">
                      Best for: Current data, market research, finding sources.
                      Perplexity has real-time web search and provides citations.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              <Button
                onClick={handleGeneratePrompt}
                className="w-full h-12 text-base bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
                disabled={!idea.name.trim() || !idea.description.trim() || generatePromptMutation.isPending}
              >
                {generatePromptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Your Idea...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-5 w-5" />
                    Generate Intelligent Research Prompt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stage 2: Prompt Display */}
        {stage === "prompt" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {promptMethod === "ai" ? (
                  <Brain className="h-5 w-5 text-purple-500" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                Your Research Prompt
                {promptMethod === "ai" && (
                  <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">
                    AI-Customized
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {promptMethod === "ai" ? (
                  <>
                    AI has analyzed your idea and created a <strong>customized</strong> research prompt.
                    Copy and paste it into {selectedProvider === "gemini" ? "Gemini" : "Perplexity"}.
                  </>
                ) : (
                  <>Copy this prompt and paste it into {selectedProvider === "gemini" ? "Gemini" : "Perplexity"}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={handleCopyPrompt}
                  className="gap-2"
                  variant={copied ? "secondary" : "default"}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Prompt"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const url = selectedProvider === "gemini"
                      ? "https://gemini.google.com"
                      : "https://perplexity.ai";
                    window.open(url, "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {selectedProvider === "gemini" ? "Gemini" : "Perplexity"}
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  value={generatedPrompt}
                  readOnly
                  className="font-mono text-sm min-h-[400px] bg-muted/50"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStage("idea")}>
                  Back to Edit
                </Button>
                <Button
                  onClick={handleProceedToResearch}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
                >
                  I've Got My Research - Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 3: Paste Research */}
        {stage === "research" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Paste Your Research
              </CardTitle>
              <CardDescription>
                Paste the research output from {selectedProvider === "gemini" ? "Gemini" : "Perplexity"} below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={researchResults}
                onChange={(e) => setResearchResults(e.target.value)}
                placeholder="Paste the full research output here..."
                className="font-mono text-sm min-h-[500px]"
              />

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStage("prompt")}>
                  Back to Prompt
                </Button>
                <Button
                  onClick={handleSaveResearch}
                  disabled={!researchResults.trim() || saveResearchMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveResearchMutation.isPending ? "Saving..." : "Save to Knowledge Base"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 4: Review / Complete */}
        {stage === "review" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Research Saved!
              </CardTitle>
              <CardDescription>
                Your research for "{idea.name}" has been saved to the Knowledge Base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-medium">What's next?</span>
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Review the research in your Knowledge Base</li>
                  <li>2. Fill in the Opportunity Scorecard</li>
                  <li>3. Make a GO/NO-GO decision</li>
                  <li>4. If GO, create a new Venture with the research as foundation</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleStartOver}>
                  Research Another Idea
                </Button>
                <Button
                  onClick={() => window.location.href = "/knowledge"}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Knowledge Base
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Tips Card */}
        {stage === "idea" && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium mb-2">AI-Powered Prompt Generation</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Our AI will analyze your idea and generate a <strong>customized research prompt</strong> that:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- Names specific competitors to research (not just "find competitors")</li>
                    <li>- Asks domain-relevant questions based on your industry</li>
                    <li>- Probes the specific customer segment you mentioned</li>
                    <li>- Considers risks unique to your type of business</li>
                    <li>- Requests metrics relevant to your business model</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3">
                    <strong>Tip:</strong> The more details you provide, the more tailored your research prompt will be.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
