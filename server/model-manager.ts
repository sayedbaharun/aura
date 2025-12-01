import OpenAI from "openai";
import { logger } from "./logger";

// Initialize OpenRouter with OpenAI-compatible API
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
    "X-Title": "SB-OS",
  },
});

// Model configuration with fallback cascade (OpenRouter model names)
export const MODEL_CASCADE = [
  { name: "openai/gpt-4o", maxRetries: 2, description: "Primary - Best quality" },
  { name: "openai/gpt-4o-mini", maxRetries: 2, description: "Fallback 1 - Fast and efficient" },
  { name: "anthropic/claude-3.5-sonnet", maxRetries: 1, description: "Fallback 2 - Reliable alternative" },
] as const;

// Available models for selection in UI (via OpenRouter)
export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "Most capable, best for complex reasoning" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", description: "Fast and efficient, good for most tasks" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", description: "Excellent reasoning and coding" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", description: "Fastest Claude model" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google", description: "Long context, multimodal" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta", description: "Open source, strong performance" },
] as const;

// Task complexity classification for smart model selection
export type TaskComplexity = "simple" | "moderate" | "complex";

export interface ModelMetrics {
  modelUsed: string;
  attemptNumber: number;
  totalAttempts: number;
  success: boolean;
  errorMessage?: string;
  tokensUsed?: number;
  latencyMs: number;
}

