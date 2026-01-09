import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// === MULTI-TENANT SUPPORT ===

// Tenants (Her acenta/sirket icin ayri veri alani)
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Acenta/sirket adi
  slug: text("slug").notNull().unique(), // URL-friendly unique identifier
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  // Marka ayarlari (tenant bazinda)
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("262 83% 58%"), // HSL format
  accentColor: text("accent_color").default("142 76% 36%"), // HSL format
  // WhatsApp ayarlari tenant_integrations tablosunda tutulur
  // Diger ayarlar
  timezone: text("timezone").default("Europe/Istanbul"),
  language: text("language").default("tr"),
  planCode: text("plan_code").default("trial"), // Hangi abonelik planı: trial, basic, professional, enterprise
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === TABLE DEFINITIONS ===

export const activities = pgTable("activities", {
  tenantId: integer("tenant_id").references(() => tenants.id),
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAliases: text("name_aliases").default("[]"), // JSON array of alternative names (multilingual: ["paragliding fethiye", "Fethiye yamaç paraşütü"])
  description: text("description"),
  price: integer("price").notNull(), // In TL
  priceUsd: integer("price_usd").default(0), // In USD cents
  durationMinutes: integer("duration_minutes").notNull().default(60),
  dailyFrequency: integer("daily_frequency").default(1), // 1, 3, or 5 times per day
  defaultTimes: text("default_times").default("[]"), // JSON array of time strings like ["09:00", "14:00"]
  defaultCapacity: integer("default_capacity").default(10), // Default available slots per time slot
  color: text("color").default("blue"), // Calendar color: blue, purple, green, orange, pink, cyan, red, yellow
  confirmationMessage: text("confirmation_message").default("Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Teşekkür ederiz."),
  reservationLink: text("reservation_link"), // External reservation page URL (Turkish)
  reservationLinkEn: text("reservation_link_en"), // External reservation page URL (English)
  agencyPhone: text("agency_phone"),
  adminPhone: text("admin_phone"),
  sendNotificationToAgency: boolean("send_notification_to_agency").default(true),
  sendNotificationToAdmin: boolean("send_notification_to_admin").default(true),
  notificationMessageTemplate: text("notification_message_template").default("Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kisiSayisi}"),
  active: boolean("active").default(true),
  // Transfer ve Ekstralar
  hasFreeHotelTransfer: boolean("has_free_hotel_transfer").default(false),
  transferZones: text("transfer_zones").default("[]"), // JSON array of zone names ["Ölüdeniz", "Fethiye Merkez", "Hisarönü"]
  extras: text("extras").default("[]"), // JSON array of {name, priceTl, priceUsd, description}
  // Sık Sorulan Sorular
  faq: text("faq").default("[]"), // JSON array of {question, answer}
  // Partner Paylaşımı
  sharedWithPartners: boolean("shared_with_partners").default(false), // Bu aktivite partner acentalarla paylaşılsın mı?
});

export const capacity = pgTable("capacity", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  totalSlots: integer("total_slots").notNull(),
  bookedSlots: integer("booked_slots").default(0),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  activityId: integer("activity_id").references(() => activities.id),
  packageTourId: integer("package_tour_id"), // Paket tur rezervasyonu ise (null değilse bu bir paket tur ana kaydı)
  parentReservationId: integer("parent_reservation_id"), // Paket tur alt rezervasyonu ise ana rezervasyon ID'si
  agencyId: integer("agency_id"), // Hangi acentadan geldi (opsiyonel)
  orderNumber: text("order_number"), // Sipariş numarası (WooCommerce'den gelir veya manuel girilir, paket turlarda ortak)
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  quantity: integer("quantity").notNull(),
  priceTl: integer("price_tl").default(0), // Price in TL
  priceUsd: integer("price_usd").default(0), // Price in USD
  currency: text("currency").default("TRY"), // TRY or USD
  status: text("status").default("pending"), // pending, confirmed, cancelled
  source: text("source").default("whatsapp"), // whatsapp, web (woocommerce), manual
  externalId: text("external_id"), // WooCommerce Order ID
  orderSubtotal: integer("order_subtotal").default(0), // WooCommerce subtotal
  orderTotal: integer("order_total").default(0), // WooCommerce total
  orderTax: integer("order_tax").default(0), // WooCommerce tax amount
  settlementId: integer("settlement_id"), // Hangi hesaplaşmaya dahil edildi
  trackingToken: text("tracking_token"), // Müşteri takip linki için benzersiz token
  trackingTokenExpiresAt: timestamp("tracking_token_expires_at"), // Token geçerlilik süresi (aktivite tarihi + 1 gün)
  hotelName: text("hotel_name"), // WooCommerce'den gelen otel ismi
  hasTransfer: boolean("has_transfer").default(false), // Otel transferi istendi mi
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, partial, paid - Odeme durumu
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  phone: text("phone").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant, system
  requiresHumanIntervention: boolean("requires_human_intervention").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const supportRequests = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  phone: text("phone").notNull(),
  description: text("description"), // Kullanıcının girdiği sorun açıklaması
  status: text("status").default("open"), // open, resolved
  reservationId: integer("reservation_id").references(() => reservations.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Sistem logları - hata ayıklama için
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  level: text("level").notNull(), // error, warn, info
  source: text("source").notNull(), // whatsapp, ai, webhook, system
  message: text("message").notNull(),
  details: text("details"), // JSON detayları (stack trace, request body vb)
  phone: text("phone"), // İlgili telefon numarası (varsa)
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform-wide hata izleme - Super Admin için
export const errorEvents = pgTable("error_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // null = platform-wide error
  severity: text("severity").notNull(), // critical, error, warning
  category: text("category").notNull(), // api, validation, ai_bot, system, auth, database
  source: text("source").notNull(), // Hangi modül/endpoint
  message: text("message").notNull(),
  suggestion: text("suggestion"), // Önerilen çözüm
  requestPath: text("request_path"), // API endpoint path
  requestMethod: text("request_method"), // GET, POST, etc.
  statusCode: integer("status_code"), // HTTP status code
  userId: integer("user_id"), // Kullanıcı ID (appUsers tablosuna referans)
  userEmail: text("user_email"), // Maskelenmiş e-posta
  tenantName: text("tenant_name"), // Acenta adı (kolay erişim için)
  metadata: text("metadata"), // JSON - ek detaylar (stack trace vb.)
  occurredAt: timestamp("occurred_at").defaultNow(),
  status: text("status").default("open"), // open, acknowledged, resolved
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"), // Çözen admin kullanıcı adı
  resolutionNotes: text("resolution_notes"),
});

// Destek taleplerine eklenmiş loglar
export const supportRequestLogs = pgTable("support_request_logs", {
  id: serial("id").primaryKey(),
  supportRequestId: integer("support_request_id").references(() => supportRequests.id).notNull(),
  logId: integer("log_id").references(() => systemLogs.id),
  messageSnapshot: text("message_snapshot"), // Mesaj geçmişi snapshot'ı
  createdAt: timestamp("created_at").defaultNow(),
});

// Müşteri Talepleri (Takip sayfasından gelen talepler)
export const customerRequests = pgTable("customer_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  reservationId: integer("reservation_id").references(() => reservations.id).notNull(),
  requestType: text("request_type").notNull(), // time_change, cancellation, other
  requestDetails: text("request_details"), // Talep detayları
  preferredTime: text("preferred_time"), // Saat değişikliği için tercih edilen saat
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  status: text("status").default("pending"), // pending, approved, rejected
  adminNotes: text("admin_notes"), // Admin notları
  emailSent: boolean("email_sent").default(false), // E-posta gönderildi mi
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  key: text("key").notNull(),
  value: text("value"),
});

