/**
 * Notifications History Page
 * Full list of all notifications with filtering and management
 */

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Filter, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  getNotifications,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '@/lib/notification-store';
import { Notification, NotificationType } from '@/lib/notification-types';
import { formatDistanceToNow, format } from 'date-fns';
import NotificationSettingsComponent from '@/components/notifications/notification-settings';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Load notifications
  const loadNotifications = () => {
    setNotifications(getNotifications());
  };

  useEffect(() => {
    loadNotifications();

    // Listen for notification updates
    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('notification-added', handleUpdate);
    window.addEventListener('notification-updated', handleUpdate);

    return () => {
      window.removeEventListener('notification-added', handleUpdate);
      window.removeEventListener('notification-updated', handleUpdate);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const handleToggleRead = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (notification.read) {
      markAsUnread(notification.id);
    } else {
      markAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    setClearDialogOpen(true);
  };

  const confirmClearAll = () => {
    clearAllNotifications();
    setClearDialogOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_due':
      case 'task_overdue':
        return '📋';
      case 'task_completed':
        return '✅';
      case 'health_reminder':
        return '💪';
      case 'weekly_planning':
        return '📅';
      case 'daily_reflection':
        return '🌙';
      case 'project_phase':
        return '🎯';
      default:
        return '🔔';
    }
  };

  // Ensure notifications is an array
  const notificationsArray = Array.isArray(notifications) ? notifications : [];

  // Filter notifications
  const filteredNotifications = notificationsArray.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const unreadCount = notificationsArray.filter((n) => !n.read).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your notifications and settings
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            <Button
              onClick={handleClearAll}
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All notifications</SelectItem>
                    <SelectItem value="unread">Unread only</SelectItem>
                    <SelectItem value="task_due">Task due</SelectItem>
                    <SelectItem value="task_overdue">Task overdue</SelectItem>
                    <SelectItem value="task_completed">Task completed</SelectItem>
                    <SelectItem value="health_reminder">Health reminders</SelectItem>
                    <SelectItem value="weekly_planning">Weekly planning</SelectItem>
                    <SelectItem value="daily_reflection">Daily reflection</SelectItem>
                    <SelectItem value="project_phase">Project phases</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {filter === 'all'
                    ? 'No notifications yet'
                    : filter === 'unread'
                    ? 'No unread notifications'
                    : `No ${filter.replace('_', ' ')} notifications`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    'group cursor-pointer hover:shadow-md transition-shadow',
                    !notification.read && 'border-l-4 border-l-blue-500'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{formatDistanceToNow(notification.created_at, { addSuffix: true })}</span>
                              <span>•</span>
                              <span>{format(notification.created_at, 'PPp')}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleToggleRead(e, notification)}
                              title={notification.read ? 'Mark as unread' : 'Mark as read'}
                            >
                              {notification.read ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(e, notification.id)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <NotificationSettingsComponent />
        </TabsContent>
      </Tabs>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
