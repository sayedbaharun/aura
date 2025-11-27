import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Trash2,
  User,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  FileText,
  ListTodo,
  FolderKanban,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VentureConversation {
  id: string;
  ventureId: string;
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

interface QuickAction {
  label: string;
  prompt: string;
}

interface VentureAiChatProps {
  ventureId: string;
  ventureName: string;
  quickActions?: QuickAction[];
}

export default function VentureAiChat({
  ventureId,
  ventureName,
  quickActions = [],
}: VentureAiChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<VentureConversation[]>({
    queryKey: [`/api/ventures/${ventureId}/chat/history`],
    queryFn: async () => {
      const res = await fetch(`/api/ventures/${ventureId}/chat/history`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return await res.json();
    },
  });

  // Fetch context status
  const { data: contextStatus } = useQuery({
    queryKey: [`/api/ventures/${ventureId}/ai/context-status`],
    queryFn: async () => {
      const res = await fetch(`/api/ventures/${ventureId}/ai/context-status`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return await res.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatResponse> => {
      const res = await apiRequest("POST", `/api/ventures/${ventureId}/chat`, {
        message,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/ventures/${ventureId}/chat/history`],
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
      const res = await apiRequest(
        "DELETE",
        `/api/ventures/${ventureId}/chat/history`,
        {}
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/ventures/${ventureId}/chat/history`],
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

  // Rebuild context mutation
  const rebuildContextMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/ventures/${ventureId}/ai/rebuild-context`,
        {}
      );
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/ventures/${ventureId}/ai/context-status`],
      });
      toast({
        title: "Context Rebuilt",
        description: `Knowledge base refreshed (~${data.estimatedTokens} tokens)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to rebuild context",
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

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes("task")) return <ListTodo className="h-3 w-3" />;
    if (action.includes("doc") || action.includes("document"))
      return <FileText className="h-3 w-3" />;
    if (action.includes("project")) return <FolderKanban className="h-3 w-3" />;
    return <Zap className="h-3 w-3" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold">{ventureName} AI Agent</h3>
            <p className="text-xs text-muted-foreground">
              {contextStatus?.hasCachedContext ? (
                contextStatus.isStale ? (
                  <span className="text-amber-600">Context needs refresh</span>
                ) : (
                  <span className="text-green-600">
                    Knowledge base loaded (~{contextStatus.tokenCount || 0} tokens)
                  </span>
                )
              ) : (
                "No cached context"
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => rebuildContextMutation.mutate()}
            disabled={rebuildContextMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${
                rebuildContextMutation.isPending ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearChatMutation.mutate()}
            disabled={clearChatMutation.isPending || messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 py-4 min-h-0">
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
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="max-w-sm">
                  <h4 className="font-semibold mb-1">
                    Ask me anything about {ventureName}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    I can help you manage tasks, search documents, create projects,
                    and more.
                  </p>

                  {/* Quick Actions */}
                  {quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickActions.slice(0, 4).map((action, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(action.prompt)}
                          disabled={sendMessageMutation.isPending}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Default quick actions if none provided */}
                  {quickActions.length === 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuickAction("What's the current status of this venture?")
                        }
                        disabled={sendMessageMutation.isPending}
                      >
                        Status Overview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuickAction("List my pending high-priority tasks")
                        }
                        disabled={sendMessageMutation.isPending}
                      >
                        Pending Tasks
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuickAction("Show me active projects and their progress")
                        }
                        disabled={sendMessageMutation.isPending}
                      >
                        Project Progress
                      </Button>
                    </div>
                  )}
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
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-muted">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div
                            className="h-2 w-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Thinking...
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
      <div className="pt-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder={`Ask about ${ventureName}...`}
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
  );
}