export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  phone: text("phone").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === FINANCE TABLES ===

// Tedarikçiler (Suppliers) - Aktivite sağlayıcı firmalar (örn: UP Firma, Dalış Şirketi)
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  contactInfo: text("contact_info"),
  defaultPayoutPerGuest: integer("default_payout_per_guest").default(0), // Kişi başı ödeme (TL)
  notes: text("notes"),
  active: boolean("active").default(true),
  // Partner Acenta bağlantısı (opsiyonel - tedarikçi Smartur kullanıcısı ise)
  partnerTenantId: integer("partner_tenant_id").references(() => tenants.id), // Bağlı partner acenta
  partnershipId: integer("partnership_id"), // Hangi partner ilişkisi üzerinden bağlandı
  isSmartUser: boolean("is_smart_user").default(false), // Smartur kullanıcısı mı?
  createdAt: timestamp("created_at").defaultNow(),
});

// Aktivite bazlı acenta ödeme koşulları
export const agencyActivityTerms = pgTable("agency_activity_terms", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  payoutPerGuest: integer("payout_per_guest").default(0), // Kişi başı ödeme (TL)
  effectiveMonth: text("effective_month"), // YYYY-MM formatında, null ise her zaman geçerli
});

// Aktivite maliyetleri (aylık)
export const activityCosts = pgTable("activity_costs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  month: text("month").notNull(), // YYYY-MM
  fixedCost: integer("fixed_cost").default(0), // Sabit maliyet (TL)
  variableCostPerGuest: integer("variable_cost_per_guest").default(0), // Kişi başı değişken maliyet
  notes: text("notes"),
});

// Hesaplaşma dönemleri
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  periodStart: text("period_start").notNull(), // YYYY-MM-DD
  periodEnd: text("period_end").notNull(), // YYYY-MM-DD
  status: text("status").default("draft"), // draft, approved, paid
  totalGuests: integer("total_guests").default(0),
  grossSalesTl: integer("gross_sales_tl").default(0),
  grossSalesUsd: integer("gross_sales_usd").default(0),
  totalCostTl: integer("total_cost_tl").default(0),
  payoutTl: integer("payout_tl").default(0), // Acentaya ödenecek
  payoutUsd: integer("payout_usd").default(0),
  extrasTl: integer("extras_tl").default(0), // Ekstra tutar (manuel eklenen)
  vatRatePct: integer("vat_rate_pct").default(20), // KDV oranı
  vatAmountTl: integer("vat_amount_tl").default(0),
  profitTl: integer("profit_tl").default(0), // Kar = Gelir - Maliyet - Acenta ödemesi - Ekstra
  paidAmountTl: integer("paid_amount_tl").default(0), // Ödenen miktar
  remainingTl: integer("remaining_tl").default(0), // Kalan borç
  createdAt: timestamp("created_at").defaultNow(),
});

// Hesaplaşma detayları (rezervasyon bazlı)
export const settlementEntries = pgTable("settlement_entries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  settlementId: integer("settlement_id").references(() => settlements.id).notNull(),
  reservationId: integer("reservation_id").references(() => reservations.id),
  activityId: integer("activity_id").references(() => activities.id),
  guestCount: integer("guest_count").default(0),
  revenueTl: integer("revenue_tl").default(0),
  costTl: integer("cost_tl").default(0),
  payoutTl: integer("payout_tl").default(0),
});

// Ödemeler
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  settlementId: integer("settlement_id").references(() => settlements.id),
  amountTl: integer("amount_tl").notNull(),
  method: text("method"), // cash, bank, etc.
  reference: text("reference"),
  notes: text("notes"),
  paidAt: timestamp("paid_at").defaultNow(),
});

// Acenta Ödemeleri (Manuel Kayıtlar)
export const agencyPayouts = pgTable("agency_payouts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  periodStart: text("period_start").notNull(), // YYYY-MM-DD
  periodEnd: text("period_end").notNull(), // YYYY-MM-DD
  description: text("description"), // Açıklama
  guestCount: integer("guest_count").default(0), // Müşteri sayısı
  baseAmountTl: integer("base_amount_tl").default(0), // KDV hariç tutar
  vatRatePct: integer("vat_rate_pct").default(20), // KDV oranı (%)
  vatAmountTl: integer("vat_amount_tl").default(0), // KDV tutarı
  totalAmountTl: integer("total_amount_tl").default(0), // Toplam tutar (KDV dahil)
  method: text("method"), // cash, bank, card, etc.
  reference: text("reference"), // Dekont/referans no
  notes: text("notes"),
  status: text("status").default("paid"), // paid, pending
  createdAt: timestamp("created_at").defaultNow(),
});

// Tedarikçi Gönderimleri (Günlük aktivite gönderimi takibi)
export const supplierDispatches = pgTable("supplier_dispatches", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id),
  dispatchDate: text("dispatch_date").notNull(), // YYYY-MM-DD
  dispatchTime: text("dispatch_time"), // HH:mm
  customerName: text("customer_name"), // Müşteri adı soyadı
  guestCount: integer("guest_count").default(0).notNull(),
  unitPayoutTl: integer("unit_payout_tl").default(0), // Kişi başı ödeme
  totalPayoutTl: integer("total_payout_tl").default(0), // Toplam = guestCount * unitPayoutTl
  currency: text("currency").default("TRY").notNull(), // TRY veya USD
  rateId: integer("rate_id"), // Hangi tarife kullanıldı
  payoutId: integer("payout_id").references(() => agencyPayouts.id), // Hangi ödemeye bağlı (null = ödenmemiş)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gönderim Kalemleri (Dispatch alt satırları - dalış yapan, gözlemci, ekstralar vb.)
