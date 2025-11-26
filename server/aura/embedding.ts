/**
 * Embedding Service
 *
 * Generates vector embeddings using OpenAI's text-embedding-3-small model
 * via OpenRouter API. These embeddings are used for semantic search in Aura.
 */

import OpenAI from 'openai';

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
 * Generate embedding for a single text string
 *
 * @param text - Text to embed
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of texts to embed
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Chunk text into smaller pieces for embedding
 *
 * Splits long text into ~500 token chunks with overlap for better context.
 * Useful for long documents, notes, etc.
 *
 * @param text - Text to chunk
 * @param chunkSize - Target size in characters (~500 tokens = ~2000 chars)
 * @param overlap - Overlap between chunks in characters
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = 2000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];

  if (text.length <= chunkSize) {
    return [text];
  }

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += chunkSize - overlap;
  }

  return chunks;
}
