import { Link } from "wouter";
import {
  Calendar, Clock, MessageSquare, Bot, CheckCircle2,
  Mail, Search, Users, Repeat, Bell, Shield, Zap, FileText, Camera,
  BarChart3, Sparkles, Globe, Lock, Database, Brain, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  // Note: Authentication removed for Railway deployment

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-xl">Aura</span>
              <Badge variant="secondary" className="ml-2">Enterprise AI</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" data-testid="button-dashboard">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5" data-testid="badge-status">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Production Ready • 31+ Features Live</span>
              </div>
            </Badge>

            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground mb-6" data-testid="text-hero-headline">
              Enterprise AI Personal Assistant
              <span className="block text-primary mt-2">Powered by GPT-4o</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Aura manages your calendar, emails, and knowledge through natural conversation. 
              Integrated with Google Calendar, Gmail, and Notion. Running 24/7 on Telegram with 
              advanced AI intelligence and proactive automation.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8" data-testid="button-view-dashboard">
                  <Zap className="h-5 w-5 mr-2" />
                  View Dashboard
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-explore-features"
              >
                Explore Features
              </Button>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <Card className="p-4 text-center" data-testid="card-stat-features">
                <div className="text-3xl font-semibold text-primary mb-1">31+</div>
                <div className="text-sm text-muted-foreground">Features</div>
              </Card>
              <Card className="p-4 text-center" data-testid="card-stat-integrations">
                <div className="text-3xl font-semibold text-primary mb-1">6</div>
                <div className="text-sm text-muted-foreground">Integrations</div>
              </Card>
              <Card className="p-4 text-center" data-testid="card-stat-uptime">
                <div className="text-3xl font-semibold text-primary mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </Card>
              <Card className="p-4 text-center" data-testid="card-stat-response">
                <div className="text-3xl font-semibold text-primary mb-1">&lt;2s</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Powered By Industry Leaders</h2>
            <p className="text-muted-foreground">Enterprise-grade integrations for reliable automation</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "OpenAI GPT-4o", desc: "AI Engine" },
              { name: "Google Calendar", desc: "Scheduling" },
              { name: "Gmail API", desc: "Email Intelligence" },
              { name: "Notion", desc: "Knowledge Base" },
              { name: "Telegram Bot", desc: "Chat Interface" },
              { name: "PostgreSQL", desc: "Data Storage" }
            ].map((tech, idx) => (
              <Card key={idx} className="p-4 text-center hover-elevate transition-all" data-testid={`card-integration-${idx}`}>
                <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="font-medium text-sm text-foreground mb-1">{tech.name}</div>
                <div className="text-xs text-muted-foreground">{tech.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Complete Feature Set</Badge>
            <h2 className="text-4xl font-semibold text-foreground mb-4">
              31+ Production-Ready Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need for intelligent calendar, email, and knowledge management through AI-powered conversation
            </p>
          </div>

          {/* Calendar Management Features */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Calendar Management</h3>
                <p className="text-muted-foreground">11 powerful scheduling features</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Search,
                  title: "View Schedule",
                  desc: "See upcoming events for any time period with full details"
                },
                {
                  icon: Calendar,
                  title: "Book Appointments",
                  desc: "Natural language booking with auto Google Meet links"
                },
                {
                  icon: CheckCircle2,
                  title: "Cancel Events",
                  desc: "Safe deletion with 5-retry verification and confirmations"
                },
                {
                  icon: Repeat,
                  title: "Reschedule Meetings",
                  desc: "Move events to new times with attendee notifications"
                },
                {
                  icon: Clock,
                  title: "Check Availability",
                  desc: "Instant conflict detection and free time discovery"
                },
                {
                  icon: Search,
                  title: "Find Free Slots",
                  desc: "AI suggests optimal meeting times based on your schedule"
                },
                {
                  icon: Repeat,
                  title: "Recurring Events",
                  desc: "Daily, weekly, monthly patterns with RFC5545 RRULE"
                },
                {
                  icon: Bell,
                  title: "Smart Reminders",
                  desc: "Custom email and popup alerts at any interval"
                },
                {
                  icon: Shield,
                  title: "Focus Time Blocks",
                  desc: "Protected deep work time with auto-decline"
                },
                {
                  icon: Users,
                  title: "Multi-Attendee Support",
                  desc: "Send invitations to multiple people instantly"
                },
                {
                  icon: CheckCircle2,
                  title: "Attendee Tracking",
                  desc: "Real-time notifications when people accept/decline"
                }
              ].map((feature, idx) => (
                <Card key={idx} className="p-6 hover-elevate transition-all" data-testid={`card-calendar-feature-${idx}`}>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Email Intelligence Features */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Email Intelligence</h3>
                <p className="text-muted-foreground">5 AI-powered email features</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Mail,
                  title: "Check Emails",
                  desc: "View recent emails with smart filtering and unread tracking"
                },
                {
                  icon: Search,
                  title: "Search Emails",
                  desc: "Powerful Gmail queries by sender, subject, or content"
                },
                {
                  icon: MessageSquare,
                  title: "Send Emails",
                  desc: "Compose and send with AI assistance and confirmation"
                },
                {
                  icon: Calendar,
                  title: "Meeting Request Extraction",
                  desc: "AI detects and extracts meeting requests automatically"
                },
                {
                  icon: MessageSquare,
                  title: "Email Thread Tracking",
                  desc: "Conversation continuity with AI summaries and categorization"
                }
              ].map((feature, idx) => (
                <Card key={idx} className="p-6 hover-elevate transition-all" data-testid={`card-email-feature-${idx}`}>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Knowledge Management Features */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Knowledge Management</h3>
                <p className="text-muted-foreground">9 intelligent note-taking features</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: FileText,
                  title: "Quick Notes - Text",
                  desc: "Instant capture with AI auto-categorization and tagging"
                },
                {
                  icon: Camera,
                  title: "Quick Notes - Photo OCR",
                  desc: "Extract text from whiteboards, business cards with GPT-4 Vision"
                },
                {
                  icon: Search,
                  title: "View & Filter Notes",
                  desc: "Smart filtering by category, type, and priority"
                },
                {
                  icon: Sparkles,
                  title: "Auto-Categorization",
                  desc: "AI sorts notes into work/personal/ideas/follow-ups"
                },
                {
                  icon: Bell,
                  title: "Priority Detection",
                  desc: "Automatic high/normal/low priority assignment"
                },
                {
                  icon: BarChart3,
                  title: "Auto-Tagging",
                  desc: "AI generates 2-5 relevant keywords per note"
                },
                {
                  icon: Calendar,
                  title: "Calendar Linking",
                  desc: "Connects notes to related meetings from last 7 days"
                },
                {
                  icon: Globe,
                  title: "Notion Sync",
                  desc: "Automatic page creation and synchronization"
                },
                {
                  icon: FileText,
                  title: "Note Types",
                  desc: "Task, idea, meeting note, or general classification"
                }
              ].map((feature, idx) => (
                <Card key={idx} className="p-6 hover-elevate transition-all" data-testid={`card-knowledge-feature-${idx}`}>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Intelligence & Automation */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">AI Intelligence & Automation</h3>
                <p className="text-muted-foreground">4 advanced AI systems (Phase 2.3)</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Zap,
                  title: "Multi-Model Fallback",
                  desc: "99.9% uptime with GPT-4o → 4o-mini → 4-turbo cascading. Smart task routing for 90% cost savings on simple tasks."
                },
                {
                  icon: Brain,
                  title: "Advanced Context Memory",
                  desc: "RAG-powered learning system. Detects meeting patterns, email habits, and note preferences. Injects top 3 relevant interactions into every conversation."
                },
                {
                  icon: Sparkles,
                  title: "Proactive Suggestions",
                  desc: "Morning briefings (8 AM), evening summaries (6 PM), hourly conflict alerts. AI-generated action items and priority rankings."
                },
                {
                  icon: Clock,
                  title: "Scheduled Jobs System",
                  desc: "Cron automation for all proactive features. Multi-user support via TELEGRAM_CHAT_ID. Runs 24/7 with error recovery."
                }
              ].map((feature, idx) => (
                <Card key={idx} className="p-6 hover-elevate transition-all" data-testid={`card-ai-feature-${idx}`}>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Security & Reliability */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Security & Reliability</h3>
                <p className="text-muted-foreground">Enterprise-grade safety features</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: CheckCircle2,
                  title: "Confirmation Workflows",
                  desc: "Explicit approval required for all calendar changes"
                },
                {
                  icon: Shield,
                  title: "Calendar Sync Verification",
                  desc: "5-retry exponential backoff ensures operations complete"
                },
                {
                  icon: Database,
                  title: "Audit Logging",
                  desc: "Complete tracking of all operations for compliance"
                },
                {
                  icon: Lock,
                  title: "Saga-Style Transactions",
                  desc: "Atomic operations with automatic rollback on failure"
                },
                {
                  icon: TrendingUp,
                  title: "Pattern Learning",
                  desc: "Continuous improvement from interaction history"
                }
              ].map((feature, idx) => (
                <Card key={idx} className="p-6 hover-elevate transition-all" data-testid={`card-security-feature-${idx}`}>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Real-World Applications</Badge>
            <h2 className="text-4xl font-semibold text-foreground mb-4">
              How Teams Use Aura
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From individual professionals to enterprise teams, Aura adapts to your workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8" data-testid="card-usecase-executive">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Executives</h3>
              <p className="text-muted-foreground mb-4">
                "Aura saves me 2 hours daily managing meetings. Proactive briefings keep me prepared, 
                and context memory knows my preferences."
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Auto-scheduling</Badge>
                <Badge variant="secondary">Email intelligence</Badge>
                <Badge variant="secondary">Briefings</Badge>
              </div>
            </Card>

            <Card className="p-8" data-testid="card-usecase-sales">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Sales Teams</h3>
              <p className="text-muted-foreground mb-4">
                "Meeting request extraction from emails is a game-changer. Aura automatically detects 
                client requests and books follow-ups."
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Meeting extraction</Badge>
                <Badge variant="secondary">Quick notes</Badge>
                <Badge variant="secondary">Notion sync</Badge>
              </div>
            </Card>

            <Card className="p-8" data-testid="card-usecase-developers">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Development Teams</h3>
              <p className="text-muted-foreground mb-4">
                "Focus time blocks protect deep work sessions. Photo OCR captures whiteboard sessions 
                instantly to Notion."
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Focus time</Badge>
                <Badge variant="secondary">Photo OCR</Badge>
                <Badge variant="secondary">Recurring standups</Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Technical Deep Dive */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Production Architecture</Badge>
              <h2 className="text-3xl font-semibold text-foreground mb-6">
                Enterprise-Grade Technical Stack
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground mb-1">OpenAI GPT-4o with Multi-Model Fallback</div>
                    <div className="text-sm text-muted-foreground">
                      Primary AI engine with automatic fallback to 4o-mini and 4-turbo for 99.9% uptime
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground mb-1">PostgreSQL with Drizzle ORM</div>
                    <div className="text-sm text-muted-foreground">
                      Type-safe database operations with audit logging and pattern detection
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground mb-1">Google OAuth2 with Auto-Refresh</div>
                    <div className="text-sm text-muted-foreground">
                      Secure calendar and email access with automatic token management
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold text-foreground mb-1">Scheduled Jobs with Cron</div>
                    <div className="text-sm text-muted-foreground">
                      Automated briefings, proactive alerts, and attendee tracking every 10 minutes
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">System Uptime</span>
                    <span className="text-sm font-semibold text-primary">99.9%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[99.9%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Average Response Time</span>
                    <span className="text-sm font-semibold text-primary">&lt;2s</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[95%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Feature Coverage</span>
                    <span className="text-sm font-semibold text-primary">31+ Features</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">AI Model Reliability</span>
                    <span className="text-sm font-semibold text-primary">3-Tier Fallback</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-full"></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t">
                <div className="text-center">
                  <div className="text-4xl font-semibold text-primary mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground">Production Monitoring</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-semibold text-foreground mb-6">
            Ready to Transform Your Productivity?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join professionals using Aura to automate calendar management, email intelligence, 
            and knowledge capture with enterprise AI
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8" data-testid="button-get-started-cta">
                <Zap className="h-5 w-5 mr-2" />
                Open Dashboard
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              data-testid="button-back-to-top"
            >
              Back to Top
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-3xl font-semibold text-primary mb-2">31+</div>
              <div className="text-sm text-muted-foreground">Production Features</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-primary mb-2">6</div>
              <div className="text-sm text-muted-foreground">Enterprise Integrations</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-primary mb-2">Multi-User</div>
              <div className="text-sm text-muted-foreground">Team Support Ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-xl">Aura</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enterprise AI Personal Assistant. Production-ready with 31+ features for 
                calendar, email, and knowledge management through natural conversation.
              </p>
              <Badge variant="secondary">Powered by OpenAI GPT-4o</Badge>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Calendar Management</li>
                <li>Email Intelligence</li>
                <li>Knowledge Management</li>
                <li>AI Automation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Integrations</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Google Calendar</li>
                <li>Gmail API</li>
                <li>Notion</li>
                <li>Telegram Bot</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2024 Aura AI Assistant. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" data-testid="link-dashboard-footer">
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-muted-foreground">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
