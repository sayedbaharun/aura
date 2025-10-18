import { Link } from "wouter";
import { Calendar, Clock, MessageSquare, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-background"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl font-semibold tracking-tight text-foreground" data-testid="text-hero-headline">
                  24/7 AI Receptionist for Your Clinic
                </h1>
                <p className="text-xl text-muted-foreground">
                  Never miss an appointment. Your intelligent WhatsApp assistant handles bookings while you focus on patients.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="h-11 px-8" data-testid="button-view-dashboard">
                    View Dashboard
                  </Button>
                </Link>
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
                    <div className="text-sm font-medium text-foreground mb-1">Sarah (AI Assistant)</div>
                    <div className="text-xs text-muted-foreground">Active now</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                    <p className="text-sm text-secondary-foreground">
                      Hi! I'd like to book a dental cleaning appointment.
                    </p>
                  </div>
                  <div className="bg-primary rounded-2xl rounded-tr-sm p-4 max-w-[85%] ml-auto">
                    <p className="text-sm text-primary-foreground">
                      I'd be happy to help! We have openings this week. Would you prefer morning or afternoon?
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                    <p className="text-sm text-secondary-foreground">
                      Afternoon works best for me.
                    </p>
                  </div>
                  <div className="bg-primary rounded-2xl rounded-tr-sm p-4 max-w-[85%] ml-auto">
                    <p className="text-sm text-primary-foreground">
                      Perfect! I've booked you for Thursday at 2:30 PM. You'll receive a confirmation shortly.
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
              Intelligent Appointment Management
            </h2>
            <p className="text-lg text-muted-foreground">
              Powered by AI to provide seamless patient experience
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
                Always online to serve your patients, even outside office hours. Never miss a booking opportunity.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 hover-elevate transition-all duration-300" data-testid="card-feature-booking">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Smart Booking</h3>
              <p className="text-muted-foreground">
                AI handles scheduling conflicts automatically, ensuring optimal appointment management for your practice.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 hover-elevate transition-all duration-300" data-testid="card-feature-responses">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Instant Responses</h3>
              <p className="text-muted-foreground">
                Answer common questions in seconds. Provide clinic information and service details instantly.
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
                Customize clinic details, hours, and services for personalized responses
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
                3
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Let AI Handle It</h3>
              <p className="text-muted-foreground text-sm">
                Your AI receptionist manages bookings automatically
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
              <span className="font-semibold text-foreground">AI Receptionist</span>
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
