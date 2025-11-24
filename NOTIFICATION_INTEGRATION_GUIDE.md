# Notification System Integration Guide

## Quick Start

The notification system is fully integrated and ready to use. Here's how to add notifications to your components.

## Common Integration Patterns

### 1. Task Completion Celebration

When a user marks a task as complete, celebrate their achievement:

```tsx
import { celebrateTaskCompletion } from '@/lib/task-celebrations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

function TaskItem({ task }) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/tasks/${task.id}`, {
        status: 'done'
      });
    },
    onSuccess: () => {
      // Celebrate!
      celebrateTaskCompletion(task.title);

      // Invalidate queries
      queryClient.invalidateQueries(['tasks']);
    }
  });

  return (
    <button onClick={() => completeMutation.mutate()}>
      Mark Complete
    </button>
  );
}
```

### 2. Error Handling with Toasts

Show user-friendly error messages:

```tsx
import { showToast } from '@/lib/toast-helper';
import { useMutation } from '@tanstack/react-query';

function CreateTaskForm() {
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest('POST', '/api/tasks', data);
    },
    onSuccess: () => {
      showToast.success('Task created!', 'Your task has been added.');
    },
    onError: (error) => {
      showToast.error('Failed to create task', error.message);
    }
  });

  // ... form implementation
}
```

### 3. Custom Notifications

Add notifications for custom events:

```tsx
import { addNotification } from '@/lib/notification-store';
import { showToast } from '@/lib/toast-helper';
import { browserNotifications } from '@/lib/browser-notifications';
import { isNotificationEnabled } from '@/lib/notification-store';

function VentureDetail({ venture }) {
  const checkMilestone = () => {
    const daysUntilDeadline = calculateDaysUntil(venture.targetDate);

    if (daysUntilDeadline <= 7) {
      // Add to notification center
      addNotification({
        type: 'project_milestone',
        title: 'Project Milestone',
        message: `${venture.name} deadline is ${daysUntilDeadline} days away`,
        link: `/ventures/${venture.id}`,
      });

      // Show toast
      showToast.warning(
        'Deadline Approaching',
        `${venture.name} is due in ${daysUntilDeadline} days`
      );

      // Show browser notification
      if (isNotificationEnabled('browserNotifications')) {
        browserNotifications.projectMilestone(venture.name);
      }
    }
  };

  useEffect(() => {
    checkMilestone();
  }, [venture]);

  // ... component implementation
}
```

### 4. Loading States with Promise Toasts

For long-running operations (future feature if needed):

```tsx
import { showToast } from '@/lib/toast-helper';

async function syncWithNotion() {
  const promise = apiRequest('POST', '/api/sync/notion');

  // This would require implementing promise toast in toast-helper
  // For now, use separate toasts:
  showToast.info('Syncing...', 'Please wait while we sync your data.');

  try {
    await promise;
    showToast.success('Sync complete!', 'Your data is up to date.');
  } catch (error) {
    showToast.error('Sync failed', error.message);
  }
}
```

## Existing Components to Update

### 1. Task Components

Update task status change handlers in:
- `/client/src/components/command-center/tasks-for-today.tsx`
- `/client/src/components/venture-hq/tasks-list.tsx`
- `/client/src/components/task-detail-modal.tsx`

Add celebration when marking complete:

```tsx
// Find the mutation that updates task status
const updateTaskMutation = useMutation({
  mutationFn: async (status: string) => {
    return await apiRequest('PATCH', `/api/tasks/${task.id}`, { status });
  },
  onSuccess: (_, status) => {
    if (status === 'done') {
      celebrateTaskCompletion(task.title);
    }
    queryClient.invalidateQueries(['tasks']);
  }
});
```

### 2. Health Logging

Update health entry creation in:
- `/client/src/components/health-hub/quick-log-modal.tsx`

Add success toast:

```tsx
import { showToast } from '@/lib/toast-helper';

