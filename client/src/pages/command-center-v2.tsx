import React, { useState, useEffect } from "react";
import { HealthBattery, ContextCard, MissionStatement } from "@/components/cockpit/cockpit-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function CommandCenterV2() {
    // Mock State - In production this would come from API
    const [time, setTime] = useState(new Date());

    const { data: readiness } = useQuery({
        queryKey: ["readiness"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/readiness");
            if (!res.ok) throw new Error("Failed to fetch readiness");
            return res.json();
        },
        initialData: { percentage: 0, sleep: 0, mood: "unknown" }
    });

    if (readiness.status === "no_data") {
        console.log("Readiness: No data found for today.");
    }

    const [mission] = useState("Ship Aura MVP");

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

    // Mode Configuration
    const modeConfig = {
        morning: {
            title: "Ignition Sequence",
            description: "Hydrate. Move. Plan. Do not check email.",
            action: "Start Ritual"
        },
        deep_work: {
            title: "Deep Work Protocol",
            description: "90 minutes. One task. No distractions.",
            action: "Start Focus Timer"
        },
        trading: {
            title: "Alpha Desk",
            description: "Market is open. Check setups. Manage risk.",
            action: "Open Charts"
        },
        admin: {
            title: "Admin & Logistics",
            description: "Process inbox. Reply to emails. Clear the clutter.",
            action: "Open Inbox"
        },
        shutdown: {
            title: "System Shutdown",
            description: "Review the day. Plan tomorrow. Disconnect.",
            action: "Start Review"
        }
    };

    const currentConfig = modeConfig[mode];

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
                    <HealthBattery
                        percentage={readiness.percentage}
                        sleepHours={readiness.sleep}
                        mood={readiness.mood}
                    />
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
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="font-medium">Aura</span>
                                </div>
                                <span className="text-xs text-muted-foreground">On Track</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                    <span className="font-medium">Alpha</span>
                                </div>
                                <span className="text-xs text-muted-foreground">Waiting</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="font-medium">Temple</span>
                                </div>
                                <span className="text-xs text-muted-foreground">Active</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Inbox</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">3</div>
                            <p className="text-xs text-muted-foreground">Items to process</p>
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
                            onAction={() => console.log("Action clicked")}
                        />
                    </div>
                    <MissionStatement mission={mission} />
                </div>

                {/* RIGHT: TASKS (Filtered by Context) */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                {mode === "trading" ? "Active Setups" : "Next Actions"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Mock Tasks */}
                            <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="text-sm">
                                    <div className="font-medium">Review Q3 Roadmap</div>
                                    <div className="text-xs text-muted-foreground">Aura • P1</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="text-sm">
                                    <div className="font-medium">Update Trading Journal</div>
                                    <div className="text-xs text-muted-foreground">Alpha • Routine</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                                <div className="text-sm line-through text-muted-foreground">
                                    <div className="font-medium">Morning Workout</div>
                                    <div className="text-xs">Temple • Done</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </main>
        </div>
    );
}
