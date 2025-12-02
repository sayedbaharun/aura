/**
 * Trading Strategies Seed Data
 *
 * This file contains the seed data for trading strategies.
 * Run this to populate the database with default strategies.
 */

import { storage } from "../storage";
import type { TradingStrategyConfig } from "@shared/schema";

// Golden Trap & Reverse Strategy Configuration
const goldenTrapStrategy: TradingStrategyConfig = {
  sections: [
    {
      id: "pre-trade-mental",
      title: "Pre-Trade Mental Clearing",
      icon: "🧠",
      description: "Mental preparation before trading",
      items: [
        {
          id: "accept-anything",
          label: "I accept that anything can happen in the market.",
          type: "checkbox",
          required: true,
        },
        {
          id: "no-prediction",
          label: "I don't need to know what is going to happen next to make money.",
          type: "checkbox",
          required: true,
        },
        {
          id: "risk-defined",
          label: "I have defined my risk (1% Max) before entering.",
          type: "checkbox",
          required: true,
        },
        {
          id: "no-force",
          label: "I will not force a trade if the \"Kill Zone\" is choppy.",
          type: "checkbox",
          required: true,
        },
      ],
    },
    {
      id: "golden-trap-checklist",
      title: "The \"Golden Trap\" Checklist (MANDATORY)",
      icon: "🎯",
      description: "Do not take the trade unless ALL boxes are checked.",
      items: [
        // A. The Setup (Time & Location)
        {
          id: "kill-zone-time",
          label: "Is it currently inside the Kill Zone? (07:00-10:00 UK OR 12:00-15:00 UK)",
          type: "checkbox",
          required: true,
          category: "A. The Setup (Time & Location)",
        },
        {
          id: "levels-marked",
          label: "Have I marked the Previous Session High & Low?",
          type: "checkbox",
          required: true,
          category: "A. The Setup (Time & Location)",
        },
        {
          id: "the-sweep",
          label: "Did price break the Level by 5-20 pips (Gold) or 5-10 cents (Silver)?",
          type: "checkbox",
          required: true,
          category: "A. The Setup (Time & Location)",
        },
        // B. The Trigger (Price Action)
        {
          id: "rejection-candle",
          label: "Did a 5-minute candle close back inside the range?",
          type: "checkbox",
          required: true,
          category: "B. The Trigger (Price Action)",
        },
        {
          id: "dxy-filter",
          label: "Is the DXY (Dollar Index) moving in the opposite direction? (Inverse Correlation Check)",
          type: "checkbox",
          required: true,
          category: "B. The Trigger (Price Action)",
        },
        // C. The Execution (Risk)
        {
          id: "stop-loss-placed",
          label: "Is SL placed just above/below the rejection wick?",
          type: "checkbox",
          required: true,
          category: "C. The Execution (Risk)",
        },
        {
          id: "take-profit-set",
          label: "Is TP1 set at 1.5R and TP2 at the Mid-Range?",
          type: "checkbox",
          required: true,
          category: "C. The Execution (Risk)",
        },
      ],
    },
  ],
};

export async function seedTradingStrategies() {
  console.log("🌱 Seeding trading strategies...");

  try {
    // Check if strategies already exist
    const existing = await storage.getTradingStrategies();

    // Check if Golden Trap strategy already exists
    const goldenTrapExists = existing.some(s => s.name === "Golden Trap & Reverse");

    if (goldenTrapExists) {
      console.log("✓ Golden Trap & Reverse strategy already exists, skipping...");
      return;
    }

    // Create the Golden Trap & Reverse strategy
    const strategy = await storage.createTradingStrategy({
      name: "Golden Trap & Reverse",
      description: "A strategy for trading Gold (XAU/USD) and Silver (XAG/USD) based on liquidity sweeps and reversals during kill zones.",
      instruments: ["XAU/USD", "XAG/USD"],
      isActive: true,
      isDefault: true,
      config: goldenTrapStrategy,
      notes: `## Strategy Overview

**Golden Trap & Reverse** is a strategy that capitalizes on liquidity sweeps at key levels during high-volume trading sessions.

### Key Concepts:
- **Kill Zones**: London (07:00-10:00 UK) and New York (12:00-15:00 UK) sessions
- **The Sweep**: Price breaks previous session high/low to grab liquidity
- **The Trap**: Price quickly reverses back inside the range
- **The Trade**: Enter on confirmation of rejection, targeting mid-range

### Risk Management:
- Maximum 1% risk per trade
- Stop loss placed beyond rejection wick
- TP1 at 1.5R, TP2 at mid-range
- Always check DXY correlation before entering

### Psychology Rules:
1. Accept that anything can happen
2. No prediction needed to profit
3. Pre-define risk before entry
4. Never force trades in choppy conditions`,
    });

    console.log("✅ Created Golden Trap & Reverse strategy:", strategy.id);
  } catch (error) {
    console.error("❌ Error seeding trading strategies:", error);
    throw error;
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedTradingStrategies()
    .then(() => {
      console.log("✅ Trading strategies seeded successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to seed trading strategies:", error);
      process.exit(1);
    });
}
