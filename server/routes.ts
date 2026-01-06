import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertActivitySchema, insertCapacitySchema, insertReservationSchema, insertSubscriptionPlanSchema, insertSubscriptionSchema, insertSubscriptionPaymentSchema } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { encrypt, decrypt } from "./encryption";
import { logError, logWarn, logInfo, attachLogsToSupportRequest, getSupportRequestLogs, getRecentLogs } from "./logger";

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

// Permission middleware - checks if user has required permissions
import type { Request, Response, NextFunction } from "express";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow platform admins (Super Admin)
  if (req.session?.isPlatformAdmin && req.session?.platformAdminId) {
    return next();
  }
  // Regular tenant users need both userId and tenantId
  if (!req.session?.userId || !req.session?.tenantId) {
    return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
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
  return (req: Request, res: Response, next: NextFunction) => {
    // Platform admins have all permissions
    if (req.session?.isPlatformAdmin && req.session?.platformAdminId) {
      return next();
    }
    
    if (!req.session?.userId || !req.session?.tenantId) {
      return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
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
  ACTIVITIES_VIEW: "activities.view",
  ACTIVITIES_MANAGE: "activities.manage",
  CALENDAR_VIEW: "calendar.view",
  CALENDAR_MANAGE: "calendar.manage",
  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",
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

// License middleware - checks if write operations are allowed
async function checkLicenseForWrite(): Promise<{ allowed: boolean; message: string; status?: string }> {
  const verification = await storage.verifyLicense();
  
  if (!verification.canWrite) {
    let message = verification.message;
    
    if (verification.status === 'grace') {
      message = `Lisansınız dolmuş (Ek süre: ${verification.graceDaysRemaining} gün). Salt okunur modasınız - yeni işlem yapamazsınız.`;
    } else if (verification.status === 'expired') {
      message = "Lisansınız tamamen dolmuş. Sisteme erişim için lisansınızı yenileyin.";
    } else if (verification.status === 'suspended') {
      message = "Lisansınız askıya alınmış. Destek ile iletişime geçin.";
    }
    
    return { allowed: false, message, status: verification.status };
  }
  
  return { allowed: true, message: "OK", status: verification.status };
}

// Default bot rules (used when no custom rules are defined in database)
const DEFAULT_BOT_RULES = `
=== 1. İLETİŞİM PROTOKOLÜ ===

1.1 DİL UYUMU: Müşteri hangi dilde yazıyorsa o dilde devam et.

1.2 KARŞILAMA: İlk mesajda talep yoksa sadece şunu yaz:
"Merhaba, Sky Fethiye'ye hoş geldiniz. Size nasıl yardımcı olabilirim? / You may continue in English if you wish."

1.3 ÜSLUP: Kurumsal, net, güven veren ve çözüm odaklı bir dil kullan.

1.4 SORU YÖNETİMİ: Müşteriyi anlamak için tek seferde en fazla bir (1) açıklayıcı soru sor. Birden fazla soruyu aynı mesajda birleştirme.

1.5 BİLGİ SINIRI: Sadece Sky Fethiye hizmetleri hakkında bilgi ver. Bilgileri sadece "Aktiviteler", "Paket Turlar" ve sistem verilerinden al. İnternetten genel bilgi çekme.

=== 2. MÜSAİTLİK VE KONTENJAN ===

2.1 MÜSAİTLİK KONTROLÜ: Yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ'ndeki yarın tarihini kullan.

2.2 BİLGİ YOKSA: Müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.

=== 3. AKTİVİTE VE REZERVASYON KURALLARI ===

3.1 OPERASYONEL GRUPLANDIRMA:
- Yarım Günlük: Yamaç Paraşütü, Tüplü Dalış (Yarım Gün), ATV Safari, At Turu
- Tam Günlük: Rafting, Jeep Safari, Tekne Turu, Tüplü Dalış (Tam Gün)
- Aynı Gün Yapılabilenler: Yamaç Paraşütü ve tüm yarım günlük aktiviteler

3.2 REZERVASYON AKIŞI:
1) Müsaitlik: "Takvim & Kapasite" verilerine göre cevap ver
2) Bilgi Teyidi: Rezervasyon linki vermeden önce kişi sayısı, isim ve telefon bilgilerini mutlaka teyit et
3) Link Paylaşımı: Müşterinin diline uygun (TR/EN) rezervasyon linkini gönder. Birden fazla aktivite varsa tüm linkleri paylaş ve sepete ekleyerek ödeme yapabileceğini belirt

3.3 UÇUŞ & DALIŞ PAKETİ: Her iki aktiviteyle ilgilenenlere indirimli "Uçuş ve Dalış Paketi" linkini öner.
- UYARI: Aynı gün isteniyorsa dalışın mutlaka "Yarım Gün" olması gerektiğini, tam günün zamanlama açısından uymadığını belirt.

3.4 YOĞUN SEZON (Temmuz-Ağustos): "Tam Günlük Tüplü Dalış" ve "Tekne Turu" için en erken 24 saat sonrasına rezervasyon yapılabileceğini vurgula.

3.5 REZERVASYON LİNKİ SEÇİMİ: 
- İngilizce konuşuyorsan "EN Reservation Link" kullan
- İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback)
- Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan

3.6 TEMEL KURAL: Bot asla doğrudan rezervasyon oluşturmaz. Ön ödeme olmadan rezervasyon alınmaz. Müsaitlik varsa "Müsaitlik mevcut, rezervasyonunuzu web sitemizden oluşturabilirsiniz" de ve ilgili linki paylaş.

=== 4. BİLGİ SORGULARI ===

4.1 TRANSFER SORULARI: Aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.

4.2 EKSTRA HİZMETLER: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda "Ekstra Hizmetler" listesini kullan ve fiyatları ver.

4.3 PAKET TURLAR: Birden fazla aktivite içeren paket turlar hakkında soru gelirse PAKET TURLAR bölümünü kullan.

4.4 SIK SORULAN SORULAR: Her aktivite/paket tur için tanımlı SSS bölümünü kontrol et. Müşterinin sorusu bunlarla eşleşiyorsa oradaki cevabı kullan.

=== 5. SİPARİŞ YÖNETİMİ ===

5.1 SİPARİŞ NUMARASI: Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.

5.2 SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa, konuşulan dile göre "Türkçe Sipariş Onay Mesajı" veya "İngilizce Sipariş Onay Mesajı" alanını seç. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.

5.3 REZERVASYON TAKİP SAYFASI: Rezervasyon onaylandıktan sonra müşteriye şunu mutlaka bildir:
"Rezervasyonunuzun detaylarını görüntüleyebileceğiniz ve değişiklik/iptal talebi oluşturabileceğiniz takip linkinizi WhatsApp'a gönderdik. Bu link üzerinden tüm işlemlerinizi yapabilirsiniz."

5.4 DEĞİŞİKLİK/İPTAL TALEPLERİ: Saat/tarih değişikliği veya iptal isteyenlere şunu söyle:
"Size gönderdiğimiz takip linkinden rezervasyon bilgilerinizi görüntüleyebilir ve değişiklik/iptal talebi oluşturabilirsiniz. Takip linkiniz yoksa veya süresi dolmuşsa, sipariş numaranızı paylaşın, size yeni link gönderelim."

=== 6. SORUN ÇÖZME VE ESKALASYON ===

6.1 ESKALASYON GEREKTİREN DURUMLAR:
- Sorun 2 mesaj içinde çözülemiyorsa
- Müşteri memnuniyetsiz veya agresifse
- "Destek talebi", "Operatör", "Beni arayın" gibi ifadeler kullanılırsa
- Fiyat indirimi, grup indirimi gibi özel talepler gelirse
- Takip sayfasından gelen talepler (bunlar otomatik bildirim olarak gelir)

6.2 ESKALASYON SÜRECİ: Bu durumlarda şunu söyle:
"Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir."
`;

// Replit AI Integration for Gemini
let ai: GoogleGenAI | null = null;
try {
  if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
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
      if (a.reservationLink) desc += `\n  TR Rezervasyon Linki: ${a.reservationLink}`;
      if (a.reservationLinkEn) desc += `\n  EN Reservation Link: ${a.reservationLinkEn}`;
      
      // Onay mesajı bilgisi (only if access enabled)
      if (botAccess.confirmation && a.confirmationMessage) {
        desc += `\n  Türkçe Sipariş Onay Mesajı: ${a.confirmationMessage}`;
      }
      
      // Transfer bilgisi (only if access enabled)
      if (botAccess.transfer) {
        if (a.hasFreeHotelTransfer) {
          desc += `\n  Ücretsiz Otel Transferi: EVET`;
          try {
            const zones = JSON.parse(a.transferZones || '[]');
            if (zones.length > 0) {
              desc += ` (Bölgeler: ${zones.join(', ')})`;
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
      
      // Onay mesajı bilgisi (only if access enabled)
      if (botAccess.confirmation && pt.confirmationMessage) {
        desc += `\n  Türkçe Sipariş Onay Mesajı: ${pt.confirmationMessage}`;
      }
      
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
  
  // Build reservation context
  let reservationContext = "";
  if (context.hasReservation && context.reservation) {
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

  const systemPrompt = `${basePrompt}

${dateContext}

=== MEVCUT AKTİVİTELER ===
${activityDescriptions}
${packageToursSection}${capacityInfo}
${reservationContext}
${customerRequestContext}

=== ÖNEMLİ KURALLAR ===
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
  app.get(api.activities.list.path, async (req, res) => {
    const tenantId = req.session?.tenantId;
    const items = await storage.getActivities(tenantId);
    res.json(items);
  });

  app.post(api.activities.create.path, async (req, res) => {
    try {
      // License check for write operations
      const licenseCheck = await checkLicenseForWrite();
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
      }
      
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
      // License check for write operations
      const licenseCheck = await checkLicenseForWrite();
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

  app.delete(api.activities.delete.path, async (req, res) => {
    // License check for write operations
    const licenseCheck = await checkLicenseForWrite();
    if (!licenseCheck.allowed) {
      return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
    }
    
    await storage.deleteActivity(Number(req.params.id));
    res.status(204).send();
  });

  // === Package Tours ===
  app.get("/api/package-tours", async (req, res) => {
    try {
      const tenantId = req.session?.tenantId;
      const tours = await storage.getPackageTours(tenantId);
      res.json(tours);
    } catch (err) {
      res.status(500).json({ error: "Paket turlar alınamadı" });
    }
  });

  app.get("/api/package-tours/:id", async (req, res) => {
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

  app.post("/api/package-tours", async (req, res) => {
    try {
      // License check for write operations
      const licenseCheck = await checkLicenseForWrite();
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
      }
      
      const { name, nameAliases, description, price, priceUsd, confirmationMessage, reservationLink, reservationLinkEn, active, faq, activities: tourActivities } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Paket tur adi zorunlu" });
      }
      
      const tour = await storage.createPackageTour({
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
  app.get(api.capacity.list.path, async (req, res) => {
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

  app.post(api.capacity.create.path, async (req, res) => {
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
      const licenseCheck = await checkLicenseForWrite();
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
  app.get(api.reservations.list.path, async (req, res) => {
    const tenantId = req.session?.tenantId;
    const items = await storage.getReservations(tenantId);
    res.json(items);
  });

  app.post(api.reservations.create.path, async (req, res) => {
    // License check for write operations
    const licenseCheck = await checkLicenseForWrite();
    if (!licenseCheck.allowed) {
      return res.status(403).json({ error: licenseCheck.message, licenseStatus: licenseCheck.status });
    }
    
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
      // License check using established guard
      const licenseCheck = await checkLicenseForWrite();
      if (!licenseCheck.allowed) {
        return res.status(403).json({ error: licenseCheck.message });
      }
      
      const tenantId = req.session?.tenantId;
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
      
      // Try to send email notification to admin
      try {
        const developerEmail = await storage.getSetting("developerEmail");
        if (developerEmail) {
          const requestTypeText = requestType === 'time_change' ? 'Saat Degisikligi' : 
                                  requestType === 'cancellation' ? 'İptal Talebi' : 'Diger Talep';
          
          const emailBody = `
Yeni Müşteri Talebi

Talep Tipi: ${requestTypeText}
Müşteri: ${reservation.customerName}
Telefon: ${reservation.customerPhone}
E-posta: ${reservation.customerEmail || '-'}

Rezervasyon Bilgileri:
- Aktivite: ${activityName}
- Tarih: ${reservation.date}
- Saat: ${reservation.time}
- Kişi Sayısı: ${reservation.quantity}

${requestType === 'time_change' && preferredTime ? `Tercih Edilen Saat: ${preferredTime}` : ''}
${requestDetails ? `Ek Açıklama: ${requestDetails}` : ''}

---
Bu talep müşteri takip sayfasından gönderilmistir.
          `.trim();
          
          // Send email using nodemailer (if configured)
          const gmailUser = await storage.getSetting("gmailUser");
          const gmailAppPasswordEncrypted = await storage.getSetting("gmailAppPassword");
          
          if (gmailUser && gmailAppPasswordEncrypted) {
            const nodemailer = await import("nodemailer");
            const { decrypt } = await import("./encryption");
            
            const gmailAppPassword = decrypt(gmailAppPasswordEncrypted);
            
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: gmailUser,
                pass: gmailAppPassword,
              },
            });
            
            await transporter.sendMail({
              from: gmailUser,
              to: developerEmail,
              subject: `[Müşteri Talebi] ${requestTypeText} - ${reservation.customerName}`,
              text: emailBody,
            });
            
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
      const requests = await storage.getCustomerRequests();
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
            
            await storage.createReservation({
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

      // Check if user has any pending customer requests
      const customerRequestsForPhone = await storage.getCustomerRequestsByPhone(From);
      const pendingRequests = customerRequestsForPhone.filter(r => r.status === 'pending');

      // Get history
      const history = await storage.getMessages(From, 5);
      
      // Get context (activities, package tours, etc)
      const tenantId = req.session?.tenantId;
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
      let botAccess = {
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
      
      // Generate AI response with reservation context, capacity data, package tours, customer requests, and custom prompt
      const aiResponse = await generateAIResponse(history, { 
        activities: botAccess.activities ? activities : [], 
        packageTours: botAccess.packageTours ? packageTours : [],
        capacityData: botAccess.capacity ? upcomingCapacity : [],
        hasReservation: !!userReservation,
        reservation: userReservation,
        askForOrderNumber: !userReservation,
        customerRequests: customerRequestsForPhone,
        pendingRequests: pendingRequests,
        botAccess,
        botRules
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
      const { phone, customerName, activityName, date, time, activityId, packageTourId, trackingToken } = req.body;
      
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
      
      // Fetch confirmation message from activity or package tour
      let confirmationTemplate = "";
      if (packageTourId) {
        const packageTour = await storage.getPackageTour(packageTourId);
        if (packageTour?.confirmationMessage) {
          confirmationTemplate = packageTour.confirmationMessage;
        }
      } else if (activityId) {
        const activity = await storage.getActivity(activityId);
        if (activity?.confirmationMessage) {
          confirmationTemplate = activity.confirmationMessage;
        }
      }
      
      // Build tracking link if token is provided
      const trackingLink = trackingToken 
        ? `${req.protocol}://${req.get('host')}/takip/${trackingToken}`
        : '';
      
      // Use template with placeholder replacement, or fallback to default
      let message: string;
      if (confirmationTemplate) {
        message = confirmationTemplate
          .replace(/\{isim\}/gi, customerName)
          .replace(/\{tarih\}/gi, date)
          .replace(/\{saat\}/gi, time || '')
          .replace(/\{aktivite\}/gi, activityName)
          .replace(/\{takip_linki\}/gi, trackingLink);
      } else {
        message = `Merhaba ${customerName},

Rezervasyonunuz oluşturulmustur:
Aktivite: ${activityName}
Tarih: ${date}
${time ? `Saat: ${time}` : ''}

Sorularınız için bize bu numaradan yazabilirsiniz.

Sky Fethiye`;
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

  // === Send Custom WhatsApp Message (for customer requests) ===
  app.post("/api/send-whatsapp-custom-message", async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ error: "Eksik bilgi: telefon ve mesaj gerekli" });
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
      await logInfo('whatsapp', `Özel WhatsApp mesajı gönderildi: ${formattedPhone}`);
      
      // Also save the message to conversation history
      await storage.addMessage({
        phone: `whatsapp:+${formattedPhone}`,
        content: message,
        role: "assistant"
      });
      
      res.json({ success: true, messageSid: result.sid });
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
  
  // Protected settings endpoint (requires auth)
  app.get("/api/settings/:key", requirePermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (err) {
      res.status(400).json({ error: "Ayar alınamadı" });
    }
  });

  app.post("/api/settings/:key", requirePermission(PERMISSIONS.SETTINGS_MANAGE), async (req, res) => {
    try {
      let { value } = req.body;
      const authHeader = req.headers.authorization;
      
      // Protected settings that require bot rules authentication
      const protectedSettings = ['botRules', 'developerEmail'];
      if (protectedSettings.includes(req.params.key)) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: "Yetkilendirme gerekli" });
        }
        const token = authHeader.split(' ')[1];
        const storedToken = await storage.getSetting('botRulesSessionToken');
        if (!storedToken || storedToken !== token) {
          return res.status(401).json({ error: "Geçersiz oturum" });
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
            const existingSetting = await storage.getSetting('adminCredentials');
            if (existingSetting) {
              const existingCreds = JSON.parse(existingSetting);
              creds.passwordHash = existingCreds.passwordHash;
              delete creds.password;
              value = JSON.stringify(creds);
            }
          }
        } catch {}
      }
      
      const result = await storage.setSetting(req.params.key, value);
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

  // === Tenant Integrations API (Multi-tenant: Twilio, WooCommerce, Gmail) ===
  
  // Get all integrations for current tenant
  app.get("/api/tenant-integrations", async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Oturum bulunamadı" });
      }
      
      const integration = await storage.getTenantIntegration(tenantId);
      
      res.json({
        // Twilio
        twilioAccountSid: integration?.twilioAccountSid || '',
        twilioWhatsappNumber: integration?.twilioWhatsappNumber || '',
        twilioConfigured: integration?.twilioConfigured || false,
        twilioWebhookUrl: integration?.twilioWebhookUrl || '',
        
        // WooCommerce
        woocommerceStoreUrl: integration?.woocommerceStoreUrl || '',
        woocommerceConsumerKey: integration?.woocommerceConsumerKey || '',
        woocommerceConfigured: integration?.woocommerceConfigured || false,
        
        // Gmail
        gmailUser: integration?.gmailUser || '',
        gmailFromName: integration?.gmailFromName || '',
        gmailConfigured: integration?.gmailConfigured || false,
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
      
      await storage.upsertTenantIntegration(tenantId, {
        twilioAccountSid: accountSid,
        twilioAuthTokenEncrypted: encryptedToken,
        twilioWhatsappNumber: whatsappNumber,
        twilioWebhookUrl: webhookUrl,
        twilioConfigured: true,
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
  
  // Helper function to get Gmail credentials for a tenant
  async function getGmailCredentials(tenantId?: number): Promise<{ user: string; password: string; fromName?: string } | null> {
    // If tenantId provided, get from tenant integrations
    if (tenantId) {
      const integration = await storage.getTenantIntegration(tenantId);
      if (integration?.gmailUser && integration?.gmailAppPasswordEncrypted) {
        try {
          const gmailPassword = decrypt(integration.gmailAppPasswordEncrypted);
          return { 
            user: integration.gmailUser, 
            password: gmailPassword,
            fromName: integration.gmailFromName || undefined
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
      return { user: envUser, password: envPassword };
    }
    
    return null;
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
      const filter = req.query.filter as 'all' | 'with_reservation' | 'human_intervention' | undefined;
      const conversations = await storage.getAllConversations(filter);
      res.json(conversations);
    } catch (err) {
      res.status(500).json({ error: "Konuşmalar alınamadı" });
    }
  });

  // Message Analytics Endpoint
  app.get("/api/conversations/analytics", async (req, res) => {
    try {
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
      
      // Get all conversations
      const allConversations = await storage.getAllConversations('all');
      
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
      const openRequests = await storage.getAllSupportRequests('open');
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
      const status = req.query.status as 'open' | 'resolved' | undefined;
      const requests = await storage.getAllSupportRequests(status);
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
      const { phone, reservationId, description } = req.body;
      const existing = await storage.getOpenSupportRequest(phone);
      if (existing) {
        return res.json(existing);
      }
      const created = await storage.createSupportRequest({ phone, reservationId, description, status: 'open' });
      
      await attachLogsToSupportRequest(created.id, phone);
      await logInfo('system', `Destek talebi oluşturuldu: #${created.id}`, { phone, reservationId }, phone);
      
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

      // Store the support request in database for tracking
      const formattedPhone = `[${requestTypeLabels[requestType] || requestType}] ${senderName}${senderEmail ? ` <${senderEmail}>` : ''} - ${subject}`;
      
      await storage.createSupportRequest({
        phone: formattedPhone.substring(0, 255),
        status: 'open'
      });

      // Send email via Gmail SMTP if credentials are configured
      let emailSent = false;
      const gmailCreds = await getGmailCredentials();
      
      if (gmailCreds && developerEmail) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: gmailCreds.user,
              pass: gmailCreds.password,
            },
          });

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                Yeni Destek Talebi - Smartur
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Gönderen:</td>
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

          await transporter.sendMail({
            from: `"Smartur Destek" <${gmailCreds.user}>`,
            to: developerEmail,
            replyTo: senderEmail || undefined,
            subject: `[Destek] ${requestTypeLabels[requestType] || requestType}: ${subject}`,
            html: emailHtml,
          });

          emailSent = true;
          console.log(`Support request email sent to ${developerEmail}`);
        } catch (emailErr) {
          console.error("Email sending failed:", emailErr);
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
      const agency = await storage.createAgency(req.body);
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
      const { agencyId, periodStart, periodEnd, description, guestCount, baseAmountTl, vatRatePct, method, reference, notes } = req.body;
      
      const vatAmount = Math.round(baseAmountTl * (vatRatePct / 100));
      const totalAmount = baseAmountTl + vatAmount;
      
      const payout = await storage.createAgencyPayout({
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
      const agencyId = req.query.agencyId ? parseInt(req.query.agencyId as string) : undefined;
      const dispatches = await storage.getSupplierDispatches(agencyId);
      res.json(dispatches);
    } catch (err) {
      res.status(500).json({ error: "Gönderimler alınamadı" });
    }
  });

  app.post("/api/finance/dispatches", async (req, res) => {
    try {
      const { agencyId, activityId, dispatchDate, dispatchTime, guestCount, unitPayoutTl, notes } = req.body;
      
      if (!agencyId || !dispatchDate) {
        return res.status(400).json({ error: "agencyId ve dispatchDate zorunlu" });
      }
      
      let finalUnitPayoutTl = unitPayoutTl || 0;
      let rateId: number | null = null;
      
      const activeRate = await storage.getActiveRateForDispatch(agencyId, activityId || null, dispatchDate);
      if (activeRate) {
        finalUnitPayoutTl = activeRate.unitPayoutTl || 0;
        rateId = activeRate.id;
      } else if (!unitPayoutTl) {
        const agency = await storage.getAgency(agencyId);
        finalUnitPayoutTl = agency?.defaultPayoutPerGuest || 0;
      }
      
      const totalPayoutTl = (guestCount || 0) * finalUnitPayoutTl;
      
      const dispatch = await storage.createSupplierDispatch({
        agencyId,
        activityId,
        dispatchDate,
        dispatchTime,
        guestCount: guestCount || 0,
        unitPayoutTl: finalUnitPayoutTl,
        totalPayoutTl,
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

  app.get("/api/finance/dispatches/summary", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const summary = await storage.getSupplierDispatchSummary(startDate, endDate);
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

  // === LICENSE & SUBSCRIPTION ===
  
  // Get current license
  app.get("/api/license", async (req, res) => {
    try {
      const currentLicense = await storage.getLicense();
      const usage = await storage.getLicenseUsage();
      
      if (!currentLicense) {
        return res.json({ 
          license: null, 
          usage,
          status: { valid: false, message: "Lisans bulunamadı" }
        });
      }
      
      const verification = await storage.verifyLicense();
      res.json({ 
        license: currentLicense, 
        usage,
        status: verification
      });
    } catch (err) {
      console.error("Lisans bilgisi alınamadı:", err);
      res.status(500).json({ error: "Lisans bilgisi alınamadı" });
    }
  });

  // Verify license
  app.get("/api/license/verify", async (req, res) => {
    try {
      const verification = await storage.verifyLicense();
      res.json(verification);
    } catch (err) {
      console.error("Lisans doğrulama hatası:", err);
      res.status(500).json({ error: "Lisans doğrulanamadi" });
    }
  });

  // Create/activate license
  app.post("/api/license", async (req, res) => {
    try {
      const { licenseKey, agencyName, agencyEmail, agencyPhone, planType, expiryDate } = req.body;
      
      if (!licenseKey || !agencyName) {
        return res.status(400).json({ error: "Lisans anahtarı ve acenta adi zorunludur" });
      }

      // Define plan limits based on plan type
      const planLimits: Record<string, { maxActivities: number; maxReservationsPerMonth: number; maxUsers: number; planName: string }> = {
        trial: { maxActivities: 5, maxReservationsPerMonth: 50, maxUsers: 1, planName: "Deneme" },
        başıc: { maxActivities: 10, maxReservationsPerMonth: 200, maxUsers: 2, planName: "Temel" },
        professional: { maxActivities: 25, maxReservationsPerMonth: 500, maxUsers: 5, planName: "Profesyonel" },
        enterprise: { maxActivities: 999, maxReservationsPerMonth: 9999, maxUsers: 99, planName: "Kurumsal" }
      };

      const plan = planLimits[planType || 'trial'] || planLimits.trial;
      
      const newLicense = await storage.createLicense({
        licenseKey,
        agencyName,
        agencyEmail: agencyEmail || null,
        agencyPhone: agencyPhone || null,
        planType: planType || 'trial',
        planName: plan.planName,
        maxActivities: plan.maxActivities,
        maxReservationsPerMonth: plan.maxReservationsPerMonth,
        maxUsers: plan.maxUsers,
        features: JSON.stringify([]),
        startDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: true
      });

      res.status(201).json(newLicense);
    } catch (err) {
      console.error("Lisans oluşturma hatası:", err);
      res.status(400).json({ error: "Lisans oluşturulamadi" });
    }
  });

  // Update license
  app.patch("/api/license/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { agencyName, agencyEmail, agencyPhone, planType, expiryDate, isActive } = req.body;
      
      const updateData: Record<string, unknown> = {};
      if (agencyName !== undefined) updateData.agencyName = agencyName;
      if (agencyEmail !== undefined) updateData.agencyEmail = agencyEmail;
      if (agencyPhone !== undefined) updateData.agencyPhone = agencyPhone;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // If plan type changes, update limits too
      if (planType !== undefined) {
        const planLimits: Record<string, { maxActivities: number; maxReservationsPerMonth: number; maxUsers: number; planName: string }> = {
          trial: { maxActivities: 5, maxReservationsPerMonth: 50, maxUsers: 1, planName: "Deneme" },
          başıc: { maxActivities: 10, maxReservationsPerMonth: 200, maxUsers: 2, planName: "Temel" },
          professional: { maxActivities: 25, maxReservationsPerMonth: 500, maxUsers: 5, planName: "Profesyonel" },
          enterprise: { maxActivities: 999, maxReservationsPerMonth: 9999, maxUsers: 99, planName: "Kurumsal" }
        };
        const plan = planLimits[planType] || planLimits.trial;
        updateData.planType = planType;
        updateData.planName = plan.planName;
        updateData.maxActivities = plan.maxActivities;
        updateData.maxReservationsPerMonth = plan.maxReservationsPerMonth;
        updateData.maxUsers = plan.maxUsers;
      }
      
      if (expiryDate !== undefined) {
        updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
      }
      
      const updated = await storage.updateLicense(id, updateData);
      res.json(updated);
    } catch (err) {
      console.error("Lisans güncelleme hatası:", err);
      res.status(400).json({ error: "Lisans güncellenemedi" });
    }
  });

  // Renew license (extend expiry date)
  app.post("/api/license/:id/renew", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { months = 1 } = req.body;
      
      const currentLicense = await storage.getLicense();
      if (!currentLicense || currentLicense.id !== id) {
        return res.status(404).json({ error: "Lisans bulunamadı" });
      }
      
      // Calculate new expiry date
      const currentExpiry = currentLicense.expiryDate ? new Date(currentLicense.expiryDate) : new Date();
      const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + months);
      
      const updated = await storage.updateLicense(id, { 
        expiryDate: newExpiry,
        isActive: true 
      });
      
      res.json({ 
        license: updated, 
        message: `Lisansiniz ${months} ay uzatildi. Yeni bitiş tarihi: ${newExpiry.toLocaleDateString('tr-TR')}` 
      });
    } catch (err) {
      console.error("Lisans yenileme hatası:", err);
      res.status(400).json({ error: "Lisans yenilenemedi" });
    }
  });

  // Get license usage statistics
  app.get("/api/license/usage", async (req, res) => {
    try {
      const usage = await storage.getLicenseUsage();
      const currentLicense = await storage.getLicense();
      
      res.json({
        usage,
        limits: currentLicense ? {
          maxActivities: currentLicense.maxActivities,
          maxReservationsPerMonth: currentLicense.maxReservationsPerMonth
        } : null
      });
    } catch (err) {
      console.error("Kullanim bilgisi alınamadı:", err);
      res.status(500).json({ error: "Kullanim bilgisi alınamadı" });
    }
  });

  // Activate license with license key
  app.post("/api/license/activate", async (req, res) => {
    try {
      const { licenseKey, agencyName } = req.body;
      
      if (!licenseKey || !agencyName) {
        return res.status(400).json({ error: "Lisans anahtarı ve acenta adi zorunludur" });
      }

      // Parse license key to determine plan type
      // Format: PLAN-XXXX-XXXX-XXXX (e.g., PRO-1234-5678-9012)
      const keyPrefix = licenseKey.split('-')[0]?.toUpperCase();
      let planType = 'trial';
      
      if (keyPrefix === 'ENT' || keyPrefix === 'ENTERPRISE') {
        planType = 'enterprise';
      } else if (keyPrefix === 'PRO' || keyPrefix === 'PROFESSIONAL') {
        planType = 'professional';
      } else if (keyPrefix === 'BAS' || keyPrefix === 'BASIC') {
        planType = 'başıc';
      } else if (keyPrefix === 'TRI' || keyPrefix === 'TRIAL') {
        planType = 'trial';
      }

      // Define plan limits based on plan type
      const planLimits: Record<string, { maxActivities: number; maxReservationsPerMonth: number; maxUsers: number; planName: string; expiryMonths: number }> = {
        trial: { maxActivities: 5, maxReservationsPerMonth: 50, maxUsers: 1, planName: "Deneme", expiryMonths: 0.5 },
        başıc: { maxActivities: 10, maxReservationsPerMonth: 200, maxUsers: 2, planName: "Temel", expiryMonths: 12 },
        professional: { maxActivities: 25, maxReservationsPerMonth: 500, maxUsers: 5, planName: "Profesyonel", expiryMonths: 12 },
        enterprise: { maxActivities: 999, maxReservationsPerMonth: 9999, maxUsers: 99, planName: "Kurumsal", expiryMonths: 0 }
      };

      const plan = planLimits[planType];
      
      // Calculate expiry date
      let expiryDate: Date | null = null;
      if (plan.expiryMonths > 0) {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + plan.expiryMonths);
      }

      const newLicense = await storage.createLicense({
        licenseKey,
        agencyName,
        agencyEmail: null,
        agencyPhone: null,
        planType,
        planName: plan.planName,
        maxActivities: plan.maxActivities,
        maxReservationsPerMonth: plan.maxReservationsPerMonth,
        maxUsers: plan.maxUsers,
        features: JSON.stringify([]),
        startDate: new Date(),
        expiryDate,
        isActive: true
      });

      res.status(201).json({ 
        license: newLicense, 
        message: `Lisans basariyla aktive edildi. Plan: ${plan.planName}` 
      });
    } catch (err) {
      console.error("Lisans aktivasyon hatası:", err);
      res.status(400).json({ error: "Lisans aktive edilemedi" });
    }
  });

  // Delete/deactivate license
  app.delete("/api/license", async (req, res) => {
    try {
      const currentLicense = await storage.getLicense();
      if (!currentLicense) {
        return res.status(404).json({ error: "Kaldırilacak lisans bulunamadı" });
      }
      
      await storage.deleteLicense(currentLicense.id);
      res.json({ success: true, message: "Lisans kaldırıldı" });
    } catch (err) {
      console.error("Lisans kaldırma hatası:", err);
      res.status(500).json({ error: "Lisans kaldırilamadi" });
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

      res.json({
        activitiesUsed,
        maxActivities: currentPlan?.maxActivities || 5,
        reservationsThisMonth,
        maxReservationsPerMonth: currentPlan?.maxReservationsPerMonth || 100,
        usersCount: tenantUsers,
        maxUsers: currentPlan?.maxUsers || 1,
        daysRemaining,
        planName: currentPlan?.name || "Deneme",
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
      const { name, slug, contactEmail, contactPhone, address, logoUrl, primaryColor, accentColor, timezone, language, adminUsername, adminEmail, adminPassword, adminName, licenseDuration } = req.body;
      
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
        isActive: true,
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

      await storage.setSetting('bot_rules', tenantBotRules, tenant.id);
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
      const tenant = await storage.updateTenant(Number(req.params.id), req.body);
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

  // === SUPER ADMIN - LICENSE/AGENCY MANAGEMENT ===
  
  app.get("/api/licenses", async (req, res) => {
    try {
      const licenses = await storage.getLicenses();
      res.json(licenses);
    } catch (err) {
      console.error("Lisans listesi hatası:", err);
      res.status(500).json({ error: "Lisanslar alınamadı" });
    }
  });

  app.patch("/api/licenses/:id", async (req, res) => {
    try {
      const license = await storage.updateLicense(Number(req.params.id), req.body);
      res.json(license);
    } catch (err) {
      console.error("Lisans güncelleme hatası:", err);
      res.status(500).json({ error: "Lisans güncellenemedi" });
    }
  });

  app.post("/api/licenses/:id/suspend", async (req, res) => {
    try {
      const license = await storage.suspendLicense(Number(req.params.id));
      res.json(license);
    } catch (err) {
      console.error("Lisans askiya alma hatası:", err);
      res.status(500).json({ error: "Lisans askiya alınamadı" });
    }
  });

  app.post("/api/licenses/:id/activate", async (req, res) => {
    try {
      const license = await storage.activateLicense(Number(req.params.id));
      res.json(license);
    } catch (err) {
      console.error("Lisans aktiflesirme hatası:", err);
      res.status(500).json({ error: "Lisans aktiflesirilemedi" });
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
        'app_users', 'roles', 'permissions', 'role_permissions', 'user_roles'
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
        'app_users', 'roles', 'permissions', 'role_permissions', 'user_roles'
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

  // === BULK OPERATIONS ===
  
  app.post("/api/bulk/plan-change", async (req, res) => {
    try {
      const { licenseIds, newPlanId } = req.body;
      const results = await storage.bulkChangePlan(licenseIds, newPlanId);
      res.json(results);
    } catch (err) {
      console.error("Toplu plan degisikligi hatası:", err);
      res.status(500).json({ error: "Plan degisikligi yapılamadı" });
    }
  });

  app.post("/api/bulk/extend-license", async (req, res) => {
    try {
      const { licenseIds, days } = req.body;
      const results = await storage.bulkExtendLicense(licenseIds, days);
      res.json(results);
    } catch (err) {
      console.error("Toplu lisans uzatma hatası:", err);
      res.status(500).json({ error: "Lisans uzatma yapılamadı" });
    }
  });

  // === AGENCY DETAILS (For Super Admin) ===
  
  app.get("/api/agency-details/:licenseId", async (req, res) => {
    try {
      const details = await storage.getAgencyDetails(Number(req.params.licenseId));
      res.json(details);
    } catch (err) {
      console.error("Ajans detayi hatası:", err);
      res.status(500).json({ error: "Ajans detayları alınamadı" });
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
      const { licenseId, periodStart, periodEnd } = req.body;
      const invoice = await storage.generateInvoice(licenseId, periodStart, periodEnd);
      res.json(invoice);
    } catch (err) {
      console.error("Fatura oluşturma hatası:", err);
      res.status(500).json({ error: "Fatura oluşturulamadi" });
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
      res.json(tenantUsers);
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
      if (!tenantId) {
        return res.status(401).json({ error: "Giriş yapmaniz gerekiyor" });
      }

      const id = Number(req.params.id);
      
      // SECURITY: Verify the user being deleted belongs to the current tenant
      const existingUser = await storage.getAppUser(id);
      if (!existingUser || existingUser.tenantId !== tenantId) {
        return res.status(403).json({ error: "Bu kullanıcıyi silme yetkiniz yok" });
      }

      await storage.deleteAppUser(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Tenant kullanıcı silme hatası:", err);
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

  return httpServer;
}

// Seed function
async function seedDatabase() {
  // Seed default subscription plans and features
  await storage.seedDefaultSubscriptionPlans();
  await storage.seedDefaultPlanFeatures();
  
  // Initialize default roles and permissions for user management
  await storage.initializeDefaultPermissions();
  
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
