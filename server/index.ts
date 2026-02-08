import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import crypto from "crypto";

// CORS middleware for external access
function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function bootstrapSuperAdmin(): Promise<void> {
  try {
    const admins = await storage.getPlatformAdmins();
    if (admins.length === 0) {
      const email = process.env.SUPER_ADMIN_EMAIL;
      const password = process.env.SUPER_ADMIN_PASSWORD;
      
      if (email && password) {
        const passwordHash = hashPassword(password);
        await storage.createPlatformAdmin({
          email,
          passwordHash,
          name: 'Super Admin',
          role: 'super_admin',
          isActive: true
        });
        console.log(`[bootstrap] Super admin created: ${email}`);
      } else {
        console.log('[bootstrap] No super admin exists. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars to create one.');
      }
    }
  } catch (error) {
    console.error('[bootstrap] Error checking/creating super admin:', error);
  }
}

const app = express();
const httpServer = createServer(app);

// Trust proxy for Coolify/reverse proxy setups (needed for secure cookies behind proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '5mb' }));

// Enable CORS for external access (aaPanel, etc.)
app.use(corsMiddleware);

// Session middleware with PostgreSQL-backed storage for persistence across restarts
const PgSession = connectPgSimple(session);

// Determine if we should use secure cookies
// In production behind a proxy (like Coolify), check X-Forwarded-Proto header
const isSecureEnvironment = process.env.NODE_ENV === 'production';

app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15 // Prune expired sessions every 15 minutes
    }),
    secret: process.env.SESSION_SECRET || 'smartur-session-secret-fallback',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset session expiry on each request
    proxy: isSecureEnvironment, // Trust the reverse proxy
    cookie: {
      secure: isSecureEnvironment ? 'auto' : false, // 'auto' detects HTTPS via X-Forwarded-Proto
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (extended for better UX)
    }
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await bootstrapSuperAdmin();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Daily cleanup job for expired tracking tokens
      // Runs every 24 hours (86400000 ms)
      const runCleanup = async () => {
        try {
          const count = await storage.cleanupExpiredTrackingTokens();
          if (count > 0) {
            log(`Cleaned up ${count} expired tracking tokens`, 'cleanup');
          }
        } catch (error) {
          log(`Error cleaning up tracking tokens: ${error}`, 'cleanup');
        }
      };
      
      // Run cleanup on startup and then every 24 hours
      runCleanup();
      setInterval(runCleanup, 24 * 60 * 60 * 1000);
    },
  );
})();
