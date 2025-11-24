/**
 * Notification Settings Component
 * User preferences for notifications
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '@/lib/notification-store';
import { requestNotificationPermission } from '@/lib/browser-notifications';
import { NotificationSettings } from '@/lib/notification-types';
import { showToast } from '@/lib/toast-helper';

export default function NotificationSettingsComponent() {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setBrowserPermission('granted');
      handleSettingChange('browserNotifications', true);
      showToast.success('Browser notifications enabled!');
    } else {
      showToast.error('Permission denied', 'Please enable notifications in your browser settings.');
    }
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, '0');
    return `${hour}:00`;
  });

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="space-y-6">
      {/* Browser Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications even when the app is not in focus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {browserPermission === 'granted' ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show desktop notifications
                </p>
              </div>
              <Switch
                checked={settings.browserNotifications}
                onCheckedChange={(checked) =>
                  handleSettingChange('browserNotifications', checked)
                }
              />
            </div>
          ) : browserPermission === 'denied' ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">Permission Denied</p>
              <p className="text-muted-foreground mt-1">
                You've blocked notifications. Please enable them in your browser settings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Allow Hikma-OS to send you browser notifications for important updates and reminders.
              </p>
              <Button onClick={handleRequestPermission}>
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task Due Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when tasks are due today
              </p>
            </div>
            <Switch
              checked={settings.taskDueReminders}
              onCheckedChange={(checked) =>
                handleSettingChange('taskDueReminders', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task Overdue Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get alerted about overdue tasks
              </p>
            </div>
            <Switch
              checked={settings.taskOverdueAlerts}
              onCheckedChange={(checked) =>
                handleSettingChange('taskOverdueAlerts', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Health Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Remind me to log health metrics
              </p>
            </div>
            <Switch
              checked={settings.healthReminders}
              onCheckedChange={(checked) =>
                handleSettingChange('healthReminders', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Planning Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Remind me to plan my week
              </p>
            </div>
            <Switch
              checked={settings.weeklyPlanningReminders}
              onCheckedChange={(checked) =>
                handleSettingChange('weeklyPlanningReminders', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Daily Reflection Prompts</Label>
              <p className="text-sm text-muted-foreground">
                Remind me to reflect on my day
              </p>
            </div>
            <Switch
              checked={settings.dailyReflectionPrompts}
              onCheckedChange={(checked) =>
                handleSettingChange('dailyReflectionPrompts', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task Completion Celebrations</Label>
              <p className="text-sm text-muted-foreground">
                Celebrate when I complete tasks
              </p>
            </div>
            <Switch
              checked={settings.taskCompletionCelebrations}
              onCheckedChange={(checked) =>
                handleSettingChange('taskCompletionCelebrations', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Timing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Timing</CardTitle>
          <CardDescription>
            Set when you want to receive specific reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Health Reminder Time</Label>
            <Select
              value={settings.healthReminderTime}
              onValueChange={(value) =>
                handleSettingChange('healthReminderTime', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Weekly Planning Day</Label>
            <Select
              value={String(settings.weeklyPlanningDay)}
              onValueChange={(value) =>
                handleSettingChange('weeklyPlanningDay', parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Weekly Planning Time</Label>
            <Select
              value={settings.weeklyPlanningTime}
              onValueChange={(value) =>
                handleSettingChange('weeklyPlanningTime', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Daily Reflection Time</Label>
            <Select
              value={settings.dailyReflectionTime}
              onValueChange={(value) =>
                handleSettingChange('dailyReflectionTime', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Do Not Disturb
          </CardTitle>
          <CardDescription>
            Set quiet hours when you don't want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Do Not Disturb</Label>
              <p className="text-sm text-muted-foreground">
                Mute notifications during quiet hours
              </p>
            </div>
            <Switch
              checked={settings.doNotDisturb}
              onCheckedChange={(checked) =>
                handleSettingChange('doNotDisturb', checked)
              }
            />
          </div>

          {settings.doNotDisturb && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quiet Hours Start</Label>
                  <Select
                    value={settings.quietHoursStart}
                    onValueChange={(value) =>
                      handleSettingChange('quietHoursStart', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quiet Hours End</Label>
                  <Select
                    value={settings.quietHoursEnd}
                    onValueChange={(value) =>
                      handleSettingChange('quietHoursEnd', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
