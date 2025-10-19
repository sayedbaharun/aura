import type { Request } from 'express';

/**
 * Twilio WhatsApp messaging service
 * Handles sending WhatsApp messages via Twilio API
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

interface SendMessageParams {
  to: string;
  message: string;
  fromNumber: string;
}

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage({ to, message, fromNumber }: SendMessageParams): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('Twilio credentials not configured');
    return false;
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const params = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: `whatsapp:${fromNumber}`,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio API error:', error);
      return false;
    }

    const result = await response.json();
    console.log('Message sent successfully:', result.sid);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

/**
 * Detect webhook type from request
 */
export function detectWebhookType(req: Request): 'twilio' | 'facebook' | 'messagebird' | 'unknown' {
  // Twilio sends TwiML parameters in body
  if (req.body.MessageSid || req.body.SmsSid) {
    return 'twilio';
  }
  
  // Facebook/Meta sends structured JSON
  if (req.body.object === 'whatsapp_business_account') {
    return 'facebook';
  }
  
  // MessageBird sends different JSON structure
  if (req.body.channelId || req.body.type === 'message.created') {
    return 'messagebird';
  }
  
  return 'unknown';
}

/**
 * Extract message data from Twilio webhook
 */
export function extractTwilioMessage(req: Request): { from: string; message: string } | null {
  const from = req.body.From?.replace('whatsapp:', '') || '';
  const message = req.body.Body || '';
  
  if (!from || !message) {
    return null;
  }
  
  return { from, message };
}

/**
 * Extract message data from Facebook webhook
 */
export function extractFacebookMessage(req: Request): { from: string; message: string } | null {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const messageData = change?.value?.messages?.[0];
    
    if (!messageData) {
      return null;
    }
    
    const from = messageData.from || '';
    const message = messageData.text?.body || '';
    
    if (!from || !message) {
      return null;
    }
    
    return { from, message };
  } catch (error) {
    console.error('Error extracting Facebook message:', error);
    return null;
  }
}

/**
 * Extract message data from MessageBird webhook
 */
export function extractMessageBirdMessage(req: Request): { from: string; message: string } | null {
  try {
    const from = req.body.message?.from || '';
    const message = req.body.message?.content?.text || '';
    
    if (!from || !message) {
      return null;
    }
    
    return { from, message };
  } catch (error) {
    console.error('Error extracting MessageBird message:', error);
    return null;
  }
}
