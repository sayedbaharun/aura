import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, X, Save, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AiAgentPrompt {
  id: string;
  ventureId: string;
  systemPrompt: string | null;
  context: string | null;
  capabilities: string[];
  quickActions: { label: string; prompt: string }[];
  enabled: boolean;
}

interface AiAgentConfigProps {
  ventureId: string;
}

export default function AiAgentConfig({ ventureId }: AiAgentConfigProps) {
  const { toast } = useToast();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [context, setContext] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<{ label: string; prompt: string }[]>([]);
  const [newCapability, setNewCapability] = useState("");
  const [newAction, setNewAction] = useState({ label: "", prompt: "" });

  const { data: agentPrompt, isLoading } = useQuery<AiAgentPrompt>({
    queryKey: [`/api/ai-agent-prompts/venture/${ventureId}`],
    queryFn: async () => {
      const res = await fetch(`/api/ai-agent-prompts/venture/${ventureId}`, {
        credentials: "include",
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch AI agent prompt");
      return await res.json();
    },
  });

  useEffect(() => {
    if (agentPrompt) {
      setSystemPrompt(agentPrompt.systemPrompt || "");
      setContext(agentPrompt.context || "");
      setCapabilities(agentPrompt.capabilities || []);
      setQuickActions(agentPrompt.quickActions || []);
    }
  }, [agentPrompt]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/ai-agent-prompts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ai-agent-prompts/venture/${ventureId}`] });
      toast({
        title: "Success",
        description: "AI agent configuration created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create AI agent configuration",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/ai-agent-prompts/${agentPrompt?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ai-agent-prompts/venture/${ventureId}`] });
      toast({
        title: "Success",
        description: "AI agent configuration updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update AI agent configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const payload = {
      ventureId,
      systemPrompt,
      context,
      capabilities,
      quickActions,
      enabled: true,
    };

    if (agentPrompt) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const addCapability = () => {
    if (newCapability.trim()) {
      setCapabilities([...capabilities, newCapability.trim()]);
      setNewCapability("");
    }
  };

  const removeCapability = (index: number) => {
    setCapabilities(capabilities.filter((_, i) => i !== index));
  };

  const addQuickAction = () => {
    if (newAction.label.trim() && newAction.prompt.trim()) {
      setQuickActions([...quickActions, newAction]);
      setNewAction({ label: "", prompt: "" });
    }
  };

  const removeQuickAction = (index: number) => {
    setQuickActions(quickActions.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>AI Agent Configuration</CardTitle>
                <CardDescription>
                  Configure a venture-specific AI assistant with custom context and capabilities
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
          <CardDescription>
            The core instructions that define the AI agent's role and behavior for this venture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="You are an AI assistant specialized in helping with [venture domain]. Your role is to..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Venture Context</CardTitle>
          <CardDescription>
            Provide specific information about this venture (goals, tech stack, business model, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="This venture focuses on... We use these technologies... Our target market is..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Capabilities
          </CardTitle>
          <CardDescription>
            Define what the AI agent can help with for this venture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing capabilities */}
          <div className="flex flex-wrap gap-2">
            {capabilities.map((capability, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {capability}
                <button
                  onClick={() => removeCapability(index)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {capabilities.length === 0 && (
              <p className="text-sm text-muted-foreground">No capabilities added yet</p>
            )}
          </div>

          {/* Add new capability */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Generate marketing copy, Create task breakdowns, Review code..."
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCapability()}
            />
            <Button onClick={addCapability} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Predefined prompts for common tasks in this venture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing quick actions */}
          {quickActions.length > 0 ? (
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{action.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{action.prompt}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuickAction(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No quick actions added yet</p>
          )}

          {/* Add new quick action */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="action-label">Action Label</Label>
              <Input
                id="action-label"
                placeholder="e.g., Generate weekly report"
                value={newAction.label}
                onChange={(e) => setNewAction({ ...newAction, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-prompt">Prompt</Label>
              <Textarea
                id="action-prompt"
                placeholder="Create a comprehensive weekly report covering..."
                value={newAction.prompt}
                onChange={(e) => setNewAction({ ...newAction, prompt: e.target.value })}
                rows={3}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={addQuickAction} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Quick Action
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
