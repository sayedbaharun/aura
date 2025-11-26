# Sidebar Navigation

A modern, collapsible sidebar navigation system with full mobile support.

## Features

✨ **Collapsible on desktop** - 260px expanded, 60px collapsed
📱 **Mobile responsive** - Slides in from left with backdrop overlay
🎯 **Active state tracking** - Highlights current route
💾 **Persistent state** - Remembers collapsed preference in localStorage
♿ **Keyboard accessible** - Full tab navigation and ARIA labels
🎨 **Customizable** - Easy to modify sections, items, icons, and badges
⚡ **Smooth animations** - 200ms transitions

## Components

### Sidebar
Main sidebar component with navigation sections, collapse functionality, and mobile support.

### NavSection
Groups related navigation items with a section label.

### NavItem
Individual navigation link with icon, label, optional badge, and active/hover states.

### NavBadge
Small pill-shaped badge for displaying counts or status indicators.

## Usage

The sidebar is automatically integrated into the app layout. No additional setup needed!

```tsx
// Already included in Layout component
import { Sidebar } from "@/components/sidebar";

<Sidebar
  isOpen={mobileMenuOpen}
  onClose={() => setMobileMenuOpen(false)}
/>
```

## Customization Guide

### 1. Changing Section Labels

Edit the `navigationSections` array in `sidebar.tsx`:

```tsx
const navigationSections = [
  {
    label: "Your New Section Label", // ← Change this
    items: [...]
  }
];
```

### 2. Adding/Removing Navigation Items

Add or remove items from the `items` array:

```tsx
{
  label: "Daily",
  items: [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Command Center",
    },
    // Add new item here ↓
    {
      href: "/calendar",
      icon: Calendar,
      label: "Calendar",
    },
  ],
}
```

### 3. Updating Icons

Import new icons from `lucide-react` and update the `icon` property:

```tsx
import { Calendar, Users, FileText } from "lucide-react";

{
  href: "/team",
  icon: Users, // ← Use imported icon
  label: "Team",
}
```

Browse available icons: https://lucide.dev/icons/

### 4. Adding Badges

Add a `badge` property with content and variant:

```tsx
{
  href: "/tasks",
  icon: CheckSquare,
  label: "Tasks",
  badge: {
    content: "5", // Can be string or number
    variant: "alert" // 'default' | 'alert' | 'warning' | 'success' | 'info'
  }
}
```

Badge variants:
- `default` - Gray (neutral info)
- `alert` - Red (urgent, errors)
- `warning` - Orange (warnings)
- `success` - Green (success, completed)
- `info` - Blue (informational)

### 5. Dynamic Badges

To make badges dynamic based on data, move the navigation config to use React state/props:

```tsx
// Example: Show task count badge
import { useQuery } from "@tanstack/react-query";

function NavigationConfig() {
  const { data: tasks } = useQuery(["tasks"]);
  const pendingCount = tasks?.filter(t => t.status === "pending").length || 0;

  const navigationSections = [
    {
      label: "Work",
      items: [
        {
          href: "/tasks",
          icon: CheckSquare,
          label: "Tasks",
          badge: pendingCount > 0
            ? { content: pendingCount, variant: "alert" }
            : undefined
        }
      ]
    }
  ];

  return navigationSections;
}
```

### 6. Reordering Sections

Simply change the order of objects in the `navigationSections` array:

```tsx
const navigationSections = [
  // Move this section first ↓
  {
    label: "Work",
    items: [...]
  },
  {
    label: "Daily",
    items: [...]
  }
];
```

### 7. Adding Items to Bottom Section

Edit the `bottomNavItems` array for items that should appear at the bottom:

```tsx
const bottomNavItems = [
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
  {
    href: "/profile",
    icon: User,
    label: "Profile",
  },
];
```

## Styling

The sidebar uses Tailwind CSS classes. Key measurements:

- **Expanded width**: 260px (`w-[260px]`)
- **Collapsed width**: 60px (`w-[60px]`)
- **Section label**: 11px, uppercase, bold, gray-500
- **Nav items**: 14px, medium weight
- **Active item**: Blue-600, bold, with left border accent
- **Hover**: Gray-100 background
- **Transitions**: 150-200ms for smooth animations

