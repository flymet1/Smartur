import { db } from "./db";
import { systemLogs, supportRequestLogs, messages } from "@shared/schema";
import { desc, eq, gte, or, and } from "drizzle-orm";

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
    console.error('Log kaydetme hatasi:', err);
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
    console.error('Log ekleme hatasi:', err);
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
    console.error('Eski log temizleme hatasi:', err);
  }
}
