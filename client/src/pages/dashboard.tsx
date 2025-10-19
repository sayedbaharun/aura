import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MessageSquare, Settings, Bot, Phone, Clock, User, Copy, CheckCircle2, LayoutList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WhatsappMessage, Appointment, AssistantSettings } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [copied, setCopied] = useState(false);

  // Fetch messages with 5s refresh
  const { data: messages = [], isLoading: messagesLoading } = useQuery<WhatsappMessage[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
  });

  // Fetch appointments with 5s refresh
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    refetchInterval: 5000,
  });

  // Fetch assistant settings
  const { data: settings, isLoading: settingsLoading } = useQuery<AssistantSettings>({
    queryKey: ["/api/settings"],
  });

  // Get actual Twilio webhook URL (works in dev and production)
  const webhookUrl = `${window.location.origin}/api/whatsapp-webhook`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Assistant settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    updateSettingsMutation.mutate({
      assistantName: formData.get("assistantName"),
      userName: formData.get("userName"),
      userEmail: formData.get("userEmail"),
      userPhone: formData.get("userPhone"),
      whatsappNumber: formData.get("whatsappNumber"),
      workingHours: formData.get("workingHours"),
      defaultMeetingDuration: formData.get("defaultMeetingDuration"),
      timezone: formData.get("timezone"),
      preferences: formData.get("preferences"),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const selectedDateAppointments = appointments.filter(apt => {
    if (!apt.appointmentDate || !selectedDate) return false;
    const aptDate = new Date(apt.appointmentDate);
    return aptDate.toDateString() === selectedDate.toDateString();
  });

  const appointmentDates = appointments
    .filter(apt => apt.appointmentDate)
    .map(apt => new Date(apt.appointmentDate!).toDateString());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-assistant-name">
            {settings?.assistantName || "Aura"} - Your AI Assistant
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3" data-testid="tabs-dashboard">
            <TabsTrigger value="messages" className="gap-2" data-testid="tab-messages">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-2" data-testid="tab-appointments">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>
                  Conversation history between users and your AI assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center">
                      <Bot className="h-16 w-16 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground">
                        Messages will appear here when patients contact your WhatsApp number
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.slice().reverse().map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.sender === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.sender === 'assistant' ? 'bg-primary' : 'bg-secondary'
                          }`}>
                            {message.sender === 'assistant' ? (
                              <Bot className="h-5 w-5 text-primary-foreground" />
                            ) : (
                              <Phone className="h-5 w-5 text-secondary-foreground" />
                            )}
                          </div>
                          <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'text-right' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {message.sender === 'assistant' && (
                                <Badge variant="outline" className="text-xs">AI</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {message.phoneNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.receivedAt), 'MMM d, HH:mm')}
                              </span>
                              {message.sender === 'user' && (
                                <Badge variant="outline" className="text-xs">User</Badge>
                              )}
                            </div>
                            <div className={`rounded-2xl p-4 ${
                              message.sender === 'assistant' 
                                ? 'bg-primary text-primary-foreground rounded-tl-sm' 
                                : 'bg-secondary text-secondary-foreground rounded-tr-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.messageContent}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Appointments</CardTitle>
                    <CardDescription>
                      View all appointments booked through WhatsApp. Track status (confirmed, pending, cancelled) and appointment details synced with your Google Calendar.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "calendar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                      data-testid="button-calendar-view"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Calendar
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      data-testid="button-list-view"
                    >
                      <LayoutList className="h-4 w-4 mr-2" />
                      List
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="h-32 w-32 bg-muted animate-pulse rounded-lg"></div>
                  </div>
                ) : viewMode === "calendar" ? (
                  <div className="grid md:grid-cols-[auto_1fr] gap-6">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-lg border"
                      modifiers={{
                        hasAppointment: (date) => appointmentDates.includes(date.toDateString()),
                      }}
                      modifiersStyles={{
                        hasAppointment: {
                          backgroundColor: 'hsl(var(--primary) / 0.2)',
                          fontWeight: '600',
                        },
                      }}
                      data-testid="calendar-appointments"
                    />
                    <div className="border-l pl-6">
                      <h3 className="font-semibold text-lg mb-4">
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {selectedDateAppointments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-[300px] text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground/20 mb-3" />
                            <p className="text-muted-foreground">No appointments for this date</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedDateAppointments.map((apt) => (
                              <Card key={apt.id} className="p-4" data-testid={`appointment-${apt.id}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{apt.contactName || 'Contact'}</span>
                                  </div>
                                  <Badge className={getStatusColor(apt.status)}>
                                    {apt.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    {apt.appointmentDate && format(new Date(apt.appointmentDate), 'p')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    {apt.phoneNumber}
                                  </div>
                                  {apt.appointmentTitle && (
                                    <div className="text-sm font-medium">
                                      {apt.appointmentTitle}
                                    </div>
                                  )}
                                  {apt.notes && (
                                    <div className="text-sm mt-2 pt-2 border-t">
                                      {apt.notes}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    {appointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center">
                        <Calendar className="h-16 w-16 text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground">No appointments yet</p>
                        <p className="text-sm text-muted-foreground">
                          Appointments will appear here when booked through WhatsApp
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {appointments.map((apt) => (
                          <Card key={apt.id} className="p-6" data-testid={`appointment-card-${apt.id}`}>
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">{apt.appointmentTitle || 'Meeting'}</h3>
                                <p className="text-sm text-muted-foreground">{apt.contactName || 'No contact'} • {apt.phoneNumber}</p>
                              </div>
                              <Badge className={getStatusColor(apt.status)}>
                                {apt.status}
                              </Badge>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Date & Time</div>
                                <div className="font-medium">
                                  {apt.appointmentDate ? format(new Date(apt.appointmentDate), 'PPP p') : 'Not set'}
                                </div>
                              </div>
                              {apt.appointmentDuration && (
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">Duration</div>
                                  <div className="font-medium">{apt.appointmentDuration} minutes</div>
                                </div>
                              )}
                            </div>
                            {apt.notes && (
                              <div className="mt-4 pt-4 border-t">
                                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                                <p className="text-sm">{apt.notes}</p>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-6">
              {/* Webhook URL Card */}
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Webhook</CardTitle>
                  <CardDescription>
                    Use this URL to connect your WhatsApp Business account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-webhook-url"
                    />
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-copy-webhook"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>

                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm">MessageBird/Bird Setup Instructions:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Log in to your MessageBird/Bird Dashboard</li>
                      <li>Navigate to Channels → WhatsApp → Settings</li>
                      <li>In the Webhook section, paste the URL above</li>
                      <li>Set HTTP Method to POST</li>
                      <li>Save your changes</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: Also supports Twilio and Facebook/Meta webhooks
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Assistant Settings Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Assistant Configuration</CardTitle>
                  <CardDescription>
                    Customize Aura's behavior and your personal preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {settingsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-10 bg-muted animate-pulse rounded-lg"></div>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="assistantName">Assistant Name</Label>
                          <Input
                            id="assistantName"
                            name="assistantName"
                            defaultValue={settings?.assistantName}
                            placeholder="Aura"
                            data-testid="input-assistant-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="userName">Your Name</Label>
                          <Input
                            id="userName"
                            name="userName"
                            defaultValue={settings?.userName || ''}
                            placeholder="John Doe"
                            data-testid="input-user-name"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="userEmail">Your Email</Label>
                          <Input
                            id="userEmail"
                            name="userEmail"
                            type="email"
                            defaultValue={settings?.userEmail || ''}
                            placeholder="you@example.com"
                            data-testid="input-user-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="userPhone">Your Phone</Label>
                          <Input
                            id="userPhone"
                            name="userPhone"
                            defaultValue={settings?.userPhone || ''}
                            placeholder="+971 50 123 4567"
                            data-testid="input-user-phone"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsappNumber">WhatsApp Business Number</Label>
                        <Input
                          id="whatsappNumber"
                          name="whatsappNumber"
                          defaultValue={settings?.whatsappNumber || ''}
                          placeholder="+15558416669"
                          data-testid="input-whatsapp-number"
                        />
                        <p className="text-sm text-muted-foreground">
                          Your Twilio WhatsApp number (format: +1234567890)
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="workingHours">Working Hours</Label>
                          <Input
                            id="workingHours"
                            name="workingHours"
                            defaultValue={settings?.workingHours || ''}
                            placeholder="9:00 AM - 6:00 PM, Monday - Friday"
                            data-testid="input-working-hours"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timezone">Timezone</Label>
                          <Input
                            id="timezone"
                            name="timezone"
                            defaultValue={settings?.timezone || ''}
                            placeholder="Asia/Dubai"
                            data-testid="input-timezone"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="defaultMeetingDuration">Default Meeting Duration (minutes)</Label>
                        <Input
                          id="defaultMeetingDuration"
                          name="defaultMeetingDuration"
                          type="number"
                          defaultValue={settings?.defaultMeetingDuration || ''}
                          placeholder="60"
                          data-testid="input-default-duration"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preferences">Additional Preferences</Label>
                        <Textarea
                          id="preferences"
                          name="preferences"
                          defaultValue={settings?.preferences || ''}
                          placeholder="e.g., Never book meetings before 9am, Always leave 15 min buffer between meetings, Prefer afternoon meetings, etc."
                          rows={4}
                          data-testid="textarea-preferences"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full md:w-auto" 
                        disabled={updateSettingsMutation.isPending}
                        data-testid="button-save-settings"
                      >
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
