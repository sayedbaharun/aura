import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, LayoutDashboard, Briefcase, Heart, Apple, BookOpen } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/ventures", label: "Ventures", icon: Briefcase },
  { href: "/health", label: "Health", icon: Heart },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-4 mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Navigation</h2>
          </div>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;

            return (
              <Link key={link.href} href={link.href}>
                <a
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </a>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
