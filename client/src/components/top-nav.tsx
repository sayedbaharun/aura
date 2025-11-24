import Logo from "./logo";
import NavLinks from "./nav-links";
import MobileNav from "./mobile-nav";
import NotificationCenter from "./notifications/notification-center";

export default function TopNav() {
  return (
    <nav className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <NavLinks />
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Center */}
          <NotificationCenter />

          {/* User menu placeholder for future implementation */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-muted-foreground hidden sm:inline">Online</span>
          </div>
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
