/**
 * Embeddings Service
 *
 * Generates text embeddings using OpenRouter API (OpenAI embeddings model).
 * Used for semantic search in RAG Level 2.
 */

import { logger } from "./logger";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_TOKENS = 8191;
const MAX_CHARS = MAX_INPUT_TOKENS * 4; // Rough estimate

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not set - required for embeddings");
  }

  // Truncate if too long
  const truncatedText = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
        "X-Title": "SB-OS RAG",
      },
      body: JSON.stringify({
        model: `openai/${EMBEDDING_MODEL}`,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.data?.[0]?.embedding) {
      throw new Error("Invalid embedding response structure");
    }

    return {
      embedding: data.data[0].embedding,
      model: EMBEDDING_MODEL,
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error({ error, textLength: text.length }, "Failed to generate embedding");
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not set - required for embeddings");
  }

  if (texts.length === 0) {
    return [];
  }

  // Process in batches of 20 (API limit)
  const batchSize = 20;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map(text =>
      text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
    );

    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
          "X-Title": "SB-OS RAG",
        },
        body: JSON.stringify({
          model: `openai/${EMBEDDING_MODEL}`,
          input: batch,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding batch API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid batch embedding response structure");
      }

      // Sort by index to maintain order
      const sortedData = [...data.data].sort((a, b) => a.index - b.index);

      for (const item of sortedData) {
        results.push({
          embedding: item.embedding,
          model: EMBEDDING_MODEL,
          tokensUsed: Math.ceil((data.usage?.total_tokens || 0) / batch.length),
        });
      }

      // Rate limiting: wait 100ms between batches
      if (i + batchSize < texts.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (error) {
      logger.error({ error, batchIndex: i, batchSize: batch.length }, "Failed to generate batch embeddings");
      throw error;
    }
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Parse embedding from JSON string (stored in DB)
 */
export function parseEmbedding(embeddingJson: string | null): number[] | null {
  if (!embeddingJson) return null;

  try {
    const parsed = JSON.parse(embeddingJson);
    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize embedding to JSON string for DB storage
 */
export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding);
}

/**
 * Get embedding dimensions
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}