export const supplierDispatchItems = pgTable("supplier_dispatch_items", {
  id: serial("id").primaryKey(),
  dispatchId: integer("dispatch_id").references(() => supplierDispatches.id).notNull(),
  itemType: text("item_type").default("base").notNull(), // base (ana aktivite), observer (gözlemci), extra (ekstra satış)
  label: text("label").notNull(), // Kalem açıklaması (örn: "Dalış", "Gözlemci", "Fotoğraf Paketi")
  quantity: integer("quantity").default(1).notNull(), // Adet
  unitAmount: integer("unit_amount").default(0).notNull(), // Birim fiyat
  totalAmount: integer("total_amount").default(0).notNull(), // Toplam = quantity * unitAmount
  currency: text("currency").default("TRY").notNull(), // TRY veya USD
  notes: text("notes"),
});

// Tedarikçi Ödeme Tarifeleri (Dönemsel ücretler)
export const agencyActivityRates = pgTable("agency_activity_rates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id),
  validFrom: text("valid_from").notNull(), // YYYY-MM-DD başlangıç tarihi
  validTo: text("valid_to"), // YYYY-MM-DD bitiş tarihi (null = süresiz)
  unitPayoutTl: integer("unit_payout_tl").notNull(), // Kişi başı ödeme tutarı
  unitPayoutUsd: integer("unit_payout_usd"), // USD kişi başı ödeme (opsiyonel)
  currency: text("currency").default("TRY").notNull(), // TRY veya USD
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === HOLIDAYS ===

// Resmi Tatiller ve Bayramlar
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  name: text("name").notNull(), // Tatil adı (örn: "Ramazan Bayramı", "29 Ekim Cumhuriyet Bayramı")
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD (tek günlük tatil için aynı tarih)
  type: text("type").default("official"), // official (resmi), religious (dini), special (özel)
  keywords: text("keywords").default("[]"), // JSON array of keywords for bot matching ["bayram", "tatil", "kurban"]
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
});

// === PACKAGE TOURS ===

// Paket Turlar
export const packageTours = pgTable("package_tours", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  nameAliases: text("name_aliases").default("[]"), // JSON array of alternative names (multilingual)
  description: text("description"),
  price: integer("price").default(0), // In TL
  priceUsd: integer("price_usd").default(0), // In USD
  confirmationMessage: text("confirmation_message").default("Sayın {isim}, paket tur rezervasyonunuz onaylanmıştır. Tarih: {tarih}. Teşekkür ederiz."),
  reservationLink: text("reservation_link"), // External reservation page URL (Turkish)
  reservationLinkEn: text("reservation_link_en"), // External reservation page URL (English)
  active: boolean("active").default(true),
  // Sık Sorulan Sorular
  faq: text("faq").default("[]"), // JSON array of {question, answer}
  createdAt: timestamp("created_at").defaultNow(),
});

// Paket Tur Aktiviteleri (Hangi aktiviteler dahil, varsayılan saat/offset)
export const packageTourActivities = pgTable("package_tour_activities", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  packageTourId: integer("package_tour_id").references(() => packageTours.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  dayOffset: integer("day_offset").default(0), // Paket başlangıcından kaç gün sonra (0=aynı gün, 1=ertesi gün)
  defaultTime: text("default_time").default("09:00"), // HH:mm - bu aktivitenin varsayılan saati
  sortOrder: integer("sort_order").default(0), // Sıralama
});

// === RELATIONS ===
export const capacityRelations = relations(capacity, ({ one }) => ({
  activity: one(activities, {
    fields: [capacity.activityId],
    references: [activities.id],
  }),
}));

export const reservationRelations = relations(reservations, ({ one }) => ({
  activity: one(activities, {
    fields: [reservations.activityId],
    references: [activities.id],
  }),
}));

// === TENANT SCHEMAS & TYPES ===
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

// === BASE SCHEMAS ===
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertCapacitySchema = createInsertSchema(capacity).omit({ id: true, bookedSlots: true });
export const insertReservationSchema = createInsertSchema(reservations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({ id: true, createdAt: true, resolvedAt: true });
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });
export const insertErrorEventSchema = createInsertSchema(errorEvents).omit({ id: true, occurredAt: true, resolvedAt: true });
export const insertSupportRequestLogSchema = createInsertSchema(supportRequestLogs).omit({ id: true, createdAt: true });
export const insertCustomerRequestSchema = createInsertSchema(customerRequests).omit({ id: true, createdAt: true, processedAt: true });

// === TYPES ===
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Capacity = typeof capacity.$inferSelect;
export type InsertCapacity = z.infer<typeof insertCapacitySchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type SupportRequest = typeof supportRequests.$inferSelect;
export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

export type ErrorEvent = typeof errorEvents.$inferSelect;
export type InsertErrorEvent = z.infer<typeof insertErrorEventSchema>;

export type SupportRequestLog = typeof supportRequestLogs.$inferSelect;
export type InsertSupportRequestLog = z.infer<typeof insertSupportRequestLogSchema>;

export type CustomerRequest = typeof customerRequests.$inferSelect;
export type InsertCustomerRequest = z.infer<typeof insertCustomerRequestSchema>;

export type Settings = typeof settings.$inferSelect;
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type Blacklist = typeof blacklist.$inferSelect;
export const insertBlacklistSchema = createInsertSchema(blacklist).omit({ id: true, createdAt: true });
export type InsertBlacklist = z.infer<typeof insertBlacklistSchema>;

// === FINANCE SCHEMAS & TYPES ===
export const insertAgencySchema = createInsertSchema(agencies).omit({ id: true, createdAt: true });
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = z.infer<typeof insertAgencySchema>;

export const insertAgencyActivityTermsSchema = createInsertSchema(agencyActivityTerms).omit({ id: true });
export type AgencyActivityTerms = typeof agencyActivityTerms.$inferSelect;
export type InsertAgencyActivityTerms = z.infer<typeof insertAgencyActivityTermsSchema>;

