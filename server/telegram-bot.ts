import { Telegraf } from 'telegraf';
import { processMessage } from './ai-assistant';
import { storage } from './storage';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN not set - Telegram bot will not start');
}

export const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

// Initialize bot if token exists
if (bot) {
  // Handle /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 Welcome to Aura, your AI personal assistant!\n\n` +
      `I can help you:\n` +
      `• View your schedule\n` +
      `• Check availability\n` +
      `• Book appointments\n` +
      `• Reschedule appointments\n` +
      `• Cancel appointments\n\n` +
      `Just send me a message like "What's my schedule tomorrow?" or "Book a meeting at 2pm"`
    );
  });

  // Handle all text messages
  bot.on('text', async (ctx) => {
    try {
      const chatId = ctx.chat.id.toString();
      const messageText = ctx.message.text;
      const firstName = ctx.from.first_name || '';
      const lastName = ctx.from.last_name || '';
      const username = ctx.from.username || '';
      
      // Save incoming user message
      await storage.createMessage({
        phoneNumber: chatId,
        messageContent: messageText,
        sender: 'user',
        messageType: 'text',
        platform: 'telegram',
        processed: false,
      });

      // Process message with AI
      const aiResponse = await processMessage(messageText, chatId, 'telegram');

      // Save assistant response
      await storage.createMessage({
        phoneNumber: chatId,
        messageContent: aiResponse,
        sender: 'assistant',
        messageType: 'text',
        platform: 'telegram',
        processed: true,
        aiResponse: aiResponse,
      });

      // Send response to user
      await ctx.reply(aiResponse);
    } catch (error) {
      console.error('Error processing Telegram message:', error);
      await ctx.reply('Sorry, I encountered an error processing your message. Please try again.');
    }
  });

  // Error handling
  bot.catch((err: any, ctx: any) => {
    console.error(`Error for ${ctx.updateType}:`, err);
  });

  console.log('Telegram bot initialized successfully');
} else {
  console.log('Telegram bot not initialized - missing BOT_TOKEN');
}

// Setup webhook
export async function setupTelegramWebhook(webhookUrl: string) {
  if (!bot) {
    throw new Error('Telegram bot not initialized');
  }

  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Telegram webhook set to: ${webhookUrl}`);
  } catch (error) {
    console.error('Failed to set Telegram webhook:', error);
    throw error;
  }
}

// Remove webhook (for development with polling)
export async function removeTelegramWebhook() {
  if (!bot) {
    throw new Error('Telegram bot not initialized');
  }

  try {
    await bot.telegram.deleteWebhook();
    console.log('Telegram webhook removed');
  } catch (error) {
    console.error('Failed to remove Telegram webhook:', error);
    throw error;
  }
}
