import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Target,
  Trash2,
  Edit,
  Check,
  X,
  Star,
  ChevronDown,
  ChevronRight,
  Loader2,
  Copy,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { apiRequest } from "@/lib/queryClient";
import type {
  TradingStrategy,
  TradingStrategyConfig,
  TradingChecklistSection,
  TradingChecklistItem,
} from "@shared/schema";
import { cn } from "@/lib/utils";

interface StrategyFormData {
  name: string;
  description: string;
  instruments: string[];
  isActive: boolean;
  isDefault: boolean;
  notes: string;
  config: TradingStrategyConfig;
}

const defaultChecklistItem: TradingChecklistItem = {
  id: "",
  label: "",
  type: "checkbox",
  required: false,
};

const defaultSection: TradingChecklistSection = {
  id: "",
  title: "",
  items: [],
};

const defaultFormData: StrategyFormData = {
  name: "",
  description: "",
  instruments: [],
  isActive: true,
  isDefault: false,
  notes: "",
  config: {
    sections: [],
  },
};

export default function TradingStrategiesManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [formData, setFormData] = useState<StrategyFormData>(defaultFormData);
  const [instrumentInput, setInstrumentInput] = useState("");
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({});

  // Fetch all strategies
  const { data: strategies = [], isLoading } = useQuery<TradingStrategy[]>({
    queryKey: ["/api/trading-strategies"],
  });

  // Mutation to seed strategies
  const seedStrategiesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trading-strategies/seed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-strategies"] });
    },
  });

  // Create strategy mutation
  const createStrategyMutation = useMutation({
    mutationFn: async (data: StrategyFormData) => {
      const response = await apiRequest("POST", "/api/trading-strategies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-strategies"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  // Update strategy mutation
  const updateStrategyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StrategyFormData> }) => {
      const response = await apiRequest("PATCH", `/api/trading-strategies/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-strategies"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  // Delete strategy mutation
  const deleteStrategyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/trading-strategies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-strategies"] });
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingStrategy(null);
    setInstrumentInput("");
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (strategy: TradingStrategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description || "",
      instruments: strategy.instruments || [],
      isActive: strategy.isActive ?? true,
      isDefault: strategy.isDefault ?? false,
      notes: strategy.notes || "",
      config: strategy.config || { sections: [] },
    });
    setIsDialogOpen(true);
  };

  const duplicateStrategy = (strategy: TradingStrategy) => {
    setEditingStrategy(null);
    setFormData({
      name: `${strategy.name} (Copy)`,
      description: strategy.description || "",
      instruments: strategy.instruments || [],
      isActive: true,
      isDefault: false,
      notes: strategy.notes || "",
      config: JSON.parse(JSON.stringify(strategy.config || { sections: [] })),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingStrategy) {
      updateStrategyMutation.mutate({ id: editingStrategy.id, data: formData });
    } else {
      createStrategyMutation.mutate(formData);
    }
  };

  const addInstrument = () => {
    if (instrumentInput.trim() && !formData.instruments.includes(instrumentInput.trim())) {
      setFormData({
        ...formData,
        instruments: [...formData.instruments, instrumentInput.trim().toUpperCase()],
      });
      setInstrumentInput("");
    }
  };

  const removeInstrument = (instrument: string) => {
    setFormData({
      ...formData,
      instruments: formData.instruments.filter((i) => i !== instrument),
    });
  };

  const addSection = () => {
    const newSection: TradingChecklistSection = {
      ...defaultSection,
      id: `section_${Date.now()}`,
      title: `Section ${formData.config.sections.length + 1}`,
    };
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        sections: [...formData.config.sections, newSection],
      },
    });
  };

  const updateSection = (index: number, updates: Partial<TradingChecklistSection>) => {
    const newSections = [...formData.config.sections];
    newSections[index] = { ...newSections[index], ...updates };
    setFormData({
      ...formData,
      config: { ...formData.config, sections: newSections },
    });
  };

  const removeSection = (index: number) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        sections: formData.config.sections.filter((_, i) => i !== index),
      },
    });
  };

  const addItem = (sectionIndex: number) => {
    const newItem: TradingChecklistItem = {
      ...defaultChecklistItem,
      id: `item_${Date.now()}`,
      label: "New checklist item",
    };
    const newSections = [...formData.config.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      items: [...newSections[sectionIndex].items, newItem],
    };
    setFormData({
      ...formData,
      config: { ...formData.config, sections: newSections },
    });
  };

  const updateItem = (sectionIndex: number, itemIndex: number, updates: Partial<TradingChecklistItem>) => {
    const newSections = [...formData.config.sections];
    const newItems = [...newSections[sectionIndex].items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems };
    setFormData({
      ...formData,
      config: { ...formData.config, sections: newSections },
    });
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...formData.config.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      items: newSections[sectionIndex].items.filter((_, i) => i !== itemIndex),
    };
    setFormData({
      ...formData,
      config: { ...formData.config, sections: newSections },
    });
  };

  const toggleStrategyExpand = (id: string) => {
    setExpandedStrategies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trading Strategies</h2>
          <p className="text-sm text-muted-foreground">
            Manage your trading strategy templates and checklists
          </p>
        </div>
        <div className="flex gap-2">
          {strategies.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedStrategiesMutation.mutate()}
              disabled={seedStrategiesMutation.isPending}
            >
              {seedStrategiesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Load Sample Strategy
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>

      {/* Strategies List */}
      {strategies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Strategies Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first trading strategy or load a sample to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className={cn(!strategy.isActive && "opacity-60")}>
              <Collapsible
                open={expandedStrategies[strategy.id]}
                onOpenChange={() => toggleStrategyExpand(strategy.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-80">
                      {expandedStrategies[strategy.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-base flex items-center gap-2">
                          {strategy.name}
                          {strategy.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          {!strategy.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </CardTitle>
                        {strategy.description && (
                          <CardDescription className="text-xs">
                            {strategy.description}
                          </CardDescription>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      {strategy.instruments && strategy.instruments.length > 0 && (
                        <div className="flex gap-1">
                          {strategy.instruments.slice(0, 3).map((inst) => (
                            <Badge key={inst} variant="outline" className="text-xs">
                              {inst}
                            </Badge>
                          ))}
                          {strategy.instruments.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{strategy.instruments.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(strategy)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateStrategy(strategy)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm("Delete this strategy?")) {
                                deleteStrategyMutation.mutate(strategy.id);
                              }
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Strategy Sections Preview */}
                      {strategy.config?.sections?.map((section, idx) => (
                        <div key={section.id || idx} className="border rounded-lg p-3">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            {section.icon && <span>{section.icon}</span>}
                            {section.title}
                          </h4>
                          <ul className="space-y-1">
                            {section.items.map((item, itemIdx) => (
                              <li key={item.id || itemIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                {item.label}
                                {item.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {strategy.notes && (
                        <div className="text-sm text-muted-foreground border-t pt-3">
                          <strong>Notes:</strong> {strategy.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Strategy Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStrategy ? "Edit Strategy" : "Create New Strategy"}
            </DialogTitle>
            <DialogDescription>
              Define your trading strategy template with sections and checklist items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Strategy Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Golden Trap & Reverse"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this strategy..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Instruments</Label>
                <div className="flex gap-2">
                  <Input
                    value={instrumentInput}
                    onChange={(e) => setInstrumentInput(e.target.value)}
                    placeholder="e.g., XAU/USD"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInstrument())}
                  />
                  <Button type="button" variant="outline" onClick={addInstrument}>
                    Add
                  </Button>
                </div>
                {formData.instruments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.instruments.map((inst) => (
                      <Badge key={inst} variant="secondary" className="pl-2">
                        {inst}
                        <button
                          onClick={() => removeInstrument(inst)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label>Set as Default</Label>
                </div>
              </div>
            </div>

            {/* Checklist Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Checklist Sections</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              </div>

              {formData.config.sections.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <p>No sections yet. Add a section to create your checklist.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {formData.config.sections.map((section, sectionIdx) => (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 flex-1">
                          <span>{section.icon || "📋"}</span>
                          <span>{section.title || "Untitled Section"}</span>
                          <Badge variant="outline" className="ml-2">
                            {section.items.length} items
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-4">
                        {/* Section Settings */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Section Title</Label>
                            <Input
                              value={section.title}
                              onChange={(e) => updateSection(sectionIdx, { title: e.target.value })}
                              placeholder="e.g., Pre-Trade Mental Clearing"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Icon (emoji)</Label>
                            <Input
                              value={section.icon || ""}
                              onChange={(e) => updateSection(sectionIdx, { icon: e.target.value })}
                              placeholder="e.g., 🧠"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Input
                            value={section.description || ""}
                            onChange={(e) => updateSection(sectionIdx, { description: e.target.value })}
                            placeholder="Brief description of this section..."
                          />
                        </div>

                        {/* Section Items */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Checklist Items</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addItem(sectionIdx)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item
                            </Button>
                          </div>
                          {section.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No items yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {section.items.map((item, itemIdx) => (
                                <div
                                  key={item.id}
                                  className="flex items-start gap-2 p-2 border rounded"
                                >
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={item.label}
                                      onChange={(e) =>
                                        updateItem(sectionIdx, itemIdx, { label: e.target.value })
                                      }
                                      placeholder="Checklist item label"
                                    />
                                    <div className="flex items-center gap-4">
                                      <Select
                                        value={item.type}
                                        onValueChange={(v) =>
                                          updateItem(sectionIdx, itemIdx, { type: v as any })
                                        }
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="checkbox">Checkbox</SelectItem>
                                          <SelectItem value="text">Text</SelectItem>
                                          <SelectItem value="number">Number</SelectItem>
                                          <SelectItem value="select">Select</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={item.required}
                                          onCheckedChange={(checked) =>
                                            updateItem(sectionIdx, itemIdx, { required: checked })
                                          }
                                        />
                                        <Label className="text-xs">Required</Label>
                                      </div>
                                      <Input
                                        value={item.category || ""}
                                        onChange={(e) =>
                                          updateItem(sectionIdx, itemIdx, { category: e.target.value })
                                        }
                                        placeholder="Category (optional)"
                                        className="w-40"
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItem(sectionIdx, itemIdx)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Remove Section */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSection(sectionIdx)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Section
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this strategy..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name.trim() ||
                createStrategyMutation.isPending ||
                updateStrategyMutation.isPending
              }
            >
              {createStrategyMutation.isPending || updateStrategyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingStrategy ? "Save Changes" : "Create Strategy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