export const insertActivityCostSchema = createInsertSchema(activityCosts).omit({ id: true });
export type ActivityCost = typeof activityCosts.$inferSelect;
export type InsertActivityCost = z.infer<typeof insertActivityCostSchema>;

export const insertSettlementSchema = createInsertSchema(settlements).omit({ id: true, createdAt: true });
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;

export const insertSettlementEntrySchema = createInsertSchema(settlementEntries).omit({ id: true });
export type SettlementEntry = typeof settlementEntries.$inferSelect;
export type InsertSettlementEntry = z.infer<typeof insertSettlementEntrySchema>;

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, paidAt: true });
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export const insertAgencyPayoutSchema = createInsertSchema(agencyPayouts).omit({ id: true, createdAt: true });
export type AgencyPayout = typeof agencyPayouts.$inferSelect;
export type InsertAgencyPayout = z.infer<typeof insertAgencyPayoutSchema>;

export const insertSupplierDispatchSchema = createInsertSchema(supplierDispatches).omit({ id: true, createdAt: true });
export type SupplierDispatch = typeof supplierDispatches.$inferSelect;
export type InsertSupplierDispatch = z.infer<typeof insertSupplierDispatchSchema>;

export const insertSupplierDispatchItemSchema = createInsertSchema(supplierDispatchItems).omit({ id: true });
export type SupplierDispatchItem = typeof supplierDispatchItems.$inferSelect;
export type InsertSupplierDispatchItem = z.infer<typeof insertSupplierDispatchItemSchema>;

export const insertAgencyActivityRateSchema = createInsertSchema(agencyActivityRates).omit({ id: true, createdAt: true });
export type AgencyActivityRate = typeof agencyActivityRates.$inferSelect;
export type InsertAgencyActivityRate = z.infer<typeof insertAgencyActivityRateSchema>;

// === PACKAGE TOUR SCHEMAS & TYPES ===
export const insertPackageTourSchema = createInsertSchema(packageTours).omit({ id: true, createdAt: true });
export type PackageTour = typeof packageTours.$inferSelect;
export type InsertPackageTour = z.infer<typeof insertPackageTourSchema>;

export const insertPackageTourActivitySchema = createInsertSchema(packageTourActivities).omit({ id: true });
export type PackageTourActivity = typeof packageTourActivities.$inferSelect;
export type InsertPackageTourActivity = z.infer<typeof insertPackageTourActivitySchema>;

// === HOLIDAY SCHEMAS & TYPES ===
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

// === SUBSCRIPTION PLANS (Super Admin Managed) ===

