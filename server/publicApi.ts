import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { tenants, activities, capacity, reservations, customerRequests } from "@shared/schema";
import crypto from "crypto";
import { z } from "zod";

interface TenantFromApiKey {
  id: number;
  name: string;
  slug: string;
  publicApiEnabled: boolean | null;
}

declare global {
  namespace Express {
    interface Request {
      publicTenant?: TenantFromApiKey;
    }
  }
}

async function validateApiKey(apiKey: string): Promise<TenantFromApiKey | null> {
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      publicApiEnabled: tenants.publicApiEnabled,
    })
    .from(tenants)
    .where(eq(tenants.publicApiKey, apiKey))
    .limit(1);

  if (!tenant || !tenant.publicApiEnabled) {
    return null;
  }

  return tenant;
}

function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API anahtarı gerekli", code: "MISSING_API_KEY" });
  }

  validateApiKey(apiKey)
    .then((tenant) => {
      if (!tenant) {
        return res.status(401).json({ error: "Geçersiz API anahtarı", code: "INVALID_API_KEY" });
      }
      req.publicTenant = tenant;
      next();
    })
    .catch((err) => {
      console.error("API key validation error:", err);
      res.status(500).json({ error: "Sunucu hatası", code: "SERVER_ERROR" });
    });
}

