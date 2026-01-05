import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    tenantId?: number;
    username?: string;
    roles?: number[];
    permissions?: string[];
    platformAdminId?: number;
    isPlatformAdmin?: boolean;
  }
}

declare module "express" {
  interface Request {
    session: import("express-session").Session & Partial<import("express-session").SessionData>;
  }
}