// Abonelik Planları (Süper admin tarafından yönetilir)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // trial, basic, professional, enterprise
  name: text("name").notNull(), // Plan görüntüleme adı
  description: text("description"),
  priceTl: integer("price_tl").default(0), // Aylık fiyat TL
  priceUsd: integer("price_usd").default(0), // Aylık fiyat USD
  yearlyPriceTl: integer("yearly_price_tl").default(0), // Yıllık fiyat TL
  yearlyPriceUsd: integer("yearly_price_usd").default(0), // Yıllık fiyat USD
  yearlyDiscountPct: integer("yearly_discount_pct").default(20), // Yıllık indirim oranı
  trialDays: integer("trial_days").default(14), // Deneme süresi (gün)
  maxActivities: integer("max_activities").default(5),
  maxReservationsPerMonth: integer("max_reservations_per_month").default(100), // Aylık rezervasyon limiti (geriye uyumluluk)
  maxDailyReservations: integer("max_daily_reservations").default(10), // Günlük rezervasyon limiti
  maxUsers: integer("max_users").default(1),
  maxWhatsappNumbers: integer("max_whatsapp_numbers").default(1), // Sabit 1 olarak kullanılacak
  maxDailyMessages: integer("max_daily_messages").default(50), // Günlük maksimum WhatsApp mesaj sayısı
  features: text("features").default("[]"), // JSON array: ["ai_bot", "reports", "api_access", "multi_user"]
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  isPopular: boolean("is_popular").default(false), // "En Popüler" etiketi
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plan Özellikleri (Super Admin tarafından yönetilir)
export const planFeatures = pgTable("plan_features", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Unique identifier: basic_calendar, ai_bot, etc.
  label: text("label").notNull(), // Display name: "Temel Takvim", "AI Bot"
  description: text("description"), // Optional description
  icon: text("icon").default("Star"), // Lucide icon name
  category: text("category").default("general"), // Feature category for grouping
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Abonelikler (Acentaların aktif abonelikleri)
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // Tenant bağlantısı
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").default("trial"), // trial, active, past_due, cancelled, expired
  billingCycle: text("billing_cycle").default("monthly"), // monthly, yearly
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEnd: timestamp("trial_end"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  paymentProvider: text("payment_provider").default("paytr"), // paytr, stripe, manual
  providerCustomerId: text("provider_customer_id"), // PayTR müşteri ID
  providerSubscriptionId: text("provider_subscription_id"), // PayTR abonelik ID
  lastPaymentAt: timestamp("last_payment_at"),
  nextPaymentAt: timestamp("next_payment_at"),
  failedPaymentCount: integer("failed_payment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Abonelik Ödeme Geçmişi
export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id).notNull(),
  amountTl: integer("amount_tl").default(0),
  amountUsd: integer("amount_usd").default(0),
  currency: text("currency").default("TRY"),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  paymentMethod: text("payment_method"), // credit_card, bank_transfer, manual
  providerPaymentId: text("provider_payment_id"), // PayTR ödeme ID
  providerResponse: text("provider_response"), // JSON yanıt
  invoiceNumber: text("invoice_number"),
  invoiceUrl: text("invoice_url"),
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === AUTO RESPONSES ===

// Otomatik Yanıtlar (AI çağrısı yapmadan anahtar kelime eşleştirme ile yanıt)
export const autoResponses = pgTable("auto_responses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  name: text("name").notNull(), // Kural adı (örn: "Fiyat Sorgusu")
  keywords: text("keywords").notNull(), // JSON array of Turkish keywords ["fiyat", "ücret", "ne kadar"]
  keywordsEn: text("keywords_en").default("[]"), // JSON array of English keywords ["price", "cost", "how much"]
  response: text("response").notNull(), // Türkçe yanıt
  responseEn: text("response_en").default(""), // İngilizce yanıt
  priority: integer("priority").default(0), // Öncelik (yüksek = önce kontrol edilir)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === AUTO RESPONSE SCHEMAS & TYPES ===
export const insertAutoResponseSchema = createInsertSchema(autoResponses).omit({ id: true, createdAt: true });
export type AutoResponse = typeof autoResponses.$inferSelect;
export type InsertAutoResponse = z.infer<typeof insertAutoResponseSchema>;

// === REQUEST MESSAGE TEMPLATES ===

// Müşteri Talepleri için hazır mesaj şablonları
export const requestMessageTemplates = pgTable("request_message_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  name: text("name").notNull(), // Şablon adı (örn: "Onaylandı", "Değerlendiriliyor", "İptal Edildi")
  templateType: text("template_type").notNull(), // approved, pending, rejected
  messageContent: text("message_content").notNull(), // Dinamik mesaj içeriği
  isDefault: boolean("is_default").default(false), // Varsayılan şablon mu
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === REQUEST MESSAGE TEMPLATE SCHEMAS & TYPES ===
export const insertRequestMessageTemplateSchema = createInsertSchema(requestMessageTemplates).omit({ id: true, createdAt: true });
export type RequestMessageTemplate = typeof requestMessageTemplates.$inferSelect;
export type InsertRequestMessageTemplate = z.infer<typeof insertRequestMessageTemplateSchema>;

// === SUBSCRIPTION PLAN SCHEMAS & TYPES ===
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).omit({ id: true, createdAt: true });
export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;

// === PLAN FEATURES SCHEMAS & TYPES ===
export const insertPlanFeatureSchema = createInsertSchema(planFeatures).omit({ id: true, createdAt: true });
export type PlanFeature = typeof planFeatures.$inferSelect;
export type InsertPlanFeature = z.infer<typeof insertPlanFeatureSchema>;

// === SUPER ADMIN - PLATFORM MANAGEMENT ===

// Platform Duyuruları
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").default("info"), // info, warning, maintenance, update
  targetAudience: text("target_audience").default("all"), // all, agencies, admins
  priority: integer("priority").default(0), // Yüksek = önemli
  isActive: boolean("is_active").default(true),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform Faturaları
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  agencyName: text("agency_name").notNull(),
  agencyEmail: text("agency_email"),
  periodStart: text("period_start").notNull(), // YYYY-MM-DD
  periodEnd: text("period_end").notNull(), // YYYY-MM-DD
  subtotalTl: integer("subtotal_tl").default(0),
  vatRatePct: integer("vat_rate_pct").default(20),
  vatAmountTl: integer("vat_amount_tl").default(0),
  totalTl: integer("total_tl").default(0),
  subtotalUsd: integer("subtotal_usd").default(0),
  totalUsd: integer("total_usd").default(0),
  currency: text("currency").default("TRY"),
  status: text("status").default("pending"), // pending, paid, overdue, cancelled
  dueDate: text("due_date"), // YYYY-MM-DD
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Durum Logları (Sistem İzleme)
export const apiStatusLogs = pgTable("api_status_logs", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // twilio, woocommerce, gemini, paytr
  status: text("status").notNull(), // up, down, degraded
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
  errorCount: integer("error_count").default(0),
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  checkedAt: timestamp("checked_at").defaultNow(),
});

// Bot Kalite Skorları
export const botQualityScores = pgTable("bot_quality_scores", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  messageId: integer("message_id").references(() => messages.id),
  phone: text("phone"),
  question: text("question"),
  response: text("response"),
  responseTimeMs: integer("response_time_ms"),
  wasEscalated: boolean("was_escalated").default(false),
  wasHelpful: boolean("was_helpful"), // null = bilinmiyor
  feedbackScore: integer("feedback_score"), // 1-5 arası puan
  errorOccurred: boolean("error_occurred").default(false),
  usedFallback: boolean("used_fallback").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Günlük Mesaj Kullanımı Takibi
export const dailyMessageUsage = pgTable("daily_message_usage", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD formatında
  messageCount: integer("message_count").default(0), // O gün gönderilen mesaj sayısı
  lastMessageAt: timestamp("last_message_at"), // Son mesaj zamanı
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === DAILY MESSAGE USAGE SCHEMAS & TYPES ===
export const insertDailyMessageUsageSchema = createInsertSchema(dailyMessageUsage).omit({ id: true, createdAt: true, updatedAt: true });
export type DailyMessageUsage = typeof dailyMessageUsage.$inferSelect;
export type InsertDailyMessageUsage = z.infer<typeof insertDailyMessageUsageSchema>;

// === TENANT INTEGRATION SETTINGS ===
// Acenta bazli entegrasyon ayarlari (Twilio, WooCommerce, Gmail)
export const tenantIntegrations = pgTable("tenant_integrations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull().unique(),
  
  // Twilio / WhatsApp Settings
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthTokenEncrypted: text("twilio_auth_token_encrypted"), // Sifrelenmis
  twilioWhatsappNumber: text("twilio_whatsapp_number"), // +90... formatinda
  twilioWebhookUrl: text("twilio_webhook_url"), // Otomatik olusturulur
  twilioConfigured: boolean("twilio_configured").default(false),
  
  // WooCommerce Settings
  woocommerceStoreUrl: text("woocommerce_store_url"),
  woocommerceConsumerKey: text("woocommerce_consumer_key"),
  woocommerceConsumerSecretEncrypted: text("woocommerce_consumer_secret_encrypted"), // Sifrelenmis
  woocommerceWebhookSecret: text("woocommerce_webhook_secret"), // Webhook dogrulama
  woocommerceConfigured: boolean("woocommerce_configured").default(false),
  
  // Gmail / Email Settings
  gmailUser: text("gmail_user"), // Gmail adresi
  gmailAppPasswordEncrypted: text("gmail_app_password_encrypted"), // Sifrelenmis uygulama sifresi
  gmailFromName: text("gmail_from_name"), // Gonderici adi (örn: "Sky Fethiye Tur")
  gmailConfigured: boolean("gmail_configured").default(false),
  
  // Meta
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === TENANT INTEGRATION SCHEMAS & TYPES ===
export const insertTenantIntegrationSchema = createInsertSchema(tenantIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export type TenantIntegration = typeof tenantIntegrations.$inferSelect;
export type InsertTenantIntegration = z.infer<typeof insertTenantIntegrationSchema>;

// === SUPER ADMIN SCHEMAS & TYPES ===
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export const insertApiStatusLogSchema = createInsertSchema(apiStatusLogs).omit({ id: true, checkedAt: true });
export type ApiStatusLog = typeof apiStatusLogs.$inferSelect;
export type InsertApiStatusLog = z.infer<typeof insertApiStatusLogSchema>;

export const insertBotQualityScoreSchema = createInsertSchema(botQualityScores).omit({ id: true, createdAt: true });
export type BotQualityScore = typeof botQualityScores.$inferSelect;
export type InsertBotQualityScore = z.infer<typeof insertBotQualityScoreSchema>;

// === PLATFORM ADMIN MANAGEMENT ===

// Platform Yoneticileri
export const platformAdmins = pgTable("platform_admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").default("support"), // super_admin, finance, support
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Giris Loglari (Guvenlik)
export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => platformAdmins.id),
  email: text("email").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull(), // success, failed, blocked
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ajans Notlari
export const agencyNotes = pgTable("agency_notes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  adminId: integer("admin_id").references(() => platformAdmins.id),
  content: text("content").notNull(),
  noteType: text("note_type").default("general"), // general, billing, support, warning
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Destek Talepleri (Platform seviyesi - tum ajanslarin talepleri)
export const platformSupportTickets = pgTable("platform_support_tickets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  agencyName: text("agency_name"),
  agencyEmail: text("agency_email"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  status: text("status").default("open"), // open, in_progress, waiting, resolved, closed
  category: text("category").default("general"), // general, billing, technical, feature_request
  assignedTo: integer("assigned_to").references(() => platformAdmins.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Destek Talep Yanitlari
export const ticketResponses = pgTable("ticket_responses", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => platformSupportTickets.id).notNull(),
  responderId: integer("responder_id").references(() => platformAdmins.id),
  responderName: text("responder_name"),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false), // Dahili not mu (musteri gormez)
  createdAt: timestamp("created_at").defaultNow(),
});

// === PLATFORM ADMIN SCHEMAS & TYPES ===
export const insertPlatformAdminSchema = createInsertSchema(platformAdmins).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type InsertPlatformAdmin = z.infer<typeof insertPlatformAdminSchema>;

export const insertLoginLogSchema = createInsertSchema(loginLogs).omit({ id: true, createdAt: true });
export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;

export const insertAgencyNoteSchema = createInsertSchema(agencyNotes).omit({ id: true, createdAt: true });
export type AgencyNote = typeof agencyNotes.$inferSelect;
export type InsertAgencyNote = z.infer<typeof insertAgencyNoteSchema>;

export const insertPlatformSupportTicketSchema = createInsertSchema(platformSupportTickets).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
export type PlatformSupportTicket = typeof platformSupportTickets.$inferSelect;
export type InsertPlatformSupportTicket = z.infer<typeof insertPlatformSupportTicketSchema>;

export const insertTicketResponseSchema = createInsertSchema(ticketResponses).omit({ id: true, createdAt: true });
export type TicketResponse = typeof ticketResponses.$inferSelect;
export type InsertTicketResponse = z.infer<typeof insertTicketResponseSchema>;

// === APP USER MANAGEMENT (Login with Username/Password) ===

// Uygulama Kullanicilari (Lisans yerine kullanici adi/sifre ile giris)
export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // Hangi tenant'a ait
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  companyName: text("company_name"), // Acenta/sirket adi
  membershipType: text("membership_type").default("trial"), // trial, monthly, yearly
  membershipStartDate: timestamp("membership_start_date"),
  membershipEndDate: timestamp("membership_end_date"),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  isActive: boolean("is_active").default(true),
  isSuspended: boolean("is_suspended").default(false),
  suspendReason: text("suspend_reason"),
  isSystemProtected: boolean("is_system_protected").default(false), // Sistem kullanicisi - silinemez
  maxActivities: integer("max_activities").default(5),
  maxReservationsPerMonth: integer("max_reservations_per_month").default(100),
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0),
  createdBy: integer("created_by").references(() => platformAdmins.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roller (Super Admin tarafindan tanimlanan roller)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // admin, operator, viewer, etc.
  displayName: text("display_name").notNull(), // "Yonetici", "Operator", "Izleyici"
  description: text("description"),
  color: text("color").default("blue"), // Badge rengi
  isSystem: boolean("is_system").default(false), // Sistem rolu mu (silinemez)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Izinler (Sistemde tanimli izinler)
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // reservations.view, reservations.create, activities.manage, etc.
  name: text("name").notNull(), // "Rezervasyonlari Goruntule"
  description: text("description"),
  category: text("category").default("general"), // reservations, activities, reports, settings, finance
  sortOrder: integer("sort_order").default(0),
});

// Rol-Izin Iliskisi (Hangi rol hangi izinlere sahip)
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
});

// Kullanici-Rol Iliskisi (Kullaniciya atanan roller)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => appUsers.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  assignedBy: integer("assigned_by").references(() => platformAdmins.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Kullanici Giris Loglari
export const userLoginLogs = pgTable("user_login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => appUsers.id),
  username: text("username").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull(), // success, failed, blocked
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Partner Acenta Rezervasyon Talepleri (Viewer rolundeki kullanicilardan gelen talepler)
export const reservationRequests = pgTable("reservation_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  guests: integer("guests").default(1),
  notes: text("notes"),
  status: text("status").default("pending"), // pending, approved, rejected, converted
  requestedBy: integer("requested_by").references(() => appUsers.id),
  processedBy: integer("processed_by").references(() => appUsers.id),
  processedAt: timestamp("processed_at"),
  processNotes: text("process_notes"),
  reservationId: integer("reservation_id").references(() => reservations.id),
  createdAt: timestamp("created_at").defaultNow(),
  // Payment allocation fields
  paymentCollectionType: text("payment_collection_type").default("receiver_full"), // sender_full, sender_partial, receiver_full
  amountCollectedBySender: integer("amount_collected_by_sender").default(0), // Amount collected by sending agency
  paymentCurrency: text("payment_currency").default("TRY"), // Currency for payment
  paymentNotes: text("payment_notes"), // Notes about payment arrangement
});

// === APP USER SCHEMAS & TYPES ===
export const insertAppUserSchema = createInsertSchema(appUsers).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true, loginCount: true });
export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true, updatedAt: true });
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, assignedAt: true });
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export const insertUserLoginLogSchema = createInsertSchema(userLoginLogs).omit({ id: true, createdAt: true });
export type UserLoginLog = typeof userLoginLogs.$inferSelect;
export type InsertUserLoginLog = z.infer<typeof insertUserLoginLogSchema>;

