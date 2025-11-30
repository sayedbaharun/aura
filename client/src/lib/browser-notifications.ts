/**
 * Browser Notification Helpers
 * Handles native browser notifications (requires HTTPS in production)
 */

/**
 * Request permission for browser notifications
 * @returns Promise<boolean> - true if permission granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show a browser notification
 * @param title - Notification title
 * @param options - Notification options
 * @returns Notification instance or undefined
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions & { data?: { link?: string } }
): Notification | undefined => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      if (options?.data?.link) {
        window.location.href = options.data.link;
      }
      notification.close();
    };

    return notification;
  }
  return undefined;
};

/**
 * Browser notification helpers for specific notification types
 */
export const browserNotifications = {
  taskDue: (taskTitle: string, link: string) => {
    showBrowserNotification(`Task Due: ${taskTitle}`, {
      body: 'This task is due today. Click to view.',
      tag: 'task-due',
      data: { link },
    });
  },

  taskOverdue: (taskTitle: string, daysOverdue: number, link: string) => {
    showBrowserNotification('Task Overdue', {
      body: `${taskTitle} was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`,
      tag: 'task-overdue',
      data: { link },
      requireInteraction: true,
    });
  },

  healthReminder: () => {
    showBrowserNotification('Health Check-in', {
      body: 'Log your health metrics for today',
      tag: 'health-reminder',
      data: { link: '/health' },
    });
  },

  weeklyPlanning: () => {
    showBrowserNotification('Weekly Planning', {
      body: 'Time to plan your week!',
      tag: 'weekly-planning',
      data: { link: '/' },
    });
  },

  dailyReflection: () => {
    showBrowserNotification('Daily Reflection', {
      body: 'How was your day? Add your reflection.',
      tag: 'daily-reflection',
      data: { link: '/' },
    });
  },

  taskCompleted: (taskTitle: string) => {
    showBrowserNotification('Task Completed! 🎉', {
      body: `Great job on finishing "${taskTitle}"!`,
      tag: 'task-completed',
    });
  },

  projectPhase: (projectName: string) => {
    showBrowserNotification('Project Phase', {
      body: `${projectName} target date is approaching`,
      tag: 'project-phase',
      data: { link: '/ventures' },
    });
  },
};
