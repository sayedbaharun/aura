/**
 * Doc Quality Scoring System
 * Evaluates documents for AI-readiness based on completeness and structure
 */
import type { Doc } from "@shared/schema";

export interface QualityFactor {
  name: string;
  score: number;
  maxScore: number;
  met: boolean;
  suggestion?: string;
}

export interface QualityBreakdown {
  score: number;
  maxScore: number;
  factors: QualityFactor[];
  aiReady: boolean;
  missingRequired: string[];
}

// Weights for quality scoring
const QUALITY_WEIGHTS = {
  title: 5,           // Has meaningful title (>5 chars)
  summary: 20,        // Has summary (>50 chars)
  keyPoints: 20,      // Has 3+ key points
  applicableWhen: 15, // Has context (>20 chars)
  prerequisites: 10,  // Has prerequisites linked
  owner: 5,           // Has owner assigned
  relatedDocs: 10,    // Has related docs linked
  contentLength: 10,  // Content >500 chars
  recentReview: 5,    // Reviewed in last 90 days
};

const AI_READY_THRESHOLD = 70;

// Get content length from doc (handles both body and content fields)
function getContentLength(doc: Doc): number {
  if (doc.body) {
    return doc.body.length;
  }
  if (doc.content && Array.isArray(doc.content)) {
    // BlockNote content - stringify and count
    return JSON.stringify(doc.content).length;
  }
  return 0;
}

// Check if review is recent (within days)
function isRecentReview(lastReviewedAt: Date | null | undefined, days: number = 90): boolean {
  if (!lastReviewedAt) return false;
  const daysSince = (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < days;
}

export function calculateDocQuality(doc: Doc): QualityBreakdown {
  const factors: QualityFactor[] = [];
  let totalScore = 0;
  const missingRequired: string[] = [];

  // Title check
  const hasTitle = Boolean(doc.title && doc.title.length > 5);
  factors.push({
    name: 'title',
    score: hasTitle ? QUALITY_WEIGHTS.title : 0,
    maxScore: QUALITY_WEIGHTS.title,
    met: hasTitle,
    suggestion: hasTitle ? undefined : 'Add a descriptive title (more than 5 characters)',
  });
  if (hasTitle) totalScore += QUALITY_WEIGHTS.title;

  // Summary check
  const hasSummary = Boolean(doc.summary && doc.summary.length > 50);
  factors.push({
    name: 'summary',
    score: hasSummary ? QUALITY_WEIGHTS.summary : 0,
    maxScore: QUALITY_WEIGHTS.summary,
    met: hasSummary,
    suggestion: hasSummary ? undefined : 'Add a summary (1-3 sentences describing the document)',
  });
  if (hasSummary) totalScore += QUALITY_WEIGHTS.summary;
  if (!hasSummary) missingRequired.push('summary');

  // Key Points check
  const keyPoints = doc.keyPoints as string[] | null | undefined;
  const hasKeyPoints = Boolean(keyPoints && keyPoints.length >= 3);
  factors.push({
    name: 'keyPoints',
    score: hasKeyPoints ? QUALITY_WEIGHTS.keyPoints : 0,
    maxScore: QUALITY_WEIGHTS.keyPoints,
    met: hasKeyPoints,
    suggestion: hasKeyPoints ? undefined : 'Add at least 3 key points',
  });
  if (hasKeyPoints) totalScore += QUALITY_WEIGHTS.keyPoints;
  if (!hasKeyPoints) missingRequired.push('keyPoints');

  // Applicable When check
  const hasApplicableWhen = Boolean(doc.applicableWhen && doc.applicableWhen.length > 20);
  factors.push({
    name: 'applicableWhen',
    score: hasApplicableWhen ? QUALITY_WEIGHTS.applicableWhen : 0,
    maxScore: QUALITY_WEIGHTS.applicableWhen,
    met: hasApplicableWhen,
    suggestion: hasApplicableWhen ? undefined : 'Describe when this document should be used',
  });
  if (hasApplicableWhen) totalScore += QUALITY_WEIGHTS.applicableWhen;

  // Prerequisites check
  const prerequisites = doc.prerequisites as string[] | null | undefined;
  const hasPrerequisites = Boolean(prerequisites && prerequisites.length > 0);
  factors.push({
    name: 'prerequisites',
    score: hasPrerequisites ? QUALITY_WEIGHTS.prerequisites : 0,
    maxScore: QUALITY_WEIGHTS.prerequisites,
    met: hasPrerequisites,
    suggestion: hasPrerequisites ? undefined : 'Link prerequisite documents if any',
  });
  if (hasPrerequisites) totalScore += QUALITY_WEIGHTS.prerequisites;

  // Owner check
  const hasOwner = Boolean(doc.owner && doc.owner.length > 0);
  factors.push({
    name: 'owner',
    score: hasOwner ? QUALITY_WEIGHTS.owner : 0,
    maxScore: QUALITY_WEIGHTS.owner,
    met: hasOwner,
    suggestion: hasOwner ? undefined : 'Assign an owner for this document',
  });
  if (hasOwner) totalScore += QUALITY_WEIGHTS.owner;

  // Related Docs check
  const relatedDocs = doc.relatedDocs as string[] | null | undefined;
  const hasRelatedDocs = Boolean(relatedDocs && relatedDocs.length > 0);
  factors.push({
    name: 'relatedDocs',
    score: hasRelatedDocs ? QUALITY_WEIGHTS.relatedDocs : 0,
    maxScore: QUALITY_WEIGHTS.relatedDocs,
    met: hasRelatedDocs,
    suggestion: hasRelatedDocs ? undefined : 'Link related documents',
  });
  if (hasRelatedDocs) totalScore += QUALITY_WEIGHTS.relatedDocs;

  // Content Length check
  const contentLength = getContentLength(doc);
  const hasContent = contentLength > 500;
  factors.push({
    name: 'contentLength',
    score: hasContent ? QUALITY_WEIGHTS.contentLength : 0,
    maxScore: QUALITY_WEIGHTS.contentLength,
    met: hasContent,
    suggestion: hasContent ? undefined : 'Add more content (at least 500 characters)',
  });
  if (hasContent) totalScore += QUALITY_WEIGHTS.contentLength;

  // Recent Review check
  const hasRecentReview = isRecentReview(doc.lastReviewedAt);
  factors.push({
    name: 'recentReview',
    score: hasRecentReview ? QUALITY_WEIGHTS.recentReview : 0,
    maxScore: QUALITY_WEIGHTS.recentReview,
    met: hasRecentReview,
    suggestion: hasRecentReview ? undefined : 'Review this document (last reviewed over 90 days ago or never)',
  });
  if (hasRecentReview) totalScore += QUALITY_WEIGHTS.recentReview;

  const maxScore = Object.values(QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);

  return {
    score: totalScore,
    maxScore,
    factors,
    aiReady: totalScore >= AI_READY_THRESHOLD,
    missingRequired,
  };
}

// Get actionable suggestions to improve quality
export function getQualitySuggestions(doc: Doc): string[] {
  const breakdown = calculateDocQuality(doc);
  return breakdown.factors
    .filter(f => !f.met && f.suggestion)
    .sort((a, b) => b.maxScore - a.maxScore) // Prioritize high-value improvements
    .map(f => f.suggestion!);
}

// Quick check if doc is AI-ready
export function isDocAiReady(doc: Doc): boolean {
  const breakdown = calculateDocQuality(doc);
  return breakdown.aiReady;
}
