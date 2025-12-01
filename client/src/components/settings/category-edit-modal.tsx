import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface CategoryEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CustomCategory>) => void;
  category: CustomCategory | null;
  categoryType: "domain" | "task_type" | "focus_slot";
}

const ICONS = [
  "Home", "Briefcase", "Heart", "DollarSign", "Plane", "GraduationCap",
  "Gamepad2", "Phone", "User", "Building2", "Brain", "ClipboardList",
  "Activity", "BookOpen", "Sun", "Moon", "Mail", "Users", "Clock",
  "CheckSquare", "Focus", "Zap", "Target", "Star", "Flag",
];

export default function CategoryEditModal({
  open,
  onClose,
  onSave,
  category,
  categoryType,
}: CategoryEditModalProps) {
  const [form, setForm] = useState<Partial<CustomCategory>>({
    type: categoryType,
    value: "",
    label: "",
    description: "",
    color: "#6366f1",
    icon: "Star",
    enabled: true,
    sortOrder: 100,
    metadata: {},
  });

  useEffect(() => {
    if (category) {
      setForm({
        ...category,
        description: category.description || "",
        color: category.color || "#6366f1",
        icon: category.icon || "Star",
      });
    } else {
      setForm({
        type: categoryType,
        value: "",
        label: "",
        description: "",
        color: "#6366f1",
        icon: "Star",
        enabled: true,
        sortOrder: 100,
        metadata: {},
      });
    }
  }, [category, categoryType, open]);

  const handleLabelChange = (label: string) => {
    const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setForm({ ...form, label, value });
  };

  const handleSave = () => {
    if (!form.label || !form.value) return;
    onSave(form);
  };

  const isDefault = category?.metadata?.isDefault;
  const isNew = !category;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add New Category" : isDefault ? "View Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isNew ? "Create a new custom category" : isDefault ? "View default category details" : "Modify category settings"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={form.label || ""}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., Marketing"
              disabled={isDefault}
            />
          </div>

          <div className="space-y-2">
            <Label>Value (identifier)</Label>
            <Input
              value={form.value || ""}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="e.g., marketing"
              disabled={isDefault || !isNew}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Used internally. Cannot be changed after creation.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description..."
              disabled={isDefault}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={form.icon || "Star"}
                onValueChange={(value) => setForm({ ...form, icon: value })}
                disabled={isDefault}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoryType === "focus_slot" && (
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.color || "#6366f1"}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-12 h-10 p-1"
                    disabled={isDefault}
                  />
                  <Input
                    value={form.color || "#6366f1"}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="font-mono"
                    disabled={isDefault}
                  />
                </div>
              </div>
            )}
          </div>

          {categoryType === "focus_slot" && (
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Input
                value={form.metadata?.time || ""}
                onChange={(e) => setForm({
                  ...form,
                  metadata: { ...form.metadata, time: e.target.value }
                })}
                placeholder="e.g., 9:00-11:00"
                disabled={isDefault}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
            />
          </div>

          {isDefault && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              This is a default category and cannot be edited or deleted.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!isDefault && (
            <Button onClick={handleSave}>
              {isNew ? "Create" : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
