import nodemailer from "nodemailer";
import { storage } from "./storage";
import { encrypt, decrypt } from "./encryption";
import { db } from "./db";
import { tenantIntegrations, tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

const PROVIDER_SMTP_CONFIG: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  yandex: { host: 'smtp.yandex.com', port: 465, secure: true },
};

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
}

let smtpConfigCache: SmtpConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000;

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const now = Date.now();
  if (smtpConfigCache && (now - cacheTimestamp) < CACHE_TTL) {
    return smtpConfigCache;
  }
  
  try {
    const configJson = await storage.getSetting("platformSmtpConfig");
    if (!configJson) {
      return null;
    }
    
    const config = JSON.parse(configJson);
    
    if (!config.host || !config.username || !config.passwordEncrypted) {
      return null;
    }
    
    const decryptedPassword = decrypt(config.passwordEncrypted);
    
    smtpConfigCache = {
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      username: config.username,
      password: decryptedPassword,
      fromEmail: config.fromEmail || config.username,
      fromName: config.fromName || "Smartur",
    };
    cacheTimestamp = now;
    
    return smtpConfigCache;
  } catch (error) {
    console.error("SMTP config retrieval error:", error);
    return null;
  }
}

export async function saveSmtpConfig(config: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}): Promise<void> {
  const encryptedPassword = encrypt(config.password);
  
  const configToStore = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    username: config.username,
    passwordEncrypted: encryptedPassword,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
  };
  
  await storage.setSetting("platformSmtpConfig", JSON.stringify(configToStore));
  
  smtpConfigCache = null;
  cacheTimestamp = 0;
}

export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  const config = await getSmtpConfig();
  
  if (!config) {
    return { success: false, error: "SMTP yapılandırması bulunamadı" };
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
    
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    console.error("SMTP connection test failed:", error);
    return { 
      success: false, 
      error: error.message || "Bağlantı hatası" 
    };
  }
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const config = await getSmtpConfig();
  
  if (!config) {
    console.warn("Email not sent: SMTP not configured");
    return { success: false, error: "SMTP yapılandırması bulunamadı" };
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
    
    const fromName = options.fromName || config.fromName;
    const fromEmail = config.fromEmail;
    
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });
    
    console.log(`Email sent successfully to ${options.to}`);
    return { success: true };
  } catch (error: any) {
    console.error("Email sending failed:", error);
    return { 
      success: false, 
      error: error.message || "E-posta gönderilemedi" 
    };
  }
}

export function clearSmtpCache(): void {
  smtpConfigCache = null;
  cacheTimestamp = 0;
}

export async function getTenantSmtpConfig(tenantId: number): Promise<SmtpConfig | null> {
  try {
    const [integration] = await db.select({
      emailProvider: tenantIntegrations.emailProvider,
      emailUser: tenantIntegrations.emailUser,
      emailPasswordEncrypted: tenantIntegrations.emailPasswordEncrypted,
      emailFromName: tenantIntegrations.emailFromName,
      emailSmtpHost: tenantIntegrations.emailSmtpHost,
      emailSmtpPort: tenantIntegrations.emailSmtpPort,
      emailSmtpSecure: tenantIntegrations.emailSmtpSecure,
      emailConfigured: tenantIntegrations.emailConfigured,
    }).from(tenantIntegrations).where(eq(tenantIntegrations.tenantId, tenantId));

    if (!integration || !integration.emailConfigured || !integration.emailProvider || !integration.emailUser || !integration.emailPasswordEncrypted) {
      return null;
    }
    
    const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId));

    const decryptedPassword = decrypt(integration.emailPasswordEncrypted);
    
    let smtpHost: string;
    let smtpPort: number;
    let smtpSecure: boolean;

    if (integration.emailProvider === 'custom') {
      if (!integration.emailSmtpHost || !integration.emailSmtpPort) {
        return null;
      }
      smtpHost = integration.emailSmtpHost;
      smtpPort = integration.emailSmtpPort;
      smtpSecure = integration.emailSmtpSecure ?? true;
    } else {
      const providerConfig = PROVIDER_SMTP_CONFIG[integration.emailProvider];
      if (!providerConfig) {
        return null;
      }
      smtpHost = providerConfig.host;
      smtpPort = providerConfig.port;
      smtpSecure = providerConfig.secure;
    }

    return {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      username: integration.emailUser,
      password: decryptedPassword,
      fromEmail: integration.emailUser,
      fromName: integration.emailFromName || tenant?.name || 'Smartur',
    };
  } catch (error) {
    console.error("Tenant SMTP config retrieval error:", error);
    return null;
  }
}

export async function sendTenantEmail(
  tenantId: number,
  options: EmailOptions
): Promise<{ success: boolean; error?: string; usedTenantSmtp: boolean }> {
  const tenantConfig = await getTenantSmtpConfig(tenantId);
  
  if (tenantConfig) {
    try {
      const transporter = nodemailer.createTransport({
        host: tenantConfig.host,
        port: tenantConfig.port,
        secure: tenantConfig.secure,
        auth: {
          user: tenantConfig.username,
          pass: tenantConfig.password,
        },
      });
      
      const fromName = options.fromName || tenantConfig.fromName;
      const fromEmail = tenantConfig.fromEmail;
      
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });
      
      console.log(`Tenant email sent successfully to ${options.to} from ${fromEmail}`);
      return { success: true, usedTenantSmtp: true };
    } catch (error: any) {
      console.error("Tenant email sending failed, falling back to platform SMTP:", error.message);
    }
  }
  
  const platformResult = await sendEmail(options);
  return { ...platformResult, usedTenantSmtp: false };
}
