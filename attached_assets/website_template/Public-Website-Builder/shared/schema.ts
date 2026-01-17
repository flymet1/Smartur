import { z } from "zod";

export const agencyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  mapUrl: z.string().optional(),
  heroImage: z.string().optional(),
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  aboutText: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
  }).optional(),
  googleAnalyticsId: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

export type AgencyInfo = z.infer<typeof agencyInfoSchema>;

export const agencySettingsSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  fontFamily: z.string().optional(),
  languages: z.array(z.string()),
  defaultLanguage: z.string(),
  currency: z.string(),
  currencySymbol: z.string(),
  dateFormat: z.string(),
  timeFormat: z.string(),
});

export type AgencySettings = z.infer<typeof agencySettingsSchema>;

export const activityCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().optional(),
});

export type ActivityCategory = z.infer<typeof activityCategorySchema>;

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  thumbnail: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  price: z.number(),
  originalPrice: z.number().optional(),
  currency: z.string(),
  duration: z.string(),
  durationMinutes: z.number(),
  location: z.string(),
  maxParticipants: z.number(),
  minParticipants: z.number().optional(),
  included: z.array(z.string()),
  excluded: z.array(z.string()),
  highlights: z.array(z.string()),
  requirements: z.array(z.string()).optional(),
  meetingPoint: z.string().optional(),
  languages: z.array(z.string()),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean(),
});

export type Activity = z.infer<typeof activitySchema>;

export const availabilitySlotSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  date: z.string(),
  time: z.string(),
  availableSpots: z.number(),
  totalSpots: z.number(),
  price: z.number(),
  currency: z.string(),
});

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

export const reservationParticipantSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  age: z.number().optional(),
});

export type ReservationParticipant = z.infer<typeof reservationParticipantSchema>;

export const createReservationSchema = z.object({
  activityId: z.string(),
  slotId: z.string(),
  date: z.string(),
  time: z.string(),
  participants: z.array(reservationParticipantSchema).min(1),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(5),
  notes: z.string().optional(),
  language: z.string().optional(),
});

export type CreateReservation = z.infer<typeof createReservationSchema>;

export const reservationSchema = z.object({
  id: z.string(),
  trackingCode: z.string(),
  activityId: z.string(),
  activityName: z.string(),
  slotId: z.string(),
  date: z.string(),
  time: z.string(),
  participants: z.array(reservationParticipantSchema),
  participantCount: z.number(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  notes: z.string().optional(),
  totalPrice: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  paymentStatus: z.enum(["pending", "paid", "refunded", "failed"]),
  createdAt: z.string(),
});

export type Reservation = z.infer<typeof reservationSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export type ContactForm = z.infer<typeof contactFormSchema>;

export const users = {} as any;
export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
export const insertUserSchema = z.object({ username: z.string(), password: z.string() });