const createMutation = useMutation({
  mutationFn: async (data) => {
    return await apiRequest('POST', '/api/health', data);
  },
  onSuccess: () => {
    showToast.success('Health entry logged!', 'Keep up the great work!');
    onClose();
  }
});
```

### 3. Meal Logging

Update meal creation in:
- `/client/src/components/nutrition-dashboard/add-meal-modal.tsx`

Add success toast:

```tsx
import { showToast } from '@/lib/toast-helper';

const createMutation = useMutation({
  mutationFn: async (data) => {
    return await apiRequest('POST', '/api/meals', data);
  },
  onSuccess: () => {
    showToast.success('Meal logged!', 'Nutrition tracking updated.');
    onClose();
  }
});
```

### 4. Deep Work Sessions

Update deep work slot creation/completion in:
- `/client/src/components/deep-work/slot-detail-modal.tsx`

Add notifications for session start and completion.

## Permission Request Flow

Add a notification settings prompt on first visit:

```tsx
// In a settings or onboarding component
import { requestNotificationPermission } from '@/lib/browser-notifications';
import { saveNotificationSettings, getNotificationSettings } from '@/lib/notification-store';

function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const settings = getNotificationSettings();
    const hasAsked = localStorage.getItem('notification_permission_asked');

    if (!hasAsked && Notification.permission === 'default') {
      setShow(true);
    }
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      saveNotificationSettings({
        ...getNotificationSettings(),
        browserNotifications: true,
      });
    }
    localStorage.setItem('notification_permission_asked', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enable Notifications?</CardTitle>
        <CardDescription>
          Stay on top of your tasks with timely reminders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleEnable}>Enable</Button>
          <Button variant="outline" onClick={() => {
            localStorage.setItem('notification_permission_asked', 'true');
            setShow(false);
          }}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Testing Checklist

- [ ] Bell icon shows in top nav
- [ ] Unread count badge appears
- [ ] Click bell opens dropdown
- [ ] Notifications list shows correctly
- [ ] Mark as read/unread works
- [ ] Delete notification works
- [ ] Clear all works
- [ ] Navigate to /notifications page
- [ ] Filter notifications by type
- [ ] Settings tab loads
- [ ] Browser permission request works
- [ ] Toggle notification types
- [ ] Change reminder times
- [ ] Enable Do Not Disturb
- [ ] Task completion shows celebration
- [ ] Toast notifications appear
- [ ] Browser notifications appear (after permission)
- [ ] Daily reminders trigger on app load

## Browser Console Testing

```js
// Test toast notifications
import('/src/lib/toast-helper.tsx').then(m => {
  m.showToast.success('Test Success', 'This is a test');
  m.showToast.error('Test Error', 'This is an error');
  m.showToast.taskDue('Sample Task', '/');
});

// Test browser notifications
import('/src/lib/browser-notifications.ts').then(async m => {
  await m.requestNotificationPermission();
  m.browserNotifications.taskDue('Sample Task', '/');
});

// Test notification center
import('/src/lib/notification-store.ts').then(m => {
  m.addNotification({
    type: 'task_completed',
    title: 'Test Complete',
    message: 'This is a test notification',
    link: '/',
  });
});

// Test celebrations
import('/src/lib/task-celebrations.ts').then(m => {
  m.celebrateTaskCompletion('Test Task');
});

// Check notification count
import('/src/lib/notification-store.ts').then(m => {
  console.log('Unread:', m.getUnreadCount());
  console.log('All:', m.getNotifications());
});
```

## Performance Considerations

- Notifications are stored in localStorage (max 100)
- Daily reminders check every hour (not every minute)
- Browser notifications are throttled by the browser
- Toast notifications auto-dismiss to prevent spam

## Accessibility

- Bell icon has proper ARIA labels
- Keyboard navigation supported in dropdown
- Screen reader friendly notification messages
- High contrast support for unread badges

## Next Steps

1. Add celebrations to task completion handlers
2. Add success toasts to form submissions
3. Add error toasts to mutation failures
4. Test browser notifications on HTTPS
5. Customize reminder times in settings
6. Monitor localStorage usage

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify TypeScript compilation (`npm run check`)
3. Check notification permission in browser settings
4. Review NOTIFICATIONS_SYSTEM.md for detailed docs