export interface ChatCompletionParams {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  tools?: OpenAI.Chat.ChatCompletionTool[];
  tool_choice?: OpenAI.Chat.ChatCompletionToolChoiceOption;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

/**
 * Determine optimal model based on task complexity
 */
export function selectModelForTask(complexity: TaskComplexity): string {
  switch (complexity) {
    case "simple":
      // Use faster, cheaper model for simple tasks (categorization, summaries)
      return "openai/gpt-4o-mini";
    case "moderate":
      // Use balanced model for typical tasks
      return "openai/gpt-4o-mini";
    case "complex":
      // Use most capable model for complex reasoning (multi-step planning, analysis)
      return "openai/gpt-4o";
    default:
      return "openai/gpt-4o";
  }
}

/**
 * Multi-model chat completion with automatic fallback
 * Tries models in cascade order until success or all fail
 * @param params - Chat completion parameters
 * @param complexity - Task complexity for model selection (ignored if preferredModel is set)
 * @param preferredModel - Optional specific model to use (bypasses complexity-based selection)
 */
export async function chatCompletion(
  params: ChatCompletionParams,
  complexity: TaskComplexity = "complex",
  preferredModel?: string,
): Promise<{
  response: OpenAI.Chat.ChatCompletion;
  metrics: ModelMetrics;
}> {
  // Use preferred model if specified, otherwise select based on complexity
  const selectedModel = preferredModel || selectModelForTask(complexity);
  const startIndex = MODEL_CASCADE.findIndex((m) => m.name === selectedModel);

  // Build cascade: if preferred model is in cascade, reorder to start with it
  // If not in cascade (custom model), prepend it to the cascade with default retries
  let orderedCascade: Array<{ name: string; maxRetries: number; description: string }>;
  if (startIndex >= 0) {
    orderedCascade = [
      ...MODEL_CASCADE.slice(startIndex),
      ...MODEL_CASCADE.slice(0, startIndex),
    ];
  } else if (preferredModel) {
    // Custom model not in cascade - try it first, then fall back to default cascade
    orderedCascade = [
      { name: preferredModel, maxRetries: 2, description: "Custom preferred model" },
      ...MODEL_CASCADE,
    ];
  } else {
    orderedCascade = [...MODEL_CASCADE];
  }

  let lastError: Error | null = null;
  let totalAttempts = 0;

  // Try each model in the cascade
  for (const modelConfig of orderedCascade) {
    const { name: model, maxRetries } = modelConfig;

    // Try this model with retries
    for (let retry = 0; retry <= maxRetries; retry++) {
      totalAttempts++;
      const startTime = Date.now();

      try {
        logger.info({
          model,
          attempt: retry + 1,
          maxRetries: maxRetries + 1,
          totalAttempts,
          complexity,
        }, `Attempting chat completion with ${model}`);

        const response = await openai.chat.completions.create({
          model,
          messages: params.messages,
          tools: params.tools,
          tool_choice: params.tool_choice,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens,
          response_format: params.response_format,
        });

        const latencyMs = Date.now() - startTime;

        logger.info({
          model,
          tokensUsed: response.usage?.total_tokens,
          latencyMs,
          finishReason: response.choices[0]?.finish_reason,
        }, `✅ Chat completion successful with ${model}`);

        return {
          response,
          metrics: {
            modelUsed: model,
            attemptNumber: retry + 1,
            totalAttempts,
            success: true,
            tokensUsed: response.usage?.total_tokens,
            latencyMs,
          },
        };
      } catch (error: any) {
        lastError = error;
        const latencyMs = Date.now() - startTime;

        logger.warn({
          model,
          attempt: retry + 1,
          maxRetries: maxRetries + 1,
          error: error.message,
          errorType: error.constructor.name,
          latencyMs,
        }, `❌ Chat completion failed with ${model}`);

        // Check if it's a rate limit or server error (worth retrying)
        const isRetryable = 
          error.status === 429 || // Rate limit
          error.status === 500 || // Server error
          error.status === 503 || // Service unavailable
          error.code === 'ECONNRESET' || // Connection reset
          error.code === 'ETIMEDOUT'; // Timeout

        if (!isRetryable || retry === maxRetries) {
          // Don't retry this model anymore
          break;
        }

        // Exponential backoff before retry
        const backoffMs = Math.min(1000 * Math.pow(2, retry), 10000);
        logger.info({ backoffMs }, `Waiting before retry...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All models failed
  const errorMessage = lastError?.message || "All models failed";
  logger.error({
    totalAttempts,
    modelsAttempted: orderedCascade.map(m => m.name),
    lastError: errorMessage,
  }, `🚨 All model fallbacks exhausted`);

  // Return error metrics
  throw new Error(`All AI models failed after ${totalAttempts} attempts: ${errorMessage}`);
}

/**
 * Streaming chat completion with fallback
 * Similar to chatCompletion but for streaming responses
 */
export async function chatCompletionStream(
  params: ChatCompletionParams,
  complexity: TaskComplexity = "complex",
): Promise<{
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  metrics: Omit<ModelMetrics, "latencyMs" | "tokensUsed">;
}> {
  const preferredModel = selectModelForTask(complexity);
  const startIndex = MODEL_CASCADE.findIndex((m) => m.name === preferredModel);
  
  const orderedCascade = [
    ...MODEL_CASCADE.slice(startIndex),
    ...MODEL_CASCADE.slice(0, startIndex),
  ];

  let lastError: Error | null = null;
  let totalAttempts = 0;

  for (const modelConfig of orderedCascade) {
    const { name: model, maxRetries } = modelConfig;

    for (let retry = 0; retry <= maxRetries; retry++) {
      totalAttempts++;

      try {
        logger.info({
          model,
          attempt: retry + 1,
          maxRetries: maxRetries + 1,
          complexity,
        }, `Attempting streaming completion with ${model}`);

        const stream = await openai.chat.completions.create({
          model,
          messages: params.messages,
          tools: params.tools,
          tool_choice: params.tool_choice,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens,
          stream: true,
        });

        logger.info({ model }, `✅ Streaming started with ${model}`);

        return {
          stream,
          metrics: {
            modelUsed: model,
            attemptNumber: retry + 1,
            totalAttempts,
            success: true,
          },
        };
      } catch (error: any) {
        lastError = error;

        logger.warn({
          model,
          attempt: retry + 1,
          error: error.message,
        }, `❌ Streaming failed with ${model}`);

        const isRetryable = 
          error.status === 429 ||
          error.status === 500 ||
          error.status === 503;

        if (!isRetryable || retry === maxRetries) {
          break;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, retry), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  const errorMessage = lastError?.message || "All models failed";
  logger.error({
    totalAttempts,
    lastError: errorMessage,
  }, `🚨 All streaming model fallbacks exhausted`);

  throw new Error(`All AI models failed for streaming after ${totalAttempts} attempts: ${errorMessage}`);
}

/**
 * Helper: Get current model status (for monitoring/debugging)
 */
export function getModelCascadeInfo() {
  return MODEL_CASCADE.map((model) => ({
    name: model.name,
    description: model.description,
    maxRetries: model.maxRetries,
  }));
}
