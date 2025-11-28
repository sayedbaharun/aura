/**
 * Notification Types and Interfaces for SB-OS
 */

export type NotificationType =
  | 'task_due'
  | 'task_overdue'
  | 'health_reminder'
  | 'weekly_planning'
  | 'daily_reflection'
  | 'task_completed'
  | 'project_milestone';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: Date;
}

export interface NotificationSettings {
  browserNotifications: boolean;
  taskDueReminders: boolean;
  taskOverdueAlerts: boolean;
  healthReminders: boolean;
  weeklyPlanningReminders: boolean;
  dailyReflectionPrompts: boolean;
  taskCompletionCelebrations: boolean;
  healthReminderTime: string;
  weeklyPlanningDay: number; // 0 = Sunday, 6 = Saturday
  weeklyPlanningTime: string;
  dailyReflectionTime: string;
  doNotDisturb: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const defaultNotificationSettings: NotificationSettings = {
  browserNotifications: false,
  taskDueReminders: true,
  taskOverdueAlerts: true,
  healthReminders: true,
  weeklyPlanningReminders: true,
  dailyReflectionPrompts: true,
  taskCompletionCelebrations: true,
  healthReminderTime: '21:00',
  weeklyPlanningDay: 0, // Sunday
  weeklyPlanningTime: '18:00',
  dailyReflectionTime: '21:00',
  doNotDisturb: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};
