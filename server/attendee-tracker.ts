import { logger } from './logger';
import { storage } from './storage';
import { listEvents } from './google-calendar';
import { bot } from './telegram-bot';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let pollingInterval: NodeJS.Timeout | null = null;

interface AttendeeUpdate {
  eventTitle: string;
  eventId: string;
  attendeeEmail: string;
  oldStatus: string;
  newStatus: string;
}

// Human-readable status with symbols
const statusText: Record<string, string> = {
  'accepted': '[ACCEPTED]',
  'declined': '[DECLINED]',
  'tentative': '[TENTATIVE]',
  'needsAction': '[PENDING]',
};

export async function checkAttendeeUpdates() {
  try {
    
    // Get all upcoming events for the next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const events = await listEvents(now, thirtyDaysFromNow, 100);
    
    if (!events || events.length === 0) {
      logger.debug('No upcoming events to check for attendee updates');
      return;
    }
    
    const updates: Map<string, AttendeeUpdate[]> = new Map(); // chatId -> updates
    
    for (const event of events) {
      if (!event.id || !event.attendees || event.attendees.length === 0) {
        continue;
      }
      
      // Find which user created this event (from appointments table)
      const appointment = await storage.getAppointmentByGoogleEventId(event.id);
      if (!appointment) {
        continue; // Skip events not in our database
      }
      
      const chatId = appointment.phoneNumber; // This is actually chatId for Telegram
      
      // Check each attendee
      for (const attendee of event.attendees) {
        if (!attendee.email || !attendee.responseStatus) {
          continue;
        }
        
        // Get stored attendee status
        const storedAttendee = await storage.getEventAttendee(event.id, attendee.email);
        
        if (!storedAttendee) {
          // First time seeing this attendee - store it
          await storage.createEventAttendee({
            googleEventId: event.id,
            attendeeEmail: attendee.email,
            responseStatus: attendee.responseStatus,
            chatId,
          });
          logger.debug({ 
            eventId: event.id, 
            email: attendee.email, 
            status: attendee.responseStatus 
          }, 'Stored new attendee');
        } else if (storedAttendee.responseStatus !== attendee.responseStatus) {
          // Status changed! Record the update
          if (!updates.has(chatId)) {
            updates.set(chatId, []);
          }
          
          updates.get(chatId)!.push({
            eventTitle: event.summary || 'Untitled Event',
            eventId: event.id,
            attendeeEmail: attendee.email,
            oldStatus: storedAttendee.responseStatus,
            newStatus: attendee.responseStatus,
          });
          
          // Update stored status
          await storage.updateEventAttendee(event.id, attendee.email, attendee.responseStatus);
          
          logger.info({ 
            eventId: event.id, 
            email: attendee.email, 
            oldStatus: storedAttendee.responseStatus,
            newStatus: attendee.responseStatus
          }, 'Attendee status changed');
        } else {
          // No change, just update lastChecked
          await storage.updateEventAttendee(event.id, attendee.email, attendee.responseStatus);
        }
      }
    }
    
    // Send notifications for all updates
    for (const [chatId, eventUpdates] of Array.from(updates.entries())) {
      await sendAttendeeNotifications(chatId, eventUpdates);
    }
    
    if (updates.size > 0) {
      logger.info({ chatIdsNotified: updates.size, totalUpdates: Array.from(updates.values()).flat().length }, 'Sent attendee update notifications');
    }
    
  } catch (error) {
    logger.error({ error }, 'Error checking attendee updates');
  }
}

async function sendAttendeeNotifications(chatId: string, updates: AttendeeUpdate[]) {
  try {
    // Group updates by event
    const byEvent = new Map<string, AttendeeUpdate[]>();
    for (const update of updates) {
      if (!byEvent.has(update.eventId)) {
        byEvent.set(update.eventId, []);
      }
      byEvent.get(update.eventId)!.push(update);
    }
    
    // Send one notification per event
    for (const [eventId, eventUpdates] of Array.from(byEvent.entries())) {
      const eventTitle = eventUpdates[0].eventTitle;
      
      let message = `Meeting Update: "${eventTitle}"\n\n`;
      
      for (const update of eventUpdates) {
        const status = statusText[update.newStatus] || `[${update.newStatus.toUpperCase()}]`;
        message += `${update.attendeeEmail} - ${status}\n`;
      }
      
      // Add attendance summary
      const acceptedCount = eventUpdates.filter((u: AttendeeUpdate) => u.newStatus === 'accepted').length;
      const declinedCount = eventUpdates.filter((u: AttendeeUpdate) => u.newStatus === 'declined').length;
      const tentativeCount = eventUpdates.filter((u: AttendeeUpdate) => u.newStatus === 'tentative').length;
      
      message += `\nAttendance: ${acceptedCount} accepted`;
      if (declinedCount > 0) message += `, ${declinedCount} declined`;
      if (tentativeCount > 0) message += `, ${tentativeCount} tentative`;
      
      if (bot) {
        await bot.telegram.sendMessage(chatId, message);
      }
    }
    
  } catch (error) {
    logger.error({ chatId, error }, 'Error sending attendee notifications');
  }
}

export function startAttendeeTracking() {
  if (pollingInterval) {
    logger.warn('Attendee tracking already running');
    return;
  }
  
  logger.info({ intervalMs: POLL_INTERVAL_MS }, 'Starting attendee tracking service');
  
  // Run immediately on startup
  checkAttendeeUpdates();
  
  // Then run every 10 minutes
  pollingInterval = setInterval(checkAttendeeUpdates, POLL_INTERVAL_MS);
}

export function stopAttendeeTracking() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('Stopped attendee tracking service');
  }
}
