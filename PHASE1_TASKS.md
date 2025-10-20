# AURA PHASE 1 - PRODUCTION READINESS TASKS

**Project:** Telegram Bot for CEO Calendar Management
**Priority:** Critical Security & Production Hardening
**Timeline:** 7-9 days to production-ready

---

## 🚨 CRITICAL SECURITY ISSUES (Priority 1 - BLOCKERS)

### 1. Telegram Access Control
**Status:** ❌ NOT IMPLEMENTED
**Severity:** CRITICAL - Anyone can use the bot
**File:** `server/telegram-bot.ts`

**Requirements:**
- [ ] Add authorized chat ID whitelist
- [ ] Create middleware to validate chat IDs before processing
- [ ] Add environment variable `AUTHORIZED_TELEGRAM_CHAT_IDS` (comma-separated)
- [ ] Return "Unauthorized" message for non-whitelisted users
- [ ] Log all unauthorized access attempts

**Implementation:**
```typescript
// Add to telegram-bot.ts
const AUTHORIZED_CHAT_IDS = (process.env.AUTHORIZED_TELEGRAM_CHAT_IDS || '')
  .split(',')
  .filter(Boolean);

bot.use((ctx, next) => {
  const chatId = ctx.chat?.id.toString();
  if (!chatId || !AUTHORIZED_CHAT_IDS.includes(chatId)) {
    console.warn(`Unauthorized access attempt from chat ID: ${chatId}`);
    return ctx.reply("⛔ Unauthorized. This is a private assistant.");
  }
  return next();
});
```

**Testing:**
- Test with authorized chat ID (should work)
- Test with random chat ID (should block)
- Verify logging works for unauthorized attempts

---

### 2. Rate Limiting
**Status:** ❌ NOT IMPLEMENTED
**Severity:** HIGH - Open to spam/abuse
**File:** `server/telegram-bot.ts`

**Requirements:**
- [ ] Install `express-rate-limit` package
- [ ] Add per-chat-ID rate limiting (10 requests per minute)
- [ ] Store rate limit state in memory (Map with TTL)
- [ ] Return friendly message when rate limit exceeded

**Implementation:**
```typescript
const chatRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(chatId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const limit = chatRateLimits.get(chatId);

  if (!limit || now > limit.resetAt) {
    chatRateLimits.set(chatId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}
```

**Testing:**
- Send 11 messages rapidly (11th should be blocked)
- Wait 60 seconds, verify counter resets

---

### 3. Audit Logging
**Status:** ❌ NOT IMPLEMENTED
**Severity:** HIGH - Can't track actions
**Files:** New table + logging throughout

**Requirements:**
- [ ] Create `audit_logs` table in schema
- [ ] Log all calendar operations (view, create, update, delete)
- [ ] Include: timestamp, chat_id, action, event_id, success/failure
- [ ] Create migration with `npm run db:push`

**Schema:**
```typescript
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: text("chat_id").notNull(),
  action: text("action").notNull(), // 'view_schedule', 'book', 'cancel', 'reschedule'
  eventId: text("event_id"),
  eventTitle: text("event_title"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
```

**Testing:**
- Book appointment, verify log entry
- Cancel appointment, verify log entry
- Check logs via dashboard or SQL query

---

## 🛠️ INFRASTRUCTURE IMPROVEMENTS (Priority 2 - CRITICAL)

### 4. Persistent Confirmation State
**Status:** ❌ IN-MEMORY (Lost on restart)
**Severity:** HIGH - User confirmations lost on server restart
**File:** `server/ai-assistant.ts:17`

**Current Problem:**
```typescript
export const pendingConfirmations: Map<string, PendingConfirmation> = new Map();
```

**Requirements:**
- [ ] Create `pending_confirmations` table
- [ ] Add TTL (expire after 5 minutes)
- [ ] Replace Map with database operations
- [ ] Add cleanup job to delete expired confirmations

