import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTemplates, type TemplateCategory } from "@/hooks/use-templates";
import type { DocTemplate } from "@/lib/doc-templates";
import { FileText, ListChecks, BookOpen, Settings } from "lucide-react";

interface TemplateSelectorProps {
  onSelect: (template: DocTemplate) => void;
  selectedId?: string;
}

const CATEGORY_CONFIG = {
  tracking: {
    label: "Tracking",
    icon: ListChecks,
    description: "Track subscriptions, vendors, competitors, and more",
  },
  planning: {
    label: "Planning",
    icon: FileText,
    description: "Project plans, meetings, and sprints",
  },
  reference: {
    label: "Reference",
    icon: BookOpen,
    description: "Resource libraries, glossaries, and documentation",
  },
  process: {
    label: "Process",
    icon: Settings,
    description: "SOPs, checklists, and onboarding guides",
  },
};

export default function TemplateSelector({
  onSelect,
  selectedId,
}: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const { templates, categories } = useTemplates(activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose a Template</h3>
        <p className="text-sm text-muted-foreground">
          Start with a pre-built template or create a blank page
        </p>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as TemplateCategory)}
      >
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="reference">Reference</TabsTrigger>
          <TabsTrigger value="process">Process</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeCategory !== "all" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {CATEGORY_CONFIG[activeCategory as keyof typeof CATEGORY_CONFIG]?.icon &&
            (() => {
              const Icon =
                CATEGORY_CONFIG[activeCategory as keyof typeof CATEGORY_CONFIG]
                  .icon;
              return <Icon className="h-4 w-4" />;
            })()}
          <span>
            {
              CATEGORY_CONFIG[activeCategory as keyof typeof CATEGORY_CONFIG]
                ?.description
            }
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedId === template.id
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelect(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl">{template.icon}</span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {template.category}
                </Badge>
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                {template.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No templates found in this category</p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => onSelect({ id: "blank" } as DocTemplate)}
        >
          Start with Blank Page
        </Button>
      </div>
    </div>
  );
}
