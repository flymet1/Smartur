import { db } from "./db";
import { systemLogs, supportRequestLogs, messages, errorEvents, tenants, type InsertErrorEvent, type ErrorEvent } from "@shared/schema";
import { desc, eq, gte, or, and, sql, isNull, lte, inArray } from "drizzle-orm";

type LogLevel = 'error' | 'warn' | 'info';
type LogSource = 'whatsapp' | 'ai' | 'webhook' | 'system';

interface LogEntry {
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: string;
  phone?: string;
}

const MAX_LOGS_PER_REQUEST = 20;
const LOG_RETENTION_HOURS = 24;

function sanitizeDetails(details: unknown): string {
  if (!details) return '';
  
  let detailsStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
  
  const sensitivePatterns = [
    /("?(?:api[_-]?key|auth[_-]?token|password|secret|bearer)["\s:]*)[^\s,}"]+/gi,
    /(twilio[_-]?(?:auth|sid|token)["\s:]*)[^\s,}"]+/gi,
    /(session[_-]?secret["\s:]*)[^\s,}"]+/gi,
  ];
  
  for (const pattern of sensitivePatterns) {
    detailsStr = detailsStr.replace(pattern, '$1[REDACTED]');
  }
  
  detailsStr = detailsStr.replace(/\+?[0-9]{10,15}/g, '[PHONE_REDACTED]');
  detailsStr = detailsStr.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  
  return detailsStr;
}

export async function logSystem(entry: LogEntry): Promise<void> {
  try {
    await db.insert(systemLogs).values({
      level: entry.level,
      source: entry.source,
      message: entry.message.substring(0, 1000),
      details: sanitizeDetails(entry.details),
      phone: entry.phone,
    });
  } catch (err) {
    console.error('Log kaydetme hatası:', err);
  }
}

export async function logError(source: LogSource, message: string, details?: unknown, phone?: string): Promise<void> {
  await logSystem({ level: 'error', source, message, details: details as string, phone });
}

export async function logWarn(source: LogSource, message: string, details?: unknown, phone?: string): Promise<void> {
  await logSystem({ level: 'warn', source, message, details: details as string, phone });
}

export async function logInfo(source: LogSource, message: string, details?: unknown, phone?: string): Promise<void> {
  await logSystem({ level: 'info', source, message, details: details as string, phone });
}

export async function getRecentLogs(phone?: string, limit: number = MAX_LOGS_PER_REQUEST) {
  const cutoffTime = new Date(Date.now() - LOG_RETENTION_HOURS * 60 * 60 * 1000);
  
  let query = db.select().from(systemLogs)
    .where(gte(systemLogs.createdAt, cutoffTime))
    .orderBy(desc(systemLogs.createdAt))
    .limit(limit);
  
  if (phone) {
    return await db.select().from(systemLogs)
      .where(and(
        gte(systemLogs.createdAt, cutoffTime),
        or(eq(systemLogs.phone, phone), eq(systemLogs.phone, null as unknown as string))
      ))
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit);
  }
  
  return await query;
}

export async function getRecentMessages(phone: string, limit: number = 10) {
  return await db.select().from(messages)
    .where(eq(messages.phone, phone))
    .orderBy(desc(messages.timestamp))
    .limit(limit);
}

export async function attachLogsToSupportRequest(supportRequestId: number, phone?: string): Promise<void> {
  try {
    const recentLogs = await getRecentLogs(phone, MAX_LOGS_PER_REQUEST);
    
    let messageSnapshot = '';
    if (phone) {
      const recentMessages = await getRecentMessages(phone, 10);
      messageSnapshot = JSON.stringify(recentMessages.reverse());
    }
    
    for (const log of recentLogs) {
      await db.insert(supportRequestLogs).values({
        supportRequestId,
        logId: log.id,
        messageSnapshot: messageSnapshot || null,
      });
      messageSnapshot = '';
    }
  } catch (err) {
    console.error('Log ekleme hatası:', err);
  }
}

export async function getSupportRequestLogs(supportRequestId: number) {
  const logs = await db.select({
    id: supportRequestLogs.id,
    logId: supportRequestLogs.logId,
    messageSnapshot: supportRequestLogs.messageSnapshot,
    logLevel: systemLogs.level,
    logSource: systemLogs.source,
    logMessage: systemLogs.message,
    logDetails: systemLogs.details,
    logPhone: systemLogs.phone,
    logCreatedAt: systemLogs.createdAt,
  })
    .from(supportRequestLogs)
    .leftJoin(systemLogs, eq(supportRequestLogs.logId, systemLogs.id))
    .where(eq(supportRequestLogs.supportRequestId, supportRequestId))
    .orderBy(desc(systemLogs.createdAt));
  
  return logs;
}

