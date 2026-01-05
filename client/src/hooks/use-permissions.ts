import { useMemo } from "react";

export function usePermissions() {
  const permissions = useMemo(() => {
    try {
      const stored = localStorage.getItem("userPermissions");
      return stored ? JSON.parse(stored) as string[] : [];
    } catch {
      return [];
    }
  }, []);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every(p => permissions.includes(p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

export const PERMISSION_KEYS = {
  DASHBOARD_VIEW: "dashboard.view",
  RESERVATIONS_VIEW: "reservations.view",
  RESERVATIONS_CREATE: "reservations.create",
  RESERVATIONS_EDIT: "reservations.edit",
  RESERVATIONS_DELETE: "reservations.delete",
  ACTIVITIES_VIEW: "activities.view",
  ACTIVITIES_MANAGE: "activities.manage",
  CALENDAR_VIEW: "calendar.view",
  CALENDAR_MANAGE: "calendar.manage",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  WHATSAPP_VIEW: "whatsapp.view",
  WHATSAPP_MANAGE: "whatsapp.manage",
  BOT_VIEW: "bot.view",
  BOT_MANAGE: "bot.manage",
  AGENCIES_VIEW: "agencies.view",
  AGENCIES_MANAGE: "agencies.manage",
  SUBSCRIPTION_VIEW: "subscription.view",
  SUBSCRIPTION_MANAGE: "subscription.manage",
} as const;
