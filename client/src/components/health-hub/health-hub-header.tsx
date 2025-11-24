import { Heart, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HealthHubHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  onOpenQuickLog: () => void;
}

export default function HealthHubHeader({
  dateRange,
  onDateRangeChange,
  onOpenQuickLog,
}: HealthHubHeaderProps) {
  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Export to CSV");
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Health & Performance</h1>
        </div>
        <p className="text-muted-foreground">
          Track your physical and mental wellness, workouts, and sleep patterns
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button onClick={onOpenQuickLog}>
          <Plus className="h-4 w-4 mr-2" />
          Log Health
        </Button>
      </div>
    </div>
  );
}