export const insertReservationRequestSchema = createInsertSchema(reservationRequests).omit({ id: true, createdAt: true, processedAt: true });
export type ReservationRequest = typeof reservationRequests.$inferSelect;
export type InsertReservationRequest = z.infer<typeof insertReservationRequestSchema>;

// === APPLICATION VERSION MANAGEMENT ===

// Uygulama Surumleri - Guncelleme ve Geri Alma Takibi
export const appVersions = pgTable("app_versions", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(), // Surum numarasi (örn: "1.0.0")
  fileName: text("file_name").notNull(), // Yuklenen dosya adi
  fileSize: integer("file_size").default(0), // Dosya boyutu (bytes)
  checksum: text("checksum"), // SHA256 hash
  status: text("status").default("pending"), // pending, active, inactive, failed
  notes: text("notes"), // Surum notlari
  uploadedBy: text("uploaded_by").default("super_admin"),
  backupFileName: text("backup_file_name"), // Onceki surumun yedegi
  isRollbackTarget: boolean("is_rollback_target").default(false), // Geri alinabilir mi
  activatedAt: timestamp("activated_at"), // Aktif edilme zamani
  createdAt: timestamp("created_at").defaultNow(),
});

// === APP VERSION SCHEMAS & TYPES ===
export const insertAppVersionSchema = createInsertSchema(appVersions).omit({ id: true, createdAt: true, activatedAt: true });
export type AppVersion = typeof appVersions.$inferSelect;
export type InsertAppVersion = z.infer<typeof insertAppVersionSchema>;

