import { useState } from "react";
import { Briefcase, Plus, Grid3x3, List, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateVentureModal from "./create-venture-modal";
import ProjectWizard from "./project-wizard";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "planning", label: "Planning" },
  { value: "building", label: "Building" },
  { value: "ongoing", label: "Ongoing" },
  { value: "on_hold", label: "On Hold" },
  { value: "archived", label: "Archived" },
];

interface VenturesHeaderProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export default function VenturesHeader({ viewMode, onViewModeChange, statusFilter, onStatusFilterChange }: VenturesHeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Venture HQ</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage all your ventures and projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowProjectWizard(true)} size="sm" variant="outline">
            <Sparkles className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">AI Wizard</span>
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Venture</span>
          </Button>
        </div>
      </div>

      <CreateVentureModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      <ProjectWizard
        open={showProjectWizard}
        onOpenChange={setShowProjectWizard}
      />
    </>
  );
}
