import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { tenants, activities, capacity, reservations, customerRequests, blogPosts, homepageSections, smarturSettings } from "@shared/schema";
import { desc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import { translateText, translateObject, translateArray } from "./translationService";

interface TenantFromApiKey {
  id: number;
  name: string;
  slug: string;
  publicApiEnabled: boolean | null;
}

interface TenantFromDomain {
  id: number;
  name: string;
  slug: string;
  websiteEnabled: boolean | null;
  websiteDomain: string | null;
}

declare global {
  namespace Express {
    interface Request {
      publicTenant?: TenantFromApiKey;
      websiteTenant?: TenantFromDomain;
    }
  }
}

async function validateDomain(domain: string): Promise<TenantFromDomain | null> {
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
  
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      websiteEnabled: tenants.websiteEnabled,
      websiteDomain: tenants.websiteDomain,
    })
    .from(tenants)
    .where(eq(tenants.websiteDomain, cleanDomain))
    .limit(1);

  if (!tenant || !tenant.websiteEnabled) {
    return null;
  }

  return tenant;
}

async function getPreviewTenant(req: Request): Promise<TenantFromDomain | null> {
  // Check if this is a preview request - either via query param or session-based
  const isPreviewMode = req.query.preview === 'true';
  
  // Get tenant from session if user is logged in
  const session = req.session as any;
  const userId = session?.userId;
  const sessionTenantId = session?.tenantId;
  
  // Debug log for tenant isolation investigation
  if (isPreviewMode) {
    console.log(`[PREVIEW DEBUG] isPreviewMode=${isPreviewMode}, userId=${userId}, sessionTenantId=${sessionTenantId}`);
  }
  
  // For preview mode, require login
  if (isPreviewMode && !userId) {
    return null;
  }
  
  // If not preview mode and no userId, skip
  if (!isPreviewMode && !userId) {
    return null;
  }
  
  // If preview mode is set or user is logged in, try to get tenant from session
  if (userId) {
    try {
      const user = await storage.getAppUser(userId);
      if (!user || !user.tenantId) return null;
      
      // Security check: verify session tenantId matches user's actual tenantId
      if (sessionTenantId && sessionTenantId !== user.tenantId) {
        console.error(`[SECURITY ALERT] Preview: Session tenantId (${sessionTenantId}) does not match user tenantId (${user.tenantId}) for userId ${userId}`);
      }
      
      console.log(`[PREVIEW DEBUG] User ${userId} has tenantId=${user.tenantId}, returning tenant data`);
      
      const [tenant] = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          websiteEnabled: tenants.websiteEnabled,
          websiteDomain: tenants.websiteDomain,
        })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      
      // For preview mode, return tenant even if websiteEnabled is false
      if (tenant && isPreviewMode) {
        return tenant;
      }
      
      return tenant || null;
    } catch (err) {
      console.error("Preview tenant lookup error:", err);
      return null;
    }
  }
  
  return null;
}

