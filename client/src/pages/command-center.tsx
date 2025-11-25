import TodayHeader from "@/components/command-center/today-header";
import TasksForToday from "@/components/command-center/tasks-for-today";
import HealthSnapshot from "@/components/command-center/health-snapshot";
import NutritionSnapshot from "@/components/command-center/nutrition-snapshot";
import CaptureInbox from "@/components/command-center/capture-inbox";
import ThisWeekPreview from "@/components/command-center/this-week-preview";

export default function CommandCenter() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <TodayHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TasksForToday />
          </div>
          <div className="space-y-6">
            <HealthSnapshot />
            <NutritionSnapshot />
          </div>
        </div>
        <CaptureInbox />
        <ThisWeekPreview />
      </div>
    </div>
  );
}
