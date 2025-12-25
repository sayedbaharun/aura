/**
 * Embedding Jobs - Background Processor
 *
 * Processes documents to generate embeddings for RAG search.
 * Runs as a background job to avoid blocking the main request thread.
 */

import cron from 'node-cron';
import { storage } from './storage';
import { logger } from './logger';
import { generateEmbedding, generateEmbeddings, serializeEmbedding } from './embeddings';
import { chunkDocument, getDocEmbeddingText, needsChunking, type Chunk } from './chunking';
import type { Doc } from '@shared/schema';

// Configuration
const BATCH_SIZE = 10; // Process 10 docs at a time
const PROCESS_INTERVAL_MS = 60000; // 1 minute between batches
const MAX_RETRIES = 3;

// Track processing state
let isProcessing = false;
let lastProcessedAt: Date | null = null;
let totalProcessed = 0;
let totalErrors = 0;

/**
 * Process a single document - generate embedding and optionally chunk
 */
async function processDocument(doc: Doc): Promise<{
  success: boolean;
  chunksCreated: number;
  error?: string;
}> {
  try {
    // Get text for embedding
    const text = getDocEmbeddingText(doc);
    if (!text || text.length < 10) {
      logger.debug({ docId: doc.id, title: doc.title }, 'Skipping doc with no content');
      return { success: true, chunksCreated: 0 };
    }

    // Generate embedding for the full document
    const result = await generateEmbedding(text);
    await storage.updateDocEmbedding(
      doc.id,
      serializeEmbedding(result.embedding),
      result.model
    );

    let chunksCreated = 0;

    // Check if document needs chunking (long docs)
    if (needsChunking(doc)) {
      // Delete existing chunks first
      await storage.deleteDocChunks(doc.id);

      // Generate chunks
      const chunks = chunkDocument(doc);

      // Generate embeddings for all chunks
      if (chunks.length > 0) {
        const chunkTexts = chunks.map(c => c.content);
        const chunkEmbeddings = await generateEmbeddings(chunkTexts);

        // Create chunk records with embeddings
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = chunkEmbeddings[i];

          await storage.createDocChunk({
            docId: doc.id,
            chunkIndex: i,
            content: chunk.content,
            embedding: serializeEmbedding(embedding.embedding),
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            metadata: chunk.metadata,
          });
          chunksCreated++;
        }
      }
    }

    logger.debug({
      docId: doc.id,
      title: doc.title,
      chunksCreated,
      tokensUsed: result.tokensUsed,
    }, 'Successfully processed document');

    return { success: true, chunksCreated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, docId: doc.id, title: doc.title }, 'Failed to process document');
    return { success: false, chunksCreated: 0, error: errorMessage };
  }
}

/**
 * Process a batch of documents
 */
async function processBatch(): Promise<{
  processed: number;
  errors: number;
  chunksCreated: number;
}> {
  if (isProcessing) {
    logger.debug('Embedding job already running, skipping');
    return { processed: 0, errors: 0, chunksCreated: 0 };
  }

  isProcessing = true;
  let processed = 0;
  let errors = 0;
  let chunksCreated = 0;

  try {
    // Get docs that need embedding
    const docs = await storage.getDocsNeedingEmbedding(BATCH_SIZE);

    if (docs.length === 0) {
      logger.debug('No documents need embedding');
      return { processed: 0, errors: 0, chunksCreated: 0 };
    }

    logger.info({ count: docs.length }, 'Processing batch of documents for embedding');

    // Process each document
    for (const doc of docs) {
      const result = await processDocument(doc);

      if (result.success) {
        processed++;
        chunksCreated += result.chunksCreated;
      } else {
        errors++;
      }

      // Small delay between docs to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    totalProcessed += processed;
    totalErrors += errors;
    lastProcessedAt = new Date();

    logger.info({
      processed,
      errors,
      chunksCreated,
      totalProcessed,
      totalErrors,
    }, 'Completed embedding batch');

  } catch (error) {
    logger.error({ error }, 'Embedding batch processing failed');
  } finally {
    isProcessing = false;
  }

  return { processed, errors, chunksCreated };
}

/**
 * Force process all pending documents
 */
export async function processAllPending(): Promise<{
  processed: number;
  errors: number;
  chunksCreated: number;
}> {
  let totalProcessed = 0;
  let totalErrors = 0;
  let totalChunks = 0;

  // Process in batches until done
  let hasMore = true;
  while (hasMore) {
    const result = await processBatch();
    totalProcessed += result.processed;
    totalErrors += result.errors;
    totalChunks += result.chunksCreated;

    // Check if there are more docs to process
    const remaining = await storage.getDocsNeedingEmbedding(1);
    hasMore = remaining.length > 0;

    // Delay between batches
    if (hasMore) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return {
    processed: totalProcessed,
    errors: totalErrors,
    chunksCreated: totalChunks,
  };
}

/**
 * Get embedding job status
 */
export function getJobStatus(): {
  isProcessing: boolean;
  lastProcessedAt: Date | null;
  totalProcessed: number;
  totalErrors: number;
} {
  return {
    isProcessing,
    lastProcessedAt,
    totalProcessed,
    totalErrors,
  };
}

/**
 * Trigger immediate processing of a specific document
 */
export async function processDocumentNow(docId: string): Promise<{
  success: boolean;
  chunksCreated: number;
  error?: string;
}> {
  const doc = await storage.getDoc(docId);
  if (!doc) {
    return { success: false, chunksCreated: 0, error: 'Document not found' };
  }
  return processDocument(doc);
}

/**
 * Schedule background embedding processing
 * Runs every 5 minutes to process pending documents
 */
export function scheduleEmbeddingJobs(): void {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await processBatch();
    } catch (error) {
      logger.error({ error }, 'Scheduled embedding job failed');
    }
  });

  // Also run on startup (after 30 seconds to let server warm up)
  setTimeout(async () => {
    try {
      await processBatch();
    } catch (error) {
      logger.error({ error }, 'Initial embedding job failed');
    }
  }, 30000);

  logger.info('Embedding jobs scheduled (runs every 5 minutes)');
}

/**
 * Manually trigger a batch process
 */
export async function triggerBatch(): Promise<{
  processed: number;
  errors: number;
  chunksCreated: number;
}> {
  return processBatch();
}
