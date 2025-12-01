import React from "react";
import { motion } from "framer-motion";
import { Battery, Brain, Briefcase, Coffee, Moon, Sun, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ============================================================================
// HEALTH BATTERY
// ============================================================================

interface HealthBatteryProps {
    percentage: number; // 0-100
    sleepHours: number;
    mood: string;
}

export function HealthBattery({ percentage, sleepHours, mood }: HealthBatteryProps) {
    let color = "bg-green-500";
    if (percentage < 70) color = "bg-yellow-500";
    if (percentage < 40) color = "bg-red-500";

    return (
        <Card className="border-none bg-background/50 shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Battery className={cn("h-8 w-8", percentage < 40 ? "text-red-500" : "text-primary")} />
                        <div
                            className={cn("absolute top-2 left-1 h-4 rounded-sm transition-all", color)}
                            style={{ width: `${percentage * 0.2}px` }}
                        />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Readiness</div>
                        <div className="text-2xl font-bold">{percentage}%</div>
                    </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                    <div>Sleep: <span className="font-medium text-foreground">{sleepHours}h</span></div>
                    <div>Mood: <span className="font-medium text-foreground capitalize">{mood}</span></div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// CONTEXT CARD
// ============================================================================

interface ContextCardProps {
    mode: "morning" | "deep_work" | "trading" | "admin" | "shutdown";
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function ContextCard({ mode, title, description, actionLabel, onAction }: ContextCardProps) {
    const icons = {
        morning: <Sun className="h-12 w-12 text-orange-400" />,
        deep_work: <Brain className="h-12 w-12 text-purple-500" />,
        trading: <TrendingUp className="h-12 w-12 text-green-500" />,
        admin: <Coffee className="h-12 w-12 text-blue-400" />,
        shutdown: <Moon className="h-12 w-12 text-indigo-400" />,
    };

    const gradients = {
        morning: "from-orange-500/10 to-yellow-500/10 border-orange-200/20",
        deep_work: "from-purple-500/10 to-indigo-500/10 border-purple-200/20",
        trading: "from-green-500/10 to-emerald-500/10 border-green-200/20",
        admin: "from-blue-500/10 to-cyan-500/10 border-blue-200/20",
        shutdown: "from-indigo-500/10 to-slate-500/10 border-indigo-200/20",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className={cn("h-full border-2 overflow-hidden bg-gradient-to-br", gradients[mode])}>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
                    <div className="mb-6 p-4 rounded-full bg-background/50 backdrop-blur-sm shadow-sm">
                        {icons[mode]}
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">{title}</h2>
                    <p className="text-muted-foreground text-lg max-w-md mb-8">{description}</p>

                    {actionLabel && (
                        <button
                            onClick={onAction}
                            className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
                        >
                            {actionLabel}
                        </button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ============================================================================
// MISSION STATEMENT
// ============================================================================

interface MissionStatementProps {
    mission: string;
}

export function MissionStatement({ mission }: MissionStatementProps) {
    return (
        <div className="text-center py-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Current Mission
            </div>
            <div className="text-xl md:text-2xl font-bold text-foreground">
                "{mission}"
            </div>
        </div>
    );
}
