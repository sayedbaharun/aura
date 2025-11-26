/**
 * Pinecone Client Configuration
 *
 * Manages connection to Pinecone vector database for Aura AI assistant.
 * Stores embeddings of all user data (tasks, docs, ventures, health, etc.)
 * for semantic search and context retrieval.
 */

import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

/**
 * Get or initialize Pinecone client
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }

    pineconeClient = new Pinecone({
      apiKey,
    });
  }

  return pineconeClient;
}

/**
 * Get Pinecone index for Hikma-OS data
 */
export async function getIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'hikma-os';

  return client.index(indexName);
}

/**
 * Initialize Pinecone index if it doesn't exist
 *
 * Creates a 1536-dimension index (matches OpenAI text-embedding-3-small)
 * with cosine similarity metric for semantic search.
 */
export async function initializePineconeIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'hikma-os';

  try {
    // Check if index exists
    const indexes = await client.listIndexes();
    const indexExists = indexes.indexes?.some((index) => index.name === indexName);

    if (!indexExists) {
      console.log(`Creating Pinecone index: ${indexName}`);

      await client.createIndex({
        name: indexName,
        dimension: 1536, // OpenAI text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      console.log(`✅ Pinecone index "${indexName}" created successfully`);
    } else {
      console.log(`✅ Pinecone index "${indexName}" already exists`);
    }
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw error;
  }
}
