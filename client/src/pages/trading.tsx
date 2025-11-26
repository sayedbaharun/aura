import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import TradingJournalEntry from "@/components/command-center/trading-journal-entry";
import type { Day } from "@shared/schema";

export default function TradingPage() {
  const { data: day, isLoading } = useQuery<Day>({
    queryKey: ["/api/days/today"],
  });

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Trading Journal</h1>
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>
        </div>

        {/* Trading Journal */}
        {isLoading ? (
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        ) : (
          <TradingJournalEntry day={day || null} />
        )}

        {/* Future: Historical view, stats, patterns */}
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Historical analysis coming in Phase 2</p>
        </div>
      </div>
    </div>
  );
}