**Schema:**
```typescript
export const pendingConfirmations = pgTable("pending_confirmations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: text("chat_id").notNull(),
  action: text("action").notNull(),
  data: jsonb("data").notNull(),
  messageText: text("message_text").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Testing:**
- Request booking, restart server, confirm (should still work)
- Wait 6 minutes after request, confirm (should be expired)

---

### 5. Structured Logging
**Status:** ❌ console.log only
**Severity:** MEDIUM - Can't debug production issues
**Files:** All server files

**Requirements:**
- [ ] Install `pino` or `winston` logger
- [ ] Replace all `console.log` with structured logger
- [ ] Add log levels (error, warn, info, debug)
- [ ] Include context (chatId, action, duration)
- [ ] Log to JSON format for parsing

**Implementation:**
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Usage
logger.info({ chatId, action: 'book_appointment' }, 'Processing booking request');
logger.error({ chatId, error }, 'Calendar API error');
```

**Testing:**
- Verify logs show in JSON format
- Check log levels work (debug disabled in production)

---

### 6. Health Check Endpoint
**Status:** ❌ NOT IMPLEMENTED
**Severity:** MEDIUM - Can't monitor uptime
**File:** `server/routes.ts`

**Requirements:**
- [ ] Add `/health` endpoint
- [ ] Check database connection
- [ ] Check OpenAI API status
- [ ] Check Google Calendar connectivity
- [ ] Return 200 if healthy, 503 if degraded

