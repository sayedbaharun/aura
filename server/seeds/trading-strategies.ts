/**
 * Trading Strategies Seed Data
 *
 * This file contains the seed data for trading strategies.
 * Run this to populate the database with default strategies.
 *
 * Note: Pre-Trade Mental Clearing is UNIVERSAL and defined in trading-constants.ts
 * Strategy configs should only contain strategy-specific checklist sections.
 */

import type { TradingStrategyConfig } from "@shared/schema";
import type { IStorage } from "../storage";

// Golden Trap & Reverse Strategy Configuration (for Gold/Silver)
const goldenTrapStrategy: TradingStrategyConfig = {
  sections: [
    {
      id: "golden-trap-checklist",
      title: "The \"Golden Trap\" Checklist",
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

// S&P 500 Velocity Trap Strategy Configuration
const sp500VelocityTrapStrategy: TradingStrategyConfig = {
  sections: [
    {
      id: "phase1-kill-zone",
      title: "Phase 1: Kill Zone Verification",
      icon: "⏰",
      description: "Only trade during these algorithmic windows (EST - New York Time)",
      items: [
        {
          id: "am-silver-bullet",
          label: "AM Silver Bullet: Is it 10:00 AM – 11:00 AM EST?",
          type: "checkbox",
          required: false,
          category: "Kill Zone Check",
        },
        {
          id: "pm-silver-bullet",
          label: "PM Silver Bullet: Is it 2:00 PM – 3:00 PM EST?",
          type: "checkbox",
          required: false,
          category: "Kill Zone Check",
        },
        {
          id: "in-kill-zone",
          label: "CONFIRMED: I am inside one of the Kill Zones above",
          type: "checkbox",
          required: true,
          category: "Kill Zone Check",
        },
      ],
    },
    {
      id: "phase2-setup",
      title: "Phase 2: The Setup",
      icon: "📐",
      description: "Mark liquidity and wait for the sweep",
      items: [
        // Liquidity Marking
        {
          id: "liquidity-marked",
          label: "Have I marked the High and Low of the last 60 minutes before Kill Zone?",
          type: "checkbox",
          required: true,
          category: "A. Mark Liquidity",
        },
        // The Sweep
        {
          id: "sweep-occurred",
          label: "Did price break the High or Low? (The Sweep)",
          type: "checkbox",
          required: true,
          category: "B. The Sweep",
        },
        {
          id: "bullish-trap",
          label: "Bullish Trap: Price swept the LOW (looking to BUY)",
          type: "checkbox",
          required: false,
          category: "B. The Sweep",
        },
        {
          id: "bearish-trap",
          label: "Bearish Trap: Price swept the HIGH (looking to SELL)",
          type: "checkbox",
          required: false,
          category: "B. The Sweep",
        },
        // Professional Edge Confirmation
        {
          id: "vix-filter-buy",
          label: "VIX Filter (Buy): VIX is dropping or rejecting resistance",
          type: "checkbox",
          required: false,
          category: "C. Professional Edge Confirmation",
        },
        {
          id: "vix-filter-sell",
          label: "VIX Filter (Sell): VIX is rising",
          type: "checkbox",
          required: false,
          category: "C. Professional Edge Confirmation",
        },
        {
          id: "tick-divergence",
          label: "NYSE $TICK Divergence: S&P makes Lower Low but $TICK makes Higher Low (Buy Signal)",
          type: "checkbox",
          required: false,
          category: "C. Professional Edge Confirmation",
        },
        {
          id: "confirmation-check",
          label: "CONFIRMED: At least ONE Professional Edge Confirmation is checked",
          type: "checkbox",
          required: true,
          category: "C. Professional Edge Confirmation",
        },
      ],
    },
    {
      id: "phase3-entry-risk",
      title: "Phase 3: Entry & Risk Management",
      icon: "🎯",
      description: "Execute with precision and manage risk",
      items: [
        // Entry Trigger
        {
          id: "fvg-or-engulfing",
          label: "Entry Trigger: FVG or Engulfing Candle closed back inside the range",
          type: "checkbox",
          required: true,
          category: "A. Entry Trigger",
        },
        // Risk Management
        {
          id: "stop-loss-set",
          label: "Stop Loss: 5 Points (ES) or $0.50 (SPY) hard stop placed",
          type: "checkbox",
          required: true,
          category: "B. Risk Management",
        },
        {
          id: "take-profit-set",
          label: "Take Profit: 10 Points (ES) or $1.00 (SPY) target set",
          type: "checkbox",
          required: true,
          category: "B. Risk Management",
        },
        {
          id: "breakeven-rule",
          label: "Breakeven Rule: Will move SL to breakeven after +4 Points",
          type: "checkbox",
          required: true,
          category: "B. Risk Management",
        },
      ],
    },
  ],
};

export async function seedTradingStrategies(storageInstance: IStorage) {
  console.log("🌱 Seeding trading strategies...");

  try {
    // Check if strategies already exist
    const existing = await storageInstance.getTradingStrategies();

    // Seed Golden Trap & Reverse strategy
    const goldenTrapExists = existing.some(s => s.name === "Golden Trap & Reverse");
    if (!goldenTrapExists) {
      const strategy = await storageInstance.createTradingStrategy({
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
- Always check DXY correlation before entering`,
      });
      console.log("✅ Created Golden Trap & Reverse strategy:", strategy.id);
    } else {
      console.log("✓ Golden Trap & Reverse strategy already exists, skipping...");
    }

    // Seed S&P 500 Velocity Trap strategy
    const velocityTrapExists = existing.some(s => s.name === "S&P 500 Velocity Trap");
    if (!velocityTrapExists) {
      const strategy = await storageInstance.createTradingStrategy({
        name: "S&P 500 Velocity Trap",
        description: "Scalping strategy for S&P 500 (ES/SPY) based on liquidity runs during algorithmic windows.",
        instruments: ["ES", "SPY", "S&P 500"],
        isActive: true,
        isDefault: false,
        config: sp500VelocityTrapStrategy,
        notes: `## Strategy Overview

**S&P 500 Velocity Trap** is a scalping strategy designed for holding 15-45 minutes. It waits for a liquidity run during specific algorithmic windows.

### Kill Zones (EST - New York Time):
- **AM Silver Bullet**: 10:00 AM – 11:00 AM EST (Macro algorithms fire)
- **PM Silver Bullet**: 2:00 PM – 3:00 PM EST (Bond market repricing)

### The Setup:
1. Mark the High and Low of the last 60 minutes before Kill Zone
2. Wait for price to BREAK that High or Low (The Sweep)
3. Bullish Trap = Price sweeps the Low (looking to buy)
4. Bearish Trap = Price sweeps the High (looking to sell)

### Professional Edge Confirmation:
- **VIX Filter**: For buys, VIX should be dropping. For sells, VIX should be rising.
- **NYSE $TICK Divergence**: If S&P makes Lower Low but $TICK makes Higher Low = massive Buy Signal

### Risk Management:
- **Stop Loss**: 5 Points (ES) or $0.50 (SPY)
- **Take Profit**: 10 Points (ES) or $1.00 (SPY)
- **Breakeven Rule**: Move SL to breakeven after +4 Points`,
      });
      console.log("✅ Created S&P 500 Velocity Trap strategy:", strategy.id);
    } else {
      console.log("✓ S&P 500 Velocity Trap strategy already exists, skipping...");
    }

  } catch (error) {
    console.error("❌ Error seeding trading strategies:", error);
    throw error;
  }
}

