import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWhatsappMessageSchema, insertAppointmentSchema, insertClinicSettingsSchema } from "@shared/schema";
import { z } from "zod";

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

  // Get clinic settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update clinic settings
  app.put("/api/settings", async (req, res) => {
    try {
      const updates = insertClinicSettingsSchema.partial().parse(req.body);
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

  // WhatsApp Webhook - This endpoint will receive messages from Twilio or Facebook
  app.post("/api/whatsapp-webhook", async (req, res) => {
    try {
      let phoneNumber: string | undefined;
      let messageText: string | undefined;

      // Parse different webhook formats
      if (req.body.From || req.body.from) {
        // Twilio format
        phoneNumber = req.body.From || req.body.from;
        messageText = req.body.Body || req.body.body;
      } else if (req.body.entry && Array.isArray(req.body.entry) && req.body.entry[0]?.changes) {
        // Facebook/Meta format
        const changes = req.body.entry[0].changes;
        if (changes && Array.isArray(changes) && changes[0]?.value?.messages) {
          const message = changes[0].value.messages[0];
          phoneNumber = message.from;
          messageText = message.text?.body;
        }
      }

      if (!phoneNumber || !messageText) {
        return res.status(400).json({ error: "Invalid webhook data" });
      }

      // Store the incoming user message
      await storage.createMessage({
        phoneNumber,
        messageContent: messageText,
        sender: "user",
        messageType: "text",
        processed: false,
      });

      // Get clinic settings for AI context
      const settings = await storage.getSettings();
      
      // Get conversation history
      const conversationHistory = await storage.getMessagesByPhone(phoneNumber, 20);

      // Build AI system prompt
      const clinicInfo = settings ? `
Clinic: ${settings.clinicName}
${settings.clinicAddress ? `Address: ${settings.clinicAddress}` : ''}
${settings.clinicPhone ? `Phone: ${settings.clinicPhone}` : ''}
${settings.clinicEmail ? `Email: ${settings.clinicEmail}` : ''}
${settings.workingHours ? `Hours: ${settings.workingHours}` : ''}
${settings.services ? `Services: ${settings.services.join(', ')}` : ''}
${settings.aboutClinic ? `About: ${settings.aboutClinic}` : ''}
      `.trim() : 'Clinic information not configured yet.';

      const systemPrompt = `You are Sarah, a friendly and professional AI receptionist for ${settings?.clinicName || 'the clinic'}. Help patients by answering questions about services, hours, and booking appointments. Use clinic info: ${clinicInfo}. Be warm, concise, and professional.`;

      // Prepare conversation messages for AI
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.reverse().map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.messageContent,
        })),
        { role: "user", content: messageText },
      ];

      // Call Lovable AI with tool calling
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp",
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "check_availability",
                description: "Check available appointment slots for a specific date or date range",
                parameters: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "The date to check availability for (YYYY-MM-DD format)",
                    },
                    appointmentType: {
                      type: "string",
                      description: "Type of appointment (e.g., cleaning, consultation)",
                    },
                  },
                  required: ["date"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "view_appointments",
                description: "View existing appointments for a patient by phone number",
                parameters: {
                  type: "object",
                  properties: {
                    phoneNumber: {
                      type: "string",
                      description: "The patient's phone number",
                    },
                  },
                  required: ["phoneNumber"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "book_appointment",
                description: "Book a new appointment for a patient",
                parameters: {
                  type: "object",
                  properties: {
                    phoneNumber: {
                      type: "string",
                      description: "Patient's phone number",
                    },
                    patientName: {
                      type: "string",
                      description: "Patient's full name",
                    },
                    appointmentDate: {
                      type: "string",
                      description: "Date and time for the appointment (ISO format)",
                    },
                    appointmentType: {
                      type: "string",
                      description: "Type of appointment",
                    },
                    notes: {
                      type: "string",
                      description: "Additional notes or preferences",
                    },
                  },
                  required: ["phoneNumber", "patientName", "appointmentDate", "appointmentType"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "cancel_appointment",
                description: "Cancel an existing appointment",
                parameters: {
                  type: "object",
                  properties: {
                    appointmentId: {
                      type: "string",
                      description: "The ID of the appointment to cancel",
                    },
                  },
                  required: ["appointmentId"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "reschedule_appointment",
                description: "Reschedule an existing appointment to a new date/time",
                parameters: {
                  type: "object",
                  properties: {
                    appointmentId: {
                      type: "string",
                      description: "The ID of the appointment to reschedule",
                    },
                    newAppointmentDate: {
                      type: "string",
                      description: "New date and time for the appointment (ISO format)",
                    },
                  },
                  required: ["appointmentId", "newAppointmentDate"],
                },
              },
            },
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      
      if (!choice) {
        throw new Error("No response from AI");
      }

      let finalResponse = choice.message.content || "I'm here to help! How can I assist you today?";

      // Handle tool calls if present
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        for (const toolCall of choice.message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          switch (functionName) {
            case "check_availability":
              // Simple availability check - in real implementation, check actual calendar
              finalResponse = `We have several openings available on ${args.date}. Would you like to book a morning or afternoon slot?`;
              break;

            case "view_appointments":
              const userAppointments = await storage.getAppointments();
              const filtered = userAppointments.filter(apt => apt.phoneNumber === args.phoneNumber && apt.status !== 'cancelled');
              if (filtered.length === 0) {
                finalResponse = "I don't see any upcoming appointments for your number. Would you like to book one?";
              } else {
                const aptList = filtered.map(apt => 
                  `${apt.appointmentType || 'Appointment'} on ${apt.appointmentDate ? new Date(apt.appointmentDate).toLocaleDateString() : 'TBD'}`
                ).join(', ');
                finalResponse = `You have the following appointments: ${aptList}`;
              }
              break;

            case "book_appointment":
              const newAppointment = await storage.createAppointment({
                phoneNumber: args.phoneNumber,
                patientName: args.patientName,
                appointmentDate: new Date(args.appointmentDate),
                appointmentType: args.appointmentType,
                notes: args.notes || null,
                status: "confirmed",
              });
              finalResponse = `Great! I've booked your ${args.appointmentType} appointment for ${new Date(args.appointmentDate).toLocaleString()}. You'll receive a confirmation shortly.`;
              break;

            case "cancel_appointment":
              await storage.cancelAppointment(args.appointmentId);
              finalResponse = "Your appointment has been cancelled. Let me know if you'd like to reschedule.";
              break;

            case "reschedule_appointment":
              await storage.updateAppointment(args.appointmentId, {
                appointmentDate: new Date(args.newAppointmentDate),
              });
              finalResponse = `Your appointment has been rescheduled to ${new Date(args.newAppointmentDate).toLocaleString()}.`;
              break;
          }
        }
      }

      // Store AI response
      await storage.createMessage({
        phoneNumber,
        messageContent: finalResponse,
        sender: "assistant",
        messageType: "text",
        aiResponse: JSON.stringify(aiData),
        processed: true,
      });

      // Return TwiML XML format for WhatsApp
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${finalResponse.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble processing your request. Please try again later.</Message>
</Response>`);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
