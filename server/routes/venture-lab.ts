/**
 * Venture Lab Routes
 * AI-powered business idea research and validation
 */
import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { logger } from "../logger";

const router = Router();

// Rate limiter for AI endpoints - 10 requests per minute
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: "Too many prompt generation requests",
    message: "Please wait a moment before generating another prompt.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const session = (req as any).session;
    return session?.userId || req.ip || "anonymous";
  },
  validate: { xForwardedForHeader: false },
});

// Input validation schema
const generatePromptSchema = z.object({
  name: z.string().min(1, "Idea name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  domain: z.string().optional(),
  targetCustomer: z.string().optional(),
  initialThoughts: z.string().optional(),
  provider: z.enum(["gemini", "perplexity"]).default("gemini"),
});

// Domain labels for context
const DOMAIN_LABELS: Record<string, string> = {
  saas: "SaaS / Software",
  media: "Media / Content",
  ecommerce: "E-commerce / Retail",
  services: "Services / Consulting",
  marketplace: "Marketplace / Platform",
  fintech: "Fintech / Finance",
  healthtech: "Healthtech / Wellness",
  edtech: "Edtech / Education",
  realty: "Real Estate",
  other: "Other",
};

/**
 * Generate an intelligent, customized research prompt using AI
 * POST /api/venture-lab/generate-prompt
 */
router.post("/generate-prompt", aiRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = generatePromptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.errors,
      });
    }

    const { name, description, domain, targetCustomer, initialThoughts, provider } = parsed.data;

    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      // Fall back to template-based prompt if no AI available
      return res.json({
        prompt: generateFallbackPrompt(parsed.data),
        method: "template",
        message: "AI service not configured - using template-based prompt",
      });
    }

    // Build context for the AI to understand the idea
    const domainLabel = domain ? DOMAIN_LABELS[domain] || domain : "Unknown";

    const ideaContext = `
BUSINESS IDEA TO RESEARCH:
- Name: ${name}
- Description: ${description}
${domain ? `- Domain/Industry: ${domainLabel}` : ""}
${targetCustomer ? `- Target Customer: ${targetCustomer}` : ""}
${initialThoughts ? `- Initial Hypotheses: ${initialThoughts}` : ""}
`.trim();

    // System prompt for the AI to generate a customized research prompt
    const systemPrompt = `You are a strategic business analyst and venture researcher. Your task is to create a CUSTOMIZED research prompt for an external AI (${provider === "gemini" ? "Google Gemini" : "Perplexity"}) to thoroughly research a business idea.

The research prompt you generate must be SPECIFICALLY TAILORED to this particular idea - not a generic template. You should:

1. ANALYZE the idea to understand:
   - What industry/domain it's in
   - Who the likely competitors would be (name specific companies to research)
   - What business models typically work in this space
   - What regulatory or compliance issues might apply
   - What technical requirements are likely needed

2. CUSTOMIZE the research questions to:
   - Ask about SPECIFIC competitors relevant to this idea (don't just say "competitors" - name them)
   - Request data relevant to THIS market (e.g., if it's SaaS, ask about SaaS metrics like MRR, churn, CAC)
   - Probe the specific pain points this solution addresses
   - Explore the specific customer segment mentioned
   - Consider the unique risks and barriers for THIS type of business

3. FORMAT the prompt so ${provider === "gemini" ? "Gemini" : "Perplexity"} will return structured, actionable insights${provider === "perplexity" ? " with sources and citations" : ""}.

The output should be a complete, ready-to-use research prompt that the user can copy and paste directly into ${provider === "gemini" ? "Gemini" : "Perplexity"}.

IMPORTANT: Do NOT generate a generic prompt. The prompt must show that you UNDERSTAND what this specific business is about and ask POINTED questions that will validate or invalidate this specific opportunity.`;

    const userPrompt = `${ideaContext}

Generate a customized research prompt for ${provider === "gemini" ? "Gemini" : "Perplexity"} to thoroughly research this business idea. The prompt should be comprehensive and specifically tailored to this idea, not generic.

The research prompt should help the user make a GO/NO-GO decision by covering:
1. Market validation specific to this idea
2. Named competitors to research
3. Business model analysis for this type of business
4. Go-to-market strategies relevant to this space
5. Execution requirements for this specific idea
6. Risks specific to this industry/approach
7. An opportunity scoring framework
8. Clear recommendation criteria

Make the prompt detailed and specific. Include instructions for the AI to structure its response in a format that can be saved to a knowledge base.`;

    // Call OpenRouter API
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o", // Using a strong model for prompt generation
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const generatedPrompt = completion.choices[0]?.message?.content;

    if (!generatedPrompt) {
      throw new Error("No response from AI");
    }

    res.json({
      prompt: generatedPrompt,
      method: "ai",
      model: "openai/gpt-4o",
      tokensUsed: completion.usage?.total_tokens,
      ideaAnalysis: {
        name,
        domain: domainLabel,
        provider,
      },
    });
  } catch (error: any) {
    logger.error({ error }, "Error generating intelligent prompt");

    // Provide helpful error messages
    if (error.message?.includes("401") || error.message?.includes("invalid_api_key")) {
      return res.status(503).json({
        error: "AI service configuration error",
        message: "Please check your OpenRouter API key configuration.",
      });
    }

    if (error.message?.includes("429")) {
      return res.status(429).json({
        error: "AI service rate limited",
        message: "Too many requests. Please try again in a moment.",
      });
    }

    res.status(500).json({
      error: "Failed to generate prompt",
      message: error.message || "An unexpected error occurred",
    });
  }
});

