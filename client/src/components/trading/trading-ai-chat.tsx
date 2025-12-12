import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Send,
  Trash2,
  User,
  Sparkles,
  TrendingUp,
  BarChart3,
  FileText,
  BookOpen,
  Target,
  AlertTriangle,
  Settings,
  MessageSquare,
  Brain,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import TradingAgentConfig from "./trading-agent-config";
import TradingKnowledgeManager from "./trading-knowledge-manager";

interface TradingConversation {
  id: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    actionsTaken?: string[];
  };
  createdAt: string;
}

interface ChatResponse {
  response: string;
  actions: Array<{
    action: string;
    entityType?: string;
    entityId?: string;
    result: string;
  }>;
  model?: string;
  tokensUsed?: number;
}

interface TradingAgentConfigType {
  quickActions: Array<{ label: string; prompt: string }>;
}

const defaultQuickActions = [
  {
    label: "Trading Summary",
    prompt: "Give me a summary of my trading activity this week",
    icon: <BarChart3 className="h-3 w-3" />,
  },
  {
    label: "Performance Analysis",
    prompt: "Analyze my trading performance over the last 30 days",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  {
    label: "Today's Checklist",
    prompt: "What's the status of my trading checklist today?",
    icon: <Target className="h-3 w-3" />,
  },
  {
    label: "Review Strategies",
    prompt: "Show me my active trading strategies and their key rules",
    icon: <BookOpen className="h-3 w-3" />,
  },
];

export default function TradingAiChat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<TradingConversation[]>({
    queryKey: ["/api/trading/chat/history"],
    queryFn: async () => {
      const res = await fetch("/api/trading/chat/history", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return await res.json();
    },
  });

  // Fetch agent config for custom quick actions
  const { data: agentConfig } = useQuery<TradingAgentConfigType>({
    queryKey: ["/api/trading/agent/config"],
    queryFn: async () => {
      const res = await fetch("/api/trading/agent/config", {
        credentials: "include",
      });
      if (!res.ok) return { quickActions: [] };
      return await res.json();
    },
  });

  // Get quick actions - use custom ones if set, otherwise defaults
  const quickActions = agentConfig?.quickActions?.length
    ? agentConfig.quickActions.map((a, i) => ({
        ...a,
        icon: defaultQuickActions[i % defaultQuickActions.length]?.icon || <Target className="h-3 w-3" />,
      }))
    : defaultQuickActions;

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatResponse> => {
      const res = await apiRequest("POST", "/api/trading/chat", {
        message,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/history"],
      });
      setMessage("");

      // Show toast for actions taken
      if (data.actions && data.actions.length > 0) {
        const successActions = data.actions.filter((a) => a.result === "success");
        if (successActions.length > 0) {
          toast({
            title: "Actions Completed",
            description: `${successActions.length} action(s) executed successfully`,
          });
        }
      }

      // Scroll to bottom
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Clear chat mutation
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/trading/chat/history", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/history"],
      });
      toast({
        title: "Success",
        description: "Chat history cleared",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(prompt);
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus textarea when switching to chat tab
  useEffect(() => {
    if (activeTab === "chat") {
      textareaRef.current?.focus();
    }
  }, [activeTab]);

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes("trade") || action.includes("log"))
      return <TrendingUp className="h-3 w-3" />;
    if (action.includes("journal") || action.includes("session"))
      return <BookOpen className="h-3 w-3" />;
    if (action.includes("strategy"))
      return <Target className="h-3 w-3" />;
    if (action.includes("doc"))
      return <FileText className="h-3 w-3" />;
    if (action.includes("analyze") || action.includes("performance"))
      return <BarChart3 className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold">Trading AI Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Analyze performance, log trades, review strategies
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-4">
          <div className="flex flex-col h-[550px]">
            {/* Chat Header */}
            <div className="flex items-center justify-end pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearChatMutation.mutate()}
                disabled={clearChatMutation.isPending || messages.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 min-h-0">
              <Card className="h-full overflow-hidden">
                <ScrollArea ref={scrollAreaRef} className="h-full p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <Bot className="h-10 w-10 mx-auto mb-2 animate-pulse" />
                        <p className="text-sm">Loading chat history...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                        <Sparkles className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="max-w-sm">
                        <h4 className="font-semibold mb-1">
                          Your Trading AI Assistant
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          I can help you analyze performance, review strategies, log trades,
                          and maintain trading discipline.
                        </p>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 justify-center">
                          {quickActions.slice(0, 4).map((action, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickAction(action.prompt)}
                              disabled={sendMessageMutation.isPending}
                              className="gap-1"
                            >
                              {action.icon}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words text-sm">
                              {msg.content}
                            </div>

                            {/* Show actions taken */}
                            {msg.metadata?.actionsTaken &&
                              msg.metadata.actionsTaken.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <div className="flex flex-wrap gap-1">
                                    {msg.metadata.actionsTaken.map((action, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {getActionIcon(action)}
                                        <span className="ml-1">{action}</span>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                            <div
                              className={`text-xs mt-1 ${
                                msg.role === "user"
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </div>
                          </div>
                          {msg.role === "user" && (
                            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {sendMessageMutation.isPending && (
                        <div className="flex gap-3 justify-start">
                          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                          </div>
                          <div className="rounded-lg px-3 py-2 bg-muted">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div
                                  className="h-2 w-2 bg-amber-600 dark:bg-amber-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                  className="h-2 w-2 bg-amber-600 dark:bg-amber-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                  className="h-2 w-2 bg-amber-600 dark:bg-amber-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Analyzing...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>

            {/* Input Area */}
            <div className="pt-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask about your trading performance, strategies, or log a trade..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="min-h-[44px] max-h-[120px] resize-none"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-[44px] w-[44px] flex-shrink-0"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-1">
                Press{" "}
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded border">Enter</kbd>{" "}
                to send
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="mt-4">
          <TradingKnowledgeManager />
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4">
          <TradingAgentConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
