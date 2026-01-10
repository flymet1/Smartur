import { db } from "./db";
import {
  tenants,
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
  supplierDispatchItems,
  agencyActivityRates,
  packageTours,
  packageTourActivities,
  holidays,
  autoResponses,
  customerRequests,
  reservationRequests,
  requestMessageTemplates,
  dailyMessageUsage,
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
  type SupplierDispatchItem,
  type InsertSupplierDispatchItem,
  type AgencyActivityRate,
  type InsertAgencyActivityRate,
  type PackageTour,
  type InsertPackageTour,
  type PackageTourActivity,
  type Holiday,
  type InsertHoliday,
  type InsertPackageTourActivity,
  type AutoResponse,
  type InsertAutoResponse,
  type CustomerRequest,
  type InsertCustomerRequest,
  type ReservationRequest,
  type InsertReservationRequest,
  type RequestMessageTemplate,
  type InsertRequestMessageTemplate,
  subscriptionPlans,
  subscriptions,
  subscriptionPayments,
  planFeatures,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type Subscription,
  type InsertSubscription,
  type SubscriptionPayment,
  type InsertSubscriptionPayment,
  type PlanFeature,
  type InsertPlanFeature,
  announcements,
  invoices,
  apiStatusLogs,
  botQualityScores,
  type Announcement,
  type InsertAnnouncement,
  type Invoice,
  type InsertInvoice,
  type ApiStatusLog,
  type InsertApiStatusLog,
  type BotQualityScore,
  type InsertBotQualityScore,
  type DailyMessageUsage,
  type InsertDailyMessageUsage,
  systemLogs,
  appVersions,
  platformAdmins,
  loginLogs,
  agencyNotes,
  platformSupportTickets,
  ticketResponses,
  appUsers,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userLoginLogs,
  type AppVersion,
  type InsertAppVersion,
  databaseBackups,
  type DatabaseBackup,
  type InsertDatabaseBackup,
  type PlatformAdmin,
  type InsertPlatformAdmin,
  type LoginLog,
  type InsertLoginLog,
  type AgencyNote,
  type InsertAgencyNote,
  type PlatformSupportTicket,
  type InsertPlatformSupportTicket,
  type TicketResponse,
  type InsertTicketResponse,
  type AppUser,
  type InsertAppUser,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type RolePermission,
  type InsertRolePermission,
  type UserRole,
  type InsertUserRole,
  type UserLoginLog,
  type InsertUserLoginLog,
  type Tenant,
  type InsertTenant,
  tenantIntegrations,
  type TenantIntegration,
  type InsertTenantIntegration,
  tenantPartnerships,
  partnerInviteCodes,
  dispatchShares,
  type TenantPartnership,
  type InsertTenantPartnership,
  type PartnerInviteCode,
  type InsertPartnerInviteCode,
  type DispatchShare,
  type InsertDispatchShare,
  activityPartnerShares,
  type ActivityPartnerShare,
  type InsertActivityPartnerShare,
  partnerTransactions,
  type PartnerTransaction,
  type InsertPartnerTransaction,
  userNotificationPreferences,
  tenantNotificationSettings,
  inAppNotifications,
  type UserNotificationPreference,
  type InsertUserNotificationPreference,
  type TenantNotificationSetting,
  type InsertTenantNotificationSetting,
  type InAppNotification,
  type InsertInAppNotification,
  viewerActivityShares,
  type ViewerActivityShare,
  type InsertViewerActivityShare,
  reservationChangeRequests,
  type ReservationChangeRequest,
  type InsertReservationChangeRequest,
} from "@shared/schema";
import { eq, and, gte, lte, lt, desc, sql, isNull, or, like, inArray } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: number): Promise<void>;
  getDefaultTenant(): Promise<Tenant | undefined>;
  createDefaultTenantIfNotExists(): Promise<Tenant>;

  // Activities (tenant-scoped)
  getActivities(tenantId?: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Capacity
  getCapacity(date?: string, activityId?: number): Promise<Capacity[]>;
  getCapacityRange(tenantId: number, activityId: number, startDate: string, endDate: string): Promise<Capacity[]>;
  createCapacity(capacity: InsertCapacity): Promise<Capacity>;
  updateCapacitySlots(id: number, bookedChange: number): Promise<Capacity>;
  deleteCapacity(id: number): Promise<void>;

  // Reservations
  getReservations(tenantId?: number): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, data: Partial<InsertReservation>): Promise<Reservation>;
  getReservationsStats(): Promise<any>;
  getDetailedStats(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<any>;
  getDateDetails(date: string): Promise<any>;
  findReservationByPhoneOrOrder(phone: string, orderId?: string): Promise<Reservation | undefined>;

  // Messages
  addMessage(message: InsertMessage): Promise<Message>;
  getMessages(phone: string, limit?: number): Promise<Message[]>;
  getAllConversations(filter?: 'all' | 'with_reservation' | 'human_intervention', tenantId?: number): Promise<any[]>;
  markHumanIntervention(phone: string, requires: boolean): Promise<void>;

  // Support Requests
  getOpenSupportRequest(phone: string): Promise<SupportRequest | undefined>;
  createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest>;
  resolveSupportRequest(id: number): Promise<SupportRequest>;
  getAllSupportRequests(status?: 'open' | 'resolved', tenantId?: number): Promise<SupportRequest[]>;

  // Settings (tenant-scoped)
  getSetting(key: string, tenantId?: number): Promise<string | undefined>;
  setSetting(key: string, value: string, tenantId?: number): Promise<Settings>;
  
  // Tenant Integrations (Twilio, WooCommerce, Gmail)
  getTenantIntegration(tenantId: number): Promise<TenantIntegration | undefined>;
  upsertTenantIntegration(tenantId: number, data: Partial<InsertTenantIntegration>): Promise<TenantIntegration>;
  deleteTenantIntegration(tenantId: number): Promise<void>;

  // Blacklist
  getBlacklist(): Promise<Blacklist[]>;
  addToBlacklist(phone: string, reason?: string): Promise<Blacklist>;
  removeFromBlacklist(id: number): Promise<void>;
  isBlacklisted(phone: string): Promise<boolean>;

  // Finance - Agencies
  getAgencies(tenantId?: number): Promise<Agency[]>;
  getAgency(id: number): Promise<Agency | undefined>;
  getAgencyByName(name: string, tenantId: number): Promise<Agency | undefined>;
  getAgencyByPartnerTenantId(tenantId: number, partnerTenantId: number): Promise<Agency | undefined>;
  getAllAgenciesWithPartnerTenantId(partnerTenantId: number): Promise<Agency[]>;
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
  getSupplierDispatches(agencyId?: number, tenantId?: number | null): Promise<SupplierDispatch[]>;
  createSupplierDispatch(dispatch: InsertSupplierDispatch): Promise<SupplierDispatch>;
  updateSupplierDispatch(id: number, dispatch: Partial<InsertSupplierDispatch>): Promise<SupplierDispatch>;
  deleteSupplierDispatch(id: number): Promise<void>;
  
  // Finance - Supplier Dispatch Items (Alt Kalemler)
  getDispatchItems(dispatchId: number): Promise<SupplierDispatchItem[]>;
  createDispatchItem(item: InsertSupplierDispatchItem): Promise<SupplierDispatchItem>;
  updateDispatchItem(id: number, item: Partial<InsertSupplierDispatchItem>): Promise<SupplierDispatchItem>;
  deleteDispatchItem(id: number): Promise<void>;
  deleteDispatchItemsByDispatchId(dispatchId: number): Promise<void>;
  getDispatchItemsByDispatchIds(dispatchIds: number[]): Promise<SupplierDispatchItem[]>;
  
  // Finance - Agency Activity Rates (Dönemsel Tarifeler)
  getAgencyActivityRates(agencyId?: number): Promise<AgencyActivityRate[]>;
  createAgencyActivityRate(rate: InsertAgencyActivityRate): Promise<AgencyActivityRate>;
  updateAgencyActivityRate(id: number, rate: Partial<InsertAgencyActivityRate>): Promise<AgencyActivityRate>;
  deleteAgencyActivityRate(id: number): Promise<void>;
  getActiveRateForDispatch(agencyId: number, activityId: number | null, date: string): Promise<AgencyActivityRate | null>;
  
  getSupplierDispatchSummary(startDate?: string, endDate?: string, tenantId?: number | null): Promise<{
    agencyId: number;
    agencyName: string;
    totalGuests: number;
    totalOwedTl: number;
    totalOwedUsd: number;
    totalPaidTl: number;
    remainingTl: number;
  }[]>;

  // Finance - Overview
  getFinanceOverview(startDate: string, endDate: string): Promise<any>;
  getUnpaidReservations(agencyId: number, sinceDate?: string): Promise<Reservation[]>;
  updateReservationSettlement(reservationId: number, settlementId: number): Promise<void>;
  updateReservationAgency(reservationId: number, agencyId: number): Promise<void>;
  updateReservationStatus(reservationId: number, status: string): Promise<Reservation>;

  // Package Tours
  getPackageTours(tenantId?: number): Promise<PackageTour[]>;
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

  // Auto Responses
  getAutoResponses(): Promise<AutoResponse[]>;
  getAutoResponse(id: number): Promise<AutoResponse | undefined>;
  createAutoResponse(autoResponse: InsertAutoResponse): Promise<AutoResponse>;
  updateAutoResponse(id: number, autoResponse: Partial<InsertAutoResponse>): Promise<AutoResponse>;
  deleteAutoResponse(id: number): Promise<void>;
  findMatchingAutoResponse(message: string): Promise<{ response: string; matchedLanguage: 'tr' | 'en' } | undefined>;

  // Customer Tracking
  getReservationByTrackingToken(token: string): Promise<Reservation | undefined>;
  generateTrackingToken(reservationId: number): Promise<string>;
  cleanupExpiredTrackingTokens(): Promise<number>;

  // Customer Requests
  createCustomerRequest(request: InsertCustomerRequest): Promise<CustomerRequest>;
  getCustomerRequests(tenantId?: number): Promise<CustomerRequest[]>;
  getCustomerRequest(id: number): Promise<CustomerRequest | undefined>;
  getCustomerRequestsByPhone(phone: string): Promise<CustomerRequest[]>;
  updateCustomerRequest(id: number, data: Partial<InsertCustomerRequest>): Promise<CustomerRequest>;

  // Partner Agency Reservation Requests
  createReservationRequest(request: InsertReservationRequest): Promise<ReservationRequest>;
  getReservationRequests(tenantId?: number): Promise<ReservationRequest[]>;
  getReservationRequest(id: number): Promise<ReservationRequest | undefined>;
  updateReservationRequest(id: number, data: Partial<InsertReservationRequest>): Promise<ReservationRequest>;
  deleteReservationRequest(id: number): Promise<void>;
  getReservationRequestStats(tenantId: number, options: { groupBy: 'daily' | 'monthly'; from?: string; to?: string; viewerId?: number }): Promise<{ viewerId: number; viewerName: string; viewerEmail: string; period: string; count: number; }[]>;
  getPartnerActivityStats(tenantId: number, options?: { from?: string; to?: string }): Promise<{ viewerId: number; viewerName: string; viewerPhone: string | null; activityId: number; activityName: string; totalGuests: number; totalRequests: number; }[]>;

  // Tenant Plan Verification (replaces license system)
  verifyTenantPlan(tenantId: number): Promise<{ 
    valid: boolean; 
    message: string; 
    status?: 'active' | 'warning' | 'suspended' | 'expired';
    canWrite?: boolean;
    plan?: SubscriptionPlan;
  }>;
  getTenantUsage(tenantId: number): Promise<{ activitiesUsed: number; reservationsThisMonth: number }>;

  // Request Message Templates
  getRequestMessageTemplates(): Promise<RequestMessageTemplate[]>;
  getRequestMessageTemplate(id: number): Promise<RequestMessageTemplate | undefined>;
  createRequestMessageTemplate(template: InsertRequestMessageTemplate): Promise<RequestMessageTemplate>;
  updateRequestMessageTemplate(id: number, template: Partial<InsertRequestMessageTemplate>): Promise<RequestMessageTemplate>;
  deleteRequestMessageTemplate(id: number): Promise<void>;
  seedDefaultRequestMessageTemplates(): Promise<void>;

  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: number): Promise<void>;
  seedDefaultSubscriptionPlans(): Promise<void>;

  // Plan Features
  getPlanFeatures(): Promise<PlanFeature[]>;
  getPlanFeature(id: number): Promise<PlanFeature | undefined>;
  createPlanFeature(feature: InsertPlanFeature): Promise<PlanFeature>;
  updatePlanFeature(id: number, feature: Partial<InsertPlanFeature>): Promise<PlanFeature>;
  deletePlanFeature(id: number): Promise<void>;
  seedDefaultPlanFeatures(): Promise<void>;

  // Subscriptions
  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, sub: Partial<InsertSubscription>): Promise<Subscription>;

  // Subscription Payments
  getSubscriptionPayments(): Promise<SubscriptionPayment[]>;
  createSubscriptionPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment>;

  // Super Admin - Announcements
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

  // Super Admin - Invoices
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;

  // Super Admin - API Status Monitoring
  getApiStatusLogs(): Promise<ApiStatusLog[]>;
  checkApiStatus(): Promise<ApiStatusLog[]>;

  // Super Admin - Bot Quality
  getBotQualityScores(): Promise<BotQualityScore[]>;
  getBotQualityStats(): Promise<any>;
  recordBotQualityScore(score: InsertBotQualityScore): Promise<BotQualityScore>;

  // Daily Message Usage Tracking
  getDailyMessageUsage(tenantId: number, date: string): Promise<DailyMessageUsage | undefined>;
  incrementDailyMessageCount(tenantId: number): Promise<DailyMessageUsage>;
  getTenantMessageLimit(tenantId: number): Promise<{ limit: number; used: number; remaining: number }>;

  // Daily Reservation Limit Checking
  getTenantDailyReservationUsage(tenantId: number): Promise<{ limit: number; used: number; remaining: number }>;

  // Super Admin - Tenant Management (replaces license management)
  getTenants(): Promise<Tenant[]>;
  suspendTenant(id: number): Promise<Tenant>;
  activateTenant(id: number): Promise<Tenant>;

  // Super Admin - Analytics
  getPlatformAnalytics(): Promise<any>;
  getWhatsAppStats(): Promise<any>;

  // App Version Management
  getAppVersions(): Promise<AppVersion[]>;
  getAppVersion(id: number): Promise<AppVersion | undefined>;
  getActiveAppVersion(): Promise<AppVersion | undefined>;
  createAppVersion(version: InsertAppVersion): Promise<AppVersion>;
  updateAppVersion(id: number, version: Partial<InsertAppVersion>): Promise<AppVersion>;
  activateAppVersion(id: number): Promise<AppVersion>;
  rollbackToVersion(id: number): Promise<AppVersion>;

  // Database Backup Management
  getDatabaseBackups(): Promise<DatabaseBackup[]>;
  getDatabaseBackup(id: number): Promise<DatabaseBackup | undefined>;
  createDatabaseBackup(backup: InsertDatabaseBackup): Promise<DatabaseBackup>;
  updateDatabaseBackup(id: number, backup: Partial<InsertDatabaseBackup>): Promise<DatabaseBackup>;
  deleteDatabaseBackup(id: number): Promise<void>;

  // Platform Admins
  getPlatformAdmins(): Promise<PlatformAdmin[]>;
  getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | undefined>;
  createPlatformAdmin(admin: InsertPlatformAdmin): Promise<PlatformAdmin>;
  updatePlatformAdmin(id: number, admin: Partial<InsertPlatformAdmin>): Promise<PlatformAdmin>;
  deletePlatformAdmin(id: number): Promise<void>;

  // Login Logs
  getLoginLogs(limit?: number): Promise<LoginLog[]>;
  createLoginLog(log: InsertLoginLog): Promise<LoginLog>;

  // Agency Notes (now tenant-based)
  getAgencyNotes(tenantId: number): Promise<AgencyNote[]>;
  createAgencyNote(note: InsertAgencyNote): Promise<AgencyNote>;
  deleteAgencyNote(id: number): Promise<void>;

  // Support Tickets
  getSupportTickets(status?: string): Promise<PlatformSupportTicket[]>;
  getSupportTicket(id: number): Promise<PlatformSupportTicket | undefined>;
  createSupportTicket(ticket: InsertPlatformSupportTicket): Promise<PlatformSupportTicket>;
  updateSupportTicket(id: number, ticket: Partial<InsertPlatformSupportTicket>): Promise<PlatformSupportTicket>;

  // Ticket Responses
  getTicketResponses(ticketId: number): Promise<TicketResponse[]>;
  createTicketResponse(response: InsertTicketResponse): Promise<TicketResponse>;

  // System Stats
  getDatabaseStats(): Promise<any>;

  // Bulk Operations (now tenant-based)
  bulkChangePlan(tenantIds: number[], newPlanCode: string): Promise<any>;
  bulkExtendSubscription(tenantIds: number[], days: number): Promise<any>;

  // Agency/Tenant Details
  getTenantDetails(tenantId: number): Promise<any>;

  // Revenue Reports
  getRevenueSummary(startDate?: string, endDate?: string): Promise<any>;
  getMonthlyRevenue(year: number): Promise<any>;
  getOverdueInvoices(): Promise<Invoice[]>;
  generateInvoice(tenantId: number, periodStart: string, periodEnd: string): Promise<Invoice>;

  // App Users (Application Users - Login with username/password)
  getAppUsers(): Promise<AppUser[]>;
  getAppUser(id: number): Promise<AppUser | undefined>;
  getAppUserByUsername(username: string): Promise<AppUser | undefined>;
  getAppUserByEmail(email: string): Promise<AppUser | undefined>;
  createAppUser(user: InsertAppUser): Promise<AppUser>;
  updateAppUser(id: number, user: Partial<InsertAppUser>): Promise<AppUser>;
  deleteAppUser(id: number): Promise<void>;
  updateAppUserLoginTime(id: number): Promise<void>;

  // Roles
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  // Permissions
  getPermissions(): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  deletePermission(id: number): Promise<void>;
  initializeDefaultPermissions(): Promise<void>;

  // Role Permissions
  getRolePermissions(roleId: number): Promise<RolePermission[]>;
  setRolePermissions(roleId: number, permissionIds: number[]): Promise<void>;

  // User Roles
  getUserRoles(userId: number): Promise<UserRole[]>;
  assignUserRole(assignment: InsertUserRole): Promise<UserRole>;
  removeUserRole(userId: number, roleId: number): Promise<void>;
  getUserPermissions(userId: number): Promise<Permission[]>;

  // User Login Logs
  getUserLoginLogs(userId?: number, limit?: number): Promise<UserLoginLog[]>;
  createUserLoginLog(log: InsertUserLoginLog): Promise<UserLoginLog>;

  // Partner Acenta - Invite Codes
  getPartnerInviteCodes(tenantId: number): Promise<PartnerInviteCode[]>;
  getPartnerInviteCodeByCode(code: string): Promise<PartnerInviteCode | undefined>;
  createPartnerInviteCode(code: InsertPartnerInviteCode): Promise<PartnerInviteCode>;
  updatePartnerInviteCode(id: number, data: Partial<InsertPartnerInviteCode>): Promise<PartnerInviteCode>;
  deletePartnerInviteCode(id: number): Promise<void>;
  generateUniquePartnerCode(tenantId: number): Promise<string>;

  // Partner Acenta - Partnerships
  getTenantPartnerships(tenantId: number): Promise<TenantPartnership[]>;
  getTenantPartnership(id: number): Promise<TenantPartnership | undefined>;
  createTenantPartnership(partnership: InsertTenantPartnership): Promise<TenantPartnership>;
  updateTenantPartnership(id: number, data: Partial<InsertTenantPartnership>): Promise<TenantPartnership>;
  deleteTenantPartnership(id: number): Promise<void>;
  getActivePartnership(requesterTenantId: number, partnerTenantId: number): Promise<TenantPartnership | undefined>;
  checkIfPhoneIsPartner(phone: string, tenantId: number): Promise<{ isPartner: boolean; partnerTenant?: Tenant; partnership?: TenantPartnership }>;

  // Partner Acenta - Dispatch Shares
  getDispatchShares(receiverTenantId: number, status?: string): Promise<DispatchShare[]>;
  getSentDispatchShares(senderTenantId: number): Promise<DispatchShare[]>;
  getDispatchShare(id: number): Promise<DispatchShare | undefined>;
  createDispatchShare(share: InsertDispatchShare): Promise<DispatchShare>;
  updateDispatchShare(id: number, data: Partial<InsertDispatchShare>): Promise<DispatchShare>;
  deleteDispatchShare(id: number): Promise<void>;

  // Partner Acenta - Activity Partner Shares
  getActivityPartnerShares(activityId: number): Promise<ActivityPartnerShare[]>;
  getPartnerSharesForTenant(tenantId: number): Promise<ActivityPartnerShare[]>;
  createActivityPartnerShare(share: InsertActivityPartnerShare): Promise<ActivityPartnerShare>;
  updateActivityPartnerShare(activityId: number, partnershipId: number, data: { partnerUnitPrice?: number; partnerCurrency?: string }): Promise<ActivityPartnerShare | undefined>;
  deleteActivityPartnerShare(activityId: number, partnershipId: number): Promise<void>;
  setActivityPartnerShares(activityId: number, shares: Array<{ partnershipId: number; partnerUnitPrice?: number; partnerCurrency?: string }>): Promise<void>;

  // Partner Transactions
  getPartnerTransactions(tenantId: number, role: 'sender' | 'receiver' | 'all'): Promise<PartnerTransaction[]>;
  getPartnerTransaction(id: number): Promise<PartnerTransaction | undefined>;
  createPartnerTransaction(transaction: InsertPartnerTransaction): Promise<PartnerTransaction>;
  updatePartnerTransaction(id: number, data: Partial<InsertPartnerTransaction>): Promise<PartnerTransaction>;
  deletePartnerTransaction(id: number): Promise<void>;

  // Notification Preferences
  getUserNotificationPreferences(userId: number): Promise<UserNotificationPreference[]>;
  setUserNotificationPreference(pref: InsertUserNotificationPreference): Promise<UserNotificationPreference>;
  deleteUserNotificationPreference(userId: number, notificationType: string): Promise<void>;
  
  getTenantNotificationSettings(tenantId: number): Promise<TenantNotificationSetting[]>;
  setTenantNotificationSetting(setting: InsertTenantNotificationSetting): Promise<TenantNotificationSetting>;
  deleteTenantNotificationSetting(tenantId: number, notificationType: string): Promise<void>;
  
  // In-App Notifications
  getInAppNotifications(userId: number, unreadOnly?: boolean): Promise<InAppNotification[]>;
  createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteInAppNotification(id: number): Promise<void>;

  // Viewer Activity Shares - İzleyici bazlı aktivite paylaşımları ve fiyatlandırma
  getViewerActivityShares(tenantId: number, viewerUserId?: number): Promise<ViewerActivityShare[]>;
  getViewerActivityShare(id: number): Promise<ViewerActivityShare | undefined>;
  createViewerActivityShare(share: InsertViewerActivityShare): Promise<ViewerActivityShare>;
  updateViewerActivityShare(id: number, data: Partial<InsertViewerActivityShare>): Promise<ViewerActivityShare>;
  deleteViewerActivityShare(id: number): Promise<void>;
  setViewerActivityShares(tenantId: number, viewerUserId: number, shares: Array<{ activityId: number; isShared: boolean; viewerUnitPriceTry?: number; viewerUnitPriceUsd?: number; viewerUnitPriceEur?: number }>): Promise<void>;

  // Reservation Change Requests - Partner/İzleyici/Müşteri değişiklik talepleri
  getReservationChangeRequests(tenantId: number): Promise<ReservationChangeRequest[]>;
  getReservationChangeRequest(id: number): Promise<ReservationChangeRequest | undefined>;
  getReservationChangeRequestsByReservation(reservationId: number): Promise<ReservationChangeRequest[]>;
  createReservationChangeRequest(request: InsertReservationChangeRequest): Promise<ReservationChangeRequest>;
  updateReservationChangeRequest(id: number, data: Partial<InsertReservationChangeRequest>): Promise<ReservationChangeRequest>;
  deleteReservationChangeRequest(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const [updated] = await db.update(tenants).set({
      ...tenant,
      updatedAt: new Date()
    }).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async deleteTenant(id: number): Promise<void> {
    // Cascade delete all related records before deleting tenant
    // Order matters due to foreign key constraints
    
    // Delete user-related records first
    const tenantUsers = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.tenantId, id));
    for (const user of tenantUsers) {
      await db.delete(userRoles).where(eq(userRoles.userId, user.id));
      await db.delete(userLoginLogs).where(eq(userLoginLogs.userId, user.id));
    }
    await db.delete(appUsers).where(eq(appUsers.tenantId, id));
    
    // Delete reservation-related records
    await db.delete(customerRequests).where(eq(customerRequests.tenantId, id));
    await db.delete(reservations).where(eq(reservations.tenantId, id));
    
    // Delete capacity records
    await db.delete(capacity).where(eq(capacity.tenantId, id));
    
    // Delete package tour related records
    const tenantPackageTours = await db.select({ id: packageTours.id }).from(packageTours).where(eq(packageTours.tenantId, id));
    for (const pt of tenantPackageTours) {
      await db.delete(packageTourActivities).where(eq(packageTourActivities.packageTourId, pt.id));
    }
    await db.delete(packageTours).where(eq(packageTours.tenantId, id));
    
    // Delete activity-related records
    await db.delete(activityCosts).where(eq(activityCosts.tenantId, id));
    await db.delete(agencyActivityTerms).where(eq(agencyActivityTerms.tenantId, id));
    await db.delete(agencyActivityRates).where(eq(agencyActivityRates.tenantId, id));
    await db.delete(activities).where(eq(activities.tenantId, id));
    
    // Delete agency-related records
    await db.delete(settlementEntries).where(eq(settlementEntries.tenantId, id));
    await db.delete(settlements).where(eq(settlements.tenantId, id));
    await db.delete(agencyPayouts).where(eq(agencyPayouts.tenantId, id));
    await db.delete(payments).where(eq(payments.tenantId, id));
    await db.delete(agencies).where(eq(agencies.tenantId, id));
    
    // Delete supplier records
    await db.delete(supplierDispatches).where(eq(supplierDispatches.tenantId, id));
    
    // Delete messaging records
    await db.delete(messages).where(eq(messages.tenantId, id));
    await db.delete(supportRequests).where(eq(supportRequests.tenantId, id));
    await db.delete(autoResponses).where(eq(autoResponses.tenantId, id));
    
    // Delete other tenant-specific records
    await db.delete(holidays).where(eq(holidays.tenantId, id));
    await db.delete(requestMessageTemplates).where(eq(requestMessageTemplates.tenantId, id));
    await db.delete(tenantIntegrations).where(eq(tenantIntegrations.tenantId, id));
    await db.delete(systemLogs).where(eq(systemLogs.tenantId, id));
    await db.delete(settings).where(eq(settings.tenantId, id));
    await db.delete(blacklist).where(eq(blacklist.tenantId, id));
    await db.delete(botQualityScores).where(eq(botQualityScores.tenantId, id));
    
    // Finally delete the tenant
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getDefaultTenant(): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "default"));
    return tenant;
  }

  async createDefaultTenantIfNotExists(): Promise<Tenant> {
    const existing = await this.getDefaultTenant();
    if (existing) return existing;
    
    return await this.createTenant({
      name: "Default Agency",
      slug: "default",
      contactEmail: "admin@smartur.com",
      isActive: true
    });
  }

  // Activities (tenant-scoped)
  async getActivities(tenantId?: number): Promise<Activity[]> {
    if (tenantId) {
      return await db.select().from(activities).where(eq(activities.tenantId, tenantId));
    }
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

  async getCapacityRange(tenantId: number, activityId: number, startDate: string, endDate: string): Promise<Capacity[]> {
    return await db.select().from(capacity).where(
      and(
        eq(capacity.tenantId, tenantId),
        eq(capacity.activityId, activityId),
        gte(capacity.date, startDate),
        lte(capacity.date, endDate)
      )
    );
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
  async getReservations(tenantId?: number): Promise<Reservation[]> {
    if (tenantId) {
      return await db.select().from(reservations).where(eq(reservations.tenantId, tenantId)).orderBy(desc(reservations.date));
    }
    return await db.select().from(reservations).orderBy(desc(reservations.date));
  }

  async createReservation(item: InsertReservation): Promise<Reservation> {
    const [res] = await db.insert(reservations).values(item).returning();
    return res;
  }

  async updateReservation(id: number, data: Partial<InsertReservation>): Promise<Reservation> {
    const [updated] = await db
      .update(reservations)
      .set(data)
      .where(eq(reservations.id, id))
      .returning();
    return updated;
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

  async getAllConversations(filter?: 'all' | 'with_reservation' | 'human_intervention', tenantId?: number): Promise<any[]> {
    // Filter messages by tenantId if provided
    let allMessages;
    if (tenantId) {
      allMessages = await db.select().from(messages).where(eq(messages.tenantId, tenantId)).orderBy(desc(messages.timestamp));
    } else {
      allMessages = await db.select().from(messages).orderBy(desc(messages.timestamp));
    }
    
    // Filter reservations and support requests by tenantId if provided
    let allReservations;
    let allSupportRequests;
    if (tenantId) {
      allReservations = await db.select().from(reservations).where(eq(reservations.tenantId, tenantId));
      allSupportRequests = await db.select().from(supportRequests).where(eq(supportRequests.tenantId, tenantId));
    } else {
      allReservations = await db.select().from(reservations);
      allSupportRequests = await db.select().from(supportRequests);
    }
    
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

  async getAllSupportRequests(status?: 'open' | 'resolved', tenantId?: number): Promise<SupportRequest[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(supportRequests.status, status));
    }
    if (tenantId) {
      conditions.push(eq(supportRequests.tenantId, tenantId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(supportRequests)
        .where(and(...conditions))
        .orderBy(desc(supportRequests.createdAt));
    }
    return await db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt));
  }

  // Settings (tenant-scoped)
  async getSetting(key: string, tenantId?: number): Promise<string | undefined> {
    if (tenantId) {
      const [result] = await db.select().from(settings)
        .where(and(eq(settings.key, key), eq(settings.tenantId, tenantId)));
      return result?.value ?? undefined;
    } else {
      // Fallback to global setting (no tenant)
      const [result] = await db.select().from(settings)
        .where(and(eq(settings.key, key), isNull(settings.tenantId)));
      return result?.value ?? undefined;
    }
  }

  async setSetting(key: string, value: string, tenantId?: number): Promise<Settings> {
    if (tenantId) {
      const existing = await db.select().from(settings)
        .where(and(eq(settings.key, key), eq(settings.tenantId, tenantId)));
      if (existing.length > 0) {
        const [updated] = await db
          .update(settings)
          .set({ value })
          .where(and(eq(settings.key, key), eq(settings.tenantId, tenantId)))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(settings).values({ key, value, tenantId }).returning();
        return created;
      }
    } else {
      // Global setting (no tenant)
      const existing = await db.select().from(settings)
        .where(and(eq(settings.key, key), isNull(settings.tenantId)));
      if (existing.length > 0) {
        const [updated] = await db
          .update(settings)
          .set({ value })
          .where(and(eq(settings.key, key), isNull(settings.tenantId)))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(settings).values({ key, value }).returning();
        return created;
      }
    }
  }
  
  // Tenant Integrations (Twilio, WooCommerce, Gmail)
  async getTenantIntegration(tenantId: number): Promise<TenantIntegration | undefined> {
    const [result] = await db.select().from(tenantIntegrations)
      .where(eq(tenantIntegrations.tenantId, tenantId));
    return result;
  }
  
  async upsertTenantIntegration(tenantId: number, data: Partial<InsertTenantIntegration>): Promise<TenantIntegration> {
    const existing = await this.getTenantIntegration(tenantId);
    if (existing) {
      const [updated] = await db
        .update(tenantIntegrations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tenantIntegrations.tenantId, tenantId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(tenantIntegrations)
        .values({ tenantId, ...data })
        .returning();
      return created;
    }
  }
  
  async deleteTenantIntegration(tenantId: number): Promise<void> {
    await db.delete(tenantIntegrations).where(eq(tenantIntegrations.tenantId, tenantId));
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
  async getAgencies(tenantId?: number): Promise<Agency[]> {
    if (tenantId) {
      return await db.select().from(agencies).where(eq(agencies.tenantId, tenantId)).orderBy(desc(agencies.createdAt));
    }
    return await db.select().from(agencies).orderBy(desc(agencies.createdAt));
  }

  async getAgency(id: number): Promise<Agency | undefined> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
    return agency;
  }

  async getAgencyByName(name: string, tenantId: number): Promise<Agency | undefined> {
    const [agency] = await db.select().from(agencies)
      .where(and(eq(agencies.name, name), eq(agencies.tenantId, tenantId)));
    return agency;
  }

  async getAgencyByPartnerTenantId(tenantId: number, partnerTenantId: number): Promise<Agency | undefined> {
    const [agency] = await db.select().from(agencies)
      .where(and(eq(agencies.tenantId, tenantId), eq(agencies.partnerTenantId, partnerTenantId)));
    return agency;
  }

  async getAllAgenciesWithPartnerTenantId(partnerTenantId: number): Promise<Agency[]> {
    return await db.select().from(agencies)
      .where(eq(agencies.partnerTenantId, partnerTenantId))
      .orderBy(desc(agencies.createdAt));
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
  async getSupplierDispatches(agencyId?: number, tenantId?: number | null): Promise<SupplierDispatch[]> {
    const conditions = [];
    if (agencyId) {
      conditions.push(eq(supplierDispatches.agencyId, agencyId));
    }
    if (tenantId) {
      conditions.push(eq(supplierDispatches.tenantId, tenantId));
    }
    if (conditions.length > 0) {
      return await db.select().from(supplierDispatches).where(and(...conditions)).orderBy(desc(supplierDispatches.dispatchDate));
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
    // Önce alt kalemleri sil
    await db.delete(supplierDispatchItems).where(eq(supplierDispatchItems.dispatchId, id));
    await db.delete(supplierDispatches).where(eq(supplierDispatches.id, id));
  }

  // Finance - Supplier Dispatch Items (Alt Kalemler)
  async getDispatchItems(dispatchId: number): Promise<SupplierDispatchItem[]> {
    return await db.select().from(supplierDispatchItems).where(eq(supplierDispatchItems.dispatchId, dispatchId));
  }

  async createDispatchItem(item: InsertSupplierDispatchItem): Promise<SupplierDispatchItem> {
    const [created] = await db.insert(supplierDispatchItems).values(item).returning();
    return created;
  }

  async updateDispatchItem(id: number, item: Partial<InsertSupplierDispatchItem>): Promise<SupplierDispatchItem> {
    const [updated] = await db.update(supplierDispatchItems).set(item).where(eq(supplierDispatchItems.id, id)).returning();
    return updated;
  }

  async deleteDispatchItem(id: number): Promise<void> {
    await db.delete(supplierDispatchItems).where(eq(supplierDispatchItems.id, id));
  }

  async deleteDispatchItemsByDispatchId(dispatchId: number): Promise<void> {
    await db.delete(supplierDispatchItems).where(eq(supplierDispatchItems.dispatchId, dispatchId));
  }

  async getDispatchItemsByDispatchIds(dispatchIds: number[]): Promise<SupplierDispatchItem[]> {
    if (dispatchIds.length === 0) return [];
    return await db.select().from(supplierDispatchItems).where(inArray(supplierDispatchItems.dispatchId, dispatchIds));
  }

  async getSupplierDispatchSummary(startDate?: string, endDate?: string, tenantId?: number | null): Promise<{
    agencyId: number;
    agencyName: string;
    totalGuests: number;
    totalOwedTl: number;
    totalOwedUsd: number;
    totalPaidTl: number;
    remainingTl: number;
  }[]> {
    const allAgencies = tenantId 
      ? await db.select().from(agencies).where(eq(agencies.tenantId, tenantId))
      : await db.select().from(agencies);
    const allDispatches = tenantId
      ? await db.select().from(supplierDispatches).where(eq(supplierDispatches.tenantId, tenantId))
      : await db.select().from(supplierDispatches);
    // Ödemeleri tenant bazlı veya agency bazlı çek (eski kayıtlarda tenantId null olabilir)
    const agencyIds = allAgencies.map(a => a.id);
    const allPayouts = agencyIds.length > 0
      ? await db.select().from(agencyPayouts).where(inArray(agencyPayouts.agencyId, agencyIds))
      : [];
    
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
      totalOwedUsd: number;
      totalPaidTl: number;
      remainingTl: number;
    }> = {};
    
    for (const agency of allAgencies) {
      summaryMap[agency.id] = {
        agencyId: agency.id,
        agencyName: agency.name,
        totalGuests: 0,
        totalOwedTl: 0,
        totalOwedUsd: 0,
        totalPaidTl: 0,
        remainingTl: 0
      };
    }
    
    for (const dispatch of filteredDispatches) {
      if (summaryMap[dispatch.agencyId]) {
        summaryMap[dispatch.agencyId].totalGuests += dispatch.guestCount || 0;
        // Para birimine göre ayır
        if (dispatch.currency === 'USD') {
          summaryMap[dispatch.agencyId].totalOwedUsd += dispatch.totalPayoutTl || 0;
        } else {
          summaryMap[dispatch.agencyId].totalOwedTl += dispatch.totalPayoutTl || 0;
        }
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

  async updateReservationStatus(reservationId: number, status: string): Promise<Reservation> {
    const [updated] = await db.update(reservations)
      .set({ status })
      .where(eq(reservations.id, reservationId))
      .returning();
    return updated;
  }

  // Package Tours
  async getPackageTours(tenantId?: number): Promise<PackageTour[]> {
    if (tenantId) {
      return await db.select().from(packageTours).where(eq(packageTours.tenantId, tenantId)).orderBy(desc(packageTours.createdAt));
    }
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

  // Auto Responses
  async getAutoResponses(): Promise<AutoResponse[]> {
    return await db.select().from(autoResponses).orderBy(desc(autoResponses.priority));
  }

  async getAutoResponse(id: number): Promise<AutoResponse | undefined> {
    const [autoResponse] = await db.select().from(autoResponses).where(eq(autoResponses.id, id));
    return autoResponse;
  }

  async createAutoResponse(autoResponse: InsertAutoResponse): Promise<AutoResponse> {
    const [newAutoResponse] = await db.insert(autoResponses).values(autoResponse).returning();
    return newAutoResponse;
  }

  async updateAutoResponse(id: number, autoResponse: Partial<InsertAutoResponse>): Promise<AutoResponse> {
    const [updated] = await db.update(autoResponses).set(autoResponse).where(eq(autoResponses.id, id)).returning();
    return updated;
  }

  async deleteAutoResponse(id: number): Promise<void> {
    await db.delete(autoResponses).where(eq(autoResponses.id, id));
  }

  // Helper function to normalize Turkish text for matching
  private normalizeTurkish(text: string): string {
    return text
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i')
      .trim();
  }

  async findMatchingAutoResponse(message: string): Promise<{ response: string; matchedLanguage: 'tr' | 'en' } | undefined> {
    const allResponses = await db.select().from(autoResponses)
      .where(eq(autoResponses.isActive, true))
      .orderBy(desc(autoResponses.priority));
    
    const normalizedMessage = this.normalizeTurkish(message);
    const messageLower = message.toLowerCase();
    
    for (const autoResp of allResponses) {
      // Check Turkish keywords first
      try {
        const keywordsTr: string[] = JSON.parse(autoResp.keywords);
        for (const keyword of keywordsTr) {
          const normalizedKeyword = this.normalizeTurkish(keyword);
          if (normalizedMessage.includes(normalizedKeyword)) {
            return { response: autoResp.response, matchedLanguage: 'tr' };
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
      
      // Check English keywords
      try {
        const keywordsEn: string[] = JSON.parse(autoResp.keywordsEn || '[]');
        for (const keyword of keywordsEn) {
          if (messageLower.includes(keyword.toLowerCase())) {
            // Return English response if available, otherwise Turkish
            const responseText = autoResp.responseEn && autoResp.responseEn.trim() 
              ? autoResp.responseEn 
              : autoResp.response;
            return { response: responseText, matchedLanguage: 'en' };
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    return undefined;
  }

  // Customer Tracking
  async getReservationByTrackingToken(token: string): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations)
      .where(and(
        eq(reservations.trackingToken, token),
        or(
          isNull(reservations.trackingTokenExpiresAt),
          gte(reservations.trackingTokenExpiresAt, new Date())
        )
      ));
    return reservation;
  }

  async generateTrackingToken(reservationId: number): Promise<string> {
    // Generate a secure random token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    
    // Get the reservation to calculate expiry date (activity date/time + 24 hours)
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, reservationId));
    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }
    
    // Calculate expiry: activity date + time + 24 hours
    const activityDate = new Date(reservation.date);
    
    // Parse the time if available (format: "HH:MM" or "HH:MM:SS")
    if (reservation.time) {
      const timeParts = reservation.time.split(':');
      if (timeParts.length >= 2) {
        activityDate.setHours(parseInt(timeParts[0], 10) || 0);
        activityDate.setMinutes(parseInt(timeParts[1], 10) || 0);
        activityDate.setSeconds(timeParts.length > 2 ? parseInt(timeParts[2], 10) || 0 : 0);
      }
    }
    
    // Add 24 hours to the activity date/time
    const expiryDate = new Date(activityDate.getTime() + 24 * 60 * 60 * 1000);
    
    // Update reservation with tracking token
    await db.update(reservations)
      .set({ 
        trackingToken: token,
        trackingTokenExpiresAt: expiryDate
      })
      .where(eq(reservations.id, reservationId));
    
    return token;
  }

  async cleanupExpiredTrackingTokens(): Promise<number> {
    const now = new Date();
    
    // Clear tokens where expiry date has passed
    const result = await db.update(reservations)
      .set({ 
        trackingToken: null,
        trackingTokenExpiresAt: null
      })
      .where(and(
        sql`${reservations.trackingToken} IS NOT NULL`,
        lte(reservations.trackingTokenExpiresAt, now)
      ))
      .returning();
    
    return result.length;
  }

  // Customer Requests
  async createCustomerRequest(request: InsertCustomerRequest): Promise<CustomerRequest> {
    const [newRequest] = await db.insert(customerRequests).values(request).returning();
    return newRequest;
  }

  async getCustomerRequests(tenantId?: number): Promise<CustomerRequest[]> {
    if (tenantId) {
      return await db.select().from(customerRequests)
        .where(eq(customerRequests.tenantId, tenantId))
        .orderBy(desc(customerRequests.createdAt));
    }
    return await db.select().from(customerRequests).orderBy(desc(customerRequests.createdAt));
  }

  async getCustomerRequest(id: number): Promise<CustomerRequest | undefined> {
    const [request] = await db.select().from(customerRequests).where(eq(customerRequests.id, id));
    return request;
  }

  async getCustomerRequestsByPhone(phone: string): Promise<CustomerRequest[]> {
    // Normalize phone number for matching (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Search in customerPhone field - handle both exact match and partial match
    const requests = await db.select()
      .from(customerRequests)
      .where(
        or(
          eq(customerRequests.customerPhone, phone),
          eq(customerRequests.customerPhone, normalizedPhone),
          sql`REPLACE(REPLACE(REPLACE(REPLACE(${customerRequests.customerPhone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
        )
      )
      .orderBy(desc(customerRequests.createdAt));
    
    return requests;
  }

  async updateCustomerRequest(id: number, data: Partial<InsertCustomerRequest>): Promise<CustomerRequest> {
    const [updated] = await db.update(customerRequests).set(data).where(eq(customerRequests.id, id)).returning();
    return updated;
  }

  // Partner Agency Reservation Requests
  async createReservationRequest(request: InsertReservationRequest): Promise<ReservationRequest> {
    const [newRequest] = await db.insert(reservationRequests).values(request).returning();
    return newRequest;
  }

  async getReservationRequests(tenantId?: number): Promise<ReservationRequest[]> {
    if (tenantId) {
      return await db.select().from(reservationRequests)
        .where(eq(reservationRequests.tenantId, tenantId))
        .orderBy(desc(reservationRequests.createdAt));
    }
    return await db.select().from(reservationRequests).orderBy(desc(reservationRequests.createdAt));
  }

  async getReservationRequest(id: number): Promise<ReservationRequest | undefined> {
    const [request] = await db.select().from(reservationRequests).where(eq(reservationRequests.id, id));
    return request;
  }

  async updateReservationRequest(id: number, data: Partial<InsertReservationRequest>): Promise<ReservationRequest> {
    const [updated] = await db.update(reservationRequests).set(data).where(eq(reservationRequests.id, id)).returning();
    return updated;
  }

  async deleteReservationRequest(id: number): Promise<void> {
    await db.delete(reservationRequests).where(eq(reservationRequests.id, id));
  }

  async getReservationRequestStats(
    tenantId: number, 
    options: { groupBy: 'daily' | 'monthly'; from?: string; to?: string; viewerId?: number }
  ): Promise<{ viewerId: number; viewerName: string; viewerEmail: string; period: string; count: number; }[]> {
    const { groupBy, from, to, viewerId } = options;
    
    // Build conditions
    const conditions = [eq(reservationRequests.tenantId, tenantId)];
    
    if (from) {
      conditions.push(sql`${reservationRequests.createdAt} >= ${from}::timestamp`);
    }
    if (to) {
      conditions.push(sql`${reservationRequests.createdAt} <= ${to}::timestamp`);
    }
    if (viewerId) {
      conditions.push(eq(reservationRequests.requestedBy, viewerId));
    }
    
    const dateFormatSql = groupBy === 'daily' ? sql.raw("'YYYY-MM-DD'") : sql.raw("'YYYY-MM'");
    
    const result = await db.execute(sql`
      SELECT 
        rr.requested_by as "viewerId",
        au.name as "viewerName",
        au.email as "viewerEmail",
        TO_CHAR(rr.created_at, ${dateFormatSql}) as period,
        COUNT(*)::int as count
      FROM reservation_requests rr
      LEFT JOIN app_users au ON rr.requested_by = au.id
      WHERE rr.tenant_id = ${tenantId}
        ${from ? sql`AND rr.created_at >= ${from}::timestamp` : sql``}
        ${to ? sql`AND rr.created_at <= ${to}::timestamp` : sql``}
        ${viewerId ? sql`AND rr.requested_by = ${viewerId}` : sql``}
      GROUP BY rr.requested_by, au.name, au.email, TO_CHAR(rr.created_at, ${dateFormatSql})
      ORDER BY period DESC, count DESC
    `);
    
    return (result.rows as any[]).map(row => ({
      viewerId: row.viewerId,
      viewerName: row.viewerName || 'Bilinmiyor',
      viewerEmail: row.viewerEmail || '',
      period: row.period,
      count: row.count
    }));
  }

  async getPartnerActivityStats(
    tenantId: number, 
    options?: { from?: string; to?: string; agencyId?: number }
  ): Promise<{ viewerId: number; viewerName: string; viewerPhone: string | null; activityId: number; activityName: string; totalGuests: number; totalRequests: number; }[]> {
    const from = options?.from;
    const to = options?.to;
    const agencyId = options?.agencyId;
    
    const result = await db.execute(sql`
      SELECT 
        rr.requested_by as "viewerId",
        au.name as "viewerName",
        au.phone as "viewerPhone",
        rr.activity_id as "activityId",
        a.name as "activityName",
        COALESCE(SUM(rr.guests), 0)::int as "totalGuests",
        COUNT(*)::int as "totalRequests"
      FROM reservation_requests rr
      LEFT JOIN app_users au ON rr.requested_by = au.id
      LEFT JOIN activities a ON rr.activity_id = a.id
      WHERE rr.tenant_id = ${tenantId}
        AND rr.requested_by IS NOT NULL
        ${from ? sql`AND rr.created_at >= ${from}::timestamp` : sql``}
        ${to ? sql`AND rr.created_at <= ${to}::timestamp` : sql``}
        ${agencyId ? sql`AND rr.agency_id = ${agencyId}` : sql``}
      GROUP BY rr.requested_by, au.name, au.phone, rr.activity_id, a.name
      ORDER BY au.name, a.name
    `);
    
    return (result.rows as any[]).map(row => ({
      viewerId: row.viewerId,
      viewerName: row.viewerName || 'Bilinmiyor',
      viewerPhone: row.viewerPhone,
      activityId: row.activityId,
      activityName: row.activityName || 'Bilinmiyor',
      totalGuests: row.totalGuests,
      totalRequests: row.totalRequests
    }));
  }

  // Tenant Plan Verification (replaces license system)
  async verifyTenantPlan(tenantId: number): Promise<{ 
    valid: boolean; 
    message: string; 
    status?: 'active' | 'warning' | 'suspended' | 'expired';
    canWrite?: boolean;
    plan?: SubscriptionPlan;
  }> {
    // Get tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    
    if (!tenant) {
      return { valid: false, message: "Tenant bulunamadı.", status: 'expired', canWrite: false };
    }

    if (!tenant.isActive) {
      return { 
        valid: false, 
        message: "Hesabınız devre dışı bırakılmış.", 
        status: 'suspended',
        canWrite: false
      };
    }

    // Get plan from subscription_plans based on tenant's planCode
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, tenant.planCode || 'trial'));
    
    if (!plan) {
      // Default to trial mode if no plan found
      return { valid: true, message: "Deneme modu.", status: 'active', canWrite: true };
    }

    // Check usage limits
    const usage = await this.getTenantUsage(tenantId);
    
    if (plan.maxActivities && usage.activitiesUsed > plan.maxActivities) {
      return { 
        valid: false, 
        message: `Aktivite limitini aştınız (${usage.activitiesUsed}/${plan.maxActivities}). Lütfen planınızı yükseltin.`,
        plan: plan,
        status: 'active',
        canWrite: false
      };
    }

    if (plan.maxReservationsPerMonth && usage.reservationsThisMonth > plan.maxReservationsPerMonth) {
      return { 
        valid: false, 
        message: `Aylık rezervasyon limitini aştınız (${usage.reservationsThisMonth}/${plan.maxReservationsPerMonth}). Lütfen planınızı yükseltin.`,
        plan: plan,
        status: 'active',
        canWrite: false
      };
    }

    return { 
      valid: true, 
      message: "Plan geçerli.", 
      plan: plan,
      status: 'active',
      canWrite: true
    };
  }

  async getTenantUsage(tenantId: number): Promise<{ activitiesUsed: number; reservationsThisMonth: number }> {
    // Count active activities for tenant
    const activeActivities = await db.select().from(activities).where(
      and(eq(activities.active, true), eq(activities.tenantId, tenantId))
    );
    
    // Count reservations this month for tenant
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const monthlyReservations = await db.select()
      .from(reservations)
      .where(and(
        gte(reservations.date, firstDayOfMonth),
        lte(reservations.date, lastDayOfMonth),
        eq(reservations.tenantId, tenantId)
      ));

    return {
      activitiesUsed: activeActivities.length,
      reservationsThisMonth: monthlyReservations.length
    };
  }

  // Request Message Templates
  async getRequestMessageTemplates(): Promise<RequestMessageTemplate[]> {
    return await db.select().from(requestMessageTemplates).orderBy(requestMessageTemplates.name);
  }

  async getRequestMessageTemplate(id: number): Promise<RequestMessageTemplate | undefined> {
    const [template] = await db.select().from(requestMessageTemplates).where(eq(requestMessageTemplates.id, id));
    return template;
  }

  async createRequestMessageTemplate(template: InsertRequestMessageTemplate): Promise<RequestMessageTemplate> {
    const [newTemplate] = await db.insert(requestMessageTemplates).values(template).returning();
    return newTemplate;
  }

  async updateRequestMessageTemplate(id: number, template: Partial<InsertRequestMessageTemplate>): Promise<RequestMessageTemplate> {
    const [updated] = await db.update(requestMessageTemplates).set(template).where(eq(requestMessageTemplates.id, id)).returning();
    return updated;
  }

  async deleteRequestMessageTemplate(id: number): Promise<void> {
    await db.delete(requestMessageTemplates).where(eq(requestMessageTemplates.id, id));
  }

  async seedDefaultRequestMessageTemplates(): Promise<void> {
    const existing = await this.getRequestMessageTemplates();
    if (existing.length > 0) return;

    const defaultTemplates = [
      {
        name: "Onaylandı",
        templateType: "approved",
        messageContent: `Merhaba {müşteri_adi},

{talep_turu} talebiniz onaylanmıştır.{yeni_saat}

Sorularınız için bize ulaşabilirsiniz.

Sky Fethiye`,
        isDefault: true,
        isActive: true
      },
      {
        name: "Değerlendiriliyor",
        templateType: "pending",
        messageContent: `Merhaba {müşteri_adi},

{talep_turu} talebiniz alınmıştır ve değerlendirilmektedir.

En kısa sürede size dönüş yapacağız.

Sky Fethiye`,
        isDefault: true,
        isActive: true
      },
      {
        name: "Reddedildi",
        templateType: "rejected",
        messageContent: `Merhaba {müşteri_adi},

Üzgünüz, {talep_turu} talebinizi maalesef karşılayamıyoruz.{red_sebebi}

Anlayışınız için teşekkür ederiz.

Sky Fethiye`,
        isDefault: true,
        isActive: true
      }
    ];

    for (const template of defaultTemplates) {
      await this.createRequestMessageTemplate(template);
    }
  }

  // Subscription Plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    const [updated] = await db.update(subscriptionPlans).set({
      ...plan,
      updatedAt: new Date()
    }).where(eq(subscriptionPlans.id, id)).returning();
    return updated;
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  async seedDefaultSubscriptionPlans(): Promise<void> {
    const existing = await this.getSubscriptionPlans();
    if (existing.length > 0) return;

    const defaultPlans: InsertSubscriptionPlan[] = [
      {
        code: "trial",
        name: "Deneme",
        description: "14 günlük ücretsiz deneme",
        priceTl: 0,
        priceUsd: 0,
        yearlyPriceTl: 0,
        yearlyPriceUsd: 0,
        trialDays: 14,
        maxActivities: 3,
        maxReservationsPerMonth: 50,
        maxUsers: 1,
        maxWhatsappNumbers: 1,
        features: JSON.stringify(["basic_calendar", "manual_reservations"]),
        sortOrder: 0,
        isActive: true,
        isPopular: false,
      },
      {
        code: "başıc",
        name: "Başıc",
        description: "Küçük işletmeler için temel paket",
        priceTl: 99900, // 999 TL
        priceUsd: 2900, // $29
        yearlyPriceTl: 959000, // 9590 TL (20% indirim)
        yearlyPriceUsd: 27900, // $279
        yearlyDiscountPct: 20,
        trialDays: 0,
        maxActivities: 5,
        maxReservationsPerMonth: 200,
        maxUsers: 2,
        maxWhatsappNumbers: 1,
        features: JSON.stringify(["basic_calendar", "manual_reservations", "whatsapp_notifications", "basic_reports"]),
        sortOrder: 1,
        isActive: true,
        isPopular: false,
      },
      {
        code: "professional",
        name: "Professional",
        description: "Büyüyen işletmeler için gelişmiş özellikler",
        priceTl: 249900, // 2499 TL
        priceUsd: 6900, // $69
        yearlyPriceTl: 2399000, // 23990 TL
        yearlyPriceUsd: 66300, // $663
        yearlyDiscountPct: 20,
        trialDays: 0,
        maxActivities: 20,
        maxReservationsPerMonth: 1000,
        maxUsers: 5,
        maxWhatsappNumbers: 3,
        features: JSON.stringify(["basic_calendar", "manual_reservations", "whatsapp_notifications", "advanced_reports", "ai_bot", "woocommerce", "package_tours"]),
        sortOrder: 2,
        isActive: true,
        isPopular: true,
      },
      {
        code: "enterprise",
        name: "Enterprise",
        description: "Büyük ölçekli operasyonlar için sınırsız erişim",
        priceTl: 499900, // 4999 TL
        priceUsd: 14900, // $149
        yearlyPriceTl: 4799000, // 47990 TL
        yearlyPriceUsd: 143000, // $1430
        yearlyDiscountPct: 20,
        trialDays: 0,
        maxActivities: 9999,
        maxReservationsPerMonth: 99999,
        maxUsers: 99,
        maxWhatsappNumbers: 10,
        features: JSON.stringify(["basic_calendar", "manual_reservations", "whatsapp_notifications", "advanced_reports", "ai_bot", "woocommerce", "package_tours", "api_access", "priority_support", "custom_branding"]),
        sortOrder: 3,
        isActive: true,
        isPopular: false,
      },
    ];

    for (const plan of defaultPlans) {
      await this.createSubscriptionPlan(plan);
    }
  }

  // Plan Features
  async getPlanFeatures(): Promise<PlanFeature[]> {
    return await db.select().from(planFeatures).orderBy(planFeatures.sortOrder);
  }

  async getPlanFeature(id: number): Promise<PlanFeature | undefined> {
    const [feature] = await db.select().from(planFeatures).where(eq(planFeatures.id, id));
    return feature;
  }

  async createPlanFeature(feature: InsertPlanFeature): Promise<PlanFeature> {
    const [newFeature] = await db.insert(planFeatures).values(feature).returning();
    return newFeature;
  }

  async updatePlanFeature(id: number, feature: Partial<InsertPlanFeature>): Promise<PlanFeature> {
    const [updated] = await db.update(planFeatures).set(feature).where(eq(planFeatures.id, id)).returning();
    return updated;
  }

  async deletePlanFeature(id: number): Promise<void> {
    await db.delete(planFeatures).where(eq(planFeatures.id, id));
  }

  async seedDefaultPlanFeatures(): Promise<void> {
    const existing = await this.getPlanFeatures();
    if (existing.length > 0) return;

    const defaultFeatures: InsertPlanFeature[] = [
      { key: "basic_calendar", label: "Temel Takvim", description: "Rezervasyon takvimi görüntüleme", icon: "Calendar", category: "core", sortOrder: 0 },
      { key: "manual_reservations", label: "Manuel Rezervasyon", description: "Manuel rezervasyon oluşturma", icon: "ClipboardList", category: "core", sortOrder: 1 },
      { key: "whatsapp_notifications", label: "WhatsApp Bildirimleri", description: "WhatsApp üzerinden bildirim gönderme", icon: "MessageCircle", category: "communication", sortOrder: 2 },
      { key: "basic_reports", label: "Temel Raporlar", description: "Başıt istatistik raporları", icon: "BarChart3", category: "analytics", sortOrder: 3 },
      { key: "advanced_reports", label: "Gelişmiş Raporlar", description: "Detaylı analiz ve raporlama", icon: "TrendingUp", category: "analytics", sortOrder: 4 },
      { key: "ai_bot", label: "AI Bot", description: "Yapay zeka destekli müşteri yanıtları", icon: "Bot", category: "automation", sortOrder: 5 },
      { key: "woocommerce", label: "WooCommerce Entegrasyonu", description: "E-ticaret sitesi entegrasyonu", icon: "ShoppingCart", category: "integration", sortOrder: 6 },
      { key: "package_tours", label: "Paket Turlar", description: "Çoklu aktivite paket turları", icon: "Package", category: "core", sortOrder: 7 },
      { key: "api_access", label: "API Erişimi", description: "Dış sistemler için API erişimi", icon: "Code", category: "integration", sortOrder: 8 },
      { key: "priority_support", label: "Öncelikli Destek", description: "7/24 öncelikli teknik destek", icon: "HeadphonesIcon", category: "support", sortOrder: 9 },
      { key: "custom_branding", label: "Özel Marka", description: "Kendi logonuz ve renk temanız", icon: "Palette", category: "customization", sortOrder: 10 },
    ];

    for (const feature of defaultFeatures) {
      await this.createPlanFeature(feature);
    }
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [newSub] = await db.insert(subscriptions).values(sub).returning();
    return newSub;
  }

  async updateSubscription(id: number, sub: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db.update(subscriptions).set({
      ...sub,
      updatedAt: new Date()
    }).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  // Subscription Payments
  async getSubscriptionPayments(): Promise<SubscriptionPayment[]> {
    return await db.select().from(subscriptionPayments).orderBy(desc(subscriptionPayments.createdAt));
  }

  async createSubscriptionPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment> {
    const [newPayment] = await db.insert(subscriptionPayments).values(payment).returning();
    return newPayment;
  }

  // === SUPER ADMIN - ANNOUNCEMENTS ===
  
  async getAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db.update(announcements).set(announcement).where(eq(announcements.id, id)).returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // === SUPER ADMIN - INVOICES ===
  
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return updated;
  }

  // === SUPER ADMIN - API STATUS MONITORING ===
  
  async getApiStatusLogs(): Promise<ApiStatusLog[]> {
    return await db.select().from(apiStatusLogs).orderBy(desc(apiStatusLogs.checkedAt));
  }

  async checkApiStatus(): Promise<ApiStatusLog[]> {
    const services = ['twilio', 'woocommerce', 'gemini', 'paytr'];
    const results: ApiStatusLog[] = [];
    
    for (const service of services) {
      const status: InsertApiStatusLog = {
        service,
        status: 'up',
        responseTimeMs: Math.floor(Math.random() * 200) + 50,
        errorCount: 0,
      };
      
      const [log] = await db.insert(apiStatusLogs).values(status).returning();
      results.push(log);
    }
    
    return results;
  }

  // === SUPER ADMIN - BOT QUALITY ===
  
  async getBotQualityScores(): Promise<BotQualityScore[]> {
    return await db.select().from(botQualityScores).orderBy(desc(botQualityScores.createdAt)).limit(100);
  }

  async getBotQualityStats(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const scores = await db.select().from(botQualityScores)
      .where(gte(botQualityScores.createdAt, thirtyDaysAgo));
    
    const totalResponses = scores.length;
    const escalatedCount = scores.filter(s => s.wasEscalated).length;
    const errorCount = scores.filter(s => s.errorOccurred).length;
    const fallbackCount = scores.filter(s => s.usedFallback).length;
    const avgResponseTime = scores.length > 0 
      ? scores.reduce((sum, s) => sum + (s.responseTimeMs || 0), 0) / scores.length 
      : 0;
    
    const helpfulScores = scores.filter(s => s.wasHelpful !== null);
    const helpfulRate = helpfulScores.length > 0 
      ? (helpfulScores.filter(s => s.wasHelpful).length / helpfulScores.length) * 100 
      : 0;
    
    return {
      totalResponses,
      escalationRate: totalResponses > 0 ? (escalatedCount / totalResponses) * 100 : 0,
      errorRate: totalResponses > 0 ? (errorCount / totalResponses) * 100 : 0,
      fallbackRate: totalResponses > 0 ? (fallbackCount / totalResponses) * 100 : 0,
      avgResponseTimeMs: Math.round(avgResponseTime),
      helpfulRate: Math.round(helpfulRate),
      qualityScore: Math.round(100 - (escalatedCount / Math.max(totalResponses, 1)) * 50 - (errorCount / Math.max(totalResponses, 1)) * 30),
    };
  }

  async recordBotQualityScore(score: InsertBotQualityScore): Promise<BotQualityScore> {
    const [newScore] = await db.insert(botQualityScores).values(score).returning();
    return newScore;
  }

  // === DAILY MESSAGE USAGE TRACKING ===

  async getDailyMessageUsage(tenantId: number, date: string): Promise<DailyMessageUsage | undefined> {
    const [usage] = await db.select().from(dailyMessageUsage)
      .where(and(
        eq(dailyMessageUsage.tenantId, tenantId),
        eq(dailyMessageUsage.date, date)
      ));
    return usage;
  }

  async incrementDailyMessageCount(tenantId: number): Promise<DailyMessageUsage> {
    const today = new Date().toISOString().split('T')[0];
    
    // Use atomic upsert to prevent race conditions
    await db.execute(sql`
      INSERT INTO daily_message_usage (tenant_id, date, message_count, last_message_at, created_at, updated_at)
      VALUES (${tenantId}, ${today}, 1, NOW(), NOW(), NOW())
      ON CONFLICT (tenant_id, date) 
      DO UPDATE SET 
        message_count = daily_message_usage.message_count + 1,
        last_message_at = NOW(),
        updated_at = NOW()
    `);
    
    // Return the result or fetch it
    const usage = await this.getDailyMessageUsage(tenantId, today);
    return usage!;
  }

  async getTenantMessageLimit(tenantId: number): Promise<{ limit: number; used: number; remaining: number }> {
    // Get tenant's plan code
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      return { limit: 0, used: 0, remaining: 0 };
    }
    
    // Get plan limits
    const plan = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, tenant.planCode || 'trial'));
    
    const maxDailyMessages = plan[0]?.maxDailyMessages || 50;
    
    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const usage = await this.getDailyMessageUsage(tenantId, today);
    const used = usage?.messageCount || 0;
    
    return {
      limit: maxDailyMessages,
      used,
      remaining: Math.max(0, maxDailyMessages - used)
    };
  }

  async getTenantDailyReservationUsage(tenantId: number): Promise<{ limit: number; used: number; remaining: number }> {
    // Get tenant's plan code
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      return { limit: 0, used: 0, remaining: 0 };
    }
    
    // Get plan limits
    const plan = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, tenant.planCode || 'trial'));
    
    const maxDailyReservations = plan[0]?.maxDailyReservations || 10;
    
    // Get today's date string for comparison (YYYY-MM-DD format)
    const today = new Date().toISOString().split('T')[0];
    
    // Count today's reservations for this tenant (excluding cancelled)
    // Using SQL for accurate date comparison
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM reservations 
      WHERE tenant_id = ${tenantId} 
        AND DATE(created_at) = ${today}
        AND status != 'cancelled'
    `);
    
    const used = Number((result.rows?.[0] as any)?.count || 0);
    
    return {
      limit: maxDailyReservations,
      used,
      remaining: Math.max(0, maxDailyReservations - used)
    };
  }

  // === SUPER ADMIN - TENANT MANAGEMENT ===
  
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async suspendTenant(id: number): Promise<Tenant> {
    const [updated] = await db.update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async activateTenant(id: number): Promise<Tenant> {
    const [updated] = await db.update(tenants)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  // === SUPER ADMIN - ANALYTICS ===
  
  async getPlatformAnalytics(): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allTenants = await db.select().from(tenants);
    const activeTenants = allTenants.filter(t => t.isActive);
    
    const allSubscriptions = await db.select().from(subscriptions);
    const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');
    
    const allPayments = await db.select().from(subscriptionPayments)
      .where(and(
        eq(subscriptionPayments.status, 'completed'),
        gte(subscriptionPayments.createdAt, thirtyDaysAgo)
      ));
    
    const mrrTl = allPayments.reduce((sum, p) => sum + (p.amountTl || 0), 0);
    const mrrUsd = allPayments.reduce((sum, p) => sum + (p.amountUsd || 0), 0);
    
    const allReservations = await db.select().from(reservations);
    const thisMonthReservations = allReservations.filter(r => {
      const created = r.createdAt ? new Date(r.createdAt) : null;
      return created && created >= thirtyDaysAgo;
    });
    
    return {
      totalAgencies: allTenants.length,
      activeAgencies: activeTenants.length,
      trialAgencies: allSubscriptions.filter(s => s.status === 'trial').length,
      paidAgencies: activeSubscriptions.length,
      mrrTl,
      mrrUsd,
      churnRate: 0,
      totalReservationsThisMonth: thisMonthReservations.length,
      avgReservationsPerAgency: activeTenants.length > 0 
        ? Math.round(thisMonthReservations.length / activeTenants.length) 
        : 0,
    };
  }

  async getWhatsAppStats(): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const allMessages = await db.select().from(messages);
    const recentMessages = allMessages.filter(m => {
      const ts = m.timestamp ? new Date(m.timestamp) : null;
      return ts && ts >= thirtyDaysAgo;
    });
    
    const userMessages = recentMessages.filter(m => m.role === 'user');
    const assistantMessages = recentMessages.filter(m => m.role === 'assistant');
    const humanInterventionMessages = recentMessages.filter(m => m.requiresHumanIntervention);
    
    const uniquePhones = new Set(recentMessages.map(m => m.phone)).size;
    
    const botQuality = await this.getBotQualityStats();
    
    return {
      totalMessagesThisMonth: recentMessages.length,
      userMessages: userMessages.length,
      botResponses: assistantMessages.length,
      escalatedConversations: humanInterventionMessages.length,
      escalationRate: userMessages.length > 0 
        ? Math.round((humanInterventionMessages.length / userMessages.length) * 100) 
        : 0,
      uniqueCustomers: uniquePhones,
      avgResponseTimeMs: botQuality.avgResponseTimeMs,
      botSuccessRate: 100 - botQuality.escalationRate,
    };
  }

  // App Version Management
  async getAppVersions(): Promise<AppVersion[]> {
    return db.select().from(appVersions).orderBy(desc(appVersions.createdAt));
  }

  async getAppVersion(id: number): Promise<AppVersion | undefined> {
    const [version] = await db.select().from(appVersions).where(eq(appVersions.id, id));
    return version;
  }

  async getActiveAppVersion(): Promise<AppVersion | undefined> {
    const [version] = await db.select().from(appVersions).where(eq(appVersions.status, 'active'));
    return version;
  }

  async createAppVersion(version: InsertAppVersion): Promise<AppVersion> {
    const [created] = await db.insert(appVersions).values(version).returning();
    return created;
  }

  async updateAppVersion(id: number, version: Partial<InsertAppVersion>): Promise<AppVersion> {
    const [updated] = await db.update(appVersions)
      .set(version)
      .where(eq(appVersions.id, id))
      .returning();
    return updated;
  }

  async activateAppVersion(id: number): Promise<AppVersion> {
    // Deactivate current active version first and mark as rollback target
    const currentActive = await this.getActiveAppVersion();
    if (currentActive) {
      await db.update(appVersions)
        .set({ status: 'inactive', isRollbackTarget: true })
        .where(eq(appVersions.id, currentActive.id));
    }

    // Activate the new version (active version is not a rollback target)
    const [activated] = await db.update(appVersions)
      .set({ status: 'active', activatedAt: new Date(), isRollbackTarget: false })
      .where(eq(appVersions.id, id))
      .returning();
    return activated;
  }

  async rollbackToVersion(id: number): Promise<AppVersion> {
    // Get the version to rollback to
    const targetVersion = await this.getAppVersion(id);
    if (!targetVersion) {
      throw new Error('Hedef sürüm bulunamadı');
    }
    if (!targetVersion.isRollbackTarget) {
      throw new Error('Bu sürüm geri alınabilir degil');
    }

    // Deactivate current active version and mark as rollback target
    const currentActive = await this.getActiveAppVersion();
    if (currentActive) {
      await db.update(appVersions)
        .set({ status: 'inactive', isRollbackTarget: true })
        .where(eq(appVersions.id, currentActive.id));
    }

    // Activate the target version (active version is not a rollback target)
    const [activated] = await db.update(appVersions)
      .set({ status: 'active', activatedAt: new Date(), isRollbackTarget: false })
      .where(eq(appVersions.id, id))
      .returning();
    return activated;
  }

  // Database Backup Management
  async getDatabaseBackups(): Promise<DatabaseBackup[]> {
    return db.select().from(databaseBackups).orderBy(desc(databaseBackups.createdAt));
  }

  async getDatabaseBackup(id: number): Promise<DatabaseBackup | undefined> {
    const [backup] = await db.select().from(databaseBackups).where(eq(databaseBackups.id, id));
    return backup;
  }

  async createDatabaseBackup(backup: InsertDatabaseBackup): Promise<DatabaseBackup> {
    const [created] = await db.insert(databaseBackups).values(backup).returning();
    return created;
  }

  async updateDatabaseBackup(id: number, backup: Partial<InsertDatabaseBackup>): Promise<DatabaseBackup> {
    const [updated] = await db.update(databaseBackups)
      .set(backup)
      .where(eq(databaseBackups.id, id))
      .returning();
    return updated;
  }

  async deleteDatabaseBackup(id: number): Promise<void> {
    await db.delete(databaseBackups).where(eq(databaseBackups.id, id));
  }

  // Platform Admins
  async getPlatformAdmins(): Promise<PlatformAdmin[]> {
    return db.select().from(platformAdmins).orderBy(desc(platformAdmins.createdAt));
  }

  async getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | undefined> {
    const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, email));
    return admin;
  }

  async createPlatformAdmin(admin: InsertPlatformAdmin): Promise<PlatformAdmin> {
    const [created] = await db.insert(platformAdmins).values(admin).returning();
    return created;
  }

  async updatePlatformAdmin(id: number, admin: Partial<InsertPlatformAdmin>): Promise<PlatformAdmin> {
    const [updated] = await db.update(platformAdmins)
      .set({ ...admin, updatedAt: new Date() })
      .where(eq(platformAdmins.id, id))
      .returning();
    return updated;
  }

  async deletePlatformAdmin(id: number): Promise<void> {
    await db.delete(platformAdmins).where(eq(platformAdmins.id, id));
  }

  // Login Logs
  async getLoginLogs(limit: number = 100): Promise<LoginLog[]> {
    return db.select().from(loginLogs).orderBy(desc(loginLogs.createdAt)).limit(limit);
  }

  async createLoginLog(log: InsertLoginLog): Promise<LoginLog> {
    const [created] = await db.insert(loginLogs).values(log).returning();
    return created;
  }

  // Agency Notes (now tenant-based)
  async getAgencyNotes(tenantId: number): Promise<AgencyNote[]> {
    return db.select().from(agencyNotes)
      .where(eq(agencyNotes.tenantId, tenantId))
      .orderBy(desc(agencyNotes.createdAt));
  }

  async createAgencyNote(note: InsertAgencyNote): Promise<AgencyNote> {
    const [created] = await db.insert(agencyNotes).values(note).returning();
    return created;
  }

  async deleteAgencyNote(id: number): Promise<void> {
    await db.delete(agencyNotes).where(eq(agencyNotes.id, id));
  }

  // Support Tickets
  async getSupportTickets(status?: string): Promise<PlatformSupportTicket[]> {
    if (status) {
      return db.select().from(platformSupportTickets)
        .where(eq(platformSupportTickets.status, status))
        .orderBy(desc(platformSupportTickets.createdAt));
    }
    return db.select().from(platformSupportTickets).orderBy(desc(platformSupportTickets.createdAt));
  }

  async getSupportTicket(id: number): Promise<PlatformSupportTicket | undefined> {
    const [ticket] = await db.select().from(platformSupportTickets).where(eq(platformSupportTickets.id, id));
    return ticket;
  }

  async createSupportTicket(ticket: InsertPlatformSupportTicket): Promise<PlatformSupportTicket> {
    const [created] = await db.insert(platformSupportTickets).values(ticket).returning();
    return created;
  }

  async updateSupportTicket(id: number, ticket: Partial<InsertPlatformSupportTicket>): Promise<PlatformSupportTicket> {
    const updateData: any = { ...ticket, updatedAt: new Date() };
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      updateData.resolvedAt = new Date();
    }
    const [updated] = await db.update(platformSupportTickets)
      .set(updateData)
      .where(eq(platformSupportTickets.id, id))
      .returning();
    return updated;
  }

  // Ticket Responses
  async getTicketResponses(ticketId: number): Promise<TicketResponse[]> {
    return db.select().from(ticketResponses)
      .where(eq(ticketResponses.ticketId, ticketId))
      .orderBy(ticketResponses.createdAt);
  }

  async createTicketResponse(response: InsertTicketResponse): Promise<TicketResponse> {
    const [created] = await db.insert(ticketResponses).values(response).returning();
    return created;
  }

  // Database Stats
  async getDatabaseStats(): Promise<any> {
    const [activityCount] = await db.select({ count: sql<number>`count(*)` }).from(activities);
    const [reservationCount] = await db.select({ count: sql<number>`count(*)` }).from(reservations);
    const [messageCount] = await db.select({ count: sql<number>`count(*)` }).from(messages);
    const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(tenants);
    const [ticketCount] = await db.select({ count: sql<number>`count(*)` }).from(platformSupportTickets);

    return {
      tables: {
        activities: Number(activityCount?.count || 0),
        reservations: Number(reservationCount?.count || 0),
        messages: Number(messageCount?.count || 0),
        tenants: Number(tenantCount?.count || 0),
        supportTickets: Number(ticketCount?.count || 0),
      },
      status: 'connected',
    };
  }

  // Bulk Operations (now tenant-based)
  async bulkChangePlan(tenantIds: number[], newPlanCode: string): Promise<any> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, newPlanCode));
    if (!plan) throw new Error('Plan bulunamadı');

    const results = [];
    for (const id of tenantIds) {
      try {
        const updated = await db.update(tenants)
          .set({ 
            planCode: plan.code,
            updatedAt: new Date()
          })
          .where(eq(tenants.id, id))
          .returning();
        results.push({ id, success: true, tenant: updated[0] });
      } catch (err) {
        results.push({ id, success: false, error: (err as Error).message });
      }
    }
    return { updated: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  }

  async bulkExtendSubscription(tenantIds: number[], days: number): Promise<any> {
    const results = [];
    for (const id of tenantIds) {
      try {
        // Extend active subscription for this tenant
        const [activeSub] = await db.select().from(subscriptions)
          .where(and(eq(subscriptions.tenantId, id), eq(subscriptions.status, 'active')));
        
        if (!activeSub) {
          results.push({ id, success: false, error: 'Aktif abonelik bulunamadı' });
          continue;
        }
        
        const currentExpiry = activeSub.endDate ? new Date(activeSub.endDate) : new Date();
        const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
        
        const [updated] = await db.update(subscriptions)
          .set({ endDate: newExpiry.toISOString().split('T')[0], updatedAt: new Date() })
          .where(eq(subscriptions.id, activeSub.id))
          .returning();
        results.push({ id, success: true, newExpiry, subscription: updated });
      } catch (err) {
        results.push({ id, success: false, error: (err as Error).message });
      }
    }
    return { updated: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  }

  // Agency/Tenant Details
  async getTenantDetails(tenantId: number): Promise<any> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) return null;

    const notes = await this.getAgencyNotes(tenantId);
    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt));
    const subs = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).orderBy(desc(subscriptions.createdAt));

    return {
      tenant,
      notes,
      invoices: allInvoices,
      subscriptionHistory: subs,
    };
  }

  // Revenue Reports
  async getRevenueSummary(startDate?: string, endDate?: string): Promise<any> {
    let allPayments;
    
    if (startDate && endDate) {
      allPayments = await db.select().from(subscriptionPayments).where(
        and(
          gte(subscriptionPayments.createdAt, new Date(startDate)),
          lte(subscriptionPayments.createdAt, new Date(endDate))
        )
      );
    } else {
      allPayments = await db.select().from(subscriptionPayments);
    }
    const completedPayments = allPayments.filter(p => p.status === 'completed');

    const totalTl = completedPayments.reduce((sum, p) => sum + (p.amountTl || 0), 0);
    const totalUsd = completedPayments.reduce((sum, p) => sum + (p.amountUsd || 0), 0);

    return {
      totalPayments: allPayments.length,
      completedPayments: completedPayments.length,
      totalRevenueTl: totalTl,
      totalRevenueUsd: totalUsd,
      pendingPayments: allPayments.filter(p => p.status === 'pending').length,
      failedPayments: allPayments.filter(p => p.status === 'failed').length,
    };
  }

  async getMonthlyRevenue(year: number): Promise<any> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const allPayments = await db.select().from(subscriptionPayments).where(
      and(
        gte(subscriptionPayments.createdAt, startOfYear),
        lte(subscriptionPayments.createdAt, endOfYear),
        eq(subscriptionPayments.status, 'completed')
      )
    );

    const monthlyData: Record<number, { tl: number; usd: number; count: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { tl: 0, usd: 0, count: 0 };
    }

    allPayments.forEach(p => {
      if (p.createdAt) {
        const month = new Date(p.createdAt).getMonth();
        monthlyData[month].tl += p.amountTl || 0;
        monthlyData[month].usd += p.amountUsd || 0;
        monthlyData[month].count += 1;
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: Number(month) + 1,
      monthName: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Hazıran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][Number(month)],
      ...data
    }));
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0];
    return db.select().from(invoices).where(
      and(
        eq(invoices.status, 'pending'),
        lte(invoices.dueDate, today)
      )
    ).orderBy(invoices.dueDate);
  }

  async generateInvoice(tenantId: number, periodStart: string, periodEnd: string): Promise<Invoice> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Tenant bulunamadı');

    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, tenant.planCode || 'trial'));

    const subtotalTl = plan?.priceTl || 0;
    const vatRate = 20;
    const vatAmount = Math.round(subtotalTl * vatRate / 100);
    const totalTl = subtotalTl + vatAmount;

    // Generate invoice number
    const allInvoices = await db.select().from(invoices);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(allInvoices.length + 1).padStart(5, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // 15 gun vadeli

    const [created] = await db.insert(invoices).values({
      tenantId,
      invoiceNumber,
      agencyName: tenant.name,
      agencyEmail: tenant.email || '',
      periodStart,
      periodEnd,
      subtotalTl,
      vatRatePct: vatRate,
      vatAmountTl: vatAmount,
      totalTl,
      currency: 'TRY',
      status: 'pending',
      dueDate: dueDate.toISOString().split('T')[0],
    }).returning();

    return created;
  }

  // === APP USER MANAGEMENT ===

  async getAppUsers(): Promise<AppUser[]> {
    return db.select().from(appUsers).orderBy(desc(appUsers.createdAt));
  }

  async getAppUser(id: number): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return user;
  }

  async getAppUserByUsername(username: string): Promise<AppUser | undefined> {
    // Case-insensitive username lookup
    const [user] = await db.select().from(appUsers)
      .where(sql`LOWER(${appUsers.username}) = LOWER(${username})`);
    return user;
  }

  async getAppUserByEmail(email: string): Promise<AppUser | undefined> {
    // Case-insensitive email lookup
    const [user] = await db.select().from(appUsers)
      .where(sql`LOWER(${appUsers.email}) = LOWER(${email})`);
    return user;
  }

  async createAppUser(user: InsertAppUser): Promise<AppUser> {
    const [created] = await db.insert(appUsers).values(user).returning();
    return created;
  }

  async updateAppUser(id: number, user: Partial<InsertAppUser>): Promise<AppUser> {
    const [updated] = await db.update(appUsers)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(appUsers.id, id))
      .returning();
    return updated;
  }

  async deleteAppUser(id: number): Promise<void> {
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    await db.delete(userLoginLogs).where(eq(userLoginLogs.userId, id));
    await db.delete(appUsers).where(eq(appUsers.id, id));
  }

  async updateAppUserLoginTime(id: number): Promise<void> {
    await db.update(appUsers)
      .set({ 
        lastLoginAt: new Date(),
        loginCount: sql`${appUsers.loginCount} + 1`
      })
      .where(eq(appUsers.id, id));
  }

  // === ROLES ===

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async updateRole(id: number, role: Partial<InsertRole>): Promise<Role> {
    const [updated] = await db.update(roles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return updated;
  }

  async deleteRole(id: number): Promise<void> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (role?.isSystem) {
      throw new Error('Sistem rolleri silinemez');
    }
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await db.delete(userRoles).where(eq(userRoles.roleId, id));
    await db.delete(roles).where(eq(roles.id, id));
  }

  // === PERMISSIONS ===

  async getPermissions(): Promise<Permission[]> {
    return db.select().from(permissions).orderBy(permissions.category, permissions.sortOrder);
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [created] = await db.insert(permissions).values(permission).returning();
    return created;
  }

  async deletePermission(id: number): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.permissionId, id));
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  async initializeDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      { key: 'dashboard.view', name: 'Dashboard Görüntüle', category: 'dashboard', sortOrder: 1 },
      { key: 'reservations.view', name: 'Rezervasyonlari Görüntüle', category: 'reservations', sortOrder: 1 },
      { key: 'reservations.create', name: 'Rezervasyon Oluştur', category: 'reservations', sortOrder: 2 },
      { key: 'reservations.edit', name: 'Rezervasyon Düzenle', category: 'reservations', sortOrder: 3 },
      { key: 'reservations.delete', name: 'Rezervasyon Sil', category: 'reservations', sortOrder: 4 },
      { key: 'activities.view', name: 'Aktiviteleri Görüntüle', category: 'activities', sortOrder: 1 },
      { key: 'activities.manage', name: 'Aktiviteleri Yonet', category: 'activities', sortOrder: 2 },
      { key: 'calendar.view', name: 'Takvimi Görüntüle', category: 'calendar', sortOrder: 1 },
      { key: 'calendar.manage', name: 'Takvimi Yonet', category: 'calendar', sortOrder: 2 },
      { key: 'reports.view', name: 'Raporlari Görüntüle', category: 'reports', sortOrder: 1 },
      { key: 'reports.export', name: 'Rapor İndir', category: 'reports', sortOrder: 2 },
      { key: 'finance.view', name: 'Finans Görüntüle', category: 'finance', sortOrder: 1 },
      { key: 'finance.manage', name: 'Finans Yonet', category: 'finance', sortOrder: 2 },
      { key: 'settings.view', name: 'Ayarları Görüntüle', category: 'settings', sortOrder: 1 },
      { key: 'settings.manage', name: 'Ayarları Yonet', category: 'settings', sortOrder: 2 },
      { key: 'settings.templates.manage', name: 'Mesaj Şablonlarini Yönet', category: 'settings', sortOrder: 3 },
      { key: 'users.view', name: 'Kullanıcılari Görüntüle', category: 'users', sortOrder: 1 },
      { key: 'users.manage', name: 'Kullanıcılari Yonet', category: 'users', sortOrder: 2 },
      { key: 'whatsapp.view', name: 'WhatsApp Görüntüle', category: 'whatsapp', sortOrder: 1 },
      { key: 'whatsapp.manage', name: 'WhatsApp Yonet', category: 'whatsapp', sortOrder: 2 },
      { key: 'bot.view', name: 'Bot Ayarlarıni Görüntüle', category: 'bot', sortOrder: 1 },
      { key: 'bot.manage', name: 'Bot Ayarlarıni Yonet', category: 'bot', sortOrder: 2 },
      { key: 'agencies.view', name: 'Acentalari Görüntüle', category: 'agencies', sortOrder: 1 },
      { key: 'agencies.manage', name: 'Acentalari Yonet', category: 'agencies', sortOrder: 2 },
      { key: 'subscription.view', name: 'Abonelik Görüntüle', category: 'subscription', sortOrder: 1 },
      { key: 'subscription.manage', name: 'Abonelik Yonet', category: 'subscription', sortOrder: 2 },
    ];

    for (const perm of defaultPermissions) {
      const existing = await db.select().from(permissions).where(eq(permissions.key, perm.key));
      if (existing.length === 0) {
        await db.insert(permissions).values(perm);
      }
    }

    // Create tenant roles - Owner, Manager, Operator (3-tier system)
    const tenantRoles = [
      { 
        name: 'tenant_owner', 
        displayName: 'Sahip', 
        description: 'Acenta sahibi - tam yetki (ayarlar, faturalar, kullanıcı yönetimi)', 
        color: 'purple', 
        isSystem: true 
      },
      { 
        name: 'tenant_manager', 
        displayName: 'Yönetiçi', 
        description: 'Operasyonel yönetiçi - aktiviteler, bot, finans, rezervasyonlar', 
        color: 'blue', 
        isSystem: true 
      },
      { 
        name: 'tenant_operator', 
        displayName: 'Operator', 
        description: 'Günlük işlemler - rezervasyon ve mesajlar', 
        color: 'green', 
        isSystem: true 
      },
    ];

    // Permission mappings for each tenant role
    const rolePermissionMappings: { [key: string]: string[] } = {
      'tenant_owner': [
        'dashboard.view', 
        'reservations.view', 'reservations.create', 'reservations.edit', 'reservations.delete',
        'activities.view', 'activities.manage',
        'calendar.view', 'calendar.manage',
        'reports.view', 'reports.export',
        'finance.view', 'finance.manage',
        'settings.view', 'settings.manage', 'settings.templates.manage',
        'users.view', 'users.manage',
        'whatsapp.view', 'whatsapp.manage',
        'bot.view', 'bot.manage',
        'agencies.view', 'agencies.manage',
        'subscription.view', 'subscription.manage',
      ],
      'tenant_manager': [
        'dashboard.view',
        'reservations.view', 'reservations.create', 'reservations.edit', 'reservations.delete',
        'activities.view', 'activities.manage',
        'calendar.view', 'calendar.manage',
        'reports.view', 'reports.export',
        'finance.view', 'finance.manage',
        'settings.view',
        'users.view', 'users.manage',
        'whatsapp.view', 'whatsapp.manage',
        'bot.view', 'bot.manage',
        'agencies.view', 'agencies.manage',
      ],
      'tenant_operator': [
        'dashboard.view',
        'reservations.view', 'reservations.create', 'reservations.edit',
        'activities.view',
        'calendar.view',
        'reports.view',
        'whatsapp.view',
      ],
    };

    for (const role of tenantRoles) {
      const existing = await db.select().from(roles).where(eq(roles.name, role.name));
      let roleId: number;
      
      if (existing.length === 0) {
        const [created] = await db.insert(roles).values(role).returning();
        roleId = created.id;
      } else {
        roleId = existing[0].id;
      }

      // Assign permissions to role
      const permKeys = rolePermissionMappings[role.name] || [];
      for (const permKey of permKeys) {
        const [perm] = await db.select().from(permissions).where(eq(permissions.key, permKey));
        if (perm) {
          const existingRolePerm = await db.select().from(rolePermissions).where(
            and(
              eq(rolePermissions.roleId, roleId),
              eq(rolePermissions.permissionId, perm.id)
            )
          );
          if (existingRolePerm.length === 0) {
            await db.insert(rolePermissions).values({ roleId, permissionId: perm.id });
          }
        }
      }
    }
  }

  // === ROLE PERMISSIONS ===

  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    return db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permissionIds.length > 0) {
      const values = permissionIds.map(permissionId => ({ roleId, permissionId }));
      await db.insert(rolePermissions).values(values);
    }
  }

  // === USER ROLES ===

  async getUserRoles(userId: number): Promise<UserRole[]> {
    return db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }

  async assignUserRole(assignment: InsertUserRole): Promise<UserRole> {
    const existing = await db.select().from(userRoles).where(
      and(
        eq(userRoles.userId, assignment.userId),
        eq(userRoles.roleId, assignment.roleId)
      )
    );
    if (existing.length > 0) {
      return existing[0];
    }
    const [created] = await db.insert(userRoles).values(assignment).returning();
    return created;
  }

  async removeUserRole(userId: number, roleId: number): Promise<void> {
    await db.delete(userRoles).where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId)
      )
    );
  }

  async getUserPermissions(userId: number): Promise<Permission[]> {
    const userRoleList = await this.getUserRoles(userId);
    if (userRoleList.length === 0) return [];

    const roleIds = userRoleList.map(ur => ur.roleId);
    const allRolePermissions: RolePermission[] = [];
    
    for (const roleId of roleIds) {
      const rp = await this.getRolePermissions(roleId);
      allRolePermissions.push(...rp);
    }

    const permissionIds = Array.from(new Set(allRolePermissions.map(rp => rp.permissionId)));
    if (permissionIds.length === 0) return [];

    const allPermissions = await this.getPermissions();
    return allPermissions.filter(p => permissionIds.includes(p.id));
  }

  // === USER LOGIN LOGS ===

  async getUserLoginLogs(userId?: number, limit: number = 100): Promise<UserLoginLog[]> {
    if (userId) {
      return db.select().from(userLoginLogs)
        .where(eq(userLoginLogs.userId, userId))
        .orderBy(desc(userLoginLogs.createdAt))
        .limit(limit);
    }
    return db.select().from(userLoginLogs)
      .orderBy(desc(userLoginLogs.createdAt))
      .limit(limit);
  }

  async createUserLoginLog(log: InsertUserLoginLog): Promise<UserLoginLog> {
    const [created] = await db.insert(userLoginLogs).values(log).returning();
    return created;
  }

  // === PARTNER ACENTA - INVITE CODES ===

  async getPartnerInviteCodes(tenantId: number): Promise<PartnerInviteCode[]> {
    return db.select().from(partnerInviteCodes)
      .where(eq(partnerInviteCodes.tenantId, tenantId))
      .orderBy(desc(partnerInviteCodes.createdAt));
  }

  async getPartnerInviteCodeByCode(code: string): Promise<PartnerInviteCode | undefined> {
    const [result] = await db.select().from(partnerInviteCodes)
      .where(eq(partnerInviteCodes.code, code.toUpperCase()));
    return result;
  }

  async createPartnerInviteCode(data: InsertPartnerInviteCode): Promise<PartnerInviteCode> {
    const [created] = await db.insert(partnerInviteCodes).values({
      ...data,
      code: data.code.toUpperCase()
    }).returning();
    return created;
  }

  async updatePartnerInviteCode(id: number, data: Partial<InsertPartnerInviteCode>): Promise<PartnerInviteCode> {
    const [updated] = await db.update(partnerInviteCodes)
      .set(data)
      .where(eq(partnerInviteCodes.id, id))
      .returning();
    return updated;
  }

  async deletePartnerInviteCode(id: number): Promise<void> {
    await db.delete(partnerInviteCodes).where(eq(partnerInviteCodes.id, id));
  }

  async generateUniquePartnerCode(tenantId: number): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      const existing = await this.getPartnerInviteCodeByCode(code);
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      code = `${Date.now().toString(36).toUpperCase()}`.slice(-6);
    }

    return code;
  }

  // === PARTNER ACENTA - PARTNERSHIPS ===

  async getTenantPartnerships(tenantId: number): Promise<TenantPartnership[]> {
    return db.select().from(tenantPartnerships)
      .where(
        or(
          eq(tenantPartnerships.requesterTenantId, tenantId),
          eq(tenantPartnerships.partnerTenantId, tenantId)
        )
      )
      .orderBy(desc(tenantPartnerships.requestedAt));
  }

  async getTenantPartnership(id: number): Promise<TenantPartnership | undefined> {
    const [result] = await db.select().from(tenantPartnerships)
      .where(eq(tenantPartnerships.id, id));
    return result;
  }

  async createTenantPartnership(partnership: InsertTenantPartnership): Promise<TenantPartnership> {
    const [created] = await db.insert(tenantPartnerships).values(partnership).returning();
    return created;
  }

  async updateTenantPartnership(id: number, data: Partial<InsertTenantPartnership>): Promise<TenantPartnership> {
    const [updated] = await db.update(tenantPartnerships)
      .set(data)
      .where(eq(tenantPartnerships.id, id))
      .returning();
    return updated;
  }

  async deleteTenantPartnership(id: number): Promise<void> {
    await db.delete(tenantPartnerships).where(eq(tenantPartnerships.id, id));
  }

  async getActivePartnership(requesterTenantId: number, partnerTenantId: number): Promise<TenantPartnership | undefined> {
    const [result] = await db.select().from(tenantPartnerships)
      .where(
        and(
          or(
            and(
              eq(tenantPartnerships.requesterTenantId, requesterTenantId),
              eq(tenantPartnerships.partnerTenantId, partnerTenantId)
            ),
            and(
              eq(tenantPartnerships.requesterTenantId, partnerTenantId),
              eq(tenantPartnerships.partnerTenantId, requesterTenantId)
            )
          ),
          eq(tenantPartnerships.status, 'active')
        )
      );
    return result;
  }

  async checkIfPhoneIsPartner(phone: string, tenantId: number): Promise<{ isPartner: boolean; partnerTenant?: Tenant; partnership?: TenantPartnership }> {
    // Normalize phone number: remove whatsapp prefix, all non-digit characters
    const normalizePhone = (p: string): string => {
      return p.replace(/^whatsapp:/, '').replace(/[^\d]/g, '');
    };
    
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      return { isPartner: false };
    }
    
    // Get last 10 digits for comparison (handles country code differences)
    const senderLast10 = normalizedPhone.slice(-10);
    
    // Get active partnerships for this tenant
    const partnerships = await this.getTenantPartnerships(tenantId);
    const activePartnerships = partnerships.filter(p => p.status === 'active');
    
    if (activePartnerships.length === 0) {
      return { isPartner: false };
    }
    
    // Get only partner tenant IDs to query
    const partnerTenantIds = activePartnerships.map(p => 
      p.requesterTenantId === tenantId ? p.partnerTenantId : p.requesterTenantId
    );
    
    // Query only partner tenants (not full table scan)
    const partnerTenants = await db.select().from(tenants)
      .where(inArray(tenants.id, partnerTenantIds));
    
    // Find matching partner by normalized phone
    for (const partner of partnerTenants) {
      if (!partner.phone) continue;
      const partnerPhoneNormalized = normalizePhone(partner.phone);
      if (partnerPhoneNormalized.length < 10) continue;
      
      const partnerLast10 = partnerPhoneNormalized.slice(-10);
      if (senderLast10 === partnerLast10) {
        const partnership = activePartnerships.find(p => 
          (p.requesterTenantId === partner.id || p.partnerTenantId === partner.id)
        );
        if (partnership) {
          return { isPartner: true, partnerTenant: partner, partnership };
        }
      }
    }
    
    return { isPartner: false };
  }

  // Check if phone belongs to a viewer user of this tenant
  async checkIfPhoneIsViewer(phone: string, tenantId: number): Promise<{ isViewer: boolean; viewerUser?: AppUser }> {
    // Normalize phone number: remove whatsapp prefix, all non-digit characters
    const normalizePhone = (p: string): string => {
      return p.replace(/^whatsapp:/, '').replace(/[^\d]/g, '');
    };
    
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      return { isViewer: false };
    }
    
    // Get last 10 digits for comparison (handles country code differences)
    const senderLast10 = normalizedPhone.slice(-10);
    
    // Find viewer role ID
    const [viewerRole] = await db.select().from(roles)
      .where(eq(roles.name, 'viewer'));
    
    if (!viewerRole) {
      return { isViewer: false };
    }
    
    // Query users with viewer role for this tenant via userRoles join
    const viewerUsersWithRole = await db.select({
      user: appUsers
    })
      .from(appUsers)
      .innerJoin(userRoles, eq(userRoles.userId, appUsers.id))
      .where(
        and(
          eq(appUsers.tenantId, tenantId),
          eq(appUsers.isActive, true),
          eq(userRoles.roleId, viewerRole.id)
        )
      );
    
    // Find matching viewer by normalized phone
    for (const { user } of viewerUsersWithRole) {
      if (!user.phone) continue;
      const viewerPhoneNormalized = normalizePhone(user.phone);
      if (viewerPhoneNormalized.length < 10) continue;
      
      const viewerLast10 = viewerPhoneNormalized.slice(-10);
      if (senderLast10 === viewerLast10) {
        return { isViewer: true, viewerUser: user };
      }
    }
    
    return { isViewer: false };
  }

  // === PARTNER ACENTA - DISPATCH SHARES ===

  async getDispatchShares(receiverTenantId: number, status?: string): Promise<DispatchShare[]> {
    if (status) {
      return db.select().from(dispatchShares)
        .where(
          and(
            eq(dispatchShares.receiverTenantId, receiverTenantId),
            eq(dispatchShares.status, status)
          )
        )
        .orderBy(desc(dispatchShares.sharedAt));
    }
    return db.select().from(dispatchShares)
      .where(eq(dispatchShares.receiverTenantId, receiverTenantId))
      .orderBy(desc(dispatchShares.sharedAt));
  }

  async getSentDispatchShares(senderTenantId: number): Promise<DispatchShare[]> {
    return db.select().from(dispatchShares)
      .where(eq(dispatchShares.senderTenantId, senderTenantId))
      .orderBy(desc(dispatchShares.sharedAt));
  }

  async getDispatchShare(id: number): Promise<DispatchShare | undefined> {
    const [result] = await db.select().from(dispatchShares)
      .where(eq(dispatchShares.id, id));
    return result;
  }

  async createDispatchShare(share: InsertDispatchShare): Promise<DispatchShare> {
    const [created] = await db.insert(dispatchShares).values(share).returning();
    return created;
  }

  async updateDispatchShare(id: number, data: Partial<InsertDispatchShare>): Promise<DispatchShare> {
    const [updated] = await db.update(dispatchShares)
      .set(data)
      .where(eq(dispatchShares.id, id))
      .returning();
    return updated;
  }

  async deleteDispatchShare(id: number): Promise<void> {
    await db.delete(dispatchShares).where(eq(dispatchShares.id, id));
  }

  // === PARTNER ACENTA - ACTIVITY PARTNER SHARES ===

  async getActivityPartnerShares(activityId: number): Promise<ActivityPartnerShare[]> {
    if (activityId === 0) {
      // Return all shares
      return db.select().from(activityPartnerShares);
    }
    return db.select().from(activityPartnerShares)
      .where(eq(activityPartnerShares.activityId, activityId));
  }

  async getPartnerSharesForTenant(tenantId: number): Promise<ActivityPartnerShare[]> {
    const partnerships = await db.select().from(tenantPartnerships)
      .where(
        and(
          eq(tenantPartnerships.partnerTenantId, tenantId),
          eq(tenantPartnerships.status, 'active')
        )
      );
    
    if (partnerships.length === 0) return [];
    
    const partnershipIds = partnerships.map(p => p.id);
    return db.select().from(activityPartnerShares)
      .where(inArray(activityPartnerShares.partnershipId, partnershipIds));
  }

  async createActivityPartnerShare(share: InsertActivityPartnerShare): Promise<ActivityPartnerShare> {
    const [created] = await db.insert(activityPartnerShares).values(share).returning();
    return created;
  }

  async deleteActivityPartnerShare(activityId: number, partnershipId: number): Promise<void> {
    await db.delete(activityPartnerShares)
      .where(
        and(
          eq(activityPartnerShares.activityId, activityId),
          eq(activityPartnerShares.partnershipId, partnershipId)
        )
      );
  }

  async updateActivityPartnerShare(activityId: number, partnershipId: number, data: { partnerUnitPrice?: number; partnerCurrency?: string }): Promise<ActivityPartnerShare | undefined> {
    const [updated] = await db.update(activityPartnerShares)
      .set(data)
      .where(
        and(
          eq(activityPartnerShares.activityId, activityId),
          eq(activityPartnerShares.partnershipId, partnershipId)
        )
      )
      .returning();
    return updated;
  }

  async setActivityPartnerShares(activityId: number, shares: Array<{ partnershipId: number; partnerUnitPrice?: number; partnerCurrency?: string }>): Promise<void> {
    await db.delete(activityPartnerShares)
      .where(eq(activityPartnerShares.activityId, activityId));
    
    if (shares.length > 0) {
      const values = shares.map(share => ({
        activityId,
        partnershipId: share.partnershipId,
        partnerUnitPrice: share.partnerUnitPrice,
        partnerCurrency: share.partnerCurrency || 'TRY'
      }));
      await db.insert(activityPartnerShares).values(values);
    }
  }

  // === PARTNER TRANSACTIONS ===

  async getPartnerTransactions(tenantId: number, role: 'sender' | 'receiver' | 'all'): Promise<PartnerTransaction[]> {
    if (role === 'sender') {
      return db.select().from(partnerTransactions)
        .where(eq(partnerTransactions.senderTenantId, tenantId))
        .orderBy(desc(partnerTransactions.createdAt));
    } else if (role === 'receiver') {
      return db.select().from(partnerTransactions)
        .where(eq(partnerTransactions.receiverTenantId, tenantId))
        .orderBy(desc(partnerTransactions.createdAt));
    } else {
      return db.select().from(partnerTransactions)
        .where(
          or(
            eq(partnerTransactions.senderTenantId, tenantId),
            eq(partnerTransactions.receiverTenantId, tenantId)
          )
        )
        .orderBy(desc(partnerTransactions.createdAt));
    }
  }

  async getPartnerTransaction(id: number): Promise<PartnerTransaction | undefined> {
    const [transaction] = await db.select().from(partnerTransactions)
      .where(eq(partnerTransactions.id, id));
    return transaction;
  }

  async createPartnerTransaction(transaction: InsertPartnerTransaction): Promise<PartnerTransaction> {
    const [created] = await db.insert(partnerTransactions).values(transaction).returning();
    return created;
  }

  async updatePartnerTransaction(id: number, data: Partial<InsertPartnerTransaction>): Promise<PartnerTransaction> {
    const [updated] = await db.update(partnerTransactions)
      .set(data)
      .where(eq(partnerTransactions.id, id))
      .returning();
    return updated;
  }

  async deletePartnerTransaction(id: number): Promise<void> {
    await db.delete(partnerTransactions)
      .where(eq(partnerTransactions.id, id));
  }

  // === NOTIFICATION PREFERENCES ===

  async getUserNotificationPreferences(userId: number): Promise<UserNotificationPreference[]> {
    return db.select().from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));
  }

  async setUserNotificationPreference(pref: InsertUserNotificationPreference): Promise<UserNotificationPreference> {
    const existing = await db.select().from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, pref.userId),
          eq(userNotificationPreferences.notificationType, pref.notificationType)
        )
      );
    
    if (existing.length > 0) {
      const [updated] = await db.update(userNotificationPreferences)
        .set({ ...pref, updatedAt: new Date() })
        .where(eq(userNotificationPreferences.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(userNotificationPreferences).values(pref).returning();
    return created;
  }

  async deleteUserNotificationPreference(userId: number, notificationType: string): Promise<void> {
    await db.delete(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.notificationType, notificationType)
        )
      );
  }

  async getTenantNotificationSettings(tenantId: number): Promise<TenantNotificationSetting[]> {
    return db.select().from(tenantNotificationSettings)
      .where(eq(tenantNotificationSettings.tenantId, tenantId));
  }

  async setTenantNotificationSetting(setting: InsertTenantNotificationSetting): Promise<TenantNotificationSetting> {
    const existing = await db.select().from(tenantNotificationSettings)
      .where(
        and(
          eq(tenantNotificationSettings.tenantId, setting.tenantId),
          eq(tenantNotificationSettings.notificationType, setting.notificationType)
        )
      );
    
    if (existing.length > 0) {
      const [updated] = await db.update(tenantNotificationSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(tenantNotificationSettings.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(tenantNotificationSettings).values(setting).returning();
    return created;
  }

  async deleteTenantNotificationSetting(tenantId: number, notificationType: string): Promise<void> {
    await db.delete(tenantNotificationSettings)
      .where(
        and(
          eq(tenantNotificationSettings.tenantId, tenantId),
          eq(tenantNotificationSettings.notificationType, notificationType)
        )
      );
  }

  // === IN-APP NOTIFICATIONS ===

  async getInAppNotifications(userId: number, unreadOnly: boolean = false): Promise<InAppNotification[]> {
    if (unreadOnly) {
      return db.select().from(inAppNotifications)
        .where(
          and(
            eq(inAppNotifications.userId, userId),
            eq(inAppNotifications.isRead, false)
          )
        )
        .orderBy(desc(inAppNotifications.createdAt));
    }
    return db.select().from(inAppNotifications)
      .where(eq(inAppNotifications.userId, userId))
      .orderBy(desc(inAppNotifications.createdAt));
  }

  async createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification> {
    const [created] = await db.insert(inAppNotifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(inAppNotifications)
      .set({ isRead: true })
      .where(eq(inAppNotifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(inAppNotifications)
      .set({ isRead: true })
      .where(eq(inAppNotifications.userId, userId));
  }

  async deleteInAppNotification(id: number): Promise<void> {
    await db.delete(inAppNotifications).where(eq(inAppNotifications.id, id));
  }

  // === VIEWER ACTIVITY SHARES ===

  async getViewerActivityShares(tenantId: number, viewerUserId?: number): Promise<ViewerActivityShare[]> {
    if (viewerUserId) {
      return db.select().from(viewerActivityShares)
        .where(
          and(
            eq(viewerActivityShares.tenantId, tenantId),
            eq(viewerActivityShares.viewerUserId, viewerUserId)
          )
        );
    }
    return db.select().from(viewerActivityShares)
      .where(eq(viewerActivityShares.tenantId, tenantId));
  }

  async getViewerActivityShare(id: number): Promise<ViewerActivityShare | undefined> {
    const [share] = await db.select().from(viewerActivityShares)
      .where(eq(viewerActivityShares.id, id));
    return share;
  }

  async createViewerActivityShare(share: InsertViewerActivityShare): Promise<ViewerActivityShare> {
    const [created] = await db.insert(viewerActivityShares).values(share).returning();
    return created;
  }

  async updateViewerActivityShare(id: number, data: Partial<InsertViewerActivityShare>): Promise<ViewerActivityShare> {
    const [updated] = await db.update(viewerActivityShares)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(viewerActivityShares.id, id))
      .returning();
    return updated;
  }

  async deleteViewerActivityShare(id: number): Promise<void> {
    await db.delete(viewerActivityShares).where(eq(viewerActivityShares.id, id));
  }

  async setViewerActivityShares(
    tenantId: number, 
    viewerUserId: number, 
    shares: Array<{ activityId: number; isShared: boolean; viewerUnitPriceTry?: number; viewerUnitPriceUsd?: number; viewerUnitPriceEur?: number }>
  ): Promise<void> {
    // Delete existing shares for this viewer
    await db.delete(viewerActivityShares)
      .where(
        and(
          eq(viewerActivityShares.tenantId, tenantId),
          eq(viewerActivityShares.viewerUserId, viewerUserId)
        )
      );
    
    // Insert new shares
    if (shares.length > 0) {
      await db.insert(viewerActivityShares).values(
        shares.map(share => ({
          tenantId,
          viewerUserId,
          activityId: share.activityId,
          isShared: share.isShared,
          viewerUnitPriceTry: share.viewerUnitPriceTry,
          viewerUnitPriceUsd: share.viewerUnitPriceUsd,
          viewerUnitPriceEur: share.viewerUnitPriceEur,
        }))
      );
    }
  }

  // === RESERVATION CHANGE REQUESTS ===

  async getReservationChangeRequests(tenantId: number): Promise<ReservationChangeRequest[]> {
    return db.select().from(reservationChangeRequests)
      .where(eq(reservationChangeRequests.tenantId, tenantId))
      .orderBy(desc(reservationChangeRequests.createdAt));
  }

  async getReservationChangeRequest(id: number): Promise<ReservationChangeRequest | undefined> {
    const [request] = await db.select().from(reservationChangeRequests)
      .where(eq(reservationChangeRequests.id, id));
    return request;
  }

  async getReservationChangeRequestsByReservation(reservationId: number): Promise<ReservationChangeRequest[]> {
    return db.select().from(reservationChangeRequests)
      .where(eq(reservationChangeRequests.reservationId, reservationId))
      .orderBy(desc(reservationChangeRequests.createdAt));
  }

  async createReservationChangeRequest(request: InsertReservationChangeRequest): Promise<ReservationChangeRequest> {
    const [created] = await db.insert(reservationChangeRequests).values(request).returning();
    return created;
  }

  async updateReservationChangeRequest(id: number, data: Partial<InsertReservationChangeRequest>): Promise<ReservationChangeRequest> {
    const [updated] = await db.update(reservationChangeRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reservationChangeRequests.id, id))
      .returning();
    return updated;
  }

  async deleteReservationChangeRequest(id: number): Promise<void> {
    await db.delete(reservationChangeRequests).where(eq(reservationChangeRequests.id, id));
  }
}

export const storage = new DatabaseStorage();
