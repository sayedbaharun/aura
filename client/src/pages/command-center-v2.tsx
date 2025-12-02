// Command Center V2 - HUD Interface
// Build version: 2025-12-02-v4
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { HealthBattery, ContextCard, MissionStatement } from "@/components/cockpit/cockpit-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Circle, Clock, Inbox, ChevronRight, Flame, AlertTriangle, CheckCircle2, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function CommandCenterV2() {
    const [, navigate] = useLocation();
    const [time, setTime] = useState(new Date());

    // Fetch readiness data
    const { data: readiness, isLoading: isLoadingReadiness, error: readinessError } = useQuery({
        queryKey: ["dashboard-readiness"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/readiness");
            if (!res.ok) throw new Error("Failed to fetch readiness");
            return res.json();
        },
        refetchInterval: 60000
    });

    // Fetch urgent tasks (On Fire indicator)
    const { data: urgent = { onFire: false, totalUrgent: 0, tasks: [] }, isLoading: isLoadingUrgent } = useQuery({
        queryKey: ["dashboard-urgent"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/urgent");
            if (!res.ok) throw new Error("Failed to fetch urgent");
            return res.json();
        },
        staleTime: 0,
        refetchOnMount: true
    });

    // Fetch Top 3 tasks
    const { data: top3Data = { tasks: [] }, isLoading: isLoadingTop3 } = useQuery({
        queryKey: ["dashboard-top3"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/top3");
            if (!res.ok) throw new Error("Failed to fetch top3");
            return res.json();
        },
        staleTime: 0,
        refetchOnMount: true
    });

    // Fetch ventures data
    const { data: ventures = [], isLoading: isLoadingVentures, error: venturesError } = useQuery({
        queryKey: ["dashboard-ventures"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/ventures");
            if (!res.ok) throw new Error("Failed to fetch ventures");
            return res.json();
        },
        staleTime: 0,
        refetchOnMount: true
    });

    // Fetch inbox data
    const { data: inbox = { count: 0, items: [] }, isLoading: isLoadingInbox } = useQuery({
        queryKey: ["dashboard-inbox"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/inbox");
            if (!res.ok) throw new Error("Failed to fetch inbox");
            return res.json();
        },
        staleTime: 0,
        refetchOnMount: true
    });

    // Fetch today's day summary
    const { data: dayData, isLoading: isLoadingDay } = useQuery({
        queryKey: ["dashboard-day"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/day");
            if (!res.ok) throw new Error("Failed to fetch day");
            return res.json();
        }
    });

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Determine Mode based on time
    const hour = time.getHours();
    let mode: "morning" | "deep_work" | "trading" | "admin" | "shutdown" = "morning";

    if (hour >= 5 && hour < 9) mode = "morning";
    else if (hour >= 9 && hour < 12) mode = "deep_work";
    else if (hour >= 12 && hour < 14) mode = "admin";
    else if (hour >= 14 && hour < 17) mode = "trading";
    else if (hour >= 17 && hour < 20) mode = "admin";
    else mode = "shutdown";

    // Mode Configuration with navigation targets
    const modeConfig = {
        morning: {
            title: "Ignition Sequence",
            description: "Hydrate. Move. Plan. Do not check email.",
            action: "Start Ritual",
            navigateTo: "/health"
        },
        deep_work: {
            title: "Deep Work Protocol",
            description: "90 minutes. One task. No distractions.",
            action: "Start Focus Timer",
            navigateTo: "/deep-work"
        },
        trading: {
            title: "Alpha Desk",
            description: "Market is open. Check setups. Manage risk.",
            action: "Open Trading",
            navigateTo: "/trading"
        },
        admin: {
            title: "Admin & Logistics",
            description: "Process inbox. Reply to emails. Clear the clutter.",
            action: "Open Inbox",
            navigateTo: "/captures"
        },
        shutdown: {
            title: "System Shutdown",
            description: "Review the day. Plan tomorrow. Disconnect.",
            action: "Start Review",
            navigateTo: "/command-center"
        }
    };

    const currentConfig = modeConfig[mode];

    const handleAction = () => {
        navigate(currentConfig.navigateTo);
    };

    // Derive mission from day data
    const mission = dayData?.oneThingToShip || dayData?.title || "Define today's mission";

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
            {/* ON FIRE ALERT */}
            {!isLoadingUrgent && urgent.onFire && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-4">
                    <div className="p-2 bg-red-500/20 rounded-full">
                        <Flame className="h-6 w-6 text-red-500 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-red-600 dark:text-red-400">
                            {urgent.overdueP0Count > 0
                                ? `${urgent.overdueP0Count} overdue P0 task${urgent.overdueP0Count > 1 ? 's' : ''}`
                                : `${urgent.dueTodayCount} P0 task${urgent.dueTodayCount > 1 ? 's' : ''} due today`
                            }
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {urgent.tasks[0]?.title}
                        </div>
                    </div>
                    <button
                        onClick={() => navigate("/tasks")}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        View Tasks
                    </button>
                </div>
            )}

            {/* HEADER: HUD */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Command Center <span className="text-xs text-muted-foreground font-normal">v2.3</span></h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="mx-2">•</span>
                        <span className="uppercase font-semibold text-xs tracking-wider">{mode.replace("_", " ")} MODE</span>
                        {!isLoadingUrgent && urgent.totalUrgent > 0 && !urgent.onFire && (
                            <>
                                <span className="mx-2">•</span>
                                <span className="text-yellow-600 dark:text-yellow-400 text-xs font-medium flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {urgent.totalUrgent} urgent
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-auto">
                    {isLoadingReadiness ? (
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                        </div>
                    ) : readinessError ? (
                        <div className="text-sm text-red-500">Offline</div>
                    ) : (
                        <HealthBattery
                            percentage={readiness?.percentage || 0}
                            sleepHours={readiness?.sleep || 0}
                            mood={readiness?.mood || "unknown"}
                        />
                    )}
                </div>
            </header>

            <Separator />

            {/* MAIN CONTENT: THE COCKPIT */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

                {/* LEFT: VENTURE STATUS + INBOX */}
                <div className="lg:col-span-3 space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ventures</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {isLoadingVentures ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-5 w-16" />
                                        </div>
                                    ))}
                                </div>
                            ) : venturesError ? (
                                <div className="text-sm text-red-500">Error: {(venturesError as Error).message}</div>
                            ) : ventures.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No active ventures</div>
                            ) : (
                                ventures.map((v: any) => (
                                    <div
                                        key={v.id}
                                        onClick={() => navigate(`/ventures/${v.id}`)}
                                        className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${v.urgencyColor}`} />
                                            <span className="font-medium truncate">{v.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {v.urgency === 'critical' ? (
                                                <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                                    <Flame className="h-3 w-3" />
                                                    {v.urgencyLabel}
                                                </span>
                                            ) : v.urgency === 'warning' ? (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {v.urgencyLabel}
                                                </span>
                                            ) : v.taskCount > 0 ? (
                                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                                    {v.taskCount}
                                                </span>
                                            ) : (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            )}
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => navigate("/captures")}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Inbox className="h-4 w-4" />
                                Inbox
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingInbox ? (
                                <Skeleton className="h-8 w-12" />
                            ) : (
                                <>
                                    <div className="text-3xl font-bold">{inbox.count}</div>
                                    <p className="text-xs text-muted-foreground mb-3">Items to process</p>
                                    {inbox.items && inbox.items.length > 0 && (
                                        <div className="space-y-1 border-t pt-2">
                                            {inbox.items.map((item: any) => (
                                                <div key={item.id} className="text-xs text-muted-foreground truncate">
                                                    • {item.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* CENTER: ACTIVE CONTEXT */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                    <div className="flex-1 min-h-[400px]">
                        <ContextCard
                            mode={mode}
                            title={currentConfig.title}
                            description={currentConfig.description}
                            actionLabel={currentConfig.action}
                            onAction={handleAction}
                        />
                    </div>
                    {isLoadingDay ? (
                        <div className="text-center py-6">
                            <Skeleton className="h-4 w-24 mx-auto mb-2" />
                            <Skeleton className="h-6 w-48 mx-auto" />
                        </div>
                    ) : (
                        <MissionStatement mission={mission} />
                    )}
                </div>

                {/* RIGHT: TOP 3 TASKS */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Today's Top 3
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isLoadingTop3 ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-start gap-3 p-2">
                                            <Skeleton className="h-6 w-6 rounded-full" />
                                            <div className="flex-1 space-y-1">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : top3Data.tasks.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                    <p>All clear!</p>
                                    <p className="text-xs mt-1">No high-priority tasks</p>
                                </div>
                            ) : (
                                top3Data.tasks.map((t: any, index: number) => (
                                    <div
                                        key={t.id}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                    >
                                        <div className={`
                                            h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                            ${t.isOverdue
                                                ? 'bg-red-500 text-white'
                                                : t.isDueToday
                                                    ? 'bg-yellow-500 text-white'
                                                    : t.priority === 'P0'
                                                        ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                                        : t.priority === 'P1'
                                                            ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                                                            : 'bg-muted text-muted-foreground'
                                            }
                                        `}>
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm leading-tight">{t.title}</div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                <span className={`
                                                    ${t.priority === 'P0' ? 'text-red-500' : ''}
                                                    ${t.priority === 'P1' ? 'text-orange-500' : ''}
                                                `}>
                                                    {t.priority}
                                                </span>
                                                {t.isOverdue && (
                                                    <span className="text-red-500 font-medium">OVERDUE</span>
                                                )}
                                                {t.isDueToday && !t.isOverdue && (
                                                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">Due today</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

            </main>
        </div>
    );
}
