import cron from 'node-cron';
import { storage } from '../storage';
import { logger } from '../logger';

/**
 * Daily Day Auto-Creation
 * Runs every day at midnight (00:00) to pre-create the day record.
 * This ensures the day is ready for health/nutrition entries and tasks.
 */
export function scheduleDailyDayCreation() {
  // Run every day at 00:00 (midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if day already exists
      const existing = await storage.getDay(today);

      if (!existing) {
        await storage.createDay({
          id: `day_${today}`,
          date: today,
          title: `${today} – [Untitled]`,
        });
        logger.info({ date: today }, '✅ Auto-created Day record');
      } else {
        logger.info({ date: today }, 'Day record already exists, skipping auto-creation');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to auto-create day record');
    }
  });

  logger.info('📅 Daily day creation automation scheduled (runs at midnight)');
}
