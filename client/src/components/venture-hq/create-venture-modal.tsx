import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreateVentureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venture?: any; // For edit mode
}

const STATUS_OPTIONS = [
  { value: "archived", label: "Archived" },
  { value: "planning", label: "Planning" },
  { value: "building", label: "Building" },
  { value: "on_hold", label: "On Hold" },
  { value: "ongoing", label: "Ongoing" },
];

const PRESET_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B195", "#C06C84"
];

export default function CreateVentureModal({ open, onOpenChange, venture }: CreateVentureModalProps) {
  const { toast } = useToast();
  const isEdit = !!venture;

  const [formData, setFormData] = useState({
    name: venture?.name || "",
    oneLiner: venture?.oneLiner || "",
    status: venture?.status || "planning",
    color: venture?.color || "#FF6B6B",
    icon: venture?.icon || "🚀",
    notes: venture?.notes || "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = isEdit ? `/api/ventures/${venture.id}` : "/api/ventures";
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ventures"] });
      toast({
        title: "Success",
        description: `Venture ${isEdit ? "updated" : "created"} successfully`,
      });
      onOpenChange(false);
      // Reset form
      setFormData({
        name: "",
        oneLiner: "",
        status: "planning",
        color: "#FF6B6B",
        icon: "🚀",
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} venture`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Venture name is required",
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
          <DialogTitle>{isEdit ? "Edit Venture" : "Create New Venture"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update your venture details" : "Add a new venture to your portfolio"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Venture Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="MyDub.ai"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="oneLiner">One-Line Description</Label>
              <Input
                id="oneLiner"
                value={formData.oneLiner}
                onChange={(e) => setFormData({ ...formData, oneLiner: e.target.value })}
                placeholder="AI-driven Dubai lifestyle media"
              />
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
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

            <div className="col-span-2">
              <Label htmlFor="icon">Icon (Emoji)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🚀"
                maxLength={2}
              />
            </div>

            <div className="col-span-2">
              <Label>Colour</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: color,
                      borderColor: formData.color === color ? "#000" : "transparent",
                    }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
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
