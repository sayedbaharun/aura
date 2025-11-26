import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { LucideIcon } from "lucide-react";
import NavItem from "./nav-item";
import { BadgeVariant } from "./nav-badge";

export interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: {
    content: React.ReactNode;
    variant?: BadgeVariant;
  };
}

export interface NavSectionProps {
  label: string;
  items: NavItemConfig[];
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

/**
 * NavSection Component
 *
 * A grouped section of navigation items with a label.
 *
 * @example
 * ```tsx
 * <NavSection
 *   label="Main"
 *   items={[
 *     { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
 *     { href: "/tasks", icon: CheckSquare, label: "Tasks", badge: { content: 5, variant: "alert" } }
 *   ]}
 *   isCollapsed={false}
 * />
 * ```
 *
 * Props:
 * - label: Section heading text (displayed in uppercase, small, muted)
 * - items: Array of navigation item configurations
 * - isCollapsed: Whether the sidebar is collapsed
 * - onItemClick: Optional callback when any item is clicked (useful for mobile menu)
 *
 * Customization:
 * To modify the navigation structure, simply update the items array:
 * - Add new items: Add objects to the array
 * - Remove items: Filter out unwanted items
 * - Reorder: Change array order
 * - Update badges: Modify the badge property dynamically
 */
export default function NavSection({
  label,
  items,
  isCollapsed = false,
  onItemClick,
}: NavSectionProps) {
  const [location] = useLocation();

  return (
    <div className="mb-6">
      {!isCollapsed && (
        <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
        </h3>
      )}
      <nav className="space-y-1" role="navigation" aria-label={label}>
        {items.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={location === item.href || location.startsWith(item.href + "/")}
            isCollapsed={isCollapsed}
            onClick={onItemClick}
          />
        ))}
      </nav>
    </div>
  );
}
