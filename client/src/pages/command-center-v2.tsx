// Command Center V2 - HUD Interface
// Last updated: 2025-12-02
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { HealthBattery, ContextCard, MissionStatement } from "@/components/cockpit/cockpit-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Circle, Clock, Inbox, ChevronRight } from "lucide-react";
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
        refetchInterval: 60000 // Refresh every minute
    });

    // Fetch ventures data
    const { data: ventures, isLoading: isLoadingVentures } = useQuery({
        queryKey: ["dashboard-ventures"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/ventures");
            if (!res.ok) throw new Error("Failed to fetch ventures");
            return res.json();
        },
        initialData: []
    });

    // Fetch inbox data
    const { data: inbox, isLoading: isLoadingInbox } = useQuery({
        queryKey: ["dashboard-inbox"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/inbox");
            if (!res.ok) throw new Error("Failed to fetch inbox");
            return res.json();
        },
        initialData: { count: 0, items: [] }
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

    // Fetch tasks
    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ["dashboard-tasks"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/tasks");
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
        },
        initialData: []
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
    else if (hour >= 12 && hour < 14) mode = "admin"; // Lunch/Admin
    else if (hour >= 14 && hour < 17) mode = "trading"; // Market Open (NY)
    else if (hour >= 17 && hour < 20) mode = "admin"; // Wrap up
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

    // Handle action button click
    const handleAction = () => {
        navigate(currentConfig.navigateTo);
    };

    // Filter Tasks based on Mode
    const filteredTasks = React.useMemo(() => {
        if (!tasks.length) return [];

        switch (mode) {
            case "trading":
                // Show only trading/finance tasks
                return tasks.filter((t: any) =>
                    t.domain === 'finance' ||
                    t.tags?.includes('trading') ||
                    t.title.toLowerCase().includes('trading') ||
                    t.title.toLowerCase().includes('market')
                );
            case "deep_work":
                // Show High Priority Venture tasks
                return tasks.filter((t: any) =>
                    (t.priority === 'P0' || t.priority === 'P1') &&
                    t.domain !== 'finance' // Exclude trading
                );
            case "admin":
            case "shutdown":
            case "morning":
                // Show Admin/Routine tasks or anything else
                return tasks.filter((t: any) =>
                    t.priority === 'P2' ||
                    t.priority === 'P3' ||
                    t.domain === 'admin' ||
                    t.domain === 'health'
                );
            default:
                return tasks;
        }
    }, [tasks, mode]);

    // Derive mission from day data
    const mission = dayData?.oneThingToShip || dayData?.title || "Define today's mission";

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
            {/* HEADER: HUD */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="mx-2">•</span>
                        <span className="uppercase font-semibold text-xs tracking-wider">{mode.replace("_", " ")} MODE</span>
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

                {/* LEFT: VENTURE STATUS (Peripheral) */}
                <div className="lg:col-span-3 space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ventures</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isLoadingVentures ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-2 w-2 rounded-full" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                    ))}
                                </div>
                            ) : ventures.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No active ventures</div>
                            ) : (
                                ventures.map((v: any) => (
                                    <div
                                        key={v.id}
                                        onClick={() => navigate(`/ventures/${v.id}`)}
                                        className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${v.statusColor}`} />
                                            <span className="font-medium">{v.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {v.taskCount > 0 && (
                                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{v.taskCount}</span>
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

                {/* RIGHT: TASKS (Filtered by Context) */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                {mode === "trading" ? "Active Setups" : "Next Actions"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isLoadingTasks ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-start gap-3 p-2">
                                            <Skeleton className="h-5 w-5 rounded-full" />
                                            <div className="flex-1 space-y-1">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-4 text-center">
                                    No tasks for this mode.
                                </div>
                            ) : (
                                filteredTasks.slice(0, 5).map((t: any) => (
                                    <div
                                        key={t.id}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    >
                                        <Circle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                            t.priority === 'P0' ? 'text-red-500' :
                                            t.priority === 'P1' ? 'text-orange-500' :
                                            'text-muted-foreground'
                                        }`} />
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate">{t.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {t.priority} • {t.domain || 'General'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {filteredTasks.length > 5 && (
                                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                                    +{filteredTasks.length - 5} more tasks
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </main>
        </div>
    );
}
