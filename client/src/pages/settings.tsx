import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Tag, Briefcase, Info } from "lucide-react";

const DOMAINS = [
  { value: "home", label: "Home", description: "Home and household tasks" },
  { value: "work", label: "Work", description: "Work and professional tasks" },
  { value: "health", label: "Health", description: "Health, fitness, and wellness" },
  { value: "finance", label: "Finance", description: "Financial tasks and budgeting" },
  { value: "travel", label: "Travel", description: "Travel planning and logistics" },
  { value: "learning", label: "Learning", description: "Education and skill development" },
  { value: "play", label: "Play", description: "Entertainment and leisure" },
  { value: "calls", label: "Calls", description: "Phone calls and communications" },
  { value: "personal", label: "Personal", description: "Personal matters and errands" },
];

const TASK_TYPES = [
  { value: "business", label: "Business", description: "Business and revenue-generating work" },
  { value: "deep_work", label: "Deep Work", description: "Focused, cognitively demanding work" },
  { value: "admin", label: "Admin", description: "Administrative tasks" },
  { value: "health", label: "Health", description: "Health-related activities" },
  { value: "learning", label: "Learning", description: "Learning and research" },
  { value: "personal", label: "Personal", description: "Personal tasks" },
];

const FOCUS_SLOTS = [
  { value: "morning_routine", label: "Morning Routine", time: "6-9am" },
  { value: "deep_work_1", label: "Deep Work Block 1", time: "9-11am" },
  { value: "admin_block_1", label: "Admin Block 1", time: "11am-12pm" },
  { value: "deep_work_2", label: "Deep Work Block 2", time: "2-4pm" },
  { value: "admin_block_2", label: "Admin Block 2", time: "4-5pm" },
  { value: "evening_review", label: "Evening Review", time: "5-6pm" },
  { value: "meetings", label: "Meetings", time: "Flexible" },
  { value: "buffer", label: "Buffer", time: "Flexible" },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              System configuration and available categories
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Domains Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Domains
              </CardTitle>
              <CardDescription>
                Life areas for categorizing tasks and captures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DOMAINS.map((domain) => (
                  <div
                    key={domain.value}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{domain.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {domain.description}
                      </p>
                    </div>
                    <Badge variant="secondary">{domain.value}</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    To add new domains, update the schema in{" "}
                    <code className="bg-muted px-1 rounded">shared/schema.ts</code> and run{" "}
                    <code className="bg-muted px-1 rounded">npm run db:push</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Types Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Task Types
              </CardTitle>
              <CardDescription>
                Types of work for categorizing tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TASK_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                    <Badge variant="secondary">{type.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Focus Slots Section */}
        <Card>
          <CardHeader>
            <CardTitle>Focus Slots</CardTitle>
            <CardDescription>
              Time blocks for scheduling deep work and tasks throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {FOCUS_SLOTS.map((slot) => (
                <div
                  key={slot.value}
                  className="p-4 rounded-lg border text-center"
                >
                  <p className="font-medium">{slot.label}</p>
                  <p className="text-sm text-muted-foreground">{slot.time}</p>
                  <Badge variant="outline" className="mt-2">
                    {slot.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