/**
 * Fallback template-based prompt generator (when AI is not available)
 */
function generateFallbackPrompt(idea: z.infer<typeof generatePromptSchema>): string {
  const { name, description, domain, targetCustomer, initialThoughts, provider } = idea;
  const domainLabel = domain ? DOMAIN_LABELS[domain] || domain : "";

  const providerNote = provider === "perplexity"
    ? "Please include sources and links where possible. Use your web search capabilities to find current data."
    : "Please provide thorough analysis based on your knowledge. Where you reference specific data or trends, note the source if known.";

  return `# Venture Research Request: ${name}

## Context
I'm evaluating a business idea and need comprehensive research to make a GO/NO-GO decision. ${providerNote}

## The Idea
**Name:** ${name}
**Description:** ${description}
${domain ? `**Domain:** ${domainLabel}` : ""}
${targetCustomer ? `**Target Customer:** ${targetCustomer}` : ""}
${initialThoughts ? `**Initial Thoughts:** ${initialThoughts}` : ""}

---

## Research Required

Please provide detailed research on the following areas. Structure your response with clear markdown headers.

### 1. Problem & Market Validation
- Is this a real problem that people/businesses actively pay to solve?
- What is the market size? (Provide TAM/SAM/SOM estimates with sources)
- Who is the ideal customer profile?
- What are the primary pain points and how are they currently addressed?

### 2. Competitive Landscape
- Who are the direct competitors?
- Who are indirect competitors?
- What are the market gaps and opportunities?
- What would differentiate a new entrant?

### 3. Business Model Analysis
- What revenue models work in this space?
- What are typical pricing benchmarks?
- What are the unit economics like?
- Is the revenue recurring or one-time?

### 4. Go-to-Market Intelligence
- How do successful players acquire customers?
- What distribution channels work best?
- What marketing approaches work?
- What is typical customer acquisition cost?

### 5. Execution Requirements
- What's needed to build an MVP?
- What key skills or team members are required?
- What's a realistic timeline to first revenue?
- What are the operational complexities?

### 6. Risk Assessment
- What are the barriers to entry?
- What are the key risks and mitigations?
- Are there regulatory or legal considerations?
- What market timing factors are relevant?

### 7. Opportunity Scorecard
Rate 1-10 for each:
- Market Attractiveness
- Competition Intensity
- Execution Feasibility
- Revenue Potential
- Timing & Urgency
- Overall Opportunity Score

### 8. Recommendation
**Decision:** [GO / NO-GO / NEEDS MORE RESEARCH]

**Key Reasons:**
1. [Primary reason]
2. [Secondary reason]
3. [Third reason]

**If GO - Suggested First Steps**

**If NO-GO - What Would Change This?**

---

Please structure your response in clean markdown with headers as shown above.`;
}

export default router;
