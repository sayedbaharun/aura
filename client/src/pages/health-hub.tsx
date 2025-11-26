import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfMonth } from "date-fns";
import { Heart } from "lucide-react";
import HealthHubHeader from "@/components/health-hub/health-hub-header";
import HealthCalendar from "@/components/health-hub/health-calendar";
import QuickStats from "@/components/health-hub/quick-stats";
import HealthMetricsTable from "@/components/health-hub/health-metrics-table";
import PerformanceInsights from "@/components/health-hub/performance-insights";
import DayDetailModal from "@/components/health-hub/day-detail-modal";
import QuickLogModal from "@/components/health-hub/quick-log-modal";
import EditHealthEntryModal from "@/components/health-hub/edit-health-entry-modal";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthEntry {
  id: string;
  dayId: string;
  date: string;
  sleepHours: number | null;
  sleepQuality: string | null;
  energyLevel: number | null;
  mood: string | null;
  steps: number | null;
  workoutDone: boolean;
  workoutType: string | null;
  workoutDurationMin: number | null;
  weightKg: number | null;
  stressLevel: string | null;
  notes: string | null;
}

export default function HealthHub() {
  const [dateRange, setDateRange] = useState("30");
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [editEntryOpen, setEditEntryOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<HealthEntry | null>(null);

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "7":
        return { start: subDays(today, 7), end: today };
      case "30":
        return { start: subDays(today, 30), end: today };
      case "90":
        return { start: subDays(today, 90), end: today };
      default:
        return { start: new Date(2020, 0, 1), end: today };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch health entries
  const { data: healthEntries = [], isLoading } = useQuery<HealthEntry[]>({
    queryKey: ["/api/health"],
  });

  // Ensure healthEntries is an array
  const entriesArray = Array.isArray(healthEntries) ? healthEntries : [];

  // Filter entries by date range
  const filteredEntries = entriesArray.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Get entry for selected date
  const selectedEntry = selectedDate
    ? entriesArray.find((e) => e.date === selectedDate)
    : null;

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setDayDetailOpen(true);
  };

  const handleEditEntry = (entry: HealthEntry) => {
    setEditingEntry(entry);
    setEditEntryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Health & Performance</h1>
            </div>
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <HealthHubHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onOpenQuickLog={() => setQuickLogOpen(true)}
      />

      {/* Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">No health data yet</h2>
          <p className="text-muted-foreground mb-6">
            Start logging your health metrics to see insights and track your wellness journey
          </p>
          <button
            onClick={() => setQuickLogOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Log Your First Day
          </button>
        </div>
      ) : (
        <>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <HealthCalendar
                healthEntries={filteredEntries}
                currentMonth={startOfMonth(new Date())}
                onDayClick={handleDayClick}
              />
            </div>

            {/* Quick Stats */}
            <div>
              <QuickStats healthEntries={filteredEntries} />
            </div>
          </div>

          {/* Health Metrics Table */}
          <HealthMetricsTable
            healthEntries={filteredEntries}
            onViewDay={handleDayClick}
            onEditEntry={handleEditEntry}
          />

          {/* Performance Insights */}
          <PerformanceInsights healthEntries={filteredEntries} />
        </>
      )}

      {/* Modals */}
      <QuickLogModal open={quickLogOpen} onOpenChange={setQuickLogOpen} />

      <EditHealthEntryModal
        open={editEntryOpen}
        onOpenChange={setEditEntryOpen}
        entry={editingEntry}
      />

      <DayDetailModal
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
        date={selectedDate}
        healthEntry={selectedEntry || null}
        onEdit={(entry) => {
          setDayDetailOpen(false);
          handleEditEntry(entry);
        }}
      />
    </div>
  );
}
