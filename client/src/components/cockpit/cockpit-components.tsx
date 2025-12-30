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

    const glowColors = {
        morning: "shadow-orange-500/20",
        deep_work: "shadow-purple-500/20",
        trading: "shadow-green-500/20",
        admin: "shadow-blue-500/20",
        shutdown: "shadow-indigo-500/20",
    };

    return (
        <motion.div
            key={mode} // Re-animate on mode change
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
        >
            <Card className={cn(
                "h-full border-2 overflow-hidden bg-gradient-to-br transition-shadow duration-500",
                gradients[mode],
                `shadow-lg ${glowColors[mode]}`
            )}>
                <CardContent className="flex flex-col items-center justify-center p-6 md:p-8 text-center h-full min-h-[300px]">
                    <motion.div
                        className="mb-6 p-4 rounded-full bg-background/50 backdrop-blur-sm shadow-sm"
                        initial={{ rotate: -10, scale: 0.8 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {icons[mode]}
                    </motion.div>
                    <motion.h2
                        className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        {title}
                    </motion.h2>
                    <motion.p
                        className="text-muted-foreground text-base md:text-lg max-w-md mb-8"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        {description}
                    </motion.p>

                    {actionLabel && (
                        <motion.button
                            onClick={onAction}
                            className="px-6 md:px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {actionLabel}
                        </motion.button>
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

// ============================================================================
// DAILY SCORECARD
// ============================================================================

export interface ScorecardMetric {
    label: string;
    target: string;
    actual: string | number | null;
    status: 'success' | 'warning' | 'danger' | 'pending';
    icon?: React.ReactNode;
}

interface DailyScorecardProps {
    metrics: ScorecardMetric[];
    morningComplete?: boolean;
    eveningComplete?: boolean;
}

export function DailyScorecard({ metrics, morningComplete, eveningComplete }: DailyScorecardProps) {
    const getStatusColor = (status: ScorecardMetric['status']) => {
        switch (status) {
            case 'success': return 'text-green-500';
            case 'warning': return 'text-yellow-500';
            case 'danger': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    const getStatusIcon = (status: ScorecardMetric['status']) => {
        switch (status) {
            case 'success': return '✓';
            case 'warning': return '○';
            case 'danger': return '✗';
            default: return '·';
        }
    };

    const completedCount = metrics.filter(m => m.status === 'success').length;
    const totalCount = metrics.length;
    const scorePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <Card className="border-none bg-background/50 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Daily Scorecard
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-2xl font-bold",
                            scorePercent >= 80 ? "text-green-500" :
                            scorePercent >= 50 ? "text-yellow-500" : "text-red-500"
                        )}>
                            {scorePercent}%
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 mt-1">
                    <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        morningComplete
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                    )}>
                        {morningComplete ? "☀️ AM ✓" : "☀️ AM"}
                    </span>
                    <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        eveningComplete
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                    )}>
                        {eveningComplete ? "🌙 PM ✓" : "🌙 PM"}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="pt-2">
                <div className="space-y-1">
                    {metrics.map((metric, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                        >
                            <div className="flex items-center gap-2">
                                <span className={cn("text-sm font-medium", getStatusColor(metric.status))}>
                                    {getStatusIcon(metric.status)}
                                </span>
                                <span className="text-sm text-foreground">{metric.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                    {metric.target}
                                </span>
                                <span className={cn(
                                    "text-sm font-medium min-w-[40px] text-right",
                                    getStatusColor(metric.status)
                                )}>
                                    {metric.actual ?? '-'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
