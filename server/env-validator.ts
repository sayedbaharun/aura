import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all required and optional environment variables at startup.
 * Fails fast with descriptive errors if critical variables are missing.
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ========================================
  // CRITICAL ENVIRONMENT VARIABLES (Required)
  // ========================================

  // Database
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required for database connection');
  } else if (!process.env.DATABASE_URL.startsWith('postgres://') && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://...)');
  }

  // OpenAI Integration
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    errors.push('AI_INTEGRATIONS_OPENAI_API_KEY is required for OpenAI integration');
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    errors.push('AI_INTEGRATIONS_OPENAI_BASE_URL is required for OpenAI integration');
  }

  // Replit Connectors (for Google Calendar OAuth)
  if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
    errors.push('REPLIT_CONNECTORS_HOSTNAME is required for Replit Connectors');
  }

  // Replit Identity Token (at least one required)
  if (!process.env.REPL_IDENTITY && !process.env.WEB_REPL_RENEWAL) {
    errors.push('Either REPL_IDENTITY or WEB_REPL_RENEWAL is required for authentication');
  }

  // Telegram Bot
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    errors.push('TELEGRAM_BOT_TOKEN is required for Telegram bot integration');
  } else if (!process.env.TELEGRAM_BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
    errors.push('TELEGRAM_BOT_TOKEN format is invalid (expected format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)');
  }

  if (!process.env.AUTHORIZED_TELEGRAM_CHAT_IDS) {
    errors.push('AUTHORIZED_TELEGRAM_CHAT_IDS is required for Telegram access control (comma-separated list of chat IDs)');
  }

  // Session Secret
  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is required for secure session management');
  } else if (process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET should be at least 32 characters for security');
  }

  // ========================================
  // OPTIONAL ENVIRONMENT VARIABLES (Warnings)
  // ========================================

  // Twilio (WhatsApp integration - optional)
  if (!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_AUTH_TOKEN) {
    warnings.push('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) not configured - WhatsApp integration disabled');
  } else if (!process.env.TWILIO_ACCOUNT_SID) {
    warnings.push('TWILIO_ACCOUNT_SID is missing - WhatsApp integration may not work');
  } else if (!process.env.TWILIO_AUTH_TOKEN) {
    warnings.push('TWILIO_AUTH_TOKEN is missing - WhatsApp integration may not work');
  }

  // PostgreSQL environment variables (should be set by Replit)
  const postgresVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  const missingPostgresVars = postgresVars.filter(v => !process.env[v]);
  if (missingPostgresVars.length > 0) {
    warnings.push(`PostgreSQL variables not set: ${missingPostgresVars.join(', ')} - using DATABASE_URL instead`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and exits process if critical errors are found.
 * Logs warnings but allows startup to continue.
 */
export function validateEnvironmentOrExit(): void {
  logger.info('Validating environment variables...');
  
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    result.warnings.forEach(warning => {
      logger.warn(`  ⚠ ${warning}`);
    });
  }

  // Check for errors
  if (!result.valid) {
    logger.error('Environment validation failed! Critical environment variables are missing or invalid:');
    result.errors.forEach(error => {
      logger.error(`  ✗ ${error}`);
    });
    logger.error('\nPlease configure the required environment variables in Replit Secrets and restart the application.');
    logger.error('Documentation: https://docs.replit.com/hosting/deployments/secrets-and-environment-variables');
    process.exit(1);
  }

  logger.info('✓ Environment validation passed');
}
