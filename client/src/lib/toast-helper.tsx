/**
 * Toast Notification Helpers
 * Wrapper around the existing useToast hook for easier usage
 */

import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Toast helper utilities
 */
export const showToast = {
  /**
   * Show a success toast
   */
  success: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
    });
  },

  /**
   * Show an error toast
   */
  error: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "destructive",
    });
  },

  /**
   * Show an info toast
   */
  info: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
    });
  },

  /**
   * Show a warning toast
   */
  warning: (title: string, description?: string) => {
    toast({
      title: `⚠️ ${title}`,
      description,
      variant: "default",
    });
  },

  /**
   * Show a task due reminder toast
   */
  taskDue: (taskTitle: string, link: string) => {
    toast({
      title: "Task Due Today",
      description: taskTitle,
      action: (
        <ToastAction
          altText="View task"
          onClick={() => {
            window.location.href = link;
          }}
        >
          View
        </ToastAction>
      ),
    });
  },

  /**
   * Show a health reminder toast
   */
  healthReminder: () => {
    toast({
      title: "Health Check-in",
      description: "Time to log your health metrics",
      action: (
        <ToastAction
          altText="Log now"
          onClick={() => {
            window.location.href = '/health';
          }}
        >
          Log Now
        </ToastAction>
      ),
    });
  },

  /**
   * Show a weekly planning reminder toast
   */
  weeklyPlanning: () => {
    toast({
      title: "Weekly Planning",
      description: "Plan your week ahead",
      action: (
        <ToastAction
          altText="Plan now"
          onClick={() => {
            window.location.href = '/';
          }}
        >
          Plan Now
        </ToastAction>
      ),
    });
  },

  /**
   * Show a daily reflection reminder toast
   */
  dailyReflection: () => {
    toast({
      title: "Daily Reflection",
      description: "How was your day?",
      action: (
        <ToastAction
          altText="Reflect now"
          onClick={() => {
            window.location.href = '/';
          }}
        >
          Reflect Now
        </ToastAction>
      ),
    });
  },

  /**
   * Show a task completion celebration toast
   */
  taskCompleted: (taskTitle: string) => {
    toast({
      title: "🎉 Great Work!",
      description: `You completed "${taskTitle}"`,
      variant: "default",
    });
  },

  /**
   * Show a task overdue alert toast
   */
  taskOverdue: (taskTitle: string, daysOverdue: number) => {
    toast({
      title: "⚠️ Task Overdue",
      description: `${taskTitle} was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`,
      variant: "destructive",
    });
  },
};