export async function cleanupOldLogs(): Promise<void> {
  try {
    const cutoffTime = new Date(Date.now() - LOG_RETENTION_HOURS * 60 * 60 * 1000);
    await db.delete(systemLogs).where(gte(systemLogs.createdAt, cutoffTime));
  } catch (err) {
    console.error('Eski log temizleme hatası:', err);
  }
}

// === ERROR EVENTS - Super Admin için platform-wide hata izleme ===

export type ErrorSeverity = 'critical' | 'error' | 'warning';
export type ErrorCategory = 'api' | 'validation' | 'ai_bot' | 'system' | 'auth' | 'database' | 'license';

interface ErrorEventInput {
  tenantId?: number | null;
  severity: ErrorSeverity;
  category: ErrorCategory;
  source: string;
  message: string;
  suggestion?: string;
  requestPath?: string;
  requestMethod?: string;
  statusCode?: number;
  userId?: number;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}

export async function logErrorEvent(input: ErrorEventInput): Promise<ErrorEvent | null> {
  try {
    let tenantName: string | null = null;
    if (input.tenantId) {
      const tenant = await db.select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);
      tenantName = tenant[0]?.name || null;
    }

    const [event] = await db.insert(errorEvents).values({
      tenantId: input.tenantId ?? null,
      severity: input.severity,
      category: input.category,
      source: input.source,
      message: input.message.substring(0, 1000),
      suggestion: input.suggestion?.substring(0, 500),
      requestPath: input.requestPath,
      requestMethod: input.requestMethod,
      statusCode: input.statusCode,
      userId: input.userId,
      userEmail: input.userEmail ? maskEmail(input.userEmail) : null,
      tenantName,
      metadata: input.metadata ? sanitizeDetails(JSON.stringify(input.metadata)) : null,
      status: 'open',
    }).returning();
    
    return event;
  } catch (err) {
    console.error('Error event kaydetme hatası:', err);
    return null;
  }
}

export interface ErrorEventFilters {
  tenantId?: number;
  severity?: ErrorSeverity[];
  category?: ErrorCategory[];
  status?: 'open' | 'acknowledged' | 'resolved';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function getErrorEvents(filters: ErrorEventFilters = {}): Promise<{ events: ErrorEvent[], total: number }> {
  const conditions = [];

  if (filters.tenantId) {
    conditions.push(eq(errorEvents.tenantId, filters.tenantId));
  }
  if (filters.severity && filters.severity.length > 0) {
    conditions.push(inArray(errorEvents.severity, filters.severity));
  }
  if (filters.category && filters.category.length > 0) {
    conditions.push(inArray(errorEvents.category, filters.category));
  }
  if (filters.status) {
    conditions.push(eq(errorEvents.status, filters.status));
  }
  if (filters.startDate) {
    conditions.push(gte(errorEvents.occurredAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(errorEvents.occurredAt, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(errorEvents)
    .where(whereClause);

  const events = await db.select()
    .from(errorEvents)
    .where(whereClause)
    .orderBy(desc(errorEvents.occurredAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  return { events, total: Number(countResult?.count || 0) };
}

export async function getErrorEventsSummary(): Promise<{
  openCount: number;
  criticalCount: number;
  affectedTenants: number;
  recentEvents: ErrorEvent[];
}> {
  const [openResult] = await db.select({ count: sql<number>`count(*)` })
    .from(errorEvents)
    .where(eq(errorEvents.status, 'open'));

  const [criticalResult] = await db.select({ count: sql<number>`count(*)` })
    .from(errorEvents)
    .where(and(eq(errorEvents.status, 'open'), eq(errorEvents.severity, 'critical')));

  const [tenantsResult] = await db.select({ count: sql<number>`count(distinct tenant_id)` })
    .from(errorEvents)
    .where(eq(errorEvents.status, 'open'));

  const recentEvents = await db.select()
    .from(errorEvents)
    .where(eq(errorEvents.status, 'open'))
    .orderBy(desc(errorEvents.occurredAt))
    .limit(5);

  return {
    openCount: Number(openResult?.count || 0),
    criticalCount: Number(criticalResult?.count || 0),
    affectedTenants: Number(tenantsResult?.count || 0),
    recentEvents,
  };
}

export async function resolveErrorEvent(id: number, resolvedBy: string, notes?: string): Promise<ErrorEvent | null> {
  try {
    const [event] = await db.update(errorEvents)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes: notes,
      })
      .where(eq(errorEvents.id, id))
      .returning();
    return event;
  } catch (err) {
    console.error('Error event çözümleme hatası:', err);
    return null;
  }
}

export async function acknowledgeErrorEvent(id: number): Promise<ErrorEvent | null> {
  try {
    const [event] = await db.update(errorEvents)
      .set({ status: 'acknowledged' })
      .where(eq(errorEvents.id, id))
      .returning();
    return event;
  } catch (err) {
    console.error('Error event onaylama hatası:', err);
    return null;
  }
}
