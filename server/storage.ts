import { db } from "./db";
import {
  activities,
  capacity,
  reservations,
  messages,
  settings,
  supportRequests,
  blacklist,
  type Activity,
  type InsertActivity,
  type Capacity,
  type InsertCapacity,
  type Reservation,
  type InsertReservation,
  type Message,
  type InsertMessage,
  type Settings,
  type InsertSettings,
  type SupportRequest,
  type InsertSupportRequest,
  type Blacklist,
  type InsertBlacklist,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, isNull, or, like } from "drizzle-orm";

export interface IStorage {
  // Activities
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Capacity
  getCapacity(date?: string, activityId?: number): Promise<Capacity[]>;
  createCapacity(capacity: InsertCapacity): Promise<Capacity>;
  updateCapacitySlots(id: number, bookedChange: number): Promise<Capacity>;

  // Reservations
  getReservations(): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  getReservationsStats(): Promise<any>;
  getDetailedStats(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<any>;
  getDateDetails(date: string): Promise<any>;
  findReservationByPhoneOrOrder(phone: string, orderId?: string): Promise<Reservation | undefined>;

  // Messages
  addMessage(message: InsertMessage): Promise<Message>;
  getMessages(phone: string, limit?: number): Promise<Message[]>;
  getAllConversations(filter?: 'all' | 'with_reservation' | 'human_intervention'): Promise<any[]>;
  markHumanIntervention(phone: string, requires: boolean): Promise<void>;

  // Support Requests
  getOpenSupportRequest(phone: string): Promise<SupportRequest | undefined>;
  createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest>;
  resolveSupportRequest(id: number): Promise<SupportRequest>;
  getAllSupportRequests(status?: 'open' | 'resolved'): Promise<SupportRequest[]>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<Settings>;

  // Blacklist
  getBlacklist(): Promise<Blacklist[]>;
  addToBlacklist(phone: string, reason?: string): Promise<Blacklist>;
  removeFromBlacklist(id: number): Promise<void>;
  isBlacklisted(phone: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Activities
  async getActivities(): Promise<Activity[]> {
    return await db.select().from(activities);
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity> {
    const [updated] = await db.update(activities).set(activity).where(eq(activities.id, id)).returning();
    return updated;
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  // Capacity
  async getCapacity(date?: string, activityId?: number): Promise<Capacity[]> {
    let query = db.select().from(capacity);
    const conditions = [];
    if (date) conditions.push(eq(capacity.date, date));
    if (activityId) conditions.push(eq(capacity.activityId, activityId));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async createCapacity(item: InsertCapacity): Promise<Capacity> {
    const [newCapacity] = await db.insert(capacity).values(item).returning();
    return newCapacity;
  }

  async updateCapacitySlots(id: number, bookedChange: number): Promise<Capacity> {
    const [updated] = await db
      .update(capacity)
      .set({ bookedSlots: sql`${capacity.bookedSlots} + ${bookedChange}` })
      .where(eq(capacity.id, id))
      .returning();
    return updated;
  }

  async updateCapacity(id: number, totalSlots: number): Promise<Capacity> {
    const [updated] = await db
      .update(capacity)
      .set({ totalSlots })
      .where(eq(capacity.id, id))
      .returning();
    return updated;
  }

  // Reservations
  async getReservations(): Promise<Reservation[]> {
    return await db.select().from(reservations).orderBy(desc(reservations.date));
  }

  async createReservation(item: InsertReservation): Promise<Reservation> {
    const [res] = await db.insert(reservations).values(item).returning();
    return res;
  }

  async getReservationsStats(): Promise<any> {
    const allReservations = await db.select().from(reservations);
    const allActivities = await db.select().from(activities);
    
    const totalReservations = allReservations.length;
    
    // Calculate dual currency revenue with null safety
    let totalRevenueTl = 0;
    let totalRevenueUsd = 0;
    
    for (const res of allReservations) {
      const priceTl = typeof res.priceTl === 'number' ? res.priceTl : 0;
      const priceUsd = typeof res.priceUsd === 'number' ? res.priceUsd : 0;
      totalRevenueTl += priceTl;
      totalRevenueUsd += priceUsd;
    }
    
    // Calculate weekly sales (last 7 days)
    const today = new Date();
    const weekDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const weeklySales = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = weekDays[date.getDay()];
      
      const dayReservations = allReservations.filter(r => r.date === dateStr);
      const salesTl = dayReservations.reduce((sum, r) => {
        const val = typeof r.priceTl === 'number' ? r.priceTl : 0;
        return sum + val;
      }, 0);
      const salesUsd = dayReservations.reduce((sum, r) => {
        const val = typeof r.priceUsd === 'number' ? r.priceUsd : 0;
        return sum + val;
      }, 0);
      
      weeklySales.push({ name: dayName, salesTl, salesUsd });
    }
    
    // Popular activities
    const activityCounts: Record<number, { name: string; count: number }> = {};
    for (const res of allReservations) {
      if (res.activityId) {
        if (!activityCounts[res.activityId]) {
          const act = allActivities.find(a => a.id === res.activityId);
          activityCounts[res.activityId] = { name: act?.name || 'Bilinmeyen', count: 0 };
        }
        activityCounts[res.activityId].count += res.quantity;
      }
    }
    const popularActivities = Object.values(activityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return { 
      totalReservations, 
      totalRevenueTl, 
      totalRevenueUsd,
      totalRevenue: totalRevenueTl, // backwards compatibility
      weeklySales,
      popularActivities 
    };
  }

  async getDetailedStats(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<any> {
    const allReservations = await db.select().from(reservations);
    const allActivities = await db.select().from(activities);
    
    const today = new Date();
    const chartData: Array<{
      name: string;
      date: string;
      salesTl: number;
      salesUsd: number;
      reservationCount: number;
    }> = [];
    
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    
    if (period === 'daily') {
      // Last 24 hours by hour
      for (let i = 23; i >= 0; i--) {
        const date = new Date(today);
        date.setHours(today.getHours() - i);
        const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;
        const dateStr = date.toISOString().split('T')[0];
        
        const hourReservations = allReservations.filter(r => {
          if (r.date !== dateStr) return false;
          const resHour = r.time?.split(':')[0];
          return resHour === date.getHours().toString().padStart(2, '0');
        });
        
        chartData.push({
          name: hourStr,
          date: dateStr,
          salesTl: hourReservations.reduce((sum, r) => sum + (typeof r.priceTl === 'number' ? r.priceTl : 0), 0),
          salesUsd: hourReservations.reduce((sum, r) => sum + (typeof r.priceUsd === 'number' ? r.priceUsd : 0), 0),
          reservationCount: hourReservations.length
        });
      }
    } else if (period === 'weekly') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];
        
        const dayReservations = allReservations.filter(r => r.date === dateStr);
        
        chartData.push({
          name: `${dayName} (${date.getDate()})`,
          date: dateStr,
          salesTl: dayReservations.reduce((sum, r) => sum + (typeof r.priceTl === 'number' ? r.priceTl : 0), 0),
          salesUsd: dayReservations.reduce((sum, r) => sum + (typeof r.priceUsd === 'number' ? r.priceUsd : 0), 0),
          reservationCount: dayReservations.length
        });
      }
    } else if (period === 'monthly') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayReservations = allReservations.filter(r => r.date === dateStr);
        
        chartData.push({
          name: `${date.getDate()} ${monthNames[date.getMonth()]}`,
          date: dateStr,
          salesTl: dayReservations.reduce((sum, r) => sum + (typeof r.priceTl === 'number' ? r.priceTl : 0), 0),
          salesUsd: dayReservations.reduce((sum, r) => sum + (typeof r.priceUsd === 'number' ? r.priceUsd : 0), 0),
          reservationCount: dayReservations.length
        });
      }
    } else if (period === 'yearly') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const monthReservations = allReservations.filter(r => r.date?.startsWith(yearMonth));
        
        chartData.push({
          name: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
          date: yearMonth,
          salesTl: monthReservations.reduce((sum, r) => sum + (typeof r.priceTl === 'number' ? r.priceTl : 0), 0),
          salesUsd: monthReservations.reduce((sum, r) => sum + (typeof r.priceUsd === 'number' ? r.priceUsd : 0), 0),
          reservationCount: monthReservations.length
        });
      }
    }
    
