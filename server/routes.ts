import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertActivitySchema, insertCapacitySchema, insertReservationSchema } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { encrypt, decrypt } from "./encryption";
import { logError, logWarn, logInfo, attachLogsToSupportRequest, getSupportRequestLogs, getRecentLogs } from "./logger";

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

5.3 DEĞİŞİKLİK TALEPLERİ: Saat/tarih değişikliği isteyenlere, rezervasyon sonrası info@skyfethiye.com adresine sipariş numarasıyla mail atmaları gerektiğini söyle.

=== 6. SORUN ÇÖZME VE ESKALASYON ===

6.1 ESKALASYON GEREKTİREN DURUMLAR:
- Sorun 2 mesaj içinde çözülemiyorsa
- Müşteri memnuniyetsiz veya agresifse
- "Destek talebi", "Operatör", "Beni arayın" gibi ifadeler kullanılırsa
- Fiyat indirimi, grup indirimi gibi özel talepler gelirse

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
const TURKISH_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

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
    'mayis': 4, 'mayıs': 4, 'haziran': 5, 'temmuz': 6, 'agustos': 7, 'ağustos': 7,
    'eylul': 8, 'eylül': 8, 'ekim': 9, 'kasim': 10, 'kasım': 10, 'aralik': 11, 'aralık': 11
  };
  
  // Helper to format date as YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  // Relative date keywords
  if (msgLower.includes('bugün') || msgLower.includes('bugun')) {
    dates.add(formatDate(today));
  }
  if (msgLower.includes('yarın') || msgLower.includes('yarin')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    dates.add(formatDate(tomorrow));
  }
  if (msgLower.includes('öbür gün') || msgLower.includes('obur gun') || msgLower.includes('ertesi gün')) {
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    dates.add(formatDate(dayAfter));
  }
  if (msgLower.includes('hafta sonu') || msgLower.includes('haftasonu')) {
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
async function getCapacityWithVirtualSlots(dates: string[]): Promise<Array<{
  activityId: number;
  date: string;
  time: string;
  totalSlots: number;
  bookedSlots: number;
  isVirtual: boolean;
}>> {
  const allCapacity = await storage.getCapacity();
  const allReservations = await storage.getReservations();
  const allActivities = await storage.getActivities();
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
    
    // Add DB capacity
    for (const cap of dbCapacity) {
      result.push({
        activityId: cap.activityId,
        date: cap.date,
        time: cap.time,
        totalSlots: cap.totalSlots,
        bookedSlots: cap.bookedSlots || 0,
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
    await logError('ai', 'AI yanit olusturulamadi - tum denemeler basarisiz', { error: lastError instanceof Error ? lastError.message : String(lastError) });
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
    return `Merhaba! Rezervasyon değişikliği veya iptal talepleriniz için lütfen sipariş numaranızı paylaşır mısınız? Size en kısa sürede yardımcı olacağız.`;
  }
  
  // Default fallback with activity list
  return `Merhaba! Size yardımcı olmak için buradayım. Sistemimiz şu an biraz meşgul olduğu için kısa süre içinde size detaylı bilgi vereceğiz.\n\nAktivitelerimiz:\n${activityDescriptions}\n\nBunlardan hangisi hakkında bilgi almak istersiniz?`;
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

  // === Package Tours ===
  app.get("/api/package-tours", async (req, res) => {
    try {
      const tours = await storage.getPackageTours();
      res.json(tours);
    } catch (err) {
      res.status(500).json({ error: "Paket turlar alinamadi" });
    }
  });

  app.get("/api/package-tours/:id", async (req, res) => {
    try {
      const tour = await storage.getPackageTour(Number(req.params.id));
      if (!tour) {
        return res.status(404).json({ error: "Paket tur bulunamadi" });
      }
      res.json(tour);
    } catch (err) {
      res.status(500).json({ error: "Paket tur alinamadi" });
    }
  });

  app.post("/api/package-tours", async (req, res) => {
    try {
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
      res.status(400).json({ error: "Paket tur olusturulamadi" });
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
      res.status(400).json({ error: "Paket tur guncellenemedi" });
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
      const tourActivities = await storage.getPackageTourActivities(Number(req.params.id));
      const allActivities = await storage.getActivities();
      
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
      res.status(500).json({ error: "Paket tur aktiviteleri alinamadi" });
    }
  });

  // === Holidays ===
  app.get("/api/holidays", async (req, res) => {
    try {
      const holidayList = await storage.getHolidays();
      res.json(holidayList);
    } catch (err) {
      res.status(500).json({ error: "Tatiller alinamadi" });
    }
  });

  app.get("/api/holidays/:id", async (req, res) => {
    try {
      const holiday = await storage.getHoliday(Number(req.params.id));
      if (!holiday) {
        return res.status(404).json({ error: "Tatil bulunamadi" });
      }
      res.json(holiday);
    } catch (err) {
      res.status(500).json({ error: "Tatil alinamadi" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const { name, startDate, endDate, type, keywords, notes, isActive } = req.body;
      
      if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: "Tatil adi, baslangic ve bitis tarihi zorunlu" });
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
          return res.status(400).json({ error: "Gecersiz JSON formati" });
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
      res.status(400).json({ error: "Tatil olusturulamadi" });
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
          return res.status(400).json({ error: "Gecersiz JSON formati" });
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
      res.status(400).json({ error: "Tatil guncellenemedi" });
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
    const allReservations = await storage.getReservations();
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
    const allActivities = await storage.getActivities();
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

  // Update reservation status
  app.patch("/api/reservations/:id/status", async (req, res) => {
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

  // === Customer Tracking ===
  
  // Get reservation by tracking token (public endpoint for customers)
  app.get("/api/track/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token || token.length < 10) {
        return res.status(400).json({ error: "Gecersiz takip kodu" });
      }
      
      const reservation = await storage.getReservationByTrackingToken(token);
      
      if (!reservation) {
        return res.status(404).json({ error: "Rezervasyon bulunamadi veya takip suresi dolmus" });
      }
      
      // Get activity details
      let activityName = "Bilinmeyen Aktivite";
      if (reservation.activityId) {
        const activity = await storage.getActivity(reservation.activityId);
        if (activity) {
          activityName = activity.name;
        }
      } else if (reservation.packageTourId) {
        const packageTour = await storage.getPackageTour(reservation.packageTourId);
        if (packageTour) {
          activityName = packageTour.name + " (Paket Tur)";
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
        orderNumber: reservation.orderNumber
      });
    } catch (error) {
      console.error("Track reservation error:", error);
      res.status(500).json({ error: "Rezervasyon bilgileri alinamadi" });
    }
  });

  // Generate tracking token for a reservation (admin only)
  app.post("/api/reservations/:id/generate-tracking", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Gecersiz rezervasyon ID" });
      }
      
      const token = await storage.generateTrackingToken(id);
      
      res.json({ 
        token,
        trackingUrl: `/takip/${token}`
      });
    } catch (error: any) {
      console.error("Generate tracking token error:", error);
      res.status(500).json({ error: error.message || "Token olusturulamadi" });
    }
  });

  // Cleanup expired tracking tokens (can be called by a cron job)
  app.post("/api/tracking/cleanup", async (req, res) => {
    try {
      const count = await storage.cleanupExpiredTrackingTokens();
      res.json({ 
        success: true, 
        message: `${count} suresi dolmus takip kodu temizlendi` 
      });
    } catch (error) {
      console.error("Cleanup tracking tokens error:", error);
      res.status(500).json({ error: "Temizleme basarisiz" });
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
        return res.status(404).json({ error: "Gecersiz veya suresi dolmus takip linki" });
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
                                  requestType === 'cancellation' ? 'Iptal Talebi' : 'Diger Talep';
          
          const emailBody = `
Yeni Musteri Talebi

Talep Tipi: ${requestTypeText}
Musteri: ${reservation.customerName}
Telefon: ${reservation.customerPhone}
E-posta: ${reservation.customerEmail || '-'}

Rezervasyon Bilgileri:
- Aktivite: ${activityName}
- Tarih: ${reservation.date}
- Saat: ${reservation.time}
- Kisi Sayisi: ${reservation.quantity}

${requestType === 'time_change' && preferredTime ? `Tercih Edilen Saat: ${preferredTime}` : ''}
${requestDetails ? `Ek Aciklama: ${requestDetails}` : ''}

---
Bu talep musteri takip sayfasindan gonderilmistir.
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
              subject: `[Musteri Talebi] ${requestTypeText} - ${reservation.customerName}`,
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
        message: "Talebiniz basariyla iletildi. En kisa surede size donecegiz.",
        requestId: customerRequest.id
      });
    } catch (error) {
      console.error("Create customer request error:", error);
      res.status(500).json({ error: "Talep olusturulamadi" });
    }
  });

  // Get all customer requests (admin)
  app.get("/api/customer-requests", async (req, res) => {
    try {
      const requests = await storage.getCustomerRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get customer requests error:", error);
      res.status(500).json({ error: "Talepler alinamadi" });
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
      res.status(500).json({ error: "Talep guncellenemedi" });
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
              customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'WooCommerce Musteri',
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
              orderTax: i === 0 ? itemTax : 0
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
              customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'WooCommerce Musteri',
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
              orderTax
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
      await logError('webhook', 'WooCommerce webhook hatasi', { error: error instanceof Error ? error.message : String(error) });
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

      // Get history
      const history = await storage.getMessages(From, 5);
      
      // Get context (activities, package tours, etc)
      const activities = await storage.getActivities();
      const packageTours = await storage.getPackageTours();
      
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
      
      const upcomingCapacity = await getCapacityWithVirtualSlots(Array.from(upcomingDates));
      
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
      
      // Generate AI response with reservation context, capacity data, package tours, and custom prompt
      const aiResponse = await generateAIResponse(history, { 
        activities: botAccess.activities ? activities : [], 
        packageTours: botAccess.packageTours ? packageTours : [],
        capacityData: botAccess.capacity ? upcomingCapacity : [],
        hasReservation: !!userReservation,
        reservation: userReservation,
        askForOrderNumber: !userReservation,
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
      const { phone, customerName, activityName, date, time } = req.body;
      
      if (!phone || !customerName || !activityName || !date) {
        return res.status(400).json({ error: "Eksik bilgi: telefon, isim, aktivite ve tarih gerekli" });
      }
      
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      
      if (!accountSid || !authToken || !twilioWhatsAppNumber) {
        await logError('whatsapp', 'Twilio yapilandirmasi eksik', { phone });
        return res.status(500).json({ error: "WhatsApp yapilandirmasi eksik" });
      }
      
      // Format phone number for WhatsApp (must start with country code)
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '90' + formattedPhone.substring(1); // Turkey country code
      }
      if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
        formattedPhone = '90' + formattedPhone;
      }
      
      const message = `Merhaba ${customerName},

Rezervasyonunuz olusturulmustur:
Aktivite: ${activityName}
Tarih: ${date}
${time ? `Saat: ${time}` : ''}

Sorulariniz icin bize bu numaradan yazabilirsiniz.

Sky Fethiye`;

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
        await logError('whatsapp', 'Twilio mesaj gonderme hatasi', { phone, error: errorText });
        return res.status(500).json({ error: "WhatsApp mesaji gonderilemedi" });
      }
      
      const result = await twilioResponse.json();
      await logInfo('whatsapp', `WhatsApp bildirimi gonderildi: ${customerName} - ${activityName}`);
      
      // Also save the message to conversation history
      await storage.addMessage({
        phone: `whatsapp:+${formattedPhone}`,
        content: message,
        role: "assistant"
      });
      
      res.json({ success: true, messageSid: result.sid });
    } catch (error) {
      await logError('whatsapp', 'WhatsApp bildirim hatasi', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "WhatsApp mesaji gonderilemedi" });
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
        await logError('whatsapp', 'Twilio yapilandirmasi eksik', { phone });
        return res.status(500).json({ error: "WhatsApp yapilandirmasi eksik" });
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
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        await logError('whatsapp', 'Twilio mesaj gonderme hatasi', { phone, error: errorText });
        return res.status(500).json({ error: "WhatsApp mesaji gonderilemedi" });
      }
      
      const result = await twilioResponse.json();
      await logInfo('whatsapp', `Ozel WhatsApp mesaji gonderildi: ${formattedPhone}`);
      
      // Also save the message to conversation history
      await storage.addMessage({
        phone: `whatsapp:+${formattedPhone}`,
        content: message,
        role: "assistant"
      });
      
      res.json({ success: true, messageSid: result.sid });
    } catch (error) {
      await logError('whatsapp', 'WhatsApp ozel mesaj hatasi', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "WhatsApp mesaji gonderilemedi" });
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
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ success: false, error: "Şifre gerekli" });
      }
      
      // Verify against hashed password
      if (verifyPassword(password, BOT_RULES_PASSWORD_HASH)) {
        // Generate a session token for bot rules
        const token = crypto.randomBytes(32).toString('hex');
        await storage.setSetting('botRulesSessionToken', token);
        return res.json({ success: true, token });
      }
      
      return res.status(401).json({ success: false, error: "Geçersiz şifre" });
    } catch (err) {
      res.status(500).json({ success: false, error: "Giriş yapılamadı" });
    }
  });

  // Verify bot rules token
  app.post("/api/bot-rules/verify", async (req, res) => {
    try {
      const { token } = req.body;
      const storedToken = await storage.getSetting('botRulesSessionToken');
      
      if (storedToken && storedToken === token) {
        return res.json({ valid: true });
      }
      
      return res.json({ valid: false });
    } catch (err) {
      res.status(500).json({ valid: false });
    }
  });

  // === Gmail Settings ===
  app.get("/api/gmail-settings", async (req, res) => {
    try {
      const gmailUser = await storage.getSetting('gmailUser');
      const gmailPasswordEncrypted = await storage.getSetting('gmailPasswordEncrypted');
      
      res.json({
        gmailUser: gmailUser || '',
        isConfigured: !!(gmailUser && gmailPasswordEncrypted),
      });
    } catch (err) {
      res.status(500).json({ error: "Gmail ayarları alınamadı" });
    }
  });

  app.post("/api/gmail-settings", async (req, res) => {
    try {
      const { gmailUser, gmailPassword } = req.body;
      
      if (!gmailUser || !gmailPassword) {
        return res.status(400).json({ error: "Gmail adresi ve uygulama şifresi gerekli" });
      }
      
      // Encrypt the password before storing
      const encryptedPassword = encrypt(gmailPassword);
      
      await storage.setSetting('gmailUser', gmailUser);
      await storage.setSetting('gmailPasswordEncrypted', encryptedPassword);
      
      res.json({ success: true, message: "Gmail ayarları kaydedildi" });
    } catch (err) {
      console.error("Gmail settings save error:", err);
      res.status(500).json({ error: "Gmail ayarları kaydedilemedi" });
    }
  });

  app.post("/api/gmail-settings/test", async (req, res) => {
    try {
      const gmailUser = await storage.getSetting('gmailUser');
      const gmailPasswordEncrypted = await storage.getSetting('gmailPasswordEncrypted');
      
      if (!gmailUser || !gmailPasswordEncrypted) {
        return res.status(400).json({ success: false, error: "Gmail ayarları yapılandırılmamış" });
      }
      
      let gmailPassword: string;
      try {
        gmailPassword = decrypt(gmailPasswordEncrypted);
      } catch (decryptErr) {
        return res.status(400).json({ success: false, error: "Şifre çözme hatası. Lütfen Gmail şifresini yeniden girin." });
      }
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });
      
      // Verify SMTP connection
      await transporter.verify();
      
      res.json({ success: true, message: "Gmail bağlantısı başarılı!" });
    } catch (err: any) {
      console.error("Gmail test error:", err);
      let errorMessage = "Gmail bağlantısı başarısız";
      if (err.code === 'EAUTH') {
        errorMessage = "Kimlik doğrulama hatası. Lütfen Gmail adresinizi ve uygulama şifrenizi kontrol edin.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      res.status(400).json({ success: false, error: errorMessage });
    }
  });

  app.delete("/api/gmail-settings", async (req, res) => {
    try {
      await storage.setSetting('gmailUser', '');
      await storage.setSetting('gmailPasswordEncrypted', '');
      
      res.json({ success: true, message: "Gmail bağlantısı kaldırıldı" });
    } catch (err) {
      res.status(500).json({ error: "Gmail ayarları silinemedi" });
    }
  });

  // Helper function to get Gmail credentials from DB or env vars
  async function getGmailCredentials(): Promise<{ user: string; password: string } | null> {
    // First check database settings
    const gmailUser = await storage.getSetting('gmailUser');
    const gmailPasswordEncrypted = await storage.getSetting('gmailPasswordEncrypted');
    
    if (gmailUser && gmailPasswordEncrypted) {
      try {
        const gmailPassword = decrypt(gmailPasswordEncrypted);
        return { user: gmailUser, password: gmailPassword };
      } catch {
        // Decryption failed, fall through to env vars
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

  // === Support Requests ===
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
      await logInfo('system', `Destek talebi olusturuldu: #${created.id}`, { phone, reservationId }, phone);
      
      res.json(created);
    } catch (err) {
      await logError('system', 'Destek talebi olusturma hatasi', err);
      res.status(400).json({ error: "Destek talebi oluşturulamadı" });
    }
  });

  app.get("/api/support-requests/:id/logs", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await getSupportRequestLogs(id);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Loglar alinamadi" });
    }
  });

  app.get("/api/system-logs", async (req, res) => {
    try {
      const phone = req.query.phone as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await getRecentLogs(phone, limit);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Sistem loglari alinamadi" });
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
        guncelleme: 'Güncelleme İsteği',
        oneri: 'Öneri',
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
                Yeni Destek Talebi - My Smartur
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
                Bu e-posta My Smartur destek sistemi tarafından otomatik olarak gönderilmiştir.
              </p>
            </div>
          `;

          await transporter.sendMail({
            from: `"My Smartur Destek" <${gmailCreds.user}>`,
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

  // === Finance - Agencies ===
  app.get("/api/finance/agencies", async (req, res) => {
    try {
      const agencies = await storage.getAgencies();
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
      
      res.json({ message: `${results.length} ay icin maliyet kaydedildi`, costs: results });
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
      
      let gitInfo = { commit: null, branch: null };
      try {
        const { execSync } = await import('child_process');
        gitInfo.commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 5000 }).trim();
        gitInfo.branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', timeout: 5000 }).trim();
      } catch {}
      
      // Veritabani verileri (hassas bilgiler maskelenmis)
      const activities = await storage.getActivities();
      const packageTours = await storage.getPackageTours();
      const recentReservations = await storage.getReservations();
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
          description: `Son 24 saatte ${aiErrors.length} AI hatasi. Gemini API limitine ulasilmis olabilir.`,
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
          description: `${webhookErrors.length} WooCommerce webhook hatasi tespit edildi.`,
          suggestion: 'WooCommerce baglanti ayarlarini kontrol edin.'
        });
      }
      
      // Acik destek talepleri
      const openSupport = supportRequests.filter(s => s.status === 'open');
      if (openSupport.length > 5) {
        healthChecks.push({
          id: 'pending_support',
          severity: 'info',
          title: 'Bekleyen Destek Talepleri',
          description: `${openSupport.length} acik destek talebi var.`,
          suggestion: 'Destek taleplerini inceleyin ve cozumleyin.'
        });
      }
      
      // Aktivite kontrolu
      if (activities.length === 0) {
        healthChecks.push({
          id: 'no_activities',
          severity: 'warning',
          title: 'Aktivite Tanimlanmamis',
          description: 'Sistemde hic aktivite tanimli degil.',
          suggestion: 'Aktiviteler sayfasindan aktivite ekleyin.'
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
            id: a.id, name: a.name, priceTl: a.priceTl, priceUsd: a.priceUsd, 
            defaultTimes: a.defaultTimes, defaultCapacity: a.defaultCapacity, active: a.active
          })),
          packageTours: packageTours.map(p => ({
            id: p.id, name: p.name, priceTl: p.priceTl, priceUsd: p.priceUsd, active: p.active
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
          botRulesConfigured: !!botRules?.value,
          botAccess: botAccess?.value ? JSON.parse(botAccess.value) : null,
        }
      };
      
      res.json(snapshot);
    } catch (err) {
      console.error('Debug snapshot hatasi:', err);
      await logError('system', 'Debug snapshot olusturulamadi', err);
      res.status(500).json({ error: "Debug snapshot olusturulamadi" });
    }
  });

  // Sistem Sagligi kontrolu (basit endpoint)
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
      res.status(500).json({ status: 'error', error: 'Sistem durumu alinamadi' });
    }
  });

  // Auto Responses CRUD
  app.get("/api/auto-responses", async (req, res) => {
    try {
      const autoResponses = await storage.getAutoResponses();
      res.json(autoResponses);
    } catch (err) {
      res.status(500).json({ error: "Otomatik yanitlar alinamadi" });
    }
  });

  app.get("/api/auto-responses/:id", async (req, res) => {
    try {
      const autoResponse = await storage.getAutoResponse(Number(req.params.id));
      if (!autoResponse) {
        return res.status(404).json({ error: "Otomatik yanit bulunamadi" });
      }
      res.json(autoResponse);
    } catch (err) {
      res.status(500).json({ error: "Otomatik yanit alinamadi" });
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
        return res.status(400).json({ error: "Anahtar kelimeler gecerli bir JSON dizisi olmali" });
      }
      
      // Validate English keywords JSON if provided
      if (keywordsEn) {
        try {
          const parsedKeywordsEn = JSON.parse(keywordsEn);
          if (!Array.isArray(parsedKeywordsEn)) {
            return res.status(400).json({ error: "Ingilizce anahtar kelimeler bir dizi olmali" });
          }
        } catch {
          return res.status(400).json({ error: "Ingilizce anahtar kelimeler gecerli bir JSON dizisi olmali" });
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
      console.error("Otomatik yanit olusturma hatasi:", err);
      res.status(400).json({ error: "Otomatik yanit olusturulamadi" });
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
          return res.status(400).json({ error: "Anahtar kelimeler gecerli bir JSON dizisi olmali" });
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
          return res.status(400).json({ error: "Ingilizce anahtar kelimeler gecerli bir JSON dizisi olmali" });
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
      console.error("Otomatik yanit guncelleme hatasi:", err);
      res.status(400).json({ error: "Otomatik yanit guncellenemedi" });
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
