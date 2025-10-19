import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWhatsappMessageSchema, insertAppointmentSchema, insertAssistantSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { processMessage } from "./ai-assistant";
import { 
  detectWebhookType, 
  extractTwilioMessage, 
  extractFacebookMessage, 
  extractMessageBirdMessage 
} from "./twilio-whatsapp";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create a message
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertWhatsappMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid message data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create message" });
      }
    }
  });

  // Get messages by phone number
  app.get("/api/messages/:phoneNumber", async (req, res) => {
    try {
      const messages = await storage.getMessagesByPhone(req.params.phoneNumber);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get all appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Create an appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });

  // Get a specific appointment
  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  // Update an appointment
  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const updates = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, updates);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update appointment" });
      }
    }
  });

  // Cancel an appointment
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.cancelAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  // Get assistant settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update assistant settings
  app.put("/api/settings", async (req, res) => {
    try {
      const updates = insertAssistantSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid settings data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  // WhatsApp Webhook - Supports Twilio, Facebook/Meta, and MessageBird/Bird
  app.post("/api/whatsapp-webhook", async (req, res) => {
    try {
      // Detect webhook type
      const webhookType = detectWebhookType(req);
      
      // Extract message data based on type
      let messageData: { from: string; message: string } | null = null;
      
      if (webhookType === 'twilio') {
        messageData = extractTwilioMessage(req);
      } else if (webhookType === 'facebook') {
        messageData = extractFacebookMessage(req);
      } else if (webhookType === 'messagebird') {
        messageData = extractMessageBirdMessage(req);
      }

      if (!messageData) {
        console.log(`Invalid ${webhookType} webhook data:`, req.body);
        return res.status(400).json({ error: "Invalid webhook data" });
      }

      const { from: phoneNumber, message: messageText } = messageData;
      console.log(`Received ${webhookType} message from ${phoneNumber}: ${messageText}`);

      // Store the incoming user message
      await storage.createMessage({
        phoneNumber,
        messageContent: messageText,
        sender: "user",
        messageType: "text",
        processed: false,
      });

      // Process message with AI assistant
      const aiResponse = await processMessage(phoneNumber, messageText);

      // Store AI response
      await storage.createMessage({
        phoneNumber,
        messageContent: aiResponse,
        sender: "assistant",
        messageType: "text",
        processed: true,
      });

      // Return response in appropriate format
      if (webhookType === 'twilio') {
        // Return TwiML XML format for Twilio
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
      } else if (webhookType === 'facebook') {
        // Facebook expects 200 OK, actual reply is sent via API
        res.status(200).json({ success: true });
      } else if (webhookType === 'messagebird') {
        // MessageBird expects JSON response
        res.status(200).json({
          content: {
            text: aiResponse
          }
        });
      } else {
        // Generic response
        res.status(200).json({ message: aiResponse });
      }
    } catch (error) {
      console.error("Webhook error:", error);
      
      // Return appropriate error format
      if (req.body.From || req.body.from) {
        res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble processing your request. Please try again later.</Message>
</Response>`);
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
