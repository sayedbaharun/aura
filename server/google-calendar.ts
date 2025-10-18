import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
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

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
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
  const calendar = await getUncachableGoogleCalendarClient();
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

export async function checkAvailability(startTime: Date, endTime: Date) {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  const busy = response.data.calendars?.['primary']?.busy || [];
  return busy.length === 0; // true if free, false if busy
}

export async function findFreeSlots(startDate: Date, endDate: Date, durationMinutes: number = 60) {
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

  return freeSlots;
}

export async function createEvent(summary: string, startTime: Date, endTime: Date, description?: string) {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const event = {
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

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data;
}

export async function updateEvent(eventId: string, updates: {
  summary?: string;
  startTime?: Date;
  endTime?: Date;
  description?: string;
}) {
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

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event,
  });

  return response.data;
}

export async function deleteEvent(eventId: string) {
  const calendar = await getUncachableGoogleCalendarClient();
  
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });

  return true;
}
