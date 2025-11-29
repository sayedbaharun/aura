import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { DocTemplate } from "@/lib/doc-templates";

interface TemplatePreviewProps {
  template: DocTemplate;
  onUseTemplate: (template: DocTemplate) => void;
  onClose?: () => void;
}

export default function TemplatePreview({
  template,
  onUseTemplate,
  onClose,
}: TemplatePreviewProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon}</span>
            <div>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {template.category}
            </Badge>
            <Badge variant="outline">{template.defaultType}</Badge>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 pt-6">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                Template Preview
              </h3>
              <div className="rounded-md border bg-muted/30 p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                  {template.body}
                </pre>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between gap-2 pt-4">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Back to Templates
          </Button>
        )}
        <Button onClick={() => onUseTemplate(template)} className="ml-auto">
          Use This Template
        </Button>
      </CardFooter>
    </Card>
  );
}