const reservationInputSchema = z.object({
  activityId: z.number(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  quantity: z.number().min(1).max(50),
  hotelName: z.string().optional(),
  hasTransfer: z.boolean().optional(),
  notes: z.string().optional(),
});

const customerRequestInputSchema = z.object({
  reservationToken: z.string(),
  requestType: z.enum(["time_change", "cancellation", "other"]),
  requestDetails: z.string().optional(),
  preferredTime: z.string().optional(),
});

export function registerPublicApiRoutes(app: Express) {
  app.get("/api/public/info", apiKeyMiddleware, async (req, res) => {
    try {
      const tenantId = req.publicTenant!.id;
      const [tenant] = await db
        .select({
          name: tenants.name,
          slug: tenants.slug,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          accentColor: tenants.accentColor,
          contactEmail: tenants.contactEmail,
          contactPhone: tenants.contactPhone,
          address: tenants.address,
          websiteTitle: tenants.websiteTitle,
          websiteDescription: tenants.websiteDescription,
          websiteFaviconUrl: tenants.websiteFaviconUrl,
          websiteHeroImageUrl: tenants.websiteHeroImageUrl,
          websiteAboutText: tenants.websiteAboutText,
          websiteFooterText: tenants.websiteFooterText,
          websiteSocialLinks: tenants.websiteSocialLinks,
          websiteWhatsappNumber: tenants.websiteWhatsappNumber,
          websiteLanguages: tenants.websiteLanguages,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }

      let socialLinks = {};
      let languages = ["tr"];
      try {
        socialLinks = JSON.parse(tenant.websiteSocialLinks || "{}");
      } catch (e) {
        socialLinks = {};
      }
      try {
        languages = JSON.parse(tenant.websiteLanguages || '["tr"]');
      } catch (e) {
        languages = ["tr"];
      }

      res.json({
        ...tenant,
        websiteSocialLinks: socialLinks,
        websiteLanguages: languages,
      });
    } catch (err) {
      console.error("Public API info error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Get website page content (Contact, About, Cancellation, Privacy, Terms, FAQ)
  app.get("/api/public/pages", apiKeyMiddleware, async (req, res) => {
    try {
      const tenantId = req.publicTenant!.id;

      const [tenant] = await db
        .select({
          websiteContactPageTitle: tenants.websiteContactPageTitle,
          websiteContactPageContent: tenants.websiteContactPageContent,
          websiteContactEmail: tenants.websiteContactEmail,
          websiteContactPhone: tenants.websiteContactPhone,
          websiteContactAddress: tenants.websiteContactAddress,
          websiteAboutPageTitle: tenants.websiteAboutPageTitle,
          websiteAboutPageContent: tenants.websiteAboutPageContent,
          websiteCancellationPageTitle: tenants.websiteCancellationPageTitle,
          websiteCancellationPageContent: tenants.websiteCancellationPageContent,
          websitePrivacyPageTitle: tenants.websitePrivacyPageTitle,
          websitePrivacyPageContent: tenants.websitePrivacyPageContent,
          websiteTermsPageTitle: tenants.websiteTermsPageTitle,
          websiteTermsPageContent: tenants.websiteTermsPageContent,
          websiteFaqPageTitle: tenants.websiteFaqPageTitle,
          websiteFaqPageContent: tenants.websiteFaqPageContent,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }

      // Parse FAQ content if it's JSON
      let faqItems = [];
      try {
        faqItems = JSON.parse(tenant.websiteFaqPageContent || "[]");
      } catch (e) {
        faqItems = [];
      }

      res.json({
        contact: {
          title: tenant.websiteContactPageTitle || "İletişim",
          content: tenant.websiteContactPageContent || "",
          email: tenant.websiteContactEmail || "",
          phone: tenant.websiteContactPhone || "",
          address: tenant.websiteContactAddress || "",
        },
        about: {
          title: tenant.websiteAboutPageTitle || "Hakkımızda",
          content: tenant.websiteAboutPageContent || "",
        },
        cancellation: {
          title: tenant.websiteCancellationPageTitle || "İptal ve İade Politikası",
          content: tenant.websiteCancellationPageContent || "",
        },
        privacy: {
          title: tenant.websitePrivacyPageTitle || "Gizlilik Politikası",
          content: tenant.websitePrivacyPageContent || "",
        },
        terms: {
          title: tenant.websiteTermsPageTitle || "Kullanım Koşulları",
          content: tenant.websiteTermsPageContent || "",
        },
        faq: {
          title: tenant.websiteFaqPageTitle || "Sıkça Sorulan Sorular",
          items: faqItems,
        },
      });
    } catch (err) {
      console.error("Public API pages error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  app.get("/api/public/activities", apiKeyMiddleware, async (req, res) => {
    try {
      const tenantId = req.publicTenant!.id;
      const activityList = await db
        .select({
          id: activities.id,
          name: activities.name,
          description: activities.description,
          price: activities.price,
          priceUsd: activities.priceUsd,
          durationMinutes: activities.durationMinutes,
          defaultTimes: activities.defaultTimes,
          hasFreeHotelTransfer: activities.hasFreeHotelTransfer,
          transferZones: activities.transferZones,
          extras: activities.extras,
          faq: activities.faq,
          reservationLink: activities.reservationLink,
          reservationLinkEn: activities.reservationLinkEn,
          imageUrl: activities.imageUrl,
        })
        .from(activities)
        .where(and(eq(activities.tenantId, tenantId), eq(activities.active, true)));

      const result = activityList.map((a) => ({
        ...a,
        defaultTimes: JSON.parse(a.defaultTimes || "[]"),
        transferZones: JSON.parse(a.transferZones || "[]"),
        extras: JSON.parse(a.extras || "[]"),
        faq: JSON.parse(a.faq || "[]"),
      }));

      res.json(result);
    } catch (err) {
      console.error("Public API activities error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  app.get("/api/public/activities/:id", apiKeyMiddleware, async (req, res) => {
    try {
      const tenantId = req.publicTenant!.id;
      const activityId = parseInt(req.params.id);

      const [activity] = await db
        .select({
          id: activities.id,
          name: activities.name,
          description: activities.description,
          price: activities.price,
          priceUsd: activities.priceUsd,
          durationMinutes: activities.durationMinutes,
          defaultTimes: activities.defaultTimes,
          hasFreeHotelTransfer: activities.hasFreeHotelTransfer,
          transferZones: activities.transferZones,
          extras: activities.extras,
          faq: activities.faq,
          confirmationMessage: activities.confirmationMessage,
          reservationLink: activities.reservationLink,
          reservationLinkEn: activities.reservationLinkEn,
          imageUrl: activities.imageUrl,
        })
        .from(activities)
        .where(and(eq(activities.tenantId, tenantId), eq(activities.id, activityId), eq(activities.active, true)))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ error: "Aktivite bulunamadı" });
      }

      res.json({
        ...activity,
        defaultTimes: JSON.parse(activity.defaultTimes || "[]"),
        transferZones: JSON.parse(activity.transferZones || "[]"),
        extras: JSON.parse(activity.extras || "[]"),
        faq: JSON.parse(activity.faq || "[]"),
      });
    } catch (err) {
      console.error("Public API activity detail error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  app.get("/api/public/availability", apiKeyMiddleware, async (req, res) => {
    try {
      const tenantId = req.publicTenant!.id;
      const { activityId, startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate ve endDate parametreleri gerekli" });
      }

      let query = db
        .select({
          id: capacity.id,
          activityId: capacity.activityId,
          date: capacity.date,
          time: capacity.time,
          totalSlots: capacity.totalSlots,
          bookedSlots: capacity.bookedSlots,
        })
        .from(capacity)
        .where(
          and(
            eq(capacity.tenantId, tenantId),
            gte(capacity.date, startDate as string),
            lte(capacity.date, endDate as string),
            ...(activityId ? [eq(capacity.activityId, parseInt(activityId as string))] : [])
          )
        );

      const slots = await query;

      const availabilityMap: Record<
        string,
        { date: string; times: { time: string; available: number; total: number }[] }
      > = {};

      slots.forEach((slot) => {
        if (!availabilityMap[slot.date]) {
          availabilityMap[slot.date] = { date: slot.date, times: [] };
        }
        availabilityMap[slot.date].times.push({
          time: slot.time,
          available: (slot.totalSlots || 0) - (slot.bookedSlots || 0),
          total: slot.totalSlots || 0,
        });
      });

      res.json(Object.values(availabilityMap));
    } catch (err) {
      console.error("Public API availability error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  app.post("/api/public/reservations", apiKeyMiddleware, async (req, res) => {
    try {
      const tenantId = req.publicTenant!.id;
      const input = reservationInputSchema.parse(req.body);

      const [activity] = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, input.activityId), eq(activities.tenantId, tenantId), eq(activities.active, true)))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ error: "Aktivite bulunamadı" });
      }

      const [slot] = await db
        .select()
        .from(capacity)
        .where(
          and(
            eq(capacity.activityId, input.activityId),
            eq(capacity.date, input.date),
            eq(capacity.time, input.time),
            eq(capacity.tenantId, tenantId)
          )
        )
        .limit(1);

      if (slot) {
        const available = (slot.totalSlots || 0) - (slot.bookedSlots || 0);
        if (available < input.quantity) {
          return res.status(400).json({
            error: "Yeterli kapasite yok",
            code: "INSUFFICIENT_CAPACITY",
            available,
          });
        }
      }

      const trackingToken = crypto.randomBytes(16).toString("hex");
      const tokenExpiresAt = new Date(input.date);
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1);

      const reservation = await storage.createReservation({
        tenantId,
        activityId: input.activityId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        date: input.date,
        time: input.time,
        quantity: input.quantity,
        priceTl: activity.price * input.quantity,
        priceUsd: (activity.priceUsd || 0) * input.quantity,
        currency: "TRY",
        status: "pending",
        source: "web",
        hotelName: input.hotelName,
        hasTransfer: input.hasTransfer || false,
        notes: input.notes,
        trackingToken,
        trackingTokenExpiresAt: tokenExpiresAt,
      });

      if (slot) {
        await db
          .update(capacity)
          .set({ bookedSlots: (slot.bookedSlots || 0) + input.quantity })
          .where(eq(capacity.id, slot.id));
      }

      res.status(201).json({
        id: reservation.id,
        trackingToken,
        status: reservation.status,
        activity: activity.name,
        date: input.date,
        time: input.time,
        quantity: input.quantity,
        totalPrice: activity.price * input.quantity,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Geçersiz veri", details: err.errors });
      }
      console.error("Public API reservation error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Token-based reservation tracking - intentionally NOT protected by API key
  // This endpoint is for customers to track their reservations using a unique token
  // The tracking token itself serves as authentication (similar to order tracking links)
  // Token has expiration date for additional security
  app.get("/api/public/reservations/:token", async (req, res) => {
    try {
      const token = req.params.token;

      const [reservation] = await db
        .select({
          id: reservations.id,
          customerName: reservations.customerName,
          customerPhone: reservations.customerPhone,
          customerEmail: reservations.customerEmail,
          date: reservations.date,
          time: reservations.time,
          quantity: reservations.quantity,
          status: reservations.status,
          priceTl: reservations.priceTl,
          priceUsd: reservations.priceUsd,
          currency: reservations.currency,
          paymentStatus: reservations.paymentStatus,
          hotelName: reservations.hotelName,
          hasTransfer: reservations.hasTransfer,
          activityId: reservations.activityId,
          trackingTokenExpiresAt: reservations.trackingTokenExpiresAt,
        })
        .from(reservations)
        .where(eq(reservations.trackingToken, token))
        .limit(1);

      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı" });
      }

      if (reservation.trackingTokenExpiresAt && new Date() > reservation.trackingTokenExpiresAt) {
        return res.status(410).json({ error: "Takip linki süresi dolmuş" });
      }

      const [activity] = await db
        .select({ name: activities.name })
        .from(activities)
        .where(eq(activities.id, reservation.activityId!))
        .limit(1);

      res.json({
        ...reservation,
        activityName: activity?.name || "Bilinmiyor",
      });
    } catch (err) {
      console.error("Public API reservation tracking error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Customer request submission - intentionally NOT protected by API key
  // This endpoint requires a valid reservation token (which acts as authentication)
  // Customers submit requests (time change, cancellation) using their tracking token
  app.post("/api/public/customer-requests", async (req, res) => {
    try {
      const input = customerRequestInputSchema.parse(req.body);

      const [reservation] = await db
        .select({
          id: reservations.id,
          tenantId: reservations.tenantId,
          customerName: reservations.customerName,
          customerPhone: reservations.customerPhone,
          customerEmail: reservations.customerEmail,
          trackingTokenExpiresAt: reservations.trackingTokenExpiresAt,
        })
        .from(reservations)
        .where(eq(reservations.trackingToken, input.reservationToken))
        .limit(1);

      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı" });
      }

      if (reservation.trackingTokenExpiresAt && new Date() > reservation.trackingTokenExpiresAt) {
        return res.status(410).json({ error: "Takip linki süresi dolmuş" });
      }

      const [request] = await db
        .insert(customerRequests)
        .values({
          tenantId: reservation.tenantId,
          reservationId: reservation.id,
          requestType: input.requestType,
          requestDetails: input.requestDetails,
          preferredTime: input.preferredTime,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          customerEmail: reservation.customerEmail,
          status: "pending",
        })
        .returning();

      res.status(201).json({
        id: request.id,
        status: request.status,
        message: "Talebiniz alınmıştır. En kısa sürede size dönüş yapılacaktır.",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Geçersiz veri", details: err.errors });
      }
      console.error("Public API customer request error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // API key management routes - these are authenticated via session, NOT public API
  // They are placed here for organization but require session auth
  app.post("/api/settings/generate-api-key", async (req, res) => {
    try {
      const tenantId = (req as any).session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Yetkisiz erişim", code: "UNAUTHORIZED" });
      }

      const apiKey = `sk_live_${crypto.randomBytes(24).toString("hex")}`;

      await db.update(tenants).set({ publicApiKey: apiKey, publicApiEnabled: true }).where(eq(tenants.id, tenantId));

      res.json({ apiKey });
    } catch (err) {
      console.error("Generate API key error:", err);
      res.status(500).json({ error: "Sunucu hatası", code: "SERVER_ERROR" });
    }
  });

  app.post("/api/settings/disable-api", async (req, res) => {
    try {
      const tenantId = (req as any).session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Yetkisiz erişim", code: "UNAUTHORIZED" });
      }

      await db.update(tenants).set({ publicApiEnabled: false }).where(eq(tenants.id, tenantId));

      res.json({ success: true });
    } catch (err) {
      console.error("Disable API error:", err);
      res.status(500).json({ error: "Sunucu hatası", code: "SERVER_ERROR" });
    }
  });

  app.get("/api/settings/api-status", async (req, res) => {
    try {
      const tenantId = (req as any).session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Yetkisiz erişim", code: "UNAUTHORIZED" });
      }

      const [tenant] = await db
        .select({
          publicApiKey: tenants.publicApiKey,
          publicApiEnabled: tenants.publicApiEnabled,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      res.json({
        hasApiKey: !!tenant?.publicApiKey,
        apiEnabled: tenant?.publicApiEnabled || false,
        apiKeyPreview: tenant?.publicApiKey ? `${tenant.publicApiKey.substring(0, 12)}...` : null,
      });
    } catch (err) {
      console.error("API status error:", err);
      res.status(500).json({ error: "Sunucu hatası", code: "SERVER_ERROR" });
    }
  });
}
