import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cleanFormData } from "@/lib/utils";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventureId?: string; // Pre-selected venture
  defaultStatus?: string; // Pre-selected status (for kanban column)
  project?: any; // For edit mode
}

interface Venture {
  id: string;
  name: string;
  icon: string | null;
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

const CATEGORY_OPTIONS = [
  // Growth
  { value: "marketing", label: "Marketing", group: "Growth" },
  { value: "sales_biz_dev", label: "Sales / Business Development", group: "Growth" },
  { value: "customer_success", label: "Customer Success / Support", group: "Growth" },

  // Product & Delivery
  { value: "product", label: "Product", group: "Product & Delivery" },
  { value: "tech_engineering", label: "Technology / IT / Engineering", group: "Product & Delivery" },
  { value: "operations", label: "Operations", group: "Product & Delivery" },
  { value: "research_dev", label: "Research & Development", group: "Product & Delivery" },

  // Enabling
  { value: "finance", label: "Finance", group: "Enabling" },
  { value: "people_hr", label: "People / HR / Talent", group: "Enabling" },
  { value: "legal_compliance", label: "Legal & Compliance", group: "Enabling" },
  { value: "admin_general", label: "Admin / General Management", group: "Enabling" },
  { value: "strategy_leadership", label: "Strategy / Leadership", group: "Enabling" },
];

const PRIORITY_OPTIONS = [
  { value: "P0", label: "P0 - Urgent" },
  { value: "P1", label: "P1 - High" },
  { value: "P2", label: "P2 - Medium" },
  { value: "P3", label: "P3 - Low" },
];

export default function CreateProjectModal({
  open,
  onOpenChange,
  ventureId,
  defaultStatus,
  project,
}: CreateProjectModalProps) {
  const { toast } = useToast();
  const isEdit = !!project;

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const [formData, setFormData] = useState({
    name: project?.name || "",
    ventureId: project?.ventureId || ventureId || "",
    status: project?.status || defaultStatus || "not_started",
    category: project?.category || "product",
    priority: project?.priority || "P2",
    startDate: project?.startDate || "",
    targetEndDate: project?.targetEndDate || "",
    outcome: project?.outcome || "",
    notes: project?.notes || "",
  });

  // Update form when props change
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        ventureId: project.ventureId || ventureId || "",
        status: project.status || defaultStatus || "not_started",
        category: project.category || "product",
        priority: project.priority || "P2",
        startDate: project.startDate || "",
        targetEndDate: project.targetEndDate || "",
        outcome: project.outcome || "",
        notes: project.notes || "",
      });
    } else if (ventureId) {
      setFormData((prev) => ({ ...prev, ventureId }));
    }
    if (defaultStatus) {
      setFormData((prev) => ({ ...prev, status: defaultStatus }));
    }
  }, [project, ventureId, defaultStatus]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = isEdit ? `/api/projects/${project.id}` : "/api/projects";
      const method = isEdit ? "PATCH" : "POST";
      // Clean data to only send non-empty values
      const cleanData = cleanFormData(data);
      const res = await apiRequest(method, url, cleanData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: `Project ${isEdit ? "updated" : "created"} successfully`,
      });
      onOpenChange(false);
      // Reset form
      setFormData({
        name: "",
        ventureId: ventureId || "",
        status: defaultStatus || "not_started",
        category: "product",
        priority: "P2",
        startDate: "",
        targetEndDate: "",
        outcome: "",
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} project`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.ventureId) {
      toast({
        title: "Validation Error",
        description: "Please select a venture",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update your project details" : "Add a new project to your venture"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="MyDub.ai v2.0 Launch"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="ventureId">Venture *</Label>
              <Select
                value={formData.ventureId}
                onValueChange={(value) => setFormData({ ...formData, ventureId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a venture" />
                </SelectTrigger>
                <SelectContent>
                  {ventures.map((venture) => (
                    <SelectItem key={venture.id} value={venture.id}>
                      {venture.icon} {venture.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Growth</SelectLabel>
                    {CATEGORY_OPTIONS.filter(opt => opt.group === "Growth").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Product & Delivery</SelectLabel>
                    {CATEGORY_OPTIONS.filter(opt => opt.group === "Product & Delivery").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Enabling</SelectLabel>
                    {CATEGORY_OPTIONS.filter(opt => opt.group === "Enabling").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="targetEndDate">Target End Date</Label>
              <Input
                id="targetEndDate"
                type="date"
                value={formData.targetEndDate}
                onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="outcome">Outcome (What success looks like)</Label>
              <Textarea
                id="outcome"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                placeholder="v2 live with 10k MAU"
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
