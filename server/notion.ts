import { Client } from '@notionhq/client';
import { logger } from './logger';

let connectionSettings: any;
let tokenRefreshPromise: Promise<string> | null = null;

// TTL buffer: Refresh token 5 minutes before expiry to avoid edge cases
const TOKEN_TTL_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// Helper to extract access token from connector response
function extractAccessToken(settings: any): string | null {
  return settings?.access_token || settings?.oauth?.credentials?.access_token || null;
}

// Helper to extract expiry timestamp from connector response
function extractExpiryTimestamp(settings: any): number | null {
  if (settings?.expires_at) {
    return new Date(settings.expires_at).getTime();
  }
  if (settings?.oauth?.credentials?.expiry_date) {
    const expiryDate = settings.oauth.credentials.expiry_date;
    return typeof expiryDate === 'number' ? expiryDate : new Date(expiryDate).getTime();
  }
  return null;
}

async function getAccessToken() {
  // Check if token is still valid with TTL buffer
  if (connectionSettings?.settings) {
    const expiresAt = extractExpiryTimestamp(connectionSettings.settings);
    const cachedToken = extractAccessToken(connectionSettings.settings);
    
    if (expiresAt && cachedToken) {
      const now = Date.now();
      if (expiresAt - now > TOKEN_TTL_BUFFER_MS) {
        return cachedToken;
      }
    }
  }
  
  // If there's already a token refresh in progress, wait for it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  // Start token refresh with mutex
  tokenRefreshPromise = refreshAccessToken();
  
  try {
    const token = await tokenRefreshPromise;
    return token;
  } finally {
    tokenRefreshPromise = null;
  }
}

async function refreshAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = extractAccessToken(connectionSettings?.settings);

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  
  const expiresAt = extractExpiryTimestamp(connectionSettings.settings);
  logger.debug({ 
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'unknown',
    hasToken: true
  }, 'Refreshed Notion access token');
  
  return accessToken;
}

export async function getUncachableNotionClient() {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

// Notion Service Functions

/**
 * Search across all Notion pages and databases
 */
export async function searchNotion(query: string, limit: number = 10) {
  try {
    const notion = await getUncachableNotionClient();
    
    const response = await notion.search({
      query,
      page_size: limit,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    logger.info({ query, resultsCount: response.results.length }, 'Searched Notion');
    return response.results;
  } catch (error: any) {
    logger.error({ error: error.message, query }, 'Failed to search Notion');
    throw new Error(`Notion search failed: ${error.message}`);
  }
}

/**
 * Create a new page in Notion
 */
export async function createNotionPage(params: {
  parentId: string;
  title: string;
  content?: string;
  properties?: any;
}) {
  try {
    const notion = await getUncachableNotionClient();
    
    // Build page properties
    const pageProperties: any = {
      title: {
        title: [
          {
            text: {
              content: params.title
            }
          }
        ]
      }
    };

    // Add custom properties if provided
    if (params.properties) {
      Object.assign(pageProperties, params.properties);
    }

    // Build children blocks (content)
    const children: any[] = [];
    if (params.content) {
      // Split content into 2000 character chunks (Notion API limit)
      const chunks = splitTextIntoChunks(params.content, 2000);
      for (const chunk of chunks) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: chunk
                }
              }
            ]
          }
        });
      }
    }

    const response = await notion.pages.create({
      parent: { page_id: params.parentId },
      properties: pageProperties,
      children: children.length > 0 ? children : undefined
    });

    logger.info({ 
      pageId: response.id, 
      title: params.title 
    }, 'Created Notion page');
    
    return response;
  } catch (error: any) {
    logger.error({ error: error.message, params }, 'Failed to create Notion page');
    throw new Error(`Failed to create Notion page: ${error.message}`);
  }
}

/**
 * Create a new database entry
 */
export async function createDatabaseEntry(params: {
  databaseId: string;
  properties: any;
}) {
  try {
    const notion = await getUncachableNotionClient();
    
    const response = await notion.pages.create({
      parent: { database_id: params.databaseId },
      properties: params.properties
    });

    logger.info({ 
      pageId: response.id, 
      databaseId: params.databaseId 
    }, 'Created Notion database entry');
    
    return response;
  } catch (error: any) {
    logger.error({ error: error.message, params }, 'Failed to create database entry');
    throw new Error(`Failed to create database entry: ${error.message}`);
  }
}

/**
 * Query a Notion database
 */
export async function queryDatabase(params: {
  databaseId: string;
  filter?: any;
  sorts?: any[];
  limit?: number;
}) {
  try {
    const notion = await getUncachableNotionClient();
    
    const response = await notion.dataSources.query({
      data_source_id: params.databaseId,
      filter: params.filter,
      sorts: params.sorts,
      page_size: params.limit || 100
    });

    logger.info({ 
      databaseId: params.databaseId, 
      resultsCount: response.results.length 
    }, 'Queried Notion database');
    
    return response.results;
  } catch (error: any) {
    logger.error({ error: error.message, params }, 'Failed to query database');
    throw new Error(`Failed to query database: ${error.message}`);
  }
}

/**
 * Update an existing page
 */
export async function updateNotionPage(params: {
  pageId: string;
  properties?: any;
  archived?: boolean;
}) {
  try {
    const notion = await getUncachableNotionClient();
    
    const updateParams: any = {
      page_id: params.pageId
    };

    if (params.properties) {
      updateParams.properties = params.properties;
    }

    if (params.archived !== undefined) {
      updateParams.archived = params.archived;
    }

    const response = await notion.pages.update(updateParams);

    logger.info({ 
      pageId: params.pageId,
      archived: params.archived
    }, 'Updated Notion page');
    
    return response;
  } catch (error: any) {
    logger.error({ error: error.message, params }, 'Failed to update Notion page');
    throw new Error(`Failed to update Notion page: ${error.message}`);
  }
}

/**
 * Get page details
 */
export async function getNotionPage(pageId: string) {
  try {
    const notion = await getUncachableNotionClient();
    const response = await notion.pages.retrieve({ page_id: pageId });
    
    logger.debug({ pageId }, 'Retrieved Notion page');
    return response;
  } catch (error: any) {
    logger.error({ error: error.message, pageId }, 'Failed to get Notion page');
    throw new Error(`Failed to get Notion page: ${error.message}`);
  }
}

/**
 * Get database details
 */
export async function getNotionDatabase(databaseId: string) {
  try {
    const notion = await getUncachableNotionClient();
    const response = await notion.databases.retrieve({ database_id: databaseId });
    
    logger.debug({ databaseId }, 'Retrieved Notion database');
    return response;
  } catch (error: any) {
    logger.error({ error: error.message, databaseId }, 'Failed to get Notion database');
    throw new Error(`Failed to get Notion database: ${error.message}`);
  }
}

/**
 * Append content to an existing page
 */
export async function appendToPage(params: {
  pageId: string;
  content: string;
}) {
  try {
    const notion = await getUncachableNotionClient();
    
    // Split content into 2000 character chunks
    const chunks = splitTextIntoChunks(params.content, 2000);
    const children: any[] = chunks.map(chunk => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: chunk
            }
          }
        ]
      }
    }));

    const response = await notion.blocks.children.append({
      block_id: params.pageId,
      children
    });

    logger.info({ pageId: params.pageId }, 'Appended content to Notion page');
    return response;
  } catch (error: any) {
    logger.error({ error: error.message, params }, 'Failed to append to page');
    throw new Error(`Failed to append to page: ${error.message}`);
  }
}

// Helper function to split text into chunks respecting Notion's 2000 char limit
function splitTextIntoChunks(text: string, chunkSize: number = 2000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
