import { google } from 'googleapis';
import { retryGoogleAPI } from './retry-utils';
import { logger } from './logger';

let connectionSettings: any;
let tokenRefreshPromise: Promise<string> | null = null;

// TTL buffer: Refresh token 5 minutes before expiry to avoid edge cases
const TOKEN_TTL_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// Helper to extract access token from connector response (supports multiple shapes)
function extractAccessToken(settings: any): string | null {
  return settings?.access_token || settings?.oauth?.credentials?.access_token || null;
}

// Helper to extract expiry timestamp from connector response (supports multiple shapes)
function extractExpiryTimestamp(settings: any): number | null {
  if (settings?.expires_at) {
    return new Date(settings.expires_at).getTime();
  }
  if (settings?.oauth?.credentials?.expiry_date) {
    // expiry_date can be number (ms) or ISO string
    const expiryDate = settings.oauth.credentials.expiry_date;
    return typeof expiryDate === 'number' ? expiryDate : new Date(expiryDate).getTime();
  }
  return null;
}

async function getAccessToken() {
  // Check if token is still valid with TTL buffer
  if (connectionSettings?.settings) {
    const expiresAt = extractExpiryTimestamp(connectionSettings.settings);
    const cachedToken = extractAccessToken(connectionSettings.settings);
    
    if (expiresAt && cachedToken) {
      const now = Date.now();
      // Token is valid if it expires more than 5 minutes from now
      if (expiresAt - now > TOKEN_TTL_BUFFER_MS) {
        return cachedToken;
      }
    }
  }
  
  // If there's already a token refresh in progress, wait for it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  // Start token refresh with mutex
  tokenRefreshPromise = refreshAccessToken();
  
  try {
    const token = await tokenRefreshPromise;
    return token;
  } finally {
    // Release mutex
    tokenRefreshPromise = null;
  }
}

async function refreshAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = extractAccessToken(connectionSettings?.settings);

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  
  const expiresAt = extractExpiryTimestamp(connectionSettings.settings);
  logger.debug({ 
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'unknown',
    hasToken: true
  }, 'Refreshed Google Calendar access token');
  
  return accessToken;
}

export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

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
  attendeeEmails?: string[]
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
    };

    // Add attendees if provided
    if (attendeeEmails && attendeeEmails.length > 0) {
      event.attendees = attendeeEmails.map(email => ({ email }));
      event.sendUpdates = 'all'; // Send email invitations
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: attendeeEmails && attendeeEmails.length > 0 ? 'all' : 'none',
    });

    logger.info({ summary, startTime, endTime, attendees: attendeeEmails?.length || 0, eventId: response.data.id }, 'Created calendar event');
    return response.data;
  });
}

export async function updateEvent(eventId: string, updates: {
  summary?: string;
  startTime?: Date;
  endTime?: Date;
  description?: string;
  attendeeEmails?: string[];
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
