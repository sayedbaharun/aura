import { logger } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Retry a function with exponential backoff
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the successful function call
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 10000, // 10 seconds
    backoffMultiplier = 2,
    shouldRetry = () => true
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt or we shouldn't retry, throw
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message
        },
        `Retrying after error (attempt ${attempt + 1}/${maxRetries})`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Determines if an error is retryable (network/transient errors)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'EAI_AGAIN') {
    return true;
  }

  // HTTP 5xx errors (server errors)
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // Rate limit errors (429)
  if (error.response?.status === 429) {
    return true;
  }

  // Specific OpenAI errors that are retryable
  if (error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('ECONNREFUSED')) {
    return true;
  }

  return false;
}

/**
 * Retry specifically for OpenAI API calls
 */
export async function retryOpenAI<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError
  });
}

/**
 * Retry specifically for Google Calendar API calls
 */
export async function retryGoogleAPI<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError
  });
}
