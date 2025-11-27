import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Trash2,
  User,
  Sparkles,
  Calendar,
  Mail,
  StickyNote,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
  createdAt: string;
}

export default function AiChat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history"],
    queryFn: async () => {
      const res = await fetch("/api/chat/history", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return await res.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { message });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      setMessage("");
      // Scroll to bottom after message is sent
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
      const res = await apiRequest("DELETE", "/api/chat/history", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  Your personal productivity AI with calendar, email, and task management
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearChatMutation.mutate()}
              disabled={clearChatMutation.isPending || messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-6 py-6 flex flex-col gap-4">
        {/* Messages */}
        <Card className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                  <p>Loading chat history...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Sparkles className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-xl font-semibold mb-2">Welcome to Your AI Assistant</h3>
                  <p className="text-muted-foreground mb-6">
                    I can help you manage your calendar, emails, tasks, and take quick notes.
                    Just ask me anything!
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-left">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>Manage calendar events</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <Mail className="h-4 w-4 text-green-500" />
                      <span>Check & send emails</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <StickyNote className="h-4 w-4 text-amber-500" />
                      <span>Take quick notes</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>Smart suggestions</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      <div
                        className={`text-xs mt-2 ${
                          msg.role === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                    </div>
                    <div className="max-w-[70%] rounded-lg px-4 py-3 bg-muted">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="h-2 w-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="h-2 w-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Input Area */}
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Textarea
              ref={textareaRef}
              placeholder="Ask me to check your calendar, send emails, take notes, or anything else..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+Enter</kbd> for new line
          </p>
        </Card>
      </div>
    </div>
  );
}
