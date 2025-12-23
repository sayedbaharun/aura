import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Bot, MessageSquare, Thermometer, Key, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AISettings {
  id?: number;
  model: string;
  customInstructions: string;
  temperature: number;
  maxTokens: number;
  streamResponses: boolean;
  apiKey?: string;
}

// OpenRouter model IDs - these must match exactly what OpenRouter expects
const AI_MODELS = [
  { value: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI", description: "Most capable, best for complex reasoning" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", description: "Fast and efficient, good for most tasks" },
  { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI", description: "Strong reasoning with large context" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic", description: "Excellent reasoning and coding" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic", description: "Most capable Claude model" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku", provider: "Anthropic", description: "Fastest Claude model" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5", provider: "Google", description: "Long context, multimodal" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5", provider: "Google", description: "Fast and efficient" },
  { value: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B", provider: "Meta", description: "Open source, strong performance" },
  { value: "mistralai/mixtral-8x7b-instruct", label: "Mixtral 8x7B", provider: "Mistral", description: "Open source mixture of experts" },
];

const DEFAULT_INSTRUCTIONS = `You are a helpful AI assistant for SB-OS, a personal operating system for managing ventures, projects, tasks, health, and knowledge.

Key context:
- Help the user manage their productivity and wellbeing
- Be concise and actionable in responses
- Reference the user's ventures, projects, and tasks when relevant
- Support planning, execution, and reflection workflows
- Maintain a professional yet friendly tone`;

export default function AISettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<AISettings>({
    queryKey: ["/api/settings/ai"],
  });

  const [form, setForm] = useState<AISettings>({
    model: "openai/gpt-4o",
    customInstructions: DEFAULT_INSTRUCTIONS,
    temperature: 0.7,
    maxTokens: 4096,
    streamResponses: true,
  });

  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        model: settings.model || "openai/gpt-4o",
        customInstructions: settings.customInstructions || DEFAULT_INSTRUCTIONS,
        temperature: settings.temperature ?? 0.7,
        maxTokens: settings.maxTokens ?? 4096,
        streamResponses: settings.streamResponses ?? true,
        apiKey: settings.apiKey,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<AISettings>) => {
      const res = await apiRequest("PATCH", "/api/settings/ai", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ai"] });
      toast({
        title: "AI settings updated",
        description: "Your AI assistant settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update AI settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleResetInstructions = () => {
    setForm({ ...form, customInstructions: DEFAULT_INSTRUCTIONS });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-60 bg-muted animate-pulse rounded-lg" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const selectedModel = AI_MODELS.find((m) => m.value === form.model);

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Model
          </CardTitle>
          <CardDescription>
            Choose the AI model that powers your assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={form.model}
              onValueChange={(value) => setForm({ ...form, model: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      <span>{model.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({model.provider})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="text-sm text-muted-foreground">
                Powered by {selectedModel.provider}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Override the default API key with your own</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={form.apiKey || ""}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-... (leave empty to use default)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Custom Instructions
          </CardTitle>
          <CardDescription>
            Define how the AI assistant should behave and respond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="customInstructions">System Prompt</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetInstructions}
              >
                Reset to Default
              </Button>
            </div>
            <Textarea
              id="customInstructions"
              value={form.customInstructions}
              onChange={(e) =>
                setForm({ ...form, customInstructions: e.target.value })
              }
              placeholder="Enter custom instructions for the AI..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              These instructions guide how the AI assistant responds to your
              queries. Be specific about tone, style, and context.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Fine-tune the AI's behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Temperature: {form.temperature.toFixed(1)}</Label>
                <p className="text-xs text-muted-foreground">
                  Lower = more focused, Higher = more creative
                </p>
              </div>
            </div>
            <Slider
              value={[form.temperature]}
              onValueChange={(value) =>
                setForm({ ...form, temperature: value[0] })
              }
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Precise (0.0)</span>
              <span>Balanced (1.0)</span>
              <span>Creative (2.0)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Response Tokens</Label>
            <Select
              value={String(form.maxTokens)}
              onValueChange={(value) =>
                setForm({ ...form, maxTokens: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024">1,024 (Short)</SelectItem>
                <SelectItem value="2048">2,048 (Medium)</SelectItem>
                <SelectItem value="4096">4,096 (Long)</SelectItem>
                <SelectItem value="8192">8,192 (Very Long)</SelectItem>
                <SelectItem value="16384">16,384 (Maximum)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Maximum length of AI responses. Higher values allow longer
              responses but may increase latency.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="streamResponses">Stream Responses</Label>
              <p className="text-xs text-muted-foreground">
                Show responses as they're generated
              </p>
            </div>
            <Switch
              id="streamResponses"
              checked={form.streamResponses}
              onCheckedChange={(checked) =>
                setForm({ ...form, streamResponses: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Prompt Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Prompt Templates
          </CardTitle>
          <CardDescription>
            Pre-configured instruction sets for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 justify-start text-left"
              onClick={() =>
                setForm({
                  ...form,
                  customInstructions: `You are a focused productivity assistant. Keep responses brief and actionable. Prioritize tasks by impact and urgency. Help break down complex projects into next actions.`,
                })
              }
            >
              <div>
                <div className="font-medium">Productivity Coach</div>
                <div className="text-xs text-muted-foreground">
                  Brief, action-oriented responses
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start text-left"
              onClick={() =>
                setForm({
                  ...form,
                  customInstructions: `You are a strategic thinking partner. Help explore ideas deeply, consider multiple perspectives, and think through implications. Ask clarifying questions when helpful.`,
                })
              }
            >
              <div>
                <div className="font-medium">Strategic Advisor</div>
                <div className="text-xs text-muted-foreground">
                  Deep thinking and analysis
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start text-left"
              onClick={() =>
                setForm({
                  ...form,
                  customInstructions: `You are a wellness companion focused on health, energy, and sustainable performance. Provide evidence-based suggestions for sleep, exercise, nutrition, and stress management.`,
                })
              }
            >
              <div>
                <div className="font-medium">Wellness Guide</div>
                <div className="text-xs text-muted-foreground">
                  Health and performance focus
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start text-left"
              onClick={() =>
                setForm({
                  ...form,
                  customInstructions: `You are a technical assistant with expertise in software development, system design, and best practices. Provide clear, well-structured code examples and architectural guidance.`,
                })
              }
            >
              <div>
                <div className="font-medium">Technical Expert</div>
                <div className="text-xs text-muted-foreground">
                  Code and architecture help
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save AI Settings"}
        </Button>
      </div>
    </div>
  );
}
