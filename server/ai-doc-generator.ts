import { db } from "../db";
import { docAiExamples, docAiPatterns, docAiTeachings } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface GenerateFieldOptions {
  content: string;
  field: 'summary' | 'keyPoints' | 'applicableWhen';
  docType: string;
  docDomain?: string;
  ventureId?: string;
}

interface GenerateFieldResult {
  suggestion: string;
  promptHash: string;
  model: string;
}

export class AiDocGenerator {
  private openrouterApiKey: string;

  constructor() {
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
  }

  // Get best examples for this context
  async getTopExamples(opts: {
    field: string;
    docType: string;
    docDomain?: string;
    limit?: number;
  }): Promise<Array<{ contentExcerpt: string; goldOutput: string }>> {
    const limit = opts.limit || 3;

    // Build conditions
    const conditions = [
      eq(docAiExamples.fieldName, opts.field),
      eq(docAiExamples.isActive, true),
    ];

    if (opts.docType) {
      conditions.push(eq(docAiExamples.docType, opts.docType));
    }

    if (opts.docDomain) {
      conditions.push(eq(docAiExamples.docDomain, opts.docDomain));
    }

    const examples = await db
      .select({
        contentExcerpt: docAiExamples.contentExcerpt,
        goldOutput: docAiExamples.goldOutput,
      })
      .from(docAiExamples)
      .where(and(...conditions))
      .orderBy(
        desc(docAiExamples.successRate),
        desc(docAiExamples.qualityScore)
      )
      .limit(limit);

    return examples;
  }

  // Get learned patterns (positive and negative)
  async getLearnedPatterns(opts: {
    field: string;
    docType: string;
    docDomain?: string;
  }): Promise<{ positive: string[]; negative: string[] }> {
    const conditions = [
      eq(docAiPatterns.fieldName, opts.field),
      eq(docAiPatterns.isActive, true),
    ];

    if (opts.docType) {
      conditions.push(eq(docAiPatterns.docType, opts.docType));
    }

    if (opts.docDomain) {
      conditions.push(eq(docAiPatterns.docDomain, opts.docDomain));
    }

    const patterns = await db
      .select()
      .from(docAiPatterns)
      .where(and(...conditions));

    const positive: string[] = [];
    const negative: string[] = [];

    patterns.forEach(p => {
      if (p.patternType === 'positive' && p.pattern) {
        positive.push(p.pattern);
      } else if (p.patternType === 'negative' && p.pattern) {
        negative.push(p.pattern);
      }
    });

    return { positive, negative };
  }

  // Get direct teachings
  async getTeachings(opts: {
    field: string;
    docType: string;
    docDomain?: string;
    ventureId?: string;
  }): Promise<string[]> {
    const conditions = [
      eq(docAiTeachings.fieldName, opts.field),
      eq(docAiTeachings.isActive, true),
    ];

    if (opts.docType) {
      conditions.push(eq(docAiTeachings.docType, opts.docType));
    }

    if (opts.docDomain) {
      conditions.push(eq(docAiTeachings.docDomain, opts.docDomain));
    }

    if (opts.ventureId) {
      conditions.push(eq(docAiTeachings.ventureId, opts.ventureId));
    }

    const teachings = await db
      .select()
      .from(docAiTeachings)
      .where(and(...conditions));

    return teachings
      .map(t => t.content)
      .filter((c): c is string => c !== null);
  }

  // Build the dynamic prompt
  async buildPrompt(opts: GenerateFieldOptions): Promise<string> {
    const examples = await this.getTopExamples({
      field: opts.field,
      docType: opts.docType,
      docDomain: opts.docDomain,
      limit: 3
    });

    const patterns = await this.getLearnedPatterns({
      field: opts.field,
      docType: opts.docType,
      docDomain: opts.docDomain
    });

    const teachings = await this.getTeachings({
      field: opts.field,
      docType: opts.docType,
      docDomain: opts.docDomain,
      ventureId: opts.ventureId
    });

    // Build prompt with field-specific instructions
    let fieldInstructions = '';
    switch (opts.field) {
      case 'summary':
        fieldInstructions = 'Write a 1-3 sentence summary that captures what this document is about and its main purpose.';
        break;
      case 'keyPoints':
        fieldInstructions = 'Extract 3-5 key points as a JSON array of strings. Each point should be a concise, actionable insight.';
        break;
      case 'applicableWhen':
        fieldInstructions = 'Describe when and in what context someone should use this document. Be specific about the situations or triggers.';
        break;
    }

    return `You are extracting structured metadata from documentation.

## Your Task
${fieldInstructions}

## Document Type: ${opts.docType}
${opts.docDomain ? `## Domain: ${opts.docDomain}` : ''}

${patterns.positive.length > 0 ? `## What Works Well (from user feedback)
${patterns.positive.map(p => `✓ ${p}`).join('\n')}` : ''}

${patterns.negative.length > 0 ? `## What To Avoid (from user feedback)
${patterns.negative.map(p => `✗ ${p}`).join('\n')}` : ''}

${teachings.length > 0 ? `## Direct Instructions
${teachings.map(t => `- ${t}`).join('\n')}` : ''}

${examples.length > 0 ? `## Examples of Good Output
${examples.map((ex, i) => `
### Example ${i + 1}
Content: "${ex.contentExcerpt.slice(0, 300)}..."
Output: ${ex.goldOutput}
`).join('\n')}` : ''}

## Document Content
${opts.content.slice(0, 4000)}

## Your Output
Provide only the ${opts.field}, nothing else.${opts.field === 'keyPoints' ? ' Format as a JSON array of strings.' : ''}`;
  }

  // Generate a hash of the prompt for tracking
  generatePromptHash(prompt: string): string {
    // Simple hash - in production use crypto
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // Call OpenRouter API to generate the field
  async generateField(opts: GenerateFieldOptions): Promise<GenerateFieldResult> {
    const prompt = await this.buildPrompt(opts);
    const promptHash = this.generatePromptHash(prompt);
    const model = 'anthropic/claude-3-haiku'; // Fast and cheap for extraction

    if (!this.openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openrouterApiKey}`,
        'HTTP-Referer': 'https://sb-os.app',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3, // Low temperature for consistency
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      suggestion,
      promptHash,
      model,
    };
  }

  // Calculate edit distance as percentage (0-100)
  calculateEditDistance(original: string, edited: string): number {
    if (original === edited) return 0;
    if (!original || !edited) return 100;

    const longer = original.length > edited.length ? original : edited;
    const shorter = original.length > edited.length ? edited : original;

    if (longer.length === 0) return 0;

    // Simple Levenshtein-based percentage
    const editOps = this.levenshteinDistance(original.toLowerCase(), edited.toLowerCase());
    return Math.round((editOps / longer.length) * 100);
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i-1] === s2[j-1]) {
          dp[i][j] = dp[i-1][j-1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
      }
    }
    return dp[m][n];
  }
}

export const aiDocGenerator = new AiDocGenerator();