async function domainMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  const domain = host.split(':')[0];

  try {
    // First check if this is a preview request
    const previewTenant = await getPreviewTenant(req);
    if (previewTenant) {
      req.websiteTenant = previewTenant;
      return next();
    }
    
    // Otherwise validate by domain
    const tenant = await validateDomain(domain);
    if (!tenant) {
      return res.status(404).json({ error: "Web sitesi bulunamadı", code: "WEBSITE_NOT_FOUND" });
    }
    req.websiteTenant = tenant;
    next();
  } catch (err) {
    console.error("Domain validation error:", err);
    res.status(500).json({ error: "Sunucu hatası", code: "SERVER_ERROR" });
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

const participantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const selectedExtraSchema = z.object({
  name: z.string(),
  priceTl: z.number(),
  priceUsd: z.number().optional(),
  quantity: z.number().min(1),
});

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
  participants: z.array(participantSchema).optional(),
  selectedExtras: z.array(selectedExtraSchema).optional(),
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
          websiteHeaderLogoUrl: tenants.websiteHeaderLogoUrl,
          websiteHeroImageUrl: tenants.websiteHeroImageUrl,
          websiteAboutText: tenants.websiteAboutText,
          websiteFooterText: tenants.websiteFooterText,
          websiteSocialLinks: tenants.websiteSocialLinks,
          websiteWhatsappNumber: tenants.websiteWhatsappNumber,
          websiteLanguages: tenants.websiteLanguages,
          websiteHeroStats: tenants.websiteHeroStats,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }

      let socialLinks = {};
      let languages = ["tr"];
      let heroStats: any[] = [];
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
      try {
        heroStats = JSON.parse(tenant.websiteHeroStats || "[]");
      } catch (e) {
        heroStats = [];
      }

      res.json({
        ...tenant,
        websiteSocialLinks: socialLinks,
        websiteLanguages: languages,
        websiteHeroStats: heroStats,
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

  // === PUBLIC WEBSITE ROUTES (Domain-based, no API key required) ===
  
  // Get website data by domain (for public website frontend)
  app.get("/api/website/data", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;

      const [tenant] = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          websiteEnabled: tenants.websiteEnabled,
          websiteDomain: tenants.websiteDomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          accentColor: tenants.accentColor,
          contactEmail: tenants.contactEmail,
          contactPhone: tenants.contactPhone,
          address: tenants.address,
          websiteTitle: tenants.websiteTitle,
          websiteDescription: tenants.websiteDescription,
          websiteFaviconUrl: tenants.websiteFaviconUrl,
          websiteHeaderLogoUrl: tenants.websiteHeaderLogoUrl,
          websiteHeroImageUrl: tenants.websiteHeroImageUrl,
          websiteAboutText: tenants.websiteAboutText,
          websiteFooterText: tenants.websiteFooterText,
          websiteSocialLinks: tenants.websiteSocialLinks,
          websiteWhatsappNumber: tenants.websiteWhatsappNumber,
          websiteLanguages: tenants.websiteLanguages,
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
          websiteDisplayName: tenants.websiteDisplayName,
          websiteFooterCompanyDescription: tenants.websiteFooterCompanyDescription,
          websiteFooterPaymentImageUrl: tenants.websiteFooterPaymentImageUrl,
          websiteFooterCopyrightText: tenants.websiteFooterCopyrightText,
          websiteFooterBackgroundColor: tenants.websiteFooterBackgroundColor,
          websiteFooterTextColor: tenants.websiteFooterTextColor,
          websiteHeaderBackgroundColor: tenants.websiteHeaderBackgroundColor,
          websiteHeaderTextColor: tenants.websiteHeaderTextColor,
          websiteTemplateKey: tenants.websiteTemplateKey,
          websiteTemplateSettings: tenants.websiteTemplateSettings,
          websiteShowFeaturedActivities: tenants.websiteShowFeaturedActivities,
          websiteReviewCards: tenants.websiteReviewCards,
          websiteReviewCardsEnabled: tenants.websiteReviewCardsEnabled,
          websiteReviewCardsTitle: tenants.websiteReviewCardsTitle,
          websiteReviewCardsTitleEn: tenants.websiteReviewCardsTitleEn,
          websiteHeroSliderEnabled: tenants.websiteHeroSliderEnabled,
          websiteHeroSliderPosition: tenants.websiteHeroSliderPosition,
          websiteHeroSliderTitle: tenants.websiteHeroSliderTitle,
          websiteHeroSliderTitleEn: tenants.websiteHeroSliderTitleEn,
          websiteHeroSlides: tenants.websiteHeroSlides,
          websitePromoBoxes: tenants.websitePromoBoxes,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }

      let socialLinks = {};
      let languages = ["tr"];
      let faqItems = [];
      let templateSettings = {};
      let reviewCards: any[] = [];
      try { socialLinks = JSON.parse(tenant.websiteSocialLinks || "{}"); } catch {}
      try { languages = JSON.parse(tenant.websiteLanguages || '["tr"]'); } catch {}
      try { faqItems = JSON.parse(tenant.websiteFaqPageContent || "[]"); } catch {}
      try { templateSettings = JSON.parse(tenant.websiteTemplateSettings || "{}"); } catch {}
      try { reviewCards = JSON.parse(tenant.websiteReviewCards || "[]"); } catch {}
      let heroSlides: any[] = [];
      let promoBoxes: any[] = [];
      try { heroSlides = JSON.parse(tenant.websiteHeroSlides || "[]"); } catch {}
      try { promoBoxes = JSON.parse(tenant.websitePromoBoxes || "[]"); } catch {}

      let responseData: any = {
        ...tenant,
        websiteSocialLinks: socialLinks,
        websiteLanguages: languages,
        websiteTemplateSettings: templateSettings,
        websiteReviewCards: reviewCards,
        websiteHeroSlides: heroSlides,
        websitePromoBoxes: promoBoxes,
        faqItems,
      };

      const lang = req.query.lang as string;
      if (lang && lang !== "tr") {
        const fieldsToTranslate = [
          "websiteTitle",
          "websiteDescription", 
          "websiteAboutText",
          "websiteFooterText",
          "websiteContactPageTitle",
          "websiteContactPageContent",
          "websiteAboutPageTitle",
          "websiteAboutPageContent",
          "websiteCancellationPageTitle",
          "websiteCancellationPageContent",
          "websitePrivacyPageTitle",
          "websitePrivacyPageContent",
          "websiteTermsPageTitle",
          "websiteTermsPageContent",
          "websiteFaqPageTitle",
          "websiteFooterCompanyDescription",
          "websiteFooterCopyrightText",
        ];
        responseData = await translateObject(responseData, fieldsToTranslate, lang);
        
        if (responseData.faqItems && responseData.faqItems.length > 0) {
          responseData.faqItems = await translateArray(responseData.faqItems, ["question", "answer"], lang);
        }
      }

      res.json(responseData);
    } catch (err) {
      console.error("Website data error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Get activities for public website (by domain)
  app.get("/api/website/activities", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;

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
          imageUrl: activities.imageUrl,
          galleryImages: activities.galleryImages,
          // Yeni tur satış alanları
          region: activities.region,
          tourLanguages: activities.tourLanguages,
          difficulty: activities.difficulty,
          includedItems: activities.includedItems,
          excludedItems: activities.excludedItems,
          meetingPoint: activities.meetingPoint,
          categories: activities.categories,
          highlights: activities.highlights,
          minAge: activities.minAge,
          maxParticipants: activities.maxParticipants,
          importantInfoItems: activities.importantInfoItems,
          importantInfo: activities.importantInfo,
          transferInfo: activities.transferInfo,
          reviewCards: activities.reviewCards,
          reviewCardsEnabled: activities.reviewCardsEnabled,
        })
        .from(activities)
        .where(and(eq(activities.tenantId, tenantId), eq(activities.active, true)));

      let parsed = activityList.map((a) => ({
        ...a,
        defaultTimes: JSON.parse(a.defaultTimes || "[]"),
        transferZones: JSON.parse(a.transferZones || "[]"),
        extras: JSON.parse(a.extras || "[]"),
        faq: JSON.parse(a.faq || "[]"),
        galleryImages: JSON.parse(a.galleryImages || "[]"),
        tourLanguages: JSON.parse(a.tourLanguages || '["tr"]'),
        includedItems: JSON.parse(a.includedItems || "[]"),
        excludedItems: JSON.parse(a.excludedItems || "[]"),
        whatToBring: JSON.parse((a as any).whatToBring || "[]"),
        whatToBringEn: JSON.parse((a as any).whatToBringEn || "[]"),
        notAllowed: JSON.parse((a as any).notAllowed || "[]"),
        notAllowedEn: JSON.parse((a as any).notAllowedEn || "[]"),
        categories: JSON.parse(a.categories || "[]"),
        highlights: JSON.parse(a.highlights || "[]"),
        importantInfoItems: JSON.parse(a.importantInfoItems || "[]"),
        reviewCards: JSON.parse(a.reviewCards || "[]"),
      }));

      const lang = req.query.lang as string;
      if (lang && lang !== "tr") {
        parsed = await translateArray(parsed, ["name", "description", "region", "meetingPoint", "importantInfo", "transferInfo"], lang);
        for (let i = 0; i < parsed.length; i++) {
          if (parsed[i].importantInfoItems?.length) {
            parsed[i].importantInfoItems = await Promise.all(
              parsed[i].importantInfoItems.map((item: string) => translateText(item, lang))
            );
          }
        }
        for (let i = 0; i < parsed.length; i++) {
          if (parsed[i].includedItems?.length) {
            parsed[i].includedItems = await Promise.all(
              parsed[i].includedItems.map((item: string) => translateText(item, lang))
            );
          }
          if (parsed[i].excludedItems?.length) {
            parsed[i].excludedItems = await Promise.all(
              parsed[i].excludedItems.map((item: string) => translateText(item, lang))
            );
          }
          if (parsed[i].highlights?.length) {
            parsed[i].highlights = await Promise.all(
              parsed[i].highlights.map((item: string) => translateText(item, lang))
            );
          }
          if (parsed[i].categories?.length) {
            parsed[i].categories = await Promise.all(
              parsed[i].categories.map((item: string) => translateText(item, lang))
            );
          }
        }
      }

      res.json(parsed);
    } catch (err) {
      console.error("Website activities error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Get activity detail for public website
  app.get("/api/website/activities/:id", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      const activityId = parseInt(req.params.id);

      const [activity] = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId), eq(activities.active, true)))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ error: "Aktivite bulunamadı" });
      }

      let parsed: any = {
        ...activity,
        defaultTimes: JSON.parse(activity.defaultTimes || "[]"),
        transferZones: JSON.parse(activity.transferZones || "[]"),
        extras: JSON.parse(activity.extras || "[]"),
        faq: JSON.parse(activity.faq || "[]"),
        galleryImages: JSON.parse(activity.galleryImages || "[]"),
        tourLanguages: JSON.parse(activity.tourLanguages || '["tr"]'),
        includedItems: JSON.parse(activity.includedItems || "[]"),
        excludedItems: JSON.parse(activity.excludedItems || "[]"),
        whatToBring: JSON.parse((activity as any).whatToBring || "[]"),
        whatToBringEn: JSON.parse((activity as any).whatToBringEn || "[]"),
        notAllowed: JSON.parse((activity as any).notAllowed || "[]"),
        notAllowedEn: JSON.parse((activity as any).notAllowedEn || "[]"),
        categories: JSON.parse(activity.categories || "[]"),
        highlights: JSON.parse(activity.highlights || "[]"),
        importantInfoItems: JSON.parse(activity.importantInfoItems || "[]"),
        reviewCards: JSON.parse(activity.reviewCards || "[]"),
      };

      const lang = req.query.lang as string;
      if (lang && lang !== "tr") {
        parsed = await translateObject(parsed, ["name", "description", "region", "meetingPoint", "importantInfo", "transferInfo"], lang);
        if (parsed.importantInfoItems?.length) {
          parsed.importantInfoItems = await Promise.all(
            parsed.importantInfoItems.map((item: string) => translateText(item, lang))
          );
        }
        if (parsed.includedItems?.length) {
          parsed.includedItems = await Promise.all(
            parsed.includedItems.map((item: string) => translateText(item, lang))
          );
        }
        if (parsed.excludedItems?.length) {
          parsed.excludedItems = await Promise.all(
            parsed.excludedItems.map((item: string) => translateText(item, lang))
          );
        }
        if (parsed.highlights?.length) {
          parsed.highlights = await Promise.all(
            parsed.highlights.map((item: string) => translateText(item, lang))
          );
        }
        if (parsed.categories?.length) {
          parsed.categories = await Promise.all(
            parsed.categories.map((item: string) => translateText(item, lang))
          );
        }
        if (parsed.faq?.length) {
          parsed.faq = await translateArray(parsed.faq, ["question", "answer"], lang);
        }
      }

      res.json(parsed);
    } catch (err) {
      console.error("Website activity detail error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Get availability for public website
  app.get("/api/website/availability", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      const { activityId, date, startDate, endDate } = req.query;

      const conditions = [eq(capacity.tenantId, tenantId)];
      
      if (activityId) {
        conditions.push(eq(capacity.activityId, parseInt(activityId as string)));
      }
      
      if (date) {
        conditions.push(eq(capacity.date, date as string));
      } else if (startDate && endDate) {
        conditions.push(gte(capacity.date, startDate as string));
        conditions.push(lte(capacity.date, endDate as string));
      }

      const slots = await db
        .select({
          activityId: capacity.activityId,
          date: capacity.date,
          time: capacity.time,
          totalSlots: capacity.totalSlots,
          bookedSlots: capacity.bookedSlots,
        })
        .from(capacity)
        .where(and(...conditions));

      const result = slots.map((s) => ({
        ...s,
        available: (s.totalSlots || 0) - (s.bookedSlots || 0),
      }));

      res.json(result);
    } catch (err) {
      console.error("Website availability error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Create reservation from public website
  app.post("/api/website/reservations", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      const input = reservationInputSchema.parse(req.body);

      const [activity] = await db
        .select({ 
          id: activities.id, 
          name: activities.name, 
          price: activities.price, 
          priceUsd: activities.priceUsd,
          extras: activities.extras,
          requiresDeposit: activities.requiresDeposit,
          depositType: activities.depositType,
          depositAmount: activities.depositAmount,
          fullPaymentRequired: activities.fullPaymentRequired
        })
        .from(activities)
        .where(and(eq(activities.id, input.activityId), eq(activities.tenantId, tenantId), eq(activities.active, true)))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ error: "Aktivite bulunamadı" });
      }

      // Parse activity extras for server-side validation (with safe fallback)
      let activityExtras: Array<{ name: string; priceTl: number; priceUsd: number }> = [];
      try {
        activityExtras = JSON.parse(activity.extras || "[]");
      } catch (e) {
        console.error("Failed to parse activity extras:", e);
        activityExtras = [];
      }

      const [slot] = await db
        .select()
        .from(capacity)
        .where(and(
          eq(capacity.tenantId, tenantId),
          eq(capacity.activityId, input.activityId),
          eq(capacity.date, input.date),
          eq(capacity.time, input.time)
        ))
        .limit(1);

      if (slot) {
        const available = (slot.totalSlots || 0) - (slot.bookedSlots || 0);
        if (available < input.quantity) {
          return res.status(400).json({ error: "Yeterli kapasite yok", available });
        }
      }

      const trackingToken = crypto.randomBytes(16).toString("hex");
      const tokenExpiresAt = new Date(input.date);
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1);

      // Calculate extras total with SERVER-SIDE price validation
      let extrasTotal = 0;
      let extrasInfo = "";
      const validatedExtras: Array<{ name: string; priceTl: number; quantity: number }> = [];
      
      if (input.selectedExtras && input.selectedExtras.length > 0) {
        for (const clientExtra of input.selectedExtras) {
          // Find the extra in activity's defined extras (server-side validation)
          const serverExtra = activityExtras.find(e => e.name === clientExtra.name);
          if (!serverExtra) {
            return res.status(400).json({ error: `Geçersiz ekstra: ${clientExtra.name}` });
          }
          
          // Validate quantity
          if (clientExtra.quantity < 1 || clientExtra.quantity > input.quantity) {
            return res.status(400).json({ error: `Geçersiz ekstra miktarı: ${clientExtra.name}` });
          }
          
          // Use SERVER-SIDE price, not client-supplied price
          const extraPrice = serverExtra.priceTl * clientExtra.quantity;
          extrasTotal += extraPrice;
          validatedExtras.push({ 
            name: clientExtra.name, 
            priceTl: serverExtra.priceTl, 
            quantity: clientExtra.quantity 
          });
        }
        extrasInfo = validatedExtras.map(e => `${e.name} x${e.quantity}: ${e.priceTl * e.quantity} TL`).join(", ");
      }

      // Format participants info for notes
      let participantsInfo = "";
      if (input.participants && input.participants.length > 0) {
        participantsInfo = "Katılımcılar: " + input.participants.map((p, i) => 
          `${i + 1}. ${p.firstName} ${p.lastName} (${p.birthDate})`
        ).join("; ");
      }

      // Calculate total price
      const basePrice = activity.price * input.quantity;
      const totalPrice = basePrice + extrasTotal;
      
      // Calculate deposit and remaining payment
      let depositRequired = 0;
      let remainingPayment = totalPrice;
      let paymentType = "none";
      
      if (activity.fullPaymentRequired) {
        paymentType = "full";
        depositRequired = totalPrice;
        remainingPayment = 0;
      } else if (activity.requiresDeposit && activity.depositAmount) {
        paymentType = "deposit";
        if (activity.depositType === "percentage") {
          depositRequired = Math.round(totalPrice * (activity.depositAmount / 100));
        } else {
          depositRequired = activity.depositAmount;
        }
        remainingPayment = totalPrice - depositRequired;
      }

      // Build structured metadata JSON for future parsing
      const reservationMetadata = {
        participants: input.participants || [],
        extras: validatedExtras,
        totalPrice,
        depositRequired,
        remainingPayment,
        paymentType,
      };

      // Combine notes with human-readable format + JSON metadata
      const combinedNotes = [
        input.notes,
        extrasInfo ? `Ekstralar: ${extrasInfo}` : "",
        participantsInfo,
        `__METADATA__:${JSON.stringify(reservationMetadata)}`
      ].filter(Boolean).join(" | ");

      const reservation = await storage.createReservation({
        tenantId: tenantId,
        activityId: input.activityId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        date: input.date,
        time: input.time,
        quantity: input.quantity,
        priceTl: (activity.price * input.quantity) + extrasTotal,
        priceUsd: (activity.priceUsd || 0) * input.quantity,
        currency: "TRY",
        status: "pending",
        source: "website",
        hotelName: input.hotelName,
        hasTransfer: input.hasTransfer || false,
        notes: combinedNotes || undefined,
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
      console.error("Website reservation error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Track reservation by token
  app.get("/api/website/track", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: "Takip kodu gerekli" });
      }

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
        })
        .from(reservations)
        .where(and(
          eq(reservations.tenantId, tenantId),
          eq(reservations.trackingToken, token)
        ))
        .limit(1);

      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı" });
      }

      let activityName = "Bilinmeyen Aktivite";
      if (reservation.activityId) {
        const [activity] = await db
          .select({ name: activities.name })
          .from(activities)
          .where(and(
            eq(activities.id, reservation.activityId),
            eq(activities.tenantId, tenantId)
          ))
          .limit(1);
        if (activity) {
          activityName = activity.name;
        }
      }

      res.json({
        ...reservation,
        activityName,
      });
    } catch (err) {
      console.error("Website track error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // === PUBLIC BLOG API ===
  
  // Get published blog posts for website
  app.get("/api/website/blog", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      
      const posts = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          featuredImageUrl: blogPosts.featuredImageUrl,
          author: blogPosts.author,
          category: blogPosts.category,
          tags: blogPosts.tags,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
        })
        .from(blogPosts)
        .where(and(
          eq(blogPosts.tenantId, tenantId),
          eq(blogPosts.status, "published")
        ))
        .orderBy(desc(blogPosts.publishedAt));
      
      res.json(posts.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : []
      })));
    } catch (err) {
      console.error("Website blog list error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Get single blog post by slug
  app.get("/api/website/blog/:slug", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      const { slug } = req.params;
      
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(and(
          eq(blogPosts.tenantId, tenantId),
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, "published")
        ))
        .limit(1);
      
      if (!post) {
        return res.status(404).json({ error: "Blog yazısı bulunamadı" });
      }
      
      res.json({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : []
      });
    } catch (err) {
      console.error("Website blog detail error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Get homepage sections with activities
  app.get("/api/website/homepage-sections", domainMiddleware, async (req, res) => {
    try {
      const tenantId = req.websiteTenant!.id;
      const lang = (req.query.lang as string) || "tr";
      
      // Get active sections ordered by displayOrder
      const sections = await db
        .select()
        .from(homepageSections)
        .where(and(
          eq(homepageSections.tenantId, tenantId),
          eq(homepageSections.isActive, true)
        ))
        .orderBy(homepageSections.displayOrder);
      
      // Get all activities for this tenant
      const allActivities = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.tenantId, tenantId),
          eq(activities.active, true)
        ));
      
      // Build sections with their activities
      const sectionsWithActivities = await Promise.all(sections.map(async (section) => {
        let activityIds: number[] = [];
        try {
          activityIds = section.activityIds ? JSON.parse(section.activityIds) : [];
        } catch (e) {
          console.error(`Invalid activityIds JSON for section ${section.id}:`, e);
          activityIds = [];
        }
        
        // Filter activities by IDs or use all if empty
        let sectionActivities = activityIds.length > 0
          ? allActivities.filter(a => activityIds.includes(a.id))
          : allActivities.slice(0, section.maxItems || 6);
        
        // Limit to maxItems
        sectionActivities = sectionActivities.slice(0, section.maxItems || 6);
        
        // Format activities for public display (same fields as main activities list)
        const formattedActivities = sectionActivities.map(activity => {
          let galleryImages: string[] = [];
          let categories: string[] = [];
          let highlights: string[] = [];
          let tourLanguages: string[] = [];
          try {
            galleryImages = activity.galleryImages ? JSON.parse(activity.galleryImages) : [];
          } catch (e) { galleryImages = []; }
          try {
            categories = activity.categories ? JSON.parse(activity.categories) : [];
          } catch (e) { categories = []; }
          try {
            highlights = activity.highlights ? JSON.parse(activity.highlights) : [];
          } catch (e) { highlights = []; }
          try {
            tourLanguages = activity.tourLanguages ? JSON.parse(activity.tourLanguages) : ["tr"];
          } catch (e) { tourLanguages = ["tr"]; }
          
          return {
            id: activity.id,
            name: activity.name,
            description: activity.description?.substring(0, 200),
            price: activity.price,
            priceUsd: activity.priceUsd,
            durationMinutes: activity.durationMinutes,
            imageUrl: activity.imageUrl,
            galleryImages,
            region: activity.region,
            categories,
            highlights,
            tourLanguages,
            difficulty: activity.difficulty,
            maxParticipants: activity.maxParticipants,
            hasFreeHotelTransfer: activity.hasFreeHotelTransfer,
          };
        });
        
        // Translate if needed
        let title = section.title;
        let subtitle = section.subtitle;
        
        if (lang === "en") {
          title = section.titleEn || section.title;
          subtitle = section.subtitleEn || section.subtitle;
        }
        
        return {
          id: section.id,
          title,
          subtitle,
          sectionType: section.sectionType,
          activities: formattedActivities,
        };
      }));
      
      res.json(sectionsWithActivities);
    } catch (err) {
      console.error("Website homepage sections error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Public Smartur Settings endpoint (for footer logo/link)
  app.get("/api/website/smartur-settings", async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(smarturSettings);
      
      // Convert to key-value object
      const settingsObj: Record<string, string | null> = {};
      for (const setting of settings) {
        settingsObj[setting.settingKey] = setting.settingValue;
      }
      
      // Return settings with defaults
      res.json({
        footer_logo_url: settingsObj.footer_logo_url || "/smartur-logo.png",
        footer_link_url: settingsObj.footer_link_url || "https://www.mysmartur.com",
        footer_enabled: settingsObj.footer_enabled !== "false",
      });
    } catch (error) {
      console.error("Smartur settings public fetch error:", error);
      // Return defaults on error
      res.json({
        footer_logo_url: "/smartur-logo.png",
        footer_link_url: "https://www.mysmartur.com",
        footer_enabled: true,
      });
    }
  });

  // robots.txt endpoint
  app.get("/robots.txt", domainMiddleware, async (req: Request, res: Response) => {
    const tenant = req.websiteTenant;
    if (!tenant) {
      res.type("text/plain").send("User-agent: *\nDisallow: /");
      return;
    }

    const domain = tenant.websiteDomain || req.get("host") || "";
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
    res.type("text/plain").send(robotsTxt);
  });

  // sitemap.xml endpoint
  app.get("/sitemap.xml", domainMiddleware, async (req: Request, res: Response) => {
    const tenant = req.websiteTenant;
    if (!tenant) {
      res.status(404).send("Not found");
      return;
    }

    try {
      const domain = tenant.websiteDomain || req.get("host") || "";
      const baseUrl = `https://${domain}`;
      const now = new Date().toISOString().split("T")[0];

      // Get all activities for this tenant
      const tenantActivities = await db
        .select({
          id: activities.id,
        })
        .from(activities)
        .where(and(
          eq(activities.tenantId, tenant.id),
          eq(activities.active, true)
        ));

      // Get all published blog posts for this tenant
      const tenantBlogPosts = await db
        .select({
          slug: blogPosts.slug,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .where(and(
          eq(blogPosts.tenantId, tenant.id),
          eq(blogPosts.status, "published")
        ));

      const languages = ["tr", "en"];
      let urls = "";

      // Static pages
      const staticPages = [
        { tr: "/tr", en: "/en", priority: "1.0", changefreq: "daily" },
        { tr: "/tr/aktiviteler", en: "/en/activities", priority: "0.9", changefreq: "daily" },
        { tr: "/tr/iletisim", en: "/en/contact", priority: "0.7", changefreq: "monthly" },
        { tr: "/tr/blog", en: "/en/blog", priority: "0.8", changefreq: "weekly" },
      ];

      for (const page of staticPages) {
        for (const lang of languages) {
          const path = lang === "tr" ? page.tr : page.en;
          urls += `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}${page.tr}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}${page.en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${page.tr}"/>
  </url>`;
        }
      }

      // Activity pages
      for (const activity of tenantActivities) {
        const lastmod = now;
        for (const lang of languages) {
          const pathPrefix = lang === "tr" ? "/tr/aktivite" : "/en/activity";
          urls += `
  <url>
    <loc>${baseUrl}${pathPrefix}/${activity.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}/tr/aktivite/${activity.id}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/activity/${activity.id}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/tr/aktivite/${activity.id}"/>
  </url>`;
        }
      }

      // Blog posts
      for (const post of tenantBlogPosts) {
        const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString().split("T")[0] : now;
        for (const lang of languages) {
          urls += `
  <url>
    <loc>${baseUrl}/${lang}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}/tr/blog/${post.slug}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/blog/${post.slug}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/tr/blog/${post.slug}"/>
  </url>`;
        }
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

      res.type("application/xml").send(sitemap);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      res.status(500).send("Error generating sitemap");
    }
  });
}
