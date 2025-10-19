import { Link } from "wouter";
import { Calendar, Clock, MessageSquare, Bot, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Aura</span>
            </div>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="h-9 w-20 bg-secondary animate-pulse rounded"></div>
              ) : isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost" data-testid="button-dashboard">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/api/logout"}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-login"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-background"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-semibold tracking-tight text-foreground" data-testid="text-hero-headline">
                  Meet Aura - Your AI Personal Assistant
                </h1>
                <p className="text-xl text-muted-foreground">
                  Manage your calendar effortlessly through WhatsApp. Aura checks availability, books meetings, and keeps you organized.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="h-11 px-8" data-testid="button-view-dashboard">
                      View Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    className="h-11 px-8"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="button-get-started"
                  >
                    Get Started
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Always Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Instant Response</span>
                </div>
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="relative lg:block hidden">
              <div className="relative rounded-2xl bg-card border border-card-border p-8 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground mb-1">Aura (AI Assistant)</div>
                    <div className="text-xs text-muted-foreground">Active now</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                    <p className="text-sm text-secondary-foreground">
                      Am I free tomorrow at 3pm?
                    </p>
                  </div>
                  <div className="bg-primary rounded-2xl rounded-tr-sm p-4 max-w-[85%] ml-auto">
                    <p className="text-sm text-primary-foreground">
                      Yes, you're free at that time! Would you like me to book something?
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                    <p className="text-sm text-secondary-foreground">
                      Book a meeting with John for 1 hour
                    </p>
                  </div>
                  <div className="bg-primary rounded-2xl rounded-tr-sm p-4 max-w-[85%] ml-auto">
                    <p className="text-sm text-primary-foreground">
                      I'll book "Meeting with John" for tomorrow at 3:00 PM. Confirm?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Intelligent Calendar Management
            </h2>
            <p className="text-lg text-muted-foreground">
              Powered by AI and integrated with Google Calendar for effortless scheduling
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-6 hover-elevate transition-all duration-300" data-testid="card-feature-availability">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">24/7 Availability</h3>
              <p className="text-muted-foreground">
                Aura is always ready to help manage your calendar, check availability, and suggest meeting times - anytime, anywhere.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 hover-elevate transition-all duration-300" data-testid="card-feature-booking">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                AI detects conflicts automatically and suggests optimal times based on your preferences and working hours.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 hover-elevate transition-all duration-300" data-testid="card-feature-responses">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Instant Responses</h3>
              <p className="text-muted-foreground">
                Get instant answers to your questions. Natural conversation powered by advanced AI.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple setup, powerful automation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
                1
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Connect WhatsApp</h3>
              <p className="text-muted-foreground text-sm">
                Link your WhatsApp Business account using our webhook URL
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
                2
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Configure Settings</h3>
              <p className="text-muted-foreground text-sm">
                Customize your preferences, working hours, and timezone for personalized assistance
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
                3
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Let AI Handle It</h3>
              <p className="text-muted-foreground text-sm">
                Aura manages your calendar and appointments automatically
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-semibold text-foreground mb-6">
            Ready to automate your bookings?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start managing appointments smarter with AI-powered assistance
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="h-11 px-8" data-testid="button-get-started">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Aura AI Assistant</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Powered by AI
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="link-dashboard-footer">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
