import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Layers, ListTodo, Clock, Lock } from "lucide-react";
import CategoryEditModal from "./category-edit-modal";

interface CustomCategory {
  id: string;
  type: "domain" | "task_type" | "focus_slot";
  value: string;
  label: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  metadata: { time?: string; isDefault?: boolean } | null;
  sortOrder: number;
  enabled: boolean;
}

type CategoryType = "domain" | "task_type" | "focus_slot";

export default function CategoriesManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CategoryType>("domain");
  const [editModal, setEditModal] = useState<{
    open: boolean;
    category: CustomCategory | null;
    type: CategoryType;
  }>({ open: false, category: null, type: "domain" });

  const { data: categories = [], isLoading } = useQuery<CustomCategory[]>({
    queryKey: ["/api/settings/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CustomCategory>) => {
      const res = await apiRequest("POST", "/api/settings/categories", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/categories"] });
      toast({ title: "Category created", description: "New category has been added." });
      setEditModal({ ...editModal, open: false });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomCategory> }) => {
      const res = await apiRequest("PATCH", `/api/settings/categories/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/categories"] });
      toast({ title: "Category updated", description: "Category has been saved." });
      setEditModal({ ...editModal, open: false });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/settings/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/categories"] });
      toast({ title: "Category deleted", description: "Category has been removed." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete category.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: Partial<CustomCategory>) => {
    if (editModal.category) {
      updateMutation.mutate({ id: editModal.category.id, data });
    } else {
      createMutation.mutate({ ...data, type: editModal.type });
    }
  };

  const handleDelete = (category: CustomCategory) => {
    if (category.metadata?.isDefault) {
      toast({
        title: "Cannot delete",
        description: "Default categories cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Delete "${category.label}"? This action cannot be undone.`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const openAddModal = (type: CategoryType) => {
    setEditModal({ open: true, category: null, type });
  };

  const openEditModal = (category: CustomCategory) => {
    setEditModal({ open: true, category, type: category.type });
  };

  const filterByType = (type: CategoryType) =>
    categories.filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder);

  const getTypeIcon = (type: CategoryType) => {
    switch (type) {
      case "domain":
        return <Layers className="h-4 w-4" />;
      case "task_type":
        return <ListTodo className="h-4 w-4" />;
      case "focus_slot":
        return <Clock className="h-4 w-4" />;
    }
  };

  const renderCategoryList = (type: CategoryType) => {
    const items = filterByType(type);

    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No categories found. Add your first one!
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((category) => (
          <div
            key={category.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              !category.enabled ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {type === "focus_slot" && category.color && (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.label}</span>
                  {category.metadata?.isDefault && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                  {!category.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      Disabled
                    </Badge>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
                {type === "focus_slot" && category.metadata?.time && (
                  <p className="text-xs text-muted-foreground">{category.metadata.time}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditModal(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!category.metadata?.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(category)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Manage domains, task types, and focus slots used throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="domain" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Domains
              </TabsTrigger>
              <TabsTrigger value="task_type" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Task Types
              </TabsTrigger>
              <TabsTrigger value="focus_slot" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Focus Slots
              </TabsTrigger>
            </TabsList>

            <TabsContent value="domain" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Domains are life areas like Home, Work, Health, etc.
                </p>
                <Button size="sm" onClick={() => openAddModal("domain")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </div>
              {renderCategoryList("domain")}
            </TabsContent>

            <TabsContent value="task_type" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Task types categorize the nature of work like Business, Admin, etc.
                </p>
                <Button size="sm" onClick={() => openAddModal("task_type")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task Type
                </Button>
              </div>
              {renderCategoryList("task_type")}
            </TabsContent>

            <TabsContent value="focus_slot" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Focus slots are time blocks for scheduling work.
                </p>
                <Button size="sm" onClick={() => openAddModal("focus_slot")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Focus Slot
                </Button>
              </div>
              {renderCategoryList("focus_slot")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CategoryEditModal
        open={editModal.open}
        onClose={() => setEditModal({ ...editModal, open: false })}
        onSave={handleSave}
        category={editModal.category}
        categoryType={editModal.type}
      />
    </div>
  );
}