// === DATABASE BACKUP MANAGEMENT ===

// Veritabani Yedekleme Kayitlari
export const databaseBackups = pgTable("database_backups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").default(0),
  tableCount: integer("table_count").default(0),
  rowCount: integer("row_count").default(0),
  status: text("status").default("completed"), // in_progress, completed, failed, restored
  backupType: text("backup_type").default("manual"), // manual, scheduled, auto
  createdBy: text("created_by").default("super_admin"),
  restoredAt: timestamp("restored_at"),
  restoredBy: text("restored_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === DATABASE BACKUP SCHEMAS & TYPES ===
export const insertDatabaseBackupSchema = createInsertSchema(databaseBackups).omit({ id: true, createdAt: true, restoredAt: true });
export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = z.infer<typeof insertDatabaseBackupSchema>;

// === PARTNER ACENTA (Cross-Tenant Sharing) ===

// Tenant Partnerships - Acentalar arası bağlantılar
export const tenantPartnerships = pgTable("tenant_partnerships", {
  id: serial("id").primaryKey(),
  requesterTenantId: integer("requester_tenant_id").references(() => tenants.id).notNull(), // Bağlantı isteği gönderen
  partnerTenantId: integer("partner_tenant_id").references(() => tenants.id).notNull(), // Bağlantı isteği alan
  inviteCode: text("invite_code").notNull(), // Bağlantı için kullanılan davet kodu
  status: text("status").default("pending").notNull(), // pending, active, rejected, cancelled
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  notes: text("notes"), // İlişki hakkında notlar
});

// Partner Agency Invite Codes - Davet kodları
export const partnerInviteCodes = pgTable("partner_invite_codes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  code: text("code").notNull().unique(), // Benzersiz davet kodu (örn: ABC123)
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0), // Kaç kez kullanıldı
  maxUsage: integer("max_usage"), // Maksimum kullanım limiti (null = sınırsız)
  expiresAt: timestamp("expires_at"), // Geçerlilik süresi (null = süresiz)
  createdAt: timestamp("created_at").defaultNow(),
});

// Dispatch Shares - Gönderim paylaşımları
export const dispatchShares = pgTable("dispatch_shares", {
  id: serial("id").primaryKey(),
  dispatchId: integer("dispatch_id").references(() => supplierDispatches.id).notNull(), // Paylaşılan gönderim
  partnershipId: integer("partnership_id").references(() => tenantPartnerships.id).notNull(), // Hangi partner ilişkisi
  senderTenantId: integer("sender_tenant_id").references(() => tenants.id).notNull(), // Gönderen acenta
  receiverTenantId: integer("receiver_tenant_id").references(() => tenants.id).notNull(), // Alan acenta
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  sharedAt: timestamp("shared_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by").references(() => appUsers.id), // Onaylayan/reddeden kullanıcı
  processNotes: text("process_notes"), // İşlem notları
  linkedReservationId: integer("linked_reservation_id").references(() => reservations.id), // Onaylandığında oluşturulan rezervasyon
});

// === PARTNER ACENTA SCHEMAS & TYPES ===
export const insertTenantPartnershipSchema = createInsertSchema(tenantPartnerships).omit({ id: true, requestedAt: true, respondedAt: true });
export type TenantPartnership = typeof tenantPartnerships.$inferSelect;
export type InsertTenantPartnership = z.infer<typeof insertTenantPartnershipSchema>;

export const insertPartnerInviteCodeSchema = createInsertSchema(partnerInviteCodes).omit({ id: true, createdAt: true, usageCount: true });
export type PartnerInviteCode = typeof partnerInviteCodes.$inferSelect;
export type InsertPartnerInviteCode = z.infer<typeof insertPartnerInviteCodeSchema>;

export const insertDispatchShareSchema = createInsertSchema(dispatchShares).omit({ id: true, sharedAt: true, processedAt: true });
export type DispatchShare = typeof dispatchShares.$inferSelect;
export type InsertDispatchShare = z.infer<typeof insertDispatchShareSchema>;