### Customizing Colors

To change the active state color from blue to another color:

```tsx
// In nav-item.tsx, change these classes:
isActive && [
  "bg-purple-50 text-purple-600 font-semibold", // ← Change blue to purple
  "before:bg-purple-600", // ← Change accent color
]
```

## Mobile Behavior

- Below 768px breakpoint, sidebar is hidden by default
- Hamburger menu button in top bar opens sidebar
- Sidebar slides in from left with dark backdrop overlay
- Tap outside, press Escape, or tap a nav item to close
- Body scroll is prevented when mobile menu is open

## Keyboard Accessibility

- **Tab** - Navigate between items
- **Enter/Space** - Activate link
- **Escape** - Close mobile menu

All interactive elements have proper ARIA labels and roles.

## State Management

The sidebar collapsed state is managed via a custom hook:

```tsx
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";

const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();
```

This hook:
- Persists state to localStorage (`sidebar-collapsed` key)
- Syncs state across components using custom events
- Used by both Sidebar and Layout components

## File Structure

```
client/src/components/sidebar/
├── index.tsx           # Exports all components
├── sidebar.tsx         # Main sidebar component
├── nav-section.tsx     # Section grouping component
├── nav-item.tsx        # Individual nav link
├── nav-badge.tsx       # Badge component
└── README.md          # This file
```

## Examples

### Example 1: Add a Projects Section

```tsx
{
  label: "Projects",
  items: [
    {
      href: "/projects/active",
      icon: Folder,
      label: "Active Projects",
      badge: { content: 3, variant: "info" }
    },
    {
      href: "/projects/archived",
      icon: Archive,
      label: "Archived",
    },
  ],
}
```

### Example 2: Add Notification Badge

```tsx
{
  href: "/notifications",
  icon: Bell,
  label: "Notifications",
  badge: { content: "12", variant: "alert" }
}
```

### Example 3: Using Custom Component for Dynamic Nav

```tsx
// Create a custom component
import { Sidebar as BaseSidebar } from "@/components/sidebar";

export function DynamicSidebar({ isOpen, onClose }) {
  const { data: counts } = useNotificationCounts();

  // Modify navigationSections with dynamic data
  const sections = navigationSections.map(section => {
    if (section.label === "Daily") {
      return {
        ...section,
        items: section.items.map(item => {
          if (item.href === "/notifications") {
            return {
              ...item,
              badge: counts?.unread > 0
                ? { content: counts.unread, variant: "alert" }
                : undefined
            };
          }
          return item;
        })
      };
    }
    return section;
  });

  return <BaseSidebar isOpen={isOpen} onClose={onClose} />;
}
```

## Troubleshooting

### Sidebar not appearing
- Check that the Layout component includes the Sidebar
- Verify mobile menu state is being passed correctly

### Active state not highlighting
- Ensure route paths match exactly (including trailing slashes)
- Check wouter's `useLocation()` hook is working

### Collapsed state not persisting
- Check browser's localStorage is enabled
- Verify no errors in browser console
- Clear localStorage and try again

### Icons not displaying
- Ensure icons are imported from `lucide-react`
- Check icon name is spelled correctly
- Icons must be PascalCase (e.g., `LayoutDashboard`, not `layout-dashboard`)

## Best Practices

1. **Keep sections focused** - 2-4 items per section works best
2. **Use meaningful icons** - Icons should clearly represent the page
3. **Limit badge usage** - Only use for important notifications/counts
4. **Test mobile behavior** - Always verify slide-in/out works smoothly
5. **Maintain consistent labeling** - Use similar naming patterns across items
6. **Order by frequency** - Place most-used items in top sections

## Future Enhancements

Potential improvements you could add:

- Multi-level nested navigation (sub-items)
- Search/filter navigation items
- Drag-and-drop reordering (persist custom order)
- User-customizable favorites
- Keyboard shortcuts shown in tooltips
- Breadcrumb integration
- Recently visited pages section
