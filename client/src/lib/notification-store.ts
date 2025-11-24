/**
 * Notification Store
 * Manages notifications in localStorage (Phase 5)
 * Will be migrated to backend in Phase 6
 */

import { Notification, NotificationType, NotificationSettings, defaultNotificationSettings } from './notification-types';

const NOTIFICATIONS_KEY = 'hikma_notifications';
const SETTINGS_KEY = 'hikma_notification_settings';
const MAX_NOTIFICATIONS = 100;

/**
 * Generate a unique ID for a notification
 */
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all notifications from localStorage
 */
export function getNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    const notifications = JSON.parse(stored);
    // Convert date strings back to Date objects
    return notifications.map((n: any) => ({
      ...n,
      created_at: new Date(n.created_at),
    }));
  } catch (error) {
    console.error('Failed to load notifications:', error);
    return [];
  }
}

/**
 * Save notifications to localStorage
 */
function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
}

/**
 * Add a new notification
 */
export function addNotification(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Notification {
  const notification: Notification = {
    id: generateId(),
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    read: false,
    created_at: new Date(),
  };

  const notifications = getNotifications();
  notifications.unshift(notification); // Add to beginning

  // Keep only the last MAX_NOTIFICATIONS
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.splice(MAX_NOTIFICATIONS);
  }

  saveNotifications(notifications);

  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('notification-added', { detail: notification }));

  return notification;
}

/**
 * Mark a notification as read
 */
export function markAsRead(notificationId: string): void {
  const notifications = getNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveNotifications(notifications);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }
}

/**
 * Mark a notification as unread
 */
export function markAsUnread(notificationId: string): void {
  const notifications = getNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = false;
    saveNotifications(notifications);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
  const notifications = getNotifications();
  notifications.forEach(n => n.read = true);
  saveNotifications(notifications);
  window.dispatchEvent(new CustomEvent('notification-updated'));
}

/**
 * Delete a notification
 */
export function deleteNotification(notificationId: string): void {
  const notifications = getNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveNotifications(filtered);
  window.dispatchEvent(new CustomEvent('notification-updated'));
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  saveNotifications([]);
  window.dispatchEvent(new CustomEvent('notification-updated'));
}

/**
 * Get unread notification count
 */
export function getUnreadCount(): number {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
}

// ============= Settings Management =============

/**
 * Get notification settings
 */
export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultNotificationSettings;
    return { ...defaultNotificationSettings, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to load notification settings:', error);
    return defaultNotificationSettings;
  }
}

/**
 * Save notification settings
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('notification-settings-updated'));
  } catch (error) {
    console.error('Failed to save notification settings:', error);
  }
}

/**
 * Check if a notification type is enabled
 */
export function isNotificationEnabled(type: keyof NotificationSettings): boolean {
  const settings = getNotificationSettings();
  return settings[type] as boolean;
}

/**
 * Check if we're in "Do Not Disturb" mode
 */
export function isDoNotDisturb(): boolean {
  const settings = getNotificationSettings();
  if (!settings.doNotDisturb) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }

  // Normal quiet hours (e.g., 13:00 to 14:00)
  return currentTime >= start && currentTime <= end;
}
