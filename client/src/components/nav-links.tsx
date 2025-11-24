import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Briefcase, Heart, Apple, BookOpen, Focus } from "lucide-react";

const links = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/ventures", label: "Ventures", icon: Briefcase },
  { href: "/deep-work", label: "Deep Work", icon: Focus },
  { href: "/health", label: "Health", icon: Heart },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
];

export default function NavLinks() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href;

        return (
          <Link key={link.href} href={link.href}>
            <a
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </a>
          </Link>
        );
      })}
    </div>
  );
}
