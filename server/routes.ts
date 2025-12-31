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

  // Detailed stats with period filter
  app.get("/api/reservations/detailed-stats", async (req, res) => {
    const period = (req.query.period as string) || 'weekly';
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: "Invalid period" });
    }
    const stats = await storage.getDetailedStats(period as any);
    res.json(stats);
  });

  // Date details for click-through analysis
  app.get("/api/reservations/date-details", async (req, res) => {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: "Date parameter required" });
    }
    const details = await storage.getDateDetails(date);
    res.json(details);
  });

  // === Webhooks ===
  app.post(api.webhooks.woocommerce.path, async (req, res) => {
    try {
      const order = req.body;
      console.log("Received WooCommerce Order:", order.id);
      
      // Get all activities for matching
      const activities = await storage.getActivities();
      
      // Helper: Normalize text for Turkish locale matching
      const normalizeText = (text: string): string => {
        if (!text) return '';
        
        // Turkish-specific character replacements (handle all variants)
        const turkishMap: Record<string, string> = {
          'ı': 'i', 'İ': 'i', 'I': 'i',
          'ğ': 'g', 'Ğ': 'g',
          'ü': 'u', 'Ü': 'u',
          'ş': 's', 'Ş': 's',
          'ö': 'o', 'Ö': 'o',
          'ç': 'c', 'Ç': 'c'
        };
        
        // Apply Turkish locale lowercase first, then map special chars
        let normalized = text.toLocaleLowerCase('tr-TR');
        
        for (const [from, to] of Object.entries(turkishMap)) {
          normalized = normalized.split(from).join(to);
        }
        
        return normalized
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
          .replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      // Helper: Extract tokens for comparison
      const getTokens = (text: string): string[] => {
        return normalizeText(text).split(' ').filter(t => t.length > 2);
      };
      
      // Helper: Calculate token overlap score
      const tokenOverlapScore = (tokens1: string[], tokens2: string[]): number => {
        if (tokens1.length === 0 || tokens2.length === 0) return 0;
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);
        let overlap = 0;
        tokens1.forEach(t => {
          if (set2.has(t)) overlap++;
        });
        // Return percentage of smaller set that overlaps
        return overlap / Math.min(set1.size, set2.size);
      };
      
      // Helper: Find matching activity by name or aliases
      const findActivity = (productName: string) => {
        const productTokens = getTokens(productName);
        if (productTokens.length === 0) return null;
        
        let bestMatch: typeof activities[0] | null = null;
        let bestScore = 0;
        const THRESHOLD = 0.5; // At least 50% token overlap required
        
        for (const activity of activities) {
          // Check main name
          const activityTokens = getTokens(activity.name);
          const score = tokenOverlapScore(productTokens, activityTokens);
          
          if (score > bestScore && score >= THRESHOLD) {
            bestScore = score;
            bestMatch = activity;
          }
          
          // Check aliases
          if (activity.nameAliases) {
            try {
              const aliases: string[] = JSON.parse(activity.nameAliases);
              for (const alias of aliases) {
                const aliasTokens = getTokens(alias);
                const aliasScore = tokenOverlapScore(productTokens, aliasTokens);
                if (aliasScore > bestScore && aliasScore >= THRESHOLD) {
                  bestScore = aliasScore;
                  bestMatch = activity;
                }
              }
            } catch (e) {}
          }
        }
        
        return bestMatch;
      };
      
      // Detect currency from order
      const currency = order.currency || 'TRY';
      const isTL = currency === 'TRY' || currency === 'TL';
      
      // Process order line items
      const lineItems = order.line_items || [];
      for (const item of lineItems) {
        const matchedActivity = findActivity(item.name || '');
        
        if (matchedActivity) {
          // Extract date/time from order meta or use today
          const bookingDate = order.meta_data?.find((m: any) => m.key === 'booking_date')?.value 
            || new Date().toISOString().split('T')[0];
          const bookingTime = order.meta_data?.find((m: any) => m.key === 'booking_time')?.value 
            || '10:00';
          
          // Calculate prices
          const itemTotal = parseFloat(item.total) || 0;
          const priceTl = isTL ? Math.round(itemTotal) : 0;
          const priceUsd = !isTL ? Math.round(itemTotal) : 0;
          
          await storage.createReservation({
            activityId: matchedActivity.id,
            customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'WooCommerce Müşteri',
            customerPhone: order.billing?.phone || '',
            customerEmail: order.billing?.email || '',
            date: bookingDate,
            time: bookingTime,
            quantity: item.quantity || 1,
            priceTl,
            priceUsd,
            currency,
            status: 'confirmed',
            source: 'web',
            externalId: String(order.id)
          });
          
          console.log(`Created reservation for activity: ${matchedActivity.name} from order: ${order.id}`);
        } else {
          console.log(`No matching activity found for product: ${item.name}`);
        }
      }
      
      res.json({ received: true, processed: lineItems.length });
    } catch (error) {
      console.error("WooCommerce webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
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

  // === Settings ===
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });

  app.post("/api/settings/:key", async (req, res) => {
    try {
      const { value } = req.body;
      const result = await storage.setSetting(req.params.key, value);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: "Ayar kaydedilemedi" });
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
