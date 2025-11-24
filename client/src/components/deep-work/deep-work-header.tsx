import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";

interface DeepWorkHeaderProps {
  selectedWeek: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  onScheduleTask: () => void;
}

export default function DeepWorkHeader({
  selectedWeek,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
  onScheduleTask,
}: DeepWorkHeaderProps) {
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Deep Work & Planning</h1>
        <p className="text-muted-foreground mt-1">
          Schedule your most important work
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousWeek}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onThisWeek}
            className="h-8 px-3 font-medium"
          >
            This Week
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNextWeek}
            className="h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm font-medium text-muted-foreground">
          {format(weekStart, "MMM d")} - {format(weekEnd, "d, yyyy")}
        </div>

        <Button onClick={onScheduleTask} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Schedule Task
        </Button>
      </div>
    </div>
  );
}
