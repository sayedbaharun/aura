import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processMessage, pendingConfirmations } from '../ai-assistant';
import * as calendar from '../google-calendar';
import { storage } from '../storage';
import {
  createMockOpenAIClient,
  createMockOpenAIResponse,
  createMockToolCall,
  mockStorage,
  resetAllMocks,
} from './test-utils';

// Mock dependencies
vi.mock('../storage', () => ({
  storage: mockStorage,
}));

vi.mock('../google-calendar', () => ({
  listEvents: vi.fn(),
  checkAvailability: vi.fn(),
  findFreeSlots: vi.fn(),
  searchEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => createMockOpenAIClient()),
  };
});

describe('AI Assistant - processMessage', () => {
  beforeEach(() => {
    resetAllMocks();
    pendingConfirmations.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Confirmation Workflow', () => {
    it('should request confirmation before booking an appointment', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      // Mock tool call for booking request
      const bookingToolCall = createMockToolCall('request_book_appointment', {
        title: 'Team Meeting',
        startTime: '2025-10-21T14:00:00',
        endTime: '2025-10-21T15:00:00',
        description: 'Weekly sync',
      });

      mockClient.chat.completions.create.mockResolvedValueOnce(
        createMockOpenAIResponse('', [bookingToolCall])
      );

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Book a team meeting at 2pm', 'test-chat-123');

      expect(response).toContain('book');
      expect(response).toContain('Team Meeting');
      expect(response).toContain('Confirm');
      expect(pendingConfirmations.has('test-chat-123')).toBe(true);

      const confirmation = pendingConfirmations.get('test-chat-123');
      expect(confirmation?.action).toBe('book');
      expect(confirmation?.data.title).toBe('Team Meeting');
    });

    it('should execute booking after confirmation with "yes"', async () => {
      // Set up pending confirmation
      pendingConfirmations.set('test-chat-123', {
        action: 'book',
        data: {
          title: 'Team Meeting',
          startTime: '2025-10-21T14:00:00',
          endTime: '2025-10-21T15:00:00',
          description: 'Weekly sync',
        },
        messageText: 'Book Team Meeting?',
      });

      vi.mocked(calendar.createEvent).mockResolvedValueOnce({
        id: 'event-123',
        summary: 'Team Meeting',
        htmlLink: 'https://calendar.google.com/event',
      } as any);

      const response = await processMessage('yes', 'test-chat-123');

      expect(response).toContain('Booked');
      expect(response).toContain('Team Meeting');
      expect(calendar.createEvent).toHaveBeenCalledWith(
        'Team Meeting',
        expect.any(Date),
        expect.any(Date),
        'Weekly sync',
        undefined
      );
      expect(mockStorage.createAppointment).toHaveBeenCalled();
      expect(pendingConfirmations.has('test-chat-123')).toBe(false);
    });

    it('should execute booking after confirmation with "confirm"', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'book',
        data: {
          title: 'Team Meeting',
          startTime: '2025-10-21T14:00:00',
          endTime: '2025-10-21T15:00:00',
        },
        messageText: 'Book Team Meeting?',
      });

      vi.mocked(calendar.createEvent).mockResolvedValueOnce({
        id: 'event-123',
        summary: 'Team Meeting',
      } as any);

      const response = await processMessage('confirm', 'test-chat-123');

      expect(response).toContain('Booked');
      expect(calendar.createEvent).toHaveBeenCalled();
      expect(pendingConfirmations.has('test-chat-123')).toBe(false);
    });

    it('should cancel pending action when user says "no"', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'book',
        data: {
          title: 'Team Meeting',
          startTime: '2025-10-21T14:00:00',
          endTime: '2025-10-21T15:00:00',
        },
        messageText: 'Book Team Meeting?',
      });

      const response = await processMessage('no', 'test-chat-123');

      expect(response).toContain('No problem');
      expect(calendar.createEvent).not.toHaveBeenCalled();
      expect(pendingConfirmations.has('test-chat-123')).toBe(false);
    });

    it('should cancel pending action when user says "cancel"', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'book',
        data: { title: 'Test' },
        messageText: 'Confirm?',
      });

      const response = await processMessage('cancel', 'test-chat-123');

      expect(response).toContain('No problem');
      expect(pendingConfirmations.has('test-chat-123')).toBe(false);
    });

    it('should request confirmation before canceling an appointment', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      const cancelToolCall = createMockToolCall('request_cancel_appointment', {
        eventId: 'event-123',
        eventTitle: 'Team Meeting',
        eventTime: '2025-10-21T14:00:00',
      });

      mockClient.chat.completions.create.mockResolvedValueOnce(
        createMockOpenAIResponse('', [cancelToolCall])
      );

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Cancel team meeting', 'test-chat-123');

      expect(response).toContain('cancel');
      expect(response).toContain('Team Meeting');
      expect(pendingConfirmations.has('test-chat-123')).toBe(true);

      const confirmation = pendingConfirmations.get('test-chat-123');
      expect(confirmation?.action).toBe('cancel');
    });

    it('should execute cancellation after confirmation', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'cancel',
        data: {
          eventId: 'event-123',
          eventTitle: 'Team Meeting',
        },
        messageText: 'Cancel Team Meeting?',
      });

      vi.mocked(calendar.deleteEvent).mockResolvedValueOnce(true);

      const response = await processMessage('yes', 'test-chat-123');

      expect(response).toContain('Cancelled');
      expect(response).toContain('Team Meeting');
      expect(calendar.deleteEvent).toHaveBeenCalledWith('event-123');
      expect(pendingConfirmations.has('test-chat-123')).toBe(false);
    });

    it('should request confirmation before rescheduling an appointment', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      const rescheduleToolCall = createMockToolCall('request_reschedule_appointment', {
        eventId: 'event-123',
        eventTitle: 'Team Meeting',
        newStartTime: '2025-10-21T16:00:00',
        newEndTime: '2025-10-21T17:00:00',
      });

      mockClient.chat.completions.create.mockResolvedValueOnce(
        createMockOpenAIResponse('', [rescheduleToolCall])
      );

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Reschedule to 4pm', 'test-chat-123');

      expect(response).toContain('reschedule');
      expect(response).toContain('Team Meeting');
      expect(pendingConfirmations.has('test-chat-123')).toBe(true);
    });

    it('should execute rescheduling after confirmation', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'reschedule',
        data: {
          eventId: 'event-123',
          eventTitle: 'Team Meeting',
          newStartTime: '2025-10-21T16:00:00',
          newEndTime: '2025-10-21T17:00:00',
        },
        messageText: 'Reschedule?',
      });

      vi.mocked(calendar.updateEvent).mockResolvedValueOnce({
        id: 'event-123',
      } as any);

      const response = await processMessage('yes', 'test-chat-123');

      expect(response).toContain('Rescheduled');
      expect(calendar.updateEvent).toHaveBeenCalledWith('event-123', {
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        attendeeEmails: undefined,
      });
      expect(pendingConfirmations.has('test-chat-123')).toBe(false);
    });
  });

  describe('Tool Calling Logic', () => {
    it('should call get_schedule tool for schedule requests', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      vi.mocked(calendar.listEvents).mockResolvedValueOnce([
        {
          id: 'event-1',
          summary: 'Meeting 1',
          start: { dateTime: '2025-10-21T10:00:00' },
          end: { dateTime: '2025-10-21T11:00:00' },
        },
      ] as any);

      const scheduleToolCall = createMockToolCall('get_schedule', {
        startDate: '2025-10-21T00:00:00',
        endDate: '2025-10-21T23:59:59',
      });

      mockClient.chat.completions.create
        .mockResolvedValueOnce(createMockOpenAIResponse('', [scheduleToolCall]))
        .mockResolvedValueOnce(createMockOpenAIResponse('You have 1 meeting today'));

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('What is my schedule today?', 'test-chat-123');

      expect(calendar.listEvents).toHaveBeenCalled();
      expect(response).toBeTruthy();
    });

    it('should call check_availability tool for availability checks', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      vi.mocked(calendar.checkAvailability).mockResolvedValueOnce(true);

      const availabilityToolCall = createMockToolCall('check_availability', {
        startTime: '2025-10-21T14:00:00',
        endTime: '2025-10-21T15:00:00',
      });

      mockClient.chat.completions.create
        .mockResolvedValueOnce(createMockOpenAIResponse('', [availabilityToolCall]))
        .mockResolvedValueOnce(createMockOpenAIResponse('Yes, that time is available'));

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Am I free at 2pm?', 'test-chat-123');

      expect(calendar.checkAvailability).toHaveBeenCalled();
      expect(response).toBeTruthy();
    });

    it('should call find_free_slots tool for finding available times', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      vi.mocked(calendar.findFreeSlots).mockResolvedValueOnce([
        { start: new Date('2025-10-21T10:00:00'), end: new Date('2025-10-21T11:00:00') },
        { start: new Date('2025-10-21T14:00:00'), end: new Date('2025-10-21T15:00:00') },
      ]);

      const freeSlotsToolCall = createMockToolCall('find_free_slots', {
        startDate: '2025-10-21T00:00:00',
        endDate: '2025-10-21T23:59:59',
        durationMinutes: 60,
      });

      mockClient.chat.completions.create
        .mockResolvedValueOnce(createMockOpenAIResponse('', [freeSlotsToolCall]))
        .mockResolvedValueOnce(createMockOpenAIResponse('Here are available times'));

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('When am I free tomorrow?', 'test-chat-123');

      expect(calendar.findFreeSlots).toHaveBeenCalled();
      expect(response).toBeTruthy();
    });

    it('should call search_events tool for finding specific events', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      vi.mocked(calendar.searchEvents).mockResolvedValueOnce([
        {
          id: 'gym-event',
          summary: 'Gym Session',
          start: { dateTime: '2025-10-21T06:00:00' },
          end: { dateTime: '2025-10-21T07:00:00' },
        },
      ] as any);

      const searchToolCall = createMockToolCall('search_events', {
        query: 'gym',
      });

      mockClient.chat.completions.create
        .mockResolvedValueOnce(createMockOpenAIResponse('', [searchToolCall]))
        .mockResolvedValueOnce(createMockOpenAIResponse('Found your gym session'));

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Find my gym appointment', 'test-chat-123');

      expect(calendar.searchEvents).toHaveBeenCalledWith('gym', undefined, undefined);
      expect(response).toBeTruthy();
    });

    it('should handle booking with attendees', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'book',
        data: {
          title: 'Client Meeting',
          startTime: '2025-10-21T14:00:00',
          endTime: '2025-10-21T15:00:00',
          attendeeEmails: ['client@example.com', 'colleague@example.com'],
        },
        messageText: 'Book with attendees?',
      });

      vi.mocked(calendar.createEvent).mockResolvedValueOnce({
        id: 'event-123',
        summary: 'Client Meeting',
      } as any);

      const response = await processMessage('yes', 'test-chat-123');

      expect(response).toContain('Booked');
      expect(response).toContain('invites');
      expect(calendar.createEvent).toHaveBeenCalledWith(
        'Client Meeting',
        expect.any(Date),
        expect.any(Date),
        undefined,
        ['client@example.com', 'colleague@example.com']
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle calendar API errors gracefully', async () => {
      pendingConfirmations.set('test-chat-123', {
        action: 'book',
        data: {
          title: 'Test Meeting',
          startTime: '2025-10-21T14:00:00',
          endTime: '2025-10-21T15:00:00',
        },
        messageText: 'Book?',
      });

      vi.mocked(calendar.createEvent).mockRejectedValueOnce(
        new Error('Calendar API error')
      );

      const response = await processMessage('yes', 'test-chat-123');

      expect(response).toContain('Sorry');
      expect(response).toContain('wrong');
    });

    it('should handle missing settings gracefully', async () => {
      mockStorage.getSettings.mockResolvedValueOnce(null);

      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();
      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Hello', 'test-chat-123');

      expect(response).toBeTruthy();
    });

    it('should handle OpenAI API errors', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      mockClient.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      (OpenAI.default as any).mockImplementation(() => mockClient);

      await expect(
        processMessage('Hello', 'test-chat-123')
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('Multi-turn Conversations', () => {
    it('should support multi-turn tool calling (search then cancel)', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      vi.mocked(calendar.searchEvents).mockResolvedValueOnce([
        {
          id: 'event-to-cancel',
          summary: 'Meeting to Cancel',
          start: { dateTime: '2025-10-21T14:00:00' },
          end: { dateTime: '2025-10-21T15:00:00' },
        },
      ] as any);

      // First turn: search for event
      const searchToolCall = createMockToolCall('search_events', {
        query: 'meeting',
      });

      // Second turn: request cancellation based on search results
      const cancelToolCall = createMockToolCall('request_cancel_appointment', {
        eventId: 'event-to-cancel',
        eventTitle: 'Meeting to Cancel',
        eventTime: '2025-10-21T14:00:00',
      });

      mockClient.chat.completions.create
        .mockResolvedValueOnce(createMockOpenAIResponse('', [searchToolCall]))
        .mockResolvedValueOnce(createMockOpenAIResponse('', [cancelToolCall]));

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('Cancel my meeting', 'test-chat-123');

      expect(calendar.searchEvents).toHaveBeenCalled();
      expect(response).toContain('cancel');
      expect(pendingConfirmations.has('test-chat-123')).toBe(true);
    });

    it('should limit tool calling turns to prevent infinite loops', async () => {
      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();

      // Always return a tool call (infinite loop scenario)
      const toolCall = createMockToolCall('get_schedule', {
        startDate: '2025-10-21T00:00:00',
        endDate: '2025-10-21T23:59:59',
      });

      vi.mocked(calendar.listEvents).mockResolvedValue([]);

      mockClient.chat.completions.create.mockResolvedValue(
        createMockOpenAIResponse('', [toolCall])
      );

      (OpenAI.default as any).mockImplementation(() => mockClient);

      const response = await processMessage('test', 'test-chat-123');

      // Should stop after maxTurns (5) and return empty or fallback response
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('Message Storage', () => {
    it('should retrieve conversation history', async () => {
      const conversationHistory = [
        {
          id: '1',
          phoneNumber: 'test-chat-123',
          messageContent: 'Previous message',
          sender: 'user',
          messageType: 'text',
          platform: 'telegram',
          timestamp: new Date(),
          processed: true,
          aiResponse: 'Previous response',
        },
      ];

      mockStorage.getMessagesByPhone.mockResolvedValueOnce(conversationHistory);

      const OpenAI = await import('openai');
      const mockClient = createMockOpenAIClient();
      (OpenAI.default as any).mockImplementation(() => mockClient);

      await processMessage('Hello', 'test-chat-123');

      expect(mockStorage.getMessagesByPhone).toHaveBeenCalledWith('test-chat-123', 10);
    });
  });
});
