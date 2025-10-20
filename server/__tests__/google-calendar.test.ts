import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as calendar from '../google-calendar';
import { google } from 'googleapis';
import {
  createMockGoogleCalendarClient,
  mockGoogleCalendarEvent,
  mockGoogleCalendarEvents,
} from './test-utils';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(),
  },
}));

// Mock fetch for access token
global.fetch = vi.fn();

describe('Google Calendar Integration', () => {
  let mockCalendarClient: ReturnType<typeof createMockGoogleCalendarClient>;

  beforeEach(() => {
    mockCalendarClient = createMockGoogleCalendarClient();
    (google.calendar as any).mockReturnValue(mockCalendarClient);

    // Mock access token fetch
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        items: [
          {
            settings: {
              access_token: 'test-token',
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            },
          },
        ],
      }),
    });

    // Set required environment variables
    process.env.REPLIT_CONNECTORS_HOSTNAME = 'test-connector.replit.com';
    process.env.REPL_IDENTITY = 'test-identity';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('Create Event', () => {
      it('should create a basic event without attendees', async () => {
        const event = await calendar.createEvent(
          'Test Meeting',
          new Date('2025-10-21T14:00:00'),
          new Date('2025-10-21T15:00:00'),
          'Test description'
        );

        expect(mockCalendarClient.events.insert).toHaveBeenCalledWith({
          calendarId: 'primary',
          requestBody: {
            summary: 'Test Meeting',
            description: 'Test description',
            start: {
              dateTime: expect.any(String),
              timeZone: 'Asia/Dubai',
            },
            end: {
              dateTime: expect.any(String),
              timeZone: 'Asia/Dubai',
            },
          },
          sendUpdates: 'none',
        });

        expect(event).toBeDefined();
        expect(event.id).toBe('test-event-123');
      });

      it('should create an event with attendees and send invitations', async () => {
        const attendees = ['attendee1@example.com', 'attendee2@example.com'];

        const event = await calendar.createEvent(
          'Client Meeting',
          new Date('2025-10-21T14:00:00'),
          new Date('2025-10-21T15:00:00'),
          'Important client meeting',
          attendees
        );

        expect(mockCalendarClient.events.insert).toHaveBeenCalledWith({
          calendarId: 'primary',
          requestBody: {
            summary: 'Client Meeting',
            description: 'Important client meeting',
            start: {
              dateTime: expect.any(String),
              timeZone: 'Asia/Dubai',
            },
            end: {
              dateTime: expect.any(String),
              timeZone: 'Asia/Dubai',
            },
            attendees: [
              { email: 'attendee1@example.com' },
              { email: 'attendee2@example.com' },
            ],
            sendUpdates: 'all',
          },
          sendUpdates: 'all',
        });

        expect(event).toBeDefined();
      });

      it('should handle timezone correctly', async () => {
        await calendar.createEvent(
          'Test Meeting',
          new Date('2025-10-21T14:00:00'),
          new Date('2025-10-21T15:00:00')
        );

        const insertCall = mockCalendarClient.events.insert.mock.calls[0][0];
        expect(insertCall.requestBody.start.timeZone).toBe('Asia/Dubai');
        expect(insertCall.requestBody.end.timeZone).toBe('Asia/Dubai');
      });
    });

    describe('Read Events', () => {
      it('should list events within a date range', async () => {
        const startDate = new Date('2025-10-21T00:00:00');
        const endDate = new Date('2025-10-21T23:59:59');

        const events = await calendar.listEvents(startDate, endDate, 10);

        expect(mockCalendarClient.events.list).toHaveBeenCalledWith({
          calendarId: 'primary',
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });

        expect(events).toEqual(mockGoogleCalendarEvents);
        expect(events).toHaveLength(2);
      });

      it('should return empty array when no events found', async () => {
        mockCalendarClient.events.list.mockResolvedValueOnce({
          data: { items: [] },
        });

        const events = await calendar.listEvents(
          new Date('2025-10-21T00:00:00'),
          new Date('2025-10-21T23:59:59')
        );

        expect(events).toEqual([]);
      });

      it('should use default maxResults when not specified', async () => {
        await calendar.listEvents(
          new Date('2025-10-21T00:00:00'),
          new Date('2025-10-21T23:59:59')
        );

        expect(mockCalendarClient.events.list).toHaveBeenCalledWith(
          expect.objectContaining({ maxResults: 10 })
        );
      });
    });

    describe('Update Event', () => {
      it('should update event summary', async () => {
        const event = await calendar.updateEvent('event-123', {
          summary: 'Updated Meeting Title',
        });

        expect(mockCalendarClient.events.patch).toHaveBeenCalledWith({
          calendarId: 'primary',
          eventId: 'event-123',
          requestBody: {
            summary: 'Updated Meeting Title',
          },
          sendUpdates: 'none',
        });

        expect(event).toBeDefined();
      });

      it('should update event times', async () => {
        const newStart = new Date('2025-10-21T16:00:00');
        const newEnd = new Date('2025-10-21T17:00:00');

        await calendar.updateEvent('event-123', {
          startTime: newStart,
          endTime: newEnd,
        });

        expect(mockCalendarClient.events.patch).toHaveBeenCalledWith({
          calendarId: 'primary',
          eventId: 'event-123',
          requestBody: {
            start: {
              dateTime: newStart.toISOString(),
              timeZone: 'Asia/Dubai',
            },
            end: {
              dateTime: newEnd.toISOString(),
              timeZone: 'Asia/Dubai',
            },
          },
          sendUpdates: 'none',
        });
      });

      it('should update event with attendees and send notifications', async () => {
        const attendees = ['new@example.com'];

        await calendar.updateEvent('event-123', {
          attendeeEmails: attendees,
        });

        expect(mockCalendarClient.events.patch).toHaveBeenCalledWith({
          calendarId: 'primary',
          eventId: 'event-123',
          requestBody: {
            attendees: [{ email: 'new@example.com' }],
          },
          sendUpdates: 'all',
        });
      });

      it('should update multiple properties at once', async () => {
        await calendar.updateEvent('event-123', {
          summary: 'Updated Title',
          description: 'Updated description',
          startTime: new Date('2025-10-21T16:00:00'),
          endTime: new Date('2025-10-21T17:00:00'),
          attendeeEmails: ['attendee@example.com'],
        });

        const patchCall = mockCalendarClient.events.patch.mock.calls[0][0];
        expect(patchCall.requestBody).toHaveProperty('summary');
        expect(patchCall.requestBody).toHaveProperty('description');
        expect(patchCall.requestBody).toHaveProperty('start');
        expect(patchCall.requestBody).toHaveProperty('end');
        expect(patchCall.requestBody).toHaveProperty('attendees');
      });
    });

    describe('Delete Event', () => {
      it('should delete an event by ID', async () => {
        const result = await calendar.deleteEvent('event-123');

        expect(mockCalendarClient.events.delete).toHaveBeenCalledWith({
          calendarId: 'primary',
          eventId: 'event-123',
        });

        expect(result).toBe(true);
      });

      it('should handle deletion errors', async () => {
        mockCalendarClient.events.delete.mockRejectedValueOnce(
          new Error('Event not found')
        );

        await expect(calendar.deleteEvent('nonexistent-event')).rejects.toThrow(
          'Event not found'
        );
      });
    });
  });

  describe('Availability Checking', () => {
    it('should return true when time slot is available', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [],
            },
          },
        },
      });

      const isAvailable = await calendar.checkAvailability(
        new Date('2025-10-21T14:00:00'),
        new Date('2025-10-21T15:00:00')
      );

      expect(isAvailable).toBe(true);
    });

    it('should return false when time slot has conflicts', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [
                {
                  start: '2025-10-21T14:00:00Z',
                  end: '2025-10-21T15:00:00Z',
                },
              ],
            },
          },
        },
      });

      const isAvailable = await calendar.checkAvailability(
        new Date('2025-10-21T14:00:00'),
        new Date('2025-10-21T15:00:00')
      );

      expect(isAvailable).toBe(false);
    });

    it('should call freebusy API with correct parameters', async () => {
      const startTime = new Date('2025-10-21T14:00:00');
      const endTime = new Date('2025-10-21T15:00:00');

      await calendar.checkAvailability(startTime, endTime);

      expect(mockCalendarClient.freebusy.query).toHaveBeenCalledWith({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });
    });
  });

  describe('Find Free Slots', () => {
    it('should find free slots in an empty calendar', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [],
            },
          },
        },
      });

      const freeSlots = await calendar.findFreeSlots(
        new Date('2025-10-21T09:00:00'),
        new Date('2025-10-21T17:00:00'),
        60
      );

      expect(freeSlots.length).toBeGreaterThan(0);
      expect(freeSlots[0]).toHaveProperty('start');
      expect(freeSlots[0]).toHaveProperty('end');
    });

    it('should exclude busy periods from free slots', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [
                {
                  start: '2025-10-21T10:00:00Z',
                  end: '2025-10-21T11:00:00Z',
                },
              ],
            },
          },
        },
      });

      const freeSlots = await calendar.findFreeSlots(
        new Date('2025-10-21T09:00:00'),
        new Date('2025-10-21T12:00:00'),
        60
      );

      // Check that no free slot overlaps with the busy period
      const busyStart = new Date('2025-10-21T10:00:00Z');
      const busyEnd = new Date('2025-10-21T11:00:00Z');

      freeSlots.forEach(slot => {
        const noOverlap = slot.end <= busyStart || slot.start >= busyEnd;
        expect(noOverlap).toBe(true);
      });
    });

    it('should respect duration parameter', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [],
            },
          },
        },
      });

      const duration = 30;
      const freeSlots = await calendar.findFreeSlots(
        new Date('2025-10-21T09:00:00'),
        new Date('2025-10-21T10:00:00'),
        duration
      );

      freeSlots.forEach(slot => {
        const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000;
        expect(slotDuration).toBe(duration);
      });
    });

    it('should use default 60 minute duration when not specified', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [],
            },
          },
        },
      });

      const freeSlots = await calendar.findFreeSlots(
        new Date('2025-10-21T09:00:00'),
        new Date('2025-10-21T10:00:00')
      );

      if (freeSlots.length > 0) {
        const slotDuration = (freeSlots[0].end.getTime() - freeSlots[0].start.getTime()) / 60000;
        expect(slotDuration).toBe(60);
      }
    });

    it('should return empty array when no free slots available', async () => {
      mockCalendarClient.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            primary: {
              busy: [
                {
                  start: '2025-10-21T09:00:00Z',
                  end: '2025-10-21T17:00:00Z',
                },
              ],
            },
          },
        },
      });

      const freeSlots = await calendar.findFreeSlots(
        new Date('2025-10-21T09:00:00'),
        new Date('2025-10-21T17:00:00'),
        60
      );

      expect(freeSlots).toEqual([]);
    });
  });

  describe('Search Events', () => {
    it('should search events by query string', async () => {
      const searchResults = [
        {
          id: 'gym-1',
          summary: 'Gym Session',
          start: { dateTime: '2025-10-21T06:00:00' },
          end: { dateTime: '2025-10-21T07:00:00' },
        },
      ];

      mockCalendarClient.events.list.mockResolvedValueOnce({
        data: { items: searchResults },
      });

      const events = await calendar.searchEvents('gym');

      expect(mockCalendarClient.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        q: 'gym',
        timeMin: undefined,
        timeMax: undefined,
        singleEvents: true,
        orderBy: 'startTime',
      });

      expect(events).toEqual(searchResults);
    });

    it('should search events with date range', async () => {
      const timeMin = new Date('2025-10-21T00:00:00');
      const timeMax = new Date('2025-10-21T23:59:59');

      await calendar.searchEvents('meeting', timeMin, timeMax);

      expect(mockCalendarClient.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        q: 'meeting',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('should return empty array when no matches found', async () => {
      mockCalendarClient.events.list.mockResolvedValueOnce({
        data: { items: [] },
      });

      const events = await calendar.searchEvents('nonexistent');

      expect(events).toEqual([]);
    });

    it('should handle search with special characters', async () => {
      await calendar.searchEvents('meeting @ office');

      expect(mockCalendarClient.events.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'meeting @ office',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API authentication errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Authentication failed'));

      await expect(
        calendar.listEvents(
          new Date('2025-10-21T00:00:00'),
          new Date('2025-10-21T23:59:59')
        )
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle missing access token', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ items: [] }),
      });

      await expect(
        calendar.listEvents(
          new Date('2025-10-21T00:00:00'),
          new Date('2025-10-21T23:59:59')
        )
      ).rejects.toThrow('Google Calendar not connected');
    });

    it('should handle API rate limiting', async () => {
      mockCalendarClient.events.list.mockRejectedValueOnce({
        code: 429,
        message: 'Rate limit exceeded',
      });

      await expect(
        calendar.listEvents(
          new Date('2025-10-21T00:00:00'),
          new Date('2025-10-21T23:59:59')
        )
      ).rejects.toMatchObject({
        code: 429,
      });
    });

    it('should handle network errors', async () => {
      mockCalendarClient.events.list.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        calendar.listEvents(
          new Date('2025-10-21T00:00:00'),
          new Date('2025-10-21T23:59:59')
        )
      ).rejects.toThrow('Network error');
    });
  });

  describe('Access Token Management', () => {
    it('should fetch new access token when expired', async () => {
      // First call with expired token
      (global.fetch as any).mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          items: [
            {
              settings: {
                access_token: 'expired-token',
                expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
              },
            },
          ],
        }),
      });

      // Second call should fetch new token
      (global.fetch as any).mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          items: [
            {
              settings: {
                access_token: 'new-token',
                expires_at: new Date(Date.now() + 3600000).toISOString(),
              },
            },
          ],
        }),
      });

      await calendar.listEvents(
        new Date('2025-10-21T00:00:00'),
        new Date('2025-10-21T23:59:59')
      );

      // Should fetch token twice (once expired, once new)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should reuse valid access token', async () => {
      (global.fetch as any).mockClear();

      (global.fetch as any).mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          items: [
            {
              settings: {
                access_token: 'valid-token',
                expires_at: new Date(Date.now() + 3600000).toISOString(),
              },
            },
          ],
        }),
      });

      // First call
      await calendar.listEvents(
        new Date('2025-10-21T00:00:00'),
        new Date('2025-10-21T23:59:59')
      );

      // Second call should reuse token
      await calendar.listEvents(
        new Date('2025-10-21T00:00:00'),
        new Date('2025-10-21T23:59:59')
      );

      // Should only fetch token once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
