import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Venture, Day } from "@shared/schema";

interface VentureFocusPickerProps {
  day: Day | null;
  compact?: boolean;
}

export default function VentureFocusPicker({
  day,
  compact = false,
}: VentureFocusPickerProps) {
  const queryClient = useQueryClient();

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const activeVentures = Array.isArray(ventures)
    ? ventures.filter((v) => v.status !== "archived")
    : [];

  const selectedVenture = activeVentures.find(
    (v) => v.id === day?.primaryVentureFocus
  );

  const updateMutation = useMutation({
    mutationFn: async (ventureId: string) => {
      if (!day?.date) return;
      const res = await apiRequest("PATCH", `/api/days/${day.date}`, { primaryVentureFocus: ventureId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["days"] });
    },
  });

  const handleSelect = (ventureId: string) => {
    updateMutation.mutate(ventureId);
  };

  // Compact badge mode (for execution/evening modes)
  if (compact && selectedVenture) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: selectedVenture.color
            ? `${selectedVenture.color}15`
            : undefined,
          borderColor: selectedVenture.color || undefined,
        }}
      >
        {selectedVenture.icon && (
          <span className="text-sm">{selectedVenture.icon}</span>
        )}
        <span className="text-sm font-medium">{selectedVenture.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 h-auto py-2",
            selectedVenture && "border-2"
          )}
          style={{
            borderColor: selectedVenture?.color || undefined,
            backgroundColor: selectedVenture?.color
              ? `${selectedVenture.color}10`
              : undefined,
          }}
        >
          {selectedVenture ? (
            <>
              {selectedVenture.icon && (
                <span className="text-lg">{selectedVenture.icon}</span>
              )}
              <div className="flex flex-col items-start">
                <span className="text-xs text-muted-foreground">
                  Today's Focus
                </span>
                <span className="font-semibold">{selectedVenture.name}</span>
              </div>
            </>
          ) : (
            <>
              <Target className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-xs text-muted-foreground">
                  Today's Focus
                </span>
                <span className="text-muted-foreground">Pick a venture</span>
              </div>
            </>
          )}
          <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {activeVentures.map((venture) => (
          <DropdownMenuItem
            key={venture.id}
            onClick={() => handleSelect(venture.id)}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: venture.color ? `${venture.color}20` : undefined }}
            >
              {venture.icon ? (
                <span>{venture.icon}</span>
              ) : (
                <Target className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">{venture.name}</div>
              {venture.oneLiner && (
                <div className="text-xs text-muted-foreground truncate">
                  {venture.oneLiner}
                </div>
              )}
            </div>
            {venture.id === day?.primaryVentureFocus && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
