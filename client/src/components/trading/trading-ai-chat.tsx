import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus,
  MoreVertical,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import TradingAgentConfig from "./trading-agent-config";
import TradingKnowledgeManager from "./trading-knowledge-manager";

interface TradingChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface TradingConversation {
  id: string;
  userId: string;
  sessionId?: string;
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
  preferredModel: string | null;
  researchModel: string | null;
}

interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  description: string;
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

// Group sessions by date
function groupSessionsByDate(sessions: TradingChatSession[]) {
  const groups: { label: string; sessions: TradingChatSession[] }[] = [];
  const today: TradingChatSession[] = [];
  const yesterday: TradingChatSession[] = [];
  const thisWeek: TradingChatSession[] = [];
  const older: TradingChatSession[] = [];

  sessions.forEach((session) => {
    const date = new Date(session.updatedAt);
    if (isToday(date)) {
      today.push(session);
    } else if (isYesterday(date)) {
      yesterday.push(session);
    } else if (isThisWeek(date)) {
      thisWeek.push(session);
    } else {
      older.push(session);
    }
  });

  if (today.length) groups.push({ label: "Today", sessions: today });
  if (yesterday.length) groups.push({ label: "Yesterday", sessions: yesterday });
  if (thisWeek.length) groups.push({ label: "This Week", sessions: thisWeek });
  if (older.length) groups.push({ label: "Older", sessions: older });

  return groups;
}

