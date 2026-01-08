import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Save,
  Plus,
  X,
  Sparkles,
  Target,
  Clock,
  Shield,
  TrendingUp,
  DollarSign,
  Brain,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckSquare,
  BookOpen,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SetupType {
  name: string;
  description: string;
  validationRules: string[];
  riskRewardMin: number;
}

interface KeyLesson {
  date: string;
  lesson: string;
  context: string;
}

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
  // Account Management
  accountBalance: number | null;
  accountCurrency: string | null;
  maxDrawdownPercent: number | null;
  riskPerTradePercent: number | null;
  riskPerTradeAmount: number | null;
  brokerName: string | null;
  // Performance Goals
  monthlyPnlTarget: number | null;
  monthlyPnlTargetPercent: number | null;
  winRateTarget: number | null;
  averageRrTarget: number | null;
  maxTradesPerDay: number | null;
  maxTradesPerWeek: number | null;
  maxLossPerDay: number | null;
  maxLossPerDayPercent: number | null;
  maxConsecutiveLosses: number | null;
  // Setup Types
  setupTypes: SetupType[] | null;
  // Psychology
  noTradeRules: string[] | null;
  preTradeChecklist: string[] | null;
  postTradeReview: string[] | null;
  tradingPlan: string | null;
  tradingBeliefs: string[] | null;
  strengthsToLeverage: string[] | null;
  weaknessesToManage: string[] | null;
  emotionalTriggers: string[] | null;
  recoveryStrategies: string[] | null;
  // Reviews
  weeklyReviewDay: number | null;
  monthlyReviewDay: number | null;
  reviewQuestions: string[] | null;
  tradingMentors: string[] | null;
  keyLessons: KeyLesson[] | null;
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

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function TradingAgentConfig() {
  const { toast } = useToast();

  // Basic form state
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

  // Account Management state
  const [accountBalance, setAccountBalance] = useState<string>("");
  const [accountCurrency, setAccountCurrency] = useState("USD");
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState<string>("");
  const [riskPerTradePercent, setRiskPerTradePercent] = useState<string>("1");
  const [riskPerTradeAmount, setRiskPerTradeAmount] = useState<string>("");
  const [brokerName, setBrokerName] = useState("");

  // Performance Goals state
  const [monthlyPnlTarget, setMonthlyPnlTarget] = useState<string>("");
  const [monthlyPnlTargetPercent, setMonthlyPnlTargetPercent] = useState<string>("");
  const [winRateTarget, setWinRateTarget] = useState<string>("");
  const [averageRrTarget, setAverageRrTarget] = useState<string>("");
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<string>("");
  const [maxTradesPerWeek, setMaxTradesPerWeek] = useState<string>("");
  const [maxLossPerDay, setMaxLossPerDay] = useState<string>("");
  const [maxLossPerDayPercent, setMaxLossPerDayPercent] = useState<string>("");
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState<string>("");

  // Setup Types state
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([]);
  const [newSetupName, setNewSetupName] = useState("");
  const [newSetupDescription, setNewSetupDescription] = useState("");
  const [newSetupRules, setNewSetupRules] = useState("");
  const [newSetupRR, setNewSetupRR] = useState("2");

  // Psychology state
  const [noTradeRules, setNoTradeRules] = useState<string[]>([]);
  const [preTradeChecklist, setPreTradeChecklist] = useState<string[]>([]);
  const [postTradeReview, setPostTradeReview] = useState<string[]>([]);
  const [tradingPlan, setTradingPlan] = useState("");
  const [tradingBeliefs, setTradingBeliefs] = useState<string[]>([]);
  const [strengthsToLeverage, setStrengthsToLeverage] = useState<string[]>([]);
  const [weaknessesToManage, setWeaknessesToManage] = useState<string[]>([]);
  const [emotionalTriggers, setEmotionalTriggers] = useState<string[]>([]);
  const [recoveryStrategies, setRecoveryStrategies] = useState<string[]>([]);

  // Reviews state
  const [weeklyReviewDay, setWeeklyReviewDay] = useState<number>(0);
  const [monthlyReviewDay, setMonthlyReviewDay] = useState<number>(1);
  const [reviewQuestions, setReviewQuestions] = useState<string[]>([]);
  const [tradingMentors, setTradingMentors] = useState<string[]>([]);
  const [keyLessons, setKeyLessons] = useState<KeyLesson[]>([]);

  // New item inputs
  const [newActionLabel, setNewActionLabel] = useState("");
  const [newActionPrompt, setNewActionPrompt] = useState("");
  const [newListItem, setNewListItem] = useState("");

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
      // Basic
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

      // Account Management
      setAccountBalance(config.accountBalance?.toString() || "");
      setAccountCurrency(config.accountCurrency || "USD");
      setMaxDrawdownPercent(config.maxDrawdownPercent?.toString() || "");
      setRiskPerTradePercent(config.riskPerTradePercent?.toString() || "1");
      setRiskPerTradeAmount(config.riskPerTradeAmount?.toString() || "");
      setBrokerName(config.brokerName || "");

      // Performance Goals
      setMonthlyPnlTarget(config.monthlyPnlTarget?.toString() || "");
      setMonthlyPnlTargetPercent(config.monthlyPnlTargetPercent?.toString() || "");
      setWinRateTarget(config.winRateTarget?.toString() || "");
      setAverageRrTarget(config.averageRrTarget?.toString() || "");
      setMaxTradesPerDay(config.maxTradesPerDay?.toString() || "");
      setMaxTradesPerWeek(config.maxTradesPerWeek?.toString() || "");
      setMaxLossPerDay(config.maxLossPerDay?.toString() || "");
      setMaxLossPerDayPercent(config.maxLossPerDayPercent?.toString() || "");
      setMaxConsecutiveLosses(config.maxConsecutiveLosses?.toString() || "");

      // Setup Types
      setSetupTypes(config.setupTypes || []);

      // Psychology
      setNoTradeRules(config.noTradeRules || []);
      setPreTradeChecklist(config.preTradeChecklist || []);
      setPostTradeReview(config.postTradeReview || []);
      setTradingPlan(config.tradingPlan || "");
      setTradingBeliefs(config.tradingBeliefs || []);
      setStrengthsToLeverage(config.strengthsToLeverage || []);
      setWeaknessesToManage(config.weaknessesToManage || []);
      setEmotionalTriggers(config.emotionalTriggers || []);
      setRecoveryStrategies(config.recoveryStrategies || []);

      // Reviews
      setWeeklyReviewDay(config.weeklyReviewDay ?? 0);
      setMonthlyReviewDay(config.monthlyReviewDay ?? 1);
      setReviewQuestions(config.reviewQuestions || []);
      setTradingMentors(config.tradingMentors || []);
      setKeyLessons(config.keyLessons || []);
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
      // Account
      accountBalance: accountBalance ? parseFloat(accountBalance) : null,
      accountCurrency: accountCurrency || "USD",
      maxDrawdownPercent: maxDrawdownPercent ? parseFloat(maxDrawdownPercent) : null,
      riskPerTradePercent: riskPerTradePercent ? parseFloat(riskPerTradePercent) : null,
      riskPerTradeAmount: riskPerTradeAmount ? parseFloat(riskPerTradeAmount) : null,
      brokerName: brokerName || null,
      // Goals
      monthlyPnlTarget: monthlyPnlTarget ? parseFloat(monthlyPnlTarget) : null,
      monthlyPnlTargetPercent: monthlyPnlTargetPercent ? parseFloat(monthlyPnlTargetPercent) : null,
      winRateTarget: winRateTarget ? parseFloat(winRateTarget) / 100 : null,
      averageRrTarget: averageRrTarget ? parseFloat(averageRrTarget) : null,
      maxTradesPerDay: maxTradesPerDay ? parseInt(maxTradesPerDay) : null,
      maxTradesPerWeek: maxTradesPerWeek ? parseInt(maxTradesPerWeek) : null,
      maxLossPerDay: maxLossPerDay ? parseFloat(maxLossPerDay) : null,
      maxLossPerDayPercent: maxLossPerDayPercent ? parseFloat(maxLossPerDayPercent) : null,
      maxConsecutiveLosses: maxConsecutiveLosses ? parseInt(maxConsecutiveLosses) : null,
      // Setup Types
      setupTypes: setupTypes.length > 0 ? setupTypes : null,
      // Psychology
      noTradeRules: noTradeRules.length > 0 ? noTradeRules : null,
      preTradeChecklist: preTradeChecklist.length > 0 ? preTradeChecklist : null,
      postTradeReview: postTradeReview.length > 0 ? postTradeReview : null,
      tradingPlan: tradingPlan || null,
      tradingBeliefs: tradingBeliefs.length > 0 ? tradingBeliefs : null,
      strengthsToLeverage: strengthsToLeverage.length > 0 ? strengthsToLeverage : null,
      weaknessesToManage: weaknessesToManage.length > 0 ? weaknessesToManage : null,
      emotionalTriggers: emotionalTriggers.length > 0 ? emotionalTriggers : null,
      recoveryStrategies: recoveryStrategies.length > 0 ? recoveryStrategies : null,
      // Reviews
      weeklyReviewDay,
      monthlyReviewDay,
      reviewQuestions: reviewQuestions.length > 0 ? reviewQuestions : null,
      tradingMentors: tradingMentors.length > 0 ? tradingMentors : null,
      keyLessons: keyLessons.length > 0 ? keyLessons : null,
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

  const addToList = (
    list: string[],
    setList: (items: string[]) => void,
    item: string
  ) => {
    if (!item.trim()) return;
    setList([...list, item.trim()]);
    setNewListItem("");
  };

  const removeFromList = (
    list: string[],
    setList: (items: string[]) => void,
    index: number
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  const addSetupType = () => {
    if (!newSetupName.trim()) return;
    const newSetup: SetupType = {
      name: newSetupName.trim(),
      description: newSetupDescription.trim(),
      validationRules: newSetupRules.split("\n").filter(r => r.trim()),
      riskRewardMin: parseFloat(newSetupRR) || 2,
    };
    setSetupTypes([...setupTypes, newSetup]);
    setNewSetupName("");
    setNewSetupDescription("");
    setNewSetupRules("");
    setNewSetupRR("2");
  };

  const removeSetupType = (index: number) => {
    setSetupTypes(setupTypes.filter((_, i) => i !== index));
  };

  const addKeyLesson = () => {
    if (!newListItem.trim()) return;
    const lesson: KeyLesson = {
      date: new Date().toISOString().split('T')[0],
      lesson: newListItem.trim(),
      context: "",
    };
    setKeyLessons([...keyLessons, lesson]);
    setNewListItem("");
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
      <Tabs defaultValue="context" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="psychology">Psychology</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* CONTEXT TAB */}
        <TabsContent value="context" className="space-y-6 mt-6">
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

          {/* Setup Types Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Setup Types Library
              </CardTitle>
              <CardDescription>
                Define your valid trade setups with validation rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setupTypes.length > 0 && (
                <div className="space-y-2">
                  {setupTypes.map((setup, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{setup.name}</p>
                          <p className="text-sm text-muted-foreground">{setup.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Min R:R = {setup.riskRewardMin} | Rules: {setup.validationRules.length}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSetupType(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Accordion type="single" collapsible>
                <AccordionItem value="add-setup">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Setup Type
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Setup Name</Label>
                        <Input
                          placeholder="e.g., OB Retest, FVG Fill"
                          value={newSetupName}
                          onChange={(e) => setNewSetupName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum R:R</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="1"
                          placeholder="2"
                          value={newSetupRR}
                          onChange={(e) => setNewSetupRR(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Brief description of this setup"
                        value={newSetupDescription}
                        onChange={(e) => setNewSetupDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Validation Rules (one per line)</Label>
                      <Textarea
                        placeholder="e.g.,&#10;HTF bias aligned&#10;Price at premium/discount&#10;Clean OB with imbalance"
                        value={newSetupRules}
                        onChange={(e) => setNewSetupRules(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <Button onClick={addSetupType} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Setup
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Account Management
              </CardTitle>
              <CardDescription>
                Configure your trading account details for position sizing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account Balance</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10000"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={accountCurrency} onValueChange={setAccountCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Broker Name</Label>
                  <Input
                    placeholder="e.g., OANDA, IC Markets"
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Drawdown %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 10"
                    value={maxDrawdownPercent}
                    onChange={(e) => setMaxDrawdownPercent(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Risk Per Trade
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Risk Per Trade (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      placeholder="1"
                      value={riskPerTradePercent}
                      onChange={(e) => setRiskPerTradePercent(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 0.5% - 2%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Or Fixed Amount</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 100"
                      value={riskPerTradeAmount}
                      onChange={(e) => setRiskPerTradeAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Override percentage with fixed amount
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GOALS TAB */}
        <TabsContent value="goals" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Goals
              </CardTitle>
              <CardDescription>
                Set targets to track your trading progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Monthly P&L Target ($)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 500"
                    value={monthlyPnlTarget}
                    onChange={(e) => setMonthlyPnlTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly P&L Target (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 5"
                    value={monthlyPnlTargetPercent}
                    onChange={(e) => setMonthlyPnlTargetPercent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Win Rate Target (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="e.g., 50"
                    value={winRateTarget}
                    onChange={(e) => setWinRateTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Average R:R Target</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="e.g., 2"
                    value={averageRrTarget}
                    onChange={(e) => setAverageRrTarget(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Trading Limits
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Max Trades Per Day</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 3"
                      value={maxTradesPerDay}
                      onChange={(e) => setMaxTradesPerDay(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Trades Per Week</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 10"
                      value={maxTradesPerWeek}
                      onChange={(e) => setMaxTradesPerWeek(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Consecutive Losses</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 2"
                      value={maxConsecutiveLosses}
                      onChange={(e) => setMaxConsecutiveLosses(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Loss Per Day ($)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 200"
                      value={maxLossPerDay}
                      onChange={(e) => setMaxLossPerDay(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Loss Per Day (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="e.g., 2"
                      value={maxLossPerDayPercent}
                      onChange={(e) => setMaxLossPerDayPercent(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Review Schedule
              </CardTitle>
              <CardDescription>
                When should the AI remind you to review?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Weekly Review Day</Label>
                  <Select
                    value={weeklyReviewDay.toString()}
                    onValueChange={(v) => setWeeklyReviewDay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Review Day</Label>
                  <Select
                    value={monthlyReviewDay.toString()}
                    onValueChange={(v) => setMonthlyReviewDay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PSYCHOLOGY TAB */}
        <TabsContent value="psychology" className="space-y-6 mt-6">
          {/* Trading Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Trading Plan & Beliefs
              </CardTitle>
              <CardDescription>
                Your trading philosophy and mental framework (Mark Douglas / Brett Steenbarger style)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trading Plan</Label>
                <Textarea
                  placeholder="Describe your overall trading plan and approach..."
                  value={tradingPlan}
                  onChange={(e) => setTradingPlan(e.target.value)}
                  rows={4}
                />
              </div>

              <ListManager
                title="Core Trading Beliefs"
                description="e.g., 'The market doesn't owe me anything', 'Every trade is just one in a series'"
                items={tradingBeliefs}
                setItems={setTradingBeliefs}
                placeholder="Add a belief..."
              />

              <ListManager
                title="Strengths to Leverage"
                description="What are you naturally good at?"
                items={strengthsToLeverage}
                setItems={setStrengthsToLeverage}
                placeholder="Add a strength..."
              />

              <ListManager
                title="Weaknesses to Manage"
                description="What do you need to watch out for?"
                items={weaknessesToManage}
                setItems={setWeaknessesToManage}
                placeholder="Add a weakness..."
              />
            </CardContent>
          </Card>

          {/* Emotional Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emotional Management
              </CardTitle>
              <CardDescription>
                Identify triggers and build recovery strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ListManager
                title="Emotional Triggers"
                description="What situations cause you to make bad decisions?"
                items={emotionalTriggers}
                setItems={setEmotionalTriggers}
                placeholder="Add a trigger..."
              />

              <ListManager
                title="Recovery Strategies"
                description="What helps you reset after a loss or emotional trade?"
                items={recoveryStrategies}
                setItems={setRecoveryStrategies}
                placeholder="Add a strategy..."
              />
            </CardContent>
          </Card>

          {/* Checklists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Trading Checklists
              </CardTitle>
              <CardDescription>
                Pre-trade and post-trade routines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ListManager
                title="No-Trade Rules"
                description="Conditions when you should NOT trade"
                items={noTradeRules}
                setItems={setNoTradeRules}
                placeholder="e.g., After 2 consecutive losses..."
              />

              <ListManager
                title="Pre-Trade Checklist"
                description="What to verify before entering a trade"
                items={preTradeChecklist}
                setItems={setPreTradeChecklist}
                placeholder="e.g., HTF bias confirmed..."
              />

              <ListManager
                title="Post-Trade Review Questions"
                description="What to ask yourself after each trade"
                items={postTradeReview}
                setItems={setPostTradeReview}
                placeholder="e.g., Did I follow my plan?"
              />
            </CardContent>
          </Card>

          {/* Key Lessons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Key Lessons Learned
              </CardTitle>
              <CardDescription>
                Important insights from your trading journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {keyLessons.length > 0 && (
                <div className="space-y-2">
                  {keyLessons.map((lesson, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm">{lesson.lesson}</p>
                        <p className="text-xs text-muted-foreground">{lesson.date}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setKeyLessons(keyLessons.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a key lesson..."
                  value={newListItem}
                  onChange={(e) => setNewListItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyLesson()}
                />
                <Button variant="outline" size="icon" onClick={addKeyLesson}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trading Mentors */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Mentors & Influences</CardTitle>
              <CardDescription>
                Traders whose wisdom you follow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListManager
                title=""
                items={tradingMentors}
                setItems={setTradingMentors}
                placeholder="e.g., Mark Douglas, Paul Tudor Jones..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="space-y-6 mt-6">
          {/* Custom Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Custom Instructions
              </CardTitle>
              <CardDescription>
                Advanced settings for your trading AI assistant
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
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}

// Helper component for managing lists
function ListManager({
  title,
  description,
  items,
  setItems,
  placeholder,
}: {
  title: string;
  description?: string;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, newItem.trim()]);
    setNewItem("");
  };

  return (
    <div className="space-y-2">
      {title && <Label>{title}</Label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {item}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              />
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button variant="outline" size="icon" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
