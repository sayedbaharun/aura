import { useState } from "react";
import { Briefcase, Plus, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateVentureModal from "./create-venture-modal";

interface VenturesHeaderProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function VenturesHeader({ viewMode, onViewModeChange }: VenturesHeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Venture HQ</h1>
          </div>
          <p className="text-muted-foreground">
            Manage all your ventures and projects
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Venture
          </Button>
        </div>
      </div>

      <CreateVentureModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