    // Calculate totals for the period
    const periodReservations = chartData.reduce((sum, d) => sum + d.reservationCount, 0);
    const periodTotalTl = chartData.reduce((sum, d) => sum + d.salesTl, 0);
    const periodTotalUsd = chartData.reduce((sum, d) => sum + d.salesUsd, 0);
    
    return {
      period,
      chartData,
      totals: {
        reservations: periodReservations,
        salesTl: periodTotalTl,
        salesUsd: periodTotalUsd
      }
    };
  }

  async getDateDetails(date: string): Promise<any> {
    const allReservations = await db.select().from(reservations);
    const allActivities = await db.select().from(activities);
    
    const dateReservations = allReservations.filter(r => r.date === date);
    
    // Group by activity
    const activityBreakdown: Record<number, {
      activityId: number;
      activityName: string;
      reservationCount: number;
      totalQuantity: number;
      salesTl: number;
      salesUsd: number;
      reservations: typeof dateReservations;
    }> = {};
    
    for (const res of dateReservations) {
      const actId = res.activityId || 0;
      if (!activityBreakdown[actId]) {
        const activity = allActivities.find(a => a.id === actId);
        activityBreakdown[actId] = {
          activityId: actId,
          activityName: activity?.name || 'Bilinmeyen Aktivite',
          reservationCount: 0,
          totalQuantity: 0,
          salesTl: 0,
          salesUsd: 0,
          reservations: []
        };
      }
      activityBreakdown[actId].reservationCount++;
      activityBreakdown[actId].totalQuantity += res.quantity;
      activityBreakdown[actId].salesTl += typeof res.priceTl === 'number' ? res.priceTl : 0;
      activityBreakdown[actId].salesUsd += typeof res.priceUsd === 'number' ? res.priceUsd : 0;
      activityBreakdown[actId].reservations.push(res);
    }
    
    const activities_data = Object.values(activityBreakdown).sort((a, b) => b.reservationCount - a.reservationCount);
    
    return {
      date,
      totalReservations: dateReservations.length,
      totalQuantity: dateReservations.reduce((sum, r) => sum + r.quantity, 0),
      totalSalesTl: dateReservations.reduce((sum, r) => sum + (typeof r.priceTl === 'number' ? r.priceTl : 0), 0),
      totalSalesUsd: dateReservations.reduce((sum, r) => sum + (typeof r.priceUsd === 'number' ? r.priceUsd : 0), 0),
      activities: activities_data
    };
  }

  async findReservationByPhoneOrOrder(phone: string, orderId?: string): Promise<Reservation | undefined> {
    const allReservations = await db.select().from(reservations);
    const normalizedPhone = phone.replace(/\D/g, '');
    
    // Find by phone first
    let reservation = allReservations.find(r => 
      r.customerPhone?.replace(/\D/g, '') === normalizedPhone
    );
    
    // If not found and orderId provided, try by order ID
    if (!reservation && orderId) {
      reservation = allReservations.find(r => r.externalId === orderId);
    }
    
    return reservation;
  }

  // Messages
  async addMessage(item: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(item).returning();
    return msg;
  }

  async getMessages(phone: string, limit: number = 5): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.phone, phone))
      .orderBy(desc(messages.timestamp))
      .limit(limit);
  }

  async getAllConversations(filter?: 'all' | 'with_reservation' | 'human_intervention'): Promise<any[]> {
    const allMessages = await db.select().from(messages).orderBy(desc(messages.timestamp));
    const allReservations = await db.select().from(reservations);
    const allSupportRequests = await db.select().from(supportRequests);
    
    // Group messages by phone
    const conversationMap: Record<string, {
      phone: string;
      messages: Message[];
      hasReservation: boolean;
      reservationInfo?: Reservation;
      requiresHumanIntervention: boolean;
      supportRequest?: SupportRequest;
      lastMessageTime: Date | null;
    }> = {};
    
    for (const msg of allMessages) {
      if (!conversationMap[msg.phone]) {
        // Check if phone has reservation
        const reservation = allReservations.find(r => 
          r.customerPhone === msg.phone || 
          r.customerPhone?.replace(/\D/g, '') === msg.phone.replace(/\D/g, '')
        );
        
        // Check for open support request
        const supportRequest = allSupportRequests.find(s => 
          s.phone === msg.phone && s.status === 'open'
        );
        
        conversationMap[msg.phone] = {
          phone: msg.phone,
          messages: [],
          hasReservation: !!reservation,
          reservationInfo: reservation,
          requiresHumanIntervention: false,
          supportRequest,
          lastMessageTime: msg.timestamp
        };
      }
      conversationMap[msg.phone].messages.push(msg);
      
      // Check if any message requires human intervention
      if (msg.requiresHumanIntervention) {
        conversationMap[msg.phone].requiresHumanIntervention = true;
      }
    }
    
    let conversations = Object.values(conversationMap);
    
    // Apply filters
    if (filter === 'with_reservation') {
      conversations = conversations.filter(c => c.hasReservation);
    } else if (filter === 'human_intervention') {
      conversations = conversations.filter(c => c.requiresHumanIntervention || c.supportRequest);
    }
    
    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessageTime?.getTime() || 0;
      const timeB = b.lastMessageTime?.getTime() || 0;
      return timeB - timeA;
    });
    
    return conversations;
  }

  async markHumanIntervention(phone: string, requires: boolean): Promise<void> {
    // Update the latest message for this phone
    const latestMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.phone, phone))
      .orderBy(desc(messages.timestamp))
      .limit(1);
    
    if (latestMessages.length > 0) {
      await db
        .update(messages)
        .set({ requiresHumanIntervention: requires })
        .where(eq(messages.id, latestMessages[0].id));
    }
  }

  // Support Requests
  async getOpenSupportRequest(phone: string): Promise<SupportRequest | undefined> {
    const [request] = await db
      .select()
      .from(supportRequests)
      .where(and(eq(supportRequests.phone, phone), eq(supportRequests.status, 'open')));
    return request;
  }

  async createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest> {
    const [created] = await db.insert(supportRequests).values(request).returning();
    return created;
  }

  async resolveSupportRequest(id: number): Promise<SupportRequest> {
    const [updated] = await db
      .update(supportRequests)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(eq(supportRequests.id, id))
      .returning();
    return updated;
  }

  async getAllSupportRequests(status?: 'open' | 'resolved'): Promise<SupportRequest[]> {
    if (status) {
      return await db.select().from(supportRequests).where(eq(supportRequests.status, status)).orderBy(desc(supportRequests.createdAt));
    }
    return await db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt));
  }

  // Settings
  async getSetting(key: string): Promise<string | undefined> {
    const [result] = await db.select().from(settings).where(eq(settings.key, key));
    return result?.value ?? undefined;
  }

  async setSetting(key: string, value: string): Promise<Settings> {
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      const [updated] = await db
        .update(settings)
        .set({ value })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(settings).values({ key, value }).returning();
      return created;
    }
  }

  // Blacklist
  async getBlacklist(): Promise<Blacklist[]> {
    return await db.select().from(blacklist).orderBy(desc(blacklist.createdAt));
  }

  async addToBlacklist(phone: string, reason?: string): Promise<Blacklist> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const [created] = await db.insert(blacklist).values({ phone: normalizedPhone, reason }).returning();
    return created;
  }

  async removeFromBlacklist(id: number): Promise<void> {
    await db.delete(blacklist).where(eq(blacklist.id, id));
  }

  async isBlacklisted(phone: string): Promise<boolean> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const all = await db.select().from(blacklist);
    return all.some(b => normalizedPhone.includes(b.phone) || b.phone.includes(normalizedPhone));
  }
}

export const storage = new DatabaseStorage();
