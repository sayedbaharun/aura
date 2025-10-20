import { vi } from 'vitest';

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.AI_INTEGRATIONS_OPENAI_API_KEY = 'test-key';
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = 'https://test.openai.com';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
