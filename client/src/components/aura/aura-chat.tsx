/**
 * Aura Chat Component
 *
 * Main chat interface for conversing with Aura AI assistant.
 * Features: streaming responses, conversation history, suggested questions.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AuraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuraChat({ isOpen, onClose }: AuraChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch('/api/aura/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to chat with Aura');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: accumulatedContent },
                ]);
                setStreamingContent("");
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error chatting with Aura:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setStreamingContent("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6 pointer-events-none">
      <Card className="w-full md:w-[420px] h-[600px] flex flex-col shadow-2xl pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">Aura</h2>
            <span className="text-xs opacity-80">Your AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearConversation}
              className="text-white hover:bg-white/20 h-8 w-8"
              title="Clear conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 text-purple-400" />
              <h3 className="font-medium text-lg mb-2">Welcome to Aura</h3>
              <p className="text-sm max-w-xs">
                I'm your AI assistant with access to all your Hikma-OS data. Ask me anything!
              </p>
              <div className="mt-6 space-y-2 w-full max-w-sm">
                <p className="text-xs font-medium mb-3">Try asking:</p>
                <button
                  onClick={() => setInput("What should I work on today?")}
                  className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  "What should I work on today?"
                </button>
                <button
                  onClick={() => setInput("How are my ventures doing?")}
                  className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  "How are my ventures doing?"
                </button>
                <button
                  onClick={() => setInput("What patterns do you see in my health data?")}
                  className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  "What patterns do you see in my health data?"
                </button>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5",
                  message.role === 'user'
                    ? "bg-blue-500 text-white"
                    : "bg-muted"
                )}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-2.5 bg-muted">
                <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" />
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse delay-100" />
                  <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Ask me anything about your data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
