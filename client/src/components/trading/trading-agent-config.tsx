import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Plus,
  X,
  Sparkles,
  Target,
  Clock,
  Shield,
  TrendingUp,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradingAgentConfig {
  id: string | null;
  userId: string;
  systemPrompt: string | null;
  tradingStyle: string | null;
  instruments: string | null;
  timeframes: string | null;
  riskRules: string | null;
  tradingHours: string | null;
  quickActions: Array<{ label: string; prompt: string }>;
  preferredModel: string | null;
  researchModel: string | null;
  focusAreas: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
}

const FOCUS_AREA_OPTIONS = [
  "Discipline",
  "Risk Management",
  "Journaling",
  "Strategy Adherence",
  "Emotional Control",
  "Trade Analysis",
  "Pattern Recognition",
  "Money Management",
];

export default function TradingAgentConfig() {
  const { toast } = useToast();

  // Form state
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tradingStyle, setTradingStyle] = useState("");
  const [instruments, setInstruments] = useState("");
  const [timeframes, setTimeframes] = useState("");
  const [riskRules, setRiskRules] = useState("");
  const [tradingHours, setTradingHours] = useState("");
  const [preferredModel, setPreferredModel] = useState("auto");
  const [researchModel, setResearchModel] = useState("auto");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<Array<{ label: string; prompt: string }>>([]);

  // New quick action form
  const [newActionLabel, setNewActionLabel] = useState("");
  const [newActionPrompt, setNewActionPrompt] = useState("");

  // Fetch config
  const { data: config, isLoading } = useQuery<TradingAgentConfig>({
    queryKey: ["/api/trading/agent/config"],
    queryFn: async () => {
      const res = await fetch("/api/trading/agent/config", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch config");
      return await res.json();
    },
  });

  // Fetch available models
  const { data: models = [] } = useQuery<AIModel[]>({
    queryKey: ["/api/ai-models"],
    queryFn: async () => {
      const res = await fetch("/api/ai-models", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setSystemPrompt(config.systemPrompt || "");
      setTradingStyle(config.tradingStyle || "");
      setInstruments(config.instruments || "");
      setTimeframes(config.timeframes || "");
      setRiskRules(config.riskRules || "");
      setTradingHours(config.tradingHours || "");
      setPreferredModel(config.preferredModel || "auto");
      setResearchModel(config.researchModel || "auto");
      setFocusAreas(config.focusAreas || []);
      setQuickActions(config.quickActions || []);
    }
  }, [config]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<TradingAgentConfig>) => {
      const res = await apiRequest("PUT", "/api/trading/agent/config", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/agent/config"] });
      toast({
        title: "Configuration Saved",
        description: "Your trading agent settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      systemPrompt: systemPrompt || null,
      tradingStyle: tradingStyle || null,
      instruments: instruments || null,
      timeframes: timeframes || null,
      riskRules: riskRules || null,
      tradingHours: tradingHours || null,
      preferredModel: preferredModel === "auto" ? null : preferredModel,
      researchModel: researchModel === "auto" ? null : researchModel,
      focusAreas,
      quickActions,
    });
  };

  const addQuickAction = () => {
    if (!newActionLabel.trim() || !newActionPrompt.trim()) return;
    setQuickActions([
      ...quickActions,
      { label: newActionLabel.trim(), prompt: newActionPrompt.trim() },
    ]);
    setNewActionLabel("");
    setNewActionPrompt("");
  };

  const removeQuickAction = (index: number) => {
    setQuickActions(quickActions.filter((_, i) => i !== index));
  };

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter((a) => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trading Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Trading Context
          </CardTitle>
          <CardDescription>
            Tell the AI about your trading style and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tradingStyle">Trading Style</Label>
              <Input
                id="tradingStyle"
                placeholder="e.g., ICT/SMC concepts, Price Action, Scalping"
                value={tradingStyle}
                onChange={(e) => setTradingStyle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instruments">Instruments</Label>
              <Input
                id="instruments"
                placeholder="e.g., EURUSD, GBPUSD, Gold, NAS100"
                value={instruments}
                onChange={(e) => setInstruments(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframes">Timeframes</Label>
              <Input
                id="timeframes"
                placeholder="e.g., 15m, 1H, 4H for entries, Daily for bias"
                value={timeframes}
                onChange={(e) => setTimeframes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradingHours">Trading Hours</Label>
              <Input
                id="tradingHours"
                placeholder="e.g., London and NY sessions only"
                value={tradingHours}
                onChange={(e) => setTradingHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="riskRules">
              <Shield className="h-4 w-4 inline mr-1" />
              Risk Management Rules
            </Label>
            <Textarea
              id="riskRules"
              placeholder="e.g., Max 1% per trade, max 3 trades per day, no trading after 2 losses..."
              value={riskRules}
              onChange={(e) => setRiskRules(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Focus Areas
          </CardTitle>
          <CardDescription>
            What should the AI emphasize when helping you?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREA_OPTIONS.map((area) => (
              <Badge
                key={area}
                variant={focusAreas.includes(area) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleFocusArea(area)}
              >
                {area}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Custom Instructions
          </CardTitle>
          <CardDescription>
            Additional instructions for your trading AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt (Advanced)</Label>
            <Textarea
              id="systemPrompt"
              placeholder="Add custom instructions for the AI's behavior..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This will be added to the AI's system prompt. Use this to customize personality or add specific rules.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredModel">Chat Model</Label>
              <Select value={preferredModel} onValueChange={setPreferredModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (default)</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Model for general chat, analysis, and strategy building
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="researchModel">Research Model (Web Search)</Label>
              <Select value={researchModel} onValueChange={setResearchModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Perplexity)</SelectItem>
                  <SelectItem value="perplexity/sonar-pro">Perplexity Sonar Pro</SelectItem>
                  <SelectItem value="perplexity/sonar">Perplexity Sonar</SelectItem>
                  <SelectItem value="perplexity/sonar-reasoning">Perplexity Sonar Reasoning</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Model for web search, price lookups, and news research
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Preset prompts for common queries (shown as buttons in chat)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing quick actions */}
          {quickActions.length > 0 && (
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.prompt}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuickAction(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new quick action */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Button label"
                value={newActionLabel}
                onChange={(e) => setNewActionLabel(e.target.value)}
              />
              <Input
                placeholder="Prompt text"
                value={newActionPrompt}
                onChange={(e) => setNewActionPrompt(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addQuickAction}
              disabled={!newActionLabel.trim() || !newActionPrompt.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Quick Action
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
