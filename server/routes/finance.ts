/**
 * Finance Routes
 * CRUD operations for financial accounts, balance tracking, and net worth
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertFinancialAccountSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// ============================================================================
// FINANCIAL ACCOUNTS
// ============================================================================

// Get all financial accounts
router.get("/accounts", async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const isActive = req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined;
    const isAsset = req.query.isAsset === "true" ? true : req.query.isAsset === "false" ? false : undefined;

    const accounts = await storage.getFinancialAccounts({ type, isActive, isAsset });
    res.json(accounts);
  } catch (error) {
    logger.error({ error }, "Error fetching financial accounts");
    res.status(500).json({ error: "Failed to fetch financial accounts" });
  }
});

// Get single financial account
router.get("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const account = await storage.getFinancialAccount(req.params.id);
    if (!account) {
      return res.status(404).json({ error: "Financial account not found" });
    }
    res.json(account);
  } catch (error) {
    logger.error({ error }, "Error fetching financial account");
    res.status(500).json({ error: "Failed to fetch financial account" });
  }
});

// Create financial account
router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const validatedData = insertFinancialAccountSchema.parse(req.body);
    const account = await storage.createFinancialAccount(validatedData);
    res.status(201).json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid financial account data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating financial account");
      res.status(500).json({ error: "Failed to create financial account" });
    }
  }
});

// Update financial account
router.patch("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertFinancialAccountSchema.partial().parse(req.body);
    const account = await storage.updateFinancialAccount(req.params.id, updates);
    if (!account) {
      return res.status(404).json({ error: "Financial account not found" });
    }
    res.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid financial account data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating financial account");
      res.status(500).json({ error: "Failed to update financial account" });
    }
  }
});

// Delete financial account
router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteFinancialAccount(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting financial account");
    res.status(500).json({ error: "Failed to delete financial account" });
  }
});

// Update account balance (creates a snapshot)
router.post("/accounts/:id/balance", async (req: Request, res: Response) => {
  try {
    const { balance, note } = req.body;

    if (typeof balance !== "number") {
      return res.status(400).json({ error: "Balance must be a number" });
    }

    const account = await storage.updateAccountBalance(req.params.id, balance, note);
    res.json(account);
  } catch (error) {
    if (error instanceof Error && error.message === "Account not found") {
      res.status(404).json({ error: "Financial account not found" });
    } else {
      logger.error({ error }, "Error updating account balance");
      res.status(500).json({ error: "Failed to update account balance" });
    }
  }
});

// Get account balance history
router.get("/accounts/:id/history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const snapshots = await storage.getAccountSnapshots(req.params.id, limit);
    res.json(snapshots);
  } catch (error) {
    logger.error({ error }, "Error fetching account history");
    res.status(500).json({ error: "Failed to fetch account history" });
  }
});

// ============================================================================
// NET WORTH
// ============================================================================

// Get current net worth
router.get("/net-worth", async (req: Request, res: Response) => {
  try {
    const netWorth = await storage.getNetWorth();
    res.json(netWorth);
  } catch (error) {
    logger.error({ error }, "Error calculating net worth");
    res.status(500).json({ error: "Failed to calculate net worth" });
  }
});

// Get net worth history
router.get("/net-worth/history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const snapshots = await storage.getNetWorthSnapshots(req.userId, limit);
    res.json(snapshots);
  } catch (error) {
    logger.error({ error }, "Error fetching net worth history");
    res.status(500).json({ error: "Failed to fetch net worth history" });
  }
});

// Create net worth snapshot (for manual or scheduled snapshots)
router.post("/net-worth/snapshot", async (req: Request, res: Response) => {
  try {
    const snapshot = await storage.createNetWorthSnapshot(req.userId);
    res.status(201).json(snapshot);
  } catch (error) {
    logger.error({ error }, "Error creating net worth snapshot");
    res.status(500).json({ error: "Failed to create net worth snapshot" });
  }
});

export default router;
