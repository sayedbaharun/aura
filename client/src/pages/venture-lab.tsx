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
  const providerNote = provider === "perplexity"
    ? "Please include sources and links where possible. Use your web search capabilities to find current data."
    : "Please provide thorough analysis based on your knowledge. Where you reference specific data or trends, note the source if known.";

  return `# Venture Research Request: ${idea.name}

## Context
I'm evaluating a business idea and need comprehensive research to make a GO/NO-GO decision. ${providerNote}

## The Idea
**Name:** ${idea.name}
**Description:** ${idea.description}
${idea.domain ? `**Domain:** ${DOMAIN_OPTIONS.find(d => d.value === idea.domain)?.label || idea.domain}` : ""}
${idea.targetCustomer ? `**Target Customer:** ${idea.targetCustomer}` : ""}
${idea.initialThoughts ? `**Initial Thoughts:** ${idea.initialThoughts}` : ""}

---

## Research Required

Please provide detailed research on the following areas. Structure your response with clear markdown headers matching each section.

### 1. Problem & Market Validation
- Is this a real problem that people/businesses actively pay to solve?
- What is the market size? (Provide TAM/SAM/SOM estimates with sources)
- Who is the ideal customer profile? (Demographics, psychographics, behaviors)
- What are the primary pain points and how are they currently addressed?
- What triggers someone to seek a solution to this problem?

### 2. Competitive Landscape
- Who are the direct competitors? (Companies doing the exact same thing)
- Who are indirect competitors? (Alternative solutions to the same problem)
- What are the market gaps and underserved segments?
- What would differentiate a new entrant? What moats exist?
- Provide a brief competitive matrix if possible (features, pricing, positioning)

### 3. Business Model Analysis
- What revenue models work in this space? (Subscription, transaction, licensing, etc.)
- What are typical pricing benchmarks? What do customers pay?
- What are the unit economics like? (CAC, LTV, margins in similar businesses)
- Is the revenue recurring or one-time? What drives retention?
- What's the typical sales cycle length?

### 4. Go-to-Market Intelligence
- How do successful players acquire customers in this space?
- What distribution channels work best? (Direct, partners, marketplaces, etc.)
- What marketing approaches and content work? (Paid, organic, community, etc.)
- What is typical customer acquisition cost in this space?
- Are there platforms, partnerships, or ecosystems to leverage?

### 5. Execution Requirements
- What's needed to build an MVP? (Tech stack, time, cost estimates)
- What key skills or team members are required?
- What's a realistic timeline to first revenue?
- What are the operational complexities? (Support, fulfillment, compliance)
- Are there regulatory or legal considerations?

### 6. Risk Assessment
- What are the barriers to entry? (Capital, expertise, relationships, tech)
- What are the key risks and how might they be mitigated?
- Are there regulatory, legal, or compliance risks?
- What market timing factors are relevant? (Is this the right time?)
- What could cause this business to fail?

### 7. Opportunity Scorecard
Based on your research, provide scores from 1-10 for each factor:

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Market Attractiveness | /10 | [Brief reasoning] |
| Competition Intensity | /10 | [Lower is more competitive, higher means less crowded] |
| Execution Feasibility | /10 | [Higher means easier to execute] |
| Revenue Potential | /10 | [Higher means larger opportunity] |
| Timing & Urgency | /10 | [Higher means better timing] |
| **Overall Opportunity** | /10 | [Weighted average or holistic assessment] |

### 8. Recommendation

**Decision:** [GO / NO-GO / NEEDS MORE RESEARCH]

**Key Reasons:**
1. [Primary reason for recommendation]
2. [Secondary reason]
3. [Third reason]

**If GO - Suggested First Steps:**
1. [First action to take]
2. [Second action]
3. [Third action]

**If NO-GO - What Would Change This?**
[What conditions or changes would make this viable?]

---

## Output Format
Please structure your entire response in clean markdown with the headers exactly as shown above. This will be saved directly to a knowledge base, so consistent formatting is important.`;
}

function generateResearchDocTemplate(idea: IdeaInput): string {
  const today = new Date().toISOString().split('T')[0];

  return `# Venture Research: ${idea.name}

**Status:** Researching
**Research Date:** ${today}
**Research Source:** [Gemini / Perplexity / Multiple]
**Decision:** Pending

---

## Executive Summary
[2-3 sentence summary of the opportunity - fill in after research]

## The Idea
**Name:** ${idea.name}
**Description:** ${idea.description}
${idea.domain ? `**Domain:** ${DOMAIN_OPTIONS.find(d => d.value === idea.domain)?.label || idea.domain}` : ""}
${idea.targetCustomer ? `**Target Customer:** ${idea.targetCustomer}` : ""}

---

## Research Findings

### Problem & Market
[Paste findings here]

### Competition
[Paste findings here]

### Business Model
[Paste findings here]

### Go-to-Market
[Paste findings here]

### Execution Requirements
[Paste findings here]

### Risks
[Paste findings here]

---

## Opportunity Scorecard

| Factor | Score (1-10) | Notes |
|--------|--------------|-------|
| Market Attractiveness | | |
| Competition Level | | |
| Execution Feasibility | | |
| Revenue Potential | | |
| Timing | | |
| **Overall** | | |

---

## Recommendation
[GO / NO-GO / NEEDS MORE]

### Reasoning
[Key points]

### If GO - Next Steps
1.
2.
3.

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| ${today} | Research Started | Initial idea evaluation |

---

## Raw Research
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

  // Auto-focus on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleGeneratePrompt = () => {
    if (!idea.name.trim() || !idea.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide at least an idea name and description.",
        variant: "destructive",
      });
      return;
    }

    const prompt = generateResearchPrompt(idea, selectedProvider);
    setGeneratedPrompt(prompt);
    setStage("prompt");

    toast({
      title: "Prompt generated",
      description: `Research prompt ready for ${selectedProvider === "gemini" ? "Gemini" : "Perplexity"}.`,
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
                disabled={!idea.name.trim() || !idea.description.trim()}
              >
                Generate Research Prompt
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stage 2: Prompt Display */}
        {stage === "prompt" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Research Prompt
              </CardTitle>
              <CardDescription>
                Copy this prompt and paste it into {selectedProvider === "gemini" ? "Gemini" : "Perplexity"}
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
              <h3 className="font-medium mb-2">Tips for Better Research</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Be specific about the problem you're solving</li>
                <li>- Include who you think the target customer is</li>
                <li>- Mention any initial hypotheses you want to validate</li>
                <li>- Use Perplexity for current market data, Gemini for strategic analysis</li>
                <li>- Run the same prompt in both for comprehensive coverage</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
