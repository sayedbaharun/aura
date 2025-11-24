/**
 * Task Completion Celebrations
 * Fun animations and notifications when tasks are completed
 */

import { showToast } from './toast-helper';
import { browserNotifications } from './browser-notifications';
import { addNotification, isNotificationEnabled, isDoNotDisturb } from './notification-store';

/**
 * Celebrate a task completion
 */
export function celebrateTaskCompletion(taskTitle: string): void {
  // Check if celebrations are enabled
  if (!isNotificationEnabled('taskCompletionCelebrations') || isDoNotDisturb()) {
    return;
  }

  // Add to notification center
  addNotification({
    type: 'task_completed',
    title: 'Task Completed! 🎉',
    message: `Great job on finishing "${taskTitle}"!`,
  });

  // Show toast
  showToast.taskCompleted(taskTitle);

  // Show browser notification
  if (isNotificationEnabled('browserNotifications')) {
    browserNotifications.taskCompleted(taskTitle);
  }

  // Optional: Trigger confetti animation
  // (requires canvas-confetti library to be installed)
  try {
    // @ts-ignore - confetti may not be installed
    if (typeof window !== 'undefined' && window.confetti) {
      // @ts-ignore
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  } catch (error) {
    // Confetti not available, that's okay
  }
}

/**
 * Hook to use task celebrations in components
 */
export function useTaskCelebrations() {
  return {
    celebrate: celebrateTaskCompletion,
  };
}
