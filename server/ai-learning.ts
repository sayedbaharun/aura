import { db } from "../db";
import {
  docAiFeedback,
  docAiExamples,
  docAiPatterns,
  docAiTeachings,
  docs
} from "@shared/schema";
import { eq, and, gte, desc, sql, isNull } from "drizzle-orm";

interface PatternAnalysis {
  positive: string[];
  negative: string[];
}

interface AiPerformanceMetrics {
  totalSuggestions: number;
  acceptedCount: number;
  editedCount: number;
  rejectedCount: number;
  regeneratedCount: number;
  acceptanceRate: number;  // accepted / total
  acceptWithMinorEditRate: number;  // (accepted + edited<20%) / total
  averageEditDistance: number;
  trend: 'improving' | 'stable' | 'declining';
  byField: {
    field: string;
    total: number;
    acceptanceRate: number;
  }[];
  examplesCount: number;
  patternsCount: number;
  teachingsCount: number;
}

export class AiLearningService {

  /**
   * Analyze recent feedback to extract patterns of what works and what doesn't.
   * This should be called periodically (e.g., weekly cron job).
   */
  async analyzeAndUpdatePatterns(daysBack: number = 30): Promise<void> {
    // Get recent feedback grouped by action
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const recentFeedback = await db.select()
      .from(docAiFeedback)
      .where(gte(docAiFeedback.createdAt, cutoffDate))
      .orderBy(desc(docAiFeedback.createdAt));

    // Group by docType and fieldName
    const grouped = new Map<string, typeof recentFeedback>();
    for (const fb of recentFeedback) {
      const key = `${fb.docType || 'any'}:${fb.fieldName}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(fb);
    }

    // Analyze each group
    for (const [key, feedbackList] of Array.from(grouped)) {
      const [docType, fieldName] = key.split(':');

      // Get accepted suggestions (potential positive patterns)
      const accepted = feedbackList.filter(
        (f: typeof recentFeedback[0]) => f.userAction === 'accepted' ||
        (f.userAction === 'edited' && (f.editDistance || 0) < 20)
      );

      // Get rejected or heavily edited (potential negative patterns)
      const rejected = feedbackList.filter(
        (f: typeof recentFeedback[0]) => f.userAction === 'rejected' ||
        f.userAction === 'regenerated' ||
        (f.userAction === 'edited' && (f.editDistance || 0) > 50)
      );

      // Only analyze if we have enough data
      if (accepted.length >= 3 || rejected.length >= 3) {
        await this.extractAndSavePatterns(
          docType === 'any' ? undefined : docType,
          fieldName,
          accepted.map((f: typeof recentFeedback[0]) => ({ suggestion: f.aiSuggestion, final: f.userFinal })),
          rejected.map((f: typeof recentFeedback[0]) => ({ suggestion: f.aiSuggestion, final: f.userFinal }))
        );
      }
    }
  }

  /**
   * Extract patterns from accepted/rejected suggestions using AI.
   */
  private async extractAndSavePatterns(
    docType: string | undefined,
    fieldName: string,
    accepted: { suggestion: string; final: string | null }[],
    rejected: { suggestion: string; final: string | null }[]
  ): Promise<void> {
    // Use OpenRouter to analyze patterns
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return;

    const prompt = `Analyze these AI documentation suggestions and identify patterns.

## Suggestions that users ACCEPTED (worked well):
${accepted.slice(0, 10).map((f, i) => `${i + 1}. "${f.suggestion.slice(0, 200)}..."`).join('\n')}

## Suggestions that users REJECTED or heavily edited (didn't work):
${rejected.slice(0, 10).map((f, i) => `${i + 1}. "${f.suggestion.slice(0, 200)}..."`).join('\n')}

Identify 2-4 specific, actionable patterns for each category.
Return JSON in this exact format:
{
  "positive": ["pattern 1", "pattern 2"],
  "negative": ["pattern 1", "pattern 2"]
}`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const patterns: PatternAnalysis = JSON.parse(jsonMatch[0]);

      // Deactivate old patterns for this context
      await db.update(docAiPatterns)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          docType ? eq(docAiPatterns.docType, docType) : isNull(docAiPatterns.docType),
          eq(docAiPatterns.fieldName, fieldName)
        ));

      // Insert new patterns
      const now = new Date();
      for (const pattern of patterns.positive) {
        await db.insert(docAiPatterns).values({
          docType,
          fieldName,
          patternType: 'positive',
          pattern,
          confidence: 0.7,
          sourceCount: accepted.length,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const pattern of patterns.negative) {
        await db.insert(docAiPatterns).values({
          docType,
          fieldName,
          patternType: 'negative',
          pattern,
          confidence: 0.7,
          sourceCount: rejected.length,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      console.error('Failed to extract patterns:', error);
    }
  }

  /**
   * Check if a doc should be promoted to the example bank.
   * Criteria: high quality score, AI-assisted fields accepted, doc is used/referenced.
   */
  async evaluateForPromotion(docId: string): Promise<boolean> {
    const doc = await db.select().from(docs).where(eq(docs.id, docId)).limit(1);
    if (!doc.length) return false;

    const d = doc[0];

    // Must be active and high quality
    if (d.status !== 'active' || (d.qualityScore || 0) < 85) return false;

    // Must have structured fields populated
    if (!d.summary || !(d.keyPoints as string[])?.length) return false;

    // Check if AI-generated fields were accepted with minimal edits
    const feedback = await db.select()
      .from(docAiFeedback)
      .where(eq(docAiFeedback.docId, docId));

    // If there was AI feedback, it should have been mostly accepted
    if (feedback.length > 0) {
      const accepted = feedback.filter(
        f => f.userAction === 'accepted' ||
        (f.userAction === 'edited' && (f.editDistance || 0) < 20)
      );
      if (accepted.length / feedback.length < 0.7) return false;
    }

    return true;
  }

  /**
   * Promote a doc's fields to the example bank.
   */
  async promoteToExample(docId: string, fieldName: string): Promise<void> {
    const doc = await db.select().from(docs).where(eq(docs.id, docId)).limit(1);
    if (!doc.length) return;

    const d = doc[0];
    let goldOutput: string | undefined;

    // Get the field value
    switch (fieldName) {
      case 'summary':
        goldOutput = d.summary || undefined;
        break;
      case 'keyPoints':
        goldOutput = JSON.stringify(d.keyPoints || []);
        break;
      case 'applicableWhen':
        goldOutput = d.applicableWhen || undefined;
        break;
    }

    if (!goldOutput) return;

    // Get content excerpt
    const contentExcerpt = (d.body || JSON.stringify(d.content || '')).slice(0, 2000);

    // Check if example already exists
    const existing = await db.select()
      .from(docAiExamples)
      .where(and(
        eq(docAiExamples.docType, d.type || 'page'),
        eq(docAiExamples.fieldName, fieldName),
        eq(docAiExamples.goldOutput, goldOutput)
      ))
      .limit(1);

    if (existing.length > 0) return;

    // Insert new example
    await db.insert(docAiExamples).values({
      docType: d.type || 'page',
      docDomain: d.domain || undefined,
      ventureId: d.ventureId,
      contentExcerpt,
      fieldName,
      goldOutput,
      qualityScore: d.qualityScore || 0,
      timesUsed: 0,
      successRate: null,
      isActive: true,
      createdAt: new Date(),
      promotedAt: new Date(),
    });
  }

  /**
   * Get AI performance metrics for dashboard.
   */
  async getMetrics(daysBack: number = 30): Promise<AiPerformanceMetrics> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get all recent feedback
    const feedback = await db.select()
      .from(docAiFeedback)
      .where(gte(docAiFeedback.createdAt, cutoffDate));

    const total = feedback.length;
    const accepted = feedback.filter(f => f.userAction === 'accepted').length;
    const edited = feedback.filter(f => f.userAction === 'edited').length;
    const rejected = feedback.filter(f => f.userAction === 'rejected').length;
    const regenerated = feedback.filter(f => f.userAction === 'regenerated').length;

    const acceptedWithMinorEdit = feedback.filter(
      f => f.userAction === 'accepted' ||
      (f.userAction === 'edited' && (f.editDistance || 0) < 20)
    ).length;

    const editDistances = feedback
      .filter(f => f.editDistance !== null)
      .map(f => f.editDistance!);
    const averageEditDistance = editDistances.length > 0
      ? editDistances.reduce((a, b) => a + b, 0) / editDistances.length
      : 0;

    // Group by field
    const byField = new Map<string, { total: number; accepted: number }>();
    for (const f of feedback) {
      const field = f.fieldName;
      if (!byField.has(field)) byField.set(field, { total: 0, accepted: 0 });
      const entry = byField.get(field)!;
      entry.total++;
      if (f.userAction === 'accepted' || (f.userAction === 'edited' && (f.editDistance || 0) < 20)) {
        entry.accepted++;
      }
    }

    // Get counts
    const examples = await db.select({ count: sql<number>`count(*)` })
      .from(docAiExamples)
      .where(eq(docAiExamples.isActive, true));
    const patterns = await db.select({ count: sql<number>`count(*)` })
      .from(docAiPatterns)
      .where(eq(docAiPatterns.isActive, true));
    const teachings = await db.select({ count: sql<number>`count(*)` })
      .from(docAiTeachings)
      .where(eq(docAiTeachings.isActive, true));

    // Calculate trend (compare last 7 days vs previous 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentWeek = feedback.filter(f => f.createdAt >= weekAgo);
    const previousWeek = feedback.filter(f => f.createdAt >= twoWeeksAgo && f.createdAt < weekAgo);

    const recentRate = recentWeek.length > 0
      ? recentWeek.filter(f => f.userAction === 'accepted').length / recentWeek.length
      : 0;
    const previousRate = previousWeek.length > 0
      ? previousWeek.filter(f => f.userAction === 'accepted').length / previousWeek.length
      : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentRate > previousRate + 0.1) trend = 'improving';
    else if (recentRate < previousRate - 0.1) trend = 'declining';

    return {
      totalSuggestions: total,
      acceptedCount: accepted,
      editedCount: edited,
      rejectedCount: rejected,
      regeneratedCount: regenerated,
      acceptanceRate: total > 0 ? accepted / total : 0,
      acceptWithMinorEditRate: total > 0 ? acceptedWithMinorEdit / total : 0,
      averageEditDistance,
      trend,
      byField: Array.from(byField.entries()).map(([field, data]) => ({
        field,
        total: data.total,
        acceptanceRate: data.total > 0 ? data.accepted / data.total : 0,
      })),
      examplesCount: Number(examples[0]?.count || 0),
      patternsCount: Number(patterns[0]?.count || 0),
      teachingsCount: Number(teachings[0]?.count || 0),
    };
  }

  /**
   * Check system health and trigger alerts if quality is declining.
   */
  async checkHealthAndAlert(): Promise<{ healthy: boolean; issues: string[] }> {
    const metrics = await this.getMetrics(14);
    const issues: string[] = [];

    if (metrics.trend === 'declining') {
      issues.push('AI acceptance rate is declining over the past 2 weeks');
    }
    if (metrics.acceptanceRate < 0.5 && metrics.totalSuggestions > 20) {
      issues.push(`Low acceptance rate: ${Math.round(metrics.acceptanceRate * 100)}%`);
    }
    if (metrics.averageEditDistance > 50) {
      issues.push(`High average edit distance: ${Math.round(metrics.averageEditDistance)}%`);
    }
    if (metrics.examplesCount < 3) {
      issues.push('Very few examples in the example bank');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Run all promotion checks for high-quality docs.
   */
  async runPromotionCheck(): Promise<number> {
    // Find high-quality active docs that aren't already examples
    const highQualityDocs = await db.select()
      .from(docs)
      .where(and(
        eq(docs.status, 'active'),
        gte(docs.qualityScore, 85)
      ))
      .limit(50);

    let promoted = 0;
    for (const doc of highQualityDocs) {
      const shouldPromote = await this.evaluateForPromotion(doc.id);
      if (shouldPromote) {
        // Promote all fields that have values
        if (doc.summary) {
          await this.promoteToExample(doc.id, 'summary');
          promoted++;
        }
        if ((doc.keyPoints as string[])?.length) {
          await this.promoteToExample(doc.id, 'keyPoints');
          promoted++;
        }
        if (doc.applicableWhen) {
          await this.promoteToExample(doc.id, 'applicableWhen');
          promoted++;
        }
      }
    }

    return promoted;
  }
}

export const aiLearningService = new AiLearningService();
