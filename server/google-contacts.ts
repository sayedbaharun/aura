/**
 * Google Contacts Integration Module
 *
 * Syncs contacts from a designated Google Contacts label to SB-OS People.
 * Uses Google People API v1.
 *
 * Required scopes:
 * - https://www.googleapis.com/auth/contacts.readonly
 *
 * Environment variables:
 * - GOOGLE_CONTACTS_CLIENT_ID (or falls back to GOOGLE_DRIVE_CLIENT_ID)
 * - GOOGLE_CONTACTS_CLIENT_SECRET (or falls back to GOOGLE_DRIVE_CLIENT_SECRET)
 * - GOOGLE_CONTACTS_REFRESH_TOKEN (or falls back to GOOGLE_DRIVE_REFRESH_TOKEN)
 * - GOOGLE_CONTACTS_SYNC_LABEL (optional, defaults to "SB-OS")
 */

import { google, people_v1 } from 'googleapis';
import { retryGoogleAPI } from './retry-utils';
import { logger } from './logger';

// Default label name to sync contacts from
const DEFAULT_SYNC_LABEL = 'SB-OS';

// Types for Google Contacts API responses
export interface GoogleContact {
  resourceName: string;  // e.g., "people/c12345"
  etag: string;
  names?: Array<{
    displayName?: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{
    value?: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value?: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
  birthdays?: Array<{
    date?: {
      year?: number;
      month?: number;
      day?: number;
    };
  }>;
  addresses?: Array<{
    formattedValue?: string;
    city?: string;
    country?: string;
  }>;
  photos?: Array<{
    url?: string;
  }>;
  biographies?: Array<{
    value?: string;
  }>;
  memberships?: Array<{
    contactGroupMembership?: {
      contactGroupResourceName?: string;
    };
  }>;
  urls?: Array<{
    value?: string;
    type?: string;
  }>;
}

export interface GoogleContactLabel {
  resourceName: string;
  name: string;
  groupType: string;
  memberCount?: number;
}

export interface GoogleContactsSyncResult {
  synced: number;
  updated: number;
  skipped: number;
  errors: string[];
  items: Array<{
    googleContactId: string;
    name: string;
    personId?: string;
    action: 'created' | 'updated' | 'skipped';
  }>;
}

/**
 * Create OAuth2 client for Google People API
 */
function createOAuth2Client() {
  // Try Contacts-specific credentials first, then fall back to Drive credentials
  const clientId = process.env.GOOGLE_CONTACTS_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CONTACTS_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CONTACTS_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Contacts OAuth credentials not configured. Set GOOGLE_CONTACTS_CLIENT_ID, GOOGLE_CONTACTS_CLIENT_SECRET, and GOOGLE_CONTACTS_REFRESH_TOKEN (or reuse existing GOOGLE_DRIVE_* or GOOGLE_CALENDAR_* credentials with contacts.readonly scope)');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Get People API client
 */
export async function getPeopleClient(): Promise<people_v1.People> {
  const oauth2Client = createOAuth2Client();
  return google.people({ version: 'v1', auth: oauth2Client });
}

/**
 * Get the configured sync label name
 */
export function getSyncLabelName(): string {
  return process.env.GOOGLE_CONTACTS_SYNC_LABEL || DEFAULT_SYNC_LABEL;
}

/**
 * List all user-created contact groups/labels
 */
export async function getContactLabels(): Promise<GoogleContactLabel[]> {
  return retryGoogleAPI(async () => {
    const people = await getPeopleClient();

    const response = await people.contactGroups.list({
      pageSize: 100,
    });

    const groups = response.data.contactGroups || [];

    const labels = groups
      .filter(g => g.groupType === 'USER_CONTACT_GROUP')  // Only user-created labels
      .map(g => ({
        resourceName: g.resourceName!,
        name: g.name || 'Unnamed',
        groupType: g.groupType!,
        memberCount: g.memberCount,
      }));

    logger.debug({ count: labels.length }, 'Retrieved Google Contacts labels');
    return labels;
  });
}

/**
 * Find a contact group/label by name (case-insensitive)
 */
export async function findLabelByName(labelName: string): Promise<GoogleContactLabel | null> {
  const labels = await getContactLabels();
  const normalizedName = labelName.toLowerCase().trim();
  return labels.find(l => l.name.toLowerCase().trim() === normalizedName) || null;
}

/**
 * Find the configured sync label (SB-OS by default)
 */
export async function findSyncLabel(): Promise<GoogleContactLabel | null> {
  const labelName = getSyncLabelName();
  return findLabelByName(labelName);
}

/**
 * Get all contacts from a specific label/group
 */
export async function getContactsFromLabel(labelResourceName: string): Promise<GoogleContact[]> {
  return retryGoogleAPI(async () => {
    const people = await getPeopleClient();
    const contacts: GoogleContact[] = [];
    let pageToken: string | undefined;

    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,phoneNumbers,organizations,birthdays,addresses,photos,biographies,memberships,urls',
        pageSize: 100,
        pageToken,
      });

      const connections = response.data.connections || [];

      // Filter by label membership
      for (const contact of connections) {
        const memberships = contact.memberships || [];
        const inLabel = memberships.some(
          m => m.contactGroupMembership?.contactGroupResourceName === labelResourceName
        );

        if (inLabel && contact.resourceName && contact.etag) {
          contacts.push({
            resourceName: contact.resourceName,
            etag: contact.etag,
            names: contact.names,
            emailAddresses: contact.emailAddresses,
            phoneNumbers: contact.phoneNumbers,
            organizations: contact.organizations,
            birthdays: contact.birthdays,
            addresses: contact.addresses,
            photos: contact.photos,
            biographies: contact.biographies,
            memberships: contact.memberships,
            urls: contact.urls,
          });
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    logger.info({ count: contacts.length, label: labelResourceName }, 'Retrieved contacts from label');
    return contacts;
  });
}

/**
 * Get all contacts from the configured sync label (SB-OS)
 */
export async function getSyncLabelContacts(): Promise<GoogleContact[]> {
  const label = await findSyncLabel();
  if (!label) {
    const labelName = getSyncLabelName();
    logger.warn({ labelName }, 'Sync label not found in Google Contacts');
    return [];
  }

  return getContactsFromLabel(label.resourceName);
}

/**
 * Get a single contact by resource name
 */
export async function getContact(resourceName: string): Promise<GoogleContact | null> {
  return retryGoogleAPI(async () => {
    const people = await getPeopleClient();

    try {
      const response = await people.people.get({
        resourceName,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,birthdays,addresses,photos,biographies,memberships,urls',
      });

      if (!response.data.resourceName || !response.data.etag) {
        return null;
      }

      return {
        resourceName: response.data.resourceName,
        etag: response.data.etag,
        names: response.data.names,
        emailAddresses: response.data.emailAddresses,
        phoneNumbers: response.data.phoneNumbers,
        organizations: response.data.organizations,
        birthdays: response.data.birthdays,
        addresses: response.data.addresses,
        photos: response.data.photos,
        biographies: response.data.biographies,
        memberships: response.data.memberships,
        urls: response.data.urls,
      };
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  });
}

/**
 * Convert Google Contact to SB-OS Person format
 */
export function googleContactToPerson(contact: GoogleContact): {
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
  googleContactId: string;
  googleEtag: string;
  needsEnrichment: boolean;
} {
  const name = contact.names?.[0]?.displayName ||
    [contact.names?.[0]?.givenName, contact.names?.[0]?.familyName].filter(Boolean).join(' ') ||
    'Unknown';

  const email = contact.emailAddresses?.[0]?.value || null;
  const phone = contact.phoneNumbers?.[0]?.value || null;
  const org = contact.organizations?.[0];
  const birthday = contact.birthdays?.[0]?.date;
  const address = contact.addresses?.[0];
  const photo = contact.photos?.[0]?.url || null;
  const bio = contact.biographies?.[0]?.value || null;

  // Extract LinkedIn URL if present
  const linkedInUrl = contact.urls?.find(u =>
    u.value?.toLowerCase().includes('linkedin.com')
  )?.value || null;

  // Format birthday as YYYY-MM-DD (handle missing year)
  let birthdayStr: string | null = null;
  if (birthday?.month && birthday?.day) {
    const year = birthday.year || 1900;  // Use placeholder year if not provided
    birthdayStr = `${year}-${String(birthday.month).padStart(2, '0')}-${String(birthday.day).padStart(2, '0')}`;
  }

  // Format location
  let location: string | null = null;
  if (address?.formattedValue) {
    location = address.formattedValue;
  } else if (address?.city) {
    location = address.country ? `${address.city}, ${address.country}` : address.city;
  }

  return {
    name,
    email,
    phone,
    company: org?.name || null,
    jobTitle: org?.title || null,
    birthday: birthdayStr,
    location,
    photoUrl: photo,
    linkedIn: linkedInUrl,
    notes: bio,
    googleContactId: contact.resourceName,
    googleEtag: contact.etag,
    needsEnrichment: true,  // New imports always need enrichment
  };
}

/**
 * Check Google Contacts API connection status
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  error?: string;
  labelCount?: number;
  syncLabelName?: string;
  syncLabelFound?: boolean;
  syncLabelMemberCount?: number;
}> {
  try {
    const labels = await getContactLabels();
    const syncLabelName = getSyncLabelName();
    const syncLabel = labels.find(l => l.name.toLowerCase() === syncLabelName.toLowerCase());

    return {
      connected: true,
      labelCount: labels.length,
      syncLabelName,
      syncLabelFound: !!syncLabel,
      syncLabelMemberCount: syncLabel?.memberCount,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Google Contacts connection check failed');
    return {
      connected: false,
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Check if credentials are configured
 */
export function isConfigured(): boolean {
  const clientId = process.env.GOOGLE_CONTACTS_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CONTACTS_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CONTACTS_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  return !!(clientId && clientSecret && refreshToken);
}
