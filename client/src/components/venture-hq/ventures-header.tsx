import { useState } from "react";
import { Briefcase, Plus, Grid3x3, List, Sparkles, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import CreateVentureModal from "./create-venture-modal";
import ProjectWizard from "./project-wizard";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "building", label: "Building", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  { value: "ongoing", label: "Ongoing", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  { value: "archived", label: "Archived", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
];

interface VenturesHeaderProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  statusFilters: string[];
  onStatusFiltersChange: (statuses: string[]) => void;
}

export default function VenturesHeader({ viewMode, onViewModeChange, statusFilters, onStatusFiltersChange }: VenturesHeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);

  const toggleStatus = (status: string) => {
    if (statusFilters.includes(status)) {
      onStatusFiltersChange(statusFilters.filter(s => s !== status));
    } else {
      onStatusFiltersChange([...statusFilters, status]);
    }
  };

  const clearFilters = () => {
    onStatusFiltersChange([]);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Status</span>
                  {statusFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {statusFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={statusFilters.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={clearFilters}
                      className="text-muted-foreground"
                    >
                      Clear all filters
                    </DropdownMenuCheckboxItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

        {/* Active Filter Badges */}
        {statusFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtering by:</span>
            {statusFilters.map((status) => {
              const option = STATUS_OPTIONS.find(o => o.value === status);
              return (
                <Badge
                  key={status}
                  variant="secondary"
                  className={`${option?.color || ''} cursor-pointer gap-1`}
                  onClick={() => toggleStatus(status)}
                >
                  {option?.label || status}
                  <X className="h-3 w-3" />
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              Clear all
            </Button>
          </div>
        )}
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
