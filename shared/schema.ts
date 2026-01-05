import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const activities = pgTable("activities", {
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
});

export const capacity = pgTable("capacity", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  totalSlots: integer("total_slots").notNull(),
  bookedSlots: integer("booked_slots").default(0),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant, system
  requiresHumanIntervention: boolean("requires_human_intervention").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const supportRequests = pgTable("support_requests", {
  id: serial("id").primaryKey(),
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
  level: text("level").notNull(), // error, warn, info
  source: text("source").notNull(), // whatsapp, ai, webhook, system
  message: text("message").notNull(),
  details: text("details"), // JSON detayları (stack trace, request body vb)
  phone: text("phone"), // İlgili telefon numarası (varsa)
  createdAt: timestamp("created_at").defaultNow(),
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
  key: text("key").notNull().unique(),
  value: text("value"),
});

export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === FINANCE TABLES ===

// Tedarikçiler (Suppliers) - Aktivite sağlayıcı firmalar (örn: UP Firma, Dalış Şirketi)
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactInfo: text("contact_info"),
  defaultPayoutPerGuest: integer("default_payout_per_guest").default(0), // Kişi başı ödeme (TL)
  notes: text("notes"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Aktivite bazlı acenta ödeme koşulları
export const agencyActivityTerms = pgTable("agency_activity_terms", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  payoutPerGuest: integer("payout_per_guest").default(0), // Kişi başı ödeme (TL)
  effectiveMonth: text("effective_month"), // YYYY-MM formatında, null ise her zaman geçerli
});

// Aktivite maliyetleri (aylık)
export const activityCosts = pgTable("activity_costs", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id).notNull(),
  month: text("month").notNull(), // YYYY-MM
  fixedCost: integer("fixed_cost").default(0), // Sabit maliyet (TL)
  variableCostPerGuest: integer("variable_cost_per_guest").default(0), // Kişi başı değişken maliyet
  notes: text("notes"),
});

// Hesaplaşma dönemleri
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
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
  agencyId: integer("agency_id").references(() => agencies.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id),
  dispatchDate: text("dispatch_date").notNull(), // YYYY-MM-DD
  dispatchTime: text("dispatch_time"), // HH:mm
  guestCount: integer("guest_count").default(0).notNull(),
  unitPayoutTl: integer("unit_payout_tl").default(0), // Kişi başı ödeme
  totalPayoutTl: integer("total_payout_tl").default(0), // Toplam = guestCount * unitPayoutTl
  rateId: integer("rate_id"), // Hangi tarife kullanıldı
  payoutId: integer("payout_id").references(() => agencyPayouts.id), // Hangi ödemeye bağlı (null = ödenmemiş)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tedarikçi Ödeme Tarifeleri (Dönemsel ücretler)
export const agencyActivityRates = pgTable("agency_activity_rates", {
  id: serial("id").primaryKey(),
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

// === BASE SCHEMAS ===
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertCapacitySchema = createInsertSchema(capacity).omit({ id: true, bookedSlots: true });
export const insertReservationSchema = createInsertSchema(reservations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({ id: true, createdAt: true, resolvedAt: true });
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });
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
  maxReservationsPerMonth: integer("max_reservations_per_month").default(100),
  maxUsers: integer("max_users").default(1),
  maxWhatsappNumbers: integer("max_whatsapp_numbers").default(1),
  features: text("features").default("[]"), // JSON array: ["ai_bot", "reports", "api_access", "multi_user"]
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  isPopular: boolean("is_popular").default(false), // "En Popüler" etiketi
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Abonelikler (Acentaların aktif abonelikleri)
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  licenseId: integer("license_id").references(() => license.id), // İlişkili lisans
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

// === LICENSE/SUBSCRIPTION ===

// Lisans ve Üyelik Bilgileri
export const license = pgTable("license", {
  id: serial("id").primaryKey(),
  licenseKey: text("license_key").notNull(), // Benzersiz lisans anahtarı
  agencyName: text("agency_name").notNull(), // Acenta adı
  agencyEmail: text("agency_email"), // Acenta e-postası
  agencyPhone: text("agency_phone"), // Acenta telefonu
  planType: text("plan_type").default("trial"), // trial, basic, professional, enterprise
  planName: text("plan_name").default("Deneme"), // Plan görüntüleme adı
  maxActivities: integer("max_activities").default(5), // Maksimum aktivite sayısı
  maxReservationsPerMonth: integer("max_reservations_per_month").default(100), // Aylık maksimum rezervasyon
  maxUsers: integer("max_users").default(1), // Maksimum kullanıcı sayısı
  features: text("features").default("[]"), // JSON array of enabled features
  startDate: timestamp("start_date").defaultNow(), // Lisans başlangıç tarihi
  expiryDate: timestamp("expiry_date"), // Lisans bitiş tarihi (null = sınırsız)
  isActive: boolean("is_active").default(true),
  lastVerifiedAt: timestamp("last_verified_at"), // Son doğrulama zamanı
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === AUTO RESPONSES ===

// Otomatik Yanıtlar (AI çağrısı yapmadan anahtar kelime eşleştirme ile yanıt)
export const autoResponses = pgTable("auto_responses", {
  id: serial("id").primaryKey(),
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

// === LICENSE SCHEMAS & TYPES ===
export const insertLicenseSchema = createInsertSchema(license).omit({ id: true, createdAt: true, updatedAt: true, lastVerifiedAt: true });
export type License = typeof license.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

// === REQUEST MESSAGE TEMPLATES ===

// Müşteri Talepleri için hazır mesaj şablonları
export const requestMessageTemplates = pgTable("request_message_templates", {
  id: serial("id").primaryKey(),
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
