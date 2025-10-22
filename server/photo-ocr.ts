import OpenAI from "openai";

// Initialize OpenAI with Replit AI Integrations credentials
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface PhotoOCRResult {
  extractedText: string;
  confidence: "high" | "medium" | "low";
  noteType: "task" | "idea" | "meeting_note" | "general";
  suggestedTags: string[];
  hasActionItems: boolean;
}

/**
 * Extracts text and metadata from photos using GPT-4 Vision
 * @param imageUrl - URL of the image to process (can be Telegram file URL or object storage URL)
 * @returns Structured OCR result with extracted text and metadata
 */
export async function extractTextFromPhoto(imageUrl: string): Promise<PhotoOCRResult> {

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an OCR assistant that extracts text from images and provides intelligent metadata.
          
Your task:
1. Extract all visible text from the image
2. Determine the note type (task, idea, meeting_note, or general)
3. Suggest relevant tags (2-5 keywords)
4. Detect if there are action items or tasks

Be accurate and concise. Focus on capturing the essence of the content.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this image and provide metadata."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4 Vision");
    }

    // Parse the JSON response
    const result = JSON.parse(content);

    // Validate and structure the response
    return {
      extractedText: result.extractedText || result.text || "",
      confidence: result.confidence || "medium",
      noteType: validateNoteType(result.noteType || result.type),
      suggestedTags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      hasActionItems: result.hasActionItems || result.hasActions || false
    };
  } catch (error) {
    console.error("Photo OCR error:", error);
    throw new Error(`Failed to extract text from photo: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Validates and normalizes note type
 */
function validateNoteType(type: string | undefined | null): "task" | "idea" | "meeting_note" | "general" {
  // Guard against undefined/null - default to "general"
  if (!type) {
    return "general";
  }

  const validTypes = ["task", "idea", "meeting_note", "general"];
  const normalized = type.toLowerCase().replace(/[_\s-]+/g, "_");
  
  if (validTypes.includes(normalized)) {
    return normalized as "task" | "idea" | "meeting_note" | "general";
  }
  
  return "general";
}
