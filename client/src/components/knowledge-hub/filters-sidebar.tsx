import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DocsFilters {
  types: string[];
  domains: string[];
  statuses: string[];
  ventureId?: string;
  projectId?: string;
  tags: string[];
}

interface FiltersSidebarProps {
  filters: DocsFilters;
  onFiltersChange: (filters: DocsFilters) => void;
}

export function FiltersSidebar({ filters, onFiltersChange }: FiltersSidebarProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: ventures = [] } = useQuery<any[]>({
    queryKey: ["/api/ventures"],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: !!filters.ventureId,
  });

  const toggleType = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const toggleDomain = (domain: string) => {
    const newDomains = filters.domains.includes(domain)
      ? filters.domains.filter((d) => d !== domain)
      : [...filters.domains, domain];
    onFiltersChange({ ...filters, domains: newDomains });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const clearFilters = () => {
    onFiltersChange({
      types: [],
      domains: [],
      statuses: [],
      tags: [],
    });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.domains.length > 0 ||
    filters.statuses.length > 0 ||
    filters.ventureId ||
    filters.projectId ||
    filters.tags.length > 0;

  const activeFilterCount =
    filters.types.length +
    filters.domains.length +
    filters.statuses.length +
    (filters.ventureId ? 1 : 0) +
    (filters.projectId ? 1 : 0) +
    filters.tags.length;

  const filtersContent = (
    <div className="space-y-6">
      {/* Type Filter */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Type</Label>
        <div className="space-y-2">
          {["sop", "prompt", "spec", "template", "playbook"].map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={filters.types.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <label
                htmlFor={`type-${type}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {type === "sop" ? "SOP" : type}s
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Filter */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Domain</Label>
        <div className="space-y-2">
          {["venture_ops", "marketing", "product", "sales", "personal"].map((domain) => (
            <div key={domain} className="flex items-center space-x-2">
              <Checkbox
                id={`domain-${domain}`}
                checked={filters.domains.includes(domain)}
                onCheckedChange={() => toggleDomain(domain)}
              />
              <label
                htmlFor={`domain-${domain}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {domain.replace("_", " ")}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Status</Label>
        <div className="space-y-2">
          {["draft", "active", "archived"].map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={filters.statuses.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              />
              <label
                htmlFor={`status-${status}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {status}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Venture Filter */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Venture</Label>
        <Select
          value={filters.ventureId || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              ventureId: value === "all" ? undefined : value,
              projectId: undefined, // Reset project when venture changes
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All ventures" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ventures</SelectItem>
            {ventures.map((venture) => (
              <SelectItem key={venture.id} value={venture.id}>
                {venture.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Filter (only if venture selected) */}
      {filters.ventureId && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">Project</Label>
          <Select
            value={filters.projectId || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                projectId: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects
                .filter((p) => p.ventureId === filters.ventureId)
                .map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Filters</SheetTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="mt-6">
            {filtersContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Card sidebar
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filtersContent}
      </CardContent>
    </Card>
  );
}
