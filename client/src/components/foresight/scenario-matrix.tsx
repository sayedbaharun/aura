/**
 * Scenario Matrix - 2x2 quadrant visualization for scenarios
 * Shows scenarios positioned by two uncertainty dimensions
 */
import { cn } from "@/lib/utils";

interface ScenarioMatrixProps {
  scenariosByQuadrant: Record<string, number>;
  onQuadrantClick?: (quadrant: string) => void;
  axisLabels?: {
    x: { low: string; high: string };
    y: { low: string; high: string };
  };
}

const DEFAULT_AXIS_LABELS = {
  x: { low: "Low Disruption", high: "High Disruption" },
  y: { low: "Unfavorable", high: "Favorable" },
};

const QUADRANT_CONFIG = {
  growth: {
    label: "Growth",
    description: "Favorable conditions + high disruption",
    color: "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-300 dark:border-green-700",
    position: "top-right",
  },
  transformation: {
    label: "Transform",
    description: "Favorable conditions + low disruption",
    color: "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-700",
    position: "top-left",
  },
  constraint: {
    label: "Constraint",
    description: "Unfavorable conditions + high disruption",
    color: "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    position: "bottom-right",
  },
  collapse: {
    label: "Collapse",
    description: "Unfavorable conditions + low disruption",
    color: "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700",
    position: "bottom-left",
  },
};

export function ScenarioMatrix({
  scenariosByQuadrant,
  onQuadrantClick,
  axisLabels = DEFAULT_AXIS_LABELS,
}: ScenarioMatrixProps) {
  const totalScenarios = Object.values(scenariosByQuadrant).reduce((a, b) => a + b, 0);

  const renderQuadrant = (quadrant: keyof typeof QUADRANT_CONFIG) => {
    const config = QUADRANT_CONFIG[quadrant];
    const count = scenariosByQuadrant[quadrant] || 0;

    return (
      <button
        onClick={() => onQuadrantClick?.(quadrant)}
        className={cn(
          "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
          config.color,
          config.borderColor,
          "cursor-pointer"
        )}
      >
        <div className={cn("text-sm font-semibold", config.textColor)}>
          {config.label}
        </div>
        <div className={cn("text-3xl font-bold mt-1", config.textColor)}>
          {count}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          scenario{count !== 1 ? 's' : ''}
        </div>
      </button>
    );
  };

  if (totalScenarios === 0) {
    return (
      <div className="relative">
        {/* Y-axis label */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground whitespace-nowrap">
          {axisLabels.y.high} ↑
        </div>

        {/* Matrix Grid */}
        <div className="ml-4">
          <div className="grid grid-cols-2 gap-2">
            {/* Top Row */}
            <div className="h-24 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground text-sm">
              Transform
            </div>
            <div className="h-24 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground text-sm">
              Growth
            </div>
            {/* Bottom Row */}
            <div className="h-24 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground text-sm">
              Collapse
            </div>
            <div className="h-24 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground text-sm">
              Constraint
            </div>
          </div>

          {/* X-axis label */}
          <div className="text-xs text-muted-foreground text-center mt-2">
            {axisLabels.x.low} → {axisLabels.x.high}
          </div>
        </div>

        {/* Empty state overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          <p className="text-sm text-muted-foreground">
            No scenarios created yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Y-axis label */}
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground whitespace-nowrap">
        {axisLabels.y.high} ↑
      </div>

      {/* Matrix Grid */}
      <div className="ml-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Top Row: Transformation | Growth */}
          {renderQuadrant("transformation")}
          {renderQuadrant("growth")}
          {/* Bottom Row: Collapse | Constraint */}
          {renderQuadrant("collapse")}
          {renderQuadrant("constraint")}
        </div>

        {/* X-axis label */}
        <div className="text-xs text-muted-foreground text-center mt-2">
          {axisLabels.x.low} → {axisLabels.x.high}
        </div>
      </div>
    </div>
  );
}

/**
 * Full-size interactive scenario matrix for the scenarios page
 */
interface InteractiveScenarioMatrixProps {
  scenarios: {
    id: string;
    title: string;
    quadrant: string | null;
    probability: string | null;
    impact: string | null;
  }[];
  onScenarioClick?: (scenarioId: string) => void;
  onQuadrantClick?: (quadrant: string) => void;
  axisLabels?: {
    x: { low: string; high: string; label: string };
    y: { low: string; high: string; label: string };
  };
}

export function InteractiveScenarioMatrix({
  scenarios,
  onScenarioClick,
  onQuadrantClick,
  axisLabels,
}: InteractiveScenarioMatrixProps) {
  const getScenariosByQuadrant = (quadrant: string) => {
    return scenarios.filter((s) => s.quadrant === quadrant);
  };

  const renderQuadrant = (quadrant: keyof typeof QUADRANT_CONFIG) => {
    const config = QUADRANT_CONFIG[quadrant];
    const quadrantScenarios = getScenariosByQuadrant(quadrant);

    return (
      <div
        className={cn(
          "relative flex flex-col p-4 rounded-lg border-2 min-h-[200px] transition-all",
          config.color,
          config.borderColor
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className={cn("font-semibold", config.textColor)}>
            {config.label}
          </div>
          <button
            onClick={() => onQuadrantClick?.(quadrant)}
            className={cn(
              "text-xs px-2 py-1 rounded",
              config.textColor,
              "hover:bg-white/50 dark:hover:bg-black/20"
            )}
          >
            + Add
          </button>
        </div>

        <div className="flex-1 space-y-2">
          {quadrantScenarios.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              No scenarios in this quadrant
            </div>
          ) : (
            quadrantScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => onScenarioClick?.(scenario.id)}
                className={cn(
                  "w-full text-left p-2 rounded text-sm",
                  "bg-white/60 dark:bg-black/20",
                  "hover:bg-white/80 dark:hover:bg-black/30",
                  "border border-transparent hover:border-current",
                  config.textColor
                )}
              >
                <div className="font-medium truncate">{scenario.title}</div>
                <div className="flex gap-2 mt-1 text-xs opacity-70">
                  {scenario.probability && (
                    <span>P: {scenario.probability}</span>
                  )}
                  {scenario.impact && (
                    <span>I: {scenario.impact}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Y-axis label */}
      {axisLabels && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-muted-foreground whitespace-nowrap">
          {axisLabels.y.label}
        </div>
      )}

      {/* Matrix Grid */}
      <div className="ml-8">
        {/* Y-axis endpoints */}
        <div className="flex justify-between text-xs text-muted-foreground mb-1 px-2">
          <span>{axisLabels?.y.high || "Favorable"}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Top Row: Transformation | Growth */}
          {renderQuadrant("transformation")}
          {renderQuadrant("growth")}
          {/* Bottom Row: Collapse | Constraint */}
          {renderQuadrant("collapse")}
          {renderQuadrant("constraint")}
        </div>

        {/* X-axis label and endpoints */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1 px-2">
          <span>{axisLabels?.x.low || "Low"}</span>
          <span className="font-medium">{axisLabels?.x.label || "Disruption"}</span>
          <span>{axisLabels?.x.high || "High"}</span>
        </div>
      </div>
    </div>
  );
}
