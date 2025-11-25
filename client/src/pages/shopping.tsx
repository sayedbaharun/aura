import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, ShoppingCart, Check, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ShoppingItem {
  id: string;
  item: string;
  priority: "P1" | "P2" | "P3";
  status: "to_buy" | "purchased";
  category: "groceries" | "personal" | "household" | "business" | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const priorityConfig = {
  P1: { label: "Urgent (Today)", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  P2: { label: "Important (This Week)", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  P3: { label: "Buy Soon", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
};

const categoryConfig = {
  groceries: { label: "Groceries", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  personal: { label: "Personal", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  household: { label: "Household", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  business: { label: "Business", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
};

export default function Shopping() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "to_buy" | "purchased">("to_buy");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [formData, setFormData] = useState({
    item: "",
    priority: "P2" as "P1" | "P2" | "P3",
    category: "personal" as "groceries" | "personal" | "household" | "business",
    notes: "",
  });

  const { data: items = [], isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ["/api/shopping"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/shopping", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
      toast({ title: "Item added", description: "Shopping item has been added." });
      closeModal();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShoppingItem> }) => {
      return apiRequest("PATCH", `/api/shopping/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shopping/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
      toast({ title: "Item deleted", description: "Shopping item has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredItems = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  // Group items by priority
  const groupedItems = {
    P1: filteredItems.filter((i) => i.priority === "P1"),
    P2: filteredItems.filter((i) => i.priority === "P2"),
    P3: filteredItems.filter((i) => i.priority === "P3"),
  };

  const openModal = (item?: ShoppingItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item: item.item,
        priority: item.priority,
        category: item.category || "personal",
        notes: item.notes || "",
      });
    } else {
      setEditingItem(null);
      setFormData({ item: "", priority: "P2", category: "personal", notes: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ item: "", priority: "P2", category: "personal", notes: "" });
  };

  const handleSubmit = () => {
    if (!formData.item.trim()) {
      toast({ title: "Error", description: "Item name is required", variant: "destructive" });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
      closeModal();
      toast({ title: "Item updated", description: "Shopping item has been updated." });
    } else {
      createMutation.mutate(formData);
    }
  };

  const togglePurchased = (item: ShoppingItem) => {
    updateMutation.mutate({
      id: item.id,
      data: { status: item.status === "purchased" ? "to_buy" : "purchased" },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const toBuyCount = items.filter((i) => i.status === "to_buy").length;
  const purchasedCount = items.filter((i) => i.status === "purchased").length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Shopping List
          </h1>
          <p className="text-muted-foreground mt-1">
            {toBuyCount} items to buy, {purchasedCount} purchased
          </p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="to_buy">To Buy</SelectItem>
            <SelectItem value="purchased">Purchased</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="groceries">Groceries</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="household">Household</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shopping Items by Priority */}
      {(["P1", "P2", "P3"] as const).map((priority) => {
        const priorityItems = groupedItems[priority];
        if (priorityItems.length === 0) return null;

        return (
          <Card key={priority}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className={priorityConfig[priority].color}>
                  {priority}
                </Badge>
                {priorityConfig[priority].label}
                <span className="text-muted-foreground font-normal">
                  ({priorityItems.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {priorityItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      item.status === "purchased"
                        ? "bg-muted/50 opacity-60"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Checkbox
                      checked={item.status === "purchased"}
                      onCheckedChange={() => togglePurchased(item)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium ${
                          item.status === "purchased" ? "line-through" : ""
                        }`}
                      >
                        {item.item}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {categoryConfig[item.category]?.label || item.category}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Added {format(new Date(item.createdAt), "MMM d")}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openModal(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === "to_buy"
                ? "Your shopping list is empty!"
                : "No items match the current filters."}
            </p>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Shopping Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item Name *</Label>
              <Input
                id="item"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="What do you need to buy?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as typeof formData.priority })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1 - Urgent (Today)</SelectItem>
                    <SelectItem value="P2">P2 - Important (This Week)</SelectItem>
                    <SelectItem value="P3">P3 - Buy Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as typeof formData.category })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groceries">Groceries</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="household">Household</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