export default function TradingAiChat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<TradingChatSession | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<TradingChatSession[]>({
    queryKey: ["/api/trading/chat/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/trading/chat/sessions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch chat sessions");
      return await res.json();
    },
  });

  // Fetch chat history for active session
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<TradingConversation[]>({
    queryKey: ["/api/trading/chat/history", activeSessionId],
    queryFn: async () => {
      const url = activeSessionId
        ? `/api/trading/chat/history?sessionId=${activeSessionId}`
        : "/api/trading/chat/history";
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return await res.json();
    },
    enabled: activeSessionId !== null || sessions.length === 0,
  });

  // Fetch agent config for custom quick actions
  const { data: agentConfig } = useQuery<TradingAgentConfigType>({
    queryKey: ["/api/trading/agent/config"],
    queryFn: async () => {
      const res = await fetch("/api/trading/agent/config", {
        credentials: "include",
      });
      if (!res.ok) return { quickActions: [], preferredModel: null, researchModel: null };
      return await res.json();
    },
  });

  // Fetch available AI models
  const { data: availableModels = [] } = useQuery<AvailableModel[]>({
    queryKey: ["/api/ai-models"],
    queryFn: async () => {
      const res = await fetch("/api/ai-models", { credentials: "include" });
      if (!res.ok) return [];
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

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (title?: string): Promise<TradingChatSession> => {
      const res = await apiRequest("POST", "/api/trading/chat/sessions", {
        title: title || "New Chat",
      });
      return await res.json();
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/sessions"],
      });
      setActiveSessionId(session.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    },
  });

  // Rename session mutation
  const renameSessionMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await apiRequest("PATCH", `/api/trading/chat/sessions/${id}`, {
        title,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/sessions"],
      });
      setRenameDialogOpen(false);
      setSessionToEdit(null);
      toast({
        title: "Success",
        description: "Chat renamed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to rename chat",
        variant: "destructive",
      });
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/trading/chat/sessions/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/sessions"],
      });
      if (sessionToEdit?.id === activeSessionId) {
        setActiveSessionId(null);
      }
      setDeleteDialogOpen(false);
      setSessionToEdit(null);
      toast({
        title: "Success",
        description: "Chat deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string): Promise<ChatResponse> => {
      const res = await apiRequest("POST", "/api/trading/chat", {
        message: messageText,
        sessionId: activeSessionId,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/history", activeSessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/sessions"],
      });
      setMessage("");

      // Auto-title the session with first message if it's a new chat
      const activeSession = sessions.find((s) => s.id === activeSessionId);
      if (activeSession?.title === "New Chat" && message.trim()) {
        const autoTitle = message.trim().slice(0, 50) + (message.length > 50 ? "..." : "");
        renameSessionMutation.mutate({ id: activeSessionId!, title: autoTitle });
      }

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
      const url = activeSessionId
        ? `/api/trading/chat/history?sessionId=${activeSessionId}`
        : "/api/trading/chat/history";
      const res = await apiRequest("DELETE", url, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trading/chat/history", activeSessionId],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;

    // If no active session, create one first
    if (!activeSessionId) {
      const session = await createSessionMutation.mutateAsync(message.trim().slice(0, 50));
      setActiveSessionId(session.id);
      // Wait a tick for state to update, then send message
      setTimeout(() => {
        sendMessageMutation.mutate(message.trim());
      }, 0);
    } else {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = async (prompt: string) => {
    if (sendMessageMutation.isPending) return;

    // If no active session, create one first
    if (!activeSessionId) {
      const session = await createSessionMutation.mutateAsync(prompt.slice(0, 50));
      setActiveSessionId(session.id);
      setTimeout(() => {
        sendMessageMutation.mutate(prompt);
      }, 0);
    } else {
      sendMessageMutation.mutate(prompt);
    }
  };

  const handleNewChat = () => {
    createSessionMutation.mutate();
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleRenameClick = (session: TradingChatSession) => {
    setSessionToEdit(session);
    setNewTitle(session.title);
    setRenameDialogOpen(true);
  };

  const handleDeleteClick = (session: TradingChatSession) => {
    setSessionToEdit(session);
    setDeleteDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (sessionToEdit && newTitle.trim()) {
      renameSessionMutation.mutate({ id: sessionToEdit.id, title: newTitle.trim() });
    }
  };

  const handleDeleteConfirm = () => {
    if (sessionToEdit) {
      deleteSessionMutation.mutate(sessionToEdit.id);
    }
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

  const sessionGroups = groupSessionsByDate(sessions);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const isLoading = isLoadingSessions || isLoadingMessages;

  // Get model display name
  const getModelDisplayName = (modelId: string | null | undefined) => {
    if (!modelId) return "Auto";
    const model = availableModels.find(m => m.id === modelId);
    return model?.name || modelId.split('/').pop() || "Auto";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        {/* Model Info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Chat: <span className="font-medium">{getModelDisplayName(agentConfig?.preferredModel)}</span></span>
          </div>
          {agentConfig?.researchModel && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs">Research: <span className="font-medium">{getModelDisplayName(agentConfig?.researchModel)}</span></span>
            </div>
          )}
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
          <div className="flex h-[550px] gap-2">
            {/* Sessions Sidebar */}
            <div
              className={`flex flex-col border rounded-lg bg-muted/30 transition-all ${
                sidebarCollapsed ? "w-10" : "w-56"
              }`}
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-2 border-b">
                {!sidebarCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2"
                    onClick={handleNewChat}
                    disabled={createSessionMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Sessions List */}
              {!sidebarCollapsed && (
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-3">
                    {sessionGroups.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No chats yet
                      </p>
                    ) : (
                      sessionGroups.map((group) => (
                        <div key={group.label}>
                          <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                            {group.label}
                          </p>
                          <div className="space-y-1">
                            {group.sessions.map((session) => (
                              <div
                                key={session.id}
                                className={`group flex items-center gap-1 rounded-md cursor-pointer ${
                                  session.id === activeSessionId
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <button
                                  className="flex-1 text-left px-2 py-1.5 text-sm truncate"
                                  onClick={() => handleSelectSession(session.id)}
                                >
                                  {session.title}
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleRenameClick(session)}>
                                      <Pencil className="h-3 w-3 mr-2" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteClick(session)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-2">
                <div className="text-sm font-medium truncate">
                  {activeSession?.title || "New Chat"}
                </div>
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

              {/* Messages */}
              <div className="flex-1 min-h-0">
                <Card className="h-full overflow-hidden">
                  <ScrollArea ref={scrollAreaRef} className="h-full p-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <Bot className="h-10 w-10 mx-auto mb-2 animate-pulse" />
                          <p className="text-sm">Loading...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                          <Sparkles className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="max-w-sm">
                          <h4 className="font-semibold mb-1">
                            {activeSessionId ? "Start the conversation" : "Start a new chat"}
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat name..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameSubmit();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={renameSessionMutation.isPending}>
              {renameSessionMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sessionToEdit?.title}"? This will permanently
              remove all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSessionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
