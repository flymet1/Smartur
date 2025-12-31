import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertActivitySchema, insertCapacitySchema, insertReservationSchema } from "@shared/schema";

let genAI: any = null;
try {
  const mod = require("@google/genai");
  if (mod.GoogleGenerativeAI) {
    genAI = new mod.GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");
  }
} catch (err) {
  console.warn("Gemini API not available, falling back to mock responses");
}

// AI function using Gemini API with activity descriptions
async function generateAIResponse(history: any[], context: any) {
  // Build activity descriptions for context
  const activityDescriptions = context.activities
    ?.map((a: any) => `- ${a.name}: ${a.description || "Açıklama yok"}`)
    .join("\n") || "";
  
  // If Gemini is available, use it; otherwise use mock
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // System prompt with activity information
      const systemPrompt = `Sen bir TURİZM REZERVASYONLARI DANIŞMANI'sın. 
Müşterilerle Türkçe konuşarak rezervasyon yardımcılığı yap. 
Kibar, samimi ve profesyonel ol. 
Müşterinin sorularına hızla cevap ver ve rezervasyon yapmalarına yardımcı ol.

Mevcut Aktiviteler:
${activityDescriptions}

Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.`;

      // Convert message history to Gemini format
      const contents = history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const result = await model.generateContent({
        contents,
        systemInstruction: systemPrompt
      });

      const responseText = result.response.text();
      return responseText || "Merhaba! Nasıl yardımcı olabilirim?";
    } catch (error) {
      console.error("Gemini API error:", error);
    }
  }

  // Mock response with activity information
  return `Merhaba! Bizim aktivitelerimiz şunlardır:\n\n${activityDescriptions}\n\nBunlardan hangisine ilgi duyuyorsunuz?`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Activities ===
  app.get(api.activities.list.path, async (req, res) => {
    const items = await storage.getActivities();
    res.json(items);
  });

  app.post(api.activities.create.path, async (req, res) => {
    try {
      const input = api.activities.create.input.parse(req.body);
      const item = await storage.createActivity(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) res.status(400).json(err.errors);
      else throw err;
    }
  });

  app.put(api.activities.update.path, async (req, res) => {
    try {
      const input = api.activities.update.input.parse(req.body);
      const item = await storage.updateActivity(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Invalid input" });
    }
  });

  app.delete(api.activities.delete.path, async (req, res) => {
    await storage.deleteActivity(Number(req.params.id));
    res.status(204).send();
  });

  // Capacity update endpoint
  app.patch("/api/capacity/:id", async (req, res) => {
    try {
      const { totalSlots } = req.body;
      const item = await storage.updateCapacity(Number(req.params.id), totalSlots);
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Kapasite güncellenemedi" });
    }
  });

  // === Capacity ===
  app.get(api.capacity.list.path, async (req, res) => {
    const { date, activityId } = req.query;
    const items = await storage.getCapacity(
      date as string, 
      activityId ? Number(activityId) : undefined
    );
    res.json(items);
  });

  app.post(api.capacity.create.path, async (req, res) => {
    const input = api.capacity.create.input.parse(req.body);
    const item = await storage.createCapacity(input);
    res.status(201).json(item);
  });

  // === Reservations ===
  app.get(api.reservations.list.path, async (req, res) => {
    const items = await storage.getReservations();
    res.json(items);
  });

  app.post(api.reservations.create.path, async (req, res) => {
    const input = api.reservations.create.input.parse(req.body);
    const item = await storage.createReservation(input);
    
    // Decrease capacity
    const capacitySlots = await storage.getCapacity(item.date, item.activityId || 0);
    // Logic to find exact time slot and update would go here
    // For MVP/Lite, we just create the reservation
    
    res.status(201).json(item);
  });

  app.get(api.reservations.stats.path, async (req, res) => {
    const stats = await storage.getReservationsStats();
    res.json(stats);
  });

  // === Webhooks ===
  app.post(api.webhooks.woocommerce.path, async (req, res) => {
    // Basic WooCommerce webhook handler
    const order = req.body;
    console.log("Received WooCommerce Order:", order.id);
    
    // Example logic: Extract items and create reservations
    // const reservation = await storage.createReservation({...});
    
    res.json({ received: true });
  });

  app.post(api.webhooks.whatsapp.path, async (req, res) => {
    const { Body, From } = req.body;
    
    // Save user message
    if (From && Body) {
      await storage.addMessage({
        phone: From,
        content: Body,
        role: "user"
      });

      // Get history
      const history = await storage.getMessages(From, 5);
      
      // Get context (activities, etc)
      const activities = await storage.getActivities();
      
      // Generate AI response
      const aiResponse = await generateAIResponse(history, { activities });
      
      // Save AI response
      await storage.addMessage({
        phone: From,
        content: aiResponse,
        role: "assistant"
      });

      // Return TwiML
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${aiResponse}</Message></Response>`);
    } else {
      res.status(400).send("Missing Body or From");
    }
  });

  return httpServer;
}

// Seed function
async function seedDatabase() {
  const activities = await storage.getActivities();
  if (activities.length === 0) {
    await storage.createActivity({
      name: "ATV Safari",
      description: "Doğa ile iç içe heyecanlı bir tur.",
      price: 500,
      durationMinutes: 60,
      active: true
    });
    await storage.createActivity({
      name: "Yamaç Paraşütü",
      description: "Ölüdeniz manzaralı uçuş.",
      price: 1500,
      durationMinutes: 45,
      active: true
    });
  }
}

// Call seed (in a real app, do this more carefully)
seedDatabase().catch(console.error);
