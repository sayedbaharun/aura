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
    const domainLabel = domain ? DOMAIN_LABELS[domain] || domain : "";

    const ideaContext = `
BUSINESS IDEA:
- Name: ${name}
- Description: ${description}
${domain ? `- Domain: ${domainLabel}` : ""}
${targetCustomer ? `- Target Customer: ${targetCustomer}` : ""}
${initialThoughts ? `- Initial Hypotheses: ${initialThoughts}` : ""}
`.trim();

    // System prompt using the lean skeleton
    const systemPrompt = `You are a venture analyst. Your task is to create a CUSTOMIZED research prompt for ${provider === "gemini" ? "Google Gemini" : "Perplexity"} to evaluate a business idea for commercial feasibility.

The prompt you generate must be SPECIFICALLY TAILORED to this idea. You must:

1. ANALYZE the idea to identify:
   - The specific industry and sub-segment
   - Likely competitors (name actual companies)
   - Relevant business models for this space
   - Regulatory considerations specific to this domain
   - Technical/operational requirements

2. CUSTOMIZE each section to ask POINTED questions:
   - Name specific competitors to research (not "find competitors")
   - Ask for metrics relevant to THIS business type
   - Probe THIS customer segment specifically
   - Consider risks unique to THIS industry

The prompt must follow this exact structure:

---
Act as a venture analyst.
Evaluate [IDEA NAME] strictly for commercial feasibility.
${provider === "perplexity" ? "Include sources and citations for all data points." : ""}

[Brief description of the idea]

Produce:

1. **Problem Definition**
   [Customized questions about who feels this pain and how badly]

2. **Target Buyer with Budget**
   [Customized questions about who pays, budget authority, willingness to pay]

3. **Market Demand Signals**
   [Customized questions about specific evidence: searches, forums, spending patterns relevant to THIS idea]

4. **Competitive Landscape**
   [Name 3-5 SPECIFIC competitors to research for THIS idea]

5. **Differentiation Angle**
   [Customized questions about what would make THIS idea defensible]

6. **Revenue Model + Unit Economics**
   [Customized questions about pricing, CAC, LTV relevant to THIS business type]

7. **Distribution Path to First 100 Customers**
   [Customized questions about specific channels for THIS customer segment]

8. **Regulatory/Compliance Risks**
   [Customized questions about specific regulations for THIS industry]

9. **AI Leverage Opportunities**
   [Customized questions about how AI could provide advantages for THIS specific business]

10. **Top 3 Failure Modes**
    [Customized questions about what could kill THIS specific business]

**Verdict:** GO / NO-GO / NEEDS VALIDATION
One-line reasoning.
---

CRITICAL RULES:
- Output ONLY the research prompt. No intro, no conclusion, no meta-commentary.
- Start directly with "Act as a venture analyst."
- End with the verdict format. Nothing after.
- Make every section SPECIFIC to this idea - no generic questions.`;

    const userPrompt = `${ideaContext}

Generate the customized research prompt for ${provider === "gemini" ? "Gemini" : "Perplexity"}.`;

    // Call OpenRouter API
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
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

  const sourceNote = provider === "perplexity"
    ? "Include sources and citations for all data points."
    : "";

  return `Act as a venture analyst.
Evaluate "${name}" strictly for commercial feasibility.
${sourceNote}

**The Idea:** ${description}
${domainLabel ? `**Domain:** ${domainLabel}` : ""}
${targetCustomer ? `**Target Customer:** ${targetCustomer}` : ""}
${initialThoughts ? `**Hypothesis:** ${initialThoughts}` : ""}

Produce:

1. **Problem Definition**
   - Who feels this pain? How badly? (severity 1-10)
   - What triggers them to seek a solution?
   - How are they solving it today?

2. **Target Buyer with Budget**
   - Who specifically pays for this? (job title, company size)
   - Do they have budget authority?
   - What do they currently spend on alternatives?

3. **Market Demand Signals**
   - Search volume for related terms
   - Active communities/forums discussing this problem
   - Evidence of spending (existing products, services, workarounds)

4. **Competitive Landscape**
   - Direct competitors (name specific companies)
   - Indirect competitors and alternatives
   - What's their pricing, positioning, and weaknesses?

5. **Differentiation Angle**
   - What would make this defensible?
   - Is there a unique insight or unfair advantage?
   - Why wouldn't an incumbent just copy this?

6. **Revenue Model + Unit Economics**
   - Best revenue model for this space (subscription, transaction, etc.)
   - Realistic pricing based on alternatives
   - Estimated CAC and LTV potential

7. **Distribution Path to First 100 Customers**
   - Specific channels to reach this customer
   - What's the sales motion? (self-serve, sales-led, PLG)
   - Where do these customers already congregate?

8. **Regulatory/Compliance Risks**
   - Industry-specific regulations
   - Data privacy considerations
   - Licensing or certification requirements

9. **AI Leverage Opportunities**
   - Where could AI provide 10x improvement?
   - What manual processes could be automated?
   - Competitive moat from AI capabilities?

10. **Top 3 Failure Modes**
    - What kills this business?
    - Key assumptions that must be true
    - External risks (market, technology, regulation)

**Verdict:** GO / NO-GO / NEEDS VALIDATION
One-line reasoning.`;
}

export default router;
