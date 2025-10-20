import { vi } from 'vitest';
import type OpenAI from 'openai';

// Mock Google Calendar API responses
export const mockGoogleCalendarEvent = {
  id: 'test-event-123',
  summary: 'Test Meeting',
  description: 'Test description',
  start: {
    dateTime: '2025-10-21T14:00:00+04:00',
    timeZone: 'Asia/Dubai',
  },
  end: {
    dateTime: '2025-10-21T15:00:00+04:00',
    timeZone: 'Asia/Dubai',
  },
  attendees: [{ email: 'test@example.com', responseStatus: 'needsAction' }],
  status: 'confirmed',
  htmlLink: 'https://calendar.google.com/event?eid=test',
};

export const mockGoogleCalendarEvents = [
  mockGoogleCalendarEvent,
  {
    ...mockGoogleCalendarEvent,
    id: 'test-event-456',
    summary: 'Another Meeting',
    start: {
      dateTime: '2025-10-21T16:00:00+04:00',
      timeZone: 'Asia/Dubai',
    },
    end: {
      dateTime: '2025-10-21T17:00:00+04:00',
      timeZone: 'Asia/Dubai',
    },
  },
];

// Mock Google Calendar client
export function createMockGoogleCalendarClient() {
  return {
    events: {
      list: vi.fn().mockResolvedValue({ data: { items: mockGoogleCalendarEvents } }),
      insert: vi.fn().mockResolvedValue({ data: mockGoogleCalendarEvent }),
      patch: vi.fn().mockResolvedValue({ data: mockGoogleCalendarEvent }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    },
    freebusy: {
      query: vi.fn().mockResolvedValue({
        data: {
          calendars: {
            primary: {
              busy: [],
            },
          },
        },
      }),
    },
  };
}

// Mock OpenAI API responses
export function createMockOpenAIResponse(
  content: string,
  toolCalls?: OpenAI.Chat.ChatCompletionMessageToolCall[]
): OpenAI.Chat.ChatCompletion {
  return {
    id: 'test-completion-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
          tool_calls: toolCalls,
        },
        finish_reason: toolCalls ? 'tool_calls' : 'stop',
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}

// Mock OpenAI tool call
export function createMockToolCall(
  functionName: string,
  args: Record<string, any>
): OpenAI.Chat.ChatCompletionMessageToolCall {
  return {
    id: `call-${Date.now()}`,
    type: 'function',
    function: {
      name: functionName,
      arguments: JSON.stringify(args),
    },
  };
}

// Mock OpenAI client
export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(
          createMockOpenAIResponse('Hello! How can I help you?')
        ),
      },
    },
  };
}

// Mock storage functions
export const mockStorage = {
  getSettings: vi.fn().mockResolvedValue({
    assistantName: 'Aura',
    userName: 'Test User',
    timezone: 'Asia/Dubai',
    workingHours: '9 AM - 5 PM',
    defaultMeetingDuration: 60,
    preferences: 'Test preferences',
  }),
  getMessagesByPhone: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn().mockResolvedValue({ id: 'test-message-123' }),
  createAppointment: vi.fn().mockResolvedValue({ id: 'test-appointment-123' }),
};

// Mock Telegram context
export function createMockTelegramContext(chatId: string, messageText: string) {
  return {
    chat: {
      id: parseInt(chatId),
      type: 'private' as const,
    },
    message: {
      message_id: 123,
      text: messageText,
      date: Date.now(),
      chat: {
        id: parseInt(chatId),
        type: 'private' as const,
      },
      from: {
        id: parseInt(chatId),
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      },
    },
    from: {
      id: parseInt(chatId),
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    },
    reply: vi.fn().mockResolvedValue({}),
    telegram: {
      setWebhook: vi.fn().mockResolvedValue(true),
      deleteWebhook: vi.fn().mockResolvedValue(true),
    },
  };
}

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Reset all mocks
export function resetAllMocks() {
  vi.clearAllMocks();
  mockStorage.getSettings.mockResolvedValue({
    assistantName: 'Aura',
    userName: 'Test User',
    timezone: 'Asia/Dubai',
    workingHours: '9 AM - 5 PM',
    defaultMeetingDuration: 60,
    preferences: 'Test preferences',
  });
  mockStorage.getMessagesByPhone.mockResolvedValue([]);
  mockStorage.createMessage.mockResolvedValue({ id: 'test-message-123' });
  mockStorage.createAppointment.mockResolvedValue({ id: 'test-appointment-123' });
}
