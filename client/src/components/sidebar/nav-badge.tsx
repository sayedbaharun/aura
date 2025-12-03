import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "alert" | "warning" | "success" | "info";

export interface NavBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  alert: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  warning: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

/**
 * NavBadge Component
 *
 * A small pill-shaped badge for displaying counts or status in navigation items.
 *
 * @example
 * ```tsx
 * <NavBadge variant="alert">3</NavBadge>
 * <NavBadge variant="info">New</NavBadge>
 * ```
 *
 * Props:
 * - children: Content to display (usually a number or short text)
 * - variant: Visual style ('default' | 'alert' | 'warning' | 'success' | 'info')
 * - className: Additional CSS classes
 */
export default function NavBadge({
  children,
  variant = "default",
  className
}: NavBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
