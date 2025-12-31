import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FlaskConical,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  FileText,
  Trash2,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BloodworkEntry {
  id: string;
  date: string;
  labName: string | null;
  // Metabolic
  hba1c: number | null;
  fastingGlucose: number | null;
  fastingInsulin: number | null;
  homaIr: number | null;
  // Lipids
  totalCholesterol: number | null;
  hdlCholesterol: number | null;
  ldlCholesterol: number | null;
  triglycerides: number | null;
  // Hormones
  testosterone: number | null;
  freeTestosterone: number | null;
  cortisol: number | null;
  // Thyroid
  tsh: number | null;
  freeT3: number | null;
  freeT4: number | null;
  // Vitamins
  vitaminD: number | null;
  vitaminB12: number | null;
  ferritin: number | null;
  iron: number | null;
  // Inflammation
  crp: number | null;
  alt: number | null;
  ast: number | null;
  // Kidney
  creatinine: number | null;
  egfr: number | null;
  // Meta
  notes: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

// Reference ranges for status indicators
const REFERENCE_RANGES: Record<string, { low: number; high: number; optimal?: { low: number; high: number } }> = {
  hba1c: { low: 4.0, high: 5.6, optimal: { low: 4.5, high: 5.3 } },
  fastingGlucose: { low: 70, high: 100, optimal: { low: 75, high: 90 } },
  homaIr: { low: 0, high: 2.0 },
  totalCholesterol: { low: 0, high: 200 },
  hdlCholesterol: { low: 40, high: 999 },
  ldlCholesterol: { low: 0, high: 100 },
  triglycerides: { low: 0, high: 150 },
  vitaminD: { low: 30, high: 100, optimal: { low: 50, high: 80 } },
  tsh: { low: 0.4, high: 4.0, optimal: { low: 1.0, high: 2.5 } },
};

function getStatus(key: string, value: number | null): "success" | "warning" | "danger" | "neutral" {
  if (value === null) return "neutral";
  const range = REFERENCE_RANGES[key];
  if (!range) return "neutral";

  if (range.optimal) {
    if (value >= range.optimal.low && value <= range.optimal.high) return "success";
    if (value >= range.low && value <= range.high) return "warning";
    return "danger";
  }

  if (value >= range.low && value <= range.high) return "success";
  return "danger";
}

function StatusBadge({ status }: { status: "success" | "warning" | "danger" | "neutral" }) {
  if (status === "neutral") return null;
  return (
    <Badge
      variant="outline"
      className={
        status === "success" ? "border-green-500 text-green-500" :
        status === "warning" ? "border-yellow-500 text-yellow-500" :
        "border-red-500 text-red-500"
      }
    >
      {status === "success" ? "Optimal" : status === "warning" ? "Normal" : "Review"}
    </Badge>
  );
}

function MetricRow({ label, value, unit, refKey }: { label: string; value: number | null; unit: string; refKey?: string }) {
  const status = refKey ? getStatus(refKey, value) : "neutral";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {value !== null ? `${value} ${unit}` : "—"}
        </span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function BloodworkCard({ entry, onEdit, onDelete }: { entry: BloodworkEntry; onEdit: () => void; onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {format(new Date(entry.date), "MMMM d, yyyy")}
              </CardTitle>
              {entry.labName && (
                <CardDescription>{entry.labName}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {entry.hba1c && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{entry.hba1c}%</div>
              <div className="text-xs text-muted-foreground">HbA1c</div>
            </div>
          )}
          {entry.fastingGlucose && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{entry.fastingGlucose}</div>
              <div className="text-xs text-muted-foreground">Glucose mg/dL</div>
            </div>
          )}
          {entry.triglycerides && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{entry.triglycerides}</div>
              <div className="text-xs text-muted-foreground">Triglycerides</div>
            </div>
          )}
          {entry.vitaminD && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{entry.vitaminD}</div>
              <div className="text-xs text-muted-foreground">Vitamin D</div>
            </div>
          )}
        </div>

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mr-2" />
              Show All Results
            </>
          )}
        </Button>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Metabolic Panel */}
            <div>
              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Metabolic</h4>
              <MetricRow label="HbA1c" value={entry.hba1c} unit="%" refKey="hba1c" />
              <MetricRow label="Fasting Glucose" value={entry.fastingGlucose} unit="mg/dL" refKey="fastingGlucose" />
              <MetricRow label="Fasting Insulin" value={entry.fastingInsulin} unit="μIU/mL" />
              <MetricRow label="HOMA-IR" value={entry.homaIr} unit="" refKey="homaIr" />
            </div>

            {/* Lipid Panel */}
            <div>
              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Lipids</h4>
              <MetricRow label="Total Cholesterol" value={entry.totalCholesterol} unit="mg/dL" refKey="totalCholesterol" />
              <MetricRow label="HDL" value={entry.hdlCholesterol} unit="mg/dL" refKey="hdlCholesterol" />
              <MetricRow label="LDL" value={entry.ldlCholesterol} unit="mg/dL" refKey="ldlCholesterol" />
              <MetricRow label="Triglycerides" value={entry.triglycerides} unit="mg/dL" refKey="triglycerides" />
            </div>

            {/* Thyroid */}
            <div>
              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Thyroid</h4>
              <MetricRow label="TSH" value={entry.tsh} unit="mIU/L" refKey="tsh" />
              <MetricRow label="Free T3" value={entry.freeT3} unit="pg/mL" />
              <MetricRow label="Free T4" value={entry.freeT4} unit="ng/dL" />
            </div>

            {/* Vitamins */}
            <div>
              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Vitamins & Minerals</h4>
              <MetricRow label="Vitamin D" value={entry.vitaminD} unit="ng/mL" refKey="vitaminD" />
              <MetricRow label="Vitamin B12" value={entry.vitaminB12} unit="pg/mL" />
              <MetricRow label="Ferritin" value={entry.ferritin} unit="ng/mL" />
              <MetricRow label="Iron" value={entry.iron} unit="μg/dL" />
            </div>

            {/* Hormones */}
            {(entry.testosterone || entry.cortisol) && (
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Hormones</h4>
                <MetricRow label="Testosterone" value={entry.testosterone} unit="ng/dL" />
                <MetricRow label="Free Testosterone" value={entry.freeTestosterone} unit="pg/mL" />
                <MetricRow label="Cortisol" value={entry.cortisol} unit="μg/dL" />
              </div>
            )}

            {/* Inflammation & Liver */}
            {(entry.crp || entry.alt || entry.ast) && (
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Inflammation & Liver</h4>
                <MetricRow label="CRP" value={entry.crp} unit="mg/L" />
                <MetricRow label="ALT" value={entry.alt} unit="U/L" />
                <MetricRow label="AST" value={entry.ast} unit="U/L" />
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-1 text-sm">Notes</h4>
                <p className="text-sm text-muted-foreground">{entry.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddBloodworkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    labName: "",
    // Metabolic
    hba1c: "",
    fastingGlucose: "",
    fastingInsulin: "",
    // Lipids
    totalCholesterol: "",
    hdlCholesterol: "",
    ldlCholesterol: "",
    triglycerides: "",
    // Thyroid
    tsh: "",
    // Vitamins
    vitaminD: "",
    vitaminB12: "",
    ferritin: "",
    // Notes
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/bloodwork", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bloodwork"] });
      toast({ title: "Bloodwork entry added" });
      onOpenChange(false);
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        labName: "",
        hba1c: "",
        fastingGlucose: "",
        fastingInsulin: "",
        totalCholesterol: "",
        hdlCholesterol: "",
        ldlCholesterol: "",
        triglycerides: "",
        tsh: "",
        vitaminD: "",
        vitaminB12: "",
        ferritin: "",
        notes: "",
      });
    },
    onError: () => {
      toast({ title: "Failed to add bloodwork entry", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { date: formData.date };
    if (formData.labName) data.labName = formData.labName;
    if (formData.hba1c) data.hba1c = parseFloat(formData.hba1c);
    if (formData.fastingGlucose) data.fastingGlucose = parseFloat(formData.fastingGlucose);
    if (formData.fastingInsulin) data.fastingInsulin = parseFloat(formData.fastingInsulin);
    if (formData.totalCholesterol) data.totalCholesterol = parseFloat(formData.totalCholesterol);
    if (formData.hdlCholesterol) data.hdlCholesterol = parseFloat(formData.hdlCholesterol);
    if (formData.ldlCholesterol) data.ldlCholesterol = parseFloat(formData.ldlCholesterol);
    if (formData.triglycerides) data.triglycerides = parseFloat(formData.triglycerides);
    if (formData.tsh) data.tsh = parseFloat(formData.tsh);
    if (formData.vitaminD) data.vitaminD = parseFloat(formData.vitaminD);
    if (formData.vitaminB12) data.vitaminB12 = parseFloat(formData.vitaminB12);
    if (formData.ferritin) data.ferritin = parseFloat(formData.ferritin);
    if (formData.notes) data.notes = formData.notes;
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bloodwork Results</DialogTitle>
          <DialogDescription>
            Enter your lab results. You can add more markers later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labName">Lab Name</Label>
              <Input
                id="labName"
                placeholder="e.g., Quest Diagnostics"
                value={formData.labName}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
              />
            </div>
          </div>

          {/* Metabolic Panel */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Metabolic Panel</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hba1c">HbA1c (%)</Label>
                <Input
                  id="hba1c"
                  type="number"
                  step="0.1"
                  placeholder="5.4"
                  value={formData.hba1c}
                  onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fastingGlucose">Glucose (mg/dL)</Label>
                <Input
                  id="fastingGlucose"
                  type="number"
                  placeholder="90"
                  value={formData.fastingGlucose}
                  onChange={(e) => setFormData({ ...formData, fastingGlucose: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fastingInsulin">Insulin (μIU/mL)</Label>
                <Input
                  id="fastingInsulin"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={formData.fastingInsulin}
                  onChange={(e) => setFormData({ ...formData, fastingInsulin: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Lipid Panel */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Lipid Panel</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCholesterol">Total (mg/dL)</Label>
                <Input
                  id="totalCholesterol"
                  type="number"
                  placeholder="180"
                  value={formData.totalCholesterol}
                  onChange={(e) => setFormData({ ...formData, totalCholesterol: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hdlCholesterol">HDL (mg/dL)</Label>
                <Input
                  id="hdlCholesterol"
                  type="number"
                  placeholder="55"
                  value={formData.hdlCholesterol}
                  onChange={(e) => setFormData({ ...formData, hdlCholesterol: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldlCholesterol">LDL (mg/dL)</Label>
                <Input
                  id="ldlCholesterol"
                  type="number"
                  placeholder="90"
                  value={formData.ldlCholesterol}
                  onChange={(e) => setFormData({ ...formData, ldlCholesterol: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="triglycerides">Triglycerides</Label>
                <Input
                  id="triglycerides"
                  type="number"
                  placeholder="100"
                  value={formData.triglycerides}
                  onChange={(e) => setFormData({ ...formData, triglycerides: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Other Markers */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Other Markers</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tsh">TSH (mIU/L)</Label>
                <Input
                  id="tsh"
                  type="number"
                  step="0.01"
                  placeholder="2.0"
                  value={formData.tsh}
                  onChange={(e) => setFormData({ ...formData, tsh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vitaminD">Vitamin D</Label>
                <Input
                  id="vitaminD"
                  type="number"
                  placeholder="50"
                  value={formData.vitaminD}
                  onChange={(e) => setFormData({ ...formData, vitaminD: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vitaminB12">Vitamin B12</Label>
                <Input
                  id="vitaminB12"
                  type="number"
                  placeholder="500"
                  value={formData.vitaminB12}
                  onChange={(e) => setFormData({ ...formData, vitaminB12: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ferritin">Ferritin</Label>
                <Input
                  id="ferritin"
                  type="number"
                  placeholder="100"
                  value={formData.ferritin}
                  onChange={(e) => setFormData({ ...formData, ferritin: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any observations or context..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Results"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BloodworkTab() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery<BloodworkEntry[]>({
    queryKey: ["/api/bloodwork"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/bloodwork/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bloodwork"] });
      toast({ title: "Bloodwork entry deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bloodwork History</h2>
          <p className="text-sm text-muted-foreground">
            Track your quarterly lab results and metabolic markers
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Results
        </Button>
      </div>

      {/* Empty State */}
      {sortedEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No bloodwork results yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your lab results to track metabolic health, hormones, and more
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Results
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedEntries.map((entry) => (
            <BloodworkCard
              key={entry.id}
              entry={entry}
              onEdit={() => {
                // TODO: Implement edit
                toast({ title: "Edit coming soon" });
              }}
              onDelete={() => {
                if (confirm("Delete this bloodwork entry?")) {
                  deleteMutation.mutate(entry.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddBloodworkDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
