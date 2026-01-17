import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createReservationSchema, contactFormSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/agency", async (_req, res) => {
    try {
      const agency = await storage.getAgencyInfo();
      res.json(agency);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agency info" });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/activities", async (req, res) => {
    try {
      const featured = req.query.featured === "true";
      const activities = await storage.getActivities(featured || undefined);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:slug", async (req, res) => {
    try {
      const activity = await storage.getActivityBySlug(req.params.slug);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  app.get("/api/availability/:slug/:date", async (req, res) => {
    try {
      const slots = await storage.getAvailability(req.params.slug, req.params.date);
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const data = createReservationSchema.parse(req.body);
      const reservation = await storage.createReservation(data);
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid reservation data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  app.get("/api/reservations/:code", async (req, res) => {
    try {
      const reservation = await storage.getReservationByCode(req.params.code);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservation" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const data = contactFormSchema.parse(req.body);
      await storage.saveContactMessage(data);
      res.status(201).json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid form data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  return httpServer;
}
