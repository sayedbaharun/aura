/**
 * External Contacts API Integration Module
 *
 * Syncs contacts from an external contacts directory API to SB-OS People.
 * Uses simple API key authentication.
 *
 * Environment variables:
 * - CONTACTS_API_KEY: API key for authentication
 * - CONTACTS_API_URL: Base URL for the contacts API
 */

import { logger } from './logger';

// Read from environment variables (no hardcoded secrets)
const CONTACTS_API_KEY = process.env.CONTACTS_API_KEY;
const CONTACTS_API_URL = process.env.CONTACTS_API_URL;

/**
 * Contact item from external API
 * Matches the SB-OS Person schema
 */
export interface ExternalContact {
  id?: number | string;  // External unique ID (integer from API, stored as string)
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  birthday?: string | null;
  location?: string | null;
  photoUrl?: string | null;
  linkedIn?: string | null;
  notes?: string | null;
  relationship?: string | null;
  importance?: 'inner_circle' | 'key' | 'standard';
  howWeMet?: string | null;
  tags?: string[];
}

export interface ContactsApiSyncResult {
  synced: number;
  updated: number;
  skipped: number;
  errors: string[];
  items: Array<{
    externalId?: string | null;
    name: string;
    personId?: string;
    action: 'created' | 'updated' | 'skipped';
  }>;
}

/**
 * Check if the Contacts API is configured
 */
export function isConfigured(): boolean {
  return !!(CONTACTS_API_KEY && CONTACTS_API_URL);
}

/**
 * Check connection status to the external Contacts API
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  error?: string;
  contactCount?: number;
}> {
  if (!isConfigured()) {
    return {
      connected: false,
      error: 'Contacts API not configured. Set CONTACTS_API_KEY and CONTACTS_API_URL environment variables.',
    };
  }

  try {
    const response = await fetch(`${CONTACTS_API_URL}/api/directory`, {
      headers: {
        'X-API-Key': CONTACTS_API_KEY!,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const items = data.items || [];

    logger.info({ count: items.length }, 'Contacts API connection successful');

    return {
      connected: true,
      contactCount: items.length,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Contacts API connection check failed');
    return {
      connected: false,
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Fetch all contacts from the external API
 */
export async function fetchContacts(): Promise<ExternalContact[]> {
  if (!isConfigured()) {
    throw new Error('Contacts API not configured');
  }

  const url = `${CONTACTS_API_URL}/api/directory`;
  logger.info({ url, hasKey: !!CONTACTS_API_KEY, keyLength: CONTACTS_API_KEY?.length }, 'Fetching contacts from external API');

  const response = await fetch(url, {
    headers: {
      'X-API-Key': CONTACTS_API_KEY!,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, url, errorText }, 'Contacts API fetch failed');
    throw new Error(`Failed to fetch contacts: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const items: ExternalContact[] = data.items || [];

  logger.info({ count: items.length }, 'Fetched contacts from external API');

  return items;
}

/**
 * Convert external contact to SB-OS Person format
 * Since the external API matches Person schema, minimal transformation needed
 */
export function externalContactToPerson(contact: ExternalContact): {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  birthday: string | null;
  location: string | null;
  photoUrl: string | null;
  linkedIn: string | null;
  notes: string | null;
  relationship: string | null;
  importance: 'inner_circle' | 'key' | 'standard';
  howWeMet: string | null;
  externalContactId: string | null;
  needsEnrichment: boolean;
} {
  return {
    name: contact.name || 'Unknown',
    email: contact.email || null,
    phone: contact.phone || null,
    company: contact.company || null,
    jobTitle: contact.jobTitle || null,
    birthday: contact.birthday || null,
    location: contact.location || null,
    photoUrl: contact.photoUrl || null,
    linkedIn: contact.linkedIn || null,
    notes: contact.notes || null,
    relationship: contact.relationship || null,
    importance: contact.importance || 'standard',
    howWeMet: contact.howWeMet || null,
    externalContactId: contact.id != null ? String(contact.id) : null,
    needsEnrichment: true, // New imports need enrichment
  };
}
