/**
 * Document Chunking Service
 *
 * Splits long documents into smaller chunks for embedding.
 * Uses semantic boundaries (paragraphs, headers) when possible.
 */

import type { Doc } from "@shared/schema";

export interface Chunk {
  content: string;
  startOffset: number;
  endOffset: number;
  metadata: {
    section?: string;
    headings?: string[];
    isCodeBlock?: boolean;
  };
}

// Chunking configuration
const CHUNK_SIZE = 1000; // Target characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks for context
const MIN_CHUNK_SIZE = 100; // Minimum chunk size
const MAX_CHUNK_SIZE = 2000; // Maximum chunk size

/**
 * Chunk a document into smaller pieces for embedding
 * Uses semantic boundaries (paragraphs, headers) when possible
 */
export function chunkDocument(doc: Doc): Chunk[] {
  // Get text content from doc
  const text = doc.body || (doc.content ? extractTextFromBlocks(doc.content) : '');

  if (!text || text.length < MIN_CHUNK_SIZE) {
    // Return single chunk for short documents
    return [{
      content: text || '',
      startOffset: 0,
      endOffset: text?.length || 0,
      metadata: {},
    }];
  }

  const chunks: Chunk[] = [];

  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  let currentStart = 0;
  let currentHeadings: string[] = [];
  let currentSection = '';
  let offset = 0;

  for (const para of paragraphs) {
    // Track markdown headers
    const headerMatch = para.match(/^(#{1,6})\s+(.+)$/m);
    if (headerMatch) {
      currentSection = headerMatch[2];
      currentHeadings = [headerMatch[2]];
    }

    // Check if this is a code block
    const isCodeBlock = para.startsWith('```') || para.match(/^\s{4,}/m);

    // Check if adding this paragraph exceeds chunk size
    const potentialLength = currentChunk.length + para.length + 2; // +2 for \n\n

    if (potentialLength > CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        startOffset: currentStart,
        endOffset: offset,
        metadata: {
          section: currentSection || undefined,
          headings: currentHeadings.length > 0 ? [...currentHeadings] : undefined,
        },
      });

      // Start new chunk with overlap
      if (CHUNK_OVERLAP > 0 && currentChunk.length > CHUNK_OVERLAP) {
        const overlapText = currentChunk.slice(-CHUNK_OVERLAP);
        currentChunk = overlapText + '\n\n' + para;
        currentStart = offset - CHUNK_OVERLAP;
      } else {
        currentChunk = para;
        currentStart = offset;
      }
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }

    offset += para.length + 2; // +2 for \n\n separator

    // If chunk is getting too large, force a split
    if (currentChunk.length > MAX_CHUNK_SIZE) {
      chunks.push({
        content: currentChunk.trim(),
        startOffset: currentStart,
        endOffset: offset,
        metadata: {
          section: currentSection || undefined,
          headings: currentHeadings.length > 0 ? [...currentHeadings] : undefined,
          isCodeBlock: isCodeBlock || undefined,
        },
      });
      currentChunk = '';
      currentStart = offset;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      startOffset: currentStart,
      endOffset: offset,
      metadata: {
        section: currentSection || undefined,
        headings: currentHeadings.length > 0 ? [...currentHeadings] : undefined,
      },
    });
  }

  return chunks;
}

/**
 * Extract text from BlockNote JSON content
 */
export function extractTextFromBlocks(content: unknown): string {
  if (!Array.isArray(content)) return '';

  const texts: string[] = [];

  function processBlock(block: unknown): void {
    if (typeof block !== 'object' || block === null) return;

    const b = block as Record<string, unknown>;

    // Extract text from content array
    if (Array.isArray(b.content)) {
      for (const item of b.content) {
        if (typeof item === 'object' && item !== null) {
          const i = item as Record<string, unknown>;
          if (i.type === 'text' && typeof i.text === 'string') {
            texts.push(i.text);
          }
        }
      }
    }

    // Handle block type for formatting
    if (b.type === 'heading') {
      const level = (b.props as Record<string, unknown>)?.level || 1;
      texts.push('\n' + '#'.repeat(level as number) + ' ');
    } else if (b.type === 'paragraph') {
      texts.push('\n\n');
    } else if (b.type === 'bulletListItem') {
      texts.push('\n- ');
    } else if (b.type === 'numberedListItem') {
      texts.push('\n1. ');
    } else if (b.type === 'codeBlock') {
      texts.push('\n```\n');
    }

    // Handle nested children
    if (Array.isArray(b.children)) {
      for (const child of b.children) {
        processBlock(child);
      }
    }
  }

  for (const block of content) {
    processBlock(block);
  }

  return texts.join('').trim();
}

/**
 * Get the text that should be used for embedding a document
 * Prioritizes structured fields over raw content
 */
export function getDocEmbeddingText(doc: Doc): string {
  const parts: string[] = [];

  // Title is always included
  parts.push(doc.title);

  // Structured fields (highest priority for embeddings)
  if (doc.summary) {
    parts.push(doc.summary);
  }

  if (doc.keyPoints && Array.isArray(doc.keyPoints) && doc.keyPoints.length > 0) {
    parts.push('Key points: ' + (doc.keyPoints as string[]).join('. '));
  }

  if (doc.applicableWhen) {
    parts.push('Applicable when: ' + doc.applicableWhen);
  }

  // Tags
  if (doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0) {
    parts.push('Tags: ' + (doc.tags as string[]).join(', '));
  }

  // Body content (truncated if too long)
  const bodyText = doc.body || (doc.content ? extractTextFromBlocks(doc.content) : '');
  if (bodyText) {
    // Limit body to ~3000 chars to stay within embedding limits
    const truncatedBody = bodyText.length > 3000 ? bodyText.slice(0, 3000) + '...' : bodyText;
    parts.push(truncatedBody);
  }

  return parts.join('\n\n');
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Check if a document needs chunking
 */
export function needsChunking(doc: Doc): boolean {
  const text = doc.body || (doc.content ? extractTextFromBlocks(doc.content) : '');
  return text.length > CHUNK_SIZE * 1.5;
}
