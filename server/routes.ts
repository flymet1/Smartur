import type { Express } from "express";
import type { Server } from "http";
import express from "express";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { supplierDispatches, reservations, userRoles, roles, tenants, homepageSections, smarturSettings } from "@shared/schema";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertActivitySchema, insertCapacitySchema, insertReservationSchema, insertSubscriptionPlanSchema, insertSubscriptionSchema, insertSubscriptionPaymentSchema } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { encrypt, decrypt } from "./encryption";
import { logError, logWarn, logInfo, attachLogsToSupportRequest, getSupportRequestLogs, getRecentLogs, logErrorEvent, type ErrorCategory, type ErrorSeverity } from "./logger";
import { sendTenantEmail } from "./email";
import { registerPublicApiRoutes } from "./publicApi";

// Multer configuration for image uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece PNG ve WebP formatları kabul edilir'));
  }
};

// Small images (logo, favicon): max 100KB
const uploadSmall = multer({
  storage: multerStorage,
  fileFilter,
  limits: { fileSize: 100 * 1024 } // 100KB
});

// Large images (hero, activity): max 200KB
const uploadLarge = multer({
  storage: multerStorage,
  fileFilter,
  limits: { fileSize: 200 * 1024 } // 200KB
});

// Module-level exchange rate cache (persists between requests)
let exchangeRateCache: { rates: any; lastUpdated: Date | null } = { rates: null, lastUpdated: null };
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Simple password hashing using SHA-256 with salt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Format uptime in human-readable format
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}s`);
  if (minutes > 0) parts.push(`${minutes}d`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}sn`);
  
  return parts.join(' ');
}

// Helper function to create in-app notifications for users with reservation management permission
async function notifyTenantAdmins(
  tenantId: number,
  notificationType: string,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    const allUsers = await storage.getAppUsers();
    const tenantUsers = allUsers.filter(u => u.tenantId === tenantId && u.isActive);
    
    // Get users with reservations.manage permission using bulk query
    const eligibleUserIds: number[] = [];
    
    // Get all user roles for tenant users in one query
    for (const user of tenantUsers) {
      const permissions = await storage.getUserPermissions(user.id);
      // Only notify users who can manage reservations (not viewers)
      // Using string literals since PERMISSIONS constant is defined later in the file
      if (permissions.includes('reservations.create') || 
          permissions.includes('reservations.edit')) {
        eligibleUserIds.push(user.id);
      }
    }
    
    // If no eligible users found, don't send any notifications (no fallback to all users)
    if (eligibleUserIds.length === 0) {
      console.log(`No eligible users found for tenant ${tenantId} to receive notification`);
      return;
    }
    
    // Create notifications for eligible users
    for (const userId of eligibleUserIds) {
      await storage.createInAppNotification({
        userId,
        tenantId,
        notificationType,
        title,
        message,
        link: link || null,
        isRead: false
      });
    }
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
  }
}

// Permission middleware - checks if user has required permissions
import type { Request, Response, NextFunction } from "express";

// Cache for user tenantId validation - avoids DB query on every request
// Key: userId, Value: { tenantId, timestamp }
const userTenantCache = new Map<number, { tenantId: number | null; timestamp: number }>();
const TENANT_CACHE_TTL = 60000; // 1 minute cache TTL

async function validateAndSyncTenantId(req: Request, res: Response): Promise<{ valid: boolean; shouldForceLogout: boolean }> {
  const userId = req.session?.userId;
  const sessionTenantId = req.session?.tenantId;
  
  if (!userId) return { valid: false, shouldForceLogout: false };
  
  // Check cache first
  const cached = userTenantCache.get(userId);
  const now = Date.now();
  
  let actualTenantId: number | null = null;
  
  if (cached && (now - cached.timestamp) < TENANT_CACHE_TTL) {
    actualTenantId = cached.tenantId;
  } else {
    // Fetch from database
    const user = await storage.getAppUser(userId);
    if (!user) {
      // User no longer exists - invalidate cache and force logout
      userTenantCache.delete(userId);
      return { valid: false, shouldForceLogout: true };
    }
    actualTenantId = user.tenantId;
    // Update cache
    userTenantCache.set(userId, { tenantId: actualTenantId, timestamp: now });
  }
  
  // Check if session tenantId matches actual tenantId
  if (sessionTenantId !== actualTenantId) {
    console.error(`[SECURITY ALERT] TenantId mismatch for user ${userId}: session=${sessionTenantId}, actual=${actualTenantId}. Forcing re-login.`);
    // Critical: Force logout on tenantId mismatch - this is a security issue
    userTenantCache.delete(userId);
    return { valid: false, shouldForceLogout: true };
  }
  
  return { valid: true, shouldForceLogout: false };
}

// Export function to invalidate cache when user is updated
export function invalidateUserTenantCache(userId: number): void {
  userTenantCache.delete(userId);
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow platform admins (Super Admin)
  if (req.session?.isPlatformAdmin && req.session?.platformAdminId) {
    return next();
  }
  // Regular tenant users need both userId and tenantId
  if (!req.session?.userId || !req.session?.tenantId) {
    return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
  }
  
  // Validate tenantId against database - critical security check
  const validation = await validateAndSyncTenantId(req, res);
  if (!validation.valid) {
    if (validation.shouldForceLogout) {
      // Destroy session on security violation
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
    }
    return res.status(401).json({ error: "Oturum güvenlik ihlali tespit edildi. Lütfen tekrar giriş yapın." });
  }
  
  next();
}

// Middleware for platform admin only routes
function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isPlatformAdmin || !req.session?.platformAdminId) {
    return res.status(401).json({ error: "Platform yöneticisi girişi gerekiyor" });
  }
  next();
}

function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Platform admins have all permissions BUT still need tenantId sync if they have userId
    if (req.session?.isPlatformAdmin && req.session?.platformAdminId) {
      // If platform admin also has a userId (they logged in as a regular user first),
      // ensure their session.tenantId matches their actual tenantId to prevent data leakage
      if (req.session?.userId) {
        const user = await storage.getAppUser(req.session.userId);
        if (user && user.tenantId !== req.session.tenantId) {
          console.log(`[PLATFORM_ADMIN] Syncing tenantId for user ${req.session.userId}: ${req.session.tenantId} -> ${user.tenantId}`);
          req.session.tenantId = user.tenantId;
        }
      }
      return next();
    }
    
    if (!req.session?.userId || !req.session?.tenantId) {
      return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
    }
    
    // Validate tenantId against database - critical security check
    const validation = await validateAndSyncTenantId(req, res);
    if (!validation.valid) {
      if (validation.shouldForceLogout) {
        // Destroy session on security violation
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
      }
      return res.status(401).json({ error: "Oturum güvenlik ihlali tespit edildi. Lütfen tekrar giriş yapın." });
    }
    
    const userPermissions = req.session.permissions || [];
    
    // Check if user has ANY of the required permissions (OR logic)
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
    
    if (!hasPermission) {
      return res.status(403).json({ error: "Bu işlemi yapmak için yetkiniz yok" });
    }
    
    next();
  };
}

// Permission constants for type safety
const PERMISSIONS = {
  RESERVATIONS_VIEW: "reservations.view",
  RESERVATIONS_CREATE: "reservations.create",
  RESERVATIONS_EDIT: "reservations.edit",
  RESERVATIONS_DELETE: "reservations.delete",
  RESERVATIONS_REQUEST: "reservations.request",
  ACTIVITIES_VIEW: "activities.view",
  ACTIVITIES_MANAGE: "activities.manage",
  CALENDAR_VIEW: "calendar.view",
  CALENDAR_MANAGE: "calendar.manage",
  CAPACITY_VIEW: "capacity.view",
  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",
  SETTINGS_TEMPLATES_MANAGE: "settings.templates.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  WHATSAPP_VIEW: "whatsapp.view",
  WHATSAPP_MANAGE: "whatsapp.manage",
  BOT_VIEW: "bot.view",
  BOT_MANAGE: "bot.manage",
  AGENCIES_VIEW: "agencies.view",
  AGENCIES_MANAGE: "agencies.manage",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  SUBSCRIPTION_VIEW: "subscription.view",
  SUBSCRIPTION_MANAGE: "subscription.manage",
} as const;

// Helper function to log API errors to error_events table (for Super Admin monitoring)
async function logApiError(params: {
  tenantId?: number;
  severity?: ErrorSeverity;
  category: ErrorCategory;
  source: string;
  message: string;
  suggestion?: string;
  requestPath?: string;
  requestMethod?: string;
  statusCode?: number;
  userId?: number;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await logErrorEvent({
      tenantId: params.tenantId,
      severity: params.severity || 'error',
      category: params.category,
      source: params.source,
      message: params.message,
      suggestion: params.suggestion,
      requestPath: params.requestPath,
      requestMethod: params.requestMethod,
      statusCode: params.statusCode,
      userId: params.userId,
      userEmail: params.userEmail,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('Failed to log error event:', err);
  }
}

// Plan verification middleware - checks if write operations are allowed for tenant
async function checkPlanForWrite(tenantId?: number): Promise<{ allowed: boolean; message: string; status?: string }> {
  if (!tenantId) {
    // Allow if no tenant context (backward compatibility)
    return { allowed: true, message: "OK", status: 'active' };
  }
  const verification = await storage.verifyTenantPlan(tenantId);
  
  if (!verification.canWrite) {
    let message = verification.message;
    
    if (verification.status === 'expired') {
      message = "Planınız dolmuş. Sisteme erişim için planınızı yenileyin.";
    } else if (verification.status === 'suspended') {
      message = "Hesabınız askıya alınmış. Destek ile iletişime geçin.";
    }
    
    return { allowed: false, message, status: verification.status };
  }
  
  return { allowed: true, message: "OK", status: verification.status };
}

// Default bot rules (used when no custom rules are defined in database) - 13 Madde
// These rules are ONLY for normal customers. Partner/Viewer rules are in persona-specific prompts.
const DEFAULT_BOT_RULES = `
=== BOT KURALLARI (13 MADDE) ===
⚠️ ÖNEMLİ: Bu kurallar SADECE normal müşteriler için geçerlidir. Partner veya İzleyici ise yukarıdaki PERSONA KURALLARINI uygula!

1. ETKİNLİK BİLGİSİ: Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.

2. MÜSAİTLİK/KONTENJAN: Yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ'ndeki yarın tarihini kullan.

3. MÜSAİTLİK BİLGİSİ YOKSA: "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de. Müşteri memnuniyetsiz/agresifse veya "destek talebi", "operatör", "beni arayın" gibi ifadeler kullanırsa da aynı şekilde yönlendir.

5. ÖZEL TALEPLER: Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.

6. REZERVASYON SORGUSU: Mevcut rezervasyonu olan müşteri bilgi isterse, kendilerine gönderilen takip linkini kullanmalarını söyle. Takip linki yoksa veya erişemedilerse yetkili yönlendirmesi yap.

7. TRANSFER: Aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.

8. EKSTRA HİZMET: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda "Ekstra Hizmetler" listesini kullan ve fiyatları ver.

9. PAKET TUR: Birden fazla aktivite içeren paket turlar hakkında soru sorarsa PAKET TURLAR bölümünü kullan ve bilgi ver.

10. SIK SORULAN SORULAR: Her aktivite veya paket tur için tanımlı SSS bölümünü kontrol et. Eğer orada cevap yoksa GENEL SSS bölümüne bak. Bu bölümde iptal politikası, ödeme yöntemleri gibi şirket geneli sorular yer alır.

11. MÜŞTERİ MÜSAİTLİK SORGULARI (SADECE MÜŞTERİLER İÇİN): Müşteri müsaitlik sorduğunda, istenen tarih ve saat için müsaitlik bilgisini paylaş. Sonra rezervasyon yapmak isterse ilgili aktivitenin web sitesi linkini paylaş. (⚠️ Partner/İzleyicilere link VERME!)

12. MÜŞTERİ DEĞİŞİKLİK TALEPLERİ (SADECE MÜŞTERİLER İÇİN): Müşteri saat/tarih değişikliği veya iptal istediğinde, önce istenen yeni tarih/saat için müsaitlik bilgisini paylaş. Ardından kendilerine gönderilen takip linkinden değişiklik talebini oluşturabileceklerini söyle. (⚠️ Partner/İzleyicilere takip linki VERME - panele yönlendir!)

13. REZERVASYON LİNKİ SEÇİMİ (SADECE MÜŞTERİLER İÇİN): Müşteriyle İngilizce konuşuyorsan "EN Reservation Link" kullan. İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder. Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan. (⚠️ Partner/İzleyicilere link VERME!)
`;

// Gemini AI Integration - supports both Replit integration and standalone API key
let ai: GoogleGenAI | null = null;
try {
  // Check for Replit AI Integration first, then fallback to standard GEMINI_API_KEY
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  
  if (apiKey) {
    const options: any = { apiKey };
    // Only add httpOptions if using Replit integration with base URL
    if (baseUrl) {
      options.httpOptions = {
        apiVersion: "",
        baseUrl: baseUrl,
      };
    }
    ai = new GoogleGenAI(options);
    console.log("Gemini AI Integration initialized successfully");
  } else {
    console.warn("Gemini API not available, falling back to mock responses");
  }
} catch (err) {
  console.warn("Gemini API not available, falling back to mock responses");
}

// Turkish day names
const TURKISH_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TURKISH_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Hazıran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Helper function to parse Turkish date expressions from message and return relevant dates
function parseDatesFromMessage(message: string): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
  const currentYear = today.getFullYear();
  const dates: Set<string> = new Set();
  const msgLower = message.toLowerCase();
  
  // Turkish month names to number mapping
  const monthMap: Record<string, number> = {
    'ocak': 0, 'subat': 1, 'şubat': 1, 'mart': 2, 'nisan': 3, 
    'mayis': 4, 'mayıs': 4, 'haziran': 5, 'hazıran': 5, 'temmuz': 6, 'agustos': 7, 'ağustos': 7,
    'eylul': 8, 'eylül': 8, 'ekim': 9, 'kasim': 10, 'kasım': 10, 'aralik': 11, 'aralık': 11
  };
  
  // Helper to format date as YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  // Relative date keywords
  if (msgLower.includes('bugün') || msgLower.includes('bugün')) {
    dates.add(formatDate(today));
  }
  if (msgLower.includes('yarın') || msgLower.includes('yarın')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    dates.add(formatDate(tomorrow));
  }
  if (msgLower.includes('öbür gün') || msgLower.includes('obur gun') || msgLower.includes('ertesi gün')) {
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    dates.add(formatDate(dayAfter));
  }
  if (msgLower.includes('hafta sonu') || msgLower.includes('hafta sonu')) {
    // Find next Saturday and Sunday (or this weekend if today is Sat/Sun)
    const dayOfWeek = today.getDay();
    let daysUntilSat = (6 - dayOfWeek + 7) % 7;
    if (daysUntilSat === 0 && dayOfWeek === 6) daysUntilSat = 0; // Today is Saturday
    if (dayOfWeek === 0) daysUntilSat = 6; // Today is Sunday, get next Saturday
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSat);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    dates.add(formatDate(saturday));
    dates.add(formatDate(sunday));
  }
  if (msgLower.includes('gelecek hafta') || msgLower.includes('önümüzdeki hafta') || msgLower.includes('haftaya')) {
    // Add next 7 days starting from next Monday
    const daysUntilMon = (8 - today.getDay()) % 7 || 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + daysUntilMon + i);
      dates.add(formatDate(d));
    }
  }
  
  // Parse "5 şubat", "15 ocak" patterns
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    const regex = new RegExp(`(\\d{1,2})\\s*${monthName}`, 'gi');
    let match;
    while ((match = regex.exec(msgLower)) !== null) {
      const day = parseInt(match[1], 10);
      if (day >= 1 && day <= 31) {
        let year = currentYear;
        const targetDate = new Date(year, monthNum, day);
        targetDate.setHours(0, 0, 0, 0); // Normalize for comparison
        // If date is strictly in the past (not today), assume next year
        if (targetDate.getTime() < today.getTime()) {
          year = currentYear + 1;
        }
        const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.add(dateStr);
      }
    }
  }
  
  // Parse DD/MM or DD.MM patterns
  const slashPattern = /(\d{1,2})[\/\.](\d{1,2})/g;
  let slashMatch;
  while ((slashMatch = slashPattern.exec(message)) !== null) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = currentYear;
      const targetDate = new Date(year, month - 1, day);
      targetDate.setHours(0, 0, 0, 0); // Normalize for comparison
      // If date is strictly in the past (not today), assume next year
      if (targetDate.getTime() < today.getTime()) {
        year = currentYear + 1;
      }
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.add(dateStr);
    }
  }
  
  return Array.from(dates);
}

// Helper to normalize Turkish text for matching (remove accents, lowercase)
function normalizeTurkish(text: string): string {
  return text.toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .trim();
}

// Helper function to find holidays matching keywords in a message
async function findHolidayDatesFromMessage(message: string): Promise<string[]> {
  const msgNormalized = normalizeTurkish(message);
  const dates: Set<string> = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all active holidays
  const allHolidays = await storage.getHolidays();
  const activeHolidays = allHolidays.filter(h => h.isActive);
  
  for (const holiday of activeHolidays) {
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(holiday.keywords || '[]');
      if (Array.isArray(parsed)) {
        keywords = parsed.map(k => String(k));
      }
    } catch {
      // If parsing fails, skip keywords
    }
    
    // Also match holiday name (normalized)
    keywords.push(holiday.name);
    
    // Normalize all keywords and check for matches
    const matches = keywords.some(kw => {
      const kwNormalized = normalizeTurkish(kw);
      return msgNormalized.includes(kwNormalized);
    });
    
    if (matches) {
      // Include holidays that are ongoing or in the future (endDate >= today)
      const endDate = new Date(holiday.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      if (endDate.getTime() >= today.getTime()) {
        // Add all days of this holiday (from start or today, whichever is later)
        const startDate = new Date(holiday.startDate);
        startDate.setHours(0, 0, 0, 0);
        const effectiveStart = startDate.getTime() >= today.getTime() ? startDate : today;
        const current = new Date(effectiveStart);
        const holidayEnd = new Date(holiday.endDate);
        
        while (current <= holidayEnd) {
          dates.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    }
  }
  
  return Array.from(dates);
}

// Helper function to get capacity including virtual slots from activity defaults
async function getCapacityWithVirtualSlots(dates: string[], tenantId?: number): Promise<Array<{
  activityId: number;
  date: string;
  time: string;
  totalSlots: number;
  bookedSlots: number;
  isVirtual: boolean;
}>> {
  const allCapacity = await storage.getCapacity();
  const allReservations = await storage.getReservations(tenantId);
  const allActivities = await storage.getActivities(tenantId);
  const activeActivities = allActivities.filter(a => a.active);
  
  const result: Array<{
    activityId: number;
    date: string;
    time: string;
    totalSlots: number;
    bookedSlots: number;
    isVirtual: boolean;
  }> = [];
  
  for (const dateStr of dates) {
    // Get DB capacity for this date
    const dbCapacity = allCapacity.filter(c => c.date === dateStr);
    
    // Get reservations for this date (not cancelled)
    const dateReservations = allReservations.filter(r => 
      r.date === dateStr && r.status !== 'cancelled'
    );
    
    // Build reservation counts map
    const reservationCounts: Record<string, number> = {};
    for (const r of dateReservations) {
      if (r.activityId && r.time) {
        const key = `${r.activityId}-${r.time}`;
        reservationCounts[key] = (reservationCounts[key] || 0) + r.quantity;
      }
    }
    
    // Track which slots exist in DB
    const existingSlots = new Set(dbCapacity.map(c => `${c.activityId}-${c.time}`));
    
    // Add DB capacity with actual reservation counts
    for (const cap of dbCapacity) {
      const slotKey = `${cap.activityId}-${cap.time}`;
      const bookedFromReservations = reservationCounts[slotKey] || 0;
      result.push({
        activityId: cap.activityId,
        date: cap.date,
        time: cap.time,
        totalSlots: cap.totalSlots,
        bookedSlots: bookedFromReservations, // Use actual reservation count instead of stored value
        isVirtual: false
      });
    }
    
    // Generate virtual slots from activity defaults
    for (const activity of activeActivities) {
      if (activity.defaultTimes) {
        try {
          const times = JSON.parse(activity.defaultTimes);
          if (Array.isArray(times)) {
            for (const time of times) {
              const slotKey = `${activity.id}-${time}`;
              if (!existingSlots.has(slotKey)) {
                const bookedCount = reservationCounts[slotKey] || 0;
                result.push({
                  activityId: activity.id,
                  date: dateStr,
                  time: time,
                  totalSlots: activity.defaultCapacity || 10,
                  bookedSlots: bookedCount,
                  isVirtual: true
                });
              }
            }
          }
        } catch {}
      }
    }
  }
  
  return result;
}

// Turkish public holidays (fixed dates + Islamic holidays for 2025-2026)
const TURKISH_HOLIDAYS: { date: string; name: string }[] = [
  // 2025 Fixed holidays
  { date: '2025-01-01', name: 'Yılbaşı' },
  { date: '2025-04-23', name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
  { date: '2025-05-01', name: '1 Mayıs Emek ve Dayanışma Günü' },
  { date: '2025-05-19', name: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { date: '2025-07-15', name: '15 Temmuz Demokrasi ve Milli Birlik Günü' },
  { date: '2025-08-30', name: '30 Ağustos Zafer Bayramı' },
  { date: '2025-10-29', name: '29 Ekim Cumhuriyet Bayramı' },
  // 2025 Islamic holidays (approximate - may shift by 1 day based on moon sighting)
  { date: '2025-03-30', name: 'Ramazan Bayramı 1. Gün' },
  { date: '2025-03-31', name: 'Ramazan Bayramı 2. Gün' },
  { date: '2025-04-01', name: 'Ramazan Bayramı 3. Gün' },
  { date: '2025-06-06', name: 'Kurban Bayramı 1. Gün' },
  { date: '2025-06-07', name: 'Kurban Bayramı 2. Gün' },
  { date: '2025-06-08', name: 'Kurban Bayramı 3. Gün' },
  { date: '2025-06-09', name: 'Kurban Bayramı 4. Gün' },
  // 2026 Fixed holidays
  { date: '2026-01-01', name: 'Yılbaşı' },
  { date: '2026-04-23', name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
  { date: '2026-05-01', name: '1 Mayıs Emek ve Dayanışma Günü' },
  { date: '2026-05-19', name: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { date: '2026-07-15', name: '15 Temmuz Demokrasi ve Milli Birlik Günü' },
  { date: '2026-08-30', name: '30 Ağustos Zafer Bayramı' },
  { date: '2026-10-29', name: '29 Ekim Cumhuriyet Bayramı' },
  // 2026 Islamic holidays (approximate)
  { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün' },
  { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün' },
  { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün' },
  { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün' },
  { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün' },
  { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün' },
  { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün' },
];

// Build date context for the AI
function buildDateContext(): string {
  const now = new Date();
  // Convert to Turkey timezone (UTC+3) correctly
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const turkeyTime = utcTime + (3 * 60 * 60000); // Add 3 hours for Turkey
  const localNow = new Date(turkeyTime);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatReadable = (d: Date) => `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()} ${TURKISH_DAYS[d.getDay()]}`;
  
  const today = new Date(localNow);
  const tomorrow = new Date(localNow); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(localNow); dayAfter.setDate(dayAfter.getDate() + 2);
  
  // Find this weekend (Saturday and Sunday)
  const daysUntilSaturday = (6 - localNow.getDay() + 7) % 7;
  const thisSaturday = new Date(localNow); thisSaturday.setDate(thisSaturday.getDate() + daysUntilSaturday);
  const thisSunday = new Date(thisSaturday); thisSunday.setDate(thisSunday.getDate() + 1);
  
  // Find next 3 upcoming holidays
  const todayStr = formatDate(today);
  const upcomingHolidays = TURKISH_HOLIDAYS
    .filter(h => h.date >= todayStr)
    .slice(0, 5)
    .map(h => {
      const hDate = new Date(h.date);
      const daysUntil = Math.ceil((hDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `  - ${h.name}: ${h.date} (${daysUntil === 0 ? 'BUGÜN' : daysUntil === 1 ? 'YARIN' : daysUntil + ' gün sonra'})`;
    })
    .join('\n');
  
  return `=== TARİH BİLGİSİ (Türkiye Saati) ===
Bugün: ${formatDate(today)} - ${formatReadable(today)}
Yarın: ${formatDate(tomorrow)} - ${formatReadable(tomorrow)}
Öbür gün: ${formatDate(dayAfter)} - ${formatReadable(dayAfter)}
Bu Cumartesi: ${formatDate(thisSaturday)} - ${formatReadable(thisSaturday)}
Bu Pazar: ${formatDate(thisSunday)} - ${formatReadable(thisSunday)}

=== YAKLAŞAN RESMİ TATİLLER ===
${upcomingHolidays || 'Yakın tarihte resmi tatil yok.'}

Müşteri "yarın", "öbür gün", "bu hafta sonu", "bayramda" gibi ifadeler kullanırsa yukarıdaki tarihleri referans al.`;
}

// AI function using Gemini API with activity descriptions, package tours, FAQs, and custom bot prompt
async function generateAIResponse(history: any[], context: any, customPrompt?: string) {
  // Get bot access settings (default all to true if not provided)
  const botAccess = context.botAccess || {
    activities: true,
    packageTours: true,
    capacity: true,
    faq: true,
    confirmation: true,
    transfer: true,
    extras: true
  };

  // Build activity descriptions for context (only if access enabled)
  const activityDescriptions = botAccess.activities ? (context.activities
    ?.map((a: any) => {
      let desc = `- ${a.name}: ${a.description || "Açıklama yok"} (Fiyat: ${a.price} TL`;
      if (a.priceUsd) desc += `, $${a.priceUsd}`;
      desc += `, Süre: ${a.durationMinutes} dk)`;
      
      // Aktivite saatleri bilgisi
      try {
        const times = JSON.parse(a.defaultTimes || '[]');
        if (Array.isArray(times) && times.length > 0) {
          desc += `\n  Sefer/Uçuş Saatleri: ${times.join(', ')}`;
          desc += `\n  NOT: Müşteri en iyi saat sorduğunda, bu saatlerden birini öner. Sabah erken saatler genelde daha serin ve sakin olur.`;
        }
      } catch {}
      
      if (a.reservationLink) desc += `\n  TR Rezervasyon Linki: ${a.reservationLink}`;
      if (a.reservationLinkEn) desc += `\n  EN Reservation Link: ${a.reservationLinkEn}`;
      
      
      // Transfer bilgisi (only if access enabled)
      if (botAccess.transfer) {
        if (a.hasFreeHotelTransfer) {
          desc += `\n  Ücretsiz Otel Transferi: EVET`;
          try {
            const zones = JSON.parse(a.transferZones || '[]');
            if (zones.length > 0) {
              // Check if new format (object with zone and minutesBefore) or old format (string array)
              if (typeof zones[0] === 'object' && zones[0].zone) {
                desc += `\n  Transfer Bölgeleri ve Alınış Süreleri:`;
                for (const z of zones) {
                  desc += `\n    * ${z.zone}: Aktivite saatinden ${z.minutesBefore} dakika önce alınır`;
                }
                desc += `\n  NOT: Müşteri otelinin hangi bölgede olduğunu sorup, yukarıdaki sürelere göre alınış saatini hesaplayıp söyle.`;
              } else {
                // Old format - just zone names
                desc += ` (Bölgeler: ${zones.join(', ')})`;
              }
            }
          } catch {}
        } else {
          desc += `\n  Ücretsiz Otel Transferi: HAYIR`;
        }
      }
      
      // Ekstralar bilgisi (only if access enabled)
      if (botAccess.extras) {
        try {
          const extras = JSON.parse(a.extras || '[]');
          if (extras.length > 0) {
            desc += `\n  Ekstra Hizmetler:`;
            for (const extra of extras) {
              desc += `\n    * ${extra.name}: ${extra.priceTl} TL`;
              if (extra.priceUsd) desc += ` / $${extra.priceUsd}`;
              if (extra.description) desc += ` (${extra.description})`;
            }
          }
        } catch {}
      }
      
      // SSS bilgisi (only if access enabled)
      if (botAccess.faq) {
        try {
          const faqItems = JSON.parse(a.faq || '[]');
          if (faqItems.length > 0) {
            desc += `\n  Sık Sorulan Sorular:`;
            for (const faq of faqItems) {
              if (faq.question && faq.answer) {
                desc += `\n    S: ${faq.question}`;
                desc += `\n    C: ${faq.answer}`;
              }
            }
          }
        } catch {}
      }
      
      // Bot için ek talimatlar (aktiviteye özel kurallar)
      if (a.botPrompt) {
        desc += `\n  ⚠️ ÖZEL TALİMATLAR: ${a.botPrompt}`;
      }
      
      // Minimum yaş bilgisi
      if (a.minAge) {
        desc += `\n  Minimum Yaş: ${a.minAge} yaş ve üzeri`;
      }
      
      // Tur dilleri
      try {
        const languages = JSON.parse(a.tourLanguages || '[]');
        if (languages.length > 0) {
          desc += `\n  Tur Dilleri: ${languages.join(', ')}`;
        }
      } catch {}
      
      // Dahil olanlar
      try {
        const included = JSON.parse(a.includedItems || '[]');
        if (included.length > 0) {
          desc += `\n  Fiyata Dahil Olanlar: ${included.join(', ')}`;
        }
      } catch {}
      
      // Dahil olmayanlar
      try {
        const excluded = JSON.parse(a.excludedItems || '[]');
        if (excluded.length > 0) {
          desc += `\n  Fiyata Dahil Olmayanlar: ${excluded.join(', ')}`;
        }
      } catch {}
      
      // Getirmeniz gerekenler
      try {
        const whatToBring = JSON.parse(a.whatToBring || '[]');
        if (whatToBring.length > 0) {
          desc += `\n  Yanınızda Getirmeniz Gerekenler: ${whatToBring.join(', ')}`;
        }
      } catch {}
      
      // İzin verilmeyenler
      try {
        const notAllowed = JSON.parse(a.notAllowed || '[]');
        if (notAllowed.length > 0) {
          desc += `\n  İzin Verilmeyenler: ${notAllowed.join(', ')}`;
        }
      } catch {}
      
      // Buluşma noktası ve harita linki
      if (a.meetingPoint) {
        desc += `\n  Buluşma Noktası: ${a.meetingPoint}`;
        if (a.meetingPointMapLink) {
          desc += ` (Harita: ${a.meetingPointMapLink})`;
        }
      }
      
      // Varış süresi
      if (a.arrivalMinutesBefore) {
        desc += `\n  Önceden Varış Süresi: Aktiviteden ${a.arrivalMinutesBefore} dakika önce buluşma noktasında olunmalı`;
      }
      
      // Sağlık ve güvenlik notları
      if (a.healthNotes) {
        desc += `\n  Sağlık ve Güvenlik Notları: ${a.healthNotes}`;
      }
      
      // Tur programı/itinerary
      try {
        const itinerary = JSON.parse(a.itinerary || '[]');
        if (itinerary.length > 0) {
          desc += `\n  Tur Programı:`;
          for (const step of itinerary) {
            if (step.time && step.title) {
              desc += `\n    * ${step.time}: ${step.title}`;
              if (step.description) desc += ` - ${step.description}`;
            }
          }
        }
      } catch {}
      
      return desc;
    })
    .join("\n") || "") : "";
  
  // Build package tour descriptions for context (only if access enabled)
  const packageTourDescriptions = botAccess.packageTours ? (context.packageTours
    ?.filter((pt: any) => pt.active)
    ?.map((pt: any) => {
      let desc = `- ${pt.name}: ${pt.description || "Paket tur"} (Fiyat: ${pt.price} TL`;
      if (pt.priceUsd) desc += `, $${pt.priceUsd}`;
      desc += `)`;
      if (pt.reservationLink) desc += `\n  TR Rezervasyon Linki: ${pt.reservationLink}`;
      if (pt.reservationLinkEn) desc += `\n  EN Reservation Link: ${pt.reservationLinkEn}`;
      
      
      // SSS bilgisi (only if access enabled)
      if (botAccess.faq) {
        try {
          const faqItems = JSON.parse(pt.faq || '[]');
          if (faqItems.length > 0) {
            desc += `\n  Sık Sorulan Sorular:`;
            for (const faq of faqItems) {
              if (faq.question && faq.answer) {
                desc += `\n    S: ${faq.question}`;
                desc += `\n    C: ${faq.answer}`;
              }
            }
          }
        } catch {}
      }
      
      return desc;
    })
    .join("\n") || "") : "";
  
  // Build general FAQ context (company-wide FAQ - only if access enabled)
  let generalFaqInfo = "";
  if (botAccess.faq && context.generalFaq) {
    try {
      const generalFaqItems = typeof context.generalFaq === 'string' 
        ? JSON.parse(context.generalFaq) 
        : context.generalFaq;
      if (Array.isArray(generalFaqItems) && generalFaqItems.length > 0) {
        generalFaqInfo = "\n=== GENEL SIK SORULAN SORULAR ===\n";
        generalFaqInfo += "(Bu sorular tüm aktiviteler için geçerlidir)\n";
        for (const faq of generalFaqItems) {
          if (faq.question && faq.answer) {
            generalFaqInfo += `S: ${faq.question}\n`;
            generalFaqInfo += `C: ${faq.answer}\n\n`;
          }
        }
      }
    } catch {}
  }
  
  // Build capacity/availability information (only if access enabled)
  let capacityInfo = "";
  if (botAccess.capacity && context.capacityData && context.capacityData.length > 0) {
    const capacityByActivity: Record<string, string[]> = {};
    for (const cap of context.capacityData) {
      const activity = context.activities?.find((a: any) => a.id === cap.activityId);
      const activityName = activity?.name || `Aktivite #${cap.activityId}`;
      const available = cap.totalSlots - cap.bookedSlots;
      
      if (!capacityByActivity[activityName]) {
        capacityByActivity[activityName] = [];
      }
      capacityByActivity[activityName].push(
        `  ${cap.date} saat ${cap.time}: ${available} kişilik yer ${available > 0 ? 'MÜSAİT' : 'DOLU'}`
      );
    }
    
    capacityInfo = "\n=== MÜSAİTLİK BİLGİSİ ===\n";
    for (const [name, slots] of Object.entries(capacityByActivity)) {
      capacityInfo += `${name}:\n${slots.join('\n')}\n`;
    }
  } else if (botAccess.capacity) {
    capacityInfo = "\n=== MÜSAİTLİK BİLGİSİ ===\nŞu an sistemde kayıtlı kapasite verisi yok. Müşteriye kontenjan bilgisi için takvime bakmasını veya bizi aramasını önerebilirsin.\n";
  }
  // If botAccess.capacity is false, capacityInfo remains empty
  
  // Build reservation context with detailed info
  let reservationContext = "";
  if (context.allReservations && context.allReservations.length > 0) {
    const reservations = context.allReservations;
    const customerName = reservations[0]?.customerName || 'Müşteri';
    
    reservationContext = `
=== MÜŞTERİ REZERVASYON BİLGİLERİ ===
Müşteri Adı: ${customerName}
Toplam Rezervasyon Sayısı: ${reservations.length}

`;
    
    for (const res of reservations) {
      const statusText = res.status === 'confirmed' ? 'Onaylı' : res.status === 'cancelled' ? 'İptal' : 'Beklemede';
      const paymentStatusText = res.paymentStatus === 'paid' ? 'Ödendi' : res.paymentStatus === 'partial' ? 'Kısmi Ödeme' : 'Ödenmedi';
      const paidAmount = res.paidAmount || 0;
      const totalPrice = res.priceTl || 0;
      const remainingAmount = totalPrice - paidAmount;
      const hotelName = (res as any).hotelName || '';
      const hasHotelTransfer = (res as any).hasHotelTransfer || false;
      
      // Calculate pickup time if we have activity info with transfer zones
      let pickupTimeInfo = '';
      if (hasHotelTransfer && res.time) {
        // Find activity to get transfer zones
        const relatedActivity = context.activities?.find((a: any) => a.id === res.activityId);
        if (relatedActivity && relatedActivity.transferZones) {
          try {
            const zones = JSON.parse(relatedActivity.transferZones || '[]');
            if (zones.length > 0 && typeof zones[0] === 'object' && zones[0].zone) {
              // Parse activity time (e.g., "10:00")
              const timeParts = res.time.split(':');
              if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);
                if (!isNaN(hours) && !isNaN(minutes)) {
                  // Check if customer's hotel matches a zone
                  const customerZone = hotelName ? zones.find((z: any) => 
                    hotelName.toLowerCase().includes(z.zone.toLowerCase()) ||
                    z.zone.toLowerCase().includes(hotelName.toLowerCase())
                  ) : null;
                  
                  if (customerZone) {
                    // Customer's zone matched - show specific pickup time
                    let pickupMinutes = (hours * 60 + minutes) - customerZone.minutesBefore;
                    // Handle negative (previous day) - normalize to 24h
                    if (pickupMinutes < 0) pickupMinutes += 24 * 60;
                    const pickupHours = Math.floor(pickupMinutes / 60) % 24;
                    const pickupMins = pickupMinutes % 60;
                    const pickupTime = `${String(pickupHours).padStart(2, '0')}:${String(pickupMins).padStart(2, '0')}`;
                    pickupTimeInfo = `\n   Alınış Saati: ${pickupTime} (${customerZone.zone} bölgesi)`;
                  } else {
                    // No match - show all zones
                    pickupTimeInfo = '\n   Alınış Saatleri (Bölgeye Göre):';
                    for (const z of zones) {
                      let pickupMinutes = (hours * 60 + minutes) - z.minutesBefore;
                      // Handle negative (previous day) - normalize to 24h
                      if (pickupMinutes < 0) pickupMinutes += 24 * 60;
                      const pickupHours = Math.floor(pickupMinutes / 60) % 24;
                      const pickupMins = pickupMinutes % 60;
                      const pickupTime = `${String(pickupHours).padStart(2, '0')}:${String(pickupMins).padStart(2, '0')}`;
                      pickupTimeInfo += `\n     * ${z.zone}: ${pickupTime}`;
                    }
                    pickupTimeInfo += '\n   (Müşterinin oteli hangi bölgede olduğunu sor ve doğru saati söyle)';
                  }
                }
              }
            }
          } catch {}
        } else if (!context.activities) {
          // Activities not loaded - ask for zone
          pickupTimeInfo = '\n   (Alınış saati için müşterinin otelinin hangi bölgede olduğunu sor)';
        }
      }
      
      reservationContext += `📅 ${res.date} - ${res.time}
   Aktivite: ${res.activityName || 'Paket Tur'}
   Kişi Sayısı: ${res.quantity} kişi
   Toplam Tutar: ${totalPrice.toLocaleString()} TL
   Ödeme Durumu: ${paymentStatusText}
   Ödenen: ${paidAmount.toLocaleString()} TL
   Kalan Ödeme: ${remainingAmount > 0 ? remainingAmount.toLocaleString() + ' TL' : 'Yok'}
   Rezervasyon Durumu: ${statusText}
   ${res.externalId ? `Sipariş No: ${res.externalId}` : ''}
   ${hasHotelTransfer ? `Otel Transferi: EVET${pickupTimeInfo}` : ''}
   ${hotelName ? `Otel Adı: ${hotelName}` : ''}

`;
    }
    
    reservationContext += `Bu müşterinin yukarıdaki rezervasyonları var. Sorularına bu bilgiler doğrultusunda cevap ver.`;
  } else if (context.hasReservation && context.reservation) {
    const res = context.reservation;
    reservationContext = `
MÜŞTERİ BİLGİSİ (Sistemde kayıtlı):
- İsim: ${res.customerName}
- Rezervasyon Tarihi: ${res.date}
- Saat: ${res.time}
- Sipariş No: ${res.externalId || 'Yok'}
- Durum: ${res.status === 'confirmed' ? 'Onaylı' : 'Beklemede'}

Bu müşterinin rezervasyonu var. Ona yardımcı ol.`;
  } else if (context.askForOrderNumber) {
    reservationContext = `
DİKKAT: Bu müşterinin sistemde rezervasyonu bulunamadı.
Eğer müşteri mevcut bir rezervasyon hakkında soru soruyorsa, kibarca SİPARİŞ NUMARASINI sor.
"Sipariş numaranızı paylaşır mısınız?" şeklinde sor.
Yeni rezervasyon yapmak istiyorlarsa normal şekilde yardımcı ol.`;
  }

  // Build partner context - use settings if available, otherwise use default
  let partnerContext = "";
  if (context.isPartner && context.partnerName) {
    if (context.partnerPrompt) {
      // Use custom partner prompt from settings
      partnerContext = `
=== PARTNER ACENTA BİLGİSİ ===
DİKKAT: Bu mesaj bir PARTNER ACENTADAN (${context.partnerName}) geliyor, normal bir müşteriden DEĞİL!

${context.partnerPrompt}
`;
    } else {
      // Use default partner instructions
      partnerContext = `
=== PARTNER ACENTA BİLGİSİ ===
DİKKAT: Bu mesaj bir PARTNER ACENTADAN (${context.partnerName}) geliyor, normal bir müşteriden DEĞİL!

Partner acentalara FARKLI davran:
1. Rezervasyon veya web sitesi linki VERME - bunun yerine müsaitlik/kapasite bilgisi paylaş
2. Partner fiyatlarını kullan (eğer varsa)
3. Daha profesyonel ve iş odaklı iletişim kur

MÜSAİTLİK SORGULARINDA:
- Sorulan tarih ve saat için müsaitlik bilgisini paylaş
- Ardından "Smartur panelinizden rezervasyon talebinizi oluşturabilirsiniz" de

DEĞİŞİKLİK TALEPLERİNDE:
- Partner tarih/saat değişikliği isterse "Smartur panelinizden değişiklik talebinizi oluşturabilirsiniz" de
- Takip linki veya web sitesi linki VERME

Örnek yanıt formatı (müsaitlik sorgusu):
"Merhaba [Partner Adı], [tarih] için [aktivite] müsaitlik durumu:
- Saat 10:00: 8 kişilik yer mevcut
- Saat 14:00: 12 kişilik yer mevcut
Smartur panelinizden rezervasyon talebinizi oluşturabilirsiniz."

Örnek yanıt formatı (değişiklik talebi):
"Merhaba [Partner Adı], değişiklik talebiniz için Smartur panelinizi kullanabilirsiniz. Değişiklik talebinizi panel üzerinden oluşturabilirsiniz."
`;
    }
  }

  // Build viewer context - use settings if available, otherwise use default
  let viewerContext = "";
  if (context.isViewer && context.viewerName) {
    if (context.viewerPrompt) {
      // Use custom viewer prompt from settings
      viewerContext = `
=== İZLEYİCİ KULLANICI BİLGİSİ ===
DİKKAT: Bu mesaj bir İZLEYİCİDEN (${context.viewerName}) geliyor, normal bir müşteriden DEĞİL!

${context.viewerPrompt}
`;
    } else {
      // Use default viewer instructions
      viewerContext = `
=== İZLEYİCİ KULLANICI BİLGİSİ ===
DİKKAT: Bu mesaj bir İZLEYİCİDEN (${context.viewerName}) geliyor, normal bir müşteriden DEĞİL!

İzleyicilere FARKLI davran:
1. Rezervasyon veya web sitesi linki VERME
2. Daha profesyonel ve iş odaklı iletişim kur
3. İzleyicinin sisteme giriş yaparak işlem yapması gerektiğini belirt

MÜSAİTLİK SORGULARINDA:
- Sorulan tarih ve saat için müsaitlik bilgisini paylaş
- Ardından "Smartur panelinize giriş yaparak istediğiniz aktiviteyi seçip rezervasyon talebi oluşturabilirsiniz" de

REZERVASYON TALEPLERİNDE:
- İzleyici WhatsApp'tan rezervasyon yapmak isterse "Smartur panelinize giriş yaparak kolayca rezervasyon talebi oluşturabilirsiniz. Aktiviteyi seçin, tarih ve kişi sayısını belirtin" de
- WhatsApp üzerinden rezervasyon ALMA - panele yönlendir

DEĞİŞİKLİK TALEPLERİNDE:
- İzleyici tarih/saat değişikliği isterse "Smartur panelinizden değişiklik talebinizi oluşturabilirsiniz" de
- Takip linki veya web sitesi linki VERME

Örnek yanıt formatı (müsaitlik sorgusu):
"Merhaba ${context.viewerName}, [tarih] için [aktivite] müsaitlik durumu:
- Saat 10:00: 8 kişilik yer mevcut
- Saat 14:00: 12 kişilik yer mevcut
Smartur panelinizden rezervasyon talebinizi oluşturabilirsiniz."

Örnek yanıt formatı (değişiklik talebi):
"Merhaba ${context.viewerName}, değişiklik talebiniz için Smartur panelinizi kullanabilirsiniz. Değişiklik talebinizi panel üzerinden oluşturabilirsiniz."
`;
    }
  }

  // Build customer request context
  let customerRequestContext = "";
  if (context.pendingRequests && context.pendingRequests.length > 0) {
    customerRequestContext = `
=== MÜŞTERİ TALEP DURUMU ===
Bu müşterinin DEĞERLENDİRME AŞAMASINDA olan talepleri var:
`;
    for (const req of context.pendingRequests) {
      const requestType = req.requestType === 'time_change' ? 'Saat Değişikliği' : 
                          req.requestType === 'cancellation' ? 'İptal Talebi' : 'Diğer Talep';
      const createdDate = new Date(req.createdAt).toLocaleDateString('tr-TR');
      customerRequestContext += `- ${requestType} (${createdDate}): ${req.requestDetails || 'Detay yok'}\n`;
      if (req.preferredTime) {
        customerRequestContext += `  İstenen yeni saat: ${req.preferredTime}\n`;
      }
    }
    customerRequestContext += `
Eğer müşteri talebinin durumunu sorarsa, talebinin "DEĞERLENDİRME AŞAMASINDA" olduğunu ve ekibimizin en kısa sürede geri döneceğini söyle.
Sabırları için teşekkür et.`;
  } else if (context.customerRequests && context.customerRequests.length > 0) {
    // Customer has processed requests (approved or rejected)
    // Sort by createdAt descending to get the latest request
    const sortedRequests = [...context.customerRequests].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latestRequest = sortedRequests[0];
    if (latestRequest.status === 'approved' || latestRequest.status === 'rejected') {
      const statusText = latestRequest.status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ';
      customerRequestContext = `
=== MÜŞTERİ TALEP DURUMU ===
Bu müşterinin son talebi ${statusText}.
Eğer müşteri talebinin durumunu sorarsa, bu bilgiyi paylaş.`;
    }
  }
  
  // Use custom prompt from settings if available, otherwise use default
  const basePrompt = customPrompt || `Sen bir TURİZM REZERVASYONLARI DANIŞMANI'sın. 
Müşterilerle Türkçe konuşarak rezervasyon yardımcılığı yap. 
Kibar, samimi ve profesyonel ol. 
Müşterinin sorularına hızla cevap ver ve rezervasyon yapmalarına yardımcı ol.`;

  // Get current date context
  const dateContext = buildDateContext();

  const packageToursSection = packageTourDescriptions 
    ? `\n=== PAKET TURLAR ===\n${packageTourDescriptions}\n` 
    : "";

  // Build system overview section explaining the hierarchy
  const systemOverview = `=== SİSTEM HİYERARŞİSİ VE KARAR AĞACI ===

SMARTUR BOT ÇALIŞMA MANTIĞI:
1. Önce mesaj atan kişinin KİMLİĞİNİ belirle (Partner, İzleyici veya Müşteri)
2. Kimliğe göre DOĞRU KURALLARI uygula - aşağıdaki öncelik sırasına göre

KURAL ÖNCELİK SIRASI (Üstteki alttakini geçersiz kılar):
  1. PERSONA KURALLARI (Partner/İzleyici talimatları) → EN YÜKSEK ÖNCELİK
  2. Genel Bot Kuralları → Sadece normal müşteriler için geçerli
  3. Baz Davranış → En düşük öncelik

ÖNEMLİ:
- Eğer mesaj bir PARTNER veya İZLEYİCİDEN geliyorsa, aşağıdaki "PERSONA KURALLARI" bölümünü oku ve SADECE oradaki talimatları uygula.
- Genel kurallar (web sitesi linki gönderme, rezervasyon linki paylaşma) SADECE normal müşteriler için geçerlidir.
- Partner/İzleyicilere HİÇBİR ZAMAN rezervasyon linki veya web sitesi linki gönderme.

KİMLİK TESPİTİ:
${context.isPartner ? `✓ Bu kişi bir PARTNER ACENTADIR → Partner kurallarını uygula!` : ''}
${context.isViewer ? `✓ Bu kişi bir İZLEYİCİDİR → İzleyici kurallarını uygula!` : ''}
${!context.isPartner && !context.isViewer ? `✓ Bu kişi normal bir MÜŞTERİDİR → Genel kuralları uygula` : ''}
`;

  // Build persona-specific rules section (highest priority)
  let personaRulesSection = "";
  if (context.isPartner || context.isViewer) {
    personaRulesSection = `
=== PERSONA KURALLARI (EN YÜKSEK ÖNCELİK) ===
⚠️ DİKKAT: Bu bölümdeki kurallar genel kuralların ÜSTÜNDEDİR!
${partnerContext}${viewerContext}
`;
  }

  // Update general rules to be explicitly for customers only
  const customerOnlyRulesNote = context.isPartner || context.isViewer 
    ? `\n⚠️ NOT: Aşağıdaki genel kurallar sadece referans içindir. Bu kişi ${context.isPartner ? 'Partner' : 'İzleyici'} olduğu için yukarıdaki PERSONA KURALLARINI uygula!\n`
    : `\n✓ Bu kişi normal müşteri olduğu için aşağıdaki kuralları uygula:\n`;

  const systemPrompt = `${basePrompt}

${systemOverview}
${dateContext}
${personaRulesSection}
=== MEVCUT AKTİVİTELER ===
${activityDescriptions}
${packageToursSection}${capacityInfo}${generalFaqInfo}
${reservationContext}
${customerRequestContext}

=== GENEL BOT KURALLARI (MÜŞTERİLER İÇİN) ===${customerOnlyRulesNote}
${context.botRules || DEFAULT_BOT_RULES}`;

  // Helper function to check if error is rate limit related
  const isRateLimitError = (error: unknown): boolean => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return (
      errorMsg.includes("429") ||
      errorMsg.includes("RATELIMIT_EXCEEDED") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("rate limit") ||
      errorMsg.toLowerCase().includes("resource exhausted")
    );
  };

  // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Retry configuration
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 1000; // 1 second
  const MAX_DELAY = 16000; // 16 seconds

  // If Replit AI Integration is available, use it with retry logic
  if (ai) {
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Convert message history to Gemini format
        const contents = history.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: systemPrompt
          }
        });

        const responseText = result.text || "";
        return responseText || "Merhaba! Nasıl yardımcı olabilirim?";
      } catch (error) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        console.error(`Gemini API error (attempt ${attempt + 1}/${MAX_RETRIES}):`, errorMsg);
        
        // If rate limit error and not last attempt, retry with exponential backoff
        if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
          const delayTime = Math.min(INITIAL_DELAY * Math.pow(2, attempt), MAX_DELAY);
          console.log(`Rate limit hit. Retrying in ${delayTime}ms...`);
          await delay(delayTime);
          continue;
        }
        
        // For non-rate-limit errors, don't retry
        if (!isRateLimitError(error)) {
          break;
        }
      }
    }
    
    // Log final error for debugging
    console.error("AI generation failed after all retries. Last error:", lastError);
    await logError('ai', 'AI yanit oluşturulamadi - tum denemeler başarısız', { error: lastError instanceof Error ? lastError.message : String(lastError) });
    
    // Log to error_events for Super Admin monitoring
    await logApiError({
      severity: 'error',
      category: 'ai_bot',
      source: 'gemini_api',
      message: 'AI yanıt oluşturulamadı - tüm denemeler başarısız',
      suggestion: 'Gemini API kotasını kontrol edin veya bir süre bekleyin',
      metadata: { error: lastError instanceof Error ? lastError.message : String(lastError) }
    });
  }

  // Smart fallback response when AI is not available or fails
  // Parse the last user message to provide a contextual response
  const lastUserMessage = history.filter((m: any) => m.role === "user").pop()?.content?.toLowerCase() || "";
  
  // Check for common intents and provide smart fallback
  if (lastUserMessage.includes("fiyat") || lastUserMessage.includes("ücret") || lastUserMessage.includes("ne kadar")) {
    return `Merhaba! Fiyatlarımız hakkında bilgi almak için web sitemizi ziyaret edebilir veya size yardımcı olabilmemiz için lütfen biraz bekleyiniz. Sistemimiz şu an yoğun, kısa süre içinde size geri döneceğiz.\n\nAktivitelerimiz:\n${activityDescriptions}`;
  }
  
  if (lastUserMessage.includes("müsait") || lastUserMessage.includes("yer var") || lastUserMessage.includes("boş")) {
    return `Merhaba! Müsaitlik bilgisi için lütfen biraz bekleyiniz. Sistemimiz şu an yoğun olduğu için kısa süre içinde size geri döneceğiz. Alternatif olarak web sitemizden online rezervasyon yapabilirsiniz.`;
  }
  
  if (lastUserMessage.includes("rezervasyon") || lastUserMessage.includes("kayıt")) {
    return `Merhaba! Rezervasyon talebinizi aldık. Sistemimiz şu an yoğun olduğu için size en kısa sürede geri döneceğiz. Acil durumlarda web sitemizden online rezervasyon yapabilirsiniz.`;
  }
  
  if (lastUserMessage.includes("iptal") || lastUserMessage.includes("değişiklik") || lastUserMessage.includes("tarih")) {
    return `Merhaba! Rezervasyon değişikliği veya iptal talepleriniz için size gönderdiğimiz takip linkini kullanabilirsiniz. Takip linkiniz yoksa veya süresi dolmuşsa, lütfen sipariş numaranızı paylaşın, size yeni link gönderelim.`;
  }
  
  // Check for request status queries
  if (lastUserMessage.includes("talep") || lastUserMessage.includes("başvuru") || lastUserMessage.includes("durumu") || lastUserMessage.includes("ne oldu")) {
    if (context?.pendingRequests && context.pendingRequests.length > 0) {
      return `Merhaba! Talebiniz şu anda değerlendirme aşamasındadır. Ekibimiz en kısa sürede sizinle iletişime geçecektir. Sabırınız için teşekkür ederiz.`;
    } else if (context?.customerRequests && context.customerRequests.length > 0) {
      // Sort by createdAt descending to get the latest request
      const sortedRequests = [...context.customerRequests].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestRequest = sortedRequests[0];
      if (latestRequest.status === 'approved') {
        return `Merhaba! Son talebiniz onaylanmıştır. Size daha önce bilgilendirme mesajı gönderilmiş olmalı. Başka bir konuda yardımcı olabilir miyim?`;
      } else if (latestRequest.status === 'rejected') {
        return `Merhaba! Maalesef son talebiniz reddedilmiştir. Detaylı bilgi için size gönderilen mesajı kontrol edebilirsiniz. Başka bir konuda yardımcı olabilir miyim?`;
      }
    }
    return `Merhaba! Talebinizin durumunu kontrol edebilmem için lütfen sipariş numaranızı paylaşır mısınız?`;
  }
  
  // Default fallback with activity list
  return `Merhaba! Size yardımcı olmak için buradayım. Sistemimiz şu an biraz meşgul olduğu için kısa süre içinde size detaylı bilgi vereceğiz.\n\nAktivitelerimiz:\n${activityDescriptions}\n\nBunlardan hangisi hakkında bilgi almak istersiniz?`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadDir));
  
  // Image upload endpoint - small images (logo, favicon) - max 100KB
  app.post('/api/upload/small', (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
    }
    next();
  }, uploadSmall.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Görsel yüklenemedi" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl, filename: req.file.filename });
  });
  
  // Image upload endpoint - large images (hero, activity) - max 200KB
  app.post('/api/upload/large', (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
    }
    next();
  }, uploadLarge.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Görsel yüklenemedi" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl, filename: req.file.filename });
  });
  
  // Multer error handler
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "Dosya boyutu çok büyük. Küçük görseller max 100KB, büyük görseller max 200KB olmalı." });
      }
      return res.status(400).json({ error: `Yükleme hatası: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
  
  // Global authentication middleware for all /api/* routes
  // Exempts public endpoints that don't require authentication
  // NOTE: Paths here exclude the '/api' prefix since middleware is mounted at '/api'
  const publicPaths = [
    '/auth/login',
    '/auth/logout',
    '/auth/me',
    '/whatsapp',
    '/webhook',
    '/tracking',
    '/reservation-status',
    '/customer-requests/submit',
    '/tenants/by-slug',
    '/bot-rules/verify',
    '/bot-rules/login',
    '/platform-admin/session',
    '/platform-admin/logout',
    '/health',
    '/settings/sidebarLogo',
    '/settings/brandSettings',
    '/settings/botAccess',
    '/announcements',
    '/license',
    '/public/info',
    '/public/activities',
    '/public/availability',
    '/public/reservations',
    '/public/customer-requests',
    '/website',
  ];
  
  app.use('/api', (req, res, next) => {
    // req.path doesn't include the base mount path '/api'
    const routePath = req.path;
    
    // Check if path starts with any public path (prefix matching for subroutes)
    const isPublic = publicPaths.some(p => routePath.startsWith(p) || routePath === p);
    
    if (isPublic) {
      return next();
    }
    
    // Require authentication for all other API routes
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
    }
    
    next();
  });
  
  // === Activities ===
  app.get(api.activities.list.path, requirePermission(PERMISSIONS.ACTIVITIES_VIEW), async (req, res) => {
    const tenantId = req.session?.tenantId;
    const items = await storage.getActivities(tenantId);
    res.json(items);
  });

  app.post(api.activities.create.path, requirePermission(PERMISSIONS.ACTIVITIES_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      // License check for write operations (tenant-aware)
      const licenseCheck = await checkPlanForWrite(tenantId);
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
      }
      
      const input = api.activities.create.input.parse(req.body);
      const item = await storage.createActivity({ ...input, tenantId });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) res.status(400).json(err.errors);
      else throw err;
    }
  });

  app.put(api.activities.update.path, requirePermission(PERMISSIONS.ACTIVITIES_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      // License check for write operations (tenant-aware)
      const licenseCheck = await checkPlanForWrite(tenantId);
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
      }
      
      const input = api.activities.update.input.parse(req.body);
      const item = await storage.updateActivity(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Invalid input" });
    }
  });

  app.delete(api.activities.delete.path, requirePermission(PERMISSIONS.ACTIVITIES_MANAGE), async (req, res) => {
    // No license check needed for delete - it reduces activity count
    await storage.deleteActivity(Number(req.params.id));
    res.status(204).send();
  });

  // === Package Tours ===
  app.get("/api/package-tours", requirePermission(PERMISSIONS.ACTIVITIES_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const tours = await storage.getPackageTours(tenantId);
      res.json(tours);
    } catch (err) {
      res.status(500).json({ error: "Paket turlar alınamadı" });
    }
  });

  app.get("/api/package-tours/:id", requirePermission(PERMISSIONS.ACTIVITIES_VIEW), async (req, res) => {
    try {
      const tour = await storage.getPackageTour(Number(req.params.id));
      if (!tour) {
        return res.status(404).json({ error: "Paket tur bulunamadı" });
      }
      res.json(tour);
    } catch (err) {
      res.status(500).json({ error: "Paket tur alınamadı" });
    }
  });

  app.post("/api/package-tours", requirePermission(PERMISSIONS.ACTIVITIES_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      // License check for write operations (tenant-aware)
      const licenseCheck = await checkPlanForWrite(tenantId);
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
      }
      
      const { name, nameAliases, description, price, priceUsd, confirmationMessage, reservationLink, reservationLinkEn, active, faq, activities: tourActivities } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Paket tur adi zorunlu" });
      }
      
      const tour = await storage.createPackageTour({
        tenantId,
        name,
        nameAliases: nameAliases || '[]',
        description,
        price: price || 0,
        priceUsd: priceUsd || 0,
        confirmationMessage,
        reservationLink,
        reservationLinkEn,
        active: active !== false,
        faq: faq || '[]'
      });
      
      // Add activities if provided
      if (tourActivities && Array.isArray(tourActivities) && tourActivities.length > 0) {
        await storage.setPackageTourActivities(tour.id, tourActivities.map((a: any, idx: number) => ({
          packageTourId: tour.id,
          activityId: a.activityId,
          dayOffset: a.dayOffset || 0,
          defaultTime: a.defaultTime || '09:00',
          sortOrder: a.sortOrder ?? idx
        })));
      }
      
      res.status(201).json(tour);
    } catch (err) {
      console.error('Package tour create error:', err);
      res.status(400).json({ error: "Paket tur oluşturulamadi" });
    }
  });

  app.patch("/api/package-tours/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, nameAliases, description, price, priceUsd, confirmationMessage, reservationLink, reservationLinkEn, active, faq, activities: tourActivities } = req.body;
      
      const tour = await storage.updatePackageTour(id, {
        ...(name !== undefined && { name }),
        ...(nameAliases !== undefined && { nameAliases }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(priceUsd !== undefined && { priceUsd }),
        ...(confirmationMessage !== undefined && { confirmationMessage }),
        ...(reservationLink !== undefined && { reservationLink }),
        ...(reservationLinkEn !== undefined && { reservationLinkEn }),
        ...(active !== undefined && { active }),
        ...(faq !== undefined && { faq })
      });
      
      // Update activities if provided
      if (tourActivities !== undefined && Array.isArray(tourActivities)) {
        await storage.setPackageTourActivities(id, tourActivities.map((a: any, idx: number) => ({
          packageTourId: id,
          activityId: a.activityId,
          dayOffset: a.dayOffset || 0,
          defaultTime: a.defaultTime || '09:00',
          sortOrder: a.sortOrder ?? idx
        })));
      }
      
      res.json(tour);
    } catch (err) {
      console.error('Package tour update error:', err);
      res.status(400).json({ error: "Paket tur güncellenemedi" });
    }
  });

  app.delete("/api/package-tours/:id", async (req, res) => {
    try {
      await storage.deletePackageTour(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: "Paket tur silinemedi" });
    }
  });

  // Package Tour Activities - returns full activity data with defaultTime from package config
  app.get("/api/package-tours/:id/activities", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const tourActivities = await storage.getPackageTourActivities(Number(req.params.id));
      const allActivities = await storage.getActivities(tenantId);
      
      // Merge activity data with package tour settings
      const enrichedActivities = tourActivities.map(ta => {
        const activity = allActivities.find(a => a.id === ta.activityId);
        if (!activity) return null;
        return {
          ...activity,
          defaultTime: ta.defaultTime,
          dayOffset: ta.dayOffset,
          sortOrder: ta.sortOrder
        };
      }).filter(Boolean);
      
      res.json(enrichedActivities);
    } catch (err) {
      res.status(500).json({ error: "Paket tur aktiviteleri alınamadı" });
    }
  });

  // === Holidays ===
  app.get("/api/holidays", async (req, res) => {
    try {
      const holidayList = await storage.getHolidays();
      res.json(holidayList);
    } catch (err) {
      res.status(500).json({ error: "Tatiller alınamadı" });
    }
  });

  app.get("/api/holidays/:id", async (req, res) => {
    try {
      const holiday = await storage.getHoliday(Number(req.params.id));
      if (!holiday) {
        return res.status(404).json({ error: "Tatil bulunamadı" });
      }
      res.json(holiday);
    } catch (err) {
      res.status(500).json({ error: "Tatil alınamadı" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const { name, startDate, endDate, type, keywords, notes, isActive } = req.body;
      
      if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: "Tatil adi, başlangıç ve bitiş tarihi zorunlu" });
      }
      
      // Validate and normalize keywords JSON
      let validKeywords = '[]';
      if (keywords) {
        try {
          const parsed = JSON.parse(keywords);
          if (Array.isArray(parsed)) {
            validKeywords = JSON.stringify(parsed.map(k => String(k).trim()).filter(k => k));
          } else {
            return res.status(400).json({ error: "Anahtar kelimeler JSON dizisi olmali" });
          }
        } catch {
          return res.status(400).json({ error: "Geçersiz JSON formati" });
        }
      }
      
      const holiday = await storage.createHoliday({
        tenantId,
        name,
        startDate,
        endDate,
        type: type || 'official',
        keywords: validKeywords,
        notes,
        isActive: isActive !== false
      });
      
      res.status(201).json(holiday);
    } catch (err) {
      console.error('Holiday create error:', err);
      res.status(400).json({ error: "Tatil oluşturulamadi" });
    }
  });

  app.patch("/api/holidays/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, startDate, endDate, type, keywords, notes, isActive } = req.body;
      
      // Validate keywords JSON if provided
      let validKeywords: string | undefined;
      if (keywords !== undefined) {
        try {
          const parsed = JSON.parse(keywords);
          if (Array.isArray(parsed)) {
            validKeywords = JSON.stringify(parsed.map(k => String(k).trim()).filter(k => k));
          } else {
            return res.status(400).json({ error: "Anahtar kelimeler JSON dizisi olmali" });
          }
        } catch {
          return res.status(400).json({ error: "Geçersiz JSON formati" });
        }
      }
      
      const holiday = await storage.updateHoliday(id, {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(type !== undefined && { type }),
        ...(validKeywords !== undefined && { keywords: validKeywords }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      });
      
      res.json(holiday);
    } catch (err) {
      console.error('Holiday update error:', err);
      res.status(400).json({ error: "Tatil güncellenemedi" });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      await storage.deleteHoliday(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: "Tatil silinemedi" });
    }
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

  // Capacity delete endpoint
  app.delete("/api/capacity/:id", async (req, res) => {
    try {
      await storage.deleteCapacity(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: "Kapasite silinemedi" });
    }
  });

  // === Capacity ===
  app.get(api.capacity.list.path, requirePermission(PERMISSIONS.CAPACITY_VIEW), async (req, res) => {
    const { date, activityId } = req.query;
    const dateStr = date as string;
    const actId = activityId ? Number(activityId) : undefined;
    
    // Get actual capacity from database
    const dbItems = await storage.getCapacity(dateStr, actId);
    
    // If no date specified, just return database items (for backward compatibility)
    if (!dateStr) {
      return res.json(dbItems);
    }
    
    // Get reservations for this date to calculate booked slots for virtual capacity
    const tenantId = req.session?.tenantId;
    const allReservations = await storage.getReservations(tenantId);
    const dateReservations = allReservations.filter(r => 
      r.date === dateStr && r.status !== 'cancelled'
    );
    
    // Build a map of activityId-time -> total booked quantity
    const reservationCounts: Record<string, number> = {};
    for (const r of dateReservations) {
      if (r.activityId && r.time) {
        const key = `${r.activityId}-${r.time}`;
        reservationCounts[key] = (reservationCounts[key] || 0) + r.quantity;
      }
    }
    
    // Get all active activities to generate virtual slots from defaults
    const allActivities = await storage.getActivities(tenantId);
    const activities = actId 
      ? allActivities.filter(a => a.id === actId && a.active)
      : allActivities.filter(a => a.active);
    
    // Create a set of existing slots for quick lookup (activityId-time)
    const existingSlots = new Set(
      dbItems.map(item => `${item.activityId}-${item.time}`)
    );
    
    // Generate virtual slots from activity defaults
    const virtualSlots: any[] = [];
    for (const activity of activities) {
      if (activity.defaultTimes) {
        try {
          const times = JSON.parse(activity.defaultTimes);
          if (Array.isArray(times)) {
            for (const time of times) {
              const slotKey = `${activity.id}-${time}`;
              // Only add virtual slot if no real slot exists for this activity+time
              if (!existingSlots.has(slotKey)) {
                // Count reservations for this virtual slot
                const bookedCount = reservationCounts[slotKey] || 0;
                virtualSlots.push({
                  id: -1, // Negative ID indicates virtual slot
                  activityId: activity.id,
                  date: dateStr,
                  time: time,
                  totalSlots: activity.defaultCapacity || 10,
                  bookedSlots: bookedCount,
                  isVirtual: true // Flag to indicate this is auto-generated
                });
              }
            }
          }
        } catch {}
      }
    }
    
    // Combine real and virtual slots, mark real slots as not virtual
    const allSlots = [
      ...dbItems.map(item => ({ ...item, isVirtual: false })),
      ...virtualSlots
    ];
    
    // Sort by time
    allSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    res.json(allSlots);
  });

  app.post(api.capacity.create.path, requirePermission(PERMISSIONS.CALENDAR_MANAGE), async (req, res) => {
    const input = api.capacity.create.input.parse(req.body);
    const item = await storage.createCapacity(input);
    res.status(201).json(item);
  });

  // Monthly capacity aggregation endpoint
  app.get("/api/capacity/monthly", async (req, res) => {
    try {
      const { month, year, activityId } = req.query;
      const targetMonth = month ? Number(month) : new Date().getMonth();
      const targetYear = year ? Number(year) : new Date().getFullYear();
      const actId = activityId ? Number(activityId) : undefined;
      
      // Get all dates in the month using timezone-safe formatting
      const dates: string[] = [];
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const y = targetYear;
        const m = String(targetMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
      
      // Get capacity with virtual slots for all dates
      const tenantId = req.session?.tenantId;
      const allCapacity = await getCapacityWithVirtualSlots(dates, tenantId);
      
      // Filter by activity if specified
      const filteredCapacity = actId 
        ? allCapacity.filter(c => c.activityId === actId)
        : allCapacity;
      
      // Aggregate by date
      const dailyStats: Record<string, { totalSlots: number; bookedSlots: number; occupancy: number }> = {};
      
      for (const dateStr of dates) {
        const dayCapacity = filteredCapacity.filter(c => c.date === dateStr);
        const totalSlots = dayCapacity.reduce((sum, c) => sum + c.totalSlots, 0);
        const bookedSlots = dayCapacity.reduce((sum, c) => sum + c.bookedSlots, 0);
        const occupancy = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
        
        dailyStats[dateStr] = { totalSlots, bookedSlots, occupancy };
      }
      
      res.json({ month: targetMonth, year: targetYear, dailyStats });
    } catch (err) {
      res.status(500).json({ error: "Aylık kapasite alınamadı" });
    }
  });

  // Bulk capacity create endpoint
  app.post("/api/capacity/bulk", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const licenseCheck = await checkPlanForWrite(tenantId);
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message });
      }
      
      const { activityId, dates, time, totalSlots } = req.body;
      
      if (!activityId || !dates || !Array.isArray(dates) || !time || !totalSlots) {
        return res.status(400).json({ error: "Eksik parametreler" });
      }
      
      const created: any[] = [];
      const existingCapacity = await storage.getCapacity();
      
      for (const date of dates) {
        // Check if slot already exists
        const exists = existingCapacity.some(c => 
          c.activityId === activityId && c.date === date && c.time === time
        );
        
        if (!exists) {
          const item = await storage.createCapacity({
            tenantId,
            activityId,
            date,
            time,
            totalSlots
          });
          created.push(item);
        }
      }
      
      res.status(201).json({ created: created.length, items: created });
    } catch (err) {
      res.status(500).json({ error: "Toplu kapasite oluşturulamadı" });
    }
  });

  // Quick capacity adjustment endpoint
  app.patch("/api/capacity/:id/adjust", async (req, res) => {
    try {
      const { adjustment } = req.body; // +1 or -1
      const id = Number(req.params.id);
      
      const allCapacity = await storage.getCapacity();
      const slot = allCapacity.find(c => c.id === id);
      
      if (!slot) {
        return res.status(404).json({ error: "Slot bulunamadı" });
      }
      
      const newTotal = Math.max(1, slot.totalSlots + adjustment);
      const item = await storage.updateCapacity(id, newTotal);
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Kapasite ayarlanamadı" });
    }
  });

  // Historical comparison endpoint
  app.get("/api/capacity/compare", async (req, res) => {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? Number(month) : new Date().getMonth();
      const targetYear = year ? Number(year) : new Date().getFullYear();
      
      // Helper to generate timezone-safe date strings for a month
      const generateMonthDates = (yr: number, mo: number): string[] => {
        const daysInMonth = new Date(yr, mo + 1, 0).getDate();
        const dates: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const m = String(mo + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          dates.push(`${yr}-${m}-${d}`);
        }
        return dates;
      };
      
      // Get dates for current period and last year
      const currentDates = generateMonthDates(targetYear, targetMonth);
      const lastYearDates = generateMonthDates(targetYear - 1, targetMonth);
      
      // Get reservations for both periods
      const tenantId = req.session?.tenantId;
      const allReservations = await storage.getReservations(tenantId);
      
      const currentReservations = allReservations.filter(r => 
        currentDates.includes(r.date) && r.status !== 'cancelled'
      );
      const lastYearReservations = allReservations.filter(r => 
        lastYearDates.includes(r.date) && r.status !== 'cancelled'
      );
      
      const currentStats = {
        totalReservations: currentReservations.length,
        totalGuests: currentReservations.reduce((sum, r) => sum + r.quantity, 0),
        totalRevenueTl: currentReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0),
        totalRevenueUsd: currentReservations.reduce((sum, r) => sum + (r.priceUsd || 0), 0),
      };
      
      const lastYearStats = {
        totalReservations: lastYearReservations.length,
        totalGuests: lastYearReservations.reduce((sum, r) => sum + r.quantity, 0),
        totalRevenueTl: lastYearReservations.reduce((sum, r) => sum + (r.priceTl || 0), 0),
        totalRevenueUsd: lastYearReservations.reduce((sum, r) => sum + (r.priceUsd || 0), 0),
      };
      
      const growth = {
        reservations: lastYearStats.totalReservations > 0 
          ? Math.round(((currentStats.totalReservations - lastYearStats.totalReservations) / lastYearStats.totalReservations) * 100)
          : 0,
        guests: lastYearStats.totalGuests > 0
          ? Math.round(((currentStats.totalGuests - lastYearStats.totalGuests) / lastYearStats.totalGuests) * 100)
          : 0,
        revenueTl: lastYearStats.totalRevenueTl > 0
          ? Math.round(((currentStats.totalRevenueTl - lastYearStats.totalRevenueTl) / lastYearStats.totalRevenueTl) * 100)
          : 0,
      };
      
      res.json({ current: currentStats, lastYear: lastYearStats, growth, month: targetMonth, year: targetYear });
    } catch (err) {
      res.status(500).json({ error: "Karşılaştırma alınamadı" });
    }
  });

  // === Reservations ===
  app.get(api.reservations.list.path, requirePermission(PERMISSIONS.RESERVATIONS_VIEW), async (req, res) => {
    const tenantId = req.session?.tenantId;
    const items = await storage.getReservations(tenantId);
    
    // Enrich with creator user names
    const creatorIds = [...new Set(items.filter(r => r.createdByUserId).map(r => r.createdByUserId!))];
    const allUsers = creatorIds.length > 0 ? await storage.getUsersByIds(creatorIds) : [];
    const userMap = new Map(allUsers.map(u => [u.id, u.name || u.username]));
    
    const enrichedItems = items.map(r => ({
      ...r,
      createdByUserName: r.createdByUserId ? userMap.get(r.createdByUserId) || null : null
    }));
    
    res.json(enrichedItems);
  });

  app.post(api.reservations.create.path, requirePermission(PERMISSIONS.RESERVATIONS_CREATE), async (req, res) => {
    const tenantId = req.session?.tenantId;
    // License check for write operations (tenant-aware)
    const licenseCheck = await checkPlanForWrite(tenantId);
    if (!licenseCheck.allowed) {
      return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
    }
    
    // Daily reservation limit check
    if (tenantId) {
      const reservationUsage = await storage.getTenantDailyReservationUsage(tenantId);
      if (reservationUsage.remaining <= 0) {
        return res.status(429).json({ 
          error: `Günlük rezervasyon limitinize ulaştınız (${reservationUsage.limit}). Lütfen yarın tekrar deneyin veya paketinizi yükseltin.`,
          limitType: 'daily_reservation',
          limit: reservationUsage.limit,
          used: reservationUsage.used
        });
      }
    }
    
    const input = api.reservations.create.input.parse(req.body);
    
    // Set default status based on source
    // Manual (panel) reservations are auto-confirmed, web reservations are pending
    let defaultStatus = input.status;
    if (!defaultStatus) {
      if (input.source === 'manual' || !input.source) {
        defaultStatus = 'confirmed';
      } else if (input.source === 'web') {
        defaultStatus = 'pending';
      } else {
        defaultStatus = 'pending';
      }
    }
    
    const userId = req.session?.userId;
    const item = await storage.createReservation({ ...input, tenantId, status: defaultStatus, createdByUserId: userId });
    
    // Create in-app notification for new reservation
    if (tenantId) {
      const activity = input.activityId ? (await storage.getActivities(tenantId)).find(a => a.id === input.activityId) : null;
      const activityName = activity?.name || 'Aktivite';
      await notifyTenantAdmins(
        tenantId,
        'new_reservation',
        'Yeni Rezervasyon',
        `${input.customerName} - ${activityName} (${input.date})`,
        '/reservations'
      );
    }
    
    // Decrease capacity
    const capacitySlots = await storage.getCapacity(item.date, item.activityId || 0);
    // Logic to find exact time slot and update would go here
    // For MVP/Lite, we just create the reservation
    
    res.status(201).json(item);
  });

  app.get(api.reservations.stats.path, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
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

  // Search reservations by customer name for autocomplete
  app.get("/api/reservations/search", requirePermission(PERMISSIONS.RESERVATIONS_VIEW), async (req, res) => {
    const query = (req.query.q as string) || '';
    const tenantId = req.session?.tenantId;
    
    if (!tenantId || query.length < 2) {
      return res.json([]);
    }
    
    try {
      const allReservations = await storage.getReservations(tenantId);
      const searchLower = query.toLowerCase();
      
      const matched = allReservations
        .filter(r => 
          r.customerName?.toLowerCase().includes(searchLower) ||
          r.customerPhone?.includes(query)
        )
        .slice(0, 15)
        .map(r => ({
          id: r.id,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          date: r.date,
          time: r.time,
          activityId: r.activityId
        }));
      
      // Deduplicate by customerName + customerPhone
      const unique = Array.from(
        new Map(matched.map(r => [`${r.customerName}-${r.customerPhone}`, r])).values()
      );
      
      res.json(unique.slice(0, 10));
    } catch (error) {
      console.error('Reservation search error:', error);
      res.json([]);
    }
  });

  // Occupancy rate for a specific date
  app.get("/api/occupancy", async (req, res) => {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    
    try {
      // Get all activities, reservations, and capacity
      const tenantId = req.session?.tenantId;
      const allActivities = await storage.getActivities(tenantId);
      const activeActivities = allActivities.filter(a => a.active);
      const allReservations = await storage.getReservations(tenantId);
      const allCapacity = await storage.getCapacity();
      
      // Get reservations for this date (not cancelled)
      const dateReservations = allReservations.filter(r => 
        r.date === date && r.status !== 'cancelled' && r.activityId
      );
      
      // Calculate booked quantities per activity from actual reservations
      const bookedByActivity: Record<number, number> = {};
      for (const r of dateReservations) {
        if (r.activityId) {
          bookedByActivity[r.activityId] = (bookedByActivity[r.activityId] || 0) + r.quantity;
        }
      }
      
      // Calculate total slots per activity (from DB capacity or defaults)
      const slotsByActivity: Record<number, number> = {};
      
      // First, check DB capacity for this date
      const dbCapacity = allCapacity.filter(c => c.date === date);
      const activitiesWithDbCapacity = new Set(dbCapacity.map(c => c.activityId));
      
      for (const cap of dbCapacity) {
        slotsByActivity[cap.activityId] = (slotsByActivity[cap.activityId] || 0) + cap.totalSlots;
      }
      
      // For activities without DB capacity, use defaults
      for (const activity of activeActivities) {
        if (!activitiesWithDbCapacity.has(activity.id)) {
          // Count time slots from defaultTimes
          let timeSlotCount = 1;
          try {
            const times = JSON.parse(activity.defaultTimes || '[]');
            if (Array.isArray(times) && times.length > 0) {
              timeSlotCount = times.length;
            }
          } catch {}
          
          const totalSlots = (activity.defaultCapacity || 10) * timeSlotCount;
          slotsByActivity[activity.id] = totalSlots;
        }
      }
      
      // Build activity stats
      const activityStats: Array<{
        activityId: number;
        activityName: string;
        totalSlots: number;
        bookedSlots: number;
        occupancyRate: number;
      }> = [];
      
      for (const activity of activeActivities) {
        const totalSlots = slotsByActivity[activity.id] || 0;
        const bookedSlots = bookedByActivity[activity.id] || 0;
        
        if (totalSlots > 0) {
          activityStats.push({
            activityId: activity.id,
            activityName: activity.name,
            totalSlots,
            bookedSlots,
            occupancyRate: Math.round((bookedSlots / totalSlots) * 100)
          });
        }
      }
      
      const totalSlots = activityStats.reduce((sum, a) => sum + a.totalSlots, 0);
      const bookedSlots = activityStats.reduce((sum, a) => sum + a.bookedSlots, 0);
      const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
      
      res.json({
        date,
        occupancyRate,
        totalSlots,
        bookedSlots,
        activities: activityStats
      });
    } catch (error) {
      console.error('Occupancy calculation error:', error);
      res.status(500).json({ error: "Doluluk orani hesaplanamadi" });
    }
  });

  // General reservation update (date, time, etc.)
  app.patch("/api/reservations/:id", requirePermission(PERMISSIONS.RESERVATIONS_EDIT), async (req, res) => {
    const id = parseInt(req.params.id);
    const { date, time } = req.body;
    
    try {
      const tenantId = req.session?.tenantId;
      const reservations = await storage.getReservations(tenantId);
      const reservation = reservations.find(r => r.id === id);
      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı" });
      }
      
      const updates: { date?: string; time?: string } = {};
      if (date) updates.date = date;
      if (time) updates.time = time;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Güncellenecek alan belirtilmedi" });
      }
      
      const updated = await storage.updateReservation(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Reservation update error:", error);
      res.status(500).json({ error: "Rezervasyon güncellenemedi" });
    }
  });

  // Delete reservation
  app.delete("/api/reservations/:id", requirePermission(PERMISSIONS.RESERVATIONS_DELETE), async (req, res) => {
    const id = parseInt(req.params.id);
    
    try {
      const tenantId = req.session?.tenantId;
      const allReservations = await storage.getReservations(tenantId);
      const reservation = allReservations.find(r => r.id === id);
      
      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı" });
      }
      
      await storage.deleteReservation(id);
      res.json({ success: true, message: "Rezervasyon silindi" });
    } catch (error) {
      console.error("Reservation delete error:", error);
      res.status(500).json({ error: "Rezervasyon silinemedi" });
    }
  });

  // Update reservation status
  app.patch("/api/reservations/:id/status", requirePermission(PERMISSIONS.RESERVATIONS_EDIT), async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be pending, confirmed, or cancelled." });
    }
    
    try {
      const updated = await storage.updateReservationStatus(id, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update reservation status" });
    }
  });

  // Update reservation time
  app.patch("/api/reservations/:id/time", async (req, res) => {
    const id = parseInt(req.params.id);
    const { time } = req.body;
    
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: "Geçersiz saat formatı. HH:MM formatında olmalı." });
    }
    
    try {
      const tenantId = req.session?.tenantId;
      const reservations = await storage.getReservations(tenantId);
      const reservation = reservations.find(r => r.id === id);
      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı" });
      }
      
      // Update reservation with new time
      const updated = await storage.updateReservation(id, { time });
      res.json(updated);
    } catch (error) {
      console.error("Time update error:", error);
      res.status(500).json({ error: "Saat güncellenemedi" });
    }
  });

  // Shift all reservations in a package tour by offset days
  app.post("/api/package-reservations/shift", async (req, res) => {
    const { packageTourId, orderNumber, offsetDays } = req.body;
    
    if (!packageTourId || offsetDays === undefined) {
      return res.status(400).json({ error: "packageTourId ve offsetDays gerekli" });
    }
    
    // orderNumber is required for proper package grouping
    if (!orderNumber) {
      return res.status(400).json({ error: "Paket tur taşımak için sipariş numarası gerekli" });
    }
    
    try {
      const tenantId = req.session?.tenantId;
      // License check using established guard (tenant-aware)
      const licenseCheck = await checkPlanForWrite(tenantId);
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message });
      }
      
      const allReservations = await storage.getReservations(tenantId);
      
      // Find all reservations in this package group - ONLY match by packageTourId AND orderNumber
      const packageReservations = allReservations.filter(r => 
        r.packageTourId === packageTourId && r.orderNumber === orderNumber
      );
      
      if (packageReservations.length === 0) {
        return res.status(404).json({ error: "Paket tur rezervasyonları bulunamadı" });
      }
      
      // Shift each reservation's date by offsetDays using manual date math (avoid UTC drift)
      const updatedReservations = [];
      for (const reservation of packageReservations) {
        // Parse the date string manually to avoid timezone issues
        const [year, month, day] = reservation.date.split('-').map(Number);
        const newDay = day + offsetDays;
        
        // Create date and adjust - use UTC to avoid timezone drift
        const dateObj = new Date(Date.UTC(year, month - 1, newDay));
        
        // Format as YYYY-MM-DD manually
        const newYear = dateObj.getUTCFullYear();
        const newMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const newDayStr = String(dateObj.getUTCDate()).padStart(2, '0');
        const newDate = `${newYear}-${newMonth}-${newDayStr}`;
        
        const updated = await storage.updateReservation(reservation.id, { date: newDate });
        updatedReservations.push(updated);
      }
      
      res.json({ 
        success: true, 
        message: `${updatedReservations.length} rezervasyon güncellendi`,
        reservations: updatedReservations 
      });
    } catch (error) {
      console.error("Package shift error:", error);
      res.status(500).json({ error: "Paket tur rezervasyonları güncellenemedi" });
    }
  });

  // === Customer Tracking ===
  
  // Get reservation by tracking token (public endpoint for customers)
  app.get("/api/track/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token || token.length < 10) {
        return res.status(400).json({ error: "Geçersiz takip kodu" });
      }
      
      const reservation = await storage.getReservationByTrackingToken(token);
      
      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadı veya takip süresi dolmus" });
      }
      
      // Get activity details
      let activityName = "Bilinmeyen Aktivite";
      let defaultTimes: string[] = [];
      if (reservation.activityId) {
        const activity = await storage.getActivity(reservation.activityId);
        if (activity) {
          activityName = activity.name;
          // Parse defaultTimes from JSON string if needed
          try {
            const times = activity.defaultTimes;
            defaultTimes = typeof times === 'string' ? JSON.parse(times) : (times || []);
          } catch {
            defaultTimes = [];
          }
        }
      } else if (reservation.packageTourId) {
        const packageTour = await storage.getPackageTour(reservation.packageTourId);
        if (packageTour) {
          activityName = packageTour.name + " (Paket Tur)";
          // Package tours don't have defaultTimes, leave as empty array
          defaultTimes = [];
        }
      }
      
      // Return only necessary information (no sensitive data)
      // Note: priceTl and priceUsd are stored as integers in the database
      res.json({
        customerName: reservation.customerName,
        activityName,
        date: reservation.date,
        time: reservation.time,
        quantity: reservation.quantity,
        status: reservation.status,
        priceTl: reservation.priceTl || 0,
        priceUsd: reservation.priceUsd || 0,
        currency: reservation.currency || 'TRY',
        orderNumber: reservation.orderNumber,
        defaultTimes
      });
    } catch (error) {
      console.error("Track reservation error:", error);
      res.status(500).json({ error: "Rezervasyon bilgileri alınamadı" });
    }
  });

  // Generate tracking token for a reservation (admin only)
  app.post("/api/reservations/:id/generate-tracking", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Geçersiz rezervasyon ID" });
      }
      
      const token = await storage.generateTrackingToken(id);
      
      res.json({ 
        token,
        trackingUrl: `/takip/${token}`
      });
    } catch (error: any) {
      console.error("Generate tracking token error:", error);
      res.status(500).json({ error: error.message || "Token oluşturulamadi" });
    }
  });

  // Cleanup expired tracking tokens (can be called by a cron job)
  app.post("/api/tracking/cleanup", async (req, res) => {
    try {
      const count = await storage.cleanupExpiredTrackingTokens();
      res.json({ 
        success: true, 
        message: `${count} süresi dolmus takip kodu temizlendi` 
      });
    } catch (error) {
      console.error("Cleanup tracking tokens error:", error);
      res.status(500).json({ error: "Temizleme başarısız" });
    }
  });

  // === Customer Requests (from tracking page) ===
  
  // Create customer request (public - via tracking token)
  app.post("/api/customer-requests", async (req, res) => {
    try {
      const { token, requestType, requestDetails, preferredTime } = req.body;
      
      if (!token || !requestType) {
        return res.status(400).json({ error: "Token ve talep tipi gerekli" });
      }
      
      // Verify token and get reservation
      const reservation = await storage.getReservationByTrackingToken(token);
      if (!reservation) {
        return res.status(404).json({ error: "Geçersiz veya süresi dolmus takip linki" });
      }
      
      // Create the request
      const customerRequest = await storage.createCustomerRequest({
        tenantId: reservation.tenantId,
        reservationId: reservation.id,
        requestType,
        requestDetails: requestDetails || null,
        preferredTime: preferredTime || null,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail || null,
        status: "pending",
        emailSent: false,
      });
      
      // Get activity name for email
      let activityName = "Bilinmiyor";
      if (reservation.activityId) {
        const activity = await storage.getActivity(reservation.activityId);
        if (activity) activityName = activity.name;
      }
      
      // Try to send email notification to tenant's configured notification email
      try {
        // Get tenant's notification email (tenant-specific setting)
        const tenantNotificationEmail = await storage.getSetting(`tenantNotificationEmail_${reservation.tenantId}`);
        
        if (tenantNotificationEmail) {
          const requestTypeText = requestType === 'time_change' ? 'Saat Değişikliği' : 
                                  requestType === 'cancellation' ? 'İptal Talebi' : 'Diğer Talep';
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                Yeni Müşteri Talebi
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Talep Tipi:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${requestTypeText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Müşteri:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${reservation.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Telefon:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${reservation.customerPhone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">E-posta:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${reservation.customerEmail || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Aktivite:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${activityName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tarih:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${reservation.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Saat:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${reservation.time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Kişi Sayısı:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${reservation.quantity}</td>
                </tr>
                ${requestType === 'time_change' && preferredTime ? `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tercih Edilen Saat:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${preferredTime}</td>
                </tr>
                ` : ''}
                ${requestDetails ? `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ek Açıklama:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${requestDetails}</td>
                </tr>
                ` : ''}
              </table>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Bu talep müşteri takip sayfasından gönderilmiştir.
              </p>
            </div>
          `;
          
          // Send email using tenant SMTP if configured, fallback to platform SMTP
          const { sendTenantEmail } = await import("./email");
          const result = await sendTenantEmail(reservation.tenantId!, {
            to: tenantNotificationEmail,
            subject: `[Müşteri Talebi] ${requestTypeText} - ${reservation.customerName}`,
            html: emailHtml,
          });
          
          if (result.success) {
            // Mark email as sent
            await storage.updateCustomerRequest(customerRequest.id, { emailSent: true });
          }
        }
      } catch (emailError) {
        console.error("Failed to send customer request email:", emailError);
        // Don't fail the request, just log the error
      }
      
      res.json({ 
        success: true, 
        message: "Talebiniz basariyla iletildi. En kısa sürede size döneceğiz.",
        requestId: customerRequest.id
      });
    } catch (error) {
      console.error("Create customer request error:", error);
      res.status(500).json({ error: "Talep oluşturulamadi" });
    }
  });

  // Get all customer requests (admin)
  app.get("/api/customer-requests", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const requests = await storage.getCustomerRequests(tenantId);
      res.json(requests);
    } catch (error) {
      console.error("Get customer requests error:", error);
      res.status(500).json({ error: "Talepler alınamadı" });
    }
  });

  // Update customer request status (admin)
  app.patch("/api/customer-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (status === 'approved' || status === 'rejected') {
        updateData.processedAt = new Date();
      }
      
      const updated = await storage.updateCustomerRequest(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update customer request error:", error);
      res.status(500).json({ error: "Talep güncellenemedi" });
    }
  });

  // Get viewer customer requests with reservation and activity details
  app.get("/api/viewer-customer-requests", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }

      // Get all customer requests for this tenant
      const requests = await storage.getCustomerRequests(tenantId);
      
      // Get all reservations and activities for enrichment
      const allReservations = await storage.getReservations(tenantId);
      const allActivities = await storage.getActivities(tenantId);
      
      // Enrich with reservation and activity details
      const enrichedRequests = requests.map((request) => {
        let activityName: string | undefined;
        let reservationDate: string | undefined;
        let reservationTime: string | undefined;

        // Get reservation details if available
        if (request.reservationId) {
          const reservation = allReservations.find(r => r.id === request.reservationId);
          if (reservation) {
            reservationDate = reservation.date;
            reservationTime = reservation.time;
            
            // Get activity name
            if (reservation.activityId) {
              const activity = allActivities.find(a => a.id === reservation.activityId);
              if (activity) {
                activityName = activity.name;
              }
            }
          }
        }

        return {
          ...request,
          activityName,
          reservationDate,
          reservationTime,
        };
      });

      res.json(enrichedRequests);
    } catch (error) {
      console.error("Get viewer customer requests error:", error);
      res.status(500).json({ error: "Talepler alinamadi" });
    }
  });

  // === Partner Agency Reservation Requests ===
  
  // Create a reservation request (requires RESERVATIONS_REQUEST permission - viewer role)
  app.post("/api/reservation-requests", requirePermission(PERMISSIONS.RESERVATIONS_REQUEST), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { 
        activityId, date, time, customerName, customerPhone, guests, notes,
        paymentCollectionType, amountCollectedBySender, paymentCurrency, paymentNotes 
      } = req.body;
      
      if (!activityId || !date || !time || !customerName || !customerPhone) {
        return res.status(400).json({ error: "Eksik parametreler" });
      }
      
      // Create the reservation request with payment allocation
      const request = await storage.createReservationRequest({
        tenantId,
        activityId,
        date,
        time,
        customerName,
        customerPhone,
        guests: guests || 1,
        notes,
        requestedBy: userId,
        status: "pending",
        paymentCollectionType: paymentCollectionType || "receiver_full",
        amountCollectedBySender: amountCollectedBySender || 0,
        paymentCurrency: paymentCurrency || "TRY",
        paymentNotes: paymentNotes || null
      });
      
      // Create in-app notification for reservation request
      const activities = await storage.getActivities(tenantId);
      const activity = activities.find(a => a.id === activityId);
      const activityName = activity?.name || "Aktivite";
      
      await notifyTenantAdmins(
        tenantId,
        'reservation_request',
        'Yeni Rezervasyon Talebi',
        `${customerName} - ${activityName} (${date})`,
        '/reservations'
      );
      
      // Create a system notification for operators
      try {
        
        // Get requester (partner) name
        const requester = userId ? await storage.getAppUser(userId) : null;
        const partnerName = requester?.name || requester?.username || "Is Ortagi";
        
        await storage.createSupportRequest({
          tenantId,
          type: "reservation_request",
          title: `Yeni Rezervasyon Talebi: ${customerName}`,
          description: `Partner acenta yeni rezervasyon talebi olusturdu.\n\nIs Ortagi: ${partnerName}\nAktivite: ${activityName}\nTarih: ${date}\nSaat: ${time}\nMusteri: ${customerName}\nTelefon: ${customerPhone}\nKisi Sayisi: ${guests || 1}\n${notes ? `Not: ${notes}` : ""}`,
          priority: "medium",
          metadata: JSON.stringify({ reservationRequestId: request.id })
        });
        
        // Send email notification to agency notification email
        try {
          const notificationEmailJson = await storage.getSetting("notificationEmail", tenantId);
          if (notificationEmailJson) {
            const notificationEmail = JSON.parse(notificationEmailJson);
            if (notificationEmail.email && notificationEmail.enabled !== false) {
              const { sendTenantEmail } = await import("./email");
              await sendTenantEmail(tenantId, {
                to: notificationEmail.email,
                subject: `Yeni Rezervasyon Talebi: ${customerName} - ${activityName}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Yeni Rezervasyon Talebi</h2>
                    <p>Is ortaginiz <strong>${partnerName}</strong> yeni bir rezervasyon talebi olusturdu.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Aktivite</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${activityName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tarih</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
                      </tr>
                      <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Saat</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${time}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Musteri Adi</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${customerName}</td>
                      </tr>
                      <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Telefon</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${customerPhone}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Kisi Sayisi</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${guests || 1}</td>
                      </tr>
                      ${notes ? `
                      <tr style="background: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Not</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${notes}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Is Ortagi</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${partnerName}</td>
                      </tr>
                    </table>
                    <p style="color: #666;">Bu talebi onaylamak veya reddetmek icin sisteme giris yapin.</p>
                  </div>
                `
              });
            }
          }
        } catch (emailErr) {
          console.error("Failed to send email notification for reservation request:", emailErr);
        }
      } catch (notifyErr) {
        console.error("Failed to create notification for reservation request:", notifyErr);
      }
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Create reservation request error:", error);
      res.status(500).json({ error: "Talep olusturulamadi" });
    }
  });
  
  // Get reservation requests (requires RESERVATIONS_VIEW or RESERVATIONS_CREATE permission - operator/manager role)
  // Enriched with requester info (name, phone, type: viewer/partner)
  app.get("/api/reservation-requests", requirePermission(PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.RESERVATIONS_CREATE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      const requests = await storage.getReservationRequests(tenantId);
      
      // Get all app users (including from other tenants for partner lookup)
      const allUsers = await storage.getAppUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Get viewer role ID - check for 'viewer', 'izleyici', or similar names
      const allRoles = await storage.getRoles();
      const viewerRoleNames = ['viewer', 'izleyici', 'görüntüleyici'];
      const viewerRole = allRoles.find(r => viewerRoleNames.includes(r.name.toLowerCase()));
      
      // Enrich requests with requester info
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        let requesterName = "Bilinmiyor";
        let requesterPhone = null;
        let requesterType: 'viewer' | 'partner' | 'unknown' = 'unknown';
        
        if (request.requestedBy) {
          const user = userMap.get(request.requestedBy);
          if (user) {
            requesterName = user.name || user.username || "Bilinmiyor";
            requesterPhone = user.phone;
            
            // Check if user is a viewer (same tenant, viewer role)
            if (user.tenantId === tenantId) {
              const userRoles = await storage.getUserRoles(user.id);
              const isViewer = viewerRole && userRoles.some(ur => ur.roleId === viewerRole.id);
              requesterType = isViewer ? 'viewer' : 'partner';
            } else {
              // User from different tenant = partner
              requesterType = 'partner';
            }
          }
        }
        
        // Also parse notes for fallback type detection
        if (requesterType === 'unknown' && request.notes) {
          const lowerNotes = request.notes.toLowerCase();
          if (lowerNotes.includes('[viewer:') || lowerNotes.includes('[izleyici:')) {
            requesterType = 'viewer';
          } else if (lowerNotes.includes('[partner:')) {
            requesterType = 'partner';
          }
        }
        
        return {
          ...request,
          requesterName,
          requesterPhone,
          requesterType,
          requestCategory: 'new_reservation' as const
        };
      }));
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Get reservation requests error:", error);
      res.status(500).json({ error: "Talepler alinamadi" });
    }
  });

  // Get my reservation requests (for İş Ortağı - partner users)
  // Enriches with activity name since partners don't have activities.view permission
  // Note: Partner requests are stored in the activity owner's tenant, so we search across connected partners
  app.get("/api/my-reservation-requests", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      if (!tenantId || !userId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      // First, get requests from current tenant
      const currentTenantRequests = await storage.getReservationRequests(tenantId);
      const myCurrentRequests = currentTenantRequests.filter(r => r.requestedBy === userId);
      
      // Then, get requests from partner tenants (where I might have sent requests) - bidirectional
      const partnerships = await storage.getTenantPartnerships(tenantId);
      const activePartnerships = partnerships.filter(p => p.status === 'active');
      
      let allMyRequests = [...myCurrentRequests];
      const activityCache: Map<number, any> = new Map();
      const tenants = await storage.getTenants();
      const tenantMap = new Map(tenants.map(t => [t.id, t]));
      
      for (const partnership of activePartnerships) {
        // Get the other tenant's ID (bidirectional)
        const otherTenantId = partnership.requesterTenantId === tenantId 
          ? partnership.partnerTenantId 
          : partnership.requesterTenantId;
        
        const partnerRequests = await storage.getReservationRequests(otherTenantId);
        const myPartnerRequests = partnerRequests.filter(r => r.requestedBy === userId);
        allMyRequests = [...allMyRequests, ...myPartnerRequests];
        
        // Cache partner activities for enrichment
        if (myPartnerRequests.length > 0) {
          const partnerActivities = await storage.getActivities(otherTenantId);
          partnerActivities.forEach(a => activityCache.set(a.id, { ...a, tenantName: tenantMap.get(otherTenantId)?.name }));
        }
      }
      
      // Add current tenant activities to cache
      const currentActivities = await storage.getActivities(tenantId);
      currentActivities.forEach(a => activityCache.set(a.id, { ...a, tenantName: tenantMap.get(tenantId)?.name }));
      
      // Enrich with activity names and tenant info
      const enrichedRequests = allMyRequests.map(request => {
        const activity = activityCache.get(request.activityId);
        return {
          ...request,
          activityName: activity?.name || "Bilinmiyor",
          ownerTenantName: activity?.tenantName || "Bilinmiyor"
        };
      });
      
      // Sort by createdAt descending
      enrichedRequests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Get my reservation requests error:", error);
      res.status(500).json({ error: "Talepler alinamadi" });
    }
  });

  // Delete my outgoing reservation request
  app.delete("/api/my-reservation-requests/:id", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      // Get the request to verify ownership
      const request = await storage.getReservationRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Talep bulunamadi" });
      }
      
      // User must be the requester
      if (request.requestedBy !== userId) {
        return res.status(403).json({ error: "Bu talebi silme yetkiniz yok" });
      }
      
      // Mark as deleted (soft delete to preserve history)
      await storage.updateReservationRequest(requestId, { 
        status: 'deleted',
        processedBy: userId,
        processedAt: new Date()
      });
      
      res.json({ success: true, message: "Talep silindi" });
    } catch (error) {
      console.error("Delete my reservation request error:", error);
      res.status(500).json({ error: "Talep silinemedi" });
    }
  });

  // Get my reservations (for İş Ortağı - partner users, shows reservations from their approved requests)
  // Enriches with activity name since partners don't have activities.view permission
  app.get("/api/my-reservations", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      if (!tenantId || !userId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      // Get all requests by this user that were converted to reservations
      const allRequests = await storage.getReservationRequests(tenantId);
      const myConvertedRequests = allRequests.filter(r => r.requestedBy === userId && r.status === "converted" && r.reservationId);
      
      // Get the corresponding reservations
      const reservationIds = myConvertedRequests.map(r => r.reservationId).filter(Boolean) as number[];
      const allReservations = await storage.getReservations(tenantId);
      const myReservations = allReservations.filter(r => reservationIds.includes(r.id));
      
      // Enrich with activity names
      const activities = await storage.getActivities(tenantId);
      const enrichedReservations = myReservations.map(reservation => ({
        ...reservation,
        activityName: activities.find(a => a.id === reservation.activityId)?.name || "Bilinmiyor"
      }));
      
      res.json(enrichedReservations);
    } catch (error) {
      console.error("Get my reservations error:", error);
      res.status(500).json({ error: "Rezervasyonlar alinamadi" });
    }
  });
  
  // Process reservation request (approve/reject) - requires RESERVATIONS_CREATE permission
  app.patch("/api/reservation-requests/:id", requirePermission(PERMISSIONS.RESERVATIONS_CREATE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      const { status, processNotes } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      if (!["approved", "rejected", "converted"].includes(status)) {
        return res.status(400).json({ error: "Gecersiz durum" });
      }
      
      // Verify the request belongs to the current tenant
      const existingRequest = await storage.getReservationRequest(id);
      if (!existingRequest || existingRequest.tenantId !== tenantId) {
        return res.status(404).json({ error: "Talep bulunamadi" });
      }
      
      // For partner requests being approved, also create reservation and partner transaction
      if (status === "approved" && existingRequest.requestedBy) {
        const requesterUser = await storage.getAppUser(existingRequest.requestedBy);
        
        // Check if this is a partner request (requester is from a different tenant)
        if (requesterUser?.tenantId && requesterUser.tenantId !== tenantId) {
          // Get activity info
          const activities = await storage.getActivities(tenantId);
          const activity = activities.find(a => a.id === existingRequest.activityId);
          
          // Determine payment status based on paymentCollectionType
          const collectionType = existingRequest.paymentCollectionType || 'receiver_full';
          let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
          if (collectionType === 'sender_full') {
            paymentStatus = 'paid';
          } else if (collectionType === 'sender_partial') {
            paymentStatus = 'partial';
          }
          // receiver_full stays as 'unpaid' - receiver will collect from customer
          
          // Create the reservation with confirmed status since request is approved
          const reservation = await storage.createReservation({
            tenantId,
            activityId: existingRequest.activityId,
            date: existingRequest.date,
            time: existingRequest.time,
            customerName: existingRequest.customerName,
            customerPhone: existingRequest.customerPhone,
            quantity: existingRequest.guests || 1,
            notes: existingRequest.notes || "",
            status: "confirmed",
            source: "partner",
            paymentStatus
          });
          
          // Get partner price from activity partner share if exists
          const partnerships = await storage.getTenantPartnerships(tenantId);
          const partnership = partnerships.find(p => 
            (p.requesterTenantId === requesterUser.tenantId || p.partnerTenantId === requesterUser.tenantId) &&
            p.status === 'active'
          );
          
          let unitPrice = activity?.price || 0;
          let currency = 'TRY';
          
          if (partnership) {
            const shares = await storage.getActivityPartnerShares(existingRequest.activityId);
            const share = shares.find(s => s.partnershipId === partnership.id);
            if (share?.partnerUnitPrice) {
              unitPrice = share.partnerUnitPrice;
              currency = share.partnerCurrency || 'TRY';
            }
          }
          
          const guestCount = existingRequest.guests || 1;
          const totalPrice = unitPrice * guestCount;
          
          // Calculate payment allocation (collectionType already defined above)
          let amountCollectedBySender = 0;
          let amountDueToReceiver = 0;
          let balanceOwed = 0;
          
          if (collectionType === 'sender_full') {
            amountCollectedBySender = totalPrice;
            amountDueToReceiver = 0;
            balanceOwed = totalPrice;
          } else if (collectionType === 'sender_partial') {
            amountCollectedBySender = existingRequest.amountCollectedBySender || 0;
            amountDueToReceiver = totalPrice - amountCollectedBySender;
            balanceOwed = amountCollectedBySender;
          } else {
            amountCollectedBySender = 0;
            amountDueToReceiver = totalPrice;
            balanceOwed = 0;
          }
          
          // Create partner transaction for financial tracking
          try {
            await storage.createPartnerTransaction({
              reservationId: reservation.id,
              senderTenantId: requesterUser.tenantId,
              receiverTenantId: tenantId,
              activityId: existingRequest.activityId,
              guestCount,
              unitPrice,
              totalPrice,
              currency,
              customerName: existingRequest.customerName,
              customerPhone: existingRequest.customerPhone || null,
              reservationDate: existingRequest.date,
              reservationTime: existingRequest.time || null,
              status: 'pending',
              notes: existingRequest.paymentNotes || existingRequest.notes || null,
              paymentCollectionType: collectionType,
              amountCollectedBySender,
              amountDueToReceiver,
              balanceOwed
            });
          } catch (transErr) {
            console.error("Failed to create partner transaction in PATCH:", transErr);
          }
          
          // Update status to converted with reservationId
          const updated = await storage.updateReservationRequest(id, {
            status: "converted",
            reservationId: reservation.id,
            processedBy: userId,
            processedAt: new Date(),
            processNotes: processNotes || null
          });
          
          return res.json(updated);
        }
      }
      
      const updateData: any = {
        status,
        processedBy: userId,
        processedAt: new Date()
      };
      
      if (processNotes) {
        updateData.processNotes = processNotes;
      }
      
      const updated = await storage.updateReservationRequest(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update reservation request error:", error);
      res.status(500).json({ error: "Talep guncellenemedi" });
    }
  });
  
  // Convert reservation request to actual reservation - requires RESERVATIONS_CREATE permission
  app.post("/api/reservation-requests/:id/convert", requirePermission(PERMISSIONS.RESERVATIONS_CREATE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      // Get the request and verify tenant ownership
      const request = await storage.getReservationRequest(id);
      
      if (!request || request.tenantId !== tenantId) {
        return res.status(404).json({ error: "Talep bulunamadi" });
      }
      
      if (request.status === "converted") {
        return res.status(400).json({ error: "Bu talep zaten rezervasyona donusturulmus" });
      }
      
      // Get activity name for notification
      const activities = await storage.getActivities(tenantId);
      const activity = activities.find(a => a.id === request.activityId);
      const activityName = activity?.name || "Aktivite";
      
      // Create the reservation with unpaid payment status
      const reservation = await storage.createReservation({
        tenantId,
        activityId: request.activityId,
        date: request.date,
        time: request.time,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        quantity: request.guests || 1,
        notes: request.notes || "",
        status: "pending",
        source: "partner",
        paymentStatus: "unpaid"
      });
      
      // Update the request status
      await storage.updateReservationRequest(id, {
        status: "converted",
        reservationId: reservation.id,
        processedBy: req.session?.userId,
        processedAt: new Date()
      });
      
      // Create partner transaction for financial tracking
      if (request.requestedBy) {
        try {
          const requesterUser = await storage.getAppUser(request.requestedBy);
          if (requesterUser?.tenantId && requesterUser.tenantId !== tenantId) {
            // Get partner price from activity partner share if exists
            const partnerships = await storage.getTenantPartnerships(tenantId);
            const partnership = partnerships.find(p => 
              (p.tenantId === requesterUser.tenantId || p.partnerTenantId === requesterUser.tenantId) &&
              p.status === 'active'
            );
            
            let unitPrice = activity?.price || 0;
            let currency = 'TRY';
            
            if (partnership) {
              const shares = await storage.getActivityPartnerShares(request.activityId);
              const share = shares.find(s => s.partnershipId === partnership.id);
              if (share?.partnerUnitPrice) {
                unitPrice = share.partnerUnitPrice;
                currency = share.partnerCurrency || 'TRY';
              }
            }
            
            const guestCount = request.guests || 1;
            const totalPrice = unitPrice * guestCount;
            
            // Calculate payment allocation
            // balanceOwed = amount sender must remit to receiver (always positive or zero)
            // This represents the cash sender collected that belongs to receiver for the service
            const collectionType = request.paymentCollectionType || 'receiver_full';
            let amountCollectedBySender = 0;
            let amountDueToReceiver = 0;
            let balanceOwed = 0;
            
            if (collectionType === 'sender_full') {
              // Sender collected full amount from customer
              amountCollectedBySender = totalPrice;
              amountDueToReceiver = 0;
              // Sender has all the money, must transfer to receiver
              balanceOwed = totalPrice;
            } else if (collectionType === 'sender_partial') {
              // Sender collected partial amount from customer
              amountCollectedBySender = request.amountCollectedBySender || 0;
              amountDueToReceiver = totalPrice - amountCollectedBySender;
              // Sender has partial money, must transfer what they collected
              balanceOwed = amountCollectedBySender;
            } else {
              // receiver_full - Receiver will collect full amount from customer
              amountCollectedBySender = 0;
              amountDueToReceiver = totalPrice;
              // Sender has no money to transfer, receiver gets paid directly
              balanceOwed = 0;
            }
            
            await storage.createPartnerTransaction({
              reservationId: reservation.id,
              senderTenantId: requesterUser.tenantId, // Müşteri gönderen acenta
              receiverTenantId: tenantId, // Müşteri alan acenta
              activityId: request.activityId,
              guestCount,
              unitPrice,
              totalPrice,
              currency,
              customerName: request.customerName,
              customerPhone: request.customerPhone || null,
              reservationDate: request.date,
              reservationTime: request.time || null,
              status: 'pending',
              notes: request.paymentNotes || request.notes || null,
              paymentCollectionType: collectionType,
              amountCollectedBySender,
              amountDueToReceiver,
              balanceOwed
            });
          }
        } catch (transErr) {
          console.error("Failed to create partner transaction:", transErr);
        }
      }
      
      // Send email notification to the viewer who created the request
      if (request.requestedBy) {
        try {
          const requesterUser = await storage.getAppUser(request.requestedBy);
          if (requesterUser?.email) {
            const { sendTenantEmail } = await import("./email");
            await sendTenantEmail(tenantId, {
              to: requesterUser.email,
              subject: `Rezervasyon Talebiniz Onaylandi - ${activityName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">Rezervasyon Talebiniz Onaylandi</h2>
                  <p>Sayin ${requesterUser.name || requesterUser.username},</p>
                  <p>Olusturdugunuz rezervasyon talebi onaylanmis ve rezervasyona donusturulmustur.</p>
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Aktivite:</strong> ${activityName}</p>
                    <p><strong>Tarih:</strong> ${request.date}</p>
                    <p><strong>Saat:</strong> ${request.time}</p>
                    <p><strong>Musteri:</strong> ${request.customerName}</p>
                    <p><strong>Kisi Sayisi:</strong> ${request.guests || 1}</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">Bu bir otomatik bildirimdir.</p>
                </div>
              `
            });
          }
        } catch (emailErr) {
          console.error("Failed to send approval email to viewer:", emailErr);
        }
      }
      
      res.json({ success: true, reservation });
    } catch (error) {
      console.error("Convert reservation request error:", error);
      res.status(500).json({ error: "Talep donusturulemedi" });
    }
  });

  // Get reservation request statistics (viewer activity report)
  app.get("/api/reservation-requests/stats", requirePermission(PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.CAPACITY_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { groupBy = 'daily', from, to, viewerId } = req.query;
      
      if (groupBy !== 'daily' && groupBy !== 'monthly') {
        return res.status(400).json({ error: "groupBy parametresi 'daily' veya 'monthly' olmalidir" });
      }
      
      const stats = await storage.getReservationRequestStats(tenantId, {
        groupBy: groupBy as 'daily' | 'monthly',
        from: from as string | undefined,
        to: to as string | undefined,
        viewerId: viewerId ? parseInt(viewerId as string) : undefined
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Get reservation request stats error:", error);
      res.status(500).json({ error: "Istatistikler alinamadi" });
    }
  });

  // Get partner activity statistics (which partner sent how many guests per activity)
  app.get("/api/partner-activity-stats", requirePermission(PERMISSIONS.RESERVATIONS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { from, to, agencyId } = req.query;
      
      const stats = await storage.getPartnerActivityStats(tenantId, {
        from: from as string | undefined,
        to: to as string | undefined,
        agencyId: agencyId ? parseInt(agencyId as string) : undefined
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Get partner activity stats error:", error);
      res.status(500).json({ error: "Istatistikler alinamadi" });
    }
  });

  // === Partner Acenta (Cross-Tenant Sharing) ===

  // Get my partner invite codes
  app.get("/api/partner-invite-codes", requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      const codes = await storage.getPartnerInviteCodes(tenantId);
      res.json(codes);
    } catch (error) {
      console.error("Get partner invite codes error:", error);
      res.status(500).json({ error: "Davet kodlari alinamadi" });
    }
  });

  // Generate new partner invite code
  app.post("/api/partner-invite-codes", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      const code = await storage.generateUniquePartnerCode(tenantId);
      const { maxUsage, expiresAt } = req.body;
      
      const created = await storage.createPartnerInviteCode({
        tenantId,
        code,
        maxUsage: maxUsage || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true
      });
      res.status(201).json(created);
    } catch (error) {
      console.error("Create partner invite code error:", error);
      res.status(500).json({ error: "Davet kodu olusturulamadi" });
    }
  });

  // Delete partner invite code
  app.delete("/api/partner-invite-codes/:id", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      await storage.deletePartnerInviteCode(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Delete partner invite code error:", error);
      res.status(500).json({ error: "Davet kodu silinemedi" });
    }
  });

  // Get my tenant partnerships
  app.get("/api/tenant-partnerships", requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      const partnerships = await storage.getTenantPartnerships(tenantId);
      
      // Enrich with tenant names
      const tenants = await storage.getTenants();
      const tenantMap = new Map(tenants.map(t => [t.id, t]));
      
      const enriched = partnerships.map(p => ({
        ...p,
        requesterTenantName: tenantMap.get(p.requesterTenantId)?.name || 'Bilinmeyen',
        partnerTenantName: tenantMap.get(p.partnerTenantId)?.name || 'Bilinmeyen',
        isRequester: p.requesterTenantId === tenantId
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Get tenant partnerships error:", error);
      res.status(500).json({ error: "Partner iliskileri alinamadi" });
    }
  });

  // Connect to partner using invite code
  app.post("/api/tenant-partnerships/connect", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Davet kodu gerekli" });
      }
      
      // Find invite code
      const inviteCode = await storage.getPartnerInviteCodeByCode(code);
      if (!inviteCode) {
        return res.status(404).json({ error: "Gecersiz davet kodu" });
      }
      
      // Check if code is active
      if (!inviteCode.isActive) {
        return res.status(400).json({ error: "Bu davet kodu artik gecerli degil" });
      }
      
      // Check expiration
      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Bu davet kodunun suresi dolmus" });
      }
      
      // Check usage limit
      if (inviteCode.maxUsage && (inviteCode.usageCount || 0) >= inviteCode.maxUsage) {
        return res.status(400).json({ error: "Bu davet kodu maksimum kullanim sayisina ulasti" });
      }
      
      // Check if trying to connect to self
      if (inviteCode.tenantId === tenantId) {
        return res.status(400).json({ error: "Kendi acentaniza baglanamazsiniz" });
      }
      
      // Check if partnership already exists
      const existing = await storage.getActivePartnership(tenantId, inviteCode.tenantId);
      if (existing) {
        return res.status(400).json({ error: "Bu acenta ile zaten baglantisiniz var" });
      }
      
      // Create partnership
      const partnership = await storage.createTenantPartnership({
        requesterTenantId: tenantId,
        partnerTenantId: inviteCode.tenantId,
        inviteCode: code,
        status: 'pending'
      });
      
      // Update invite code usage
      await storage.updatePartnerInviteCode(inviteCode.id, {
        usageCount: (inviteCode.usageCount || 0) + 1
      });
      
      // Get partner tenant name for response
      const partnerTenant = await storage.getTenant(inviteCode.tenantId);
      
      res.status(201).json({
        ...partnership,
        partnerTenantName: partnerTenant?.name || 'Bilinmeyen'
      });
    } catch (error) {
      console.error("Connect to partner error:", error);
      res.status(500).json({ error: "Partner baglantisi olusturulamadi" });
    }
  });

  // Accept/Reject partnership request
  app.patch("/api/tenant-partnerships/:id/respond", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const partnershipId = parseInt(req.params.id);
      const { action, notes } = req.body;
      
      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Gecersiz islem" });
      }
      
      const partnership = await storage.getTenantPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ error: "Baglanti bulunamadi" });
      }
      
      // Only the partner (receiver) can respond
      if (partnership.partnerTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu baglanti talebini yanitlama yetkiniz yok" });
      }
      
      if (partnership.status !== 'pending') {
        return res.status(400).json({ error: "Bu baglanti talebi zaten yanitlandi" });
      }
      
      const updated = await storage.updateTenantPartnership(partnershipId, {
        status: action === 'accept' ? 'active' : 'rejected',
        notes: notes || partnership.notes,
        respondedAt: new Date()
      });
      
      // If accepted, auto-create agency records for both sides
      if (action === 'accept') {
        const requesterTenant = await storage.getTenant(partnership.requesterTenantId);
        const partnerTenant = await storage.getTenant(partnership.partnerTenantId);
        
        // Create agency in requester's tenant for the partner (if not exists)
        const existingAgencyInRequester = await storage.getAgencyByPartnerTenantId(
          partnership.requesterTenantId, 
          partnership.partnerTenantId
        );
        if (!existingAgencyInRequester && partnerTenant) {
          await storage.createAgency({
            tenantId: partnership.requesterTenantId,
            name: partnerTenant.name,
            contactInfo: '',
            notes: 'Partner bağlantısı ile otomatik oluşturuldu',
            partnerTenantId: partnership.partnerTenantId,
            partnershipId: partnershipId,
            isSmartUser: true,
            active: true
          });
        }
        
        // Create agency in partner's tenant for the requester (if not exists)
        const existingAgencyInPartner = await storage.getAgencyByPartnerTenantId(
          partnership.partnerTenantId, 
          partnership.requesterTenantId
        );
        if (!existingAgencyInPartner && requesterTenant) {
          await storage.createAgency({
            tenantId: partnership.partnerTenantId,
            name: requesterTenant.name,
            contactInfo: '',
            notes: 'Partner bağlantısı ile otomatik oluşturuldu',
            partnerTenantId: partnership.requesterTenantId,
            partnershipId: partnershipId,
            isSmartUser: true,
            active: true
          });
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Respond to partnership error:", error);
      res.status(500).json({ error: "Baglanti talebi yanitlanamadi" });
    }
  });

  // Get partner shared availability - activities shared by partners
  app.get("/api/partner-shared-availability", requirePermission(PERMISSIONS.RESERVATIONS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { date, startDate, endDate } = req.query;
      
      // Get active partnerships where we are either the requester OR the partner (bidirectional)
      const partnerships = await storage.getTenantPartnerships(tenantId);
      const activePartnerships = partnerships.filter(p => p.status === 'active');
      
      if (activePartnerships.length === 0) {
        return res.json([]);
      }
      
      // Get the OTHER tenant ID (the one that is not us)
      const getOtherTenantId = (p: any) => p.requesterTenantId === tenantId ? p.partnerTenantId : p.requesterTenantId;
      
      // Get tenants for names
      const tenants = await storage.getTenants();
      const tenantMap = new Map(tenants.map(t => [t.id, t]));
      
      // For each partner, get their shared activities and capacity
      const results = await Promise.all(activePartnerships.map(async (partnership) => {
        const partnerTenantId = getOtherTenantId(partnership);
        
        // Get all activities from the partner tenant first
        const allActivities = await storage.getActivities(partnerTenantId);
        const partnerActivityIds = new Set(allActivities.map((a: any) => a.id));
        
        // Get activities specifically shared with this partnership, but only for the partner's activities
        const activityShares = await storage.getActivityPartnerShares(0); // Get all shares
        const sharesForThisPartnership = activityShares.filter(s => 
          s.partnershipId === partnership.id && partnerActivityIds.has(s.activityId)
        );
        
        var sharedActivities: any[];
        if (sharesForThisPartnership.length === 0) {
          // Fall back to sharedWithPartners flag for backward compatibility
          sharedActivities = allActivities.filter((a: any) => a.sharedWithPartners === true && a.active !== false);
        } else {
          // Use granular activity shares
          const sharedActivityIds = new Set(sharesForThisPartnership.map(s => s.activityId));
          sharedActivities = allActivities.filter((a: any) => sharedActivityIds.has(a.id) && a.active !== false);
        }
        
        if (sharedActivities.length === 0) {
          return null;
        }
        
        // Create a map of activity ID to share info for partner price
        const shareInfoMap = new Map(sharesForThisPartnership.map(s => [s.activityId, s]));
        
        // Calculate date range
        let queryStartDate: string;
        let queryEndDate: string;
        
        if (date) {
          queryStartDate = date as string;
          queryEndDate = date as string;
        } else if (startDate && endDate) {
          queryStartDate = startDate as string;
          queryEndDate = endDate as string;
        } else {
          // Default: next 7 days
          const today = new Date();
          const weekLater = new Date(today);
          weekLater.setDate(weekLater.getDate() + 7);
          queryStartDate = today.toISOString().split('T')[0];
          queryEndDate = weekLater.toISOString().split('T')[0];
        }
        
        // Get all reservations for the partner tenant to calculate bookedSlots dynamically
        const partnerReservations = await storage.getReservations(partnerTenantId);
        const activeReservations = partnerReservations.filter(r => 
          r.status !== 'cancelled' && r.date >= queryStartDate && r.date <= queryEndDate
        );
        
        // Build reservation counts map: key = "activityId-date-time" -> sum of quantity
        const reservationCounts: Record<string, number> = {};
        for (const r of activeReservations) {
          if (r.activityId && r.time) {
            const key = `${r.activityId}-${r.date}-${r.time}`;
            reservationCounts[key] = (reservationCounts[key] || 0) + r.quantity;
          }
        }
        
        // Get capacity for shared activities
        const activityData = await Promise.all(sharedActivities.map(async (activity: any) => {
          const shareInfo = shareInfoMap.get(activity.id);
          let capacities: any[] = [];
          
          // Get real capacity records from database
          capacities = await storage.getCapacityRange(partnerTenantId, activity.id, queryStartDate, queryEndDate);
          
          // If no real capacities exist, generate virtual capacities from activity defaults
          if (capacities.length === 0) {
            const defaultTimes = typeof activity.defaultTimes === 'string' 
              ? JSON.parse(activity.defaultTimes || '[]') 
              : (activity.defaultTimes || []);
            const defaultCapacity = activity.defaultCapacity || 10;
            
            // Generate virtual capacities for the date range
            const virtualCapacities: any[] = [];
            const currentDate = new Date(queryStartDate);
            const endDateObj = new Date(queryEndDate);
            
            while (currentDate <= endDateObj) {
              const dateStr = currentDate.toISOString().split('T')[0];
              for (const time of defaultTimes) {
                virtualCapacities.push({
                  date: dateStr,
                  time: time,
                  totalSlots: defaultCapacity,
                  bookedSlots: 0,
                  isVirtual: true
                });
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
            capacities = virtualCapacities;
          }
          
          return {
            id: activity.id,
            name: activity.name,
            description: activity.description,
            price: activity.price,
            priceUsd: activity.priceUsd,
            durationMinutes: activity.durationMinutes,
            color: activity.color,
            defaultTimes: activity.defaultTimes,
            partnerUnitPrice: shareInfo?.partnerUnitPrice || null,
            partnerCurrency: shareInfo?.partnerCurrency || 'TRY',
            capacities: capacities.map((c: any) => {
              // Calculate bookedSlots from actual reservations
              const slotKey = `${activity.id}-${c.date}-${c.time}`;
              const bookedFromReservations = reservationCounts[slotKey] || 0;
              return {
                date: c.date,
                time: c.time,
                totalSlots: c.totalSlots,
                bookedSlots: bookedFromReservations,
                availableSlots: c.totalSlots - bookedFromReservations
              };
            })
          };
        }));
        
        return {
          partnerTenantId,
          partnerTenantName: tenantMap.get(partnerTenantId)?.name || 'Bilinmeyen',
          activities: activityData
        };
      }));
      
      // Filter out null results
      res.json(results.filter(r => r !== null));
    } catch (error) {
      console.error("Get partner shared availability error:", error);
      res.status(500).json({ error: "Partner musaitlikleri alinamadi" });
    }
  });

  // Create reservation request from partner to activity owner
  app.post("/api/partner-reservation-requests", async (req, res) => {
    try {
      const requesterTenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!requesterTenantId || !userId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { activityId, date, time, customerName, customerPhone, guests, notes, paymentCollectionType, amountCollectedBySender, paymentCurrency, paymentNotes } = req.body;
      
      if (!activityId || !date || !time || !customerName || !customerPhone) {
        return res.status(400).json({ error: "Eksik parametreler" });
      }
      
      // Find the activity and its owner tenant
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ error: "Aktivite bulunamadi" });
      }
      
      const ownerTenantId = activity.tenantId;
      
      // Verify that there is an active partnership between requester and owner (bidirectional)
      const partnerships = await storage.getTenantPartnerships(requesterTenantId);
      const activePartnership = partnerships.find(p => 
        p.status === 'active' && 
        (
          (p.requesterTenantId === requesterTenantId && p.partnerTenantId === ownerTenantId) ||
          (p.partnerTenantId === requesterTenantId && p.requesterTenantId === ownerTenantId)
        )
      );
      
      if (!activePartnership) {
        return res.status(403).json({ error: "Bu aktiviteye erisim izniniz yok" });
      }
      
      // Verify that the activity is actually shared with this partnership
      // Get shares for this specific activity
      const sharesForThisActivity = await storage.getActivityPartnerShares(activityId);
      
      let isActivityShared = false;
      if (sharesForThisActivity.length > 0) {
        // Granular sharing is in use for this activity - check if our partnership is included
        isActivityShared = sharesForThisActivity.some(s => s.partnershipId === activePartnership.id);
      } else {
        // No granular shares exist for this activity - fall back to legacy sharedWithPartners flag
        isActivityShared = activity.sharedWithPartners === true;
      }
      
      if (!isActivityShared) {
        return res.status(403).json({ error: "Bu aktivite sizinle paylasilmamis" });
      }
      
      // Get requester info for tracking
      const requester = await storage.getAppUser(userId);
      const partnerName = requester?.companyName || requester?.name || 'Partner';
      
      // Create the reservation request in the OWNER's tenant context
      const request = await storage.createReservationRequest({
        tenantId: ownerTenantId, // The owner receives the request
        activityId,
        date,
        time,
        customerName,
        customerPhone,
        guests: guests || 1,
        notes: `[Partner: ${partnerName}] ${notes || ''}`.trim(),
        requestedBy: userId,
        status: "pending",
        paymentCollectionType: paymentCollectionType || 'receiver_full',
        amountCollectedBySender: amountCollectedBySender || 0,
        paymentCurrency: paymentCurrency || 'TRY',
        paymentNotes: paymentNotes || null
      });
      
      // Create notification for owner
      try {
        const requester = userId ? await storage.getAppUser(userId) : null;
        const partnerName = requester?.companyName || requester?.name || 'Partner Acenta';
        
        await storage.createSupportRequest({
          tenantId: ownerTenantId,
          type: "reservation_request",
          title: `Partner Rezervasyon Talebi: ${customerName}`,
          description: `Partner acenta yeni rezervasyon talebi olusturdu.\n\nPartner: ${partnerName}\nAktivite: ${activity.name}\nTarih: ${date}\nSaat: ${time}\nMusteri: ${customerName}\nTelefon: ${customerPhone}\nKisi Sayisi: ${guests || 1}\n${notes ? `Not: ${notes}` : ""}`,
          priority: "medium",
          metadata: JSON.stringify({ reservationRequestId: request.id, isPartnerRequest: true })
        });
      } catch (notifyErr) {
        console.error("Failed to create notification for partner reservation request:", notifyErr);
      }
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Create partner reservation request error:", error);
      res.status(500).json({ error: "Talep olusturulamadi" });
    }
  });

  // Get activity partner shares for an activity
  app.get("/api/activities/:id/partner-shares", requirePermission(PERMISSIONS.ACTIVITIES_VIEW), async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const shares = await storage.getActivityPartnerShares(activityId);
      res.json(shares);
    } catch (error) {
      console.error("Get activity partner shares error:", error);
      res.status(500).json({ error: "Partner paylasimlari alinamadi" });
    }
  });

  // Set activity partner shares (update which partners can see this activity)
  app.post("/api/activities/:id/partner-shares", requirePermission(PERMISSIONS.ACTIVITIES_MANAGE), async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const { partnershipIds, shares } = req.body;
      
      // Support both old format (partnershipIds array) and new format (shares array with prices)
      if (shares && Array.isArray(shares)) {
        await storage.setActivityPartnerShares(activityId, shares);
      } else if (Array.isArray(partnershipIds)) {
        // Convert old format to new format for backward compatibility
        const sharesData = partnershipIds.map((partnershipId: number) => ({ partnershipId }));
        await storage.setActivityPartnerShares(activityId, sharesData);
      } else {
        return res.status(400).json({ error: "partnershipIds array veya shares array gerekli" });
      }
      
      const resultShares = await storage.getActivityPartnerShares(activityId);
      res.json(resultShares);
    } catch (error) {
      console.error("Set activity partner shares error:", error);
      res.status(500).json({ error: "Partner paylasimlari guncellenemedi" });
    }
  });

  // === PARTNER TRANSACTIONS API ===
  
  // Get partner transactions (for finance page)
  app.get("/api/partner-transactions", requirePermission(PERMISSIONS.FINANCE_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { role } = req.query;
      const transactions = await storage.getPartnerTransactions(
        tenantId, 
        (role as 'sender' | 'receiver' | 'all') || 'all'
      );
      
      // Enrich with tenant and activity names
      const tenants = await storage.getTenants();
      const activities = await storage.getActivities();
      const tenantMap = new Map(tenants.map(t => [t.id, t]));
      const activityMap = new Map(activities.map(a => [a.id, a]));
      
      const enriched = transactions.map(t => ({
        ...t,
        senderTenantName: tenantMap.get(t.senderTenantId)?.name || 'Bilinmeyen',
        receiverTenantName: tenantMap.get(t.receiverTenantId)?.name || 'Bilinmeyen',
        activityName: activityMap.get(t.activityId)?.name || 'Bilinmeyen',
        currentTenantId: tenantId
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Get partner transactions error:", error);
      res.status(500).json({ error: "Partner islemleri alinamadi" });
    }
  });
  
  // Update partner transaction status (mark as paid)
  app.patch("/api/partner-transactions/:id", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const transaction = await storage.getPartnerTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Islem bulunamadi" });
      }
      
      // Verify tenant ownership (either sender or receiver)
      if (transaction.senderTenantId !== tenantId && transaction.receiverTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu isleme erisim yetkiniz yok" });
      }
      
      const { status } = req.body;
      const updateData: any = { status };
      
      if (status === 'paid') {
        updateData.paidAt = new Date();
      }
      
      const updated = await storage.updatePartnerTransaction(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update partner transaction error:", error);
      res.status(500).json({ error: "Islem guncellenemedi" });
    }
  });

  // Request deletion of a partner transaction (requires partner approval)
  app.post("/api/partner-transactions/:id/request-deletion", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const transaction = await storage.getPartnerTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Islem bulunamadi" });
      }
      
      // Only sender or receiver can request deletion
      if (transaction.senderTenantId !== tenantId && transaction.receiverTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu isleme erisim yetkiniz yok" });
      }
      
      // Check if already has a pending deletion request
      if (transaction.deletionStatus === 'pending') {
        return res.status(400).json({ error: "Bu islem icin zaten bir silme talebi bekliyor" });
      }
      
      const updated = await storage.updatePartnerTransaction(id, {
        deletionStatus: 'pending',
        deletionRequestedAt: new Date(),
        deletionRequestedByTenantId: tenantId,
        deletionRejectionReason: null
      });
      
      res.json({ message: "Silme talebi olusturuldu", transaction: updated });
    } catch (error) {
      console.error("Request deletion error:", error);
      res.status(500).json({ error: "Silme talebi olusturulamadi" });
    }
  });

  // Approve deletion request (by the other party)
  app.post("/api/partner-transactions/:id/approve-deletion", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const transaction = await storage.getPartnerTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Islem bulunamadi" });
      }
      
      // Only sender or receiver can approve
      if (transaction.senderTenantId !== tenantId && transaction.receiverTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu isleme erisim yetkiniz yok" });
      }
      
      // Cannot approve your own request - the other party must approve
      if (transaction.deletionRequestedByTenantId === tenantId) {
        return res.status(400).json({ error: "Kendi silme talebinizi onaylayamazsiniz" });
      }
      
      // Must have a pending deletion request
      if (transaction.deletionStatus !== 'pending') {
        return res.status(400).json({ error: "Bekleyen bir silme talebi yok" });
      }
      
      // Delete the transaction
      await storage.deletePartnerTransaction(id);
      
      res.json({ message: "Silme talebi onaylandi ve islem silindi" });
    } catch (error) {
      console.error("Approve deletion error:", error);
      res.status(500).json({ error: "Silme talebi onaylanamadi" });
    }
  });

  // Reject deletion request (by the other party)
  app.post("/api/partner-transactions/:id/reject-deletion", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      const { reason } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const transaction = await storage.getPartnerTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Islem bulunamadi" });
      }
      
      // Only sender or receiver can reject
      if (transaction.senderTenantId !== tenantId && transaction.receiverTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu isleme erisim yetkiniz yok" });
      }
      
      // Cannot reject your own request
      if (transaction.deletionRequestedByTenantId === tenantId) {
        return res.status(400).json({ error: "Kendi silme talebinizi reddedemezsiniz" });
      }
      
      // Must have a pending deletion request
      if (transaction.deletionStatus !== 'pending') {
        return res.status(400).json({ error: "Bekleyen bir silme talebi yok" });
      }
      
      const updated = await storage.updatePartnerTransaction(id, {
        deletionStatus: 'rejected',
        deletionRejectionReason: reason || 'Sebep belirtilmedi'
      });
      
      res.json({ message: "Silme talebi reddedildi", transaction: updated });
    } catch (error) {
      console.error("Reject deletion error:", error);
      res.status(500).json({ error: "Silme talebi reddedilemedi" });
    }
  });

  // Cancel deletion request (by the requester)
  app.post("/api/partner-transactions/:id/cancel-deletion", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.session?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const transaction = await storage.getPartnerTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Islem bulunamadi" });
      }
      
      // Only the requester can cancel
      if (transaction.deletionRequestedByTenantId !== tenantId) {
        return res.status(403).json({ error: "Sadece talep sahibi iptal edebilir" });
      }
      
      // Must have a pending deletion request
      if (transaction.deletionStatus !== 'pending') {
        return res.status(400).json({ error: "Bekleyen bir silme talebi yok" });
      }
      
      const updated = await storage.updatePartnerTransaction(id, {
        deletionStatus: null,
        deletionRequestedAt: null,
        deletionRequestedByTenantId: null,
        deletionRejectionReason: null
      });
      
      res.json({ message: "Silme talebi iptal edildi", transaction: updated });
    } catch (error) {
      console.error("Cancel deletion error:", error);
      res.status(500).json({ error: "Silme talebi iptal edilemedi" });
    }
  });

  // Get payments made to/received from partner agencies
  app.get("/api/partner-payments", requirePermission(PERMISSIONS.FINANCE_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const allPayouts: any[] = [];
      
      // 1. Payments made BY this tenant TO partner agencies (outgoing)
      const myAgencies = await storage.getAgencies(tenantId);
      const myPartnerAgencies = myAgencies.filter(a => a.partnerTenantId);
      
      for (const agency of myPartnerAgencies) {
        const agencyPayouts = await storage.getAgencyPayouts(agency.id);
        agencyPayouts.forEach(p => {
          allPayouts.push({
            ...p,
            partnerTenantId: agency.partnerTenantId,
            partnerName: agency.name,
            direction: 'outgoing', // Bu tenant ödeme yaptı
            fromTenantId: tenantId,
            toTenantId: agency.partnerTenantId
          });
        });
      }
      
      // 2. Payments received FROM other tenants (incoming)
      // Find agencies in OTHER tenants where partner_tenant_id = this tenant
      const allTenantAgencies = await storage.getAllAgenciesWithPartnerTenantId(tenantId);
      
      for (const agency of allTenantAgencies) {
        const agencyPayouts = await storage.getAgencyPayouts(agency.id);
        // Get the payer tenant name
        const payerTenant = await storage.getAppUser(agency.tenantId);
        const payerName = payerTenant?.companyName || payerTenant?.name || `Tenant ${agency.tenantId}`;
        
        agencyPayouts.forEach(p => {
          allPayouts.push({
            ...p,
            partnerTenantId: agency.tenantId,
            partnerName: payerName,
            direction: 'incoming', // Bu tenant ödeme aldı
            fromTenantId: agency.tenantId,
            toTenantId: tenantId
          });
        });
      }
      
      res.json(allPayouts);
    } catch (error) {
      console.error("Get partner payments error:", error);
      res.status(500).json({ error: "Partner odemeleri alinamadi" });
    }
  });

  // Confirm a partner payment (receiver confirms sender's payment claim)
  app.post("/api/partner-payments/:id/confirm", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const payoutId = parseInt(req.params.id);
      const payout = await storage.getAgencyPayoutById(payoutId);
      
      if (!payout) {
        return res.status(404).json({ error: "Odeme bulunamadi" });
      }
      
      // Verify this tenant is the receiver of this payment
      const agency = await storage.getAgency(payout.agencyId);
      if (!agency || agency.partnerTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu odemeyi onaylama yetkiniz yok" });
      }
      
      const updated = await storage.updateAgencyPayout(payoutId, {
        confirmationStatus: 'confirmed',
        confirmedByTenantId: tenantId,
        confirmedAt: new Date()
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Confirm partner payment error:", error);
      res.status(500).json({ error: "Odeme onaylanamadi" });
    }
  });

  // Reject a partner payment (receiver rejects sender's payment claim)
  app.post("/api/partner-payments/:id/reject", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const payoutId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const payout = await storage.getAgencyPayoutById(payoutId);
      
      if (!payout) {
        return res.status(404).json({ error: "Odeme bulunamadi" });
      }
      
      // Verify this tenant is the receiver of this payment
      const agency = await storage.getAgency(payout.agencyId);
      if (!agency || agency.partnerTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu odemeyi reddetme yetkiniz yok" });
      }
      
      const updated = await storage.updateAgencyPayout(payoutId, {
        confirmationStatus: 'rejected',
        confirmedByTenantId: tenantId,
        confirmedAt: new Date(),
        rejectionReason: reason || 'Sebep belirtilmedi'
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Reject partner payment error:", error);
      res.status(500).json({ error: "Odeme reddedilemedi" });
    }
  });

  // === VIEWER ACTIVITY SHARES (İzleyici Aktivite Paylaşımları ve Fiyatlandırma) ===
  
  // Get viewer activity shares for a specific viewer
  app.get("/api/viewer-activity-shares/:viewerUserId", requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const viewerUserId = parseInt(req.params.viewerUserId);
      const shares = await storage.getViewerActivityShares(tenantId, viewerUserId);
      res.json(shares);
    } catch (error) {
      console.error("Get viewer activity shares error:", error);
      res.status(500).json({ error: "Izleyici aktivite paylasimları alinamadi" });
    }
  });
  
  // Set viewer activity shares (bulk update)
  app.put("/api/viewer-activity-shares/:viewerUserId", requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const viewerUserId = parseInt(req.params.viewerUserId);
      const { shares } = req.body;
      
      if (!Array.isArray(shares)) {
        return res.status(400).json({ error: "Gecersiz veri formati" });
      }
      
      await storage.setViewerActivityShares(tenantId, viewerUserId, shares);
      const updatedShares = await storage.getViewerActivityShares(tenantId, viewerUserId);
      res.json(updatedShares);
    } catch (error) {
      console.error("Set viewer activity shares error:", error);
      res.status(500).json({ error: "Izleyici aktivite paylasimları guncellenemedi" });
    }
  });

  // === RESERVATION CHANGE REQUESTS (Değişiklik Talepleri) ===
  
  // Get all change requests for tenant
  app.get("/api/reservation-change-requests", requirePermission(PERMISSIONS.RESERVATIONS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const requests = await storage.getReservationChangeRequests(tenantId);
      
      // Enrich with reservation info
      const reservations = await storage.getReservations(tenantId);
      const reservationMap = new Map(reservations.map(r => [r.id, r]));
      
      const enriched = requests.map(req => ({
        ...req,
        reservation: reservationMap.get(req.reservationId) || null
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Get reservation change requests error:", error);
      res.status(500).json({ error: "Degisiklik talepleri alinamadi" });
    }
  });
  
  // Create a change request (for viewers/partners)
  app.post("/api/reservation-change-requests", requireAuth, async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { reservationId, requestType, requestedDate, requestedTime, requestDetails } = req.body;
      
      // Get the reservation with tenant check for security
      const reservation = await db.select().from(reservations).where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.tenantId, tenantId)
        )
      );
      if (reservation.length === 0) {
        return res.status(404).json({ error: "Rezervasyon bulunamadi veya erisim yetkiniz yok" });
      }
      
      const reservationData = reservation[0];
      
      // Determine initiator type
      let initiatedByType = 'customer';
      if (userId) {
        // Check if user is viewer
        const userRolesResult = await db.select().from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(
            and(
              eq(userRoles.userId, userId),
              eq(roles.name, 'viewer')
            )
          );
        
        if (userRolesResult.length > 0) {
          initiatedByType = 'viewer';
        } else {
          // Could also check for partner here if needed
          initiatedByType = 'partner';
        }
      }
      
      const newRequest = await storage.createReservationChangeRequest({
        reservationId,
        tenantId,
        initiatedByType,
        initiatedById: userId || null,
        requestType,
        originalDate: reservationData.date,
        originalTime: reservationData.time,
        requestedDate,
        requestedTime,
        requestDetails,
        status: 'pending'
      });
      
      // Create in-app notification for change request
      const requestTypeText = requestType === 'cancellation' ? 'Iptal Talebi' : 'Degisiklik Talebi';
      await notifyTenantAdmins(
        tenantId,
        'change_request',
        requestTypeText,
        `${reservationData.customerName} - ${requestDetails || 'Yeni talep'}`,
        '/reservations'
      );
      
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Create reservation change request error:", error);
      res.status(500).json({ error: "Degisiklik talebi olusturulamadi" });
    }
  });
  
  // Update change request (approve/reject)
  app.patch("/api/reservation-change-requests/:id", requirePermission(PERMISSIONS.RESERVATIONS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const id = parseInt(req.params.id);
      const { status, processNotes } = req.body;
      
      const request = await storage.getReservationChangeRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Talep bulunamadi" });
      }
      
      if (request.tenantId !== tenantId) {
        return res.status(403).json({ error: "Bu talebe erisim yetkiniz yok" });
      }
      
      const updateData: any = {
        status,
        processNotes,
        processedBy: userId,
        processedAt: new Date()
      };
      
      // If approved, also update the reservation (with tenant check for security)
      if (status === 'approved') {
        const reservation = await db.select().from(reservations).where(
          and(
            eq(reservations.id, request.reservationId),
            eq(reservations.tenantId, tenantId)
          )
        );
        if (reservation.length > 0) {
          const updateReservation: any = {};
          if (request.requestedDate) updateReservation.date = request.requestedDate;
          if (request.requestedTime) updateReservation.time = request.requestedTime;
          
          if (Object.keys(updateReservation).length > 0) {
            await storage.updateReservation(request.reservationId, updateReservation);
          }
          updateData.status = 'applied';
        } else {
          return res.status(404).json({ error: "Rezervasyon bulunamadi veya erisim yetkiniz yok" });
        }
      }
      
      const updated = await storage.updateReservationChangeRequest(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update reservation change request error:", error);
      res.status(500).json({ error: "Talep guncellenemedi" });
    }
  });
  
  // Update change request (edit by requester before approval)
  app.put("/api/reservation-change-requests/:id", requireAuth, async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const id = parseInt(req.params.id);
      const request = await storage.getReservationChangeRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Talep bulunamadi" });
      }
      
      // Only allow editing if pending and by the original requester
      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Sadece bekleyen talepler duzenlenebilir" });
      }
      
      if (request.initiatedById !== userId) {
        return res.status(403).json({ error: "Sadece kendi talebinizi duzenleyebilirsiniz" });
      }
      
      const { requestedDate, requestedTime, requestDetails } = req.body;
      
      const updated = await storage.updateReservationChangeRequest(id, {
        requestedDate,
        requestedTime,
        requestDetails
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Edit reservation change request error:", error);
      res.status(500).json({ error: "Talep duzenlenemedi" });
    }
  });
  
  // Delete change request (cancel by requester before approval)
  app.delete("/api/reservation-change-requests/:id", requireAuth, async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const id = parseInt(req.params.id);
      const request = await storage.getReservationChangeRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Talep bulunamadi" });
      }
      
      // Only allow deletion if pending and by the original requester
      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Sadece bekleyen talepler iptal edilebilir" });
      }
      
      if (request.initiatedById !== userId) {
        return res.status(403).json({ error: "Sadece kendi talebinizi iptal edebilirsiniz" });
      }
      
      await storage.deleteReservationChangeRequest(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reservation change request error:", error);
      res.status(500).json({ error: "Talep silinemedi" });
    }
  });

  // Get dispatch shares (incoming dispatches from partners)
  app.get("/api/dispatch-shares", requirePermission(PERMISSIONS.FINANCE_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const { status } = req.query;
      const shares = await storage.getDispatchShares(tenantId, status as string | undefined);
      
      // Enrich with sender tenant names and dispatch details
      const tenants = await storage.getTenants();
      const tenantMap = new Map(tenants.map(t => [t.id, t]));
      
      const enriched = await Promise.all(shares.map(async (share) => {
        // Get dispatch details (we need to fetch from sender's perspective)
        const dispatch = await db.select().from(supplierDispatches).where(eq(supplierDispatches.id, share.dispatchId));
        const dispatchData = dispatch[0];
        
        return {
          ...share,
          senderTenantName: tenantMap.get(share.senderTenantId)?.name || 'Bilinmeyen',
          dispatch: dispatchData || null
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Get dispatch shares error:", error);
      res.status(500).json({ error: "Gelen gonderimler alinamadi" });
    }
  });

  // Accept/Reject dispatch share
  app.patch("/api/dispatch-shares/:id/respond", requirePermission(PERMISSIONS.FINANCE_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const userId = req.session?.userId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadi" });
      }
      
      const shareId = parseInt(req.params.id);
      const { action, processNotes } = req.body;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Gecersiz islem" });
      }
      
      const share = await storage.getDispatchShare(shareId);
      if (!share) {
        return res.status(404).json({ error: "Gonderim bulunamadi" });
      }
      
      if (share.receiverTenantId !== tenantId) {
        return res.status(403).json({ error: "Bu gonderiyi yanitlama yetkiniz yok" });
      }
      
      if (share.status !== 'pending') {
        return res.status(400).json({ error: "Bu gonderim zaten yanitlandi" });
      }
      
      const updated = await storage.updateDispatchShare(shareId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        processedAt: new Date(),
        processedBy: userId,
        processNotes: processNotes || null
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Respond to dispatch share error:", error);
      res.status(500).json({ error: "Gonderim yanitlanamadi" });
    }
  });

  // === Webhooks ===
  app.post(api.webhooks.woocommerce.path, async (req, res) => {
    try {
      const order = req.body;
      console.log("Received WooCommerce Order:", order.id);
      
      // Get all activities and package tours for matching
      const activities = await storage.getActivities();
      const packageTours = await storage.getPackageTours();
      
      // Helper: Normalize text for Turkish locale matching
      const normalizeText = (text: string): string => {
        if (!text) return '';
        
        // Turkish-specific charaçter replacements (handle all variants)
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
      
      // Helper: Find matching package tour by name or aliases
      const findPackageTour = (productName: string) => {
        const productTokens = getTokens(productName);
        if (productTokens.length === 0) return null;
        
        let bestMatch: typeof packageTours[0] | null = null;
        let bestScore = 0;
        const THRESHOLD = 0.5; // At least 50% token overlap required
        
        for (const tour of packageTours) {
          if (!tour.active) continue;
          
          // Check main name
          const tourTokens = getTokens(tour.name);
          const score = tokenOverlapScore(productTokens, tourTokens);
          
          if (score > bestScore && score >= THRESHOLD) {
            bestScore = score;
            bestMatch = tour;
          }
          
          // Check aliases
          if (tour.nameAliases) {
            try {
              const aliases: string[] = JSON.parse(tour.nameAliases);
              for (const alias of aliases) {
                const aliasTokens = getTokens(alias);
                const aliasScore = tokenOverlapScore(productTokens, aliasTokens);
                if (aliasScore > bestScore && aliasScore >= THRESHOLD) {
                  bestScore = aliasScore;
                  bestMatch = tour;
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
        // First try to match as a package tour
        const matchedPackageTour = findPackageTour(item.name || '');
        
        if (matchedPackageTour) {
          // Extract base date/time from order meta or use today
          const bookingDate = order.meta_data?.find((m: any) => m.key === 'booking_date')?.value 
            || new Date().toISOString().split('T')[0];
          
          // Extract hotel name and transfer info from order meta
          const hotelName = order.meta_data?.find((m: any) => 
            m.key === 'hotel_name' || m.key === 'otel_adi' || m.key === '_hotel_name' || m.key === 'otel'
          )?.value || order.shipping?.company || '';
          const hasTransfer = !!(order.meta_data?.find((m: any) => 
            m.key === 'transfer' || m.key === 'otel_transferi' || m.key === 'hotel_transfer' || m.key === '_transfer'
          )?.value === 'yes' || order.meta_data?.find((m: any) => 
            m.key === 'transfer' || m.key === 'otel_transferi' || m.key === 'hotel_transfer' || m.key === '_transfer'
          )?.value === 'evet' || order.meta_data?.find((m: any) => 
            m.key === 'transfer' || m.key === 'otel_transferi' || m.key === 'hotel_transfer' || m.key === '_transfer'
          )?.value === '1' || hotelName);
          
          // Calculate prices for the whole package (to be stored in first reservation)
          const itemTotalPrice = parseFloat(item.total) || 0;
          const priceTl = isTL ? Math.round(itemTotalPrice) : 0;
          const priceUsd = !isTL ? Math.round(itemTotalPrice) : 0;
          
          const itemSubtotal = Math.round(parseFloat(item.subtotal || '0'));
          const itemTotalWithTax = Math.round(parseFloat(item.total || '0'));
          const itemTax = Math.round(parseFloat(item.total_tax || item.subtotal_tax || '0'));
          
          // Get package tour activities
          const tourActivities = await storage.getPackageTourActivities(matchedPackageTour.id);
          
          // Create a reservation for each activity in the package
          let parentReservationId: number | null = null;
          
          for (let i = 0; i < tourActivities.length; i++) {
            const ta = tourActivities[i];
            
            // Calculate actual date with dayOffset
            const baseDate = new Date(bookingDate);
            baseDate.setDate(baseDate.getDate() + (ta.dayOffset || 0));
            const activityDate = baseDate.toISOString().split('T')[0];
            
            const reservation = await storage.createReservation({
              activityId: ta.activityId,
              packageTourId: matchedPackageTour.id,
              parentReservationId: parentReservationId,
              orderNumber: String(order.id),
              customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'WooCommerce Müşteri',
              customerPhone: order.billing?.phone || '',
              customerEmail: order.billing?.email || '',
              date: activityDate,
              time: ta.defaultTime || '09:00',
              quantity: item.quantity || 1,
              priceTl: i === 0 ? priceTl : 0,
              priceUsd: i === 0 ? priceUsd : 0,
              currency,
              status: 'confirmed',
              source: 'web',
              externalId: String(order.id),
              orderSubtotal: i === 0 ? itemSubtotal : 0,
              orderTotal: i === 0 ? itemTotalWithTax + itemTax : 0,
              orderTax: i === 0 ? itemTax : 0,
              hotelName: hotelName || undefined,
              hasTransfer
            });
            
            // First reservation becomes parent for the rest
            if (i === 0) {
              parentReservationId = reservation.id;
            }
          }
          
          console.log(`Created ${tourActivities.length} reservations for package tour: ${matchedPackageTour.name} from order: ${order.id}`);
          
          // Send WhatsApp notification for package tour (only once, for the parent reservation)
          const customerPhone = order.billing?.phone || '';
          const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'Değerli Müşteri';
          if (customerPhone && parentReservationId) {
            try {
              // Check if WooCommerce notification is enabled
              const wooNotificationSetting = await storage.getSetting('wooNotification');
              let wooNotificationEnabled = true;
              let wooNotificationTemplate = "Merhaba {isim},\n\nSiparişiniz alınmıştır!\n\nSipariş No: {siparis_no}\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nRezervasyon detayları ve değişiklik talepleriniz için:\n{takip_linki}\n\nAktivite saati ve tarih değişikliği talepleriniz için, lütfen yukarıdaki takip linkine tıklayın. (Değişiklik talepleriniz müsaitliğe göre değerlendirilecektir.)\n\nSorularınız için bu numaradan bize ulaşabilirsiniz.\n\nİyi günler dileriz!";
              
              if (wooNotificationSetting) {
                try {
                  const settings = JSON.parse(wooNotificationSetting);
                  if (settings.enabled !== undefined) wooNotificationEnabled = settings.enabled;
                  if (settings.template) wooNotificationTemplate = settings.template;
                } catch {}
              }
              
              if (wooNotificationEnabled) {
                // Generate tracking token for parent reservation
                const trackingToken = await storage.generateTrackingToken(parentReservationId);
                // Build absolute tracking link using request host or env var
                const baseUrl = process.env.PUBLIC_APP_URL || 
                  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `${req.protocol}://${req.get('host')}`);
                const trackingLink = `${baseUrl}/takip/${trackingToken}`;
                
                // Build message from template
                const message = wooNotificationTemplate
                  .replace(/\{isim\}/gi, customerName)
                  .replace(/\{siparis_no\}/gi, String(order.id))
                  .replace(/\{aktivite\}/gi, matchedPackageTour.name)
                  .replace(/\{tarih\}/gi, bookingDate)
                  .replace(/\{saat\}/gi, tourActivities[0]?.defaultTime || '09:00')
                  .replace(/\{takip_linki\}/gi, trackingLink);
                
                // Send via Twilio
                const accountSid = process.env.TWILIO_ACCOUNT_SID;
                const authToken = process.env.TWILIO_AUTH_TOKEN;
                const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
                
                if (accountSid && authToken && twilioWhatsAppNumber) {
                  // Format phone number
                  let formattedPhone = customerPhone.replace(/\s+/g, '').replace(/^\+/, '');
                  if (formattedPhone.startsWith('0')) {
                    formattedPhone = '90' + formattedPhone.substring(1);
                  }
                  if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
                    formattedPhone = '90' + formattedPhone;
                  }
                  
                  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
                  const formData = new URLSearchParams();
                  formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
                  formData.append('To', `whatsapp:+${formattedPhone}`);
                  formData.append('Body', message);
                  
                  const twilioResponse = await fetch(twilioUrl, {
                    method: 'POST',
                    headers: {
                      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                      'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString()
                  });
                  
                  if (twilioResponse.ok) {
                    console.log(`WhatsApp notification sent for WooCommerce package tour order: ${order.id}`);
                    await logInfo('whatsapp', `WooCommerce paket tur bildirimi gönderildi: ${customerName} - ${matchedPackageTour.name}`);
                  } else {
                    const errorText = await twilioResponse.text();
                    console.error(`WhatsApp notification failed for package tour order ${order.id}:`, errorText);
                  }
                }
              }
            } catch (notifyErr) {
              console.error(`WhatsApp notification error for package tour order ${order.id}:`, notifyErr);
            }
          }
        } else {
          // Fall back to regular activity matching
          const matchedActivity = findActivity(item.name || '');
          
          if (matchedActivity) {
            // Extract date/time from order meta or use today
            const bookingDate = order.meta_data?.find((m: any) => m.key === 'booking_date')?.value 
              || new Date().toISOString().split('T')[0];
            const bookingTime = order.meta_data?.find((m: any) => m.key === 'booking_time')?.value 
              || '10:00';
            
            // Extract hotel name and transfer info from order meta
            const hotelName = order.meta_data?.find((m: any) => 
              m.key === 'hotel_name' || m.key === 'otel_adi' || m.key === '_hotel_name' || m.key === 'otel'
            )?.value || order.shipping?.company || '';
            const hasTransfer = !!(order.meta_data?.find((m: any) => 
              m.key === 'transfer' || m.key === 'otel_transferi' || m.key === 'hotel_transfer' || m.key === '_transfer'
            )?.value === 'yes' || order.meta_data?.find((m: any) => 
              m.key === 'transfer' || m.key === 'otel_transferi' || m.key === 'hotel_transfer' || m.key === '_transfer'
            )?.value === 'evet' || order.meta_data?.find((m: any) => 
              m.key === 'transfer' || m.key === 'otel_transferi' || m.key === 'hotel_transfer' || m.key === '_transfer'
            )?.value === '1' || hotelName);
            
            // Calculate prices for reservation
            const itemTotalPrice = parseFloat(item.total) || 0;
            const priceTl = isTL ? Math.round(itemTotalPrice) : 0;
            const priceUsd = !isTL ? Math.round(itemTotalPrice) : 0;
            
            // Extract order financial details for finance module
            const itemSubtotal = Math.round(parseFloat(item.subtotal || '0'));
            const itemTotalWithTax = Math.round(parseFloat(item.total || '0'));
            const itemTax = Math.round(parseFloat(item.total_tax || item.subtotal_tax || '0'));
            
            const orderSubtotal = itemSubtotal;
            const orderTotal = itemTotalWithTax + itemTax;
            const orderTax = itemTax;
            
            const createdReservation = await storage.createReservation({
              activityId: matchedActivity.id,
              orderNumber: String(order.id),
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
              externalId: String(order.id),
              orderSubtotal,
              orderTotal,
              orderTax,
              hotelName: hotelName || undefined,
              hasTransfer
            });
            
            console.log(`Created reservation for activity: ${matchedActivity.name} from order: ${order.id}`);
            
            // Send WhatsApp notification if enabled and phone exists
            const customerPhone = order.billing?.phone || '';
            const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'Değerli Müşteri';
            if (customerPhone && createdReservation?.id) {
              try {
                // Check if WooCommerce notification is enabled
                const wooNotificationSetting = await storage.getSetting('wooNotification');
                let wooNotificationEnabled = true;
                let wooNotificationTemplate = "Merhaba {isim},\n\nSiparişiniz alınmıştır!\n\nSipariş No: {siparis_no}\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nRezervasyon detayları ve değişiklik talepleriniz için:\n{takip_linki}\n\nAktivite saati ve tarih değişikliği talepleriniz için, lütfen yukarıdaki takip linkine tıklayın. (Değişiklik talepleriniz müsaitliğe göre değerlendirilecektir.)\n\nSorularınız için bu numaradan bize ulaşabilirsiniz.\n\nİyi günler dileriz!";
                
                if (wooNotificationSetting) {
                  try {
                    const settings = JSON.parse(wooNotificationSetting);
                    if (settings.enabled !== undefined) wooNotificationEnabled = settings.enabled;
                    if (settings.template) wooNotificationTemplate = settings.template;
                  } catch {}
                }
                
                if (wooNotificationEnabled) {
                  // Generate tracking token
                  const trackingToken = await storage.generateTrackingToken(createdReservation.id);
                  // Build absolute tracking link using request host or env var
                  const baseUrl = process.env.PUBLIC_APP_URL || 
                    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `${req.protocol}://${req.get('host')}`);
                  const trackingLink = `${baseUrl}/takip/${trackingToken}`;
                  
                  // Build message from template
                  const message = wooNotificationTemplate
                    .replace(/\{isim\}/gi, customerName)
                    .replace(/\{siparis_no\}/gi, String(order.id))
                    .replace(/\{aktivite\}/gi, matchedActivity.name)
                    .replace(/\{tarih\}/gi, bookingDate)
                    .replace(/\{saat\}/gi, bookingTime)
                    .replace(/\{takip_linki\}/gi, trackingLink);
                  
                  // Send via Twilio
                  const accountSid = process.env.TWILIO_ACCOUNT_SID;
                  const authToken = process.env.TWILIO_AUTH_TOKEN;
                  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
                  
                  if (accountSid && authToken && twilioWhatsAppNumber) {
                    // Format phone number
                    let formattedPhone = customerPhone.replace(/\s+/g, '').replace(/^\+/, '');
                    if (formattedPhone.startsWith('0')) {
                      formattedPhone = '90' + formattedPhone.substring(1);
                    }
                    if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
                      formattedPhone = '90' + formattedPhone;
                    }
                    
                    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
                    const formData = new URLSearchParams();
                    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
                    formData.append('To', `whatsapp:+${formattedPhone}`);
                    formData.append('Body', message);
                    
                    const twilioResponse = await fetch(twilioUrl, {
                      method: 'POST',
                      headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                      },
                      body: formData.toString()
                    });
                    
                    if (twilioResponse.ok) {
                      console.log(`WhatsApp notification sent for WooCommerce order: ${order.id}`);
                      await logInfo('whatsapp', `WooCommerce bildirim gönderildi: ${customerName} - ${matchedActivity.name}`);
                    } else {
                      const errorText = await twilioResponse.text();
                      console.error(`WhatsApp notification failed for order ${order.id}:`, errorText);
                    }
                  }
                }
              } catch (notifyErr) {
                console.error(`WhatsApp notification error for order ${order.id}:`, notifyErr);
              }
            }
          } else {
            console.log(`No matching activity or package tour found for product: ${item.name}`);
          }
        }
      }
      
      res.json({ received: true, processed: lineItems.length });
    } catch (error) {
      console.error("WooCommerce webhook error:", error);
      await logError('webhook', 'WooCommerce webhook hatası', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Tenant-specific WhatsApp webhook (preferred - properly identifies tenant from URL)
  app.post("/api/webhooks/whatsapp/:tenantSlug", async (req, res) => {
    const { Body, From } = req.body;
    const { tenantSlug } = req.params;
    
    // Identify tenant from URL slug
    const tenant = await storage.getTenantBySlug(tenantSlug);
    if (!tenant) {
      console.error(`WhatsApp webhook: Unknown tenant slug: ${tenantSlug}`);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }
    const tenantId = tenant.id;
    
    if (From && Body) {
      await storage.addMessage({ phone: From, content: Body, role: "user" });

      // Check blacklist
      const isBlacklisted = await storage.isBlacklisted(From);
      if (isBlacklisted) {
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }

      // Check daily message limit for tenant
      const messageLimit = await storage.getTenantMessageLimit(tenantId);
      if (messageLimit.remaining <= 0) {
        const limitExceededMsg = "Günlük mesaj limitimize ulaştık. Lütfen yarın tekrar deneyin veya bizi doğrudan arayın.";
        await storage.addMessage({ phone: From, content: limitExceededMsg, role: "assistant" });
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${limitExceededMsg}</Message></Response>`);
        return;
      }
      
      // Increment message count atomically
      await storage.incrementDailyMessageCount(tenantId);

      // Check for open support request
      const openSupportRequest = await storage.getOpenSupportRequest(From);
      if (openSupportRequest) {
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }

      // Check for auto-response match
      const autoResponseMatch = await storage.findMatchingAutoResponse(Body);
      if (autoResponseMatch) {
        await storage.addMessage({ phone: From, content: autoResponseMatch.response, role: "assistant" });
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${autoResponseMatch.response}</Message></Response>`);
        return;
      }

      // Check if customer is asking for order confirmation
      const confirmationKeywords = [
        'siparişim onaylandı', 'siparis onaylandi', 'sipariş onayı',
        'ödeme yaptım', 'odeme yaptim', 'havale yaptım', 'havale yaptim',
        'onay mesajı', 'onay mesaji', 'onaylandı mı', 'onaylandi mi',
        'rezervasyon onayı', 'rezervasyonum onaylandı', 'sipariş durumu',
        'siparis durumu', 'ödeme gönderdim', 'odeme gonderdim'
      ];
      const bodyLower = Body.toLowerCase().replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c');
      const isAskingForConfirmation = confirmationKeywords.some(kw => 
        bodyLower.includes(kw.replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c'))
      );

      // If asking for confirmation and has a reservation, send confirmation message
      if (isAskingForConfirmation) {
        // Check for order number in message
        const orderNumberMatch = Body.match(/\b(\d{4,})\b/);
        const potentialOrderId = orderNumberMatch ? orderNumberMatch[1] : undefined;
        const reservation = await storage.findReservationByPhoneOrOrder(From, potentialOrderId);
        
        if (reservation) {
          // Get activity or package tour info
          const activity = reservation.activityId ? await storage.getActivity(reservation.activityId) : null;
          const packageTour = (reservation as any).packageTourId ? await storage.getPackageTour((reservation as any).packageTourId) : null;
          
          // Get confirmation template
          let confirmationTemplate = "";
          if (packageTour?.confirmationMessage && packageTour?.useCustomConfirmation) {
            confirmationTemplate = packageTour.confirmationMessage;
          } else if (activity?.confirmationMessage && (activity as any).useCustomConfirmation) {
            confirmationTemplate = activity.confirmationMessage || '';
          }
          
          // If no custom template, use global template
          if (!confirmationTemplate) {
            const globalSetting = await storage.getSetting('manualConfirmation', tenantId);
            if (globalSetting) {
              try {
                const parsed = JSON.parse(globalSetting);
                if (parsed.template) confirmationTemplate = parsed.template;
              } catch {}
            }
          }
          
          // If still no template, use default
          if (!confirmationTemplate) {
            // Check if reservation has transfer
            const hasTransferInfo = (reservation as any).hasTransfer && (reservation as any).transferZone;
            
            if (hasTransferInfo) {
              confirmationTemplate = `Merhaba {isim},

{aktivite} rezervasyonunuz onaylanmıştır!

Sipariş No: {siparis_no}
Tarih: {tarih}
Saat: {saat}
Kişi: {kisi}

🚐 OTEL TRANSFERİ
Bölge: {bolge}
Otel: {otel}
Alınış Saati: {transfer_saat}
(Aktivite saatinden önce otelinizden alınacaksınız)

Rezervasyon takip: {takip_linki}

İyi tatiller dileriz!`;
            } else {
              confirmationTemplate = `Merhaba {isim},

{aktivite} rezervasyonunuz onaylanmıştır!

Sipariş No: {siparis_no}
Tarih: {tarih}
Saat: {saat}
Kişi: {kisi}

Rezervasyon takip: {takip_linki}

İyi tatiller dileriz!`;
            }
          }
          
          // Calculate transfer time helper
          const calculateTransferTime = (activityTime: string, transferZone: string | null, transferZones: string): string => {
            if (!activityTime || !transferZone) return '';
            try {
              const zones = JSON.parse(transferZones || '[]');
              const zoneData = zones.find((z: any) => 
                (typeof z === 'object' && z.zone === transferZone) || z === transferZone
              );
              if (!zoneData) return '';
              const minutesBefore = typeof zoneData === 'object' ? (zoneData.minutesBefore || 30) : 30;
              const [hours, minutes] = activityTime.split(':').map(Number);
              let totalMinutes = hours * 60 + minutes - minutesBefore;
              if (totalMinutes < 0) totalMinutes += 24 * 60;
              const pickupHours = Math.floor(totalMinutes / 60);
              const pickupMins = totalMinutes % 60;
              return `${String(pickupHours).padStart(2, '0')}:${String(pickupMins).padStart(2, '0')}`;
            } catch { return ''; }
          };
          
          // Build tracking link
          const trackingLink = reservation.trackingToken 
            ? `${req.protocol}://${req.get('host')}/takip/${reservation.trackingToken}`
            : '';
          
          // Build placeholder values
          const totalPrice = (reservation as any).priceTl || (reservation as any).orderTotal || 0;
          const paidAmount = (reservation as any).paidAmountTl || 0;
          const remainingAmount = Math.max(0, totalPrice - paidAmount);
          
          const placeholders: Record<string, string> = {
            isim: reservation.customerName || '',
            tarih: reservation.date || '',
            saat: reservation.time || '',
            aktivite: activity?.name || packageTour?.name || '',
            kisi: String(reservation.quantity || 1),
            yetiskin: String(reservation.quantity || 1),
            cocuk: '0',
            otel: (reservation as any).hotelName || '',
            bolge: (reservation as any).transferZone || '',
            transfer_saat: calculateTransferTime(reservation.time, (reservation as any).transferZone, (activity as any)?.transferZones || '[]'),
            toplam: totalPrice > 0 ? `${totalPrice} TL` : '',
            odenen: paidAmount > 0 ? `${paidAmount} TL` : '',
            kalan: remainingAmount > 0 ? `${remainingAmount} TL` : '',
            siparis_no: (reservation as any).orderNumber || reservation.id?.toString() || '',
            takip_linki: trackingLink,
            bulusma_noktasi: (activity as any)?.meetingPoint || '',
            varis_suresi: String((activity as any)?.arrivalMinutesBefore || 30),
            getirin: '',
            saglik_notlari: (activity as any)?.healthNotes || '',
            ekstralar: '',
          };
          
          // Apply placeholders
          let confirmationMessage = confirmationTemplate;
          for (const [key, value] of Object.entries(placeholders)) {
            confirmationMessage = confirmationMessage.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
          }
          
          await storage.addMessage({ phone: From, content: confirmationMessage, role: "assistant" });
          res.type('text/xml');
          res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmationMessage}</Message></Response>`);
          return;
        }
      }

      // Check if sender is a partner agency
      const partnerCheck = await storage.checkIfPhoneIsPartner(From, tenantId);
      const isPartner = partnerCheck.isPartner;
      const partnerTenant = partnerCheck.partnerTenant;

      // Check if sender is a viewer user
      const viewerCheck = await storage.checkIfPhoneIsViewer(From, tenantId);
      const isViewer = viewerCheck.isViewer;
      const viewerUser = viewerCheck.viewerUser;

      // Check reservation - get ALL reservations for this phone
      const orderNumberMatch = Body.match(/\b(\d{4,})\b/);
      const potentialOrderId = orderNumberMatch ? orderNumberMatch[1] : undefined;
      const userReservation = await storage.findReservationByPhoneOrOrder(From, potentialOrderId);
      const allUserReservations = await storage.findAllReservationsByPhone(From, tenantId);

      // Get customer requests
      const customerRequestsForPhone = await storage.getCustomerRequestsByPhone(From);
      const pendingRequests = customerRequestsForPhone.filter(r => r.status === 'pending');

      // Get history & context for this tenant
      const history = await storage.getMessages(From, 5);
      const activities = await storage.getActivities(tenantId);
      const packageTours = await storage.getPackageTours(tenantId);
      
      // Get capacity data
      const today = new Date();
      const upcomingDates: Set<string> = new Set();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        upcomingDates.add(d.toISOString().split('T')[0]);
      }
      const messageDates = parseDatesFromMessage(Body);
      for (const dateStr of messageDates) upcomingDates.add(dateStr);
      const holidayDates = await findHolidayDatesFromMessage(Body);
      for (const dateStr of holidayDates) upcomingDates.add(dateStr);
      const upcomingCapacity = await getCapacityWithVirtualSlots(Array.from(upcomingDates), tenantId);
      
      // Get bot settings for this tenant
      const botPrompt = await storage.getSetting('botPrompt');
      const botAccessSetting = await storage.getSetting('botAccess');
      let botAccess: any = { enabled: true, activities: true, packageTours: true, capacity: true, faq: true, confirmation: true, transfer: true, extras: true };
      if (botAccessSetting) {
        try { botAccess = { ...botAccess, ...JSON.parse(botAccessSetting) }; } catch {}
      }
      const botRules = await storage.getSetting('botRules');
      const generalFaq = await storage.getSetting('generalFaq');
      const partnerPrompt = await storage.getSetting('partner_prompt');
      const viewerPrompt = await storage.getSetting('viewer_prompt');
      
      // If bot is disabled, just log the message and don't respond
      if (botAccess.enabled === false) {
        console.log(`Bot disabled for tenant ${tenantId}, message logged but not responded`);
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }
      
      // Generate AI response
      const aiResponse = await generateAIResponse(history, { 
        activities: botAccess.activities ? activities : [], 
        packageTours: botAccess.packageTours ? packageTours : [],
        capacityData: botAccess.capacity ? upcomingCapacity : [],
        hasReservation: !!userReservation || allUserReservations.length > 0,
        reservation: userReservation,
        allReservations: allUserReservations,
        askForOrderNumber: !userReservation && allUserReservations.length === 0,
        customerRequests: customerRequestsForPhone,
        pendingRequests,
        botAccess,
        botRules,
        generalFaq,
        isPartner,
        partnerName: partnerTenant?.name,
        partnerPrompt,
        isViewer,
        viewerName: viewerUser?.name,
        viewerPrompt
      }, botPrompt || undefined);
      
      // Check if needs human intervention
      const needsHuman = aiResponse.toLowerCase().includes('yetkili') || 
                         aiResponse.toLowerCase().includes('müdahale') ||
                         aiResponse.toLowerCase().includes('iletiyorum');
      
      if (needsHuman) {
        await storage.createSupportRequest({ phone: From, status: 'open' });
        await storage.markHumanIntervention(From, true);
      }
      
      await storage.addMessage({ phone: From, content: aiResponse, role: "assistant" });
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${aiResponse}</Message></Response>`);
    } else {
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // Legacy/fallback WhatsApp webhook (tries to identify tenant from reservation)
  app.post(api.webhooks.whatsapp.path, async (req, res) => {
    const { Body, From } = req.body;
    
    // Save user message
    if (From && Body) {
      await storage.addMessage({
        phone: From,
        content: Body,
        role: "user"
      });

      // Check blacklist - don't respond if blacklisted
      const isBlacklisted = await storage.isBlacklisted(From);
      if (isBlacklisted) {
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }

      // Check for open support request - don't respond if exists
      const openSupportRequest = await storage.getOpenSupportRequest(From);
      if (openSupportRequest) {
        // Don't respond to ongoing support requests - human will handle
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }

      // Check for auto-response match (keyword-based, no AI call = cost savings)
      const autoResponseMatch = await storage.findMatchingAutoResponse(Body);
      if (autoResponseMatch) {
        // Save auto-response as assistant message
        await storage.addMessage({
          phone: From,
          content: autoResponseMatch.response,
          role: "assistant"
        });
        
        // Return TwiML with matched response
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${autoResponseMatch.response}</Message></Response>`);
        return;
      }

      // Check if user has a reservation (by phone or order number in message)
      const orderNumberMatch = Body.match(/\b(\d{4,})\b/);
      const potentialOrderId = orderNumberMatch ? orderNumberMatch[1] : undefined;
      const userReservation = await storage.findReservationByPhoneOrOrder(From, potentialOrderId);

      // Try to determine tenantId from reservation or session
      let tenantId = req.session?.tenantId;
      if (!tenantId && userReservation?.tenantId) {
        tenantId = userReservation.tenantId;
      }
      
      // Check daily message limit for tenant (if identified)
      if (tenantId) {
        const messageLimit = await storage.getTenantMessageLimit(tenantId);
        if (messageLimit.remaining <= 0) {
          // Daily limit exceeded - send polite message and don't process
          const limitExceededMsg = "Günlük mesaj limitimize ulaştık. Lütfen yarın tekrar deneyin veya bizi doğrudan arayın.";
          await storage.addMessage({
            phone: From,
            content: limitExceededMsg,
            role: "assistant"
          });
          res.type('text/xml');
          res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${limitExceededMsg}</Message></Response>`);
          return;
        }
        
        // Increment message count for this tenant
        await storage.incrementDailyMessageCount(tenantId);
      }

      // Check if user has any pending customer requests
      const customerRequestsForPhone = await storage.getCustomerRequestsByPhone(From);
      const pendingRequests = customerRequestsForPhone.filter(r => r.status === 'pending');

      // Get history
      const history = await storage.getMessages(From, 5);
      const activities = await storage.getActivities(tenantId);
      const packageTours = await storage.getPackageTours(tenantId);
      
      // Get capacity data dynamically based on dates mentioned in message + next 7 days
      const today = new Date();
      const upcomingDates: Set<string> = new Set();
      
      // Always include next 7 days as baseline
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        upcomingDates.add(d.toISOString().split('T')[0]);
      }
      
      // Parse dates from message and add them (supports "15 şubat", "yarın", "hafta sonu", etc.)
      const messageDates = parseDatesFromMessage(Body);
      for (const dateStr of messageDates) {
        upcomingDates.add(dateStr);
      }
      
      // Also find holiday dates from message (supports "bayram", "tatil", "kurban bayrami", etc.)
      const holidayDates = await findHolidayDatesFromMessage(Body);
      for (const dateStr of holidayDates) {
        upcomingDates.add(dateStr);
      }
      
      const upcomingCapacity = await getCapacityWithVirtualSlots(Array.from(upcomingDates), tenantId);
      
      // Get custom bot prompt from settings
      const botPrompt = await storage.getSetting('botPrompt');
      
      // Get bot access settings
      const botAccessSetting = await storage.getSetting('botAccess');
      let botAccess: any = {
        enabled: true,
        activities: true,
        packageTours: true,
        capacity: true,
        faq: true,
        confirmation: true,
        transfer: true,
        extras: true
      };
      if (botAccessSetting) {
        try {
          botAccess = { ...botAccess, ...JSON.parse(botAccessSetting) };
        } catch {}
      }
      
      // Get custom bot rules from settings
      const botRules = await storage.getSetting('botRules');
      
      // Get general FAQ from settings
      const generalFaq = await storage.getSetting('generalFaq');
      
      // If bot is disabled, just log the message and don't respond
      if (botAccess.enabled === false) {
        console.log(`Bot disabled for tenant ${tenantId || 'unknown'}, message logged but not responded`);
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }
      
      // Get all reservations for this phone
      const allUserReservations = tenantId ? await storage.findAllReservationsByPhone(From, tenantId) : [];
      
      // Generate AI response with reservation context, capacity data, package tours, customer requests, and custom prompt
      const aiResponse = await generateAIResponse(history, { 
        activities: botAccess.activities ? activities : [], 
        packageTours: botAccess.packageTours ? packageTours : [],
        capacityData: botAccess.capacity ? upcomingCapacity : [],
        hasReservation: !!userReservation || allUserReservations.length > 0,
        reservation: userReservation,
        allReservations: allUserReservations,
        askForOrderNumber: !userReservation && allUserReservations.length === 0,
        customerRequests: customerRequestsForPhone,
        pendingRequests: pendingRequests,
        botAccess,
        botRules,
        generalFaq
      }, botPrompt || undefined);
      
      // Check if response indicates human intervention needed
      const needsHuman = aiResponse.toLowerCase().includes('yetkili') || 
                         aiResponse.toLowerCase().includes('müdahale') ||
                         aiResponse.toLowerCase().includes('iletiyorum');
      
      if (needsHuman) {
        // Create support request
        await storage.createSupportRequest({ phone: From, status: 'open' });
        await storage.markHumanIntervention(From, true);
      }
      
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

  // === Send WhatsApp Notification (Twilio) ===
  app.post("/api/send-whatsapp-notification", async (req, res) => {
    try {
      const { phone, customerName, activityName, date, time, activityId, packageTourId, trackingToken, reservationId } = req.body;
      
      if (!phone || !customerName || !activityName || !date) {
        return res.status(400).json({ error: "Eksik bilgi: telefon, isim, aktivite ve tarih gerekli" });
      }
      
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      
      if (!accountSid || !authToken || !twilioWhatsAppNumber) {
        await logError('whatsapp', 'Twilio yapılandırmasi eksik', { phone });
        return res.status(500).json({ error: "WhatsApp yapılandırmasi eksik" });
      }
      
      // Format phone number for WhatsApp (must start with country code)
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '90' + formattedPhone.substring(1); // Turkey country code
      }
      if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
        formattedPhone = '90' + formattedPhone;
      }
      
      // Fetch reservation data if reservationId provided
      let reservation: any = null;
      if (reservationId) {
        reservation = await storage.getReservation(reservationId);
      }
      
      // Fetch activity data
      let activity: any = null;
      if (activityId) {
        activity = await storage.getActivity(activityId);
      }
      
      // Fetch package tour data
      let packageTour: any = null;
      if (packageTourId) {
        packageTour = await storage.getPackageTour(packageTourId);
      }
      
      // Get confirmation template (priority: activity/package specific with toggle > global settings)
      let confirmationTemplate = "";
      if (packageTour?.confirmationMessage && packageTour?.useCustomConfirmation) {
        confirmationTemplate = packageTour.confirmationMessage;
      } else if (activity?.confirmationMessage && activity?.useCustomConfirmation) {
        confirmationTemplate = activity.confirmationMessage;
      }
      
      // If no custom template (or toggle is off), try to get global template from settings
      if (!confirmationTemplate) {
        try {
          const tenantId = req.session?.tenantId;
          if (tenantId) {
            const globalSetting = await storage.getSetting('manualConfirmation', tenantId);
            if (globalSetting) {
              const parsed = JSON.parse(globalSetting);
              if (parsed.template) {
                confirmationTemplate = parsed.template;
              }
            }
          }
        } catch (e) {
          // Ignore - use default template
        }
      }
      
      // Build tracking link if token is provided
      const trackingLink = trackingToken 
        ? `${req.protocol}://${req.get('host')}/takip/${trackingToken}`
        : '';
      
      // Helper function to calculate transfer pickup time with negative time guard
      const calculateTransferTime = (activityTime: string, transferZone: string | null, transferZones: string): string => {
        if (!activityTime || !transferZone) return '';
        try {
          const zones = JSON.parse(transferZones || '[]');
          const zoneData = zones.find((z: any) => 
            (typeof z === 'object' && z.zone === transferZone) || z === transferZone
          );
          if (!zoneData) return '';
          
          const minutesBefore = typeof zoneData === 'object' ? (zoneData.minutesBefore || 30) : 30;
          const [hours, minutes] = activityTime.split(':').map(Number);
          let totalMinutes = hours * 60 + minutes - minutesBefore;
          
          // Guard against negative times - wrap around to previous day display
          if (totalMinutes < 0) {
            totalMinutes = totalMinutes + 24 * 60; // Wrap to previous day
          }
          // Ensure time stays within valid range (00:00 - 23:59)
          totalMinutes = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
          
          const pickupHours = Math.floor(totalMinutes / 60);
          const pickupMins = totalMinutes % 60;
          return `${String(pickupHours).padStart(2, '0')}:${String(pickupMins).padStart(2, '0')}`;
        } catch {
          return '';
        }
      };
      
      // Helper function to format extras list with robust parsing
      const formatExtras = (selectedExtras: string | null): string => {
        if (!selectedExtras) return '';
        try {
          const extras = JSON.parse(selectedExtras);
          if (!Array.isArray(extras) || extras.length === 0) return '';
          return extras.map((e: any) => {
            // Handle different JSON structures
            const name = e.name || e.title || e.label || 'Ekstra';
            const price = e.priceTl || e.price || e.amount || 0;
            return `• ${name}${price ? `: ${price} TL` : ''}`;
          }).join('\n');
        } catch {
          // If JSON parsing fails, return the string as-is if it looks like a list
          if (typeof selectedExtras === 'string' && selectedExtras.trim()) {
            return selectedExtras;
          }
          return '';
        }
      };
      
      // Helper function to format what to bring list
      const formatWhatToBring = (whatToBring: string | null): string => {
        if (!whatToBring) return '';
        try {
          const items = JSON.parse(whatToBring);
          if (!Array.isArray(items) || items.length === 0) return '';
          return items.join(', ');
        } catch {
          return '';
        }
      };
      
      // Build placeholder values with robust fallbacks
      // Note: Currently no separate adult/child tracking - quantity is used for total people count
      const totalPrice = reservation?.priceTl || reservation?.orderTotal || 0;
      const paidAmount = reservation?.paidAmountTl || 0;
      const remainingAmount = Math.max(0, totalPrice - paidAmount); // Guard against negative values
      
      const placeholderValues: Record<string, string> = {
        isim: customerName || '',
        tarih: date || '',
        saat: time || '',
        aktivite: activityName || '',
        takip_linki: trackingLink,
        // Reservation data - quantity represents total people (no separate adult/child tracking)
        kisi: String(reservation?.quantity || quantity || 1),
        yetiskin: String(reservation?.quantity || quantity || 1), // Uses total quantity (no separate tracking)
        cocuk: '0', // Not tracked separately
        otel: reservation?.hotelName || hotelName || '',
        bolge: reservation?.transferZone || '',
        transfer_saat: calculateTransferTime(time, reservation?.transferZone, activity?.transferZones || '[]'),
        toplam: totalPrice > 0 ? `${totalPrice} TL` : '',
        odenen: paidAmount > 0 ? `${paidAmount} TL` : '',
        kalan: remainingAmount > 0 ? `${remainingAmount} TL` : '',
        siparis_no: reservation?.orderNumber || reservation?.id?.toString() || '',
        odeme_yontemi: reservation?.paymentStatus === 'paid' ? 'Ödendi' : (reservation?.paymentStatus === 'pending' ? 'Beklemede' : ''),
        ekstralar: formatExtras(reservation?.selectedExtras),
        // Activity data
        bulusma_noktasi: activity?.meetingPoint 
          ? (activity.meetingPointMapLink ? `${activity.meetingPoint}\n${activity.meetingPointMapLink}` : activity.meetingPoint)
          : '',
        varis_suresi: String(activity?.arrivalMinutesBefore || 30),
        getirin: formatWhatToBring(activity?.whatToBring),
        saglik_notlari: activity?.healthNotes || '',
      };
      
      // Apply all placeholder replacements
      const applyPlaceholders = (template: string): string => {
        let result = template;
        for (const [key, value] of Object.entries(placeholderValues)) {
          const regex = new RegExp(`\\{${key}\\}`, 'gi');
          result = result.replace(regex, value);
        }
        return result;
      };
      
      // Use template with placeholder replacement, or fallback to default
      let message: string;
      if (confirmationTemplate) {
        message = applyPlaceholders(confirmationTemplate);
      } else {
        message = `Merhaba ${customerName},

Rezervasyonunuz oluşturulmustur:
Aktivite: ${activityName}
Tarih: ${date}
${time ? `Saat: ${time}` : ''}

Rezervasyon detayları için:
${trackingLink}

Aktivite saati ve tarih değişikliği talepleriniz için, lütfen yukarıdaki takip linkine tıklayın. (Değişiklik talepleriniz müsaitliğe göre değerlendirilecektir.)

Sorularınız için bize bu numaradan yazabilirsiniz.`;
      }
      
      // Append confirmation note if provided
      if (reservation?.confirmationNote) {
        message += `\n\n${reservation.confirmationNote}`;
      }

      // Use Twilio API to send WhatsApp message
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
      formData.append('To', `whatsapp:+${formattedPhone}`);
      formData.append('Body', message);
      
      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Başıc ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        await logError('whatsapp', 'Twilio mesaj gönderme hatası', { phone, error: errorText });
        return res.status(500).json({ error: "WhatsApp mesajı gönderilemedi" });
      }
      
      const result = await twilioResponse.json();
      await logInfo('whatsapp', `WhatsApp bildirimi gönderildi: ${customerName} - ${activityName}`);
      
      // Also save the message to conversation history
      await storage.addMessage({
        phone: `whatsapp:+${formattedPhone}`,
        content: message,
        role: "assistant"
      });
      
      res.json({ success: true, messageSid: result.sid });
    } catch (error) {
      await logError('whatsapp', 'WhatsApp bildirim hatası', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "WhatsApp mesajı gönderilemedi" });
    }
  });

  // === Send Email Confirmation (Default for Smartur orders) ===
  app.post("/api/send-email-confirmation", async (req, res) => {
    try {
      const { email, phone, customerName, activityName, date, time, activityId, packageTourId, trackingToken, reservationId, quantity } = req.body;
      const tenantId = req.session?.tenantId;
      
      if (!email || !customerName || !activityName || !date) {
        return res.status(400).json({ error: "Eksik bilgi: e-posta, isim, aktivite ve tarih gerekli" });
      }
      
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      // Fetch reservation data if reservationId provided
      let reservation: any = null;
      if (reservationId) {
        reservation = await storage.getReservation(reservationId);
      }
      
      // Fetch activity data
      let activity: any = null;
      if (activityId) {
        activity = await storage.getActivity(activityId);
      }
      
      // Fetch package tour data
      let packageTour: any = null;
      if (packageTourId) {
        packageTour = await storage.getPackageTour(packageTourId);
      }
      
      // Get confirmation template (priority: activity/package specific with toggle > global settings)
      let confirmationTemplate = "";
      if (packageTour?.confirmationMessage && packageTour?.useCustomConfirmation) {
        confirmationTemplate = packageTour.confirmationMessage;
      } else if (activity?.confirmationMessage && activity?.useCustomConfirmation) {
        confirmationTemplate = activity.confirmationMessage;
      }
      
      // If no custom template (or toggle is off), try to get global template from settings
      if (!confirmationTemplate) {
        try {
          const globalSetting = await storage.getSetting('manualConfirmation', tenantId);
          if (globalSetting) {
            const parsed = JSON.parse(globalSetting);
            if (parsed.template) {
              confirmationTemplate = parsed.template;
            }
          }
        } catch (e) {
          // Ignore - use default template
        }
      }
      
      // Build tracking link if token is provided
      const trackingLink = trackingToken 
        ? `${req.protocol}://${req.get('host')}/takip/${trackingToken}`
        : '';
      
      // Helper function to calculate transfer pickup time
      const calculateTransferTime = (activityTime: string, transferZone: string | null, transferZones: string): string => {
        if (!activityTime || !transferZone) return '';
        try {
          const zones = JSON.parse(transferZones || '[]');
          const zoneData = zones.find((z: any) => 
            (typeof z === 'object' && z.zone === transferZone) || z === transferZone
          );
          if (!zoneData) return '';
          
          const minutesBefore = typeof zoneData === 'object' ? (zoneData.minutesBefore || 30) : 30;
          const [hours, minutes] = activityTime.split(':').map(Number);
          let totalMinutes = hours * 60 + minutes - minutesBefore;
          
          if (totalMinutes < 0) {
            totalMinutes = totalMinutes + 24 * 60;
          }
          totalMinutes = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
          
          const pickupHours = Math.floor(totalMinutes / 60);
          const pickupMins = totalMinutes % 60;
          return `${String(pickupHours).padStart(2, '0')}:${String(pickupMins).padStart(2, '0')}`;
        } catch {
          return '';
        }
      };
      
      // Helper function to format extras list
      const formatExtras = (selectedExtras: string | null): string => {
        if (!selectedExtras) return '';
        try {
          const extras = JSON.parse(selectedExtras);
          if (!Array.isArray(extras) || extras.length === 0) return '';
          return extras.map((e: any) => {
            const name = e.name || e.title || e.label || 'Ekstra';
            const price = e.priceTl || e.price || e.amount || 0;
            return `${name}${price ? `: ${price} TL` : ''}`;
          }).join(', ');
        } catch {
          return typeof selectedExtras === 'string' ? selectedExtras : '';
        }
      };
      
      // Helper function to format what to bring list
      const formatWhatToBring = (whatToBring: string | null): string => {
        if (!whatToBring) return '';
        try {
          const items = JSON.parse(whatToBring);
          if (!Array.isArray(items) || items.length === 0) return '';
          return items.join(', ');
        } catch {
          return '';
        }
      };
      
      // Build placeholder values
      const totalPrice = reservation?.priceTl || reservation?.orderTotal || 0;
      const paidAmount = reservation?.paidAmountTl || 0;
      const remainingAmount = Math.max(0, totalPrice - paidAmount);
      
      const placeholderValues: Record<string, string> = {
        isim: customerName || '',
        tarih: date || '',
        saat: time || '',
        aktivite: activityName || '',
        takip_linki: trackingLink,
        kisi: String(reservation?.quantity || quantity || 1),
        yetiskin: String(reservation?.quantity || quantity || 1),
        cocuk: '0',
        otel: reservation?.hotelName || '',
        bolge: reservation?.transferZone || '',
        transfer_saat: calculateTransferTime(time, reservation?.transferZone, activity?.transferZones || '[]'),
        toplam: totalPrice > 0 ? `${totalPrice} TL` : '',
        odenen: paidAmount > 0 ? `${paidAmount} TL` : '',
        kalan: remainingAmount > 0 ? `${remainingAmount} TL` : '',
        siparis_no: reservation?.orderNumber || reservation?.id?.toString() || '',
        odeme_yontemi: reservation?.paymentStatus === 'paid' ? 'Ödendi' : (reservation?.paymentStatus === 'pending' ? 'Beklemede' : ''),
        ekstralar: formatExtras(reservation?.selectedExtras),
        bulusma_noktasi: activity?.meetingPoint 
          ? (activity.meetingPointMapLink ? `${activity.meetingPoint} - ${activity.meetingPointMapLink}` : activity.meetingPoint)
          : '',
        varis_suresi: String(activity?.arrivalMinutesBefore || 30),
        getirin: formatWhatToBring(activity?.whatToBring),
        saglik_notlari: activity?.healthNotes || '',
      };
      
      // Apply all placeholder replacements
      const applyPlaceholders = (template: string): string => {
        let result = template;
        for (const [key, value] of Object.entries(placeholderValues)) {
          const regex = new RegExp(`\\{${key}\\}`, 'gi');
          result = result.replace(regex, value);
        }
        return result;
      };
      
      // Use template with placeholder replacement, or fallback to default
      let messageText: string;
      if (confirmationTemplate) {
        messageText = applyPlaceholders(confirmationTemplate);
      } else {
        messageText = `Merhaba ${customerName},

Rezervasyonunuz oluşturulmuştur:
Aktivite: ${activityName}
Tarih: ${date}
${time ? `Saat: ${time}` : ''}

Rezervasyon detayları için:
${trackingLink}

Sorularınız için bizimle iletişime geçebilirsiniz.`;
      }
      
      // Append confirmation note if provided
      if (reservation?.confirmationNote) {
        messageText += `\n\n${reservation.confirmationNote}`;
      }
      
      // Convert text to HTML (preserve line breaks)
      const messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Rezervasyon Onayı</h2>
          <div style="white-space: pre-line; line-height: 1.6;">
            ${messageText.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">Bu e-posta otomatik olarak gönderilmiştir.</p>
        </div>
      `;
      
      // Send email using tenant's SMTP config
      const emailResult = await sendTenantEmail(tenantId, {
        to: email,
        subject: `Rezervasyon Onayı - ${activityName} - ${date}`,
        html: messageHtml,
        text: messageText,
      });
      
      if (!emailResult.success) {
        await logError('email', 'E-posta gönderme hatası', { email, error: emailResult.error });
        return res.status(500).json({ error: emailResult.error || "E-posta gönderilemedi" });
      }
      
      await logInfo('email', `Sipariş onay e-postası gönderildi: ${customerName} - ${activityName} (${email})`);
      
      res.json({ 
        success: true, 
        usedTenantSmtp: emailResult.usedTenantSmtp,
        message: "E-posta ile onay mesajı gönderildi"
      });
    } catch (error) {
      await logError('email', 'E-posta onay hatası', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "E-posta gönderilemedi" });
    }
  });

  // === Send Custom WhatsApp Message (for customer requests) ===
  app.post("/api/send-whatsapp-custom-message", async (req, res) => {
    try {
      const { phone, message } = req.body;
      const tenantId = req.session?.tenantId;
      
      if (!phone || !message) {
        return res.status(400).json({ error: "Eksik bilgi: telefon ve mesaj gerekli" });
      }
      
      // Format phone number for WhatsApp (must start with country code)
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '').replace(/^whatsapp:/, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '90' + formattedPhone.substring(1); // Turkey country code
      }
      if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
        formattedPhone = '90' + formattedPhone;
      }
      
      // Get tenant integration settings to determine active provider
      let integration = null;
      if (tenantId) {
        integration = await storage.getTenantIntegration(tenantId);
      }
      
      const activeProvider = integration?.activeWhatsappProvider || 'twilio';
      
      // Send via Meta Cloud API
      if (activeProvider === 'meta' && integration?.metaConfigured && integration?.metaAccessTokenEncrypted) {
        const accessToken = decrypt(integration.metaAccessTokenEncrypted);
        const phoneNumberId = integration.metaPhoneNumberId;
        
        if (!accessToken || !phoneNumberId) {
          await logError('whatsapp', 'Meta Cloud API yapılandırması eksik', { phone });
          return res.status(500).json({ error: "Meta Cloud API yapılandırması eksik" });
        }
        
        const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        const metaResponse = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: message }
          })
        });
        
        if (!metaResponse.ok) {
          const errorText = await metaResponse.text();
          await logError('whatsapp', 'Meta Cloud API mesaj gönderme hatası', { phone, error: errorText });
          return res.status(500).json({ error: "WhatsApp mesajı gönderilemedi (Meta)" });
        }
        
        const result = await metaResponse.json();
        await logInfo('whatsapp', `Meta Cloud API ile mesaj gönderildi: ${formattedPhone}`);
        
        await storage.addMessage({
          phone: `whatsapp:+${formattedPhone}`,
          content: message,
          role: "assistant"
        });
        
        return res.json({ success: true, messageId: result.messages?.[0]?.id, provider: 'meta' });
      }
      
      // Send via Twilio (default)
      // First try tenant-specific config, then fall back to env vars
      let accountSid = process.env.TWILIO_ACCOUNT_SID;
      let authToken = process.env.TWILIO_AUTH_TOKEN;
      let twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      
      if (integration?.twilioConfigured && integration?.twilioAuthTokenEncrypted) {
        accountSid = integration.twilioAccountSid || accountSid;
        authToken = decrypt(integration.twilioAuthTokenEncrypted);
        twilioWhatsAppNumber = integration.twilioWhatsappNumber || twilioWhatsAppNumber;
      }
      
      if (!accountSid || !authToken || !twilioWhatsAppNumber) {
        await logError('whatsapp', 'Twilio yapılandırması eksik', { phone });
        return res.status(500).json({ error: "WhatsApp yapılandırması eksik" });
      }
      
      // Use Twilio API to send WhatsApp message
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
      formData.append('To', `whatsapp:+${formattedPhone}`);
      formData.append('Body', message);
      
      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        await logError('whatsapp', 'Twilio mesaj gönderme hatası', { phone, error: errorText });
        return res.status(500).json({ error: "WhatsApp mesajı gönderilemedi (Twilio)" });
      }
      
      const result = await twilioResponse.json();
      await logInfo('whatsapp', `Twilio ile mesaj gönderildi: ${formattedPhone}`);
      
      await storage.addMessage({
        phone: `whatsapp:+${formattedPhone}`,
        content: message,
        role: "assistant"
      });
      
      res.json({ success: true, messageSid: result.sid, provider: 'twilio' });
    } catch (error) {
      await logError('whatsapp', 'WhatsApp özel mesaj hatası', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "WhatsApp mesajı gönderilemedi" });
    }
  });

  // === Settings ===
  // Public settings endpoints (no auth required for sidebar/branding)
  const publicSettingsKeys = ['sidebarLogo', 'brandSettings', 'botAccess'];
  
  app.get("/api/settings/sidebarLogo", async (req, res) => {
    try {
      const value = await storage.getSetting('sidebarLogo');
      res.json({ key: 'sidebarLogo', value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });
  
  app.get("/api/settings/brandSettings", async (req, res) => {
    try {
      const value = await storage.getSetting('brandSettings');
      res.json({ key: 'brandSettings', value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });
  
  app.get("/api/settings/botAccess", async (req, res) => {
    try {
      const value = await storage.getSetting('botAccess');
      res.json({ key: 'botAccess', value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });
  
  // Popup Appearance settings (tenant-aware)
  app.get("/api/settings/popupAppearance", requirePermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const value = await storage.getSetting('popupAppearance', tenantId);
      res.json({ key: 'popupAppearance', value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });
  
  app.post("/api/settings/popupAppearance", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const { value } = req.body;
      await storage.setSetting('popupAppearance', value, tenantId);
      res.json({ success: true, message: "Popup görünüm ayarları kaydedildi" });
    } catch (err) {
      res.status(400).json({ error: "Ayar kaydedilemedi" });
    }
  });
  
  // Tenant-specific notification email setting
  app.get("/api/settings/tenantNotificationEmail", requirePermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const value = await storage.getSetting(`tenantNotificationEmail_${tenantId}`);
      res.json({ key: 'tenantNotificationEmail', value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });
  
  app.post("/api/settings/tenantNotificationEmail", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const { value } = req.body;
      
      // Simple email validation
      if (value && value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return res.status(400).json({ error: "Geçerli bir e-posta adresi girin" });
        }
      }
      
      await storage.setSetting(`tenantNotificationEmail_${tenantId}`, value?.trim() || '');
      res.json({ success: true, message: "Bildirim e-postası kaydedildi" });
    } catch (err) {
      res.status(400).json({ error: "Ayar kaydedilemedi" });
    }
  });
  
  // Tenant Settings - GET (for current user's tenant)
  app.get("/api/tenant-settings", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const [tenant] = await db
        .select({
          websiteShowFeaturedActivities: tenants.websiteShowFeaturedActivities,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      res.json(tenant || { websiteShowFeaturedActivities: true });
    } catch (err) {
      console.error("Get tenant settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Tenant Settings - PATCH (for current user's tenant)
  app.patch("/api/tenant-settings", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const { websiteShowFeaturedActivities } = req.body;

      await db
        .update(tenants)
        .set({ websiteShowFeaturedActivities })
        .where(eq(tenants.id, tenantId));

      res.json({ success: true, websiteShowFeaturedActivities });
    } catch (err) {
      console.error("Update tenant settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Website Pages Content - GET
  app.get("/api/settings/website-pages", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

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

      res.json(tenant || {});
    } catch (err) {
      console.error("Get website pages error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Website Pages Content - PUT
  app.put("/api/settings/website-pages", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const {
        websiteContactPageTitle,
        websiteContactPageContent,
        websiteContactEmail,
        websiteContactPhone,
        websiteContactAddress,
        websiteAboutPageTitle,
        websiteAboutPageContent,
        websiteCancellationPageTitle,
        websiteCancellationPageContent,
        websitePrivacyPageTitle,
        websitePrivacyPageContent,
        websiteTermsPageTitle,
        websiteTermsPageContent,
        websiteFaqPageTitle,
        websiteFaqPageContent,
      } = req.body;

      await db
        .update(tenants)
        .set({
          websiteContactPageTitle,
          websiteContactPageContent,
          websiteContactEmail,
          websiteContactPhone,
          websiteContactAddress,
          websiteAboutPageTitle,
          websiteAboutPageContent,
          websiteCancellationPageTitle,
          websiteCancellationPageContent,
          websitePrivacyPageTitle,
          websitePrivacyPageContent,
          websiteTermsPageTitle,
          websiteTermsPageContent,
          websiteFaqPageTitle,
          websiteFaqPageContent,
        })
        .where(eq(tenants.id, tenantId));

      res.json({ success: true, message: "Sayfa içerikleri kaydedildi" });
    } catch (err) {
      console.error("Save website pages error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // === PAYMENT SETTINGS ENDPOINTS ===
  // GET payment settings
  app.get("/api/settings/payment", requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const [tenant] = await db
        .select({
          provider: tenants.websitePaymentProvider,
          testMode: tenants.websitePaymentTestMode,
          hasApiKey: tenants.websitePaymentApiKey,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }

      res.json({
        provider: tenant.provider || "",
        configured: !!(tenant.provider && tenant.hasApiKey),
        testMode: tenant.testMode !== false
      });
    } catch (err) {
      console.error("Get payment settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // POST payment settings
  app.post("/api/settings/payment", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const { provider, apiKey, secretKey, testMode } = req.body;

      if (!provider || !apiKey || !secretKey) {
        return res.status(400).json({ error: "Tüm alanlar gereklidir" });
      }

      // Encrypt the keys before storing
      const { encrypt } = await import("./encryption");
      const encryptedApiKey = encrypt(apiKey);
      const encryptedSecretKey = encrypt(secretKey);

      await db
        .update(tenants)
        .set({
          websitePaymentProvider: provider,
          websitePaymentApiKey: encryptedApiKey,
          websitePaymentSecretKey: encryptedSecretKey,
          websitePaymentTestMode: testMode !== false
        })
        .where(eq(tenants.id, tenantId));

      // Clear provider cache
      const { PaymentService } = await import("./paymentService");
      PaymentService.clearProviderCache(tenantId);

      res.json({ success: true, message: "Ödeme ayarları kaydedildi" });
    } catch (err) {
      console.error("Save payment settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // DELETE payment settings
  app.delete("/api/settings/payment", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      await db
        .update(tenants)
        .set({
          websitePaymentProvider: null,
          websitePaymentApiKey: null,
          websitePaymentSecretKey: null,
          websitePaymentTestMode: true
        })
        .where(eq(tenants.id, tenantId));

      // Clear provider cache
      const { PaymentService } = await import("./paymentService");
      PaymentService.clearProviderCache(tenantId);

      res.json({ success: true, message: "Ödeme entegrasyonu kaldırıldı" });
    } catch (err) {
      console.error("Delete payment settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // === COMPREHENSIVE WEBSITE SETTINGS ENDPOINT ===
  // GET all website settings for the tenant
  app.get("/api/website-settings", requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const [tenant] = await db
        .select({
          websiteEnabled: tenants.websiteEnabled,
          websiteDomain: tenants.websiteDomain,
          websiteName: tenants.name,
          websiteLogo: tenants.logoUrl,
          websiteFavicon: tenants.websiteFaviconUrl,
          websiteHeroImage: tenants.websiteHeroImageUrl,
          websiteHeroTitle: tenants.websiteTitle,
          websiteHeroSubtitle: tenants.websiteDescription,
          websitePrimaryColor: tenants.primaryColor,
          websiteAccentColor: tenants.accentColor,
          websiteMetaDescription: tenants.websiteDescription,
          websiteMetaKeywords: tenants.websiteAboutText,
          websiteGoogleAnalyticsId: tenants.websiteGoogleAnalyticsId,
          websiteGoogleAdsId: tenants.websiteGoogleAdsId,
          websiteGoogleSiteVerification: tenants.websiteGoogleSiteVerification,
          websiteWhatsappNumber: tenants.websiteWhatsappNumber,
          websiteSocialLinks: tenants.websiteSocialLinks,
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
          websiteFooterText: tenants.websiteFooterText,
          websiteDisplayName: tenants.websiteDisplayName,
          websiteFooterCompanyDescription: tenants.websiteFooterCompanyDescription,
          websiteFooterPaymentImageUrl: tenants.websiteFooterPaymentImageUrl,
          websiteFooterCopyrightText: tenants.websiteFooterCopyrightText,
          websiteFooterBackgroundColor: tenants.websiteFooterBackgroundColor,
          websiteFooterTextColor: tenants.websiteFooterTextColor,
          websiteHeaderBackgroundColor: tenants.websiteHeaderBackgroundColor,
          websiteHeaderTextColor: tenants.websiteHeaderTextColor,
          websiteHeroStats: tenants.websiteHeroStats,
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
          // Banner Order
          websiteBannerOrder: tenants.websiteBannerOrder,
          // Slogan Banner
          websiteSloganBannerEnabled: tenants.websiteSloganBannerEnabled,
          websiteSloganBannerTitle: tenants.websiteSloganBannerTitle,
          websiteSloganBannerTitleEn: tenants.websiteSloganBannerTitleEn,
          websiteSloganBannerDescription: tenants.websiteSloganBannerDescription,
          websiteSloganBannerDescriptionEn: tenants.websiteSloganBannerDescriptionEn,
          websiteSloganBannerColor: tenants.websiteSloganBannerColor,
          // Promo Banner
          websitePromoBannerEnabled: tenants.websitePromoBannerEnabled,
          websitePromoBannerTitle: tenants.websitePromoBannerTitle,
          websitePromoBannerTitleEn: tenants.websitePromoBannerTitleEn,
          websitePromoBannerDescription: tenants.websitePromoBannerDescription,
          websitePromoBannerDescriptionEn: tenants.websitePromoBannerDescriptionEn,
          websitePromoBannerButtonText: tenants.websitePromoBannerButtonText,
          websitePromoBannerButtonTextEn: tenants.websitePromoBannerButtonTextEn,
          websitePromoBannerButtonUrl: tenants.websitePromoBannerButtonUrl,
          websitePromoBannerImage: tenants.websitePromoBannerImage,
          websitePromoBannerPriceText: tenants.websitePromoBannerPriceText,
          websitePromoBannerPriceTextEn: tenants.websitePromoBannerPriceTextEn,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      res.json(tenant || {});
    } catch (err) {
      console.error("Get website settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // PUT update website settings
  app.put("/api/website-settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }

      const {
        websiteEnabled,
        websiteDomain,
        websiteName,
        websiteLogo,
        websiteFavicon,
        websiteHeroImage,
        websiteHeroTitle,
        websiteHeroSubtitle,
        websitePrimaryColor,
        websiteAccentColor,
        websiteMetaDescription,
        websiteGoogleAnalyticsId,
        websiteWhatsappNumber,
        websiteSocialLinks,
        websiteLanguages,
        websiteContactPageTitle,
        websiteContactPageContent,
        websiteContactEmail,
        websiteContactPhone,
        websiteContactAddress,
        websiteAboutPageTitle,
        websiteAboutPageContent,
        websiteCancellationPageTitle,
        websiteCancellationPageContent,
        websitePrivacyPageTitle,
        websitePrivacyPageContent,
        websiteTermsPageTitle,
        websiteTermsPageContent,
        websiteFaqPageTitle,
        websiteFaqPageContent,
        websiteFooterText,
        websiteDisplayName,
        websiteFooterCompanyDescription,
        websiteFooterPaymentImageUrl,
        websiteFooterCopyrightText,
        websiteFooterBackgroundColor,
        websiteFooterTextColor,
        websiteHeaderBackgroundColor,
        websiteHeaderTextColor,
        websiteHeroStats,
        websiteReviewCards,
        websiteReviewCardsEnabled,
        websiteReviewCardsTitle,
        websiteReviewCardsTitleEn,
        websiteHeroSliderEnabled,
        websiteHeroSliderPosition,
        websiteHeroSliderTitle,
        websiteHeroSliderTitleEn,
        websiteHeroSlides,
        websitePromoBoxes,
        // Banner Order
        websiteBannerOrder,
        // Slogan Banner
        websiteSloganBannerEnabled,
        websiteSloganBannerTitle,
        websiteSloganBannerTitleEn,
        websiteSloganBannerDescription,
        websiteSloganBannerDescriptionEn,
        websiteSloganBannerColor,
        // Promo Banner
        websitePromoBannerEnabled,
        websitePromoBannerTitle,
        websitePromoBannerTitleEn,
        websitePromoBannerDescription,
        websitePromoBannerDescriptionEn,
        websitePromoBannerButtonText,
        websitePromoBannerButtonTextEn,
        websitePromoBannerButtonUrl,
        websitePromoBannerImage,
        websitePromoBannerPriceText,
        websitePromoBannerPriceTextEn,
      } = req.body;

      const updateData: Record<string, any> = {};

      if (websiteEnabled !== undefined) updateData.websiteEnabled = websiteEnabled;
      if (websiteDomain !== undefined) updateData.websiteDomain = websiteDomain;
      if (websiteName !== undefined) updateData.name = websiteName;
      if (websiteLogo !== undefined) updateData.logoUrl = websiteLogo;
      if (websiteFavicon !== undefined) updateData.websiteFaviconUrl = websiteFavicon;
      if (websiteHeroImage !== undefined) updateData.websiteHeroImageUrl = websiteHeroImage;
      if (websiteHeroTitle !== undefined) updateData.websiteTitle = websiteHeroTitle;
      if (websiteHeroSubtitle !== undefined) updateData.websiteDescription = websiteHeroSubtitle;
      if (websitePrimaryColor !== undefined) updateData.primaryColor = websitePrimaryColor;
      if (websiteAccentColor !== undefined) updateData.accentColor = websiteAccentColor;
      if (websiteMetaDescription !== undefined) updateData.websiteDescription = websiteMetaDescription;
      if (websiteGoogleAnalyticsId !== undefined) updateData.websiteGoogleAnalyticsId = websiteGoogleAnalyticsId;
      if (websiteWhatsappNumber !== undefined) updateData.websiteWhatsappNumber = websiteWhatsappNumber;
      if (websiteSocialLinks !== undefined) updateData.websiteSocialLinks = websiteSocialLinks;
      if (websiteLanguages !== undefined) updateData.websiteLanguages = websiteLanguages;
      if (websiteContactPageTitle !== undefined) updateData.websiteContactPageTitle = websiteContactPageTitle;
      if (websiteContactPageContent !== undefined) updateData.websiteContactPageContent = websiteContactPageContent;
      if (websiteContactEmail !== undefined) updateData.websiteContactEmail = websiteContactEmail;
      if (websiteContactPhone !== undefined) updateData.websiteContactPhone = websiteContactPhone;
      if (websiteContactAddress !== undefined) updateData.websiteContactAddress = websiteContactAddress;
      if (websiteAboutPageTitle !== undefined) updateData.websiteAboutPageTitle = websiteAboutPageTitle;
      if (websiteAboutPageContent !== undefined) updateData.websiteAboutPageContent = websiteAboutPageContent;
      if (websiteCancellationPageTitle !== undefined) updateData.websiteCancellationPageTitle = websiteCancellationPageTitle;
      if (websiteCancellationPageContent !== undefined) updateData.websiteCancellationPageContent = websiteCancellationPageContent;
      if (websitePrivacyPageTitle !== undefined) updateData.websitePrivacyPageTitle = websitePrivacyPageTitle;
      if (websitePrivacyPageContent !== undefined) updateData.websitePrivacyPageContent = websitePrivacyPageContent;
      if (websiteTermsPageTitle !== undefined) updateData.websiteTermsPageTitle = websiteTermsPageTitle;
      if (websiteTermsPageContent !== undefined) updateData.websiteTermsPageContent = websiteTermsPageContent;
      if (websiteFaqPageTitle !== undefined) updateData.websiteFaqPageTitle = websiteFaqPageTitle;
      if (websiteFaqPageContent !== undefined) updateData.websiteFaqPageContent = websiteFaqPageContent;
      if (websiteFooterText !== undefined) updateData.websiteFooterText = websiteFooterText;
      if (websiteDisplayName !== undefined) updateData.websiteDisplayName = websiteDisplayName;
      if (websiteFooterCompanyDescription !== undefined) updateData.websiteFooterCompanyDescription = websiteFooterCompanyDescription;
      if (websiteFooterPaymentImageUrl !== undefined) updateData.websiteFooterPaymentImageUrl = websiteFooterPaymentImageUrl;
      if (websiteFooterCopyrightText !== undefined) updateData.websiteFooterCopyrightText = websiteFooterCopyrightText;
      if (websiteFooterBackgroundColor !== undefined) updateData.websiteFooterBackgroundColor = websiteFooterBackgroundColor;
      if (websiteFooterTextColor !== undefined) updateData.websiteFooterTextColor = websiteFooterTextColor;
      if (websiteHeaderBackgroundColor !== undefined) updateData.websiteHeaderBackgroundColor = websiteHeaderBackgroundColor;
      if (websiteHeaderTextColor !== undefined) updateData.websiteHeaderTextColor = websiteHeaderTextColor;
      if (websiteHeroStats !== undefined) updateData.websiteHeroStats = websiteHeroStats;
      if (websiteReviewCards !== undefined) updateData.websiteReviewCards = websiteReviewCards;
      if (websiteReviewCardsEnabled !== undefined) updateData.websiteReviewCardsEnabled = websiteReviewCardsEnabled;
      if (websiteReviewCardsTitle !== undefined) updateData.websiteReviewCardsTitle = websiteReviewCardsTitle;
      if (websiteReviewCardsTitleEn !== undefined) updateData.websiteReviewCardsTitleEn = websiteReviewCardsTitleEn;
      if (websiteHeroSliderEnabled !== undefined) updateData.websiteHeroSliderEnabled = websiteHeroSliderEnabled;
      if (websiteHeroSliderPosition !== undefined) updateData.websiteHeroSliderPosition = websiteHeroSliderPosition;
      if (websiteHeroSliderTitle !== undefined) updateData.websiteHeroSliderTitle = websiteHeroSliderTitle;
      if (websiteHeroSliderTitleEn !== undefined) updateData.websiteHeroSliderTitleEn = websiteHeroSliderTitleEn;
      if (websiteHeroSlides !== undefined) updateData.websiteHeroSlides = websiteHeroSlides;
      if (websitePromoBoxes !== undefined) updateData.websitePromoBoxes = websitePromoBoxes;
      // Banner Order
      if (websiteBannerOrder !== undefined) updateData.websiteBannerOrder = websiteBannerOrder;
      // Slogan Banner
      if (websiteSloganBannerEnabled !== undefined) updateData.websiteSloganBannerEnabled = websiteSloganBannerEnabled;
      if (websiteSloganBannerTitle !== undefined) updateData.websiteSloganBannerTitle = websiteSloganBannerTitle;
      if (websiteSloganBannerTitleEn !== undefined) updateData.websiteSloganBannerTitleEn = websiteSloganBannerTitleEn;
      if (websiteSloganBannerDescription !== undefined) updateData.websiteSloganBannerDescription = websiteSloganBannerDescription;
      if (websiteSloganBannerDescriptionEn !== undefined) updateData.websiteSloganBannerDescriptionEn = websiteSloganBannerDescriptionEn;
      if (websiteSloganBannerColor !== undefined) updateData.websiteSloganBannerColor = websiteSloganBannerColor;
      // Promo Banner
      if (websitePromoBannerEnabled !== undefined) updateData.websitePromoBannerEnabled = websitePromoBannerEnabled;
      if (websitePromoBannerTitle !== undefined) updateData.websitePromoBannerTitle = websitePromoBannerTitle;
      if (websitePromoBannerTitleEn !== undefined) updateData.websitePromoBannerTitleEn = websitePromoBannerTitleEn;
      if (websitePromoBannerDescription !== undefined) updateData.websitePromoBannerDescription = websitePromoBannerDescription;
      if (websitePromoBannerDescriptionEn !== undefined) updateData.websitePromoBannerDescriptionEn = websitePromoBannerDescriptionEn;
      if (websitePromoBannerButtonText !== undefined) updateData.websitePromoBannerButtonText = websitePromoBannerButtonText;
      if (websitePromoBannerButtonTextEn !== undefined) updateData.websitePromoBannerButtonTextEn = websitePromoBannerButtonTextEn;
      if (websitePromoBannerButtonUrl !== undefined) updateData.websitePromoBannerButtonUrl = websitePromoBannerButtonUrl;
      if (websitePromoBannerImage !== undefined) updateData.websitePromoBannerImage = websitePromoBannerImage;
      if (websitePromoBannerPriceText !== undefined) updateData.websitePromoBannerPriceText = websitePromoBannerPriceText;
      if (websitePromoBannerPriceTextEn !== undefined) updateData.websitePromoBannerPriceTextEn = websitePromoBannerPriceTextEn;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(tenants)
          .set(updateData)
          .where(eq(tenants.id, tenantId));
      }

      res.json({ success: true, message: "Web sitesi ayarları kaydedildi" });
    } catch (err) {
      console.error("Save website settings error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // === HOMEPAGE SECTIONS API ===
  // GET all homepage sections for tenant
  app.get("/api/homepage-sections", requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      
      const sections = await db
        .select()
        .from(homepageSections)
        .where(eq(homepageSections.tenantId, tenantId))
        .orderBy(homepageSections.displayOrder);
      
      res.json(sections);
    } catch (err) {
      console.error("Get homepage sections error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // POST create new homepage section
  app.post("/api/homepage-sections", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      
      const { title, titleEn, subtitle, subtitleEn, sectionType, displayOrder, isActive, activityIds, maxItems } = req.body;
      
      // Basic validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: "Başlık zorunludur" });
      }
      
      const validSectionTypes = ['activities', 'package_tours', 'destinations'];
      const safeSectionType = validSectionTypes.includes(sectionType) ? sectionType : 'activities';
      const safeDisplayOrder = typeof displayOrder === 'number' && displayOrder >= 0 ? displayOrder : 0;
      const safeMaxItems = typeof maxItems === 'number' && maxItems > 0 && maxItems <= 12 ? maxItems : 6;
      const safeActivityIds = Array.isArray(activityIds) ? activityIds.filter(id => typeof id === 'number') : [];
      
      const [section] = await db
        .insert(homepageSections)
        .values({
          tenantId,
          title: title.trim(),
          titleEn: titleEn?.trim() || null,
          subtitle: subtitle?.trim() || null,
          subtitleEn: subtitleEn?.trim() || null,
          sectionType: safeSectionType,
          displayOrder: safeDisplayOrder,
          isActive: isActive !== false,
          activityIds: JSON.stringify(safeActivityIds),
          maxItems: safeMaxItems,
        })
        .returning();
      
      res.json(section);
    } catch (err) {
      console.error("Create homepage section error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // PUT update homepage section
  app.put("/api/homepage-sections/:id", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      
      const sectionId = parseInt(req.params.id);
      if (isNaN(sectionId)) {
        return res.status(400).json({ error: "Geçersiz bölüm ID" });
      }
      
      const { title, titleEn, subtitle, subtitleEn, sectionType, displayOrder, isActive, activityIds, maxItems } = req.body;
      
      const validSectionTypes = ['activities', 'package_tours', 'destinations'];
      
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (title !== undefined && typeof title === 'string' && title.trim().length > 0) {
        updateData.title = title.trim();
      }
      if (titleEn !== undefined) updateData.titleEn = typeof titleEn === 'string' ? titleEn.trim() || null : null;
      if (subtitle !== undefined) updateData.subtitle = typeof subtitle === 'string' ? subtitle.trim() || null : null;
      if (subtitleEn !== undefined) updateData.subtitleEn = typeof subtitleEn === 'string' ? subtitleEn.trim() || null : null;
      if (sectionType !== undefined && validSectionTypes.includes(sectionType)) {
        updateData.sectionType = sectionType;
      }
      if (displayOrder !== undefined && typeof displayOrder === 'number' && displayOrder >= 0) {
        updateData.displayOrder = displayOrder;
      }
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (activityIds !== undefined && Array.isArray(activityIds)) {
        updateData.activityIds = JSON.stringify(activityIds.filter(id => typeof id === 'number'));
      }
      if (maxItems !== undefined && typeof maxItems === 'number' && maxItems > 0 && maxItems <= 12) {
        updateData.maxItems = maxItems;
      }
      
      const [section] = await db
        .update(homepageSections)
        .set(updateData)
        .where(and(eq(homepageSections.id, sectionId), eq(homepageSections.tenantId, tenantId)))
        .returning();
      
      if (!section) {
        return res.status(404).json({ error: "Bölüm bulunamadı" });
      }
      
      res.json(section);
    } catch (err) {
      console.error("Update homepage section error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // DELETE homepage section
  app.delete("/api/homepage-sections/:id", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      
      const sectionId = parseInt(req.params.id);
      
      await db
        .delete(homepageSections)
        .where(and(eq(homepageSections.id, sectionId), eq(homepageSections.tenantId, tenantId)));
      
      res.json({ success: true });
    } catch (err) {
      console.error("Delete homepage section error:", err);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  });

  // Protected settings endpoint (requires auth) - tenant-aware
  app.get("/api/settings/:key", requirePermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const value = await storage.getSetting(req.params.key, tenantId);
      res.json({ key: req.params.key, value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });

  app.post("/api/settings/:key", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      let { value } = req.body;
      const tenantId = req.session?.tenantId;
      const authHeader = req.headers.authorization;
      
      // Template settings that require settings.templates.manage permission (only for tenant_owner)
      const templateSettings = [
        'botRules', 'botPrompt', 'developerEmail',
        'manualConfirmation', 'wooNotification', 
        'reminderMessage', 'bulkMessageTemplates', 
        'autoResponseKeywords'
      ];
      if (templateSettings.includes(req.params.key)) {
        const userPermissions = req.session?.permissions || [];
        if (!userPermissions.includes(PERMISSIONS.SETTINGS_TEMPLATES_MANAGE)) {
          return res.status(403).json({ error: "Bu ayarı sadece acenta sahibi değiştirebilir" });
        }
      }
      
      // Special handling for adminCredentials - hash the password
      if (req.params.key === 'adminCredentials' && value) {
        try {
          const creds = JSON.parse(value);
          if (creds.password && creds.password.trim()) {
            // Hash the password before storing
            creds.passwordHash = hashPassword(creds.password);
            delete creds.password; // Don't store plain password
            value = JSON.stringify(creds);
          } else {
            // If no new password provided, keep existing hash
            const existingSetting = await storage.getSetting('adminCredentials', tenantId);
            if (existingSetting) {
              const existingCreds = JSON.parse(existingSetting);
              creds.passwordHash = existingCreds.passwordHash;
              delete creds.password;
              value = JSON.stringify(creds);
            }
          }
        } catch {}
      }
      
      const result = await storage.setSetting(req.params.key, value, tenantId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: "Ayar kaydedilemedi" });
    }
  });

  // Admin login verification
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Kullanıcı adı ve şifre gerekli" });
      }
      
      const setting = await storage.getSetting('adminCredentials');
      if (!setting) {
        return res.status(401).json({ success: false, error: "Admin kimlik bilgileri tanımlanmamış" });
      }
      
      try {
        const creds = JSON.parse(setting);
        if (creds.username === username && creds.passwordHash && verifyPassword(password, creds.passwordHash)) {
          // Generate a simple session token
          const token = crypto.randomBytes(32).toString('hex');
          // Store token in settings temporarily (in production, use proper session management)
          await storage.setSetting('adminSessionToken', token);
          return res.json({ success: true, token });
        }
      } catch {}
      
      return res.status(401).json({ success: false, error: "Geçersiz kullanıcı adı veya şifre" });
    } catch (err) {
      res.status(500).json({ success: false, error: "Giriş yapılamadı" });
    }
  });

  // Verify admin token
  app.post("/api/admin/verify", async (req, res) => {
    try {
      const { token } = req.body;
      const storedToken = await storage.getSetting('adminSessionToken');
      
      if (storedToken && storedToken === token) {
        return res.json({ valid: true });
      }
      
      return res.json({ valid: false });
    } catch (err) {
      res.status(500).json({ valid: false });
    }
  });

  // Bot Rules login - uses fixed password (not changeable from panel)
  // Password is hashed for security - default: 'Netim1905'
  const BOT_RULES_PASSWORD_HASH = hashPassword(process.env.BOT_RULES_PASSWORD || 'Netim1905');
  
  app.post("/api/bot-rules/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!password) {
        return res.status(400).json({ success: false, error: "Şifre gerekli" });
      }
      
      // Check if email is provided - use platform_admins table
      if (email) {
        const platformAdmin = await storage.getPlatformAdminByEmail(email);
        if (platformAdmin && platformAdmin.isActive && verifyPassword(password, platformAdmin.passwordHash)) {
          // Create session for platform admin
          req.session.userId = platformAdmin.id;
          req.session.platformAdminId = platformAdmin.id;
          req.session.isPlatformAdmin = true;
          
          // Generate token with expiration (24 hours)
          const token = crypto.randomBytes(32).toString('hex');
          const tokenData = JSON.stringify({
            token,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          });
          await storage.setSetting('botRulesSessionToken', tokenData);
          
          // Save session expliçitly
          return req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              return res.status(500).json({ success: false, error: "Oturum oluşturulamadı" });
            }
            return res.json({ success: true, token, isPlatformAdmin: true });
          });
        }
        return res.status(401).json({ success: false, error: "Geçersiz e-posta veya şifre" });
      }
      
      // Legacy: Verify against fixed password if no email provided
      if (verifyPassword(password, BOT_RULES_PASSWORD_HASH)) {
        // Generate a session token with expiration (24 hours)
        const token = crypto.randomBytes(32).toString('hex');
        const tokenData = JSON.stringify({
          token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
        await storage.setSetting('botRulesSessionToken', tokenData);
        return res.json({ success: true, token });
      }
      
      return res.status(401).json({ success: false, error: "Geçersiz şifre" });
    } catch (err) {
      console.error('Bot rules login error:', err);
      res.status(500).json({ success: false, error: "Giriş yapılamadı" });
    }
  });

  // Verify bot rules token (legacy, kept for backward compatibility)
  app.post("/api/bot-rules/verify", async (req, res) => {
    try {
      const { token } = req.body;
      const storedTokenData = await storage.getSetting('botRulesSessionToken');
      
      if (storedTokenData) {
        try {
          const parsed = JSON.parse(storedTokenData);
          // Check if token matches and is not expired
          if (parsed.token === token && parsed.expiresAt > Date.now()) {
            return res.json({ valid: true });
          }
        } catch {
          // Legacy format: plain token string - invalidate it
        }
      }
      
      return res.json({ valid: false });
    } catch (err) {
      res.status(500).json({ valid: false });
    }
  });

  // Platform admin session check (session-based, no localStorage)
  app.get("/api/platform-admin/session", (req, res) => {
    if (req.session?.isPlatformAdmin && req.session?.platformAdminId) {
      return res.json({ authenticated: true, adminId: req.session.platformAdminId });
    }
    return res.json({ authenticated: false });
  });

  // Platform admin logout
  app.post("/api/platform-admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Çıkış yapılamadı" });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  });

  // === SMARTUR SETTINGS API (Platform-wide settings managed by Super Admin) ===
  
  // Get all smartur settings
  app.get("/api/smartur-settings", async (req, res) => {
    try {
      // Check platform admin auth
      if (!req.session?.isPlatformAdmin) {
        return res.status(401).json({ error: "Yetkisiz erişim" });
      }

      const settings = await db.select().from(smarturSettings);
      
      // Convert to key-value object
      const settingsObj: Record<string, string | null> = {};
      for (const setting of settings) {
        settingsObj[setting.settingKey] = setting.settingValue;
      }
      
      res.json(settingsObj);
    } catch (error) {
      console.error("Smartur settings fetch error:", error);
      res.status(500).json({ error: "Ayarlar alınamadı" });
    }
  });

  // Update smartur settings
  app.put("/api/smartur-settings", async (req, res) => {
    try {
      // Check platform admin auth
      if (!req.session?.isPlatformAdmin) {
        return res.status(401).json({ error: "Yetkisiz erişim" });
      }

      const { footer_logo_url, footer_link_url, footer_enabled } = req.body;

      // Upsert each setting
      const settingsToUpdate = [
        { key: "footer_logo_url", value: footer_logo_url, desc: "Tüm web sitelerin footer alanında gösterilecek Smartur logosu URL" },
        { key: "footer_link_url", value: footer_link_url, desc: "Smartur logosuna tıklandığında yönlendirilecek web sitesi URL" },
        { key: "footer_enabled", value: footer_enabled?.toString() || "true", desc: "Smartur footer logosu gösterilsin mi" },
      ];

      for (const setting of settingsToUpdate) {
        if (setting.value !== undefined) {
          await db
            .insert(smarturSettings)
            .values({
              settingKey: setting.key,
              settingValue: setting.value,
              settingDescription: setting.desc,
            })
            .onConflictDoUpdate({
              target: smarturSettings.settingKey,
              set: {
                settingValue: setting.value,
                updatedAt: new Date(),
              },
            });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Smartur settings update error:", error);
      res.status(500).json({ error: "Ayarlar güncellenemedi" });
    }
  });

  // === Tenant Integrations API (Multi-tenant: Twilio, WooCommerce, Gmail) ===
  
  // Get all integrations for current tenant
  app.get("/api/tenant-integrations", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const integration = await storage.getTenantIntegration(tenantId);
      const tenant = await storage.getTenant(tenantId);
      
      // Determine active provider - default to the configured one if only one is configured
      let activeProvider = integration?.activeWhatsappProvider || null;
      const twilioConfigured = integration?.twilioConfigured || false;
      const metaConfigured = integration?.metaConfigured || false;
      
      if (!activeProvider) {
        if (twilioConfigured && !metaConfigured) {
          activeProvider = 'twilio';
        } else if (metaConfigured && !twilioConfigured) {
          activeProvider = 'meta';
        } else if (twilioConfigured && metaConfigured) {
          activeProvider = 'twilio'; // Default to Twilio if both are configured
        }
      }
      
      res.json({
        // Twilio
        twilioAccountSid: integration?.twilioAccountSid || '',
        twilioWhatsappNumber: integration?.twilioWhatsappNumber || '',
        twilioConfigured: twilioConfigured,
        twilioWebhookUrl: integration?.twilioWebhookUrl || '',
        
        // Meta Cloud API
        metaPhoneNumberId: integration?.metaPhoneNumberId || '',
        metaBusinessAccountId: integration?.metaBusinessAccountId || '',
        metaConfigured: metaConfigured,
        metaWebhookUrl: integration?.metaWebhookUrl || '',
        metaVerifyToken: integration?.metaVerifyToken || '',
        
        // Active WhatsApp Provider
        activeWhatsappProvider: activeProvider,
        
        // WooCommerce
        woocommerceStoreUrl: integration?.woocommerceStoreUrl || '',
        woocommerceConsumerKey: integration?.woocommerceConsumerKey || '',
        woocommerceConfigured: integration?.woocommerceConfigured || false,
        
        // Email (Multi-provider)
        emailProvider: integration?.emailProvider || null,
        emailUser: integration?.emailUser || '',
        emailFromName: integration?.emailFromName || '',
        emailSmtpHost: integration?.emailSmtpHost || null,
        emailSmtpPort: integration?.emailSmtpPort || null,
        emailConfigured: integration?.emailConfigured || false,
        
        // Gmail (legacy)
        gmailUser: integration?.gmailUser || '',
        gmailFromName: integration?.gmailFromName || '',
        gmailConfigured: integration?.gmailConfigured || false,
        
        // Google Tracking (from tenant table)
        websiteGoogleAnalyticsId: tenant?.websiteGoogleAnalyticsId || null,
        websiteGoogleAdsId: tenant?.websiteGoogleAdsId || null,
        websiteGoogleSiteVerification: tenant?.websiteGoogleSiteVerification || null,
      });
    } catch (err) {
      console.error("Get tenant integrations error:", err);
      res.status(500).json({ error: "Entegrasyon ayarları alınamadı" });
    }
  });
  
  // Save Twilio settings
  app.post("/api/tenant-integrations/twilio", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { accountSid, authToken, whatsappNumber } = req.body;
      
      if (!accountSid || !authToken || !whatsappNumber) {
        return res.status(400).json({ error: "Account SID, Auth Token ve WhatsApp numarası gerekli" });
      }
      
      // Encrypt the auth token
      const encryptedToken = encrypt(authToken);
      
      // Generate webhook URL for this tenant
      const tenant = await storage.getTenant(tenantId);
      const webhookUrl = `/api/webhooks/whatsapp/${tenant?.slug || tenantId}`;
      
      // Check if Meta is not configured - if so, set Twilio as active provider
      const existingIntegration = await storage.getTenantIntegration(tenantId);
      const shouldSetActive = !existingIntegration?.metaConfigured;
      
      await storage.upsertTenantIntegration(tenantId, {
        twilioAccountSid: accountSid,
        twilioAuthTokenEncrypted: encryptedToken,
        twilioWhatsappNumber: whatsappNumber,
        twilioWebhookUrl: webhookUrl,
        twilioConfigured: true,
        ...(shouldSetActive ? { activeWhatsappProvider: 'twilio' } : {}),
      });
      
      res.json({ success: true, message: "Twilio ayarları kaydedildi", webhookUrl });
    } catch (err) {
      console.error("Twilio settings save error:", err);
      res.status(500).json({ error: "Twilio ayarları kaydedilemedi" });
    }
  });
  
  // Delete Twilio settings
  app.delete("/api/tenant-integrations/twilio", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        twilioAccountSid: null,
        twilioAuthTokenEncrypted: null,
        twilioWhatsappNumber: null,
        twilioWebhookUrl: null,
        twilioConfigured: false,
      });
      
      res.json({ success: true, message: "Twilio baglantisi kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "Twilio ayarları silinemedi" });
    }
  });
  
  // Save Meta Cloud API settings
  app.post("/api/tenant-integrations/meta", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { accessToken, phoneNumberId, businessAccountId } = req.body;
      
      if (!accessToken || !phoneNumberId) {
        return res.status(400).json({ error: "Access Token ve Phone Number ID gerekli" });
      }
      
      // Encrypt the access token
      const encryptedToken = encrypt(accessToken);
      
      // Generate verify token for webhook verification
      const verifyToken = crypto.randomBytes(16).toString('hex');
      
      // Generate webhook URL for this tenant
      const tenant = await storage.getTenant(tenantId);
      const webhookUrl = `/api/webhooks/meta/${tenant?.slug || tenantId}`;
      
      // Check if Twilio is not configured - if so, set Meta as active provider
      const existingIntegration = await storage.getTenantIntegration(tenantId);
      const shouldSetActive = !existingIntegration?.twilioConfigured;
      
      await storage.upsertTenantIntegration(tenantId, {
        metaAccessTokenEncrypted: encryptedToken,
        metaPhoneNumberId: phoneNumberId,
        metaBusinessAccountId: businessAccountId || null,
        metaVerifyToken: verifyToken,
        metaWebhookUrl: webhookUrl,
        metaConfigured: true,
        ...(shouldSetActive ? { activeWhatsappProvider: 'meta' } : {}),
      });
      
      res.json({ success: true, message: "Meta Cloud API ayarları kaydedildi", webhookUrl, verifyToken });
    } catch (err) {
      console.error("Meta Cloud API settings save error:", err);
      res.status(500).json({ error: "Meta Cloud API ayarları kaydedilemedi" });
    }
  });
  
  // Delete Meta Cloud API settings
  app.delete("/api/tenant-integrations/meta", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        metaAccessTokenEncrypted: null,
        metaPhoneNumberId: null,
        metaBusinessAccountId: null,
        metaVerifyToken: null,
        metaWebhookUrl: null,
        metaConfigured: false,
      });
      
      res.json({ success: true, message: "Meta Cloud API bağlantısı kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "Meta Cloud API ayarları silinemedi" });
    }
  });
  
  // Set active WhatsApp provider
  app.post("/api/tenant-integrations/whatsapp-provider", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { provider } = req.body;
      
      if (!provider || !['twilio', 'meta'].includes(provider)) {
        return res.status(400).json({ error: "Geçersiz provider. 'twilio' veya 'meta' olmalı" });
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        activeWhatsappProvider: provider,
      });
      
      res.json({ success: true, message: `Aktif WhatsApp provider: ${provider}` });
    } catch (err) {
      res.status(500).json({ error: "Provider ayarı kaydedilemedi" });
    }
  });
  
  // Save WooCommerce settings
  app.post("/api/tenant-integrations/woocommerce", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { storeUrl, consumerKey, consumerSecret } = req.body;
      
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "Magaza URL, Consumer Key ve Consumer Secret gerekli" });
      }
      
      // Encrypt the consumer secret
      const encryptedSecret = encrypt(consumerSecret);
      
      // Generate webhook secret for verification
      const webhookSecret = crypto.randomBytes(32).toString('hex');
      
      await storage.upsertTenantIntegration(tenantId, {
        woocommerceStoreUrl: storeUrl,
        woocommerceConsumerKey: consumerKey,
        woocommerceConsumerSecretEncrypted: encryptedSecret,
        woocommerceWebhookSecret: webhookSecret,
        woocommerceConfigured: true,
      });
      
      res.json({ success: true, message: "WooCommerce ayarları kaydedildi" });
    } catch (err) {
      console.error("WooCommerce settings save error:", err);
      res.status(500).json({ error: "WooCommerce ayarları kaydedilemedi" });
    }
  });
  
  // Delete WooCommerce settings
  app.delete("/api/tenant-integrations/woocommerce", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        woocommerceStoreUrl: null,
        woocommerceConsumerKey: null,
        woocommerceConsumerSecretEncrypted: null,
        woocommerceWebhookSecret: null,
        woocommerceConfigured: false,
      });
      
      res.json({ success: true, message: "WooCommerce baglantisi kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "WooCommerce ayarları silinemedi" });
    }
  });
  
  // Save Gmail settings
  app.post("/api/tenant-integrations/gmail", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { gmailUser, gmailPassword, gmailFromName } = req.body;
      
      if (!gmailUser || !gmailPassword) {
        return res.status(400).json({ error: "Gmail adresi ve uygulama şifresi gerekli" });
      }
      
      // Encrypt the password
      const encryptedPassword = encrypt(gmailPassword);
      
      await storage.upsertTenantIntegration(tenantId, {
        gmailUser: gmailUser,
        gmailAppPasswordEncrypted: encryptedPassword,
        gmailFromName: gmailFromName || gmailUser,
        gmailConfigured: true,
      });
      
      res.json({ success: true, message: "Gmail ayarları kaydedildi" });
    } catch (err) {
      console.error("Gmail settings save error:", err);
      res.status(500).json({ error: "Gmail ayarları kaydedilemedi" });
    }
  });
  
  // Test Gmail connection
  app.post("/api/tenant-integrations/gmail/test", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const integration = await storage.getTenantIntegration(tenantId);
      
      if (!integration?.gmailUser || !integration?.gmailAppPasswordEncrypted) {
        return res.status(400).json({ success: false, error: "Gmail ayarları yapılandırmamis" });
      }
      
      let gmailPassword: string;
      try {
        gmailPassword = decrypt(integration.gmailAppPasswordEncrypted);
      } catch (decryptErr) {
        return res.status(400).json({ success: false, error: "Şifre cozme hatası. Lutfen Gmail şifresini yeniden girin." });
      }
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: integration.gmailUser,
          pass: gmailPassword,
        },
      });
      
      await transporter.verify();
      
      res.json({ success: true, message: "Gmail baglantisi başarılı!" });
    } catch (err: any) {
      console.error("Gmail test error:", err);
      let errorMessage = "Gmail baglantisi başarısız";
      if (err.code === 'EAUTH') {
        errorMessage = "Kimlik doğrulama hatası. Lutfen Gmail adresinizi ve uygulama şifrenizi kontrol edin.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      res.status(400).json({ success: false, error: errorMessage });
    }
  });
  
  // Delete Gmail settings
  app.delete("/api/tenant-integrations/gmail", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        gmailUser: null,
        gmailAppPasswordEncrypted: null,
        gmailFromName: null,
        gmailConfigured: false,
      });
      
      res.json({ success: true, message: "Gmail baglantisi kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "Gmail ayarları silinemedi" });
    }
  });

  // === MULTI-PROVIDER EMAIL SETTINGS ===
  
  // Email provider SMTP configurations
  const emailProviderConfigs: Record<string, { host: string; port: number; secure: boolean }> = {
    gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
    outlook: { host: 'smtp.office365.com', port: 587, secure: false },
    yandex: { host: 'smtp.yandex.com', port: 465, secure: true },
  };

  // Save email settings (multi-provider)
  app.post("/api/tenant-integrations/email", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { provider, emailUser, emailPassword, emailFromName, smtpHost, smtpPort, smtpSecure } = req.body;
      
      if (!provider || !emailUser || !emailPassword) {
        return res.status(400).json({ error: "E-posta sağlayıcısı, adres ve şifre gerekli" });
      }
      
      // Validate provider
      const validProviders = ['gmail', 'outlook', 'yandex', 'custom'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: "Geçersiz e-posta sağlayıcısı" });
      }
      
      // For custom SMTP, require host and port
      if (provider === 'custom' && (!smtpHost || !smtpPort)) {
        return res.status(400).json({ error: "Özel SMTP için sunucu adresi ve port gerekli" });
      }
      
      // Validate and parse smtpPort as integer for custom provider
      let parsedSmtpPort: number | undefined = undefined;
      if (provider === 'custom' && smtpPort !== undefined) {
        parsedSmtpPort = typeof smtpPort === 'string' ? parseInt(smtpPort, 10) : smtpPort;
        if (isNaN(parsedSmtpPort) || parsedSmtpPort < 1 || parsedSmtpPort > 65535) {
          return res.status(400).json({ error: "Geçersiz port numarası (1-65535 arası olmalı)" });
        }
      }
      
      // Encrypt the password
      const encryptedPassword = encrypt(emailPassword);
      
      // Get SMTP config based on provider
      let finalHost = smtpHost;
      let finalPort: number | undefined = parsedSmtpPort;
      let finalSecure = smtpSecure ?? true;
      
      if (provider !== 'custom' && emailProviderConfigs[provider]) {
        const config = emailProviderConfigs[provider];
        finalHost = config.host;
        finalPort = config.port;
        finalSecure = config.secure;
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        emailProvider: provider,
        emailUser: emailUser,
        emailPasswordEncrypted: encryptedPassword,
        emailFromName: emailFromName || emailUser,
        emailSmtpHost: finalHost,
        emailSmtpPort: finalPort,
        emailSmtpSecure: finalSecure,
        emailConfigured: true,
      });
      
      const providerNames: Record<string, string> = {
        gmail: 'Gmail',
        outlook: 'Outlook',
        yandex: 'Yandex',
        custom: 'Özel SMTP'
      };
      
      res.json({ success: true, message: `${providerNames[provider]} ayarları kaydedildi` });
    } catch (err) {
      console.error("Email settings save error:", err);
      res.status(500).json({ error: "E-posta ayarları kaydedilemedi" });
    }
  });
  
  // Test email connection (multi-provider)
  app.post("/api/tenant-integrations/email/test", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const integration = await storage.getTenantIntegration(tenantId);
      
      if (!integration?.emailUser || !integration?.emailPasswordEncrypted) {
        return res.status(400).json({ success: false, error: "E-posta ayarları yapılandırılmamış" });
      }
      
      let emailPassword: string;
      try {
        emailPassword = decrypt(integration.emailPasswordEncrypted);
      } catch (decryptErr) {
        return res.status(400).json({ success: false, error: "Şifre çözme hatası. Lütfen şifreyi yeniden girin." });
      }
      
      // Create transporter based on provider
      let transportConfig: any;
      
      if (integration.emailProvider === 'gmail') {
        transportConfig = {
          service: 'gmail',
          auth: { user: integration.emailUser, pass: emailPassword },
        };
      } else if (integration.emailProvider === 'outlook') {
        transportConfig = {
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: { user: integration.emailUser, pass: emailPassword },
        };
      } else if (integration.emailProvider === 'yandex') {
        transportConfig = {
          host: 'smtp.yandex.com',
          port: 465,
          secure: true,
          auth: { user: integration.emailUser, pass: emailPassword },
        };
      } else {
        // Custom SMTP
        transportConfig = {
          host: integration.emailSmtpHost,
          port: integration.emailSmtpPort || 587,
          secure: integration.emailSmtpSecure ?? false,
          auth: { user: integration.emailUser, pass: emailPassword },
        };
      }
      
      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.verify();
      
      res.json({ success: true, message: "E-posta bağlantısı başarılı!" });
    } catch (err: any) {
      console.error("Email test error:", err);
      let errorMessage = "E-posta bağlantısı başarısız";
      if (err.code === 'EAUTH') {
        errorMessage = "Kimlik doğrulama hatası. Lütfen e-posta adresinizi ve şifrenizi kontrol edin.";
      } else if (err.code === 'ESOCKET') {
        errorMessage = "Sunucuya bağlanılamadı. SMTP ayarlarını kontrol edin.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      res.status(400).json({ success: false, error: errorMessage });
    }
  });
  
  // Delete email settings (multi-provider)
  app.delete("/api/tenant-integrations/email", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      await storage.upsertTenantIntegration(tenantId, {
        emailProvider: null,
        emailUser: null,
        emailPasswordEncrypted: null,
        emailFromName: null,
        emailSmtpHost: null,
        emailSmtpPort: null,
        emailSmtpSecure: null,
        emailConfigured: false,
      });
      
      res.json({ success: true, message: "E-posta bağlantısı kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "E-posta ayarları silinemedi" });
    }
  });
  
  // Save Google Tracking settings
  app.post("/api/tenant-integrations/google-tracking", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { googleAnalyticsId, googleAdsId, googleSiteVerification } = req.body;
      
      // Update tenant settings directly (these are stored in tenants table)
      await storage.updateTenant(tenantId, {
        websiteGoogleAnalyticsId: googleAnalyticsId || null,
        websiteGoogleAdsId: googleAdsId || null,
        websiteGoogleSiteVerification: googleSiteVerification || null,
      });
      
      res.json({ success: true, message: "Google takip ayarları kaydedildi" });
    } catch (err) {
      console.error("Google tracking save error:", err);
      res.status(500).json({ error: "Google takip ayarları kaydedilemedi" });
    }
  });
  
  // Helper function to get email credentials for a tenant (multi-provider support)
  async function getEmailCredentials(tenantId?: number): Promise<{ 
    user: string; 
    password: string; 
    fromName?: string;
    provider?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
  } | null> {
    if (tenantId) {
      const integration = await storage.getTenantIntegration(tenantId);
      
      // First try new multi-provider email settings
      if (integration?.emailUser && integration?.emailPasswordEncrypted && integration?.emailConfigured) {
        try {
          const emailPassword = decrypt(integration.emailPasswordEncrypted);
          return { 
            user: integration.emailUser, 
            password: emailPassword,
            fromName: integration.emailFromName || undefined,
            provider: integration.emailProvider || undefined,
            smtpHost: integration.emailSmtpHost || undefined,
            smtpPort: integration.emailSmtpPort || undefined,
            smtpSecure: integration.emailSmtpSecure ?? undefined,
          };
        } catch {
          // Decryption failed, try legacy Gmail
        }
      }
      
      // Fallback to legacy Gmail settings
      if (integration?.gmailUser && integration?.gmailAppPasswordEncrypted) {
        try {
          const gmailPassword = decrypt(integration.gmailAppPasswordEncrypted);
          return { 
            user: integration.gmailUser, 
            password: gmailPassword,
            fromName: integration.gmailFromName || undefined,
            provider: 'gmail',
          };
        } catch {
          // Decryption failed, fall through to env vars
        }
      }
    }
    
    // Fallback to environment variables
    const envUser = process.env.GMAIL_USER;
    const envPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (envUser && envPassword) {
      return { user: envUser, password: envPassword, provider: 'gmail' };
    }
    
    return null;
  }
  
  // Legacy alias for backward compatibility
  async function getGmailCredentials(tenantId?: number) {
    return getEmailCredentials(tenantId);
  }
  
  // Helper function to get Twilio credentials for a tenant
  async function getTwilioCredentials(tenantId: number): Promise<{ accountSid: string; authToken: string; whatsappNumber: string } | null> {
    const integration = await storage.getTenantIntegration(tenantId);
    
    if (integration?.twilioAccountSid && integration?.twilioAuthTokenEncrypted && integration?.twilioWhatsappNumber) {
      try {
        const authToken = decrypt(integration.twilioAuthTokenEncrypted);
        return {
          accountSid: integration.twilioAccountSid,
          authToken: authToken,
          whatsappNumber: integration.twilioWhatsappNumber,
        };
      } catch {
        return null;
      }
    }
    
    // Fallback to environment variables (for backward compatibility)
    const envSid = process.env.TWILIO_ACCOUNT_SID;
    const envToken = process.env.TWILIO_AUTH_TOKEN;
    const envNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (envSid && envToken && envNumber) {
      return { accountSid: envSid, authToken: envToken, whatsappNumber: envNumber };
    }
    
    return null;
  }

  // === Conversations / Messages ===
  app.get("/api/conversations", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const filter = req.query.filter as 'all' | 'with_reservation' | 'human_intervention' | undefined;
      const conversations = await storage.getAllConversations(filter, tenantId);
      res.json(conversations);
    } catch (err) {
      res.status(500).json({ error: "Konuşmalar alınamadı" });
    }
  });

  // Message Analytics Endpoint
  app.get("/api/conversations/analytics", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
      
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default: // daily
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Get all conversations filtered by tenant
      const allConversations = await storage.getAllConversations('all', tenantId);
      
      // Filter conversations within the period
      const periodConversations = allConversations.filter(conv => {
        if (!conv.lastMessageTime) return false;
        const msgDate = new Date(conv.lastMessageTime);
        return msgDate >= startDate && msgDate <= now;
      });
      
      // Calculate metrics
      const totalCustomers = periodConversations.length;
      const conversionsToSales = periodConversations.filter(conv => conv.hasReservation).length;
      const supportRequests = periodConversations.filter(conv => conv.supportRequest).length;
      const pendingInterventions = periodConversations.filter(conv => conv.requiresHumanIntervention).length;
      
      // Calculate unique phone numbers (unique customers)
      const uniquePhones = new Set(periodConversations.map(c => c.phone));
      
      // Calculate response rate (conversations that got bot response)
      const conversationsWithBotResponse = periodConversations.filter(conv => 
        conv.messages && conv.messages.some((m: { role: string }) => m.role === 'assistant')
      ).length;
      
      // Calculate conversion rate
      const conversionRate = totalCustomers > 0 
        ? ((conversionsToSales / totalCustomers) * 100).toFixed(1)
        : '0';
      
      res.json({
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        metrics: {
          totalCustomers,
          uniqueCustomers: uniquePhones.size,
          conversionsToSales,
          conversionRate: parseFloat(conversionRate),
          supportRequests,
          pendingInterventions,
          conversationsWithBotResponse,
          responseRate: totalCustomers > 0 
            ? parseFloat(((conversationsWithBotResponse / totalCustomers) * 100).toFixed(1))
            : 0
        }
      });
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: "Analiz verileri alınamadı" });
    }
  });

  // === Support Requests ===
  app.get("/api/support-requests/summary", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const openRequests = await storage.getAllSupportRequests('open', tenantId);
      res.json({ 
        openCount: openRequests.length,
        requests: openRequests.slice(0, 5)
      });
    } catch (err) {
      res.status(500).json({ error: "Destek özeti alınamadı" });
    }
  });

  app.get("/api/support-requests", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const isPlatformAdmin = req.session?.isPlatformAdmin;
      const status = req.query.status as 'open' | 'resolved' | undefined;
      
      // Super Admins see all requests (no tenant filter), regular users see only their tenant's requests
      const requests = await storage.getAllSupportRequests(status, isPlatformAdmin ? undefined : tenantId);
      
      // For Super Admin, enrich requests with tenant info
      if (isPlatformAdmin && requests.length > 0) {
        const enrichedRequests = await Promise.all(requests.map(async (request) => {
          let tenantName = 'Bilinmiyor';
          if (request.tenantId) {
            const tenant = await storage.getTenant(request.tenantId);
            tenantName = tenant?.name || 'Bilinmiyor';
          }
          return { ...request, tenantName };
        }));
        return res.json(enrichedRequests);
      }
      
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: "Destek talepleri alınamadı" });
    }
  });

  app.post("/api/support-requests/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.resolveSupportRequest(id);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: "Destek talebi kapatılamadı" });
    }
  });

  app.post("/api/support-requests", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const { phone, reservationId, description } = req.body;
      const existing = await storage.getOpenSupportRequest(phone);
      if (existing) {
        return res.json(existing);
      }
      const created = await storage.createSupportRequest({ phone, reservationId, description, status: 'open', tenantId });
      
      await attachLogsToSupportRequest(created.id, phone);
      await logInfo('system', `Destek talebi oluşturuldu: #${created.id}`, { phone, reservationId }, phone);
      
      // Create in-app notification for support request
      if (tenantId) {
        await notifyTenantAdmins(
          tenantId,
          'support_request',
          'Yeni Destek Talebi',
          `${phone} - ${description || 'Destek talebi'}`,
          '/customer-requests'
        );
      }
      
      res.json(created);
    } catch (err) {
      await logError('system', 'Destek talebi oluşturma hatası', err);
      res.status(400).json({ error: "Destek talebi oluşturulamadı" });
    }
  });

  app.get("/api/support-requests/:id/logs", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await getSupportRequestLogs(id);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Loglar alınamadı" });
    }
  });

  app.get("/api/system-logs", async (req, res) => {
    try {
      const phone = req.query.phone as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await getRecentLogs(phone, limit);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Sistem loglari alınamadı" });
    }
  });

  // === Support Request Email (from User Guide) ===
  app.post("/api/support-request", async (req, res) => {
    try {
      const { subject, requestType, message, senderName, senderEmail, developerEmail } = req.body;
      
      if (!subject || !requestType || !message || !senderName) {
        return res.status(400).json({ error: "Tüm zorunlu alanlar doldurulmalı" });
      }

      const requestTypeLabels: Record<string, string> = {
        hata: 'Hata Bildirimi',
        güncelleme: 'Güncelleme İsteği',
        öneri: 'Öneri',
        soru: 'Soru',
        diger: 'Diğer'
      };

      // Get tenant info for the request
      const tenantId = req.session?.tenantId;
      let tenantName = 'Bilinmiyor';
      if (tenantId) {
        const tenant = await storage.getTenant(tenantId);
        tenantName = tenant?.name || 'Bilinmiyor';
      }
      
      // Store the support request in database for tracking
      const formattedPhone = `[${requestTypeLabels[requestType] || requestType}] ${senderName}${senderEmail ? ` <${senderEmail}>` : ''} - ${subject}`;
      
      // Only include tenantId if it exists (public forms won't have it)
      const requestData: { phone: string; status: 'open'; tenantId?: number } = {
        phone: formattedPhone.substring(0, 255),
        status: 'open',
      };
      if (tenantId) {
        requestData.tenantId = tenantId;
      }
      
      await storage.createSupportRequest(requestData);

      // Send email using centralized SMTP service
      let emailSent = false;
      const { sendEmail } = await import("./email");
      
      // Get platform notification email (for Super Admin)
      const platformNotificationEmail = await storage.getSetting("platformNotificationEmail");
      
      // Build email HTML
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Yeni Destek Talebi - Smartur
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Acente:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #007bff; font-weight: bold;">${tenantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Gönderen:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${senderName}${senderEmail ? ` (${senderEmail})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Talep Türü:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${requestTypeLabels[requestType] || requestType}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Konu:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${subject}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h4 style="margin-top: 0; color: #333;">Mesaj:</h4>
            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            Bu e-posta Smartur destek sistemi tarafından otomatik olarak gönderilmiştir.
          </p>
        </div>
      `;
      
      // Send to platform notification email if configured
      if (platformNotificationEmail) {
        const result = await sendEmail({
          to: platformNotificationEmail,
          subject: `[${tenantName}] ${requestTypeLabels[requestType] || requestType}: ${subject}`,
          html: emailHtml,
          replyTo: senderEmail || undefined,
          fromName: 'Smartur Destek',
        });
        
        if (result.success) {
          emailSent = true;
          console.log(`Support request notification sent to platform admin: ${platformNotificationEmail}`);
        }
      }
      
      // Also send to developer email if provided (and different from platform email)
      if (developerEmail && (!platformNotificationEmail || developerEmail !== platformNotificationEmail)) {
        const result = await sendEmail({
          to: developerEmail,
          subject: `[Destek] ${requestTypeLabels[requestType] || requestType}: ${subject}`,
          html: emailHtml,
          replyTo: senderEmail || undefined,
          fromName: 'Smartur Destek',
        });
        
        if (result.success) {
          emailSent = true;
          console.log(`Support request email sent to ${developerEmail}`);
        }
      }

      res.json({ 
        success: true, 
        message: emailSent 
          ? "Destek talebi kaydedildi ve e-posta gönderildi" 
          : "Destek talebi kaydedildi (e-posta yapılandırması eksik)"
      });
    } catch (err) {
      console.error("Support request error:", err);
      res.status(500).json({ error: "Destek talebi gönderilemedi" });
    }
  });

  // === Platform Notification Settings (Super Admin) ===
  app.get("/api/platform/notification-settings", async (req, res) => {
    try {
      if (!req.session?.isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      const notificationEmail = await storage.getSetting("platformNotificationEmail");
      res.json({ notificationEmail: notificationEmail || '' });
    } catch (err) {
      res.status(500).json({ error: "Ayarlar alınamadı" });
    }
  });
  
  app.post("/api/platform/notification-settings", async (req, res) => {
    try {
      if (!req.session?.isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      const { notificationEmail } = req.body;
      await storage.setSetting("platformNotificationEmail", notificationEmail || '');
      res.json({ success: true, message: "Bildirim e-postası kaydedildi" });
    } catch (err) {
      res.status(500).json({ error: "Ayarlar kaydedilemedi" });
    }
  });

  // === Platform SMTP Configuration (Super Admin) ===
  app.get("/api/platform/smtp-config", async (req, res) => {
    try {
      if (!req.session?.isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      const configJson = await storage.getSetting("platformSmtpConfig");
      if (!configJson) {
        return res.json({ configured: false });
      }
      
      const config = JSON.parse(configJson);
      res.json({
        configured: true,
        host: config.host || '',
        port: config.port || 587,
        secure: config.secure || false,
        username: config.username || '',
        fromEmail: config.fromEmail || '',
        fromName: config.fromName || '',
      });
    } catch (err) {
      res.status(500).json({ error: "SMTP ayarları alınamadı" });
    }
  });
  
  app.post("/api/platform/smtp-config", async (req, res) => {
    try {
      if (!req.session?.isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      
      const { host, port, secure, username, password, fromEmail, fromName } = req.body;
      
      // Validate required fields
      if (!host || !username) {
        return res.status(400).json({ error: "Host ve kullanıcı adı gerekli" });
      }
      
      // Get existing config to preserve password if not provided
      let existingPassword: string | null = null;
      const existingConfigJson = await storage.getSetting("platformSmtpConfig");
      if (existingConfigJson) {
        try {
          const existingConfig = JSON.parse(existingConfigJson);
          if (existingConfig.passwordEncrypted) {
            existingPassword = decrypt(existingConfig.passwordEncrypted);
          }
        } catch {}
      }
      
      // Use new password or existing password
      const finalPassword = password && password.trim() ? password : existingPassword;
      
      if (!finalPassword) {
        return res.status(400).json({ error: "Şifre gerekli" });
      }
      
      const { saveSmtpConfig, clearSmtpCache } = await import("./email");
      await saveSmtpConfig({
        host,
        port: typeof port === 'number' ? port : parseInt(port) || 587,
        secure: secure || false,
        username,
        password: finalPassword,
        fromEmail: fromEmail || username,
        fromName: fromName || 'Smartur',
      });
      
      // Clear cache to ensure fresh config is used immediately
      clearSmtpCache();
      
      res.json({ success: true, message: "SMTP ayarları kaydedildi" });
    } catch (err) {
      console.error("SMTP config save error:", err);
      res.status(500).json({ error: "SMTP ayarları kaydedilemedi" });
    }
  });
  
  app.post("/api/platform/smtp-config/test", async (req, res) => {
    try {
      if (!req.session?.isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      
      // Clear cache first to ensure fresh config is used
      const { testSmtpConnection, clearSmtpCache } = await import("./email");
      clearSmtpCache();
      
      const result = await testSmtpConnection();
      
      if (result.success) {
        res.json({ success: true, message: "SMTP bağlantısı başarılı!" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: "Bağlantı testi başarısız" });
    }
  });
  
  app.delete("/api/platform/smtp-config", async (req, res) => {
    try {
      if (!req.session?.isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      
      await storage.setSetting("platformSmtpConfig", '');
      
      const { clearSmtpCache } = await import("./email");
      clearSmtpCache();
      
      res.json({ success: true, message: "SMTP yapılandırması kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "SMTP ayarları silinemedi" });
    }
  });

  // === Blacklist ===
  app.get("/api/blacklist", async (req, res) => {
    try {
      const list = await storage.getBlacklist();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Kara liste alınamadı" });
    }
  });

  app.post("/api/blacklist", async (req, res) => {
    try {
      const { phone, reason } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Telefon numarası gerekli" });
      }
      const created = await storage.addToBlacklist(phone, reason);
      res.json(created);
    } catch (err) {
      res.status(400).json({ error: "Kara listeye eklenemedi" });
    }
  });

  app.delete("/api/blacklist/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.removeFromBlacklist(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Kara listeden silinemedi" });
    }
  });

  // === Exchange Rates (from Frankfurter API) ===
  app.get("/api/finance/exchange-rates", async (req, res) => {
    try {
      const now = new Date();
      
      // Return cached data if still valid
      if (exchangeRateCache.rates && exchangeRateCache.lastUpdated && 
          (now.getTime() - exchangeRateCache.lastUpdated.getTime()) < EXCHANGE_RATE_CACHE_DURATION) {
        return res.json(exchangeRateCache.rates);
      }

      // Fetch fresh rates from Frankfurter API
      const [usdResponse, eurResponse] = await Promise.all([
        fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,EUR'),
        fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=TRY,USD')
      ]);

      if (!usdResponse.ok || !eurResponse.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const usdData = await usdResponse.json();
      const eurData = await eurResponse.json();

      const rates = {
        USD: {
          TRY: usdData.rates.TRY,
          EUR: usdData.rates.EUR
        },
        EUR: {
          TRY: eurData.rates.TRY,
          USD: eurData.rates.USD
        },
        TRY: {
          USD: 1 / usdData.rates.TRY,
          EUR: 1 / eurData.rates.TRY
        },
        lastUpdated: now.toISOString(),
        date: usdData.date
      };

      // Update cache
      exchangeRateCache = { rates, lastUpdated: now };

      res.json(rates);
    } catch (err) {
      console.error('Exchange rate fetch error:', err);
      // Return cached data if available, even if stale
      if (exchangeRateCache.rates) {
        return res.json({ ...exchangeRateCache.rates, stale: true });
      }
      res.status(500).json({ error: "Döviz kurları alınamadı" });
    }
  });

  // === Finance - Agencies ===
  app.get("/api/finance/agencies", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const agencies = await storage.getAgencies(tenantId);
      res.json(agencies);
    } catch (err) {
      res.status(500).json({ error: "Acentalar alınamadı" });
    }
  });

  app.get("/api/finance/agencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agency = await storage.getAgency(id);
      if (!agency) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }
      res.json(agency);
    } catch (err) {
      res.status(500).json({ error: "Acenta alınamadı" });
    }
  });

  app.post("/api/finance/agencies", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      const agency = await storage.createAgency({ ...req.body, tenantId });
      res.json(agency);
    } catch (err) {
      res.status(400).json({ error: "Acenta oluşturulamadı" });
    }
  });

  app.patch("/api/finance/agencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agency = await storage.updateAgency(id, req.body);
      res.json(agency);
    } catch (err) {
      res.status(400).json({ error: "Acenta güncellenemedi" });
    }
  });

  app.delete("/api/finance/agencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAgency(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Acenta silinemedi" });
    }
  });

  // === Finance - Activity Costs ===
  app.get("/api/finance/costs", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const costs = await storage.getActivityCosts(month);
      res.json(costs);
    } catch (err) {
      res.status(500).json({ error: "Maliyetler alınamadı" });
    }
  });

  app.post("/api/finance/costs", async (req, res) => {
    try {
      const cost = await storage.upsertActivityCost(req.body);
      res.json(cost);
    } catch (err) {
      res.status(400).json({ error: "Maliyet kaydedilemedi" });
    }
  });

  app.post("/api/finance/costs/bulk", async (req, res) => {
    try {
      const { activityId, monthStart, monthEnd, fixedCost, variableCostPerGuest } = req.body;
      
      const startParts = monthStart.split('-').map(Number);
      const endParts = monthEnd.split('-').map(Number);
      
      let startYear = startParts[0];
      let startMonth = startParts[1];
      const endYear = endParts[0];
      const endMonth = endParts[1];
      
      const results = [];
      
      while (startYear < endYear || (startYear === endYear && startMonth <= endMonth)) {
        const month = `${startYear}-${String(startMonth).padStart(2, '0')}`;
        const cost = await storage.upsertActivityCost({
          activityId,
          month,
          fixedCost,
          variableCostPerGuest
        });
        results.push(cost);
        
        startMonth++;
        if (startMonth > 12) {
          startMonth = 1;
          startYear++;
        }
      }
      
      res.json({ message: `${results.length} ay için maliyet kaydedildi`, costs: results });
    } catch (err) {
      console.error('Bulk cost error:', err);
      res.status(400).json({ error: "Toplu maliyet kaydedilemedi" });
    }
  });

  app.delete("/api/finance/costs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteActivityCost(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Maliyet silinemedi" });
    }
  });

  // === Finance - Agency Payouts ===
  app.get("/api/finance/payouts", async (req, res) => {
    try {
      const agencyId = req.query.agencyId ? parseInt(req.query.agencyId as string) : undefined;
      const payouts = await storage.getAgencyPayouts(agencyId);
      res.json(payouts);
    } catch (err) {
      res.status(500).json({ error: "Ödemeler alınamadı" });
    }
  });

  app.post("/api/finance/payouts", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const { agencyId, periodStart, periodEnd, description, guestCount, baseAmountTl, vatRatePct, method, reference, notes } = req.body;
      
      const vatAmount = Math.round(baseAmountTl * (vatRatePct / 100));
      const totalAmount = baseAmountTl + vatAmount;
      
      const payout = await storage.createAgencyPayout({
        tenantId,
        agencyId,
        periodStart,
        periodEnd,
        description,
        guestCount: guestCount || 0,
        baseAmountTl,
        vatRatePct,
        vatAmountTl: vatAmount,
        totalAmountTl: totalAmount,
        method,
        reference,
        notes,
        status: 'paid'
      });
      res.json(payout);
    } catch (err) {
      console.error('Payout error:', err);
      res.status(400).json({ error: "Ödeme kaydedilemedi" });
    }
  });

  app.delete("/api/finance/payouts/:id", async (req, res) => {
    try {
      await storage.deleteAgencyPayout(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Ödeme silinemedi" });
    }
  });

  // === Finance - Supplier Dispatches ===
  app.get("/api/finance/dispatches", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const agencyId = req.query.agencyId ? parseInt(req.query.agencyId as string) : undefined;
      const dispatches = await storage.getSupplierDispatches(agencyId, tenantId);
      res.json(dispatches);
    } catch (err) {
      res.status(500).json({ error: "Gönderimler alınamadı" });
    }
  });

  app.post("/api/finance/dispatches", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const { agencyId, activityId, dispatchDate, dispatchTime, customerName, guestCount, unitPayoutTl, currency, notes } = req.body;
      
      if (!agencyId || !dispatchDate) {
        return res.status(400).json({ error: "agencyId ve dispatchDate zorunlu" });
      }
      
      // Manuel override: Form'dan gelen fiyat varsa (>0) onu kullan
      // Aksi halde rate veya agency default'u kullan
      let finalUnitPayoutTl = unitPayoutTl;
      let finalCurrency = currency || 'TRY';
      let rateId: number | null = null;
      
      // Sadece fiyat belirtilmemişse rate/agency'den al
      if (!unitPayoutTl || unitPayoutTl === 0) {
        const activeRate = await storage.getActiveRateForDispatch(agencyId, activityId || null, dispatchDate);
        if (activeRate) {
          finalUnitPayoutTl = activeRate.currency === 'USD' ? (activeRate.unitPayoutUsd || 0) : activeRate.unitPayoutTl;
          finalCurrency = activeRate.currency || 'TRY';
          rateId = activeRate.id;
        } else {
          const agency = await storage.getAgency(agencyId);
          finalUnitPayoutTl = agency?.defaultPayoutPerGuest || 0;
        }
      }
      
      const totalPayoutTl = (guestCount || 0) * finalUnitPayoutTl;
      
      const dispatch = await storage.createSupplierDispatch({
        tenantId,
        agencyId,
        activityId,
        dispatchDate,
        dispatchTime,
        customerName,
        guestCount: guestCount || 0,
        unitPayoutTl: finalUnitPayoutTl,
        totalPayoutTl,
        currency: finalCurrency,
        rateId,
        notes
      });
      res.json(dispatch);
    } catch (err) {
      console.error('Dispatch error:', err);
      res.status(400).json({ error: "Gönderim kaydedilemedi" });
    }
  });

  app.patch("/api/finance/dispatches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { guestCount, unitPayoutTl, ...rest } = req.body;
      const totalPayoutTl = (guestCount || 0) * (unitPayoutTl || 0);
      
      const dispatch = await storage.updateSupplierDispatch(id, {
        ...rest,
        guestCount,
        unitPayoutTl,
        totalPayoutTl
      });
      res.json(dispatch);
    } catch (err) {
      res.status(400).json({ error: "Gönderim güncellenemedi" });
    }
  });

  app.delete("/api/finance/dispatches/:id", async (req, res) => {
    try {
      await storage.deleteSupplierDispatch(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Gönderim silinemedi" });
    }
  });

  // === Finance - Dispatch Items (Alt Kalemler) ===
  app.get("/api/finance/dispatches/:dispatchId/items", async (req, res) => {
    try {
      const dispatchId = parseInt(req.params.dispatchId);
      const items = await storage.getDispatchItems(dispatchId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Kalemler alınamadı" });
    }
  });

  app.post("/api/finance/dispatches/:dispatchId/items", async (req, res) => {
    try {
      const dispatchId = parseInt(req.params.dispatchId);
      const { itemType, label, quantity, unitAmount, currency, notes } = req.body;
      
      if (!label) {
        return res.status(400).json({ error: "label zorunlu" });
      }
      
      const totalAmount = (quantity || 1) * (unitAmount || 0);
      
      const item = await storage.createDispatchItem({
        dispatchId,
        itemType: itemType || 'base',
        label,
        quantity: quantity || 1,
        unitAmount: unitAmount || 0,
        totalAmount,
        currency: currency || 'TRY',
        notes
      });
      res.json(item);
    } catch (err) {
      console.error('Dispatch item error:', err);
      res.status(400).json({ error: "Kalem kaydedilemedi" });
    }
  });

  app.patch("/api/finance/dispatch-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity, unitAmount, ...rest } = req.body;
      const totalAmount = (quantity || 1) * (unitAmount || 0);
      
      const item = await storage.updateDispatchItem(id, {
        ...rest,
        quantity,
        unitAmount,
        totalAmount
      });
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Kalem güncellenemedi" });
    }
  });

  app.delete("/api/finance/dispatch-items/:id", async (req, res) => {
    try {
      await storage.deleteDispatchItem(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Kalem silinemedi" });
    }
  });

  // Toplu kalem işlemi - Gönderim oluştururken/güncellerken kalemlerle birlikte
  app.post("/api/finance/dispatches-with-items", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const { agencyId, activityId, dispatchDate, dispatchTime, customerName, notes, items } = req.body;
      
      if (!agencyId || !dispatchDate) {
        return res.status(400).json({ error: "agencyId ve dispatchDate zorunlu" });
      }
      
      // Kalemlerin toplamını hesapla (currency bazında)
      const itemsArray = items || [];
      let totalGuestCount = 0;
      let totalPayoutTl = 0;
      let totalPayoutUsd = 0;
      
      for (const item of itemsArray) {
        const itemTotal = (item.quantity || 1) * (item.unitAmount || 0);
        if (item.currency === 'USD') {
          totalPayoutUsd += itemTotal;
        } else {
          totalPayoutTl += itemTotal;
        }
        // base ve observer tipindeki kalemler misafir sayısına eklenir
        if (item.itemType === 'base' || item.itemType === 'observer') {
          totalGuestCount += item.quantity || 1;
        }
      }
      
      // Ana para birimi: TL varsa TL, yoksa USD
      const mainCurrency = totalPayoutTl > 0 ? 'TRY' : 'USD';
      const mainTotal = mainCurrency === 'TRY' ? totalPayoutTl : totalPayoutUsd;
      
      // Dispatch oluştur
      const dispatch = await storage.createSupplierDispatch({
        tenantId,
        agencyId,
        activityId,
        dispatchDate,
        dispatchTime,
        customerName,
        guestCount: totalGuestCount,
        unitPayoutTl: totalGuestCount > 0 ? Math.round(mainTotal / totalGuestCount) : 0,
        totalPayoutTl: mainTotal,
        currency: mainCurrency,
        notes
      });
      
      // Kalemleri oluştur
      const createdItems = [];
      for (const item of itemsArray) {
        const itemTotal = (item.quantity || 1) * (item.unitAmount || 0);
        const createdItem = await storage.createDispatchItem({
          dispatchId: dispatch.id,
          itemType: item.itemType || 'base',
          label: item.label,
          quantity: item.quantity || 1,
          unitAmount: item.unitAmount || 0,
          totalAmount: itemTotal,
          currency: item.currency || 'TRY',
          notes: item.notes
        });
        createdItems.push(createdItem);
      }
      
      res.json({ dispatch, items: createdItems });
    } catch (err) {
      console.error('Dispatch with items error:', err);
      res.status(400).json({ error: "Gönderim ve kalemler kaydedilemedi" });
    }
  });

  // Tüm dispatch'lerin itemlarını toplu getir
  app.post("/api/finance/dispatch-items/batch", async (req, res) => {
    try {
      const { dispatchIds } = req.body;
      if (!Array.isArray(dispatchIds)) {
        return res.status(400).json({ error: "dispatchIds dizisi zorunlu" });
      }
      const items = await storage.getDispatchItemsByDispatchIds(dispatchIds);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Kalemler alınamadı" });
    }
  });

  app.get("/api/finance/dispatches/summary", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const summary = await storage.getSupplierDispatchSummary(startDate, endDate, tenantId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Özet alınamadı" });
    }
  });

  // === Finance - Agency Activity Rates (Dönemsel Tarifeler) ===
  app.get("/api/finance/rates", async (req, res) => {
    try {
      const agencyId = req.query.agencyId ? parseInt(req.query.agencyId as string) : undefined;
      const rates = await storage.getAgencyActivityRates(agencyId);
      res.json(rates);
    } catch (err) {
      res.status(500).json({ error: "Tarifeler alınamadı" });
    }
  });

  app.post("/api/finance/rates", async (req, res) => {
    try {
      const { agencyId, activityId, validFrom, validTo, unitPayoutTl, unitPayoutUsd, currency, notes } = req.body;
      
      if (!agencyId || !validFrom) {
        return res.status(400).json({ error: "agencyId ve validFrom zorunlu" });
      }
      
      const currencyVal = currency || 'TRY';
      const payoutTl = unitPayoutTl || 0;
      const payoutUsd = unitPayoutUsd || 0;
      
      if (currencyVal === 'TRY' && payoutTl < 0) {
        return res.status(400).json({ error: "unitPayoutTl negatif olamaz" });
      }
      if (currencyVal === 'USD' && payoutUsd < 0) {
        return res.status(400).json({ error: "unitPayoutUsd negatif olamaz" });
      }
      if (validTo && validTo < validFrom) {
        return res.status(400).json({ error: "validTo, validFrom'dan once olamaz" });
      }
      
      const rate = await storage.createAgencyActivityRate({
        agencyId,
        activityId: activityId || null,
        validFrom,
        validTo: validTo || null,
        unitPayoutTl: payoutTl,
        unitPayoutUsd: payoutUsd,
        currency: currencyVal,
        notes,
        isActive: true
      });
      res.json(rate);
    } catch (err) {
      console.error('Rate error:', err);
      res.status(400).json({ error: "Tarife kaydedilemedi" });
    }
  });

  app.patch("/api/finance/rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { unitPayoutTl, validFrom, validTo } = req.body;
      
      if (unitPayoutTl !== undefined && unitPayoutTl < 0) {
        return res.status(400).json({ error: "unitPayoutTl negatif olamaz" });
      }
      if (validTo && validFrom && validTo < validFrom) {
        return res.status(400).json({ error: "validTo, validFrom'dan once olamaz" });
      }
      
      const rate = await storage.updateAgencyActivityRate(id, req.body);
      res.json(rate);
    } catch (err) {
      res.status(400).json({ error: "Tarife güncellenemedi" });
    }
  });

  app.delete("/api/finance/rates/:id", async (req, res) => {
    try {
      await storage.deleteAgencyActivityRate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Tarife silinemedi" });
    }
  });

  app.get("/api/finance/rates/active", async (req, res) => {
    try {
      const agencyId = parseInt(req.query.agencyId as string);
      const activityId = req.query.activityId ? parseInt(req.query.activityId as string) : null;
      const date = req.query.date as string;
      
      if (!agencyId || !date) {
        return res.status(400).json({ error: "agencyId ve date gerekli" });
      }
      
      const rate = await storage.getActiveRateForDispatch(agencyId, activityId, date);
      res.json(rate);
    } catch (err) {
      res.status(500).json({ error: "Aktif tarife alınamadı" });
    }
  });

  // === Finance - Settlements ===
  app.get("/api/finance/settlements", async (req, res) => {
    try {
      const agencyId = req.query.agencyId ? parseInt(req.query.agencyId as string) : undefined;
      const settlements = await storage.getSettlements(agencyId);
      res.json(settlements);
    } catch (err) {
      res.status(500).json({ error: "Hesaplaşmalar alınamadı" });
    }
  });

  app.get("/api/finance/settlements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const settlement = await storage.getSettlement(id);
      if (!settlement) {
        return res.status(404).json({ error: "Hesaplaşma bulunamadı" });
      }
      const entries = await storage.getSettlementEntries(id);
      const payments = await storage.getPayments(id);
      res.json({ ...settlement, entries, payments });
    } catch (err) {
      res.status(500).json({ error: "Hesaplaşma alınamadı" });
    }
  });

  app.post("/api/finance/settlements", async (req, res) => {
    try {
      const settlement = await storage.createSettlement(req.body);
      res.json(settlement);
    } catch (err) {
      res.status(400).json({ error: "Hesaplaşma oluşturulamadı" });
    }
  });

  app.patch("/api/finance/settlements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const settlement = await storage.updateSettlement(id, req.body);
      res.json(settlement);
    } catch (err) {
      res.status(400).json({ error: "Hesaplaşma güncellenemedi" });
    }
  });

  // Generate settlement from unpaid reservations
  app.post("/api/finance/settlements/generate", async (req, res) => {
    try {
      const { agencyId, periodStart, periodEnd, extrasTl } = req.body;
      
      // Get unpaid reservations for this agency
      const unpaidReservations = await storage.getUnpaidReservations(agencyId, periodStart);
      const agency = await storage.getAgency(agencyId);
      
      if (!agency) {
        return res.status(404).json({ error: "Acenta bulunamadı" });
      }
      
      // Calculate totals
      let totalGuests = 0;
      let grossSalesTl = 0;
      let grossSalesUsd = 0;
      
      for (const res of unpaidReservations) {
        totalGuests += res.quantity;
        grossSalesTl += res.priceTl || 0;
        grossSalesUsd += res.priceUsd || 0;
      }
      
      const payoutTl = totalGuests * (agency.defaultPayoutPerGuest || 0);
      const extras = extrasTl || 0;
      const profitTl = grossSalesTl - payoutTl - extras;
      
      // Create settlement
      const settlement = await storage.createSettlement({
        agencyId,
        periodStart,
        periodEnd,
        status: 'draft',
        totalGuests,
        grossSalesTl,
        grossSalesUsd,
        payoutTl,
        extrasTl: extras,
        vatRatePct: 0,
        vatAmountTl: 0,
        profitTl,
        remainingTl: payoutTl + extras
      });
      
      // Create entries and mark reservations
      for (const r of unpaidReservations) {
        await storage.createSettlementEntry({
          settlementId: settlement.id,
          reservationId: r.id,
          activityId: r.activityId || undefined,
          guestCount: r.quantity,
          revenueTl: r.priceTl || 0,
          payoutTl: r.quantity * (agency.defaultPayoutPerGuest || 0)
        });
        await storage.updateReservationSettlement(r.id, settlement.id);
      }
      
      res.json(settlement);
    } catch (err) {
      console.error('Settlement generation error:', err);
      res.status(400).json({ error: "Hesaplaşma oluşturulamadı" });
    }
  });

  // === Finance - Payments ===
  app.post("/api/finance/payments", async (req, res) => {
    try {
      const payment = await storage.createPayment(req.body);
      res.json(payment);
    } catch (err) {
      res.status(400).json({ error: "Ödeme kaydedilemedi" });
    }
  });

  // === Finance - Overview ===
  app.get("/api/finance/overview", async (req, res) => {
    try {
      const now = new Date();
      const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const defaultEnd = now.toISOString().split('T')[0];
      const startDate = req.query.startDate as string || defaultStart;
      const endDate = req.query.endDate as string || defaultEnd;
      const overview = await storage.getFinanceOverview(startDate, endDate);
      res.json(overview);
    } catch (err) {
      res.status(500).json({ error: "Finans özeti alınamadı" });
    }
  });

  // Update reservation agency
  app.patch("/api/reservations/:id/agency", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { agencyId } = req.body;
      await storage.updateReservationAgency(id, agencyId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Rezervasyon güncellenemedi" });
    }
  });

  // Version and update info endpoint
  app.get("/api/system/version", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Read package.json for version
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const currentVersion = packageJson.version || '1.0.0';
      
      // Try to get git commit info with timeout
      let gitCommit = null;
      let gitBranch = null;
      try {
        const { execSync } = await import('child_process');
        gitCommit = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
          encoding: 'utf8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
      } catch (e) {
        // Git not available or timed out
        console.log('Git bilgisi alınamadı:', e instanceof Error ? e.message : 'Bilinmeyen hata');
      }
      
      res.json({
        version: currentVersion,
        gitCommit,
        gitBranch,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        lastChecked: new Date().toISOString()
      });
    } catch (err) {
      console.error('Sürüm bilgisi hatası:', err);
      res.status(500).json({ error: "Sürüm bilgisi alınamadı" });
    }
  });

  // Cache for update check to prevent repeated blocking calls
  let updateCheckCache: {
    data: Record<string, unknown>;
    timestamp: number;
  } | null = null;
  const UPDATE_CACHE_TTL = 60000; // 1 minute cache

  // Check for updates from GitHub
  app.get("/api/system/check-updates", async (req, res) => {
    try {
      // Return cached result if still fresh
      if (updateCheckCache && Date.now() - updateCheckCache.timestamp < UPDATE_CACHE_TTL) {
        return res.json({
          ...updateCheckCache.data,
          cached: true,
          lastChecked: new Date(updateCheckCache.timestamp).toISOString()
        });
      }

      const fs = await import('fs');
      const path = await import('path');
      
      // Read package.json for version
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const currentVersion = packageJson.version || '1.0.0';
      
      // Try to get local and remote commit info
      let localCommit = null;
      let remoteCommit = null;
      let behindCount = 0;
      let hasUpdates = false;
      let errorMessage = null;
      
      try {
        const { execSync } = await import('child_process');
        
        // Get local commit first (fast, no network)
        localCommit = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        
        // Try to fetch from remote with timeout (10 seconds max)
        try {
          execSync('git fetch origin --quiet', { 
            encoding: 'utf8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch (fetchErr) {
          // Fetch failed - continue with cached remote info
          console.log('Git fetch başarısız, önbellek kullanılıyor');
        }
        
        // Get remote commit (may be stale if fetch failed)
        try {
          remoteCommit = execSync('git rev-parse --short origin/main', { 
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
          }).trim();
        } catch {
          try {
            remoteCommit = execSync('git rev-parse --short origin/master', { 
              encoding: 'utf8',
              timeout: 5000,
              stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
          } catch {
            remoteCommit = null;
          }
        }
        
        // Count commits behind
        if (remoteCommit) {
          try {
            const behindOutput = execSync('git rev-list --count HEAD..origin/main', { 
              encoding: 'utf8',
              timeout: 5000,
              stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            behindCount = parseInt(behindOutput) || 0;
          } catch {
            try {
              const behindOutput = execSync('git rev-list --count HEAD..origin/master', { 
                encoding: 'utf8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
              }).trim();
              behindCount = parseInt(behindOutput) || 0;
            } catch {
              behindCount = 0;
            }
          }
        }
        
        hasUpdates = localCommit !== remoteCommit && behindCount > 0;
      } catch (e) {
        // Git not available or not a git repo
        errorMessage = e instanceof Error ? e.message : 'Git erişilemedi';
        console.log('Git güncelleme kontrolü başarısız:', errorMessage);
      }
      
      const responseData = {
        currentVersion,
        localCommit,
        remoteCommit,
        behindCount,
        hasUpdates,
        lastChecked: new Date().toISOString(),
        error: errorMessage
      };
      
      // Update cache
      updateCheckCache = {
        data: responseData,
        timestamp: Date.now()
      };
      
      res.json(responseData);
    } catch (err) {
      console.error('Güncelleme kontrolü hatası:', err);
      res.status(500).json({ error: "Güncelleme kontrolü yapılamadı" });
    }
  });

  // Debug Snapshot - Tum sistem verisini topla
  app.get("/api/system/debug-snapshot", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Sistem bilgileri
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      let gitInfo: { commit: string | null, branch: string | null } = { commit: null, branch: null };
      try {
        const { execSync } = await import('child_process');
        gitInfo.commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 5000 }).trim();
        gitInfo.branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', timeout: 5000 }).trim();
      } catch {}
      
      // Veritabani verileri (hassas bilgiler maskelenmis)
      const tenantId = req.session?.tenantId;
      const activities = await storage.getActivities(tenantId);
      const packageTours = await storage.getPackageTours(tenantId);
      const recentReservations = await storage.getReservations(tenantId);
      const supportRequests = await storage.getAllSupportRequests();
      const recentLogs = await getRecentLogs(undefined, 100);
      const autoResponses = await storage.getAutoResponses();
      const blacklist = await storage.getBlacklist();
      
      // Ayarlar (hassas olmayan)
      const botRules = await storage.getSetting('botRules');
      const botAccess = await storage.getSetting('botAccess');
      
      // Sistem sagligi kontrolleri
      const healthChecks = [];
      
      // AI baglantisi kontrolu
      const aiErrors = recentLogs.filter(l => l.source === 'ai' && l.level === 'error');
      if (aiErrors.length > 5) {
        healthChecks.push({
          id: 'ai_errors',
          severity: 'error',
          title: 'AI Baglanti Sorunu',
          description: `Son 24 saatte ${aiErrors.length} AI hatası. Gemini API limitine ulasilmis olabilir.`,
          suggestion: 'Biraz bekleyin veya API kotasini kontrol edin.'
        });
      }
      
      // Webhook hatalari kontrolu
      const webhookErrors = recentLogs.filter(l => l.source === 'webhook' && l.level === 'error');
      if (webhookErrors.length > 0) {
        healthChecks.push({
          id: 'webhook_errors',
          severity: 'warning',
          title: 'Webhook Hatalari',
          description: `${webhookErrors.length} WooCommerce webhook hatası tespit edildi.`,
          suggestion: 'WooCommerce baglanti ayarlarıni kontrol edin.'
        });
      }
      
      // Açık destek talepleri
      const openSupport = supportRequests.filter(s => s.status === 'open');
      if (openSupport.length > 5) {
        healthChecks.push({
          id: 'pending_support',
          severity: 'info',
          title: 'Bekleyen Destek Talepleri',
          description: `${openSupport.length} açık destek talebi var.`,
          suggestion: 'Destek taleplerini inceleyin ve cozumleyin.'
        });
      }
      
      // Aktivite kontrolu
      if (activities.length === 0) {
        healthChecks.push({
          id: 'no_activities',
          severity: 'warning',
          title: 'Aktivite Tanımlanmamis',
          description: 'Sistemde hic aktivite tanimli degil.',
          suggestion: 'Aktiviteler sayfasından aktivite ekleyin.'
        });
      }

      const snapshot = {
        timestamp: new Date().toISOString(),
        version: packageJson.version,
        git: gitInfo,
        nodeVersion: process.version,
        uptime: process.uptime(),
        
        healthChecks,
        
        summary: {
          activitiesCount: activities.length,
          packageToursCount: packageTours.length,
          reservationsCount: recentReservations.length,
          openSupportCount: openSupport.length,
          recentErrorsCount: recentLogs.filter(l => l.level === 'error').length,
          autoResponsesCount: autoResponses.length,
          blacklistCount: blacklist.length,
        },
        
        data: {
          activities: activities.map(a => ({
            id: a.id, name: a.name, price: a.price, priceUsd: a.priceUsd, 
            defaultTimes: a.defaultTimes, defaultCapacity: a.defaultCapacity, active: a.active
          })),
          packageTours: packageTours.map(p => ({
            id: p.id, name: p.name, price: p.price, priceUsd: p.priceUsd, active: p.active
          })),
          reservations: recentReservations.slice(0, 50).map(r => ({
            id: r.id, activityId: r.activityId, date: r.date, time: r.time, 
            quantity: r.quantity, status: r.status, source: r.source
          })),
          supportRequests: supportRequests.map(s => ({
            id: s.id, status: s.status, createdAt: s.createdAt
          })),
          autoResponses: autoResponses.map(ar => ({
            id: ar.id, name: ar.name, isActive: ar.isActive, priority: ar.priority
          })),
          recentLogs: recentLogs.slice(0, 50).map(l => ({
            id: l.id, level: l.level, source: l.source, message: l.message, createdAt: l.createdAt
          })),
        },
        
        settings: {
          botRulesConfigured: !!botRules,
          botAccess: botAccess ? (() => { try { return JSON.parse(botAccess); } catch { return null; } })() : null,
        }
      };
      
      res.json(snapshot);
    } catch (err) {
      console.error('Debug snapshot hatası:', err);
      await logError('system', 'Debug snapshot oluşturulamadi', err);
      res.status(500).json({ error: "Debug snapshot oluşturulamadi" });
    }
  });

  // Sistem Sagligi kontrolu (başıt endpoint)
  app.get("/api/system/health", async (req, res) => {
    try {
      const recentLogs = await getRecentLogs(undefined, 50);
      const errorCount = recentLogs.filter(l => l.level === 'error').length;
      const warnCount = recentLogs.filter(l => l.level === 'warn').length;
      
      let status = 'healthy';
      if (errorCount > 10) status = 'critical';
      else if (errorCount > 0 || warnCount > 5) status = 'warning';
      
      res.json({
        status,
        errorCount,
        warnCount,
        lastCheck: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ status: 'error', error: 'Sistem durumu alınamadı' });
    }
  });

  // === APP VERSION MANAGEMENT ===

  // Get all app versions (for Super Admin)
  app.get("/api/app-versions", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const validToken = (global as Record<string, unknown>).superAdminToken;
      if (!validToken || token !== validToken) {
        return res.status(403).json({ error: "Yetkişiz erisim" });
      }
      
      const versions = await storage.getAppVersions();
      res.json(versions);
    } catch (err) {
      console.error('App versions hatası:', err);
      res.status(500).json({ error: "Sürümler alınamadı" });
    }
  });

  // Get active app version
  app.get("/api/app-versions/active", async (req, res) => {
    try {
      const version = await storage.getActiveAppVersion();
      res.json(version || null);
    } catch (err) {
      res.status(500).json({ error: "Aktif sürüm alınamadı" });
    }
  });

  // Create new app version record (when uploading)
  app.post("/api/app-versions", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const validToken = (global as Record<string, unknown>).superAdminToken;
      if (!validToken || token !== validToken) {
        return res.status(403).json({ error: "Yetkişiz erisim" });
      }

      const { version, fileName, fileSize, checksum, notes } = req.body;
      
      if (!version || !fileName) {
        return res.status(400).json({ error: "Sürüm numarası ve dosya adi gerekli" });
      }

      // Get current active version to mark as rollback target
      const currentActive = await storage.getActiveAppVersion();
      
      // Create the new version entry
      const newVersion = await storage.createAppVersion({
        version,
        fileName,
        fileSize: fileSize || 0,
        checksum: checksum || null,
        notes: notes || null,
        status: 'pending',
        uploadedBy: 'super_admin',
        backupFileName: currentActive ? `backup_${currentActive.version}_${Date.now()}.tar.gz` : null,
        isRollbackTarget: false,
      });

      res.status(201).json(newVersion);
    } catch (err) {
      console.error('App version create hatası:', err);
      res.status(500).json({ error: "Sürüm oluşturulamadi" });
    }
  });

  // Activate an app version
  app.post("/api/app-versions/:id/activate", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const validToken = (global as Record<string, unknown>).superAdminToken;
      if (!validToken || token !== validToken) {
        return res.status(403).json({ error: "Yetkişiz erisim" });
      }

      const id = Number(req.params.id);
      const version = await storage.getAppVersion(id);
      
      if (!version) {
        return res.status(404).json({ error: "Sürüm bulunamadı" });
      }

      const activated = await storage.activateAppVersion(id);
      
      await logInfo('system', `Sürüm aktif edildi: ${version.version}`);
      
      res.json(activated);
    } catch (err) {
      console.error('Version activate hatası:', err);
      res.status(500).json({ error: "Sürüm aktif edilemedi" });
    }
  });

  // Rollback to a previous version
  app.post("/api/app-versions/:id/rollback", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const validToken = (global as Record<string, unknown>).superAdminToken;
      if (!validToken || token !== validToken) {
        return res.status(403).json({ error: "Yetkişiz erisim" });
      }

      const id = Number(req.params.id);
      const version = await storage.getAppVersion(id);
      
      if (!version) {
        return res.status(404).json({ error: "Sürüm bulunamadı" });
      }

      if (!version.isRollbackTarget) {
        return res.status(400).json({ error: "Bu sürüm geri alınabilir degil" });
      }

      const rolledBack = await storage.rollbackToVersion(id);
      
      await logInfo('system', `Sürüm geri alindi: ${version.version}`);
      
      res.json({
        success: true,
        message: `${version.version} sürümune geri donuldu`,
        version: rolledBack
      });
    } catch (err) {
      console.error('Version rollback hatası:', err);
      res.status(500).json({ error: "Geri alma başarısız" });
    }
  });

  // System update upload endpoint (placeholder - multipart handling not implemented)
  app.post("/api/system/upload-update", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Yetkilendirme gerekli" });
      }
      
      // Verify Super Admin token
      const validToken = (global as Record<string, unknown>).superAdminToken;
      if (!validToken || token !== validToken) {
        return res.status(403).json({ error: "Geçersiz token" });
      }
      
      // Get version info from body if available
      const { version, fileName, fileSize } = req.body;
      
      // Create a version record for the upload
      if (version && fileName) {
        const currentActive = await storage.getActiveAppVersion();
        
        await storage.createAppVersion({
          version,
          fileName,
          fileSize: fileSize || 0,
          checksum: null,
          notes: 'Yüklenen güncelleme',
          status: 'pending',
          uploadedBy: 'super_admin',
          backupFileName: currentActive ? `backup_${currentActive.version}_${Date.now()}.tar.gz` : null,
          isRollbackTarget: false,
        });
      }
      
      // Note: Multipart file handling (multer) not implemented
      // In production VPS deployment, this would handle file extraction and system update
      res.json({ 
        success: true, 
        message: "Güncelleme talebi alindi.",
        note: "Not: Dosya işleme henuz uygulanmadi. VPS kurulumunda aktif edilecek.",
        implemented: false
      });
    } catch (err) {
      console.error('Update upload hatası:', err);
      res.status(500).json({ error: "Güncelleme yüklenemedi" });
    }
  });

  // Auto Responses CRUD
  app.get("/api/auto-responses", async (req, res) => {
    try {
      const autoResponses = await storage.getAutoResponses();
      res.json(autoResponses);
    } catch (err) {
      res.status(500).json({ error: "Otomatik yanitlar alınamadı" });
    }
  });

  app.get("/api/auto-responses/:id", async (req, res) => {
    try {
      const autoResponse = await storage.getAutoResponse(Number(req.params.id));
      if (!autoResponse) {
        return res.status(404).json({ error: "Otomatik yanit bulunamadı" });
      }
      res.json(autoResponse);
    } catch (err) {
      res.status(500).json({ error: "Otomatik yanit alınamadı" });
    }
  });

  app.post("/api/auto-responses", async (req, res) => {
    try {
      const { name, keywords, keywordsEn, response, responseEn, priority, isActive } = req.body;
      
      if (!name || !keywords || !response) {
        return res.status(400).json({ error: "Kural adi, anahtar kelimeler ve yanit metni zorunlu" });
      }
      
      // Validate keywords JSON
      try {
        const parsedKeywords = JSON.parse(keywords);
        if (!Array.isArray(parsedKeywords) || parsedKeywords.length === 0) {
          return res.status(400).json({ error: "Anahtar kelimeler bir dizi olmali ve en az bir kelime icermeli" });
        }
      } catch {
        return res.status(400).json({ error: "Anahtar kelimeler geçerli bir JSON dizisi olmali" });
      }
      
      // Validate English keywords JSON if provided
      if (keywordsEn) {
        try {
          const parsedKeywordsEn = JSON.parse(keywordsEn);
          if (!Array.isArray(parsedKeywordsEn)) {
            return res.status(400).json({ error: "Ingilizce anahtar kelimeler bir dizi olmali" });
          }
        } catch {
          return res.status(400).json({ error: "Ingilizce anahtar kelimeler geçerli bir JSON dizisi olmali" });
        }
      }
      
      const autoResponse = await storage.createAutoResponse({
        name,
        keywords,
        keywordsEn: keywordsEn || "[]",
        response,
        responseEn: responseEn || "",
        priority: priority ?? 0,
        isActive: isActive ?? true
      });
      
      res.status(201).json(autoResponse);
    } catch (err) {
      console.error("Otomatik yanit oluşturma hatası:", err);
      res.status(400).json({ error: "Otomatik yanit oluşturulamadi" });
    }
  });

  app.patch("/api/auto-responses/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, keywords, keywordsEn, response, responseEn, priority, isActive } = req.body;
      
      // Validate keywords JSON if provided
      if (keywords !== undefined) {
        try {
          const parsedKeywords = JSON.parse(keywords);
          if (!Array.isArray(parsedKeywords)) {
            return res.status(400).json({ error: "Anahtar kelimeler bir dizi olmali" });
          }
        } catch {
          return res.status(400).json({ error: "Anahtar kelimeler geçerli bir JSON dizisi olmali" });
        }
      }
      
      // Validate English keywords JSON if provided
      if (keywordsEn !== undefined && keywordsEn !== "") {
        try {
          const parsedKeywordsEn = JSON.parse(keywordsEn);
          if (!Array.isArray(parsedKeywordsEn)) {
            return res.status(400).json({ error: "Ingilizce anahtar kelimeler bir dizi olmali" });
          }
        } catch {
          return res.status(400).json({ error: "Ingilizce anahtar kelimeler geçerli bir JSON dizisi olmali" });
        }
      }
      
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (keywords !== undefined) updateData.keywords = keywords;
      if (keywordsEn !== undefined) updateData.keywordsEn = keywordsEn;
      if (response !== undefined) updateData.response = response;
      if (responseEn !== undefined) updateData.responseEn = responseEn;
      if (priority !== undefined) updateData.priority = priority;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const updated = await storage.updateAutoResponse(id, updateData);
      res.json(updated);
    } catch (err) {
      console.error("Otomatik yanit güncelleme hatası:", err);
      res.status(400).json({ error: "Otomatik yanit güncellenemedi" });
    }
  });

  app.delete("/api/auto-responses/:id", async (req, res) => {
    try {
      await storage.deleteAutoResponse(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: "Otomatik yanit silinemedi" });
    }
  });

  // === REQUEST MESSAGE TEMPLATES ===
  
  // Get all request message templates
  app.get("/api/request-message-templates", async (req, res) => {
    try {
      // Seed default templates if none exist
      await storage.seedDefaultRequestMessageTemplates();
      const templates = await storage.getRequestMessageTemplates();
      res.json(templates);
    } catch (err) {
      console.error("Mesaj sablonlari alınamadı:", err);
      res.status(500).json({ error: "Mesaj sablonlari alınamadı" });
    }
  });

  // Get single request message template
  app.get("/api/request-message-templates/:id", async (req, res) => {
    try {
      const template = await storage.getRequestMessageTemplate(Number(req.params.id));
      if (!template) {
        return res.status(404).json({ error: "Sablon bulunamadı" });
      }
      res.json(template);
    } catch (err) {
      res.status(500).json({ error: "Sablon alınamadı" });
    }
  });

  // Create request message template
  app.post("/api/request-message-templates", async (req, res) => {
    try {
      const { name, templateType, messageContent, isDefault, isActive } = req.body;
      
      if (!name || !templateType || !messageContent) {
        return res.status(400).json({ error: "Sablon adi, tipi ve içerik zorunlu" });
      }
      
      const template = await storage.createRequestMessageTemplate({
        name,
        templateType,
        messageContent,
        isDefault: isDefault ?? false,
        isActive: isActive ?? true
      });
      res.status(201).json(template);
    } catch (err) {
      console.error("Sablon oluşturma hatası:", err);
      res.status(400).json({ error: "Sablon oluşturulamadi" });
    }
  });

  // Update request message template
  app.patch("/api/request-message-templates/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, templateType, messageContent, isDefault, isActive } = req.body;
      
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (templateType !== undefined) updateData.templateType = templateType;
      if (messageContent !== undefined) updateData.messageContent = messageContent;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const updated = await storage.updateRequestMessageTemplate(id, updateData);
      res.json(updated);
    } catch (err) {
      console.error("Sablon güncelleme hatası:", err);
      res.status(400).json({ error: "Sablon güncellenemedi" });
    }
  });

  // Delete request message template
  app.delete("/api/request-message-templates/:id", async (req, res) => {
    try {
      await storage.deleteRequestMessageTemplate(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: "Sablon silinemedi" });
    }
  });

  // === TENANT PLAN & SUBSCRIPTION ===
  
  // Get current tenant plan status
  app.get("/api/tenant/plan", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant bulunamadı" });
      }
      
      const usage = await storage.getTenantUsage(tenantId);
      const verification = await storage.verifyTenantPlan(tenantId);
      res.json({ 
        tenant, 
        usage,
        plan: verification.plan,
        status: verification
      });
    } catch (err) {
      console.error("Plan bilgisi alınamadı:", err);
      res.status(500).json({ error: "Plan bilgisi alınamadı" });
    }
  });

  // Verify tenant plan
  app.get("/api/tenant/plan/verify", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }
      
      const verification = await storage.verifyTenantPlan(tenantId);
      res.json(verification);
    } catch (err) {
      console.error("Plan doğrulama hatası:", err);
      res.status(500).json({ error: "Plan doğrulanamadı" });
    }
  });

  // Legacy license endpoint - redirects to tenant plan
  app.get("/api/license", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant bulunamadı" });
      }
      
      const usage = await storage.getTenantUsage(tenantId);
      const verification = await storage.verifyTenantPlan(tenantId);
      
      // Return in legacy format for backward compatibility
      res.json({ 
        license: {
          id: tenant.id,
          agencyName: tenant.name,
          agencyEmail: tenant.contactEmail,
          planType: tenant.planCode,
          planName: verification.plan?.name || 'Deneme',
          maxActivities: verification.plan?.maxActivities || 5,
          maxReservationsPerMonth: verification.plan?.maxReservationsPerMonth || 50,
          isActive: tenant.isActive,
        }, 
        usage,
        status: verification
      });
    } catch (err) {
      console.error("Lisans bilgisi alınamadı:", err);
      res.status(500).json({ error: "Lisans bilgisi alınamadı" });
    }
  });

  // Legacy verify endpoint
  app.get("/api/license/verify", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }
      
      const verification = await storage.verifyTenantPlan(tenantId);
      res.json(verification);
    } catch (err) {
      console.error("Lisans doğrulama hatası:", err);
      res.status(500).json({ error: "Lisans doğrulanamadi" });
    }
  });

  // Update tenant plan (replaces license update)
  app.patch("/api/tenant/:id/plan", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { planCode } = req.body;
      
      if (!planCode) {
        return res.status(400).json({ error: "Plan kodu zorunludur" });
      }
      
      const updated = await storage.updateTenant(id, { planCode });
      res.json(updated);
    } catch (err) {
      console.error("Plan güncelleme hatası:", err);
      res.status(400).json({ error: "Plan güncellenemedi" });
    }
  });

  // Get tenant usage statistics
  app.get("/api/tenant/usage", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }
      
      const usage = await storage.getTenantUsage(tenantId);
      const verification = await storage.verifyTenantPlan(tenantId);
      
      res.json({
        usage,
        limits: verification.plan ? {
          maxActivities: verification.plan.maxActivities,
          maxReservationsPerMonth: verification.plan.maxReservationsPerMonth
        } : null
      });
    } catch (err) {
      console.error("Kullanim bilgisi alınamadı:", err);
      res.status(500).json({ error: "Kullanim bilgisi alınamadı" });
    }
  });

  // Legacy license usage endpoint (backward compatibility)
  app.get("/api/license/usage", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }
      
      const usage = await storage.getTenantUsage(tenantId);
      const verification = await storage.verifyTenantPlan(tenantId);
      
      res.json({
        usage,
        limits: verification.plan ? {
          maxActivities: verification.plan.maxActivities,
          maxReservationsPerMonth: verification.plan.maxReservationsPerMonth
        } : null
      });
    } catch (err) {
      console.error("Kullanim bilgisi alınamadı:", err);
      res.status(500).json({ error: "Kullanim bilgisi alınamadı" });
    }
  });

  // === USER SUBSCRIPTION USAGE ===

  // Get current user's subscription usage stats
  app.get("/api/subscription/usage", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      }

      const user = await storage.getAppUser(Number(userId));
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      // Get current plan based on user's membershipType
      const plans = await storage.getSubscriptionPlans();
      const currentPlan = plans.find(p => p.code === user.membershipType) || plans.find(p => p.code === "trial");
      
      // Get actual usage counts
      const tenantId = req.session?.tenantId;
      const activities = await storage.getActivities(tenantId);
      const activitiesUsed = activities.length;

      // Get reservations for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const allReservations = await storage.getReservations(tenantId);
      const reservationsThisMonth = allReservations.filter(r => {
        const createdAt = r.createdAt ? new Date(r.createdAt) : null;
        return createdAt && createdAt >= startOfMonth;
      }).length;

      // Get user count for tenant
      const allUsers = await storage.getAppUsers();
      const tenantUsers = user.tenantId 
        ? allUsers.filter(u => u.tenantId === user.tenantId).length 
        : allUsers.length;

      // Calculate days remaining
      let daysRemaining: number | null = null;
      if (user.membershipEndDate) {
        const endDate = new Date(user.membershipEndDate);
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Get daily usage stats
      let dailyMessagesUsed = 0;
      let maxDailyMessages = currentPlan?.maxDailyMessages || 50;
      let dailyReservationsUsed = 0;
      let maxDailyReservations = currentPlan?.maxDailyReservations || 10;

      if (tenantId) {
        const messageUsage = await storage.getTenantMessageLimit(tenantId);
        dailyMessagesUsed = messageUsage.used;
        maxDailyMessages = messageUsage.limit;

        const reservationUsage = await storage.getTenantDailyReservationUsage(tenantId);
        dailyReservationsUsed = reservationUsage.used;
        maxDailyReservations = reservationUsage.limit;
      }

      res.json({
        activitiesUsed,
        maxActivities: currentPlan?.maxActivities || 5,
        reservationsThisMonth,
        maxReservationsPerMonth: currentPlan?.maxReservationsPerMonth || 100,
        usersCount: tenantUsers,
        maxUsers: currentPlan?.maxUsers || 1,
        daysRemaining,
        planName: currentPlan?.name || "Deneme",
        dailyMessagesUsed,
        maxDailyMessages,
        dailyReservationsUsed,
        maxDailyReservations,
      });
    } catch (err) {
      console.error("Usage stats error:", err);
      res.status(500).json({ error: "Kullanım bilgileri alınamadı" });
    }
  });

  // === SUBSCRIPTION PLANS (Super Admin) ===

  // Get all subscription plans
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (err) {
      console.error("Plan listesi hatası:", err);
      res.status(500).json({ error: "Planlar alınamadı" });
    }
  });

  // Get single subscription plan
  app.get("/api/subscription-plans/:id", async (req, res) => {
    try {
      const plan = await storage.getSubscriptionPlan(Number(req.params.id));
      if (!plan) {
        return res.status(404).json({ error: "Plan bulunamadı" });
      }
      res.json(plan);
    } catch (err) {
      console.error("Plan detay hatası:", err);
      res.status(500).json({ error: "Plan alınamadı" });
    }
  });

  // Create subscription plan (with Zod validation)
  app.post("/api/subscription-plans", async (req, res) => {
    try {
      // Validate features as JSON array string
      const planSchema = insertSubscriptionPlanSchema.extend({
        features: z.string().optional().refine((val) => {
          if (!val) return true;
          try { JSON.parse(val); return true; } catch { return false; }
        }, { message: "features must be valid JSON array" }),
      });
      const parsed = planSchema.parse(req.body);
      const plan = await storage.createSubscriptionPlan(parsed);
      res.json(plan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      console.error("Plan oluşturma hatası:", err);
      res.status(500).json({ error: "Plan oluşturulamadi" });
    }
  });

  // Update subscription plan (with Zod validation)
  app.patch("/api/subscription-plans/:id", async (req, res) => {
    try {
      // Validate features as JSON array string (partial for updates)
      const updateSchema = insertSubscriptionPlanSchema.partial().extend({
        features: z.string().optional().refine((val) => {
          if (!val) return true;
          try { JSON.parse(val); return true; } catch { return false; }
        }, { message: "features must be valid JSON array" }),
      });
      const parsed = updateSchema.parse(req.body);
      const plan = await storage.updateSubscriptionPlan(Number(req.params.id), parsed);
      res.json(plan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      console.error("Plan güncelleme hatası:", err);
      res.status(500).json({ error: "Plan güncellenemedi" });
    }
  });

  // Delete subscription plan
  app.delete("/api/subscription-plans/:id", async (req, res) => {
    try {
      await storage.deleteSubscriptionPlan(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Plan silme hatası:", err);
      res.status(500).json({ error: "Plan silinemedi" });
    }
  });

  // === MESSAGE USAGE TRACKING ===
  
  // Get current tenant's message usage stats
  app.get("/api/message-usage", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const stats = await storage.getTenantMessageLimit(tenantId);
      res.json(stats);
    } catch (err) {
      console.error("Mesaj kullanım istatistiği hatası:", err);
      res.status(500).json({ error: "İstatistikler alınamadı" });
    }
  });
  
  // Super Admin: Get message usage for all tenants
  app.get("/api/super-admin/message-usage", async (req, res) => {
    try {
      const isPlatformAdmin = req.session?.isPlatformAdmin;
      if (!isPlatformAdmin) {
        return res.status(403).json({ error: "Yetkisiz erişim" });
      }
      
      const allTenants = await storage.getTenants();
      const today = new Date().toISOString().split('T')[0];
      
      const usageByTenant = await Promise.all(
        allTenants.map(async (tenant: { id: number; name: string; planCode: string | null }) => {
          const stats = await storage.getTenantMessageLimit(tenant.id);
          return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            planCode: tenant.planCode,
            ...stats,
            usagePercentage: stats.limit > 0 ? Math.round((stats.used / stats.limit) * 100) : 0
          };
        })
      );
      
      res.json({
        date: today,
        tenants: usageByTenant.sort((a: { usagePercentage: number }, b: { usagePercentage: number }) => b.usagePercentage - a.usagePercentage)
      });
    } catch (err) {
      console.error("Super Admin mesaj kullanım hatası:", err);
      res.status(500).json({ error: "İstatistikler alınamadı" });
    }
  });

  // === TENANTS (Multi-Tenant Management) ===

  // Get all tenants
  app.get("/api/tenants", async (req, res) => {
    try {
      const allTenants = await storage.getTenants();
      res.json(allTenants);
    } catch (err) {
      console.error("Tenant listesi hatası:", err);
      res.status(500).json({ error: "Tenant listesi alınamadı" });
    }
  });

  // Get single tenant
  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.id));
      if (!tenant) {
        return res.status(404).json({ error: "Tenant bulunamadı" });
      }
      res.json(tenant);
    } catch (err) {
      console.error("Tenant detay hatası:", err);
      res.status(500).json({ error: "Tenant alınamadı" });
    }
  });

  // Create tenant with admin user
  app.post("/api/tenants", async (req, res) => {
    try {
      const { name, slug, contactEmail, contactPhone, address, logoUrl, primaryColor, accentColor, timezone, language, planCode, adminUsername, adminEmail, adminPassword, adminName, licenseDuration } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Tenant adi ve slug zorunludur" });
      }

      // Check if slug is unique
      const existingTenant = await storage.getTenantBySlug(slug);
      if (existingTenant) {
        return res.status(400).json({ error: "Bu slug zaten kullaniliyor" });
      }

      // Validate admin user info if provided
      if (adminUsername || adminEmail || adminPassword) {
        if (!adminUsername || !adminEmail || !adminPassword) {
          return res.status(400).json({ error: "Admin kullanıcı için username, email ve password zorunludur" });
        }
        // Check if username or email already exists
        const existingUsername = await storage.getAppUserByUsername(adminUsername);
        if (existingUsername) {
          return res.status(400).json({ error: "Bu kullanıcı adi zaten kullaniliyor" });
        }
        const existingEmail = await storage.getAppUserByEmail(adminEmail);
        if (existingEmail) {
          return res.status(400).json({ error: "Bu e-posta zaten kullaniliyor" });
        }
      }

      const tenant = await storage.createTenant({
        name,
        slug,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || "262 83% 58%",
        accentColor: accentColor || "142 76% 36%",
        timezone: timezone || "Europe/Istanbul",
        language: language || "tr",
        planCode: planCode || "trial",
        isActive: true,
        // Default website settings
        websiteEnabled: false,
        websiteTitle: name,
        websiteDescription: `${name} - Tur ve aktivite rezervasyonları`,
        websiteAboutText: `${name} olarak size en iyi tur ve aktivite deneyimlerini sunuyoruz.`,
        websiteContactEmail: contactEmail || null,
        websiteContactPhone: contactPhone || null,
        websiteContactAddress: address || null,
        websiteContactPageTitle: "İletişim",
        websiteContactPageContent: "Sorularınız için bizimle iletişime geçebilirsiniz.",
        websiteAboutPageTitle: "Hakkımızda",
        websiteAboutPageContent: `${name} olarak uzun yıllardır sektörde hizmet vermekteyiz. Müşteri memnuniyeti odaklı yaklaşımımızla unutulmaz deneyimler sunuyoruz.`,
        websiteCancellationPageTitle: "İptal ve İade Politikası",
        websiteCancellationPageContent: "Rezervasyonunuzu aktivite tarihinden en az 24 saat önce iptal etmeniz durumunda tam iade yapılmaktadır.",
        websitePrivacyPageTitle: "Gizlilik Politikası",
        websitePrivacyPageContent: "Kişisel verileriniz güvenle korunmaktadır. Bilgileriniz üçüncü şahıslarla paylaşılmaz.",
        websiteTermsPageTitle: "Kullanım Şartları",
        websiteTermsPageContent: "Web sitemizi kullanarak bu şartları kabul etmiş sayılırsınız.",
        websiteFaqPageTitle: "Sıkça Sorulan Sorular",
        websiteFaqPageContent: "[]",
        websiteSocialLinks: "{}",
        websiteLanguages: '["tr"]',
      });

      // Create admin user for this tenant if provided
      let adminUser = null;
      if (adminUsername && adminEmail && adminPassword) {
        const passwordHash = hashPassword(adminPassword);
        
        // Calculate membership end date based on licenseDuration (in days)
        // 0 = unlimited (null), any positive number = that many days
        let membershipEndDate: Date | null = null;
        const parsedDuration = parseInt(licenseDuration);
        const durationDays = isNaN(parsedDuration) ? 30 : parsedDuration; // Default 30 if not provided
        if (durationDays > 0) {
          membershipEndDate = new Date();
          membershipEndDate.setDate(membershipEndDate.getDate() + durationDays);
        }
        // If durationDays is 0 or less, membershipEndDate stays null (unlimited)
        
        adminUser = await storage.createAppUser({
          tenantId: tenant.id,
          username: adminUsername,
          email: adminEmail,
          passwordHash,
          name: adminName || name + " Admin",
          phone: contactPhone || null,
          companyName: name,
          membershipType: durationDays <= 14 ? 'trial' : 'professional',
          membershipStartDate: new Date(),
          membershipEndDate,
          planId: null,
          maxActivities: 50,
          maxReservationsPerMonth: 1000,
          notes: `${name} acentasi yönetiçi hesabı`,
          isActive: true,
        });

        // Find and assign "tenant_owner" role to this user (Owner of the agency)
        const roles = await storage.getRoles();
        const ownerRole = roles.find(r => r.name === 'tenant_owner');
        if (ownerRole) {
          await storage.assignUserRole({ userId: adminUser.id, roleId: ownerRole.id });
        }
      }

      // Create default WhatsApp bot rules (auto responses) for the new tenant
      const defaultAutoResponses = [
        {
          tenantId: tenant.id,
          name: "Fiyat Bilgisi",
          keywords: JSON.stringify(["fiyat", "ücret", "ne kadar", "kaç para", "kaç tl", "ucuz", "pahalı"]),
          keywordsEn: JSON.stringify(["price", "cost", "how much", "fee", "rate"]),
          response: "Fiyat bilgisi için lütfen aktivite sayfamızı ziyaret edin veya temsilcimizle görüşmek için bekleyin.",
          responseEn: "For pricing information, please visit our activity page or wait to speak with our representative.",
          priority: 10,
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Rezervasyon Durumu",
          keywords: JSON.stringify(["rezervasyon", "booking", "kayıt", "yer ayırtma", "randevu"]),
          keywordsEn: JSON.stringify(["reservation", "booking", "appointment", "schedule"]),
          response: "Rezervasyon durumunuzu kontrol etmek için rezervasyon numaranızı paylaşabilir misiniz?",
          responseEn: "To check your reservation status, could you please share your reservation number?",
          priority: 9,
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "İptal/Değişiklik",
          keywords: JSON.stringify(["iptal", "değişiklik", "tarih değiştir", "saat değiştir", "erteleme"]),
          keywordsEn: JSON.stringify(["cancel", "change", "reschedule", "modify", "postpone"]),
          response: "Rezervasyon iptali veya değişikliği için lütfen rezervasyon numaranızı ve talebinizi belirtin. Temsilcimiz en kısa sürede size dönüş yapacaktır.",
          responseEn: "For cancellation or modification, please provide your reservation number and request. Our representative will get back to you shortly.",
          priority: 8,
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Çalışma Saatleri",
          keywords: JSON.stringify(["saat", "çalışma saati", "açık mı", "kapalı mı", "ne zaman"]),
          keywordsEn: JSON.stringify(["hours", "open", "closed", "when", "time"]),
          response: "Çalışma saatlerimiz hakkında bilgi almak için web sitemizi ziyaret edebilir veya mesai saatleri içinde bizi arayabilirsiniz.",
          responseEn: "For our working hours, please visit our website or call us during business hours.",
          priority: 5,
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Selamlama",
          keywords: JSON.stringify(["merhaba", "selam", "günaydın", "iyi günler", "iyi akşamlar"]),
          keywordsEn: JSON.stringify(["hello", "hi", "good morning", "good evening", "hey"]),
          response: "Merhaba! Size nasıl yardımcı olabiliriz?",
          responseEn: "Hello! How can we help you?",
          priority: 1,
          isActive: true
        }
      ];

      for (const autoResponse of defaultAutoResponses) {
        await storage.createAutoResponse(autoResponse);
      }

      // Create default request message templates for the new tenant
      const defaultMessageTemplates = [
        {
          tenantId: tenant.id,
          name: "Talep Onaylandı",
          templateType: "approved",
          messageContent: "Sayın {customerName}, {requestType} talebiniz onaylanmıştır. Teşekkür ederiz.",
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Talep Değerlendiriliyor",
          templateType: "pending",
          messageContent: "Sayın {customerName}, {requestType} talebiniz değerlendirilmektedir. En kısa sürede size dönüş yapacağız.",
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Talep Reddedildi",
          templateType: "rejected",
          messageContent: "Sayın {customerName}, üzgünüz ancak {requestType} talebinizi karşılayamıyoruz. Detaylar için bizimle iletişime geçebilirsiniz.",
          isActive: true
        }
      ];

      for (const template of defaultMessageTemplates) {
        await storage.createRequestMessageTemplate(template);
      }

      // Create default bot settings for the new tenant
      // Use the complete DEFAULT_BOT_RULES defined at the top of this file
      const tenantBotRules = DEFAULT_BOT_RULES.replace(/Sky Fethiye/g, name);

      const defaultBotPrompt = `Sen ${name} bünyesinde görev yapan, profesyonel bir müşteri danışmanısın. Temel görevin; turizm aktiviteleri için rezervasyon almak, müsaitlik sorgulamak ve müşteri sorularını kurumsal bir dille yanıtlamaktır. Kendini asla bir yapay zeka olarak tanıtma; her zaman profesyonel bir çalışan rolünde kal.`;

      const defaultBotAccess = JSON.stringify({
        enabled: true,
        activities: true,
        packageTours: true,
        capacity: true,
        faq: true,
        confirmation: true,
        transfer: true,
        extras: true
      });

      await storage.setSetting('botRules', tenantBotRules, tenant.id);
      await storage.setSetting('botPrompt', defaultBotPrompt, tenant.id);
      await storage.setSetting('botAccess', defaultBotAccess, tenant.id);

      res.json({ tenant, adminUser });
    } catch (err) {
      console.error("Tenant oluşturma hatası:", err);
      res.status(500).json({ error: "Tenant oluşturulamadi" });
    }
  });

  // Update tenant
  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const tenantId = Number(req.params.id);
      const { licenseDuration, ...tenantData } = req.body;
      
      // Update tenant basic info
      const tenant = await storage.updateTenant(tenantId, tenantData);
      
      // If licenseDuration is provided, update the admin user's membershipEndDate
      if (licenseDuration !== undefined && licenseDuration !== "0") {
        const allUsers = await storage.getAppUsers();
        const tenantUsers = allUsers.filter(u => u.tenantId === tenantId);
        
        if (tenantUsers.length > 0) {
          const adminUser = tenantUsers[0];
          const extensionDays = parseInt(licenseDuration);
          
          if (extensionDays === -1) {
            // Set to unlimited (null)
            await storage.updateAppUser(adminUser.id, { membershipEndDate: null });
          } else if (extensionDays > 0) {
            // Calculate new end date based on current end date or today
            let baseDate = new Date();
            if (adminUser.membershipEndDate) {
              const currentEndDate = new Date(adminUser.membershipEndDate);
              // If current end date is in the future, extend from there
              if (currentEndDate > baseDate) {
                baseDate = currentEndDate;
              }
            }
            baseDate.setDate(baseDate.getDate() + extensionDays);
            await storage.updateAppUser(adminUser.id, { membershipEndDate: baseDate });
          }
        }
      }
      
      res.json(tenant);
    } catch (err) {
      console.error("Tenant güncelleme hatası:", err);
      res.status(500).json({ error: "Tenant güncellenemedi" });
    }
  });

  // Delete tenant
  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      await storage.deleteTenant(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Tenant silme hatası:", err);
      res.status(500).json({ error: "Tenant silinemedi" });
    }
  });

  // Reset tenant admin password (Super Admin only)
  app.post("/api/tenants/:id/reset-admin-password", async (req, res) => {
    try {
      const tenantId = Number(req.params.id);
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
      }
      
      // Find the admin user for this tenant - get all users and filter by tenantId
      const allUsers = await storage.getAppUsers();
      const tenantUsers = allUsers.filter(u => u.tenantId === tenantId);
      
      if (tenantUsers.length === 0) {
        return res.status(404).json({ error: "Bu acenta için kullanıcı bulunamadı" });
      }
      
      // Get the first user (admin) for this tenant
      const adminUser = tenantUsers[0];
      
      // Hash the new password using our custom PBKDF2 format
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');
      const hashedPassword = `${salt}:${hash}`;
      
      // Update the password
      await storage.updateAppUser(adminUser.id, { passwordHash: hashedPassword });
      
      res.json({ success: true, message: "Yönetici şifresi değiştirildi" });
    } catch (err) {
      console.error("Şifre sıfırlama hatası:", err);
      res.status(500).json({ error: "Şifre değiştirilemedi" });
    }
  });

  // Get tenant by slug
  app.get("/api/tenants/by-slug/:slug", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant bulunamadı" });
      }
      res.json(tenant);
    } catch (err) {
      console.error("Tenant slug sorgu hatası:", err);
      res.status(500).json({ error: "Tenant alınamadı" });
    }
  });

  // === PLAN FEATURES ===

  // Get all plan features
  app.get("/api/plan-features", async (req, res) => {
    try {
      const features = await storage.getPlanFeatures();
      res.json(features);
    } catch (err) {
      console.error("Özellik listesi hatası:", err);
      res.status(500).json({ error: "Özellikler alınamadı" });
    }
  });

  // Create plan feature
  app.post("/api/plan-features", async (req, res) => {
    try {
      const feature = await storage.createPlanFeature(req.body);
      res.json(feature);
    } catch (err) {
      console.error("Özellik oluşturma hatası:", err);
      res.status(500).json({ error: "Özellik oluşturulamadi" });
    }
  });

  // Update plan feature
  app.patch("/api/plan-features/:id", async (req, res) => {
    try {
      const feature = await storage.updatePlanFeature(Number(req.params.id), req.body);
      res.json(feature);
    } catch (err) {
      console.error("Özellik güncelleme hatası:", err);
      res.status(500).json({ error: "Özellik güncellenemedi" });
    }
  });

  // Delete plan feature
  app.delete("/api/plan-features/:id", async (req, res) => {
    try {
      await storage.deletePlanFeature(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Özellik silme hatası:", err);
      res.status(500).json({ error: "Özellik silinemedi" });
    }
  });

  // === SUBSCRIPTIONS ===

  // Get all subscriptions
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const subs = await storage.getSubscriptions();
      res.json(subs);
    } catch (err) {
      console.error("Abonelik listesi hatası:", err);
      res.status(500).json({ error: "Abonelikler alınamadı" });
    }
  });

  // Get subscription payments
  app.get("/api/subscription-payments", async (req, res) => {
    try {
      const payments = await storage.getSubscriptionPayments();
      res.json(payments);
    } catch (err) {
      console.error("Ödeme listesi hatası:", err);
      res.status(500).json({ error: "Ödemeler alınamadı" });
    }
  });

  // Create subscription payment (manual)
  app.post("/api/subscription-payments", async (req, res) => {
    try {
      const payment = await storage.createSubscriptionPayment(req.body);
      res.json(payment);
    } catch (err) {
      console.error("Ödeme oluşturma hatası:", err);
      res.status(500).json({ error: "Ödeme oluşturulamadi" });
    }
  });

  // === SUPER ADMIN - ANNOUNCEMENTS ===
  
  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (err) {
      console.error("Duyuru listesi hatası:", err);
      res.status(500).json({ error: "Duyurular alınamadı" });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    try {
      const announcement = await storage.createAnnouncement(req.body);
      res.json(announcement);
    } catch (err) {
      console.error("Duyuru oluşturma hatası:", err);
      res.status(500).json({ error: "Duyuru oluşturulamadi" });
    }
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    try {
      const announcement = await storage.updateAnnouncement(Number(req.params.id), req.body);
      res.json(announcement);
    } catch (err) {
      console.error("Duyuru güncelleme hatası:", err);
      res.status(500).json({ error: "Duyuru güncellenemedi" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      await storage.deleteAnnouncement(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Duyuru silme hatası:", err);
      res.status(500).json({ error: "Duyuru silinemedi" });
    }
  });

  // === SUPER ADMIN - INVOICES ===
  
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (err) {
      console.error("Fatura listesi hatası:", err);
      res.status(500).json({ error: "Faturalar alınamadı" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.json(invoice);
    } catch (err) {
      console.error("Fatura oluşturma hatası:", err);
      res.status(500).json({ error: "Fatura oluşturulamadi" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(Number(req.params.id), req.body);
      res.json(invoice);
    } catch (err) {
      console.error("Fatura güncelleme hatası:", err);
      res.status(500).json({ error: "Fatura güncellenemedi" });
    }
  });

  // === SUPER ADMIN - API STATUS MONITORING ===
  
  app.get("/api/api-status", async (req, res) => {
    try {
      const status = await storage.getApiStatusLogs();
      res.json(status);
    } catch (err) {
      console.error("API durum hatası:", err);
      res.status(500).json({ error: "API durumu alınamadı" });
    }
  });

  app.post("/api/api-status/check", async (req, res) => {
    try {
      const results = await storage.checkApiStatus();
      res.json(results);
    } catch (err) {
      console.error("API kontrol hatası:", err);
      res.status(500).json({ error: "API kontrolu yapılamadı" });
    }
  });

  // === SUPER ADMIN - BOT QUALITY SCORES ===
  
  app.get("/api/bot-quality", async (req, res) => {
    try {
      const scores = await storage.getBotQualityScores();
      res.json(scores);
    } catch (err) {
      console.error("Bot kalite hatası:", err);
      res.status(500).json({ error: "Bot kalite verileri alınamadı" });
    }
  });

  app.get("/api/bot-quality/stats", async (req, res) => {
    try {
      const stats = await storage.getBotQualityStats();
      res.json(stats);
    } catch (err) {
      console.error("Bot kalite istatistik hatası:", err);
      res.status(500).json({ error: "Bot istatistikleri alınamadı" });
    }
  });

  // === SUPER ADMIN - TENANT MANAGEMENT ===
  
  app.get("/api/tenants", async (req, res) => {
    try {
      const allTenants = await storage.getTenants();
      res.json(allTenants);
    } catch (err) {
      console.error("Tenant listesi hatası:", err);
      res.status(500).json({ error: "Tenant'lar alınamadı" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.get("/api/licenses", async (req, res) => {
    try {
      const allTenants = await storage.getTenants();
      // Map to license-like format for backward compatibility
      const licenseLike = allTenants.map(t => ({
        id: t.id,
        agencyName: t.name,
        agencyEmail: t.contactEmail,
        planType: t.planCode,
        isActive: t.isActive,
        createdAt: t.createdAt
      }));
      res.json(licenseLike);
    } catch (err) {
      console.error("Lisans listesi hatası:", err);
      res.status(500).json({ error: "Lisanslar alınamadı" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.updateTenant(Number(req.params.id), req.body);
      res.json(tenant);
    } catch (err) {
      console.error("Tenant güncelleme hatası:", err);
      res.status(500).json({ error: "Tenant güncellenemedi" });
    }
  });

  app.post("/api/tenants/:id/suspend", async (req, res) => {
    try {
      const tenant = await storage.suspendTenant(Number(req.params.id));
      res.json(tenant);
    } catch (err) {
      console.error("Tenant askiya alma hatası:", err);
      res.status(500).json({ error: "Tenant askiya alınamadı" });
    }
  });

  app.post("/api/tenants/:id/activate", async (req, res) => {
    try {
      const tenant = await storage.activateTenant(Number(req.params.id));
      res.json(tenant);
    } catch (err) {
      console.error("Tenant aktifleştirme hatası:", err);
      res.status(500).json({ error: "Tenant aktifleştirilemedi" });
    }
  });

  // === SUPER ADMIN - ANALYTICS ===
  
  app.get("/api/analytics/platform", async (req, res) => {
    try {
      const analytics = await storage.getPlatformAnalytics();
      res.json(analytics);
    } catch (err) {
      console.error("Platform analitik hatası:", err);
      res.status(500).json({ error: "Analitik verileri alınamadı" });
    }
  });

  app.get("/api/analytics/whatsapp", async (req, res) => {
    try {
      const stats = await storage.getWhatsAppStats();
      res.json(stats);
    } catch (err) {
      console.error("WhatsApp istatistik hatası:", err);
      res.status(500).json({ error: "WhatsApp istatistikleri alınamadı" });
    }
  });

  // === PLATFORM ADMINS ===
  
  app.get("/api/platform-admins", async (req, res) => {
    try {
      const admins = await storage.getPlatformAdmins();
      res.json(admins);
    } catch (err) {
      console.error("Platform admin hatası:", err);
      res.status(500).json({ error: "Adminler alınamadı" });
    }
  });

  app.post("/api/platform-admins", async (req, res) => {
    try {
      const { email, name, password, role } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "E-posta, ad ve şifre gerekli" });
      }
      
      // Check if email already exists
      const existing = await storage.getPlatformAdminByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Bu e-posta adresi zaten kullaniliyor" });
      }
      
      // Hash the password
      const passwordHash = hashPassword(password);
      
      const admin = await storage.createPlatformAdmin({
        email,
        name,
        passwordHash,
        role: role || 'admin',
        isActive: true
      });
      res.json(admin);
    } catch (err) {
      console.error("Platform admin oluşturma hatası:", err);
      res.status(500).json({ error: "Admin oluşturulamadi" });
    }
  });

  app.patch("/api/platform-admins/:id", async (req, res) => {
    try {
      const admin = await storage.updatePlatformAdmin(Number(req.params.id), req.body);
      res.json(admin);
    } catch (err) {
      console.error("Platform admin güncelleme hatası:", err);
      res.status(500).json({ error: "Admin güncellenemedi" });
    }
  });

  app.delete("/api/platform-admins/:id", async (req, res) => {
    try {
      const adminIdToDelete = Number(req.params.id);
      const currentAdminId = req.session?.platformAdminId;
      
      // Prevent self-deletion
      if (currentAdminId && currentAdminId === adminIdToDelete) {
        return res.status(400).json({ error: "Kendinizi silemezsiniz" });
      }
      
      await storage.deletePlatformAdmin(adminIdToDelete);
      res.json({ success: true });
    } catch (err) {
      console.error("Platform admin silme hatası:", err);
      res.status(500).json({ error: "Admin silinemedi" });
    }
  });

  // === DATABASE EXPORT/IMPORT (Super Admin) ===
  
  app.get("/api/admin/database/export", async (req, res) => {
    try {
      if (!req.session?.platformAdminId) {
        return res.status(401).json({ error: "Platform admin girişi gerekli" });
      }
      
      // Export all critical tables
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        tables: {
          subscription_plans: await storage.getSubscriptionPlans(),
          plan_features: await storage.getPlanFeatures(),
          tenants: await storage.getTenants(),
          app_users: await storage.getAppUsers(),
          roles: await storage.getRoles(),
          permissions: await storage.getPermissions(),
          platform_admins: await storage.getPlatformAdmins(),
          announcements: await storage.getAnnouncements(),
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=smartur-db-export-${new Date().toISOString().split('T')[0]}.json`);
      res.json(exportData);
    } catch (err) {
      console.error("Database export hatası:", err);
      res.status(500).json({ error: "Veritabanı dışa aktarılamadı" });
    }
  });

  app.post("/api/admin/database/import", async (req, res) => {
    try {
      if (!req.session?.platformAdminId) {
        return res.status(401).json({ error: "Platform admin girişi gerekli" });
      }
      
      const { tables, mode } = req.body;
      // mode: 'merge' (sadece eksikleri ekle) veya 'replace' (tümünü değiştir)
      
      if (!tables) {
        return res.status(400).json({ error: "Geçersiz veri formatı" });
      }
      
      const results: Record<string, { added: number; skipped: number; errors: string[] }> = {};
      
      // Import subscription_plans (supports both snake_case and camelCase from JSON export)
      if (tables.subscription_plans && Array.isArray(tables.subscription_plans)) {
        results.subscription_plans = { added: 0, skipped: 0, errors: [] };
        for (const plan of tables.subscription_plans) {
          try {
            const existing = await storage.getSubscriptionPlanByCode(plan.code);
            const planData = {
              code: plan.code,
              name: plan.name,
              description: plan.description,
              priceTl: plan.priceTl ?? plan.price_tl,
              priceUsd: plan.priceUsd ?? plan.price_usd,
              yearlyPriceTl: plan.yearlyPriceTl ?? plan.yearly_price_tl,
              yearlyPriceUsd: plan.yearlyPriceUsd ?? plan.yearly_price_usd,
              yearlyDiscountPct: plan.yearlyDiscountPct ?? plan.yearly_discount_pct,
              trialDays: plan.trialDays ?? plan.trial_days,
              maxActivities: plan.maxActivities ?? plan.max_activities,
              maxReservationsPerMonth: plan.maxReservationsPerMonth ?? plan.max_reservations_per_month,
              maxDailyReservations: plan.maxDailyReservations ?? plan.max_daily_reservations,
              maxDailyMessages: plan.maxDailyMessages ?? plan.max_daily_messages,
              maxUsers: plan.maxUsers ?? plan.max_users,
              maxWhatsappNumbers: plan.maxWhatsappNumbers ?? plan.max_whatsapp_numbers,
              features: plan.features,
              sortOrder: plan.sortOrder ?? plan.sort_order,
              isActive: plan.isActive ?? plan.is_active,
              isPopular: plan.isPopular ?? plan.is_popular,
            };
            if (!existing) {
              await storage.createSubscriptionPlan(planData);
              results.subscription_plans.added++;
            } else if (mode === 'replace') {
              await storage.updateSubscriptionPlan(existing.id, planData);
              results.subscription_plans.added++;
            } else {
              results.subscription_plans.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.subscription_plans.errors.push(`Plan ${plan.code}: ${errorMsg}`);
          }
        }
      }
      
      // Import plan_features (supports both snake_case and camelCase)
      if (tables.plan_features && Array.isArray(tables.plan_features)) {
        results.plan_features = { added: 0, skipped: 0, errors: [] };
        for (const feature of tables.plan_features) {
          try {
            const existingFeatures = await storage.getPlanFeatures();
            const existing = existingFeatures.find(f => f.code === feature.code);
            if (!existing) {
              await storage.createPlanFeature({
                code: feature.code,
                name: feature.name,
                description: feature.description,
                category: feature.category,
                sortOrder: feature.sortOrder ?? feature.sort_order,
              });
              results.plan_features.added++;
            } else {
              results.plan_features.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.plan_features.errors.push(`Feature ${feature.code}: ${errorMsg}`);
          }
        }
      }
      
      // Import tenants (supports both snake_case and camelCase)
      if (tables.tenants && Array.isArray(tables.tenants)) {
        results.tenants = { added: 0, skipped: 0, errors: [] };
        for (const tenant of tables.tenants) {
          try {
            const existingTenants = await storage.getTenants();
            const existing = existingTenants.find(t => t.slug === tenant.slug);
            if (!existing) {
              await storage.createTenant({
                name: tenant.name,
                slug: tenant.slug,
                email: tenant.email,
                phone: tenant.phone,
                address: tenant.address,
                logoUrl: tenant.logoUrl ?? tenant.logo_url,
                primaryColor: tenant.primaryColor ?? tenant.primary_color,
                subscriptionStatus: tenant.subscriptionStatus ?? tenant.subscription_status,
                subscriptionPlanId: tenant.subscriptionPlanId ?? tenant.subscription_plan_id,
                trialEndsAt: tenant.trialEndsAt ?? tenant.trial_ends_at,
                isActive: tenant.isActive ?? tenant.is_active ?? true,
              });
              results.tenants.added++;
            } else {
              results.tenants.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.tenants.errors.push(`Tenant ${tenant.slug}: ${errorMsg}`);
          }
        }
      }
      
      // Import app_users (supports both snake_case and camelCase)
      if (tables.app_users && Array.isArray(tables.app_users)) {
        results.app_users = { added: 0, skipped: 0, errors: [] };
        for (const user of tables.app_users) {
          try {
            const existingUsers = await storage.getAppUsers();
            const existing = existingUsers.find(u => u.email === user.email);
            if (!existing) {
              await storage.createAppUser({
                tenantId: user.tenantId ?? user.tenant_id,
                email: user.email,
                password: user.password,
                name: user.name,
                phone: user.phone,
                roleId: user.roleId ?? user.role_id,
                planId: user.planId ?? user.plan_id,
                isActive: user.isActive ?? user.is_active ?? true,
                isSuspended: user.isSuspended ?? user.is_suspended ?? false,
                suspendReason: user.suspendReason ?? user.suspend_reason,
                isSystemProtected: user.isSystemProtected ?? user.is_system_protected ?? false,
                maxActivities: user.maxActivities ?? user.max_activities,
                maxReservationsPerMonth: user.maxReservationsPerMonth ?? user.max_reservations_per_month,
                createdBy: user.createdBy ?? user.created_by,
                notes: user.notes,
              });
              results.app_users.added++;
            } else {
              results.app_users.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.app_users.errors.push(`User ${user.email}: ${errorMsg}`);
          }
        }
      }
      
      // Import roles (supports both snake_case and camelCase)
      if (tables.roles && Array.isArray(tables.roles)) {
        results.roles = { added: 0, skipped: 0, errors: [] };
        for (const role of tables.roles) {
          try {
            const existingRoles = await storage.getRoles();
            const existing = existingRoles.find(r => r.name === role.name);
            if (!existing) {
              await storage.createRole({
                name: role.name,
                displayName: role.displayName ?? role.display_name,
                description: role.description,
                color: role.color,
                isSystem: role.isSystem ?? role.is_system,
                isActive: role.isActive ?? role.is_active,
              });
              results.roles.added++;
            } else {
              results.roles.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.roles.errors.push(`Role ${role.name}: ${errorMsg}`);
          }
        }
      }
      
      // Import permissions
      if (tables.permissions && Array.isArray(tables.permissions)) {
        results.permissions = { added: 0, skipped: 0, errors: [] };
        for (const perm of tables.permissions) {
          try {
            const existingPerms = await storage.getPermissions();
            const existing = existingPerms.find(p => p.code === perm.code);
            if (!existing) {
              await storage.createPermission({
                code: perm.code,
                name: perm.name,
                description: perm.description,
                category: perm.category,
              });
              results.permissions.added++;
            } else {
              results.permissions.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.permissions.errors.push(`Permission ${perm.code}: ${errorMsg}`);
          }
        }
      }
      
      // Import platform_admins (supports both snake_case and camelCase)
      if (tables.platform_admins && Array.isArray(tables.platform_admins)) {
        results.platform_admins = { added: 0, skipped: 0, errors: [] };
        for (const admin of tables.platform_admins) {
          try {
            const existingAdmins = await storage.getPlatformAdmins();
            const existing = existingAdmins.find(a => a.email === admin.email);
            if (!existing) {
              await storage.createPlatformAdmin({
                email: admin.email,
                password: admin.password,
                name: admin.name,
                role: admin.role,
                isActive: admin.isActive ?? admin.is_active ?? true,
              });
              results.platform_admins.added++;
            } else {
              results.platform_admins.skipped++;
            }
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            results.platform_admins.errors.push(`Admin ${admin.email}: ${errorMsg}`);
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: "Veritabanı içe aktarıldı",
        results 
      });
    } catch (err) {
      console.error("Database import hatası:", err);
      res.status(500).json({ error: "Veritabanı içe aktarılamadı" });
    }
  });

  // === ERROR EVENTS (Super Admin Hata İzleme) ===
  
  app.get("/api/admin/error-events/summary", async (req, res) => {
    try {
      if (!req.session?.platformAdminId) {
        return res.status(401).json({ error: "Platform admin girişi gerekli" });
      }
      const { getErrorEventsSummary } = await import("./logger");
      const summary = await getErrorEventsSummary();
      res.json(summary);
    } catch (err) {
      console.error("Error events summary hatası:", err);
      res.status(500).json({ error: "Hata özeti alınamadı" });
    }
  });

  app.get("/api/admin/error-events", async (req, res) => {
    try {
      if (!req.session?.platformAdminId) {
        return res.status(401).json({ error: "Platform admin girişi gerekli" });
      }
      const { getErrorEvents } = await import("./logger");
      
      const filters: Record<string, unknown> = {};
      if (req.query.tenantId) filters.tenantId = Number(req.query.tenantId);
      if (req.query.severity) filters.severity = (req.query.severity as string).split(',');
      if (req.query.category) filters.category = (req.query.category as string).split(',');
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.limit) filters.limit = Number(req.query.limit);
      if (req.query.offset) filters.offset = Number(req.query.offset);

      const result = await getErrorEvents(filters as any);
      res.json(result);
    } catch (err) {
      console.error("Error events hatası:", err);
      res.status(500).json({ error: "Hata listesi alınamadı" });
    }
  });

  app.post("/api/admin/error-events/:id/resolve", async (req, res) => {
    try {
      if (!req.session?.platformAdminId) {
        return res.status(401).json({ error: "Platform admin girişi gerekli" });
      }
      const { resolveErrorEvent } = await import("./logger");
      const admin = await storage.getPlatformAdmin(req.session.platformAdminId);
      const event = await resolveErrorEvent(
        Number(req.params.id),
        admin?.name || "Admin",
        req.body.notes
      );
      if (!event) {
        return res.status(404).json({ error: "Hata bulunamadı" });
      }
      res.json(event);
    } catch (err) {
      console.error("Error event çözümleme hatası:", err);
      res.status(500).json({ error: "Hata çözümlenemedi" });
    }
  });

  app.post("/api/admin/error-events/:id/acknowledge", async (req, res) => {
    try {
      if (!req.session?.platformAdminId) {
        return res.status(401).json({ error: "Platform admin girişi gerekli" });
      }
      const { acknowledgeErrorEvent } = await import("./logger");
      const event = await acknowledgeErrorEvent(Number(req.params.id));
      if (!event) {
        return res.status(404).json({ error: "Hata bulunamadı" });
      }
      res.json(event);
    } catch (err) {
      console.error("Error event onaylama hatası:", err);
      res.status(500).json({ error: "Hata onaylanamadı" });
    }
  });

  // === LOGIN LOGS ===
  
  app.get("/api/login-logs", async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const logs = await storage.getLoginLogs(limit);
      res.json(logs);
    } catch (err) {
      console.error("Giriş logu hatası:", err);
      res.status(500).json({ error: "Giriş loglari alınamadı" });
    }
  });

  // === AGENCY NOTES ===
  
  app.get("/api/agency-notes/:licenseId", async (req, res) => {
    try {
      const notes = await storage.getAgencyNotes(Number(req.params.licenseId));
      res.json(notes);
    } catch (err) {
      console.error("Ajans notu hatası:", err);
      res.status(500).json({ error: "Notlar alınamadı" });
    }
  });

  app.post("/api/agency-notes", async (req, res) => {
    try {
      const note = await storage.createAgencyNote(req.body);
      res.json(note);
    } catch (err) {
      console.error("Ajans notu oluşturma hatası:", err);
      res.status(500).json({ error: "Not oluşturulamadi" });
    }
  });

  app.delete("/api/agency-notes/:id", async (req, res) => {
    try {
      await storage.deleteAgencyNote(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Ajans notu silme hatası:", err);
      res.status(500).json({ error: "Not silinemedi" });
    }
  });

  // === SUPPORT TICKETS ===
  
  app.get("/api/support-tickets", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const tickets = await storage.getSupportTickets(status);
      res.json(tickets);
    } catch (err) {
      console.error("Destek talebi hatası:", err);
      res.status(500).json({ error: "Talepler alınamadı" });
    }
  });

  app.get("/api/support-tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(Number(req.params.id));
      if (!ticket) {
        return res.status(404).json({ error: "Talep bulunamadı" });
      }
      res.json(ticket);
    } catch (err) {
      console.error("Destek talebi hatası:", err);
      res.status(500).json({ error: "Talep alınamadı" });
    }
  });

  app.post("/api/support-tickets", async (req, res) => {
    try {
      const ticket = await storage.createSupportTicket(req.body);
      res.json(ticket);
    } catch (err) {
      console.error("Destek talebi oluşturma hatası:", err);
      res.status(500).json({ error: "Talep oluşturulamadi" });
    }
  });

  app.patch("/api/support-tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.updateSupportTicket(Number(req.params.id), req.body);
      res.json(ticket);
    } catch (err) {
      console.error("Destek talebi güncelleme hatası:", err);
      res.status(500).json({ error: "Talep güncellenemedi" });
    }
  });

  // === TICKET RESPONSES ===
  
  app.get("/api/support-tickets/:ticketId/responses", async (req, res) => {
    try {
      const responses = await storage.getTicketResponses(Number(req.params.ticketId));
      res.json(responses);
    } catch (err) {
      console.error("Talep yaniti hatası:", err);
      res.status(500).json({ error: "Yanitlar alınamadı" });
    }
  });

  app.post("/api/support-tickets/:ticketId/responses", async (req, res) => {
    try {
      const response = await storage.createTicketResponse({
        ...req.body,
        ticketId: Number(req.params.ticketId)
      });
      res.json(response);
    } catch (err) {
      console.error("Talep yaniti oluşturma hatası:", err);
      res.status(500).json({ error: "Yanit oluşturulamadi" });
    }
  });

  // === SYSTEM MONITORING ===
  
  app.get("/api/system/stats", async (req, res) => {
    try {
      const os = await import('os');
      
      const cpuUsage = os.loadavg()[0];
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePct = Math.round((usedMem / totalMem) * 100);
      
      const uptime = process.uptime();
      const nodeVersion = process.version;
      
      res.json({
        cpu: {
          loadAvg: cpuUsage.toFixed(2),
          cores: os.cpus().length
        },
        memory: {
          total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
          used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
          free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
          usagePct: memUsagePct
        },
        uptime: {
          seconds: Math.floor(uptime),
          formatted: formatUptime(uptime)
        },
        nodeVersion,
        platform: os.platform(),
        hostname: os.hostname()
      });
    } catch (err) {
      console.error("Sistem istatistik hatası:", err);
      res.status(500).json({ error: "Sistem istatistikleri alınamadı" });
    }
  });

  app.get("/api/system/db-stats", async (req, res) => {
    try {
      const stats = await storage.getDatabaseStats();
      res.json(stats);
    } catch (err) {
      console.error("Veritabani istatistik hatası:", err);
      res.status(500).json({ error: "Veritabani istatistikleri alınamadı" });
    }
  });

  // === DATABASE BACKUP MANAGEMENT ===
  
  // Get all backups
  app.get("/api/database-backups", async (req, res) => {
    try {
      const backups = await storage.getDatabaseBackups();
      res.json(backups);
    } catch (err) {
      console.error("Yedek listesi hatası:", err);
      res.status(500).json({ error: "Yedekler alınamadı" });
    }
  });

  // Create a new backup
  app.post("/api/database-backups", async (req, res) => {
    try {
      const { name, description } = req.body;
      
      // Get database stats for backup info
      const stats = await storage.getDatabaseStats();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_${timestamp}.json`;
      
      // Get all table data for backup
      const backupData: Record<string, any[]> = {};
      let totalRows = 0;
      let tableCount = 0;
      
      // List of tables to backup
      const tables = [
        'tenants', 'activities', 'capacity', 'reservations', 'messages',
        'support_requests', 'settings', 'blacklist', 'agencies', 'activity_costs',
        'settlements', 'settlement_entries', 'payments', 'agency_payouts',
        'package_tours', 'package_tour_activities', 'holidays', 'auto_responses',
        'customer_requests', 'licenses', 'request_message_templates',
        'subscription_plans', 'plan_features', 'subscriptions', 'subscription_payments',
        'announcements', 'api_status_logs', 'bot_quality_scores', 'invoices',
        'app_users', 'roles', 'permissions', 'role_permissions', 'user_roles',
        'reservation_requests'
      ];
      
      for (const tableName of tables) {
        try {
          const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
          if (result.rows && result.rows.length > 0) {
            backupData[tableName] = result.rows as any[];
            totalRows += result.rows.length;
            tableCount++;
          }
        } catch (tableErr) {
          // Table might not exist, skip
        }
      }
      
      // Store backup metadata (actual data would be stored in file system in production)
      const backup = await storage.createDatabaseBackup({
        name: name || `Yedek - ${new Date().toLocaleString('tr-TR')}`,
        description: description || '',
        fileName,
        fileSize: JSON.stringify(backupData).length,
        tableCount,
        rowCount: totalRows,
        status: 'completed',
        backupType: 'manual',
        createdBy: 'super_admin'
      });
      
      res.json({ 
        success: true, 
        backup,
        message: `${tableCount} tablo ve ${totalRows} kayıt yedeklendi`
      });
    } catch (err) {
      console.error("Yedekleme hatası:", err);
      res.status(500).json({ error: "Yedek oluşturulamadi" });
    }
  });

  // Download backup data
  app.get("/api/database-backups/:id/download", async (req, res) => {
    try {
      const backup = await storage.getDatabaseBackup(Number(req.params.id));
      if (!backup) {
        return res.status(404).json({ error: "Yedek bulunamadı" });
      }
      
      // Get all table data for export
      const backupData: Record<string, any[]> = {};
      const tables = [
        'tenants', 'activities', 'capacity', 'reservations', 'messages',
        'support_requests', 'settings', 'blacklist', 'agencies', 'activity_costs',
        'settlements', 'settlement_entries', 'payments', 'agency_payouts',
        'package_tours', 'package_tour_activities', 'holidays', 'auto_responses',
        'customer_requests', 'licenses', 'request_message_templates',
        'subscription_plans', 'plan_features', 'subscriptions', 'subscription_payments',
        'announcements', 'api_status_logs', 'bot_quality_scores', 'invoices',
        'app_users', 'roles', 'permissions', 'role_permissions', 'user_roles',
        'reservation_requests'
      ];
      
      for (const tableName of tables) {
        try {
          const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
          if (result.rows && result.rows.length > 0) {
            backupData[tableName] = result.rows as any[];
          }
        } catch (tableErr) {
          // Table might not exist, skip
        }
      }
      
      const exportData = {
        backupInfo: backup,
        createdAt: new Date().toISOString(),
        data: backupData
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
      res.json(exportData);
    } catch (err) {
      console.error("Yedek indirme hatası:", err);
      res.status(500).json({ error: "Yedek indirilemedi" });
    }
  });

  // Delete a backup
  app.delete("/api/database-backups/:id", async (req, res) => {
    try {
      await storage.deleteDatabaseBackup(Number(req.params.id));
      res.json({ success: true, message: "Yedek silindi" });
    } catch (err) {
      console.error("Yedek silme hatası:", err);
      res.status(500).json({ error: "Yedek silinemedi" });
    }
  });

  // Get last backup info (for reminder system)
  app.get("/api/database-backups/last", async (req, res) => {
    try {
      const backups = await storage.getDatabaseBackups();
      const lastBackup = backups.length > 0 ? backups[0] : null;
      
      let daysSinceLastBackup = null;
      if (lastBackup && lastBackup.createdAt) {
        const lastBackupDate = new Date(lastBackup.createdAt);
        const now = new Date();
        daysSinceLastBackup = Math.floor((now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      res.json({
        lastBackup,
        daysSinceLastBackup,
        needsBackup: daysSinceLastBackup === null || daysSinceLastBackup >= 7
      });
    } catch (err) {
      console.error("Son yedek bilgisi hatası:", err);
      res.status(500).json({ error: "Son yedek bilgisi alınamadı" });
    }
  });

  // === TENANT DATA EXPORT (Acenta Bazlı Veri İndirme) ===
  
  // Export tenant's own data (for agency self-service)
  app.get("/api/tenant-export", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Acenta bilgisi bulunamadı" });
      }
      
      const format = (req.query.format as string) || 'json';
      const dataTypes = (req.query.types as string)?.split(',') || ['all'];
      
      const exportData: Record<string, any> = {
        exportInfo: {
          tenantId,
          exportedAt: new Date().toISOString(),
          format,
          dataTypes
        }
      };
      
      // Get tenant-specific data
      if (dataTypes.includes('all') || dataTypes.includes('activities')) {
        exportData.activities = await storage.getActivities(tenantId);
      }
      
      if (dataTypes.includes('all') || dataTypes.includes('reservations')) {
        exportData.reservations = await storage.getReservations(tenantId);
      }
      
      if (dataTypes.includes('all') || dataTypes.includes('capacity')) {
        // Get capacity for all activities
        const activities = exportData.activities || await storage.getActivities(tenantId);
        const capacityData: any[] = [];
        for (const activity of activities) {
          const activityCapacity = await storage.getCapacity(activity.id, tenantId);
          capacityData.push(...activityCapacity);
        }
        exportData.capacity = capacityData;
      }
      
      if (dataTypes.includes('all') || dataTypes.includes('agencies')) {
        exportData.agencies = await storage.getAgencies(tenantId);
      }
      
      if (dataTypes.includes('all') || dataTypes.includes('messages')) {
        exportData.messages = await storage.getMessages('all', tenantId);
      }
      
      if (dataTypes.includes('all') || dataTypes.includes('customers')) {
        // Extract unique customers from reservations
        const reservations = exportData.reservations || await storage.getReservations(tenantId);
        const customersMap = new Map();
        for (const r of reservations) {
          const key = r.customerPhone || r.customerEmail;
          if (key && !customersMap.has(key)) {
            customersMap.set(key, {
              name: r.customerName,
              phone: r.customerPhone,
              email: r.customerEmail,
              reservationCount: 1,
              lastReservationDate: r.date
            });
          } else if (key) {
            const existing = customersMap.get(key);
            existing.reservationCount++;
            if (r.date > existing.lastReservationDate) {
              existing.lastReservationDate = r.date;
            }
          }
        }
        exportData.customers = Array.from(customersMap.values());
      }
      
      // Otomatik yanıtlar (Auto responses)
      if (dataTypes.includes('all') || dataTypes.includes('autoResponses')) {
        exportData.autoResponses = await storage.getAutoResponses(tenantId);
      }
      
      // Destek talepleri (Support requests from WhatsApp)
      if (dataTypes.includes('all') || dataTypes.includes('supportRequests')) {
        exportData.supportRequests = await storage.getAllSupportRequests(undefined, tenantId);
      }
      
      // Tatil günleri (Holidays)
      if (dataTypes.includes('all') || dataTypes.includes('holidays')) {
        exportData.holidays = await storage.getHolidays(tenantId);
      }
      
      // SSS (FAQ)
      if (dataTypes.includes('all') || dataTypes.includes('faq')) {
        exportData.faq = await storage.getFaq(tenantId);
      }
      
      // Bot ayarları ve hazır mesaj şablonları (Settings)
      if (dataTypes.includes('all') || dataTypes.includes('settings')) {
        const settingsToExport = [
          'botPrompt', 'bot_rules', 'bulkMessageTemplates', 'brandSettings',
          'tenantNotificationEmail', 'botAccess'
        ];
        const settingsData: Record<string, string | undefined> = {};
        for (const key of settingsToExport) {
          settingsData[key] = await storage.getSetting(key, tenantId);
        }
        exportData.settings = settingsData;
      }
      
      if (format === 'csv') {
        // Convert to CSV format
        let csvContent = '';
        
        // Reservations CSV
        if (exportData.reservations && exportData.reservations.length > 0) {
          csvContent += 'REZERVASYONLAR\n';
          csvContent += 'ID,Müşteri Adı,Telefon,Email,Tarih,Saat,Aktivite ID,Kişi Sayısı,Fiyat TL,Durum,Kaynak\n';
          for (const r of exportData.reservations) {
            csvContent += `${r.id},"${r.customerName || ''}","${r.customerPhone || ''}","${r.customerEmail || ''}",${r.date},${r.time || ''},${r.activityId || ''},${r.quantity},${r.priceTl || 0},${r.status},${r.source || ''}\n`;
          }
          csvContent += '\n';
        }
        
        // Activities CSV
        if (exportData.activities && exportData.activities.length > 0) {
          csvContent += 'AKTİVİTELER\n';
          csvContent += 'ID,Ad,Açıklama,Fiyat TL,Fiyat USD,Süre (dk),Aktif\n';
          for (const a of exportData.activities) {
            csvContent += `${a.id},"${a.name}","${a.description || ''}",${a.price || 0},${a.priceUsd || 0},${a.durationMinutes || 0},${a.active ? 'Evet' : 'Hayır'}\n`;
          }
          csvContent += '\n';
        }
        
        // Customers CSV
        if (exportData.customers && exportData.customers.length > 0) {
          csvContent += 'MÜŞTERİLER\n';
          csvContent += 'Ad,Telefon,Email,Rezervasyon Sayısı,Son Rezervasyon\n';
          for (const c of exportData.customers) {
            csvContent += `"${c.name || ''}","${c.phone || ''}","${c.email || ''}",${c.reservationCount},${c.lastReservationDate || ''}\n`;
          }
        }
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="acenta_verileri_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 compatibility
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="acenta_verileri_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
      }
    } catch (err) {
      console.error("Acenta veri dışa aktarma hatası:", err);
      res.status(500).json({ error: "Veriler dışa aktarılamadı" });
    }
  });

  // Get export preview (without downloading)
  app.get("/api/tenant-export/preview", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Acenta bilgisi bulunamadı" });
      }
      
      const activities = await storage.getActivities(tenantId);
      const reservations = await storage.getReservations(tenantId);
      const agencies = await storage.getAgencies(tenantId);
      const messages = await storage.getMessages('all', tenantId);
      const autoResponses = await storage.getAutoResponses(tenantId);
      const supportRequests = await storage.getAllSupportRequests(undefined, tenantId);
      const holidays = await storage.getHolidays(tenantId);
      const faq = await storage.getFaq(tenantId);
      
      // Extract unique customers
      const customersSet = new Set<string>();
      for (const r of reservations) {
        if (r.customerPhone) customersSet.add(r.customerPhone);
      }
      
      res.json({
        summary: {
          activitiesCount: activities.length,
          reservationsCount: reservations.length,
          agenciesCount: agencies.length,
          messagesCount: messages.length,
          customersCount: customersSet.size,
          autoResponsesCount: autoResponses.length,
          supportRequestsCount: supportRequests.length,
          holidaysCount: holidays.length,
          faqCount: faq.length
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Veri onizleme hatası:", err);
      res.status(500).json({ error: "Veri ozeti alınamadı" });
    }
  });

  // Tenant data import (restore from backup)
  app.post("/api/tenant-import", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Acenta bilgisi bulunamadı" });
      }
      
      const { data, options } = req.body;
      
      if (!data || !data.exportInfo) {
        return res.status(400).json({ error: "Geçersiz yedek dosyası formatı" });
      }
      
      // Validate that the backup belongs to this tenant (security check)
      if (data.exportInfo.tenantId !== tenantId) {
        return res.status(403).json({ error: "Bu yedek dosyası bu acentaya ait değil" });
      }
      
      const mode = options?.mode || 'merge'; // 'merge' or 'replace'
      const results: Record<string, { imported: number; skipped: number; errors: string[] }> = {};
      
      // Import activities
      if (data.activities && Array.isArray(data.activities)) {
        results.activities = { imported: 0, skipped: 0, errors: [] };
        for (const activity of data.activities) {
          try {
            // Check if activity already exists
            const existing = await storage.getActivity(activity.id, tenantId);
            if (existing && mode === 'merge') {
              results.activities.skipped++;
              continue;
            }
            
            // Remove id for new insert, keep other fields
            const { id, ...activityData } = activity;
            await storage.createActivity({ ...activityData, tenantId });
            results.activities.imported++;
          } catch (err: any) {
            results.activities.errors.push(`Aktivite ${activity.name}: ${err.message}`);
          }
        }
      }
      
      // Import agencies (sub-agencies)
      if (data.agencies && Array.isArray(data.agencies)) {
        results.agencies = { imported: 0, skipped: 0, errors: [] };
        for (const agency of data.agencies) {
          try {
            const existing = await storage.getAgencyByName(agency.name, tenantId);
            if (existing && mode === 'merge') {
              results.agencies.skipped++;
              continue;
            }
            
            const { id, ...agencyData } = agency;
            await storage.createAgency({ ...agencyData, tenantId });
            results.agencies.imported++;
          } catch (err: any) {
            results.agencies.errors.push(`Acenta ${agency.name}: ${err.message}`);
          }
        }
      }
      
      // Import reservations (only in replace mode or if not exists)
      if (data.reservations && Array.isArray(data.reservations)) {
        results.reservations = { imported: 0, skipped: 0, errors: [] };
        
        // Refresh current activities after import to get newly created ones
        const currentActivities = await storage.getActivities(tenantId);
        const activityMap = new Map<number, number>();
        
        // Build activity mapping: backup ID -> current ID (match by name)
        if (data.activities) {
          for (const oldActivity of data.activities) {
            const matchingActivity = currentActivities.find(a => a.name === oldActivity.name);
            if (matchingActivity) {
              activityMap.set(oldActivity.id, matchingActivity.id);
            }
          }
        }
        
        // If no activity list in backup, try direct matching by ID
        if (!data.activities) {
          for (const activity of currentActivities) {
            activityMap.set(activity.id, activity.id);
          }
        }
        
        for (const reservation of data.reservations) {
          try {
            // Map activity ID to current system
            let mappedActivityId = activityMap.get(reservation.activityId);
            
            // Fallback: try to find activity by name from reservation data if available
            if (!mappedActivityId && reservation.activityName) {
              const matchByName = currentActivities.find(a => a.name === reservation.activityName);
              if (matchByName) {
                mappedActivityId = matchByName.id;
              }
            }
            
            if (!mappedActivityId) {
              results.reservations.errors.push(`Rezervasyon ${reservation.id}: Aktivite eşleştirilemedi (ID: ${reservation.activityId})`);
              continue;
            }
            
            const { id, ...reservationData } = reservation;
            await storage.createReservation({
              ...reservationData,
              activityId: mappedActivityId,
              tenantId
            });
            results.reservations.imported++;
          } catch (err: any) {
            results.reservations.errors.push(`Rezervasyon ${reservation.id}: ${err.message}`);
          }
        }
      }
      
      // Import auto responses (hazır cevaplar)
      if (data.autoResponses && Array.isArray(data.autoResponses)) {
        results.autoResponses = { imported: 0, skipped: 0, errors: [] };
        for (const autoResponse of data.autoResponses) {
          try {
            const { id, ...autoResponseData } = autoResponse;
            await storage.createAutoResponse({ ...autoResponseData, tenantId });
            results.autoResponses.imported++;
          } catch (err: any) {
            results.autoResponses.errors.push(`Otomatik yanıt: ${err.message}`);
          }
        }
      }
      
      // Import holidays (tatil günleri)
      if (data.holidays && Array.isArray(data.holidays)) {
        results.holidays = { imported: 0, skipped: 0, errors: [] };
        for (const holiday of data.holidays) {
          try {
            const { id, ...holidayData } = holiday;
            await storage.createHoliday({ ...holidayData, tenantId });
            results.holidays.imported++;
          } catch (err: any) {
            results.holidays.errors.push(`Tatil: ${err.message}`);
          }
        }
      }
      
      // Import FAQ (SSS)
      if (data.faq && Array.isArray(data.faq)) {
        results.faq = { imported: 0, skipped: 0, errors: [] };
        for (const faqItem of data.faq) {
          try {
            const { id, ...faqData } = faqItem;
            await storage.createFaq({ ...faqData, tenantId });
            results.faq.imported++;
          } catch (err: any) {
            results.faq.errors.push(`SSS: ${err.message}`);
          }
        }
      }
      
      // Import settings (bot ayarları, hazır mesaj şablonları)
      if (data.settings && typeof data.settings === 'object') {
        results.settings = { imported: 0, skipped: 0, errors: [] };
        for (const [key, value] of Object.entries(data.settings)) {
          try {
            if (value !== null && value !== undefined) {
              await storage.setSetting(key, String(value), tenantId);
              results.settings.imported++;
            }
          } catch (err: any) {
            results.settings.errors.push(`Ayar ${key}: ${err.message}`);
          }
        }
      }
      
      // Calculate totals
      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      
      for (const key of Object.keys(results)) {
        totalImported += results[key].imported;
        totalSkipped += results[key].skipped;
        totalErrors += results[key].errors.length;
      }
      
      res.json({
        success: true,
        message: `İçe aktarma tamamlandı: ${totalImported} kayıt eklendi, ${totalSkipped} atlandı, ${totalErrors} hata`,
        details: results
      });
    } catch (err) {
      console.error("Veri içe aktarma hatası:", err);
      res.status(500).json({ error: "Veri içe aktarılamadı" });
    }
  });

  // === BULK OPERATIONS (now tenant-based) ===
  
  app.post("/api/bulk/plan-change", async (req, res) => {
    try {
      const { tenantIds, newPlanCode } = req.body;
      const results = await storage.bulkChangePlan(tenantIds, newPlanCode);
      res.json(results);
    } catch (err) {
      console.error("Toplu plan degisikligi hatası:", err);
      res.status(500).json({ error: "Plan degisikligi yapılamadı" });
    }
  });

  app.post("/api/bulk/extend-subscription", async (req, res) => {
    try {
      const { tenantIds, days } = req.body;
      const results = await storage.bulkExtendSubscription(tenantIds, days);
      res.json(results);
    } catch (err) {
      console.error("Toplu abonelik uzatma hatası:", err);
      res.status(500).json({ error: "Abonelik uzatma yapılamadı" });
    }
  });

  // === TENANT DETAILS (For Super Admin) ===
  
  app.get("/api/tenant-details/:tenantId", async (req, res) => {
    try {
      const details = await storage.getTenantDetails(Number(req.params.tenantId));
      res.json(details);
    } catch (err) {
      console.error("Tenant detayi hatası:", err);
      res.status(500).json({ error: "Tenant detayları alınamadı" });
    }
  });

  // === REVENUE REPORTS ===
  
  app.get("/api/revenue/summary", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const summary = await storage.getRevenueSummary(startDate, endDate);
      res.json(summary);
    } catch (err) {
      console.error("Gelir özeti hatası:", err);
      res.status(500).json({ error: "Gelir özeti alınamadı" });
    }
  });

  app.get("/api/revenue/monthly", async (req, res) => {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const monthly = await storage.getMonthlyRevenue(year);
      res.json(monthly);
    } catch (err) {
      console.error("Aylık gelir hatası:", err);
      res.status(500).json({ error: "Aylık gelir alınamadı" });
    }
  });

  app.get("/api/invoices/overdue", async (req, res) => {
    try {
      const invoices = await storage.getOverdueInvoices();
      res.json(invoices);
    } catch (err) {
      console.error("Vadesi geçmiş fatura hatası:", err);
      res.status(500).json({ error: "Vadesi geçmiş faturalar alınamadı" });
    }
  });

  app.post("/api/invoices/generate", async (req, res) => {
    try {
      const { tenantId, periodStart, periodEnd } = req.body;
      const invoice = await storage.generateInvoice(tenantId, periodStart, periodEnd);
      res.json(invoice);
    } catch (err) {
      console.error("Fatura oluşturma hatası:", err);
      res.status(500).json({ error: "Fatura oluşturulamadı" });
    }
  });

  // === TENANT USER MANAGEMENT (Agencies manage their own users) ===
  // SECURITY: All endpoints use the authenticated session tenant ID, NOT client-provided values
  // AUTHORIZATION: Requires users.view or users.manage permission

  // Get users for current tenant (for agency settings page)
  app.get("/api/tenant-users", requirePermission(PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE), async (req, res) => {
    try {
      // SECURITY: Get tenant ID from authenticated session
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
      }

      const allUsers = await storage.getAppUsers();
      const tenantUsers = allUsers.filter(u => u.tenantId === tenantId);
      
      // Include roles for each user to prevent accidental role deletion on edit
      const usersWithRoles = await Promise.all(
        tenantUsers.map(async (user) => {
          const roles = await storage.getUserRoles(user.id);
          return { ...user, roles };
        })
      );
      
      res.json(usersWithRoles);
    } catch (err) {
      console.error("Tenant kullanıcı listesi hatası:", err);
      res.status(500).json({ error: "Kullanıcılar alınamadı" });
    }
  });

  // Create user for current tenant (agency creates their own users)
  app.post("/api/tenant-users", requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
    try {
      // SECURITY: Get tenant ID from authenticated session, ignore client-provided value
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
      }

      const { username, email, password, name, phone, roleIds } = req.body;

      // Check user limit for this tenant based on subscription plan
      const allUsers = await storage.getAppUsers();
      const tenantUsers = allUsers.filter(u => u.tenantId === tenantId);
      
      // Get tenant's subscription to check user limit
      const subscriptions = await storage.getSubscriptions();
      const tenantSub = subscriptions.find((s: any) => s.tenantId === tenantId && s.status === 'active');
      const userLimit = (tenantSub as any)?.plan?.maxUsers || 5; // Default 5 if no plan
      
      if (tenantUsers.length >= userLimit) {
        return res.status(400).json({ error: `Kullanıcı limitine ulastiiniz (${userLimit}). Daha fazla kullanıcı eklemek için planinizi yukseltiniz.` });
      }

      // Check if username or email already exists
      const existingUsername = await storage.getAppUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Bu kullanıcı adi zaten kullaniliyor" });
      }
      const existingEmail = await storage.getAppUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Bu e-posta zaten kullaniliyor" });
      }

      // Get tenant info
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(400).json({ error: "Tenant bulunamadı" });
      }

      const passwordHash = hashPassword(password);

      const user = await storage.createAppUser({
        tenantId,
        username,
        email,
        passwordHash,
        name,
        phone: phone || null,
        companyName: tenant.name,
        membershipType: 'professional',
        membershipStartDate: new Date(),
        membershipEndDate: null,
        planId: null,
        maxActivities: 50,
        maxReservationsPerMonth: 1000,
        notes: `${tenant.name} acentasi kullanıcısi`,
        isActive: true,
      });

      // Assign roles if provided
      if (roleIds && roleIds.length > 0) {
        for (const roleId of roleIds) {
          await storage.assignUserRole({ userId: user.id, roleId });
        }
      }

      res.json(user);
    } catch (err) {
      console.error("Tenant kullanıcı oluşturma hatası:", err);
      res.status(500).json({ error: "Kullanıcı oluşturulamadi" });
    }
  });

  // Update user for current tenant
  app.patch("/api/tenant-users/:id", requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
    try {
      // SECURITY: Get tenant ID from authenticated session
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
      }

      const id = Number(req.params.id);
      
      // SECURITY: Verify the user being updated belongs to the current tenant
      const existingUser = await storage.getAppUser(id);
      if (!existingUser || existingUser.tenantId !== tenantId) {
        return res.status(403).json({ error: "Bu kullanıcıyi düzenleme yetkiniz yok" });
      }

      const { password, roleIds, ...updateData } = req.body;

      if (password) {
        updateData.passwordHash = hashPassword(password);
      }

      const user = await storage.updateAppUser(id, updateData);

      // Update roles if provided
      if (roleIds !== undefined) {
        const currentRoles = await storage.getUserRoles(id);
        const currentRoleIds = currentRoles.map(r => r.roleId);

        for (const roleId of currentRoleIds) {
          if (!roleIds.includes(roleId)) {
            await storage.removeUserRole(id, roleId);
          }
        }

        for (const roleId of roleIds) {
          if (!currentRoleIds.includes(roleId)) {
            await storage.assignUserRole({ userId: id, roleId });
          }
        }
      }

      res.json(user);
    } catch (err) {
      console.error("Tenant kullanıcı güncelleme hatası:", err);
      res.status(500).json({ error: "Kullanıcı güncellenemedi" });
    }
  });

  // Delete user for current tenant
  app.delete("/api/tenant-users/:id", requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
    try {
      // SECURITY: Get tenant ID from authenticated session
      const tenantId = req.session?.tenantId;
      const currentUserId = req.session?.userId;
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
      }

      const id = Number(req.params.id);
      
      // SECURITY: Prevent users from deleting themselves
      if (id === currentUserId) {
        return res.status(403).json({ error: "Kendinizi silemezsiniz" });
      }
      
      // SECURITY: Verify the user being deleted belongs to the current tenant
      const existingUser = await storage.getAppUser(id);
      if (!existingUser || existingUser.tenantId !== tenantId) {
        return res.status(403).json({ error: "Bu kullanıcıyi silme yetkiniz yok" });
      }
      
      // Prevent deletion of system protected users
      if (existingUser.isSystemProtected) {
        return res.status(403).json({ error: "Sistem kullanıcısı silinemez" });
      }
      
      // SECURITY: Prevent deletion of tenant owner (only super admin can do this)
      const targetUserRoles = await storage.getUserRoles(id);
      const roles = await storage.getRoles();
      const ownerRole = roles.find(r => r.name === 'tenant_owner');
      if (ownerRole && targetUserRoles.some(ur => ur.roleId === ownerRole.id)) {
        return res.status(403).json({ error: "Acenta sahibi silinemez. Sadece süper admin bu işlemi yapabilir." });
      }
      
      // Check if user has related reservation requests
      const userRequests = await storage.getReservationRequests(tenantId);
      const hasRelatedRequests = userRequests.some(r => r.requestedBy === id);
      if (hasRelatedRequests) {
        return res.status(400).json({ error: "Bu kullanıcıya ait rezervasyon talepleri var. Önce talepleri silmeniz veya başka birine atamanız gerekiyor." });
      }

      await storage.deleteAppUser(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Tenant kullanıcı silme hatası:", err);
      // Handle foreign key constraint errors
      if (err.code === '23503') {
        return res.status(400).json({ error: "Bu kullanıcıya bağlı veriler var. Önce ilişkili verileri silmeniz gerekiyor." });
      }
      res.status(500).json({ error: "Kullanıcı silinemedi" });
    }
  });

  // === APP USER MANAGEMENT (Super Admin - view only) ===

  app.get("/api/app-users", async (req, res) => {
    try {
      const users = await storage.getAppUsers();
      res.json(users);
    } catch (err) {
      console.error("Kullanıcı listesi hatası:", err);
      res.status(500).json({ error: "Kullanıcılar alınamadı" });
    }
  });

  app.get("/api/app-users/:id", async (req, res) => {
    try {
      const user = await storage.getAppUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      res.json(user);
    } catch (err) {
      console.error("Kullanıcı detay hatası:", err);
      res.status(500).json({ error: "Kullanıcı alınamadı" });
    }
  });

  app.post("/api/app-users", async (req, res) => {
    try {
      const { username, email, password, name, phone, companyName, membershipType, membershipEndDate, planId, maxActivities, maxReservationsPerMonth, notes, roleIds } = req.body;
      
      // Check if username or email already exists
      const existingUsername = await storage.getAppUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Bu kullanıcı adi zaten kullaniliyor" });
      }
      const existingEmail = await storage.getAppUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Bu e-posta zaten kullaniliyor" });
      }

      // Hash password with salt using pbkdf2
      const passwordHash = hashPassword(password);

      const user = await storage.createAppUser({
        username,
        email,
        passwordHash,
        name,
        phone,
        companyName,
        membershipType: membershipType || 'trial',
        membershipStartDate: new Date(),
        membershipEndDate: membershipEndDate ? new Date(membershipEndDate) : null,
        planId,
        maxActivities: maxActivities || 5,
        maxReservationsPerMonth: maxReservationsPerMonth || 100,
        notes,
        isActive: true,
      });

      // Assign roles if provided
      if (roleIds && roleIds.length > 0) {
        for (const roleId of roleIds) {
          await storage.assignUserRole({ userId: user.id, roleId });
        }
      }

      res.json(user);
    } catch (err) {
      console.error("Kullanıcı oluşturma hatası:", err);
      res.status(500).json({ error: "Kullanıcı oluşturulamadi" });
    }
  });

  app.patch("/api/app-users/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { password, roleIds, ...updateData } = req.body;

      // If password is provided, hash it with salt
      if (password) {
        updateData.passwordHash = hashPassword(password);
      }

      // Convert date strings to Date objects if provided
      if (updateData.membershipEndDate) {
        updateData.membershipEndDate = new Date(updateData.membershipEndDate);
      }
      if (updateData.membershipStartDate) {
        updateData.membershipStartDate = new Date(updateData.membershipStartDate);
      }

      const user = await storage.updateAppUser(id, updateData);

      // Update roles if provided
      if (roleIds !== undefined) {
        // Get current roles
        const currentRoles = await storage.getUserRoles(id);
        const currentRoleIds = currentRoles.map(r => r.roleId);

        // Remove roles not in new list
        for (const roleId of currentRoleIds) {
          if (!roleIds.includes(roleId)) {
            await storage.removeUserRole(id, roleId);
          }
        }

        // Add new roles
        for (const roleId of roleIds) {
          if (!currentRoleIds.includes(roleId)) {
            await storage.assignUserRole({ userId: id, roleId });
          }
        }
      }

      res.json(user);
    } catch (err) {
      console.error("Kullanıcı güncelleme hatası:", err);
      res.status(500).json({ error: "Kullanıcı güncellenemedi" });
    }
  });

  app.delete("/api/app-users/:id", async (req, res) => {
    try {
      const user = await storage.getAppUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      if (user.isSystemProtected) {
        return res.status(403).json({ error: "Sistem kullanıcısı silinemez" });
      }
      await storage.deleteAppUser(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Kullanıcı silme hatası:", err);
      res.status(500).json({ error: "Kullanıcı silinemedi" });
    }
  });

  // === USER AUTHENTICATION ===

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Try to find user by username first, then by email (case-insensitive)
      let user = await storage.getAppUserByUsername(username);
      if (!user) {
        // Try email lookup if username not found
        user = await storage.getAppUserByEmail(username);
      }

      // Log login attempt
      const logEntry: {
        userId: number | null;
        username: string;
        ipAddress: string;
        userAgent: string;
        status: 'success' | 'failed' | 'blocked';
        failureReason: string;
      } = {
        userId: user?.id || null,
        username,
        ipAddress: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        status: 'failed',
        failureReason: '',
      };

      if (!user) {
        logEntry.failureReason = 'Kullanıcı bulunamadı';
        await storage.createUserLoginLog(logEntry);
        return res.status(401).json({ error: "Geçersiz kullanıcı adi veya şifre" });
      }

      if (!user.isActive) {
        logEntry.failureReason = 'Hesap aktif degil';
        await storage.createUserLoginLog(logEntry);
        return res.status(401).json({ error: "Hesabıniz aktif degil" });
      }

      if (user.isSuspended) {
        logEntry.failureReason = 'Hesap askiya alınmış';
        await storage.createUserLoginLog(logEntry);
        return res.status(401).json({ error: "Hesabıniz askiya alınmış: " + (user.suspendReason || '') });
      }

      // Verify password using salted hash
      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        logEntry.failureReason = 'Yanlış şifre';
        await storage.createUserLoginLog(logEntry);
        return res.status(401).json({ error: "Geçersiz kullanıcı adi veya şifre" });
      }

      // Check membership expiration
      if (user.membershipEndDate && new Date(user.membershipEndDate) < new Date()) {
        logEntry.failureReason = 'Üyelik süresi dolmus';
        await storage.createUserLoginLog(logEntry);
        return res.status(401).json({ error: "Üyelik süresiz dolmus. Lutfen yenileyin." });
      }

      // Successful login
      logEntry.status = 'success';
      logEntry.failureReason = '';
      await storage.createUserLoginLog(logEntry);
      await storage.updateAppUserLoginTime(user.id);

      // Get user permissions
      const permissions = await storage.getUserPermissions(user.id);
      const roles = await storage.getUserRoles(user.id);
      
      // Get tenant information
      let tenant = null;
      if (user.tenantId) {
        tenant = await storage.getTenant(user.tenantId);
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Giriş yapılamadı" });
        }

        // Store session data for server-side authorization
        req.session.userId = user.id;
        req.session.tenantId = user.tenantId || undefined;
        req.session.username = user.username;
        req.session.roles = roles.map(r => r.roleId);
        req.session.permissions = permissions.map(p => p.key);

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Giriş yapılamadı" });
          }

          // Don't send password hash
          const { passwordHash: _, ...safeUser } = user;

          res.json({
            user: safeUser,
            permissions: permissions.map(p => p.key),
            roles: roles.map(r => r.roleId),
            tenant: tenant ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              primaryColor: tenant.primaryColor,
              accentColor: tenant.accentColor,
              logoUrl: tenant.logoUrl,
            } : null,
          });
        });
      });
    } catch (err) {
      console.error("Giriş hatası:", err);
      res.status(500).json({ error: "Giriş yapılamadı" });
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.json({ authenticated: false });
      }

      const user = await storage.getAppUser(Number(userId));
      if (!user) {
        req.session.destroy(() => {});
        return res.json({ authenticated: false });
      }

      const permissions = await storage.getUserPermissions(user.id);
      const roles = await storage.getUserRoles(user.id);
      const { passwordHash: _, ...safeUser } = user;

      res.json({
        authenticated: true,
        user: safeUser,
        permissions: permissions.map(p => p.key),
        roles: roles.map(r => r.roleId),
      });
    } catch (err) {
      console.error("Session check error:", err);
      res.json({ authenticated: false });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      // SECURITY: Only use session-based authentication - no header fallback
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }

      const user = await storage.getAppUser(Number(userId));
      if (!user) {
        // Session has invalid user - destroy it
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Kullanıcı bulunamadı" });
      }

      const permissions = await storage.getUserPermissions(user.id);
      const roles = await storage.getUserRoles(user.id);
      
      // Get tenant information
      let tenant = null;
      if (user.tenantId) {
        tenant = await storage.getTenant(user.tenantId);
      }

      const { passwordHash: _, ...safeUser } = user;

      res.json({
        user: safeUser,
        permissions: permissions.map(p => p.key),
        roles: roles.map(r => r.roleId),
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primaryColor,
          accentColor: tenant.accentColor,
          logoUrl: tenant.logoUrl,
        } : null,
      });
    } catch (err) {
      console.error("Oturum kontrol hatası:", err);
      res.status(500).json({ error: "Oturum kontrol edilemedi" });
    }
  });

  // Logout - destroy session and clear cookie
  app.post("/api/auth/logout", (req, res) => {
    // Clear session data first
    req.session.userId = undefined;
    req.session.tenantId = undefined;
    req.session.username = undefined;
    req.session.roles = undefined;
    req.session.permissions = undefined;
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Çıkış yapılamadı" });
      }
      // Clear session cookie with same options used in session middleware
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      res.json({ success: true });
    });
  });

  // Change password - requires authenticated user
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Mevcut ve yeni şifre gerekli" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmali" });
      }

      const user = await storage.getAppUser(Number(userId));
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      // Verify current password
      if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: "Mevcut şifre yanlış" });
      }

      // Hash new password and update
      const newPasswordHash = hashPassword(newPassword);
      await storage.updateAppUser(user.id, { passwordHash: newPasswordHash });

      res.json({ success: true, message: "Şifre basariyla değiştirildi" });
    } catch (err) {
      console.error("Şifre değiştirme hatası:", err);
      res.status(500).json({ error: "Şifre değiştirilemedi" });
    }
  });

  // === ROLES ===
  // AUTHORIZATION: Requires settings.view/manage permission

  app.get("/api/roles", requirePermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (err) {
      console.error("Rol listesi hatası:", err);
      res.status(500).json({ error: "Roller alınamadı" });
    }
  });

  app.post("/api/roles", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const role = await storage.createRole(req.body);
      res.json(role);
    } catch (err) {
      console.error("Rol oluşturma hatası:", err);
      res.status(500).json({ error: "Rol oluşturulamadi" });
    }
  });

  app.patch("/api/roles/:id", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const role = await storage.updateRole(Number(req.params.id), req.body);
      res.json(role);
    } catch (err) {
      console.error("Rol güncelleme hatası:", err);
      res.status(500).json({ error: "Rol güncellenemedi" });
    }
  });

  app.delete("/api/roles/:id", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      await storage.deleteRole(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Rol silme hatası:", err);
      res.status(400).json({ error: err.message || "Rol silinemedi" });
    }
  });

  // === PERMISSIONS ===

  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (err) {
      console.error("Izin listesi hatası:", err);
      res.status(500).json({ error: "Izinler alınamadı" });
    }
  });

  app.post("/api/permissions/initialize", async (req, res) => {
    try {
      await storage.initializeDefaultPermissions();
      res.json({ success: true });
    } catch (err) {
      console.error("Izin baslat hatası:", err);
      res.status(500).json({ error: "Izinler baslatilamadi" });
    }
  });

  // === ROLE PERMISSIONS ===

  app.get("/api/roles/:id/permissions", async (req, res) => {
    try {
      const rolePermissions = await storage.getRolePermissions(Number(req.params.id));
      res.json(rolePermissions);
    } catch (err) {
      console.error("Rol izinleri hatası:", err);
      res.status(500).json({ error: "Rol izinleri alınamadı" });
    }
  });

  app.put("/api/roles/:id/permissions", async (req, res) => {
    try {
      const { permissionIds } = req.body;
      await storage.setRolePermissions(Number(req.params.id), permissionIds || []);
      res.json({ success: true });
    } catch (err) {
      console.error("Rol izinleri güncelleme hatası:", err);
      res.status(500).json({ error: "Rol izinleri güncellenemedi" });
    }
  });

  // === USER ROLES ===

  app.get("/api/app-users/:id/roles", async (req, res) => {
    try {
      const userRoles = await storage.getUserRoles(Number(req.params.id));
      res.json(userRoles);
    } catch (err) {
      console.error("Kullanıcı rolleri hatası:", err);
      res.status(500).json({ error: "Kullanıcı rolleri alınamadı" });
    }
  });

  app.get("/api/app-users/:id/permissions", async (req, res) => {
    try {
      const permissions = await storage.getUserPermissions(Number(req.params.id));
      res.json(permissions);
    } catch (err) {
      console.error("Kullanıcı izinleri hatası:", err);
      res.status(500).json({ error: "Kullanıcı izinleri alınamadı" });
    }
  });

  // === USER LOGIN LOGS ===

  app.get("/api/user-login-logs", async (req, res) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const logs = await storage.getUserLoginLogs(userId, limit);
      res.json(logs);
    } catch (err) {
      console.error("Kullanıcı giriş loglari hatası:", err);
      res.status(500).json({ error: "Giriş loglari alınamadı" });
    }
  });

  // === NOTIFICATION PREFERENCES ===

  // Get user notification preferences
  app.get("/api/user-notification-preferences", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const prefs = await storage.getUserNotificationPreferences(userId);
      res.json(prefs);
    } catch (err) {
      console.error("Bildirim tercihleri hatası:", err);
      res.status(500).json({ error: "Bildirim tercihleri alınamadı" });
    }
  });

  // Set user notification preference
  app.post("/api/user-notification-preferences", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      const tenantId = (req as any).session?.tenantId;
      if (!userId || !tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const pref = await storage.setUserNotificationPreference({
        userId,
        tenantId,
        ...req.body
      });
      res.json(pref);
    } catch (err) {
      console.error("Bildirim tercihi kaydetme hatası:", err);
      res.status(500).json({ error: "Bildirim tercihi kaydedilemedi" });
    }
  });

  // Delete user notification preference
  app.delete("/api/user-notification-preferences/:notificationType", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      await storage.deleteUserNotificationPreference(userId, req.params.notificationType);
      res.json({ success: true });
    } catch (err) {
      console.error("Bildirim tercihi silme hatası:", err);
      res.status(500).json({ error: "Bildirim tercihi silinemedi" });
    }
  });

  // Get tenant notification settings
  app.get("/api/tenant-notification-settings", async (req, res) => {
    try {
      const tenantId = (req as any).session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const settings = await storage.getTenantNotificationSettings(tenantId);
      res.json(settings);
    } catch (err) {
      console.error("Acenta bildirim ayarlari hatası:", err);
      res.status(500).json({ error: "Bildirim ayarlari alınamadı" });
    }
  });

  // Set tenant notification setting
  app.post("/api/tenant-notification-settings", async (req, res) => {
    try {
      const tenantId = (req as any).session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const setting = await storage.setTenantNotificationSetting({
        tenantId,
        ...req.body
      });
      res.json(setting);
    } catch (err) {
      console.error("Bildirim ayari kaydetme hatası:", err);
      res.status(500).json({ error: "Bildirim ayari kaydedilemedi" });
    }
  });

  // Delete tenant notification setting
  app.delete("/api/tenant-notification-settings/:notificationType", async (req, res) => {
    try {
      const tenantId = (req as any).session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      await storage.deleteTenantNotificationSetting(tenantId, req.params.notificationType);
      res.json({ success: true });
    } catch (err) {
      console.error("Bildirim ayari silme hatası:", err);
      res.status(500).json({ error: "Bildirim ayari silinemedi" });
    }
  });

  // === IN-APP NOTIFICATIONS ===

  // Get in-app notifications
  app.get("/api/in-app-notifications", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getInAppNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (err) {
      console.error("Uygulama bildirimleri hatası:", err);
      res.status(500).json({ error: "Bildirimler alınamadı" });
    }
  });

  // Get unread notification count
  app.get("/api/in-app-notifications/count", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      const notifications = await storage.getInAppNotifications(userId, true);
      res.json({ count: notifications.length });
    } catch (err) {
      console.error("Bildirim sayısı hatası:", err);
      res.status(500).json({ error: "Bildirim sayısı alınamadı" });
    }
  });

  // Mark notification as read
  app.patch("/api/in-app-notifications/:id/read", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      await storage.markNotificationAsRead(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Bildirim okundu işaretleme hatası:", err);
      res.status(500).json({ error: "Bildirim okundu işaretlenemedi" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/in-app-notifications/read-all", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Tüm bildirimleri okundu işaretleme hatası:", err);
      res.status(500).json({ error: "Bildirimler okundu işaretlenemedi" });
    }
  });

  // Delete notification
  app.delete("/api/in-app-notifications/:id", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Oturum gerekli" });
      }
      await storage.deleteInAppNotification(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error("Bildirim silme hatası:", err);
      res.status(500).json({ error: "Bildirim silinemedi" });
    }
  });

  // === BLOG API ===
  
  // Get all blog posts
  app.get("/api/blog-posts", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      const status = req.query.status as string | undefined;
      const posts = await storage.getBlogPosts(tenantId, status);
      res.json(posts);
    } catch (err) {
      console.error("Blog yazıları alınırken hata:", err);
      res.status(500).json({ error: "Blog yazıları alınamadı" });
    }
  });

  // Get single blog post
  app.get("/api/blog-posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      if (!post) {
        return res.status(404).json({ error: "Blog yazısı bulunamadı" });
      }
      res.json(post);
    } catch (err) {
      console.error("Blog yazısı alınırken hata:", err);
      res.status(500).json({ error: "Blog yazısı alınamadı" });
    }
  });

  // Create blog post
  app.post("/api/blog-posts", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      const { title, slug, excerpt, content, featuredImageUrl, author, metaTitle, metaDescription, metaKeywords, status, category, tags, publishedAt } = req.body;
      
      // Generate slug from title if not provided
      const finalSlug = slug || title.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const post = await storage.createBlogPost({
        tenantId,
        title,
        slug: finalSlug,
        excerpt,
        content,
        featuredImageUrl,
        author,
        metaTitle,
        metaDescription,
        metaKeywords,
        status: status || 'draft',
        category,
        tags: JSON.stringify(tags || []),
        publishedAt: publishedAt ? new Date(publishedAt) : (status === 'published' ? new Date() : null)
      });
      res.status(201).json(post);
    } catch (err) {
      console.error("Blog yazısı oluşturulurken hata:", err);
      res.status(500).json({ error: "Blog yazısı oluşturulamadı" });
    }
  });

  // Update blog post
  app.patch("/api/blog-posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, slug, excerpt, content, featuredImageUrl, author, metaTitle, metaDescription, metaKeywords, status, category, tags, publishedAt } = req.body;
      
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (content !== undefined) updateData.content = content;
      if (featuredImageUrl !== undefined) updateData.featuredImageUrl = featuredImageUrl;
      if (author !== undefined) updateData.author = author;
      if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
      if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
      if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'published' && !publishedAt) {
          updateData.publishedAt = new Date();
        }
      }
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
      
      const post = await storage.updateBlogPost(id, updateData);
      res.json(post);
    } catch (err) {
      console.error("Blog yazısı güncellenirken hata:", err);
      res.status(500).json({ error: "Blog yazısı güncellenemedi" });
    }
  });

  // Delete blog post
  app.delete("/api/blog-posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlogPost(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Blog yazısı silinirken hata:", err);
      res.status(500).json({ error: "Blog yazısı silinemedi" });
    }
  });

  // Register public API routes for external website integration
  registerPublicApiRoutes(app);

  return httpServer;
}

// Seed function
async function seedDatabase() {
  // Seed default subscription plans and features
  await storage.seedDefaultSubscriptionPlans();
  await storage.seedDefaultPlanFeatures();
  
  // Initialize default roles and permissions for user management
  await storage.initializeDefaultPermissions();
  
  // Create default tenant and admin user if not exists
  const defaultTenant = await storage.createDefaultTenantIfNotExists();
  
  // Create default platform admin for Super Admin panel if not exists
  const existingPlatformAdmin = await storage.getPlatformAdminByEmail("flymet.mail@gmail.com");
  if (!existingPlatformAdmin) {
    await storage.createPlatformAdmin({
      email: "flymet.mail@gmail.com",
      name: "Süper Admin",
      passwordHash: hashPassword("Netim1905"),
      role: "super_admin",
      isActive: true
    });
    console.log("Default platform admin created: flymet.mail@gmail.com / Netim1905");
  }
  
  // Check if any admin user exists for this tenant
  const existingUsers = await storage.getAppUsers();
  const tenantUsers = existingUsers.filter(u => u.tenantId === defaultTenant.id);
  
  if (tenantUsers.length === 0) {
    // Create default super admin user (cannot be deleted from system)
    await storage.createAppUser({
      tenantId: defaultTenant.id,
      username: "superadmin",
      email: "flymet.mail@gmail.com",
      passwordHash: hashPassword("Netim1905"), // Hash password for security
      name: "Süper Admin",
      isActive: true,
      isSystemProtected: true // Cannot be deleted
    });
    console.log("Default super admin user created: superadmin / Netim1905");
  }
  
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
