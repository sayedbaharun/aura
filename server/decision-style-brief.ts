/**
 * Decision Style Brief Generator
 * Analyzes past decisions to create a personalized decision-making profile
 * for injection into AI context when decision-related questions are asked.
 */
import { storage } from "./storage";
import { logger } from "./logger";
import type { DecisionMemory } from "@shared/schema";

/**
 * Patterns that indicate a decision-related question
 */
const DECISION_PATTERNS = [
  /\bshould i\b/i,
  /\bdo i\b.*\?/i,
  /\bdecide\b/i,
  /\bchoose\b/i,
  /\bpick\b/i,
  /\bgo with\b/i,
  /\bhire\b/i,
  /\bswitch\b/i,
  /\binvest\b/i,
  /\bprioritize\b/i,
  /\bwhich (one|option)\b/i,
  /\bwhat would you recommend\b/i,
  /\bbetter to\b/i,
  /\bpros and cons\b/i,
  /\btradeoff\b/i,
  /\bweigh\b.*option/i,
];

/**
 * Check if a message appears to be asking for decision help
 */
export function isDecisionQuestion(message: string): boolean {
  return DECISION_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Generate a Decision Style Brief from past decisions
 * Uses closed decisions to understand decision patterns
 *
 * @param tags Optional tags to filter relevant decisions
 * @returns Decision Style Brief string (250-400 tokens max, ~1000-1600 chars)
 */
export async function generateDecisionStyleBrief(tags?: string[]): Promise<string | null> {
  try {
    // Retrieve decisions: prioritize closed ones with outcomes
    const decisions = await storage.retrieveDecisionsForAI("", tags, 10);

    if (decisions.length === 0) {
      return null;
    }

    // Separate closed and open decisions
    const closedDecisions = decisions.filter(d => d.outcomeRecordedAt);
    const openDecisions = decisions.filter(d => !d.outcomeRecordedAt);

    // Analyze patterns from decisions
    const principles: Map<string, number> = new Map();
    const constraints: Map<string, number> = new Map();
    const archetypes: Map<string, number> = new Map();
    const riskLevels: Map<string, number> = new Map();
    const reversibilities: Map<string, number> = new Map();
    const outcomes: { success: number; mixed: number; failure: number; unknown: number } = {
      success: 0,
      mixed: 0,
      failure: 0,
      unknown: 0,
    };

    // Process all decisions
    for (const decision of decisions) {
      const derived = decision.derived as DecisionMemory['derived'];

      // Count principles
      if (derived?.principles) {
        for (const principle of derived.principles) {
          principles.set(principle, (principles.get(principle) || 0) + 1);
        }
      }

      // Count constraints
      if (derived?.constraints) {
        for (const constraint of derived.constraints) {
          constraints.set(constraint, (constraints.get(constraint) || 0) + 1);
        }
      }

      // Count archetypes
      if (derived?.archetype) {
        archetypes.set(derived.archetype, (archetypes.get(derived.archetype) || 0) + 1);
      }

      // Count risk levels
      if (derived?.riskLevel) {
        riskLevels.set(derived.riskLevel, (riskLevels.get(derived.riskLevel) || 0) + 1);
      }

      // Count reversibility
      if (derived?.reversibility) {
        reversibilities.set(derived.reversibility, (reversibilities.get(derived.reversibility) || 0) + 1);
      }

      // Count outcomes (only for closed decisions)
      if (decision.outcome) {
        outcomes[decision.outcome as keyof typeof outcomes]++;
      }
    }

    // Build the brief
    const sections: string[] = [];

    // Opening
    sections.push(`## Decision Style Brief (based on ${decisions.length} past decisions)`);

    // Recurring principles
    if (principles.size > 0) {
      const topPrinciples = Array.from(principles.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([p]) => p);
      if (topPrinciples.length > 0) {
        sections.push(`**Common principles:** ${topPrinciples.join(", ")}`);
      }
    }

    // Recurring constraints
    if (constraints.size > 0) {
      const topConstraints = Array.from(constraints.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c);
      if (topConstraints.length > 0) {
        sections.push(`**Typical constraints considered:** ${topConstraints.join(", ")}`);
      }
    }

    // Decision types
    if (archetypes.size > 0) {
      const topArchetypes = Array.from(archetypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([a]) => a);
      if (topArchetypes.length > 0) {
        sections.push(`**Common decision types:** ${topArchetypes.join(", ")}`);
      }
    }

    // Risk and reversibility tendencies
    const riskAnalysis: string[] = [];
    if (riskLevels.size > 0) {
      const dominantRisk = Array.from(riskLevels.entries())
        .sort((a, b) => b[1] - a[1])[0];
      riskAnalysis.push(`typically ${dominantRisk[0]} risk`);
    }
    if (reversibilities.size > 0) {
      const dominantReversibility = Array.from(reversibilities.entries())
        .sort((a, b) => b[1] - a[1])[0];
      riskAnalysis.push(`${dominantReversibility[0].replace(/_/g, ' ')} decisions`);
    }
    if (riskAnalysis.length > 0) {
      sections.push(`**Risk profile:** Tends toward ${riskAnalysis.join(", ")}`);
    }

    // Outcome history (from closed decisions only)
    const closedCount = closedDecisions.length;
    if (closedCount > 0) {
      const successRate = Math.round((outcomes.success / closedCount) * 100);
      const mixedRate = Math.round((outcomes.mixed / closedCount) * 100);
      sections.push(`**Historical outcomes (${closedCount} reviewed):** ${successRate}% success, ${mixedRate}% mixed`);

      // What worked
      const successfulDecisions = closedDecisions.filter(d => d.outcome === 'success');
      if (successfulDecisions.length > 0) {
        const successPatterns: string[] = [];
        for (const d of successfulDecisions.slice(0, 2)) {
          const derived = d.derived as DecisionMemory['derived'];
          if (derived?.archetype) {
            successPatterns.push(derived.archetype);
          }
        }
        if (successPatterns.length > 0) {
          sections.push(`**What typically works:** ${[...new Set(successPatterns)].join(", ")} decisions`);
        }
      }
    }

    // Recent context (from open decisions if any)
    if (openDecisions.length > 0) {
      const recentOpen = openDecisions[0];
      const derived = recentOpen.derived as DecisionMemory['derived'];
      sections.push(`**Current pending:** ${derived?.canonicalSummary || recentOpen.decision.slice(0, 100)}`);
    }

    const brief = sections.join("\n");

    // Ensure we stay within token limits (~4 chars per token, target 250-400 tokens = 1000-1600 chars)
    if (brief.length > 1600) {
      return brief.slice(0, 1600) + "...";
    }

    return brief;
  } catch (error) {
    logger.error({ error }, "Error generating decision style brief");
    return null;
  }
}
