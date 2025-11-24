import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Rocket, TrendingUp, Target } from "lucide-react";

export default function VentureHQ() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Venture HQ</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your startup ventures, track OKRs, and monitor growth metrics
          </p>
        </div>
        <Badge variant="secondary">Phase 2</Badge>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 2</CardTitle>
          <CardDescription>
            Advanced venture management features are currently in development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 py-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Multi-Venture Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor multiple ventures with individual OKRs, milestones, and metrics
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Growth Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Visual dashboards for revenue, users, and key growth indicators
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">OKR Management</h3>
                <p className="text-sm text-muted-foreground">
                  Set and track Objectives and Key Results with progress indicators
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Venture Portfolio</h3>
                <p className="text-sm text-muted-foreground">
                  Overview of all your ventures with status, stage, and health scores
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          This module will be available soon. Check back in Phase 2!
        </p>
      </div>
    </div>
  );
}
