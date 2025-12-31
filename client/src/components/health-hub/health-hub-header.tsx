import { Heart, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HealthHubHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  onOpenQuickLog: () => void;
  hideTitle?: boolean;
}

export default function HealthHubHeader({
  dateRange,
  onDateRangeChange,
  onOpenQuickLog,
  hideTitle = false,
}: HealthHubHeaderProps) {
  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Export to CSV");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {!hideTitle && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Health & Performance</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your physical and mental wellness, workouts, and sleep patterns
          </p>
        </div>
      )}
      <div className={`flex items-center gap-2 sm:gap-3 flex-wrap ${hideTitle ? 'ml-auto' : ''}`}>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-32 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button onClick={onOpenQuickLog} size="sm">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Log Health</span>
        </Button>
      </div>
    </div>
  );
}
