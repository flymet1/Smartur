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
  agencyPhone: text("agency_phone"),
  adminPhone: text("admin_phone"),
  sendNotificationToAgency: boolean("send_notification_to_agency").default(true),
  sendNotificationToAdmin: boolean("send_notification_to_admin").default(true),
  notificationMessageTemplate: text("notification_message_template").default("Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kisiSayisi}"),
  active: boolean("active").default(true),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant, system
  timestamp: timestamp("timestamp").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
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

// === TYPES ===
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Capacity = typeof capacity.$inferSelect;
export type InsertCapacity = z.infer<typeof insertCapacitySchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Settings = typeof settings.$inferSelect;
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
