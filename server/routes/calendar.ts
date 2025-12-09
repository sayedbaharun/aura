/**
 * Calendar Routes
 * Google Calendar integration for events and focus blocks
 */
import { Router, Request, Response } from "express";
import { logger } from "../logger";

const router = Router();

// Check if Google Calendar is configured
function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  );
}

// GET /events - List events for a date range
router.get("/events", async (req: Request, res: Response) => {
  try {
    if (!isCalendarConfigured()) {
      return res.status(503).json({
        error: "Google Calendar not configured",
        message: "Please set up Google Calendar credentials in environment variables",
      });
    }

    const { startDate, endDate, maxResults } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const { listEvents } = await import("../google-calendar");
    const events = await listEvents(
      new Date(startDate as string),
      new Date(endDate as string),
      maxResults ? parseInt(maxResults as string) : 50
    );

    res.json(events);
  } catch (error) {
    logger.error({ error }, "Error fetching calendar events");
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

// GET /week - Get events for a specific week
router.get("/week", async (req: Request, res: Response) => {
  try {
    if (!isCalendarConfigured()) {
      return res.status(503).json({
        error: "Google Calendar not configured",
        configured: false,
      });
    }

    const { weekStart } = req.query;
    const startDate = weekStart ? new Date(weekStart as string) : new Date();

    // Get Monday of the week
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(startDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const { listEvents } = await import("../google-calendar");
    const events = await listEvents(monday, sunday, 100);

    res.json({
      configured: true,
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString(),
      events,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching week calendar events");
    res.status(500).json({ error: "Failed to fetch week calendar events" });
  }
});

// POST /focus-block - Create a focus time block
router.post("/focus-block", async (req: Request, res: Response) => {
  try {
    if (!isCalendarConfigured()) {
      return res.status(503).json({
        error: "Google Calendar not configured",
        message: "Please set up Google Calendar credentials",
      });
    }

    const { title, startTime, endTime, description } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: "startTime and endTime are required" });
    }

    const { createFocusTimeBlock } = await import("../google-calendar");
    const event = await createFocusTimeBlock(
      title || "Deep Work Session",
      new Date(startTime),
      new Date(endTime),
      description
    );

    res.json(event);
  } catch (error) {
    logger.error({ error }, "Error creating focus block");
    res.status(500).json({ error: "Failed to create focus block" });
  }
});

// GET /status - Check calendar connection status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const configured = isCalendarConfigured();

    if (!configured) {
      return res.json({
        configured: false,
        connected: false,
        message: "Google Calendar credentials not set",
      });
    }

    // Try to list a single event to verify connection
    const { listEvents } = await import("../google-calendar");
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await listEvents(now, tomorrow, 1);

    res.json({
      configured: true,
      connected: true,
      message: "Google Calendar connected successfully",
    });
  } catch (error: any) {
    logger.error({ error }, "Calendar connection check failed");
    res.json({
      configured: true,
      connected: false,
      error: error.message,
      message: "Failed to connect to Google Calendar",
    });
  }
});

export default router;