// Activity Partner Shares - Aktivite bazlı partner paylaşımları
export const activityPartnerShares = pgTable("activity_partner_shares", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  partnershipId: integer("partnership_id").references(() => tenantPartnerships.id).notNull(),
  partnerUnitPrice: integer("partner_unit_price"), // Partner için belirlenen birim fiyat
  partnerCurrency: text("partner_currency").default("TRY"), // Para birimi (TRY, USD, EUR)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityPartnerShareSchema = createInsertSchema(activityPartnerShares).omit({ id: true, createdAt: true });
export type ActivityPartnerShare = typeof activityPartnerShares.$inferSelect;
export type InsertActivityPartnerShare = z.infer<typeof insertActivityPartnerShareSchema>;

// Partner Transactions - Partner müşteri finansal işlemleri
export const partnerTransactions = pgTable("partner_transactions", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").references(() => reservations.id).notNull(),
  senderTenantId: integer("sender_tenant_id").references(() => tenants.id).notNull(), // Müşteri gönderen acenta
  receiverTenantId: integer("receiver_tenant_id").references(() => tenants.id).notNull(), // Müşteri alan acenta
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  guestCount: integer("guest_count").notNull(),
  unitPrice: integer("unit_price").notNull(), // Birim fiyat
  totalPrice: integer("total_price").notNull(), // Toplam fiyat
  currency: text("currency").default("TRY").notNull(), // Para birimi
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  reservationDate: text("reservation_date").notNull(),
  reservationTime: text("reservation_time"),
  status: text("status").default("pending").notNull(), // pending, paid, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  // Payment allocation fields
  paymentCollectionType: text("payment_collection_type").default("receiver_full"), // sender_full, sender_partial, receiver_full
  amountCollectedBySender: integer("amount_collected_by_sender").default(0), // Gönderen acenta tarafından tahsil edilen
  amountDueToReceiver: integer("amount_due_to_receiver").default(0), // Alıcı acenta tarafından tahsil edilecek
  balanceOwed: integer("balance_owed").default(0), // Pozitif: Alıcı gönderene borçlu, Negatif: Gönderen alıcıya borçlu
});

export const insertPartnerTransactionSchema = createInsertSchema(partnerTransactions).omit({ id: true, createdAt: true, paidAt: true });
export type PartnerTransaction = typeof partnerTransactions.$inferSelect;
export type InsertPartnerTransaction = z.infer<typeof insertPartnerTransactionSchema>;

// === BILDIRIM TERCIHLERI (Notification Preferences) ===

// Notification Types - Bildirim türleri
export const NOTIFICATION_TYPES = {
  RESERVATION_NEW: 'reservation_new',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  CUSTOMER_REQUEST: 'customer_request',
  PARTNER_REQUEST: 'partner_request',
  PARTNER_REQUEST_APPROVED: 'partner_request_approved',
  PARTNER_REQUEST_REJECTED: 'partner_request_rejected',
  CAPACITY_WARNING: 'capacity_warning',
  WOOCOMMERCE_ORDER: 'woocommerce_order',
} as const;

// Notification Channels - Bildirim kanalları
export const NOTIFICATION_CHANNELS = {
  APP: 'app',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const;

// User Notification Preferences - Kullanici bildirim tercihleri (her kullanici kendi icin ayarlar)
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => appUsers.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  notificationType: text("notification_type").notNull(),
  channels: text("channels").array().default(sql`ARRAY['app']::text[]`),
  enabled: boolean("enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant Notification Settings - Acenta bildirim ayarlari (musteriye giden bildirimler)
export const tenantNotificationSettings = pgTable("tenant_notification_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  notificationType: text("notification_type").notNull(),
  channels: text("channels").array().default(sql`ARRAY['whatsapp']::text[]`),
  enabled: boolean("enabled").default(true),
  templateWhatsapp: text("template_whatsapp"),
  templateEmail: text("template_email"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// In-App Notifications - Uygulama ici bildirimler
export const inAppNotifications = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => appUsers.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  notificationType: text("notification_type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === NOTIFICATION SCHEMAS & TYPES ===
export const insertUserNotificationPreferenceSchema = createInsertSchema(userNotificationPreferences).omit({ id: true, updatedAt: true });
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = z.infer<typeof insertUserNotificationPreferenceSchema>;

export const insertTenantNotificationSettingSchema = createInsertSchema(tenantNotificationSettings).omit({ id: true, updatedAt: true });
export type TenantNotificationSetting = typeof tenantNotificationSettings.$inferSelect;
export type InsertTenantNotificationSetting = z.infer<typeof insertTenantNotificationSettingSchema>;

export const insertInAppNotificationSchema = createInsertSchema(inAppNotifications).omit({ id: true, createdAt: true });
export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type InsertInAppNotification = z.infer<typeof insertInAppNotificationSchema>;

// === İZLEYİCİ AKTİVİTE ERİŞİMİ VE FİYATLANDIRMA ===

// Viewer Activity Shares - İzleyici bazlı aktivite paylaşımları ve fiyatlandırma
export const viewerActivityShares = pgTable("viewer_activity_shares", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  viewerUserId: integer("viewer_user_id").references(() => appUsers.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  viewerUnitPriceTry: integer("viewer_unit_price_try"), // İzleyici için TRY fiyatı
  viewerUnitPriceUsd: integer("viewer_unit_price_usd"), // İzleyici için USD fiyatı
  viewerUnitPriceEur: integer("viewer_unit_price_eur"), // İzleyici için EUR fiyatı
  isShared: boolean("is_shared").default(true).notNull(), // Bu aktivite izleyici ile paylaşılıyor mu
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertViewerActivityShareSchema = createInsertSchema(viewerActivityShares).omit({ id: true, createdAt: true, updatedAt: true });
export type ViewerActivityShare = typeof viewerActivityShares.$inferSelect;
export type InsertViewerActivityShare = z.infer<typeof insertViewerActivityShareSchema>;

// === REZERVASYON DEĞİŞİKLİK TALEPLERİ ===

// Reservation Change Requests - Partner/İzleyici/Müşteri değişiklik talepleri
export const reservationChangeRequests = pgTable("reservation_change_requests", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").references(() => reservations.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  initiatedByType: text("initiated_by_type").notNull(), // customer, viewer, partner
  initiatedById: integer("initiated_by_id"), // appUsers.id veya null (müşteri için)
  initiatedByPhone: text("initiated_by_phone"), // Müşteri telefonu
  requestType: text("request_type").notNull(), // time_change, date_change, cancellation, other
  originalDate: text("original_date"), // Mevcut tarih
  originalTime: text("original_time"), // Mevcut saat
  requestedDate: text("requested_date"), // İstenen yeni tarih
  requestedTime: text("requested_time"), // İstenen yeni saat
  requestDetails: text("request_details"), // Detaylı açıklama
  status: text("status").default("pending").notNull(), // pending, approved, rejected, applied
  processedBy: integer("processed_by").references(() => appUsers.id),
  processedAt: timestamp("processed_at"),
  processNotes: text("process_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReservationChangeRequestSchema = createInsertSchema(reservationChangeRequests).omit({ id: true, createdAt: true, updatedAt: true, processedAt: true });
export type ReservationChangeRequest = typeof reservationChangeRequests.$inferSelect;
export type InsertReservationChangeRequest = z.infer<typeof insertReservationChangeRequestSchema>;
