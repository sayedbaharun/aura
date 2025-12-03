import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import type {
  TradingStrategy,
  DailyTradingChecklist,
  DailyTradingChecklistData,
  TradingChecklistSection,
  TradingChecklistItem,
} from "@shared/schema";
import { cn } from "@/lib/utils";
import StrategySessionSelector from "./strategy-session-selector";
import { PRE_TRADE_MENTAL_CLEARING } from "./trading-constants";

interface Trade {
  id: string;
  time: string;
  pair: string;
  direction: "long" | "short";
  entryPrice: string;
  stopLoss: string;
  takeProfit?: string;
  result?: "win" | "loss" | "breakeven" | "pending";
  pnl?: number;
  notes?: string;
}

export default function TradingStrategyDashboard() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  // Fetch all strategies
  const { data: strategies = [], isLoading: strategiesLoading } = useQuery<TradingStrategy[]>({
    queryKey: ["/api/trading-strategies"],
  });

  // Fetch all of today's checklists (supports multiple strategies per day)
  const { data: todayChecklists = [], isLoading: checklistLoading, error: checklistError } = useQuery<DailyTradingChecklist[]>({
    queryKey: ["/api/trading-checklists/today"],
    retry: false,
  });

  // Local state for selected checklist and editing
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [checklistData, setChecklistData] = useState<DailyTradingChecklistData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    direction: "long",
    result: "pending",
  });

  // Get the currently selected checklist
  const selectedChecklist = todayChecklists.find((c) => c.id === selectedChecklistId);

  // Get the current strategy
  const currentStrategy = strategies.find((s) => s.id === selectedChecklist?.strategyId);

  // Auto-select the first checklist when checklists load
  useEffect(() => {
    if (todayChecklists.length > 0 && !selectedChecklistId) {
      setSelectedChecklistId(todayChecklists[0].id);
    }
  }, [todayChecklists, selectedChecklistId]);

  // Initialize local state when selected checklist changes
  useEffect(() => {
    if (selectedChecklist?.data) {
      setChecklistData(selectedChecklist.data);
      // Expand all sections by default (including Pre-Trade Mental Clearing)
      const expanded: Record<string, boolean> = {
        [PRE_TRADE_MENTAL_CLEARING.id]: true,
      };
      if (currentStrategy?.config?.sections) {
        currentStrategy.config.sections.forEach((section) => {
          expanded[section.id] = true;
        });
      }
      setExpandedSections(expanded);
    } else {
      setChecklistData(null);
    }
  }, [selectedChecklist, currentStrategy]);

  // Mutation to update checklist
  const updateChecklistMutation = useMutation({
    mutationFn: async (data: Partial<DailyTradingChecklistData>) => {
      if (!selectedChecklist) return;
      const updatedData = { ...checklistData, ...data };
      return apiRequest("PATCH", `/api/trading-checklists/${selectedChecklist.id}`, { data: updatedData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-checklists/today"] });
    },
  });

  // Mutation to create a new checklist session
  const createChecklistMutation = useMutation({
    mutationFn: async ({ strategyId, instrument }: { strategyId: string; instrument?: string }) => {
      const response = await apiRequest("POST", "/api/trading-checklists", {
        date: today,
        strategyId,
        instrument,
      });
      return response.json();
    },
    onSuccess: (newChecklist: DailyTradingChecklist) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-checklists/today"] });
      setSelectedChecklistId(newChecklist.id);
    },
  });

  // Mutation to delete a checklist session
  const deleteChecklistMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      return apiRequest("DELETE", `/api/trading-checklists/${checklistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-checklists/today"] });
      // Select the first remaining checklist
      setSelectedChecklistId(null);
    },
  });

  // State for error messages
  const [seedError, setSeedError] = useState<string | null>(null);

  // Mutation to seed strategies - defined here to follow React hooks rules
  const seedStrategiesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trading-strategies/seed");
      return response.json();
    },
    onSuccess: () => {
      setSeedError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/trading-strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-checklists/today"] });
    },
    onError: (error: Error) => {
      setSeedError(error.message || "Failed to load strategy. Please try again.");
    },
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Handle checkbox change
  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    if (!checklistData) return;
    const newValues = {
      ...checklistData.values,
      [itemId]: { ...checklistData.values[itemId], checked },
    };
    setChecklistData({ ...checklistData, values: newValues });
    updateChecklistMutation.mutate({ values: newValues });
  };

  // Handle text/number input change
  const handleInputChange = (itemId: string, value: string | number) => {
    if (!checklistData) return;
    const newValues = {
      ...checklistData.values,
      [itemId]: { ...checklistData.values[itemId], value },
    };
    setChecklistData({ ...checklistData, values: newValues });
  };

  // Save input on blur
  const handleInputBlur = () => {
    if (!checklistData) return;
    updateChecklistMutation.mutate({ values: checklistData.values });
  };

  // Handle session change
  const handleSessionChange = (session: string) => {
    if (!checklistData) return;
    const updated = { ...checklistData, session: session as any };
    setChecklistData(updated);
    updateChecklistMutation.mutate({ session: session as any });
  };

  // Handle mental state change
  const handleMentalStateChange = (value: string) => {
    if (!checklistData) return;
    const mentalState = parseInt(value) || undefined;
    const updated = { ...checklistData, mentalState };
    setChecklistData(updated);
    updateChecklistMutation.mutate({ mentalState });
  };

  // Handle high impact news change
  const handleNewsChange = (value: string) => {
    if (!checklistData) return;
    const updated = { ...checklistData, highImpactNews: value };
    setChecklistData(updated);
  };

  // Add trade
  const handleAddTrade = () => {
    if (!checklistData || !newTrade.pair || !newTrade.entryPrice || !newTrade.stopLoss) return;

    const trade: Trade = {
      id: crypto.randomUUID(),
      time: format(new Date(), "HH:mm"),
      pair: newTrade.pair,
      direction: newTrade.direction || "long",
      entryPrice: newTrade.entryPrice,
      stopLoss: newTrade.stopLoss,
      takeProfit: newTrade.takeProfit,
      result: "pending",
    };

    const trades = [...(checklistData.trades || []), trade];
    setChecklistData({ ...checklistData, trades });
    updateChecklistMutation.mutate({ trades });
    setNewTrade({ direction: "long", result: "pending" });
  };

  // Update trade result
  const handleTradeResultChange = (tradeId: string, result: string) => {
    if (!checklistData) return;
    const trades = checklistData.trades.map((t) =>
      t.id === tradeId ? { ...t, result: result as Trade["result"] } : t
    );
    setChecklistData({ ...checklistData, trades });
    updateChecklistMutation.mutate({ trades });
  };

  // Delete trade
  const handleDeleteTrade = (tradeId: string) => {
    if (!checklistData) return;
    const trades = checklistData.trades.filter((t) => t.id !== tradeId);
    setChecklistData({ ...checklistData, trades });
    updateChecklistMutation.mutate({ trades });
  };

  // Handle end of session review
  const handleReviewChange = (field: string, value: any) => {
    if (!checklistData) return;
    const currentReview = checklistData.endOfSessionReview || { followedPlan: false };
    const endOfSessionReview = {
      ...currentReview,
      [field]: value,
    };
    const updated: DailyTradingChecklistData = { ...checklistData, endOfSessionReview };
    setChecklistData(updated);
  };

  // Toggle section
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Calculate checklist completion percentage (includes Pre-Trade Mental Clearing + strategy sections)
  const calculateCompletion = () => {
    if (!checklistData) return 0;
    let total = 0;
    let completed = 0;

    // Count Pre-Trade Mental Clearing items (universal)
    PRE_TRADE_MENTAL_CLEARING.items.forEach((item) => {
      if (item.type === "checkbox") {
        total++;
        if (checklistData.values[item.id]?.checked) {
          completed++;
        }
      }
    });

    // Count strategy-specific items
    if (currentStrategy?.config?.sections) {
      currentStrategy.config.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.type === "checkbox") {
            total++;
            if (checklistData.values[item.id]?.checked) {
              completed++;
            }
          }
        });
      });
    }

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // Group items by category within a section
  const groupItemsByCategory = (items: TradingChecklistItem[]) => {
    const grouped: Record<string, TradingChecklistItem[]> = {};
    const uncategorized: TradingChecklistItem[] = [];

    items.forEach((item) => {
      if (item.category) {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      } else {
        uncategorized.push(item);
      }
    });

    return { grouped, uncategorized };
  };

  if (strategiesLoading || checklistLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  // No strategies available
  if (strategies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trading Strategies</h3>
          <p className="text-muted-foreground mb-4">
            Load the "Golden Trap & Reverse" strategy to get started.
          </p>
          {seedError && (
            <p className="text-red-500 text-sm mb-4">
              {seedError}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => {
                setSeedError(null);
                seedStrategiesMutation.mutate();
              }}
              disabled={seedStrategiesMutation.isPending}
            >
              {seedStrategiesMutation.isPending ? (
                "Setting up tables & loading strategy..."
              ) : seedError ? (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Retry
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Load Golden Trap Strategy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No checklists for today - show option to create one
  if (todayChecklists.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trading Sessions Today</h3>
          <p className="text-muted-foreground mb-4">
            Start a new trading session by selecting a strategy.
          </p>
          <StrategySessionSelector
            strategies={strategies}
            todayChecklists={todayChecklists}
            selectedChecklistId={null}
            onSelectChecklist={() => {}}
            onCreateSession={(strategyId, instrument) => {
              createChecklistMutation.mutate({ strategyId, instrument });
            }}
            onDeleteSession={() => {}}
            isCreating={createChecklistMutation.isPending}
          />
        </CardContent>
      </Card>
    );
  }

  if (!checklistData || !currentStrategy) {
    return (
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
    );
  }

  const completionPercentage = calculateCompletion();
  const isSaving = updateChecklistMutation.isPending;
  const lastSaved = selectedChecklist?.updatedAt ? new Date(selectedChecklist.updatedAt) : null;

  // Manual save function
  const handleManualSave = () => {
    if (!checklistData) return;
    updateChecklistMutation.mutate({
      values: checklistData.values,
      trades: checklistData.trades,
      session: checklistData.session,
      mentalState: checklistData.mentalState,
      highImpactNews: checklistData.highImpactNews,
      endOfSessionReview: checklistData.endOfSessionReview,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Strategy Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            {/* Strategy Session Selector Row */}
            <div className="flex items-center justify-between">
              <StrategySessionSelector
                strategies={strategies}
                todayChecklists={todayChecklists}
                selectedChecklistId={selectedChecklistId}
                onSelectChecklist={(checklist) => setSelectedChecklistId(checklist.id)}
                onCreateSession={(strategyId, instrument) => {
                  createChecklistMutation.mutate({ strategyId, instrument });
                }}
                onDeleteSession={(checklistId) => {
                  deleteChecklistMutation.mutate(checklistId);
                }}
                isCreating={createChecklistMutation.isPending}
              />
              <div className="flex items-center gap-3">
                {/* Save Status */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Saved</span>
                    </>
                  ) : null}
                </div>
                <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                  {completionPercentage}% Complete
                </Badge>
                <Button
                  size="sm"
                  onClick={handleManualSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Strategy Info Row */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {currentStrategy.name}
                  {checklistData.instrument && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({checklistData.instrument})
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{todayFormatted}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Daily Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Session</Label>
              <Select
                value={checklistData.session || ""}
                onValueChange={handleSessionChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="new_york">New York</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mental State (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={checklistData.mentalState || ""}
                onChange={(e) => handleMentalStateChange(e.target.value)}
                onBlur={handleInputBlur}
                placeholder="Rate 1-10"
              />
            </div>
            <div className="space-y-2">
              <Label>High Impact News Today</Label>
              <Input
                value={checklistData.highImpactNews || ""}
                onChange={(e) => handleNewsChange(e.target.value)}
                onBlur={handleInputBlur}
                placeholder="USD news, etc."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pre-Trade Mental Clearing (Universal - same for all strategies) */}
      <Card>
        <Collapsible
          open={expandedSections[PRE_TRADE_MENTAL_CLEARING.id] ?? true}
          onOpenChange={() => toggleSection(PRE_TRADE_MENTAL_CLEARING.id)}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{PRE_TRADE_MENTAL_CLEARING.icon}</span>
                  {PRE_TRADE_MENTAL_CLEARING.title}
                  <Badge variant="outline" className="text-xs ml-2">Universal</Badge>
                </CardTitle>
                {expandedSections[PRE_TRADE_MENTAL_CLEARING.id] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              {PRE_TRADE_MENTAL_CLEARING.description && (
                <CardDescription>{PRE_TRADE_MENTAL_CLEARING.description}</CardDescription>
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              {PRE_TRADE_MENTAL_CLEARING.items.map((item) => (
                <ChecklistItemComponent
                  key={item.id}
                  item={item}
                  value={checklistData.values[item.id]}
                  onCheckChange={handleCheckboxChange}
                  onInputChange={handleInputChange}
                  onBlur={handleInputBlur}
                />
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Strategy-Specific Checklist Sections */}
      {currentStrategy.config?.sections?.map((section) => {
        const { grouped, uncategorized } = groupItemsByCategory(section.items);
        const isExpanded = expandedSections[section.id] ?? true;

        return (
          <Card key={section.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {section.icon && <span>{section.icon}</span>}
                      {section.title}
                    </CardTitle>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  {section.description && (
                    <CardDescription>{section.description}</CardDescription>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Render uncategorized items first */}
                  {uncategorized.length > 0 && (
                    <div className="space-y-3">
                      {uncategorized.map((item) => (
                        <ChecklistItemComponent
                          key={item.id}
                          item={item}
                          value={checklistData.values[item.id]}
                          onCheckChange={handleCheckboxChange}
                          onInputChange={handleInputChange}
                          onBlur={handleInputBlur}
                        />
                      ))}
                    </div>
                  )}

                  {/* Render categorized items */}
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">
                        {category}
                      </h4>
                      {items.map((item) => (
                        <ChecklistItemComponent
                          key={item.id}
                          item={item}
                          value={checklistData.values[item.id]}
                          onCheckChange={handleCheckboxChange}
                          onInputChange={handleInputChange}
                          onBlur={handleInputBlur}
                        />
                      ))}
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Trade Execution Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trade Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Trade Form */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Input
              placeholder="Pair (XAU/USD)"
              value={newTrade.pair || ""}
              onChange={(e) => setNewTrade({ ...newTrade, pair: e.target.value })}
            />
            <Select
              value={newTrade.direction}
              onValueChange={(v) => setNewTrade({ ...newTrade, direction: v as "long" | "short" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Entry Price"
              value={newTrade.entryPrice || ""}
              onChange={(e) => setNewTrade({ ...newTrade, entryPrice: e.target.value })}
            />
            <Input
              placeholder="Stop Loss"
              value={newTrade.stopLoss || ""}
              onChange={(e) => setNewTrade({ ...newTrade, stopLoss: e.target.value })}
            />
            <Input
              placeholder="Take Profit"
              value={newTrade.takeProfit || ""}
              onChange={(e) => setNewTrade({ ...newTrade, takeProfit: e.target.value })}
            />
            <Button onClick={handleAddTrade} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Trades Table */}
          {checklistData.trades && checklistData.trades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklistData.trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{trade.time}</TableCell>
                    <TableCell>{trade.pair}</TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === "long" ? "default" : "destructive"}>
                        {trade.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>{trade.entryPrice}</TableCell>
                    <TableCell>{trade.stopLoss}</TableCell>
                    <TableCell>{trade.takeProfit || "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={trade.result || "pending"}
                        onValueChange={(v) => handleTradeResultChange(trade.id, v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="win">Win</SelectItem>
                          <SelectItem value="loss">Loss</SelectItem>
                          <SelectItem value="breakeven">BE</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTrade(trade.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trades logged today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* End of Session Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            End of Session Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="followed-plan"
              checked={checklistData.endOfSessionReview?.followedPlan || false}
              onCheckedChange={(checked) => {
                handleReviewChange("followedPlan", checked);
                updateChecklistMutation.mutate({
                  endOfSessionReview: {
                    ...checklistData.endOfSessionReview,
                    followedPlan: checked as boolean,
                  },
                });
              }}
            />
            <Label htmlFor="followed-plan" className="font-medium">
              Did I follow the plan 100%?
            </Label>
          </div>
          <div className="space-y-2">
            <Label>One thing I did well:</Label>
            <Textarea
              value={checklistData.endOfSessionReview?.didWell || ""}
              onChange={(e) => handleReviewChange("didWell", e.target.value)}
              onBlur={() =>
                updateChecklistMutation.mutate({
                  endOfSessionReview: checklistData.endOfSessionReview,
                })
              }
              placeholder="What went right today?"
            />
          </div>
          <div className="space-y-2">
            <Label>One thing to improve tomorrow:</Label>
            <Textarea
              value={checklistData.endOfSessionReview?.toImprove || ""}
              onChange={(e) => handleReviewChange("toImprove", e.target.value)}
              onBlur={() =>
                updateChecklistMutation.mutate({
                  endOfSessionReview: checklistData.endOfSessionReview,
                })
              }
              placeholder="What can I do better?"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Checklist Item Component
interface ChecklistItemComponentProps {
  item: TradingChecklistItem;
  value?: { checked?: boolean; value?: string | number };
  onCheckChange: (itemId: string, checked: boolean) => void;
  onInputChange: (itemId: string, value: string | number) => void;
  onBlur: () => void;
}

function ChecklistItemComponent({
  item,
  value,
  onCheckChange,
  onInputChange,
  onBlur,
}: ChecklistItemComponentProps) {
  switch (item.type) {
    case "checkbox":
      return (
        <div className="flex items-start gap-3">
          <Checkbox
            id={item.id}
            checked={value?.checked || false}
            onCheckedChange={(checked) => onCheckChange(item.id, checked as boolean)}
          />
          <div className="space-y-1">
            <Label
              htmlFor={item.id}
              className={cn(
                "font-normal cursor-pointer",
                value?.checked && "line-through text-muted-foreground"
              )}
            >
              {item.label}
            </Label>
            {item.description && (
              <p className="text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <Label>{item.label}</Label>
          <Input
            value={(value?.value as string) || ""}
            onChange={(e) => onInputChange(item.id, e.target.value)}
            onBlur={onBlur}
            placeholder={item.placeholder}
          />
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label>{item.label}</Label>
          <Input
            type="number"
            value={(value?.value as number) || ""}
            onChange={(e) => onInputChange(item.id, parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            placeholder={item.placeholder}
          />
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label>{item.label}</Label>
          <Select
            value={(value?.value as string) || ""}
            onValueChange={(v) => {
              onInputChange(item.id, v);
              onBlur();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={item.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {item.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
