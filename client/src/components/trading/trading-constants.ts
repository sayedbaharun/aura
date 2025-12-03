import type { TradingChecklistSection } from "@shared/schema";

/**
 * Universal Pre-Trade Mental Clearing section
 * This is the SAME for all strategies and cannot be edited per-strategy.
 * It ensures mental preparation before any trade.
 */
export const PRE_TRADE_MENTAL_CLEARING: TradingChecklistSection = {
  id: "pre_trade_mental_clearing",
  title: "Pre-Trade Mental Clearing",
  icon: "🧠",
  description: "Complete these before ANY trade to ensure you're in the right mindset",
  items: [
    {
      id: "mental_calm_focused",
      label: "I am calm and focused",
      type: "checkbox",
      required: true,
    },
    {
      id: "mental_accept_loss",
      label: "I accept I may lose this trade",
      type: "checkbox",
      required: true,
    },
    {
      id: "mental_follow_rules",
      label: "I will follow my rules, no matter what",
      type: "checkbox",
      required: true,
    },
    {
      id: "mental_process_not_outcome",
      label: "I am trading for process, not outcome",
      type: "checkbox",
      required: true,
    },
  ],
};

/**
 * Standard structure for all trading sessions:
 * 1. Daily Snapshot (date, session, mental state, news) - built into dashboard
 * 2. Pre-Trade Mental Clearing (FIXED - same for all strategies) - defined above
 * 3. Strategy-Specific Checklist (VARIES - from strategy.config.sections)
 * 4. Trade Execution Log - built into dashboard
 * 5. End of Session Review - built into dashboard
 */
