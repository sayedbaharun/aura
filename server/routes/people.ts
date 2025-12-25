/**
 * People Routes
 * CRUD operations for people/relationships CRM
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertPersonSchema } from "@shared/schema";
import { z } from "zod";
import * as googleContacts from "../google-contacts";
import * as contactsApi from "../contacts-api";

const router = Router();

// Get all people
router.get("/", async (req: Request, res: Response) => {
  try {
    const relationship = req.query.relationship as string;
    const importance = req.query.importance as string;
    const ventureId = req.query.ventureId as string;
    const needsEnrichment = req.query.needsEnrichment === 'true' ? true :
                           req.query.needsEnrichment === 'false' ? false : undefined;

    const people = await storage.getPeople({ relationship, importance, ventureId, needsEnrichment });
    res.json(people);
  } catch (error) {
    logger.error({ error }, "Error fetching people");
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// Get stale relationships (need contact)
router.get("/stale", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stalePeople = await storage.getStalePeople(today);
    res.json(stalePeople);
  } catch (error) {
    logger.error({ error }, "Error fetching stale people");
    res.status(500).json({ error: "Failed to fetch stale people" });
  }
});

// Get upcoming follow-ups
router.get("/upcoming", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const days = parseInt(req.query.days as string) || 7;
    const upcoming = await storage.getUpcomingFollowUps(today, days);
    res.json(upcoming);
  } catch (error) {
    logger.error({ error }, "Error fetching upcoming follow-ups");
    res.status(500).json({ error: "Failed to fetch upcoming follow-ups" });
  }
});

// Get single person
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const person = await storage.getPerson(req.params.id);
    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json(person);
  } catch (error) {
    logger.error({ error }, "Error fetching person");
    res.status(500).json({ error: "Failed to fetch person" });
  }
});

// Create person
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertPersonSchema.parse(req.body);
    const person = await storage.createPerson(validatedData);
    res.status(201).json(person);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid person data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating person");
      res.status(500).json({ error: "Failed to create person" });
    }
  }
});

// Update person
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertPersonSchema.partial().parse(req.body);
    const person = await storage.updatePerson(req.params.id, updates);
    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json(person);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid person data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating person");
      res.status(500).json({ error: "Failed to update person" });
    }
  }
});

// Log contact with person
router.post("/:id/contacted", async (req: Request, res: Response) => {
  try {
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const person = await storage.logContact(req.params.id, date);
    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json(person);
  } catch (error) {
    logger.error({ error }, "Error logging contact");
    res.status(500).json({ error: "Failed to log contact" });
  }
});

// Delete person
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deletePerson(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting person");
    res.status(500).json({ error: "Failed to delete person" });
  }
});

// ============================================================================
// GOOGLE CONTACTS INTEGRATION
// ============================================================================

// Check Google Contacts connection status
router.get("/google-contacts/status", async (req: Request, res: Response) => {
  try {
    if (!googleContacts.isConfigured()) {
      return res.json({
        configured: false,
        connected: false,
        error: "Google Contacts not configured. Set GOOGLE_CONTACTS_* environment variables.",
      });
    }

    const status = await googleContacts.checkConnection();
    res.json({
      configured: true,
      ...status,
    });
  } catch (error) {
    logger.error({ error }, "Error checking Google Contacts status");
    res.status(500).json({ error: "Failed to check Google Contacts status" });
  }
});

// Get available Google Contacts labels
router.get("/google-contacts/labels", async (req: Request, res: Response) => {
  try {
    if (!googleContacts.isConfigured()) {
      return res.status(400).json({ error: "Google Contacts not configured" });
    }

    const labels = await googleContacts.getContactLabels();
    res.json(labels);
  } catch (error) {
    logger.error({ error }, "Error fetching Google Contacts labels");
    res.status(500).json({ error: "Failed to fetch labels" });
  }
});

// Sync contacts from Google Contacts (SB-OS label)
router.post("/google-contacts/sync", async (req: Request, res: Response) => {
  try {
    if (!googleContacts.isConfigured()) {
      return res.status(400).json({ error: "Google Contacts not configured" });
    }

    const contacts = await googleContacts.getSyncLabelContacts();

    const results = {
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      items: [] as Array<{
        googleContactId: string;
        name: string;
        personId?: string;
        action: 'created' | 'updated' | 'skipped';
      }>,
    };

    for (const contact of contacts) {
      try {
        const personData = googleContacts.googleContactToPerson(contact);

        // Check if person already exists by Google Contact ID
        let existingPerson = await storage.getPersonByGoogleId(contact.resourceName);

        // If not found by Google ID, try by email
        if (!existingPerson && personData.email) {
          existingPerson = await storage.getPersonByEmail(personData.email);
        }

        if (existingPerson) {
          // Check if etag changed (contact was updated in Google)
          if (existingPerson.googleEtag !== contact.etag) {
            // Update existing person
            const updated = await storage.updatePerson(existingPerson.id, {
              ...personData,
              // Don't overwrite local enrichments
              notes: existingPerson.notes || personData.notes,
              relationship: existingPerson.relationship,
              importance: existingPerson.importance,
              contactFrequency: existingPerson.contactFrequency,
              howWeMet: existingPerson.howWeMet,
              ventureId: existingPerson.ventureId,
              lastContactDate: existingPerson.lastContactDate,
              nextFollowUp: existingPerson.nextFollowUp,
              needsEnrichment: existingPerson.needsEnrichment,
            });
            results.updated++;
            results.items.push({
              googleContactId: contact.resourceName,
              name: personData.name,
              personId: updated?.id,
              action: 'updated',
            });
          } else {
            results.skipped++;
            results.items.push({
              googleContactId: contact.resourceName,
              name: personData.name,
              personId: existingPerson.id,
              action: 'skipped',
            });
          }
        } else {
          // Create new person
          const newPerson = await storage.createPerson(personData);
          results.synced++;
          results.items.push({
            googleContactId: contact.resourceName,
            name: personData.name,
            personId: newPerson.id,
            action: 'created',
          });
        }
      } catch (error: any) {
        results.errors.push(`Error syncing ${contact.resourceName}: ${error.message}`);
      }
    }

    res.json(results);
  } catch (error) {
    logger.error({ error }, "Error syncing Google Contacts");
    res.status(500).json({ error: "Failed to sync Google Contacts" });
  }
});

// ============================================================================
// EXTERNAL CONTACTS API INTEGRATION
// ============================================================================

// Check External Contacts API connection status
router.get("/contacts-api/status", async (req: Request, res: Response) => {
  try {
    if (!contactsApi.isConfigured()) {
      return res.json({
        configured: false,
        connected: false,
        error: "Contacts API not configured. Set CONTACTS_API_KEY and CONTACTS_API_URL environment variables.",
      });
    }

    const status = await contactsApi.checkConnection();
    res.json({
      configured: true,
      ...status,
    });
  } catch (error) {
    logger.error({ error }, "Error checking Contacts API status");
    res.status(500).json({ error: "Failed to check Contacts API status" });
  }
});

// Sync contacts from External Contacts API
router.post("/contacts-api/sync", async (req: Request, res: Response) => {
  try {
    if (!contactsApi.isConfigured()) {
      return res.status(400).json({ error: "Contacts API not configured" });
    }

    const contacts = await contactsApi.fetchContacts();

    const results: contactsApi.ContactsApiSyncResult = {
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      items: [],
    };

    for (const contact of contacts) {
      try {
        const personData = contactsApi.externalContactToPerson(contact);
        const externalIdStr = contact.id != null ? String(contact.id) : null;

        // Check if person already exists by external ID (if available)
        let existingPerson: any = null;
        if (externalIdStr) {
          existingPerson = await storage.getPersonByExternalId(externalIdStr);
        }

        // If not found by external ID, try by email
        if (!existingPerson && personData.email) {
          existingPerson = await storage.getPersonByEmail(personData.email);
        }

        if (existingPerson) {
          // Update existing person with new data from external API
          // But preserve local enrichments
          const updated = await storage.updatePerson(existingPerson.id, {
            ...personData,
            // Don't overwrite local enrichments
            notes: existingPerson.notes || personData.notes,
            relationship: existingPerson.relationship || personData.relationship,
            importance: existingPerson.importance || personData.importance,
            contactFrequency: existingPerson.contactFrequency,
            howWeMet: existingPerson.howWeMet || personData.howWeMet,
            ventureId: existingPerson.ventureId,
            lastContactDate: existingPerson.lastContactDate,
            nextFollowUp: existingPerson.nextFollowUp,
            needsEnrichment: existingPerson.needsEnrichment,
          });
          results.updated++;
          results.items.push({
            externalId: externalIdStr,
            name: personData.name,
            personId: updated?.id,
            action: 'updated',
          });
        } else {
          // Create new person
          const newPerson = await storage.createPerson(personData);
          results.synced++;
          results.items.push({
            externalId: externalIdStr,
            name: personData.name,
            personId: newPerson.id,
            action: 'created',
          });
        }
      } catch (error: any) {
        results.errors.push(`Error syncing contact ${contact.name || contact.id}: ${error.message}`);
      }
    }

    res.json(results);
  } catch (error) {
    logger.error({ error }, "Error syncing from Contacts API");
    res.status(500).json({ error: "Failed to sync from Contacts API" });
  }
});

export default router;
