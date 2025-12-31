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
  agencyId: integer("agency_id"), // Hangi acentadan geldi (opsiyonel)
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
  status: text("status").default("open"), // open, resolved
  reservationId: integer("reservation_id").references(() => reservations.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
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
