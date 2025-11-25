import { useState } from "react";
import { format } from "date-fns";
import { Eye, Edit, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

interface HealthMetricsTableProps {
  healthEntries: HealthEntry[];
  onViewDay: (date: string) => void;
  onEditEntry: (entry: HealthEntry) => void;
}

type SortField = "date" | "sleepHours" | "energyLevel" | "steps" | "weightKg";
type SortDirection = "asc" | "desc";

export default function HealthMetricsTable({
  healthEntries,
  onViewDay,
  onEditEntry,
}: HealthMetricsTableProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedEntries = [...healthEntries].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (aVal === null) return 1;
    if (bVal === null) return -1;

    if (sortField === "date") {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Health Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Date
                      <SortIcon field="date" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("sleepHours")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Sleep
                      <SortIcon field="sleepHours" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Sleep Quality</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("energyLevel")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Energy
                      <SortIcon field="energyLevel" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Mood</TableHead>
                  <TableHead className="hidden md:table-cell">Workout</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <button
                      onClick={() => handleSort("steps")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Steps
                      <SortIcon field="steps" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <button
                      onClick={() => handleSort("weightKg")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Weight
                      <SortIcon field="weightKg" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Stress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No health entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{entry.sleepHours ? `${entry.sleepHours}h` : "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="capitalize">{entry.sleepQuality || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-medium",
                            entry.energyLevel && entry.energyLevel >= 4 && "text-emerald-600",
                            entry.energyLevel === 3 && "text-amber-600",
                            entry.energyLevel && entry.energyLevel <= 2 && "text-rose-600"
                          )}
                        >
                          {entry.energyLevel ? `${entry.energyLevel}/5` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="capitalize">{entry.mood || "—"}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {entry.workoutDone ? (
                          <span className="text-emerald-600 font-medium">
                            ✓ {entry.workoutType && entry.workoutType !== "none" ? entry.workoutType : ""}
                            {entry.workoutDurationMin ? ` (${entry.workoutDurationMin}m)` : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">✗</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {entry.steps ? entry.steps.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {entry.weightKg ? `${entry.weightKg} kg` : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="capitalize">{entry.stressLevel || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDay(entry.date)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditEntry(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
