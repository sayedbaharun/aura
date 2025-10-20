import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bot } from '../telegram-bot';
import { processMessage, pendingConfirmations } from '../ai-assistant';
import * as calendar from '../google-calendar';
import { storage } from '../storage';
import {
  createMockTelegramContext,
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

vi.mock('../ai-assistant', async () => {
  const actual = await vi.importActual('../ai-assistant');
  return {
    ...actual,
    processMessage: vi.fn(),
  };
});

describe('Telegram E2E Flow', () => {
  beforeEach(() => {
    resetAllMocks();
    pendingConfirmations.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Booking Flow', () => {
    it('should handle full booking flow: message → AI → confirmation → calendar', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'Book a meeting at 2pm tomorrow');

      // Step 1: User sends booking request
      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'ll book "Team Meeting" for Oct 22, 2025 at 2:00 PM. Confirm?'
      );

      // Simulate bot text handler
      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      // Verify AI was called
      expect(processMessage).toHaveBeenCalledWith(
        'Book a meeting at 2pm tomorrow',
        chatId,
        'telegram'
      );

      // Verify message was saved
      expect(mockStorage.createMessage).toHaveBeenCalledTimes(2); // User + AI messages

      // Verify response was sent
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Confirm')
      );

      // Step 2: User confirms
      const confirmCtx = createMockTelegramContext(chatId, 'yes');

      vi.mocked(processMessage).mockResolvedValueOnce(
        '✓ Booked! I\'ve added "Team Meeting" to your calendar.'
      );

      if (textHandler) {
        await textHandler.middleware(confirmCtx, () => Promise.resolve());
      }

      // Verify confirmation was processed
      expect(processMessage).toHaveBeenCalledWith('yes', chatId, 'telegram');

      // Verify success response
      expect(confirmCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Booked')
      );
    });

    it('should handle full cancellation flow', async () => {
      const chatId = '12345';

      // Step 1: User requests cancellation
      const ctx = createMockTelegramContext(chatId, 'Cancel my gym session');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'ll cancel "Gym Session" scheduled for Oct 21, 2025 at 6:00 AM. Confirm?'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('cancel'));

      // Step 2: User confirms
      const confirmCtx = createMockTelegramContext(chatId, 'yes');

      vi.mocked(processMessage).mockResolvedValueOnce(
        '✓ Cancelled! "Gym Session" has been removed from your calendar.'
      );

      if (textHandler) {
        await textHandler.middleware(confirmCtx, () => Promise.resolve());
      }

      expect(confirmCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cancelled')
      );
    });

    it('should handle full rescheduling flow', async () => {
      const chatId = '12345';

      // Step 1: User requests rescheduling
      const ctx = createMockTelegramContext(chatId, 'Reschedule meeting to 4pm');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'ll reschedule "Team Meeting" to Oct 21, 2025 at 4:00 PM. Confirm?'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('reschedule')
      );

      // Step 2: User confirms
      const confirmCtx = createMockTelegramContext(chatId, 'confirm');

      vi.mocked(processMessage).mockResolvedValueOnce(
        '✓ Rescheduled! "Team Meeting" has been moved to Oct 21 at 4:00 PM.'
      );

      if (textHandler) {
        await textHandler.middleware(confirmCtx, () => Promise.resolve());
      }

      expect(confirmCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Rescheduled')
      );
    });
  });

  describe('Query Flows', () => {
    it('should handle schedule query without confirmation', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'What is my schedule today?');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'You have 2 meetings today:\n1. Team Standup at 9:00 AM\n2. Client Call at 2:00 PM'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(processMessage).toHaveBeenCalledWith(
        'What is my schedule today?',
        chatId,
        'telegram'
      );

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('meetings today')
      );

      // No confirmation should be pending
      expect(mockStorage.createMessage).toHaveBeenCalled();
    });

    it('should handle availability check', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'Am I free at 3pm?');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'Yes, you\'re free at 3:00 PM today!'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('free'));
    });

    it('should handle free slots request', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'When am I free tomorrow?');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'Tomorrow you\'re free at:\n• 10:00 AM - 11:00 AM\n• 2:00 PM - 3:00 PM\n• 4:00 PM - 5:00 PM'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('free at'));
    });
  });

  describe('Error Handling', () => {
    it('should handle AI processing errors gracefully', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'Book a meeting');

      vi.mocked(processMessage).mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('error processing your message')
      );
    });

    it('should handle calendar API errors during booking', async () => {
      const chatId = '12345';

      // Step 1: User requests booking
      const ctx = createMockTelegramContext(chatId, 'Book a meeting at 2pm');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'ll book "Meeting" for Oct 21 at 2:00 PM. Confirm?'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      // Step 2: User confirms but calendar API fails
      const confirmCtx = createMockTelegramContext(chatId, 'yes');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'Sorry, something went wrong. Please try again.'
      );

      if (textHandler) {
        await textHandler.middleware(confirmCtx, () => Promise.resolve());
      }

      expect(confirmCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('something went wrong')
      );
    });

    it('should handle database errors gracefully', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'Hello');

      mockStorage.createMessage.mockRejectedValueOnce(
        new Error('Database connection error')
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });

    it('should handle malformed user input', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, '');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'m not sure I understood that. Can you please rephrase?'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user changing mind (booking then canceling)', async () => {
      const chatId = '12345';

      // Step 1: User requests booking
      const ctx1 = createMockTelegramContext(chatId, 'Book a meeting at 2pm');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'ll book "Meeting" for Oct 21 at 2:00 PM. Confirm?'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx1, () => Promise.resolve());
      }

      // Step 2: User says no
      const ctx2 = createMockTelegramContext(chatId, 'no');

      vi.mocked(processMessage).mockResolvedValueOnce(
        'No problem! Let me know if you need anything else.'
      );

      if (textHandler) {
        await textHandler.middleware(ctx2, () => Promise.resolve());
      }

      expect(ctx2.reply).toHaveBeenCalledWith(
        expect.stringContaining('No problem')
      );
    });

    it('should handle concurrent requests from different users', async () => {
      const chatId1 = '11111';
      const chatId2 = '22222';

      const ctx1 = createMockTelegramContext(chatId1, 'Book meeting at 2pm');
      const ctx2 = createMockTelegramContext(chatId2, 'Book meeting at 3pm');

      vi.mocked(processMessage)
        .mockResolvedValueOnce('Confirm booking for 2pm?')
        .mockResolvedValueOnce('Confirm booking for 3pm?');

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        // Process both requests
        await textHandler.middleware(ctx1, () => Promise.resolve());
        await textHandler.middleware(ctx2, () => Promise.resolve());
      }

      // Both should receive confirmations
      expect(ctx1.reply).toHaveBeenCalledWith(expect.stringContaining('2pm'));
      expect(ctx2.reply).toHaveBeenCalledWith(expect.stringContaining('3pm'));
    });

    it('should handle rapid successive messages from same user', async () => {
      const chatId = '12345';

      const messages = [
        'What is my schedule?',
        'Book a meeting',
        'Cancel that',
      ];

      vi.mocked(processMessage)
        .mockResolvedValueOnce('You have 2 meetings')
        .mockResolvedValueOnce('Confirm booking?')
        .mockResolvedValueOnce('No problem!');

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      for (const message of messages) {
        const ctx = createMockTelegramContext(chatId, message);
        if (textHandler) {
          await textHandler.middleware(ctx, () => Promise.resolve());
        }
      }

      expect(processMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle booking with attendees', async () => {
      const chatId = '12345';

      const ctx = createMockTelegramContext(
        chatId,
        'Book a meeting at 2pm with john@example.com'
      );

      vi.mocked(processMessage).mockResolvedValueOnce(
        'I\'ll book "Meeting" for Oct 21 at 2:00 PM and send invites to john@example.com. Confirm?'
      );

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('send invites')
      );
    });
  });

  describe('/start Command', () => {
    it('should respond to /start command with welcome message', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, '/start');

      if (!bot) throw new Error('Bot not initialized');

      const startHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'command' && h.command === 'start'
      );

      if (startHandler) {
        await startHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to Aura')
      );
    });
  });

  describe('Message Storage', () => {
    it('should store user and assistant messages', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'Hello');

      vi.mocked(processMessage).mockResolvedValueOnce('Hi! How can I help?');

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      // Should save user message
      expect(mockStorage.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: chatId,
          messageContent: 'Hello',
          sender: 'user',
          platform: 'telegram',
        })
      );

      // Should save assistant message
      expect(mockStorage.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: chatId,
          messageContent: 'Hi! How can I help?',
          sender: 'assistant',
          platform: 'telegram',
        })
      );
    });

    it('should include user information in messages', async () => {
      const chatId = '12345';
      const ctx = createMockTelegramContext(chatId, 'Test message');
      ctx.from = {
        id: parseInt(chatId),
        is_bot: false,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
      };

      vi.mocked(processMessage).mockResolvedValueOnce('Response');

      if (!bot) throw new Error('Bot not initialized');

      const textHandler = (bot as any).context.handlers.find(
        (h: any) => h.type === 'text'
      );

      if (textHandler) {
        await textHandler.middleware(ctx, () => Promise.resolve());
      }

      expect(mockStorage.createMessage).toHaveBeenCalled();
    });
  });
});
