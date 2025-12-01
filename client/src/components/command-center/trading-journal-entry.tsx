import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Brain,
  AlertCircle,
  Smile,
  Frown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Day } from "@shared/schema";

interface TradingSession {
  id: string;
  timestamp: string;
  sessionName: string;
  pnl: number;
  notes: string;
  lessons: string;
  emotionalState: "calm" | "anxious" | "confident" | "frustrated";
}

interface TradingJournalEntryProps {
  day: Day | null;
}

const emotionalStates = [
  { value: "calm", label: "Calm", icon: Smile, color: "text-green-500" },
  { value: "confident", label: "Confident", icon: TrendingUp, color: "text-blue-500" },
  { value: "anxious", label: "Anxious", icon: AlertCircle, color: "text-yellow-500" },
  { value: "frustrated", label: "Frustrated", icon: Frown, color: "text-red-500" },
] as const;

export default function TradingJournalEntry({ day }: TradingJournalEntryProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [pnl, setPnl] = useState("");
  const [notes, setNotes] = useState("");
  const [lessons, setLessons] = useState("");
  const [emotionalState, setEmotionalState] = useState<TradingSession["emotionalState"]>("calm");

  const sessions: TradingSession[] = day?.tradingJournal?.sessions || [];
  const totalPnl = sessions.reduce((sum, s) => sum + (s.pnl || 0), 0);

  const updateMutation = useMutation({
    mutationFn: async (updatedJournal: { sessions: TradingSession[] }) => {
      if (!day?.date) return;
      const res = await apiRequest("PATCH", `/api/days/${day.date}`, { tradingJournal: updatedJournal });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["days"] });
      setOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSessionName("");
    setPnl("");
    setNotes("");
    setLessons("");
    setEmotionalState("calm");
  };

  const handleAddSession = () => {
    const newSession: TradingSession = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      sessionName: sessionName || "Trading Session",
      pnl: parseFloat(pnl) || 0,
      notes,
      lessons,
      emotionalState,
    };

    updateMutation.mutate({
      sessions: [...sessions, newSession],
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    updateMutation.mutate({
      sessions: sessions.filter((s) => s.id !== sessionId),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Trading Journal
          </CardTitle>
          <div className="flex items-center gap-3">
            {sessions.length > 0 && (
              <span
                className={cn(
                  "text-lg font-bold",
                  totalPnl > 0 ? "text-green-500" : totalPnl < 0 ? "text-red-500" : "text-muted-foreground"
                )}
              >
                {totalPnl > 0 ? "+" : ""}${totalPnl.toFixed(2)}
              </span>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Trading Session</DialogTitle>
                  <DialogDescription className="sr-only">Record details of your trading session including P&L and lessons</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Session Name
                    </label>
                    <Input
                      placeholder="e.g., Morning scalp, London open..."
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      P&L ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={pnl}
                      onChange={(e) => setPnl(e.target.value)}
                      className={cn(
                        parseFloat(pnl) > 0 && "border-green-500 focus-visible:ring-green-500",
                        parseFloat(pnl) < 0 && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Emotional State
                    </label>
                    <Select
                      value={emotionalState}
                      onValueChange={(v) => setEmotionalState(v as TradingSession["emotionalState"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {emotionalStates.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            <div className="flex items-center gap-2">
                              <state.icon className={cn("h-4 w-4", state.color)} />
                              {state.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Notes
                    </label>
                    <Textarea
                      placeholder="What happened during this session..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Lessons Learned
                    </label>
                    <Textarea
                      placeholder="What did you learn? What would you do differently?"
                      value={lessons}
                      onChange={(e) => setLessons(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleAddSession}
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Session"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No trading sessions logged today
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const stateInfo = emotionalStates.find((s) => s.value === session.emotionalState);
              const StateIcon = stateInfo?.icon || Smile;
              return (
                <div
                  key={session.id}
                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.sessionName}</span>
                      <StateIcon className={cn("h-4 w-4", stateInfo?.color)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-bold",
                          session.pnl > 0 ? "text-green-500" : session.pnl < 0 ? "text-red-500" : ""
                        )}
                      >
                        {session.pnl > 0 ? (
                          <TrendingUp className="inline h-3 w-3 mr-1" />
                        ) : session.pnl < 0 ? (
                          <TrendingDown className="inline h-3 w-3 mr-1" />
                        ) : null}
                        {session.pnl > 0 ? "+" : ""}${session.pnl.toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  {session.lessons && (
                    <p className="text-sm text-muted-foreground">
                      💡 {session.lessons}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
