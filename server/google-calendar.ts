import { google } from 'googleapis';
import { retryGoogleAPI } from './retry-utils';
import { logger } from './logger';

// OAuth2 client with refresh token
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar OAuth credentials not configured. Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, and GOOGLE_CALENDAR_REFRESH_TOKEN');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

export async function getUncachableGoogleCalendarClient() {
  const oauth2Client = createOAuth2Client();
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Calendar Service Functions
export async function listEvents(timeMin: Date, timeMax: Date, maxResults: number = 10) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    logger.debug({ timeMin, timeMax, count: response.data.items?.length || 0 }, 'Listed calendar events');
    return response.data.items || [];
  });
}

export async function checkAvailability(startTime: Date, endTime: Date) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = response.data.calendars?.['primary']?.busy || [];
    const isAvailable = busy.length === 0;
    logger.debug({ startTime, endTime, isAvailable }, 'Checked calendar availability');
    return isAvailable; // true if free, false if busy
  });
}

export async function findFreeSlots(startDate: Date, endDate: Date, durationMinutes: number = 60) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = response.data.calendars?.['primary']?.busy || [];

    // Simple algorithm to find free slots
    const freeSlots: { start: Date; end: Date }[] = [];
    let currentTime = new Date(startDate);

    while (currentTime < endDate) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);

      // Check if this slot overlaps with any busy period
      const isBusy = busy.some((busyPeriod: any) => {
        const busyStart = new Date(busyPeriod.start);
        const busyEnd = new Date(busyPeriod.end);
        return currentTime < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy && slotEnd <= endDate) {
        freeSlots.push({ start: new Date(currentTime), end: slotEnd });
      }

      currentTime = new Date(currentTime.getTime() + 30 * 60000); // Check every 30 minutes
    }

    logger.debug({ startDate, endDate, durationMinutes, freeSlots: freeSlots.length }, 'Found free slots');
    return freeSlots;
  });
}

export async function createEvent(
  summary: string,
  startTime: Date,
  endTime: Date,
  description?: string,
  attendeeEmails?: string[],
  recurrenceRule?: string,
  reminders?: { useDefault?: boolean; overrides?: Array<{ method: 'email' | 'popup'; minutes: number }> }
) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const event: any = {
      summary,
      description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Dubai',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Dubai',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
    };

    // Add attendees if provided
    if (attendeeEmails && attendeeEmails.length > 0) {
      event.attendees = attendeeEmails.map(email => ({ email }));
      event.sendUpdates = 'all'; // Send email invitations
    }

    // Add recurrence rule if provided (RFC5545 format)
    if (recurrenceRule) {
      event.recurrence = [`RRULE:${recurrenceRule}`];
    }

    // Add custom reminders if provided
    if (reminders) {
      event.reminders = reminders;
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: attendeeEmails && attendeeEmails.length > 0 ? 'all' : 'none',
    });

    logger.info({
      summary,
      startTime,
      endTime,
      attendees: attendeeEmails?.length || 0,
      eventId: response.data.id,
      meetLink: response.data.hangoutLink,
      recurring: !!recurrenceRule,
      customReminders: !!reminders
    }, 'Created calendar event with Google Meet link');
    return response.data;
  });
}

export async function updateEvent(eventId: string, updates: {
  summary?: string;
  startTime?: Date;
  endTime?: Date;
  description?: string;
  attendeeEmails?: string[];
  recurrenceRule?: string;
  reminders?: { useDefault?: boolean; overrides?: Array<{ method: 'email' | 'popup'; minutes: number }> };
}) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const event: any = {};
    if (updates.summary) event.summary = updates.summary;
    if (updates.description) event.description = updates.description;
    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: 'Asia/Dubai',
      };
    }
    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: 'Asia/Dubai',
      };
    }

    // Add attendees if provided
    if (updates.attendeeEmails && updates.attendeeEmails.length > 0) {
      event.attendees = updates.attendeeEmails.map(email => ({ email }));
    }

    // Add recurrence rule if provided
    if (updates.recurrenceRule) {
      event.recurrence = [`RRULE:${updates.recurrenceRule}`];
    }

    // Add custom reminders if provided
    if (updates.reminders) {
      event.reminders = updates.reminders;
    }

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: updates.attendeeEmails && updates.attendeeEmails.length > 0 ? 'all' : 'none',
    });

    logger.info({ eventId, updates: Object.keys(updates) }, 'Updated calendar event');
    return response.data;
  });
}

export async function getEventById(eventId: string) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    logger.debug({ eventId }, 'Retrieved calendar event by ID');
    return response.data;
  });
}

export async function deleteEvent(eventId: string) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    logger.info({ eventId }, 'Deleted calendar event');
    return true;
  });
}

export async function searchEvents(query: string, timeMin?: Date, timeMax?: Date) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const response = await calendar.events.list({
      calendarId: 'primary',
      q: query,
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    logger.debug({ query, count: response.data.items?.length || 0 }, 'Searched calendar events');
    return response.data.items || [];
  });
}

export async function createFocusTimeBlock(
  title: string,
  startTime: Date,
  endTime: Date,
  description?: string
) {
  return retryGoogleAPI(async () => {
    const calendar = await getUncachableGoogleCalendarClient();

    const event: any = {
      summary: title || 'Focus Time',
      description: description || 'Deep work session - Do Not Disturb',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Dubai',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Dubai',
      },
      eventType: 'focusTime', // Special event type that enables auto-decline
      focusTime: {
        autoDeclineMode: 'declineAllConflictingInvitations',
        declineMessage: 'I am in focus time and cannot attend. Please reschedule.'
      },
      transparency: 'opaque', // Marks time as busy
      colorId: '9', // Blue color in Google Calendar
      visibility: 'public', // Visible to others as "Busy"
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 } // Reminder 10 min before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    logger.info({
      title,
      startTime,
      endTime,
      eventId: response.data.id,
      autoDecline: true
    }, 'Created focus time block with auto-decline');
    return response.data;
  });
}
