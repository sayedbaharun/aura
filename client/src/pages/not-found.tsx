import { Link } from "wouter";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <Bot className="h-24 w-24 text-muted-foreground/20 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Page not found</p>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button variant="outline" data-testid="button-home">
              Go Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button data-testid="button-dashboard">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