**Implementation:**
```typescript
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      openai: false,
      calendar: false,
    }
  };

  try {
    await storage.getSettings();
    health.checks.database = true;
  } catch (error) {
    health.status = 'degraded';
  }

  // Add similar checks for OpenAI and Calendar

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

**Testing:**
- Call `/health`, should return 200
- Stop database, call `/health`, should return 503

---

### 7. Error Recovery & Retry Logic
**Status:** ❌ Single-try, fail fast
**Severity:** MEDIUM - Transient errors cause failures
**Files:** `server/google-calendar.ts`, `server/ai-assistant.ts`

**Requirements:**
- [ ] Add retry logic for Google Calendar API calls (3 retries with exponential backoff)
- [ ] Add retry logic for OpenAI API calls
- [ ] Add circuit breaker for external APIs
- [ ] Log retry attempts

**Implementation:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = initialDelay * Math.pow(2, i);
      logger.warn({ attempt: i + 1, delay }, 'Retrying after error');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Testing:**
- Mock API failure, verify 3 retry attempts
- Verify exponential backoff timing

---

## ✅ TESTING (Priority 3 - REQUIRED FOR LAUNCH)

### 8. Unit Tests for AI Logic
**Status:** ❌ NO TESTS
**Severity:** MEDIUM - Can't verify logic changes
**Files:** New `server/__tests__/` directory

**Requirements:**
- [ ] Install Vitest testing framework
- [ ] Test confirmation workflow
- [ ] Test tool calling logic
- [ ] Test message parsing
- [ ] Mock OpenAI responses

**Test Cases:**
```typescript
describe('AI Assistant', () => {
  test('should request confirmation before booking', async () => {
    const response = await processMessage('Book meeting at 2pm', 'test-chat-id');
    expect(response).toContain('Confirm?');
    expect(pendingConfirmations.has('test-chat-id')).toBe(true);
  });

  test('should execute booking after confirmation', async () => {
    // Set up pending confirmation
    // Send "yes"
    // Verify calendar event created
  });
});
```

**Testing:**
- Run `npm test`, all tests pass
- Test coverage > 70% for critical paths

---

### 9. Integration Tests for Calendar
**Status:** ❌ NO TESTS
**Severity:** MEDIUM
**Files:** `server/__tests__/calendar.test.ts`

**Requirements:**
- [ ] Mock Google Calendar API
- [ ] Test CRUD operations
- [ ] Test availability checking
- [ ] Test search functionality

**Test Cases:**
```typescript
describe('Google Calendar', () => {
  test('should create event with attendees', async () => {
    const event = await createEvent(
      'Test Meeting',
      new Date('2025-10-21T14:00:00'),
      new Date('2025-10-21T15:00:00'),
      'Test description',
      ['test@example.com']
    );
    expect(event.attendees).toHaveLength(1);
  });
});
```

---

### 10. E2E Tests for Telegram Flow
**Status:** ❌ NO TESTS
**Severity:** LOW - Manual testing possible
**Files:** `server/__tests__/telegram-e2e.test.ts`

**Requirements:**
- [ ] Mock Telegram bot
- [ ] Test message → AI → confirmation → calendar flow
- [ ] Test error handling

---

## 🎯 SCOPE REDUCTION (Priority 4 - DEFER TO PHASE 2)

### 11. Disable WhatsApp Integration (Phase 2)
**Status:** ⚠️ IMPLEMENTED BUT NOT NEEDED
**Action:** Comment out or feature-flag

**Files to disable:**
- `server/twilio-whatsapp.ts`
- WhatsApp webhook routes in `server/routes.ts`
- WhatsApp settings in dashboard

---

### 12. Disable React Dashboard (Phase 2)
**Status:** ⚠️ IMPLEMENTED BUT NOT NEEDED
**Action:** Serve static placeholder page

**Rationale:**
- CEO will use Telegram only in Phase 1
- Dashboard can be added after bot is validated
- Reduces attack surface

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All Priority 1 tasks completed
- [ ] All Priority 2 tasks completed
- [ ] Critical tests passing
- [ ] Security review completed
- [ ] Environment variables documented

### Deployment Steps
1. [ ] Set `AUTHORIZED_TELEGRAM_CHAT_IDS` in Replit Secrets
2. [ ] Run `npm run db:push` for new tables
3. [ ] Deploy to production
4. [ ] Verify `/health` endpoint returns 200
5. [ ] Test with authorized chat ID
6. [ ] Monitor logs for errors

### Post-Deployment
- [ ] CEO tests basic flows (view, book, cancel)
- [ ] Monitor error rates for 24 hours
- [ ] Review audit logs
- [ ] Set up uptime monitoring (UptimeRobot or similar)

---

## 📊 TIMELINE ESTIMATE

| Task Group | Days | Priority |
|------------|------|----------|
| Critical Security (Tasks 1-3) | 2-3 | P1 |
| Infrastructure (Tasks 4-7) | 2 | P2 |
| Testing (Tasks 8-10) | 2 | P3 |
| Buffer for bugs | 1-2 | - |
| **TOTAL** | **7-9 days** | - |

---

## 🔧 ENVIRONMENT VARIABLES REQUIRED

Add to Replit Secrets:

```env
# Existing
DATABASE_URL=<postgresql-connection-string>
TELEGRAM_BOT_TOKEN=<bot-token>
AI_INTEGRATIONS_OPENAI_API_KEY=<openai-key>
AI_INTEGRATIONS_OPENAI_BASE_URL=<openai-url>

# NEW - Add these
AUTHORIZED_TELEGRAM_CHAT_IDS=<sayed-chat-id>  # Get from @userinfobot on Telegram
LOG_LEVEL=info                                 # debug|info|warn|error
RATE_LIMIT_MAX_REQUESTS=10                     # Requests per minute
RATE_LIMIT_WINDOW_MS=60000                     # 1 minute
```

---

## 📝 NOTES

### Getting Sayed's Telegram Chat ID
1. Have Sayed start a chat with @userinfobot on Telegram
2. Bot will reply with user ID
3. Add this ID to `AUTHORIZED_TELEGRAM_CHAT_IDS`

### Phase 1 Success Criteria
- ✅ Only authorized users can use bot
- ✅ All calendar actions logged
- ✅ System survives restarts without losing state
- ✅ Basic monitoring in place
- ✅ Critical path tests pass
- ✅ CEO can manage calendar via Telegram

### Phase 2 Roadmap (Post-Launch)
- Week 2: Add dashboard for viewing logs/history
- Week 3: Add smart scheduling rules
- Week 4: Add meeting intelligence features
- Week 5: Add WhatsApp if needed
