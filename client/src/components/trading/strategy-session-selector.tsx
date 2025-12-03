import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Target,
  ChevronDown,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import type { TradingStrategy, DailyTradingChecklist } from "@shared/schema";
import { cn } from "@/lib/utils";

interface StrategySessionSelectorProps {
  strategies: TradingStrategy[];
  todayChecklists: DailyTradingChecklist[];
  selectedChecklistId: string | null;
  onSelectChecklist: (checklist: DailyTradingChecklist) => void;
  onCreateSession: (strategyId: string, instrument?: string) => void;
  onDeleteSession: (checklistId: string) => void;
  isCreating: boolean;
}

export default function StrategySessionSelector({
  strategies,
  todayChecklists,
  selectedChecklistId,
  onSelectChecklist,
  onCreateSession,
  onDeleteSession,
  isCreating,
}: StrategySessionSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [instrument, setInstrument] = useState<string>("");

  // Get the currently selected checklist
  const selectedChecklist = todayChecklists.find(c => c.id === selectedChecklistId);
  const selectedStrategy = selectedChecklist
    ? strategies.find(s => s.id === selectedChecklist.strategyId)
    : null;

  const handleCreateSession = () => {
    if (!selectedStrategyId) return;
    onCreateSession(selectedStrategyId, instrument || undefined);
    setIsDialogOpen(false);
    setSelectedStrategyId("");
    setInstrument("");
  };

  // Get available strategies (ones not already used today)
  const usedStrategyIds = new Set(todayChecklists.map(c => c.strategyId));
  const availableStrategies = strategies.filter(s => s.isActive);

  if (strategies.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Strategy Session Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            {selectedChecklist ? (
              <span className="max-w-[200px] truncate">
                {selectedChecklist.data.strategyName}
                {selectedChecklist.data.instrument && (
                  <span className="text-muted-foreground ml-1">
                    ({selectedChecklist.data.instrument})
                  </span>
                )}
              </span>
            ) : todayChecklists.length > 0 ? (
              "Select Session"
            ) : (
              "No Sessions Today"
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          {todayChecklists.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Today's Sessions
              </div>
              {todayChecklists.map((checklist) => {
                const strategy = strategies.find(s => s.id === checklist.strategyId);
                const isSelected = checklist.id === selectedChecklistId;
                return (
                  <DropdownMenuItem
                    key={checklist.id}
                    className={cn(
                      "flex items-center justify-between",
                      isSelected && "bg-muted"
                    )}
                    onSelect={() => onSelectChecklist(checklist)}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-500" />
                      <div className="flex flex-col">
                        <span>{checklist.data.strategyName}</span>
                        {checklist.data.instrument && (
                          <span className="text-xs text-muted-foreground">
                            {checklist.data.instrument}
                          </span>
                        )}
                      </div>
                    </div>
                    {checklist.data.trades?.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {checklist.data.trades.length} trades
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsDialogOpen(true);
            }}
            className="text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Strategy Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Badge showing session count */}
      {todayChecklists.length > 1 && (
        <Badge variant="outline">
          {todayChecklists.length} sessions
        </Badge>
      )}

      {/* Delete current session button */}
      {selectedChecklist && todayChecklists.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm("Delete this strategy session?")) {
              onDeleteSession(selectedChecklist.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Create Session Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Strategy Session</DialogTitle>
            <DialogDescription>
              Create a new trading session with a specific strategy and optional instrument.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {availableStrategies.map((strategy) => {
                    const isUsedToday = usedStrategyIds.has(strategy.id);
                    return (
                      <SelectItem
                        key={strategy.id}
                        value={strategy.id}
                        disabled={isUsedToday}
                      >
                        <div className="flex items-center gap-2">
                          <span>{strategy.name}</span>
                          {isUsedToday && (
                            <Badge variant="secondary" className="text-xs">
                              Already in use
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instrument (optional)</Label>
              <Input
                placeholder="e.g., XAU/USD, XAG/USD"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specify which instrument you're trading with this strategy
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={!selectedStrategyId || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
