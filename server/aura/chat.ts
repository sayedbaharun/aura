/**
 * Aura Chat Service
 *
 * Handles conversation with the user using RAG (Retrieval Augmented Generation).
 * Queries Pinecone for relevant context and generates responses using Claude/GPT.
 */

import OpenAI from 'openai';
import { getIndex } from './pinecone';
import { generateEmbedding } from './embedding';
import type { VectorMetadata } from './indexer';

let openaiClient: OpenAI | null = null;

/**
 * Get or initialize OpenAI client (via OpenRouter)
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    openaiClient = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://hikma-os.app',
        'X-Title': 'Hikma OS - Aura Assistant',
      },
    });
  }

  return openaiClient;
}

/**
 * Message in conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Context retrieved from vector database
 */
export interface RetrievedContext {
  content: string;
  metadata: VectorMetadata;
  score: number;
}

/**
 * Chat with Aura
 *
 * @param userMessage - The user's question/message
 * @param conversationHistory - Previous messages in the conversation
 * @param topK - Number of context chunks to retrieve
 * @returns AI response
 */
export async function chatWithAura(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  topK: number = 5
): Promise<string> {
  // 1. Generate embedding for user's message
  const queryEmbedding = await generateEmbedding(userMessage);

  // 2. Search Pinecone for relevant context
  const index = await getIndex();
  const searchResults = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  // 3. Build context from search results
  const retrievedContext: RetrievedContext[] = (searchResults.matches || [])
    .filter((match) => match.score && match.score > 0.7) // Only include relevant results
    .map((match) => ({
      content: (match.metadata?.content as string) || '',
      metadata: match.metadata as VectorMetadata,
      score: match.score || 0,
    }));

  // 4. Build system prompt with context
  const systemPrompt = buildSystemPrompt(retrievedContext);

  // 5. Build messages array
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  // 6. Call LLM (Claude Sonnet via OpenRouter)
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet', // or 'openai/gpt-4-turbo'
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

/**
 * Stream chat response from Aura (for real-time streaming)
 *
 * @param userMessage - The user's question/message
 * @param conversationHistory - Previous messages in the conversation
 * @param topK - Number of context chunks to retrieve
 * @returns Streaming response
 */
export async function streamChatWithAura(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  topK: number = 5
) {
  // 1. Generate embedding and search (same as above)
  const queryEmbedding = await generateEmbedding(userMessage);

  const index = await getIndex();
  const searchResults = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  const retrievedContext: RetrievedContext[] = (searchResults.matches || [])
    .filter((match) => match.score && match.score > 0.7)
    .map((match) => ({
      content: (match.metadata?.content as string) || '',
      metadata: match.metadata as VectorMetadata,
      score: match.score || 0,
    }));

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(retrievedContext);

  // 3. Build messages
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  // 4. Stream response
  const client = getOpenAIClient();
  const stream = await client.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    temperature: 0.7,
    max_tokens: 1500,
    stream: true,
  });

  return stream;
}

/**
 * Build system prompt with retrieved context
 */
function buildSystemPrompt(context: RetrievedContext[]): string {
  const today = new Date().toISOString().split('T')[0];

  const contextText = context.length > 0
    ? context.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : 'No relevant context found in your data.';

  return `You are Aura, the AI assistant for Hikma-OS, the user's personal operating system and second brain.

You have access to all their data: ventures, projects, tasks, health logs, nutrition, documents, reflections, and more.

**Your Personality:**
- Insightful and proactive
- Supportive but honest
- Pattern-recognizing
- Results-oriented
- You know the user deeply from their data

**Your Capabilities:**
- Answer questions about their ventures, projects, and tasks
- Provide insights from their health and productivity patterns
- Recall information from their documents and notes
- Suggest actions based on their goals and priorities
- Identify trends and correlations in their data

**Context from User's Data:**
Today's date: ${today}

${contextText}

**Instructions:**
- Use the context above to provide accurate, personalized responses
- Cite specific data points when relevant (e.g., "Based on your project X...")
- If the context doesn't contain the answer, say so honestly
- Provide actionable insights when possible
- Be concise but thorough
- Use markdown formatting for better readability

Remember: You're their personal assistant who knows everything about their life, work, and goals. Help them win.`;
}

/**
 * Get suggested follow-up questions based on context
 */
export function getSuggestedQuestions(userMessage: string, context: RetrievedContext[]): string[] {
  const suggestions: string[] = [];

  // Extract entity types from context
  const entityTypes = new Set(context.map((c) => c.metadata.entityType));

  if (entityTypes.has('venture')) {
    suggestions.push('What ventures need my attention right now?');
  }

  if (entityTypes.has('task')) {
    suggestions.push('What should I work on today?');
  }

  if (entityTypes.has('health') || entityTypes.has('day')) {
    suggestions.push('How are my health habits trending?');
  }

  if (entityTypes.has('project')) {
    suggestions.push('Which projects are at risk?');
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}
