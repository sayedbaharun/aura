# Hikma-OS Notifications & Reminders System

## Overview

A comprehensive notification system with toast notifications, browser notifications, and a notification center for Hikma-OS.

## Features

### 1. Notification Center
- Bell icon in top navigation with unread count badge
- Dropdown panel showing last 20 notifications
- Mark as read/unread functionality
- Delete individual notifications
- Clear all notifications
- Link to full notification history page

### 2. Toast Notifications
- Built on existing Radix UI toast system
- Success, error, warning, and info variants
- Action buttons for interactive toasts
- Automatic dismissal

### 3. Browser Notifications
- Native desktop notifications (requires user permission)
- Click to navigate to relevant page
- Works even when app is not in focus
- HTTPS required in production

### 4. Notification Types
- **Task Due**: Daily reminder for tasks due today
- **Task Overdue**: Alerts for overdue tasks
- **Task Completed**: Celebration when tasks are marked as done
- **Health Reminder**: Prompt to log health metrics
- **Weekly Planning**: Reminder to plan the week
- **Daily Reflection**: Prompt for daily reflection
- **Project Milestone**: Alerts for upcoming project milestones

### 5. User Settings
- Enable/disable browser notifications
- Enable/disable specific notification types
- Customize reminder times
- Do Not Disturb mode with quiet hours
- All settings stored in localStorage (Phase 5)

### 6. Daily Reminders Service
- Checks for due/overdue tasks every hour
- Checks for scheduled reminders every minute
- Respects user preferences and Do Not Disturb mode
- Auto-initializes on app load

## File Structure

```
client/src/
├── lib/
│   ├── notification-types.ts          # TypeScript interfaces
│   ├── notification-store.ts          # localStorage management
│   ├── browser-notifications.ts       # Browser notification helpers
│   ├── toast-helper.tsx               # Toast notification helpers
│   ├── daily-reminders.ts             # Reminder service
│   └── task-celebrations.ts           # Task completion celebrations
├── components/
│   └── notifications/
│       ├── notification-center.tsx    # Bell dropdown component
│       └── notification-settings.tsx  # Settings UI
└── pages/
    └── notifications.tsx              # Full notification history page
```

## Usage

### Show a Toast Notification

```tsx
import { showToast } from '@/lib/toast-helper';

// Success
showToast.success('Task created!', 'Your task has been added to the queue.');

// Error
showToast.error('Failed to save', 'Please try again.');

// Task due
showToast.taskDue('Write blog post', '/');

// Task completed
showToast.taskCompleted('Fix bug #123');
```

### Show a Browser Notification

```tsx
import { browserNotifications, requestNotificationPermission } from '@/lib/browser-notifications';

// Request permission first
const granted = await requestNotificationPermission();

if (granted) {
  // Show notification
  browserNotifications.taskDue('Write blog post', '/');
  browserNotifications.healthReminder();
}
```

### Add to Notification Center

```tsx
import { addNotification } from '@/lib/notification-store';

addNotification({
  type: 'task_due',
  title: 'Task Due Today',
  message: 'Write blog post is due today',
  link: '/',
});
```

### Celebrate Task Completion

```tsx
import { celebrateTaskCompletion } from '@/lib/task-celebrations';

// When marking a task as complete
celebrateTaskCompletion('Fix bug #123');
```

## Integration

### Task Completion Example

In your task component:

```tsx
import { celebrateTaskCompletion } from '@/lib/task-celebrations';
import { apiRequest } from '@/lib/queryClient';

const handleMarkComplete = async (task: Task) => {
  await apiRequest('PATCH', `/api/tasks/${task.id}`, { status: 'done' });

  // Celebrate!
  celebrateTaskCompletion(task.title);
};
```

### Custom Reminder Example

```tsx
import { addNotification } from '@/lib/notification-store';
import { showToast } from '@/lib/toast-helper';
import { browserNotifications } from '@/lib/browser-notifications';
import { isNotificationEnabled, isDoNotDisturb } from '@/lib/notification-store';

const showCustomReminder = () => {
  if (isDoNotDisturb()) return;

  // Add to notification center
  addNotification({
    type: 'project_milestone',
    title: 'Project Milestone',
    message: 'Q4 launch is approaching',
    link: '/ventures',
  });

  // Show toast
  showToast.info('Project Milestone', 'Q4 launch is approaching');

  // Show browser notification
  if (isNotificationEnabled('browserNotifications')) {
    browserNotifications.projectMilestone('Q4 Launch');
  }
};
```

## Settings

Users can customize notifications in two ways:

1. **Notification Center**: Click the bell icon → "View all notifications" → Settings tab
2. **Direct URL**: Navigate to `/notifications` and click the "Settings" tab

### Available Settings

- **Browser Notifications**: Enable/disable desktop notifications
- **Notification Types**: Toggle individual notification types
- **Reminder Timing**:
  - Health reminder time (default: 21:00)
  - Weekly planning day/time (default: Sunday 18:00)
  - Daily reflection time (default: 21:00)
- **Do Not Disturb**:
  - Enable/disable quiet hours
  - Set quiet hours start/end time

## Testing

### Test Browser Notifications

1. Navigate to `/notifications` → Settings tab
2. Click "Enable Notifications" (grants browser permission)
3. Toggle notification types
4. Wait for scheduled reminders or trigger manually in console:

```js
// In browser console
import('/client/src/lib/browser-notifications.js').then(m => {
  m.browserNotifications.taskDue('Test Task', '/');
});
```

### Test Daily Reminders

The service auto-checks on app load and every hour. To test immediately:

1. Create tasks with today's due date
2. Refresh the app
3. Should see task due notifications

### Test Task Celebrations

1. Mark any task as "done"
2. Should see toast + browser notification + notification center entry

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Browser notifications require user interaction (can't auto-trigger)
- **Mobile**: Toast notifications work, browser notifications limited

## Production Considerations

1. **HTTPS Required**: Browser notifications only work over HTTPS
2. **Permission Prompt**: Only show after user action, not on page load
3. **localStorage Limits**: Max 100 notifications stored
4. **Notification Persistence**: Notifications cleared when localStorage is cleared

## Future Enhancements (Phase 6)

- [ ] Migrate notification storage to backend database
- [ ] Real-time notifications via WebSocket
- [ ] Email notifications
- [ ] Webhook integrations (Slack, Discord, etc.)
- [ ] Push notifications for mobile PWA
- [ ] Notification scheduling
- [ ] Snooze functionality
- [ ] Notification templates
- [ ] Analytics and insights

## API (Phase 6 - Backend)

Future API endpoints:

```
GET    /api/notifications          # Get all notifications
POST   /api/notifications          # Create notification
PATCH  /api/notifications/:id      # Mark as read/unread
DELETE /api/notifications/:id      # Delete notification
DELETE /api/notifications          # Clear all

GET    /api/notification-settings  # Get settings
PUT    /api/notification-settings  # Update settings
```

## Troubleshooting

### Notifications not showing

1. Check browser notification permission (chrome://settings/content/notifications)
2. Check Do Not Disturb settings
3. Verify notification type is enabled in settings
4. Check browser console for errors

### "Permission denied" error

User previously blocked notifications. Clear in browser settings or use a different browser.

### Daily reminders not working

1. Check that `dailyRemindersService.init()` is called in App.tsx
2. Verify tasks exist with due dates
3. Check notification settings are enabled

## Credits

Built for Hikma-OS Phase 5 by Agent 13.
