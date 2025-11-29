import { ReactNode } from "react";
import {
  Info,
  AlertTriangle,
  Lightbulb,
  XCircle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "tip" | "danger" | "note" | "success";

interface CalloutBlockProps {
  type: CalloutType;
  children: ReactNode;
}

const calloutConfig = {
  info: {
    icon: Info,
    className: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
    iconClassName: "text-blue-600 dark:text-blue-400",
    titleClassName: "text-blue-900 dark:text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
    iconClassName: "text-yellow-600 dark:text-yellow-400",
    titleClassName: "text-yellow-900 dark:text-yellow-300",
  },
  tip: {
    icon: Lightbulb,
    className: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    iconClassName: "text-green-600 dark:text-green-400",
    titleClassName: "text-green-900 dark:text-green-300",
  },
  danger: {
    icon: XCircle,
    className: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    iconClassName: "text-red-600 dark:text-red-400",
    titleClassName: "text-red-900 dark:text-red-300",
  },
  note: {
    icon: AlertCircle,
    className: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900",
    iconClassName: "text-purple-600 dark:text-purple-400",
    titleClassName: "text-purple-900 dark:text-purple-300",
  },
  success: {
    icon: CheckCircle,
    className: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    titleClassName: "text-emerald-900 dark:text-emerald-300",
  },
};

export function CalloutBlock({ type, children }: CalloutBlockProps) {
  const config = calloutConfig[type] || calloutConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 p-4",
        config.className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconClassName)} />
        <div className="flex-1 space-y-1">
          <div className={cn("font-semibold text-sm uppercase tracking-wide", config.titleClassName)}>
            {type}
          </div>
          <div className="text-sm leading-relaxed prose-sm dark:prose-invert">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
