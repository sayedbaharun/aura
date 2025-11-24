import { useState } from "react";
import VenturesHeader from "@/components/venture-hq/ventures-header";
import VenturesGrid from "@/components/venture-hq/ventures-grid";

export default function VentureHQ() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <VenturesHeader viewMode={viewMode} onViewModeChange={setViewMode} />
      <VenturesGrid viewMode={viewMode} />
    </div>
  );
}
