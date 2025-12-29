/**
 * Daily Reminders Service
 * Checks for due tasks and triggers notifications
 */

import { apiRequest } from './queryClient';
import { showToast } from './toast-helper';
import { browserNotifications } from './browser-notifications';
import { addNotification, isNotificationEnabled, isDoNotDisturb, getNotificationSettings } from './notification-store';

// Store interval IDs for cleanup
let taskCheckIntervalId: ReturnType<typeof setInterval> | null = null;
let reminderCheckIntervalId: ReturnType<typeof setInterval> | null = null;

interface Task {
  id: string;
  title: string;
  due_date?: string;
  status: string;
}

/**
 * Check if a notification type should be shown
 */
function shouldShowNotification(settingKey: string): boolean {
  if (isDoNotDisturb()) {
    return false;
  }
  return isNotificationEnabled(settingKey as any);
}

/**
 * Check for tasks due today
 */
async function checkDueTasks(): Promise<void> {
  if (!shouldShowNotification('taskDueReminders')) {
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiRequest('GET', `/api/tasks?due_date=${today}&status=todo,in_progress`);
    const tasksData = await response.json();
    const tasks = Array.isArray(tasksData) ? tasksData as Task[] : [];

    tasks.forEach((task) => {
      // Add to notification center
      addNotification({
        type: 'task_due',
        title: 'Task Due Today',
        message: task.title,
        link: '/',
      });

      // Show toast
      showToast.taskDue(task.title, '/');

      // Show browser notification
      if (shouldShowNotification('browserNotifications')) {
        browserNotifications.taskDue(task.title, '/');
      }
    });
  } catch (error) {
    console.error('Failed to check due tasks:', error);
  }
}

/**
 * Check for overdue tasks
 */
async function checkOverdueTasks(): Promise<void> {
  if (!shouldShowNotification('taskOverdueAlerts')) {
    return;
  }

  try {
    const today = new Date();
    const response = await apiRequest('GET', '/api/tasks?status=todo,in_progress');
    const tasksData = await response.json();
    const tasks = Array.isArray(tasksData) ? tasksData as Task[] : [];

    const overdueTasks = tasks.filter((task) => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      return dueDate < today;
    });

    overdueTasks.forEach((task) => {
      const dueDate = new Date(task.due_date!);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Add to notification center
      addNotification({
        type: 'task_overdue',
        title: 'Task Overdue',
        message: `${task.title} was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`,
        link: '/',
      });

      // Show toast
      showToast.taskOverdue(task.title, daysOverdue);

      // Show browser notification
      if (shouldShowNotification('browserNotifications')) {
        browserNotifications.taskOverdue(task.title, daysOverdue, '/');
      }
    });
  } catch (error) {
    console.error('Failed to check overdue tasks:', error);
  }
}

/**
 * Show health reminder
 */
function showHealthReminder(): void {
  if (!shouldShowNotification('healthReminders')) {
    return;
  }

  // Add to notification center
  addNotification({
    type: 'health_reminder',
    title: 'Health Check-in',
    message: 'Log your health metrics for today',
    link: '/health',
  });

  // Show toast
  showToast.healthReminder();

  // Show browser notification
  if (shouldShowNotification('browserNotifications')) {
    browserNotifications.healthReminder();
  }
}

/**
 * Show weekly planning reminder
 */
function showWeeklyPlanningReminder(): void {
  if (!shouldShowNotification('weeklyPlanningReminders')) {
    return;
  }

  // Add to notification center
  addNotification({
    type: 'weekly_planning',
    title: 'Weekly Planning',
    message: 'Time to plan your week!',
    link: '/',
  });

  // Show toast
  showToast.weeklyPlanning();

  // Show browser notification
  if (shouldShowNotification('browserNotifications')) {
    browserNotifications.weeklyPlanning();
  }
}

/**
 * Show daily reflection reminder
 */
function showDailyReflectionReminder(): void {
  if (!shouldShowNotification('dailyReflectionPrompts')) {
    return;
  }

  // Add to notification center
  addNotification({
    type: 'daily_reflection',
    title: 'Daily Reflection',
    message: 'How was your day? Add your reflection.',
    link: '/',
  });

  // Show toast
  showToast.dailyReflection();

  // Show browser notification
  if (shouldShowNotification('browserNotifications')) {
    browserNotifications.dailyReflection();
  }
}

/**
 * Check if it's time for a scheduled reminder
 */
function checkScheduledReminders(): void {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:00`;
  const currentDay = now.getDay();

  // Use directly imported getNotificationSettings (no dynamic import needed)
  const settings = getNotificationSettings();

  // Check health reminder
  if (currentTime === settings.healthReminderTime) {
    showHealthReminder();
  }

  // Check weekly planning reminder
  if (currentDay === settings.weeklyPlanningDay && currentTime === settings.weeklyPlanningTime) {
    showWeeklyPlanningReminder();
  }

  // Check daily reflection reminder
  if (currentTime === settings.dailyReflectionTime) {
    showDailyReflectionReminder();
  }
}

/**
 * Daily Reminders Service
 */
export const dailyRemindersService = {
  checkDueTasks,
  checkOverdueTasks,
  showHealthReminder,
  showWeeklyPlanningReminder,
  showDailyReflectionReminder,
  checkScheduledReminders,

  /**
   * Initialize the service (call on app load)
   */
  init(): void {
    // Clean up any existing intervals first
    this.cleanup();

    // Check immediately on load
    this.checkDueTasks();
    this.checkOverdueTasks();
    this.checkScheduledReminders();

    // Check every hour for due/overdue tasks
    taskCheckIntervalId = setInterval(() => {
      this.checkDueTasks();
      this.checkOverdueTasks();
    }, 60 * 60 * 1000); // 1 hour

    // Check every minute for scheduled reminders
    reminderCheckIntervalId = setInterval(() => {
      this.checkScheduledReminders();
    }, 60 * 1000); // 1 minute
  },

  /**
   * Cleanup intervals (call on app unmount or reinitialize)
   */
  cleanup(): void {
    if (taskCheckIntervalId) {
      clearInterval(taskCheckIntervalId);
      taskCheckIntervalId = null;
    }
    if (reminderCheckIntervalId) {
      clearInterval(reminderCheckIntervalId);
      reminderCheckIntervalId = null;
    }
  },
};
