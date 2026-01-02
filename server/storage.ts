import { db } from "./db";
import {
  activities,
  capacity,
  reservations,
  messages,
  settings,
  supportRequests,
  blacklist,
  agencies,
  agencyActivityTerms,
  activityCosts,
  settlements,
  settlementEntries,
  payments,
  agencyPayouts,
  supplierDispatches,
  agencyActivityRates,
  packageTours,
  packageTourActivities,
  holidays,
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
  type Agency,
  type InsertAgency,
  type AgencyActivityTerms,
  type InsertAgencyActivityTerms,
  type ActivityCost,
  type InsertActivityCost,
  type Settlement,
  type InsertSettlement,
  type SettlementEntry,
  type InsertSettlementEntry,
  type Payment,
  type InsertPayment,
  type AgencyPayout,
  type InsertAgencyPayout,
  type SupplierDispatch,
  type InsertSupplierDispatch,
  type AgencyActivityRate,
  type InsertAgencyActivityRate,
  type PackageTour,
  type InsertPackageTour,
  type PackageTourActivity,
  type Holiday,
  type InsertHoliday,
  type InsertPackageTourActivity,
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
  deleteCapacity(id: number): Promise<void>;

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

  // Finance - Agencies
  getAgencies(): Promise<Agency[]>;
  getAgency(id: number): Promise<Agency | undefined>;
  createAgency(agency: InsertAgency): Promise<Agency>;
  updateAgency(id: number, agency: Partial<InsertAgency>): Promise<Agency>;
  deleteAgency(id: number): Promise<void>;

  // Finance - Activity Costs
  getActivityCosts(month?: string): Promise<ActivityCost[]>;
  upsertActivityCost(cost: InsertActivityCost): Promise<ActivityCost>;

  // Finance - Settlements
  getSettlements(agencyId?: number): Promise<Settlement[]>;
  getSettlement(id: number): Promise<Settlement | undefined>;
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  updateSettlement(id: number, settlement: Partial<InsertSettlement>): Promise<Settlement>;
  getSettlementEntries(settlementId: number): Promise<SettlementEntry[]>;
  createSettlementEntry(entry: InsertSettlementEntry): Promise<SettlementEntry>;

  // Finance - Payments
  getPayments(settlementId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Finance - Agency Payouts
  getAgencyPayouts(agencyId?: number): Promise<AgencyPayout[]>;
  createAgencyPayout(payout: InsertAgencyPayout): Promise<AgencyPayout>;
  deleteAgencyPayout(id: number): Promise<void>;

  // Finance - Supplier Dispatches
  getSupplierDispatches(agencyId?: number): Promise<SupplierDispatch[]>;
  createSupplierDispatch(dispatch: InsertSupplierDispatch): Promise<SupplierDispatch>;
  updateSupplierDispatch(id: number, dispatch: Partial<InsertSupplierDispatch>): Promise<SupplierDispatch>;
  deleteSupplierDispatch(id: number): Promise<void>;
  
  // Finance - Agency Activity Rates (Dönemsel Tarifeler)
  getAgencyActivityRates(agencyId?: number): Promise<AgencyActivityRate[]>;
  createAgencyActivityRate(rate: InsertAgencyActivityRate): Promise<AgencyActivityRate>;
  updateAgencyActivityRate(id: number, rate: Partial<InsertAgencyActivityRate>): Promise<AgencyActivityRate>;
  deleteAgencyActivityRate(id: number): Promise<void>;
  getActiveRateForDispatch(agencyId: number, activityId: number | null, date: string): Promise<AgencyActivityRate | null>;
  
  getSupplierDispatchSummary(startDate?: string, endDate?: string): Promise<{
    agencyId: number;
    agencyName: string;
    totalGuests: number;
    totalOwedTl: number;
    totalPaidTl: number;
    remainingTl: number;
  }[]>;

  // Finance - Overview
  getFinanceOverview(startDate: string, endDate: string): Promise<any>;
  getUnpaidReservations(agencyId: number, sinceDate?: string): Promise<Reservation[]>;
  updateReservationSettlement(reservationId: number, settlementId: number): Promise<void>;
  updateReservationAgency(reservationId: number, agencyId: number): Promise<void>;

  // Package Tours
  getPackageTours(): Promise<PackageTour[]>;
  getPackageTour(id: number): Promise<PackageTour | undefined>;
  createPackageTour(tour: InsertPackageTour): Promise<PackageTour>;
  updatePackageTour(id: number, tour: Partial<InsertPackageTour>): Promise<PackageTour>;
  deletePackageTour(id: number): Promise<void>;
  
  // Package Tour Activities
  getPackageTourActivities(packageTourId: number): Promise<PackageTourActivity[]>;
  setPackageTourActivities(packageTourId: number, activities: InsertPackageTourActivity[]): Promise<PackageTourActivity[]>;
  
  // Package Tour Matching
  findPackageTourByName(name: string): Promise<PackageTour | undefined>;
  
  // Holidays
  getHolidays(): Promise<Holiday[]>;
  getHoliday(id: number): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  getHolidaysForDateRange(startDate: string, endDate: string): Promise<Holiday[]>;
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
    // First delete related capacity records
    await db.delete(capacity).where(eq(capacity.activityId, id));
    // Then delete the activity
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

  async deleteCapacity(id: number): Promise<void> {
    await db.delete(capacity).where(eq(capacity.id, id));
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
    
    // Normalize phone to last 10 digits (Turkish phone numbers are always 10 digits)
    // This handles: +905321234567, 05321234567, 5321234567, 532 123 45 67, etc.
    const normalizePhone = (p: string): string => {
      const digitsOnly = p.replace(/\D/g, '');
      // Take last 10 digits (removes country code 90, leading 0, etc.)
      return digitsOnly.slice(-10);
    };
    
    const searchPhone = normalizePhone(phone);
    
    // Find by phone first (compare last 10 digits)
    let reservation = allReservations.find(r => {
      if (!r.customerPhone) return false;
      const reservationPhone = normalizePhone(r.customerPhone);
      return reservationPhone === searchPhone && searchPhone.length === 10;
    });
    
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
    
    // Normalize phone to last 10 digits for comparison
    const normalizePhone = (p: string): string => {
      const digitsOnly = p.replace(/\D/g, '');
      return digitsOnly.slice(-10);
    };
    
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
        // Check if phone has reservation (compare last 10 digits)
        const msgPhoneNormalized = normalizePhone(msg.phone);
        const reservation = allReservations.find(r => {
          if (!r.customerPhone) return false;
          const resPhoneNormalized = normalizePhone(r.customerPhone);
          return resPhoneNormalized === msgPhoneNormalized && msgPhoneNormalized.length === 10;
        });
        
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

  // Finance - Agencies
  async getAgencies(): Promise<Agency[]> {
    return await db.select().from(agencies).orderBy(desc(agencies.createdAt));
  }

  async getAgency(id: number): Promise<Agency | undefined> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
    return agency;
  }

  async createAgency(agency: InsertAgency): Promise<Agency> {
    const [created] = await db.insert(agencies).values(agency).returning();
    return created;
  }

  async updateAgency(id: number, agency: Partial<InsertAgency>): Promise<Agency> {
    const [updated] = await db.update(agencies).set(agency).where(eq(agencies.id, id)).returning();
    return updated;
  }

  async deleteAgency(id: number): Promise<void> {
    const agencySettlements = await db.select({ id: settlements.id }).from(settlements).where(eq(settlements.agencyId, id));
    for (const settlement of agencySettlements) {
      await db.delete(payments).where(eq(payments.settlementId, settlement.id));
      await db.delete(settlementEntries).where(eq(settlementEntries.settlementId, settlement.id));
    }
    await db.delete(settlements).where(eq(settlements.agencyId, id));
    await db.delete(agencyPayouts).where(eq(agencyPayouts.agencyId, id));
    await db.delete(agencyActivityTerms).where(eq(agencyActivityTerms.agencyId, id));
    await db.delete(agencies).where(eq(agencies.id, id));
  }

  // Finance - Activity Costs
  async getActivityCosts(month?: string): Promise<ActivityCost[]> {
    if (month) {
      return await db.select().from(activityCosts).where(eq(activityCosts.month, month));
    }
    return await db.select().from(activityCosts);
  }

  async upsertActivityCost(cost: InsertActivityCost): Promise<ActivityCost> {
    // Check if exists for same activity and month
    const existing = await db.select().from(activityCosts)
      .where(and(eq(activityCosts.activityId, cost.activityId), eq(activityCosts.month, cost.month)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(activityCosts)
        .set(cost)
        .where(eq(activityCosts.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(activityCosts).values(cost).returning();
    return created;
  }

  async deleteActivityCost(id: number): Promise<void> {
    await db.delete(activityCosts).where(eq(activityCosts.id, id));
  }

  // Finance - Settlements
  async getSettlements(agencyId?: number): Promise<Settlement[]> {
    if (agencyId) {
      return await db.select().from(settlements).where(eq(settlements.agencyId, agencyId)).orderBy(desc(settlements.createdAt));
    }
    return await db.select().from(settlements).orderBy(desc(settlements.createdAt));
  }

  async getSettlement(id: number): Promise<Settlement | undefined> {
    const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id));
    return settlement;
  }

  async createSettlement(settlement: InsertSettlement): Promise<Settlement> {
    const [created] = await db.insert(settlements).values(settlement).returning();
    return created;
  }

  async updateSettlement(id: number, settlement: Partial<InsertSettlement>): Promise<Settlement> {
    const [updated] = await db.update(settlements).set(settlement).where(eq(settlements.id, id)).returning();
    return updated;
  }

  async getSettlementEntries(settlementId: number): Promise<SettlementEntry[]> {
    return await db.select().from(settlementEntries).where(eq(settlementEntries.settlementId, settlementId));
  }

  async createSettlementEntry(entry: InsertSettlementEntry): Promise<SettlementEntry> {
    const [created] = await db.insert(settlementEntries).values(entry).returning();
    return created;
  }

  // Finance - Payments
  async getPayments(settlementId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.settlementId, settlementId)).orderBy(desc(payments.paidAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    
    // Update settlement paid amount and remaining (if settlementId exists)
    if (payment.settlementId) {
      const settlement = await this.getSettlement(payment.settlementId);
      if (settlement) {
        const newPaidAmount = (settlement.paidAmountTl || 0) + payment.amountTl;
        const newRemaining = (settlement.payoutTl || 0) - newPaidAmount;
        await this.updateSettlement(payment.settlementId, {
          paidAmountTl: newPaidAmount,
          remainingTl: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'paid' : settlement.status
        });
      }
    }
    
    return created;
  }

  // Finance - Agency Payouts
  async getAgencyPayouts(agencyId?: number): Promise<AgencyPayout[]> {
    if (agencyId) {
      return await db.select().from(agencyPayouts).where(eq(agencyPayouts.agencyId, agencyId)).orderBy(desc(agencyPayouts.createdAt));
    }
    return await db.select().from(agencyPayouts).orderBy(desc(agencyPayouts.createdAt));
  }

  async createAgencyPayout(payout: InsertAgencyPayout): Promise<AgencyPayout> {
    const [created] = await db.insert(agencyPayouts).values(payout).returning();
    return created;
  }

  async deleteAgencyPayout(id: number): Promise<void> {
    await db.delete(agencyPayouts).where(eq(agencyPayouts.id, id));
  }

  // Finance - Supplier Dispatches
  async getSupplierDispatches(agencyId?: number): Promise<SupplierDispatch[]> {
    if (agencyId) {
      return await db.select().from(supplierDispatches).where(eq(supplierDispatches.agencyId, agencyId)).orderBy(desc(supplierDispatches.dispatchDate));
    }
    return await db.select().from(supplierDispatches).orderBy(desc(supplierDispatches.dispatchDate));
  }

  async createSupplierDispatch(dispatch: InsertSupplierDispatch): Promise<SupplierDispatch> {
    const [created] = await db.insert(supplierDispatches).values(dispatch).returning();
    return created;
  }

  async updateSupplierDispatch(id: number, dispatch: Partial<InsertSupplierDispatch>): Promise<SupplierDispatch> {
    const [updated] = await db.update(supplierDispatches).set(dispatch).where(eq(supplierDispatches.id, id)).returning();
    return updated;
  }

  async deleteSupplierDispatch(id: number): Promise<void> {
    await db.delete(supplierDispatches).where(eq(supplierDispatches.id, id));
  }

  async getSupplierDispatchSummary(startDate?: string, endDate?: string): Promise<{
    agencyId: number;
    agencyName: string;
    totalGuests: number;
    totalOwedTl: number;
    totalPaidTl: number;
    remainingTl: number;
  }[]> {
    const allAgencies = await db.select().from(agencies);
    const allDispatches = await db.select().from(supplierDispatches);
    const allPayouts = await db.select().from(agencyPayouts);
    
    const filteredDispatches = allDispatches.filter(d => {
      if (!startDate || !endDate) return true;
      return d.dispatchDate >= startDate && d.dispatchDate <= endDate;
    });
    
    const filteredPayouts = allPayouts.filter(p => {
      if (!startDate || !endDate) return true;
      return (p.periodEnd >= startDate && p.periodStart <= endDate);
    });
    
    const summaryMap: Record<number, {
      agencyId: number;
      agencyName: string;
      totalGuests: number;
      totalOwedTl: number;
      totalPaidTl: number;
      remainingTl: number;
    }> = {};
    
    for (const agency of allAgencies) {
      summaryMap[agency.id] = {
        agencyId: agency.id,
        agencyName: agency.name,
        totalGuests: 0,
        totalOwedTl: 0,
        totalPaidTl: 0,
        remainingTl: 0
      };
    }
    
    for (const dispatch of filteredDispatches) {
      if (summaryMap[dispatch.agencyId]) {
        summaryMap[dispatch.agencyId].totalGuests += dispatch.guestCount || 0;
        summaryMap[dispatch.agencyId].totalOwedTl += dispatch.totalPayoutTl || 0;
      }
    }
    
    for (const payout of filteredPayouts) {
      if (summaryMap[payout.agencyId]) {
        summaryMap[payout.agencyId].totalPaidTl += payout.totalAmountTl || 0;
      }
    }
    
    for (const agencyId in summaryMap) {
      summaryMap[agencyId].remainingTl = summaryMap[agencyId].totalOwedTl - summaryMap[agencyId].totalPaidTl;
    }
    
    return Object.values(summaryMap).filter(s => s.totalGuests > 0 || s.totalPaidTl > 0);
  }

  // Finance - Agency Activity Rates (Dönemsel Tarifeler)
  async getAgencyActivityRates(agencyId?: number): Promise<AgencyActivityRate[]> {
    if (agencyId) {
      return await db.select().from(agencyActivityRates).where(eq(agencyActivityRates.agencyId, agencyId)).orderBy(desc(agencyActivityRates.validFrom));
    }
    return await db.select().from(agencyActivityRates).orderBy(desc(agencyActivityRates.validFrom));
  }

  async createAgencyActivityRate(rate: InsertAgencyActivityRate): Promise<AgencyActivityRate> {
    const [created] = await db.insert(agencyActivityRates).values(rate).returning();
    return created;
  }

  async updateAgencyActivityRate(id: number, rate: Partial<InsertAgencyActivityRate>): Promise<AgencyActivityRate> {
    const [updated] = await db.update(agencyActivityRates).set(rate).where(eq(agencyActivityRates.id, id)).returning();
    return updated;
  }

  async deleteAgencyActivityRate(id: number): Promise<void> {
    await db.delete(agencyActivityRates).where(eq(agencyActivityRates.id, id));
  }

  async getActiveRateForDispatch(agencyId: number, activityId: number | null, date: string): Promise<AgencyActivityRate | null> {
    const allRates = await db.select().from(agencyActivityRates)
      .where(and(
        eq(agencyActivityRates.agencyId, agencyId),
        eq(agencyActivityRates.isActive, true)
      ));
    
    const matchingRates = allRates.filter(rate => {
      if (activityId && rate.activityId && rate.activityId !== activityId) return false;
      if (rate.validFrom > date) return false;
      if (rate.validTo && rate.validTo < date) return false;
      return true;
    });
    
    if (matchingRates.length === 0) return null;
    
    const activitySpecific = matchingRates.filter(r => r.activityId === activityId);
    if (activitySpecific.length > 0) {
      return activitySpecific.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
    }
    
    const generalRates = matchingRates.filter(r => !r.activityId);
    if (generalRates.length > 0) {
      return generalRates.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
    }
    
    return matchingRates.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
  }

  // Finance - Overview
  async getFinanceOverview(startDate: string, endDate: string): Promise<any> {
    const allReservations = await db.select().from(reservations);
    const allActivities = await db.select().from(activities);
    const month = startDate.slice(0, 7);
    const allCosts = await db.select().from(activityCosts).where(eq(activityCosts.month, month));
    const allAgencies = await db.select().from(agencies);
    const allSettlements = await db.select().from(settlements);
    
    // Get VAT rate from settings
    const vatRateSetting = await this.getSetting('vatRate');
    const vatRate = vatRateSetting ? parseInt(vatRateSetting) : 20;
    
    // Filter reservations for the date range
    const dateRangeReservations = allReservations.filter(r => {
      if (!r.date) return false;
      return r.date >= startDate && r.date <= endDate;
    });
    
    // Calculate totals per activity
    const activityStats: Record<number, {
      activityId: number;
      activityName: string;
      reservationCount: number;
      guestCount: number;
      revenueTl: number;
      revenueUsd: number;
      costTl: number;
      profitTl: number;
      vatTl: number;
    }> = {};
    
    for (const res of dateRangeReservations) {
      const actId = res.activityId || 0;
      if (!activityStats[actId]) {
        const activity = allActivities.find(a => a.id === actId);
        const cost = allCosts.find(c => c.activityId === actId);
        activityStats[actId] = {
          activityId: actId,
          activityName: activity?.name || 'Bilinmeyen',
          reservationCount: 0,
          guestCount: 0,
          revenueTl: 0,
          revenueUsd: 0,
          costTl: cost?.fixedCost || 0,
          profitTl: 0,
          vatTl: 0
        };
      }
      
      activityStats[actId].reservationCount++;
      activityStats[actId].guestCount += res.quantity;
      activityStats[actId].revenueTl += res.priceTl || 0;
      activityStats[actId].revenueUsd += res.priceUsd || 0;
      
      // Add variable cost per guest
      const cost = allCosts.find(c => c.activityId === actId);
      if (cost) {
        activityStats[actId].costTl += (cost.variableCostPerGuest || 0) * res.quantity;
      }
    }
    
    // Calculate profit and VAT for each activity
    for (const stat of Object.values(activityStats)) {
      stat.vatTl = Math.round(stat.revenueTl * vatRate / 100);
      stat.profitTl = stat.revenueTl - stat.costTl - stat.vatTl;
    }
    
    // Calculate agency payouts
    const agencyPayouts: Record<number, {
      agencyId: number;
      agencyName: string;
      guestCount: number;
      payoutTl: number;
      paidTl: number;
      remainingTl: number;
    }> = {};
    
    for (const agency of allAgencies) {
      const agencyReservations = dateRangeReservations.filter(r => r.agencyId === agency.id);
      const guestCount = agencyReservations.reduce((sum, r) => sum + r.quantity, 0);
      const payoutTl = guestCount * (agency.defaultPayoutPerGuest || 0);
      
      // Calculate paid amount from settlements
      const agencySettlements = allSettlements.filter(s => s.agencyId === agency.id);
      const paidTl = agencySettlements.reduce((sum, s) => sum + (s.paidAmountTl || 0), 0);
      
      agencyPayouts[agency.id] = {
        agencyId: agency.id,
        agencyName: agency.name,
        guestCount,
        payoutTl,
        paidTl,
        remainingTl: payoutTl - paidTl
      };
    }
    
    // Calculate totals
    const totalRevenueTl = Object.values(activityStats).reduce((sum, s) => sum + s.revenueTl, 0);
    const totalRevenueUsd = Object.values(activityStats).reduce((sum, s) => sum + s.revenueUsd, 0);
    const totalCostTl = Object.values(activityStats).reduce((sum, s) => sum + s.costTl, 0);
    const totalVatTl = Object.values(activityStats).reduce((sum, s) => sum + s.vatTl, 0);
    const totalPayoutTl = Object.values(agencyPayouts).reduce((sum, a) => sum + a.payoutTl, 0);
    const totalProfitTl = totalRevenueTl - totalCostTl - totalVatTl - totalPayoutTl;
    
    return {
      period: { startDate, endDate },
      vatRate,
      totals: {
        revenueTl: totalRevenueTl,
        revenueUsd: totalRevenueUsd,
        costTl: totalCostTl,
        vatTl: totalVatTl,
        payoutTl: totalPayoutTl,
        profitTl: totalProfitTl,
        reservationCount: dateRangeReservations.length,
        guestCount: dateRangeReservations.reduce((sum, r) => sum + r.quantity, 0)
      },
      activityStats: Object.values(activityStats),
      agencyPayouts: Object.values(agencyPayouts)
    };
  }

  async getUnpaidReservations(agencyId: number, sinceDate?: string): Promise<Reservation[]> {
    const allReservations = await db.select().from(reservations);
    return allReservations.filter(r => {
      if (r.agencyId !== agencyId) return false;
      if (r.settlementId) return false; // Already in a settlement
      if (sinceDate && r.date && r.date < sinceDate) return false;
      return true;
    });
  }

  async updateReservationSettlement(reservationId: number, settlementId: number): Promise<void> {
    await db.update(reservations)
      .set({ settlementId })
      .where(eq(reservations.id, reservationId));
  }

  async updateReservationAgency(reservationId: number, agencyId: number): Promise<void> {
    await db.update(reservations)
      .set({ agencyId })
      .where(eq(reservations.id, reservationId));
  }

  // Package Tours
  async getPackageTours(): Promise<PackageTour[]> {
    return await db.select().from(packageTours).orderBy(desc(packageTours.createdAt));
  }

  async getPackageTour(id: number): Promise<PackageTour | undefined> {
    const [tour] = await db.select().from(packageTours).where(eq(packageTours.id, id));
    return tour;
  }

  async createPackageTour(tour: InsertPackageTour): Promise<PackageTour> {
    const [newTour] = await db.insert(packageTours).values(tour).returning();
    return newTour;
  }

  async updatePackageTour(id: number, tour: Partial<InsertPackageTour>): Promise<PackageTour> {
    const [updated] = await db.update(packageTours).set(tour).where(eq(packageTours.id, id)).returning();
    return updated;
  }

  async deletePackageTour(id: number): Promise<void> {
    // First delete related package tour activities
    await db.delete(packageTourActivities).where(eq(packageTourActivities.packageTourId, id));
    // Then delete the package tour
    await db.delete(packageTours).where(eq(packageTours.id, id));
  }

  // Package Tour Activities
  async getPackageTourActivities(packageTourId: number): Promise<PackageTourActivity[]> {
    return await db.select().from(packageTourActivities)
      .where(eq(packageTourActivities.packageTourId, packageTourId))
      .orderBy(packageTourActivities.sortOrder);
  }

  async setPackageTourActivities(packageTourId: number, activityList: InsertPackageTourActivity[]): Promise<PackageTourActivity[]> {
    // Delete existing activities for this package
    await db.delete(packageTourActivities).where(eq(packageTourActivities.packageTourId, packageTourId));
    
    if (activityList.length === 0) return [];
    
    // Insert new activities
    const toInsert = activityList.map((a, idx) => ({
      ...a,
      packageTourId,
      sortOrder: a.sortOrder ?? idx
    }));
    
    return await db.insert(packageTourActivities).values(toInsert).returning();
  }

  // Package Tour Matching (for WooCommerce webhook)
  async findPackageTourByName(name: string): Promise<PackageTour | undefined> {
    const allTours = await db.select().from(packageTours).where(eq(packageTours.active, true));
    const normalizedName = name.toLowerCase().trim();
    
    for (const tour of allTours) {
      // Exact match
      if (tour.name.toLowerCase().trim() === normalizedName) {
        return tour;
      }
      
      // Check aliases
      try {
        const aliases: string[] = JSON.parse(tour.nameAliases || '[]');
        for (const alias of aliases) {
          if (alias.toLowerCase().trim() === normalizedName) {
            return tour;
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    return undefined;
  }

  // Holidays
  async getHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays).orderBy(holidays.startDate);
  }

  async getHoliday(id: number): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday;
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }

  async updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday> {
    const [updated] = await db.update(holidays).set(holiday).where(eq(holidays.id, id)).returning();
    return updated;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async getHolidaysForDateRange(startDate: string, endDate: string): Promise<Holiday[]> {
    return await db.select().from(holidays).where(
      and(
        eq(holidays.isActive, true),
        lte(holidays.startDate, endDate),
        gte(holidays.endDate, startDate)
      )
    ).orderBy(holidays.startDate);
  }
}

export const storage = new DatabaseStorage();
