/**
 * File Extraction Service
 *
 * Extracts text and metadata from various file types:
 * - PDFs: Uses pdf-parse for text extraction
 * - Images: Uses GPT-4o Vision for OCR
 * - Text files: Direct text reading
 */

import OpenAI from "openai";
import { createRequire } from "module";
import { logger } from "./logger";

// pdf-parse doesn't support ESM, so we need to use require
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Initialize OpenRouter with OpenAI-compatible API
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
    "X-Title": "SB-OS",
  },
});

export interface FileExtractionResult {
  extractedText: string;
  summary?: string;
  tags?: string[];
  metadata: {
    confidence: "high" | "medium" | "low";
    noteType?: "task" | "idea" | "meeting_notes" | "reference" | "general";
    hasActionItems?: boolean;
    keyTopics?: string[];
    entities?: string[];
    pageCount?: number;
    processingModel?: string;
    processingTime?: number;
  };
}

/**
 * Determine file type category from MIME type
 */
function getFileCategory(mimeType: string): "pdf" | "image" | "text" | "unsupported" {
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return "text";
  }
  return "unsupported";
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<FileExtractionResult> {
  const startTime = Date.now();

  try {
    const data = await pdfParse(buffer);
    const extractedText = data.text.trim();

    // If we have significant text, generate AI summary
    let summary: string | undefined;
    let tags: string[] = [];
    let metadata: FileExtractionResult["metadata"] = {
      confidence: extractedText.length > 100 ? "high" : "medium",
      pageCount: data.numpages,
      processingTime: Date.now() - startTime,
    };

    // Generate AI analysis if text is substantial
    if (extractedText.length > 200) {
      try {
        const analysis = await analyzeTextWithAI(extractedText);
        summary = analysis.summary;
        tags = analysis.tags;
        metadata = { ...metadata, ...analysis.metadata };
      } catch (error) {
        logger.warn({ error }, "Failed to analyze PDF with AI, continuing with raw text");
      }
    }

    return {
      extractedText,
      summary,
      tags,
      metadata,
    };
  } catch (error) {
    logger.error({ error }, "Failed to extract text from PDF");
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from an image using GPT-4o Vision
 */
export async function extractTextFromImage(
  imageData: string | Buffer,
  mimeType: string
): Promise<FileExtractionResult> {
  const startTime = Date.now();

  try {
    // Convert buffer to base64 data URL if needed
    let imageUrl: string;
    if (Buffer.isBuffer(imageData)) {
      const base64 = imageData.toString("base64");
      imageUrl = `data:${mimeType};base64,${base64}`;
    } else if (imageData.startsWith("data:") || imageData.startsWith("http")) {
      imageUrl = imageData;
    } else {
      // Assume it's base64 without prefix
      imageUrl = `data:${mimeType};base64,${imageData}`;
    }

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert document analyzer. Extract all text from images and provide intelligent metadata.

Your task:
1. Extract ALL visible text from the image accurately
2. Provide a concise summary (2-3 sentences)
3. Suggest relevant tags (3-7 keywords)
4. Determine the document type
5. Identify key topics and any named entities (people, companies, products)
6. Detect if there are action items or tasks

Respond in JSON format with this structure:
{
  "extractedText": "all visible text...",
  "summary": "brief summary...",
  "tags": ["tag1", "tag2"],
  "noteType": "task|idea|meeting_notes|reference|general",
  "hasActionItems": boolean,
  "keyTopics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "confidence": "high|medium|low"
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text and analyze this document image.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4o Vision");
    }

    const result = JSON.parse(content);

    return {
      extractedText: result.extractedText || "",
      summary: result.summary,
      tags: Array.isArray(result.tags) ? result.tags : [],
      metadata: {
        confidence: result.confidence || "medium",
        noteType: result.noteType || "general",
        hasActionItems: result.hasActionItems || false,
        keyTopics: result.keyTopics || [],
        entities: result.entities || [],
        processingModel: "openai/gpt-4o",
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    logger.error({ error }, "Failed to extract text from image");
    throw new Error(`Image OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Analyze text content with AI to generate summary, tags, and metadata
 */
async function analyzeTextWithAI(text: string): Promise<{
  summary: string;
  tags: string[];
  metadata: Partial<FileExtractionResult["metadata"]>;
}> {
  // Truncate very long text to stay within token limits
  const truncatedText = text.length > 15000 ? text.substring(0, 15000) + "\n\n[... text truncated ...]" : text;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini", // Use faster model for text analysis
    messages: [
      {
        role: "system",
        content: `You are an expert document analyzer. Analyze the provided text and extract key information.

Respond in JSON format with this structure:
{
  "summary": "2-3 sentence summary of the document",
  "tags": ["tag1", "tag2", "tag3"] (3-7 relevant keywords),
  "noteType": "task|idea|meeting_notes|reference|general",
  "hasActionItems": boolean,
  "keyTopics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"] (people, companies, products mentioned)
}`
      },
      {
        role: "user",
        content: `Analyze this document:\n\n${truncatedText}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI analysis");
  }

  const result = JSON.parse(content);

  return {
    summary: result.summary || "",
    tags: Array.isArray(result.tags) ? result.tags : [],
    metadata: {
      noteType: result.noteType || "general",
      hasActionItems: result.hasActionItems || false,
      keyTopics: result.keyTopics || [],
      entities: result.entities || [],
      processingModel: "openai/gpt-4o-mini",
    },
  };
}

/**
 * Extract text from a plain text file
 */
export function extractTextFromTextFile(buffer: Buffer): FileExtractionResult {
  const extractedText = buffer.toString("utf-8").trim();

  return {
    extractedText,
    metadata: {
      confidence: "high",
      processingTime: 0,
    },
  };
}

/**
 * Main extraction function - routes to appropriate handler based on MIME type
 */
export async function extractFromFile(
  fileData: Buffer | string,
  mimeType: string,
  options: {
    generateSummary?: boolean;
    fileName?: string;
  } = {}
): Promise<FileExtractionResult> {
  const category = getFileCategory(mimeType);
  const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData, "base64");

  logger.info({ mimeType, category, fileSize: buffer.length, fileName: options.fileName }, "Starting file extraction");

  switch (category) {
    case "pdf":
      return extractTextFromPDF(buffer);

    case "image":
      return extractTextFromImage(buffer, mimeType);

    case "text":
      const result = extractTextFromTextFile(buffer);
      // Optionally analyze with AI
      if (options.generateSummary && result.extractedText.length > 200) {
        try {
          const analysis = await analyzeTextWithAI(result.extractedText);
          return {
            ...result,
            summary: analysis.summary,
            tags: analysis.tags,
            metadata: { ...result.metadata, ...analysis.metadata },
          };
        } catch (error) {
          logger.warn({ error }, "Failed to analyze text with AI");
        }
      }
      return result;

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Re-analyze an existing file with AI (on-demand analysis)
 */
export async function reanalyzeFile(
  extractedText: string,
  options: {
    prompt?: string; // Custom analysis prompt
    detailed?: boolean; // More detailed analysis
  } = {}
): Promise<{
  summary: string;
  tags: string[];
  analysis?: string;
  metadata: Partial<FileExtractionResult["metadata"]>;
}> {
  const startTime = Date.now();

  const truncatedText = extractedText.length > 15000
    ? extractedText.substring(0, 15000) + "\n\n[... text truncated ...]"
    : extractedText;

  const systemPrompt = options.prompt
    ? `You are an expert document analyzer. ${options.prompt}\n\nRespond in JSON format.`
    : `You are an expert document analyzer. Provide a detailed analysis.

${options.detailed ? "Provide an in-depth analysis including:" : "Provide a concise analysis including:"}
1. Summary (${options.detailed ? "comprehensive" : "2-3 sentences"})
2. Key tags/keywords (5-10)
3. Main topics covered
4. Notable entities (people, companies, products)
5. Action items (if any)
${options.detailed ? "6. Key insights and recommendations" : ""}

Respond in JSON format with this structure:
{
  "summary": "...",
  "tags": ["tag1", "tag2"],
  "keyTopics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "hasActionItems": boolean,
  "actionItems": ["item1", "item2"],
  ${options.detailed ? '"analysis": "detailed analysis text...",' : ""}
  "noteType": "task|idea|meeting_notes|reference|general"
}`;

  const response = await openai.chat.completions.create({
    model: options.detailed ? "openai/gpt-4o" : "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this document:\n\n${truncatedText}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: options.detailed ? 2000 : 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI analysis");
  }

  const result = JSON.parse(content);

  return {
    summary: result.summary || "",
    tags: Array.isArray(result.tags) ? result.tags : [],
    analysis: result.analysis,
    metadata: {
      noteType: result.noteType || "general",
      hasActionItems: result.hasActionItems || false,
      keyTopics: result.keyTopics || [],
      entities: result.entities || [],
      processingModel: options.detailed ? "openai/gpt-4o" : "openai/gpt-4o-mini",
      processingTime: Date.now() - startTime,
    },
  };
}

/**
 * Supported MIME types for file uploads
 */
export const SUPPORTED_MIME_TYPES = [
  // Documents
  "application/pdf",

  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",

  // Text files
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
  "application/xml",
];

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

/**
 * Get max file size for a MIME type (in bytes)
 */
export function getMaxFileSize(mimeType: string): number {
  if (mimeType === "application/pdf") {
    return 50 * 1024 * 1024; // 50MB for PDFs
  }
  if (mimeType.startsWith("image/")) {
    return 20 * 1024 * 1024; // 20MB for images
  }
  return 10 * 1024 * 1024; // 10MB for other files
}
