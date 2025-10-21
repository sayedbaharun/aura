import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: Date;
  labelIds?: string[];
  isUnread: boolean;
}

export async function listMessages(options: {
  maxResults?: number;
  query?: string;
  labelIds?: string[];
}): Promise<EmailMessage[]> {
  const gmail = await getUncachableGmailClient();
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: options.maxResults || 10,
    q: options.query,
    labelIds: options.labelIds,
  });

  const messages = response.data.messages || [];
  
  const fullMessages: EmailMessage[] = [];
  for (const message of messages) {
    if (!message.id) continue;
    
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full',
    });

    const headers = fullMessage.data.payload?.headers || [];
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
    
    // Helper function to decode Gmail's URL-safe base64
    const decodeBase64Url = (data: string): string => {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return Buffer.from(paddedBase64, 'base64').toString('utf-8');
    };
    
    let body = '';
    if (fullMessage.data.payload?.body?.data) {
      body = decodeBase64Url(fullMessage.data.payload.body.data);
    } else if (fullMessage.data.payload?.parts) {
      const textPart = fullMessage.data.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = decodeBase64Url(textPart.body.data);
      }
    }

    const isUnread = fullMessage.data.labelIds?.includes('UNREAD') || false;

    fullMessages.push({
      id: message.id,
      threadId: fullMessage.data.threadId || '',
      from,
      to,
      subject,
      snippet: fullMessage.data.snippet || '',
      body,
      date: new Date(dateStr),
      labelIds: fullMessage.data.labelIds || undefined,
      isUnread,
    });
  }

  return fullMessages;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const message = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      '',
      options.body,
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: options.threadId || undefined,
      },
    });

    return {
      success: true,
      messageId: response.data.id || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export async function searchEmails(query: string, maxResults: number = 10): Promise<EmailMessage[]> {
  return listMessages({ query, maxResults });
}

export async function getUnreadCount(): Promise<number> {
  const gmail = await getUncachableGmailClient();
  
  const response = await gmail.users.labels.get({
    userId: 'me',
    id: 'UNREAD',
  });

  return response.data.messagesUnread || 0;
}

export async function markAsRead(messageIds: string[]): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.messages.batchModify({
    userId: 'me',
    requestBody: {
      ids: messageIds,
      removeLabelIds: ['UNREAD'],
    },
  });
}

export async function addLabel(messageIds: string[], labelId: string): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.messages.batchModify({
    userId: 'me',
    requestBody: {
      ids: messageIds,
      addLabelIds: [labelId],
    },
  });
}
