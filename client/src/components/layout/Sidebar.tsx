import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Ticket, 
  Activity, 
  Settings,
  MessageCircle,
  Menu,
  Calculator,
  Package,
  Building2,
  Bell,
  Shield,
  LogIn,
  LogOut,
  User,
  CreditCard,
  BookOpen,
  HelpCircle,
  BarChart2,
  Handshake,
  Eye,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import type { SupportRequest, CustomerRequest, ReservationRequest } from "@shared/schema";
import { usePermissions, PERMISSION_KEYS } from "@/hooks/use-permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermission?: string;
  viewerOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { href: "/", label: "Rezervasyonlar", icon: Ticket, requiredPermission: PERMISSION_KEYS.RESERVATIONS_VIEW },
  { href: "/calendar", label: "Kapasite", icon: Calendar, requiredPermission: PERMISSION_KEYS.CALENDAR_VIEW },
  { href: "/musaitlik", label: "Musaitlik", icon: Eye, requiredPermission: PERMISSION_KEYS.CAPACITY_VIEW, viewerOnly: true },
  { href: "/viewer-stats", label: "Izleyiciler", icon: Eye, requiredPermission: PERMISSION_KEYS.RESERVATIONS_VIEW },
  { href: "/partner-availability", label: "Partnerler", icon: Handshake, requiredPermission: PERMISSION_KEYS.RESERVATIONS_VIEW },
  { href: "/activities", label: "Aktiviteler", icon: Activity, requiredPermission: PERMISSION_KEYS.ACTIVITIES_VIEW },
  { href: "/package-tours", label: "Paket Turlar", icon: Package, requiredPermission: PERMISSION_KEYS.ACTIVITIES_VIEW },
  { href: "/finance", label: "Finans & Acentalar", icon: Calculator, requiredPermission: PERMISSION_KEYS.FINANCE_VIEW },
  { href: "/messages", label: "WhatsApp", icon: MessageCircle, requiredPermission: PERMISSION_KEYS.WHATSAPP_VIEW },
  { href: "/settings", label: "Ayarlar", icon: Settings, requiredPermission: PERMISSION_KEYS.SETTINGS_VIEW },
];

// Quick access buttons at the top (Talepler and Destek)
const quickAccessItems = [
  { href: "/customer-requests", label: "Talepler", icon: MessageCircle },
];

type SupportSummary = {
  openCount: number;
  requests: SupportRequest[];
};

interface UserData {
  id: number;
  username: string;
  name: string | null;
  companyName: string | null;
  membershipType?: string | null;
  membershipStartDate?: string | null;
  membershipEndDate?: string | null;
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const { permissions, hasPermission, hasAnyPermission } = usePermissions();

  // Check if user is a "viewer" (İzleyici) - only has capacity.view and no other main permissions
  const isViewerOnly = useMemo(() => {
    const mainPermissions = [
      PERMISSION_KEYS.RESERVATIONS_VIEW,
      PERMISSION_KEYS.ACTIVITIES_VIEW,
      PERMISSION_KEYS.SETTINGS_VIEW,
      PERMISSION_KEYS.WHATSAPP_VIEW,
      PERMISSION_KEYS.FINANCE_VIEW,
      PERMISSION_KEYS.AGENCIES_VIEW,
      PERMISSION_KEYS.USERS_VIEW,
    ];
    // Has capacity.view but no other main permissions
    return hasPermission(PERMISSION_KEYS.CAPACITY_VIEW) && !hasAnyPermission(mainPermissions);
  }, [permissions, hasPermission, hasAnyPermission]);

  // Filter nav items based on user permissions
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      // If item is viewer-only, only show to viewers
      if (item.viewerOnly && !isViewerOnly) return false;
      if (!item.requiredPermission) return true;
      return permissions.includes(item.requiredPermission);
    });
  }, [permissions, isViewerOnly]);

  // Check for logged in user on mount and when localStorage changes
  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          setCurrentUser(JSON.parse(userData));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };
    
    checkUser();
    
    // Listen for storage changes
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
    }
    
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('userRoles');
    localStorage.removeItem('tenantData');
    setCurrentUser(null);
    window.location.href = '/login';
  };

  const { data: logoSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'sidebarLogo'],
    queryFn: async () => {
      const res = await fetch('/api/settings/sidebarLogo');
      return res.json();
    },
    staleTime: 60000,
  });

  // Load brand settings
  const { data: brandSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'brandSettings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/brandSettings');
      return res.json();
    },
    staleTime: 60000,
  });

  // Load bot access settings to check if bot is enabled
  const { data: botAccessSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'botAccess'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botAccess');
      return res.json();
    },
    staleTime: 30000,
  });

  // Parse bot enabled status
  const isBotEnabled = (() => {
    if (botAccessSettings?.value) {
      try {
        const settings = JSON.parse(botAccessSettings.value);
        return settings.enabled !== false; // Default to true if not set
      } catch {
        return true;
      }
    }
    return true; // Default to true if no settings
  })();

  // Apply brand colors to CSS custom properties
  useEffect(() => {
    if (brandSettings?.value) {
      try {
        const settings = JSON.parse(brandSettings.value);
        
        // Validate hex color format
        const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);
        
        // Convert hex to HSL for CSS custom property
        const hexToHsl = (hex: string) => {
          if (!isValidHex(hex)) return null;
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h = 0, s = 0;
          const l = (max + min) / 2;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
              case g: h = ((b - r) / d + 2) / 6; break;
              case b: h = ((r - g) / d + 4) / 6; break;
            }
          }
          return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };
        
        if (settings.primaryColor) {
          const hsl = hexToHsl(settings.primaryColor);
          if (hsl) {
            document.documentElement.style.setProperty('--primary', hsl);
          }
        }
        if (settings.accentColor) {
          const hsl = hexToHsl(settings.accentColor);
          if (hsl) {
            document.documentElement.style.setProperty('--accent', hsl);
          }
        }
      } catch {}
    }
  }, [brandSettings]);

  const { data: supportSummary } = useQuery<SupportSummary>({
    queryKey: ['/api/support-requests/summary'],
    refetchInterval: 30000,
  });

  const { data: customerRequests } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    refetchInterval: 30000,
  });

  // Fetch pending reservation requests (from partners/viewers)
  const { data: reservationRequests } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
    enabled: !isViewerOnly, // Only fetch for operators/managers
  });

  const openSupportCount = supportSummary?.openCount || 0;
  const pendingCustomerRequestsCount = customerRequests?.filter(r => r.status === 'pending').length || 0;
  
  // Separate counts: İş Ortakları (viewer requests) vs Partner Acentalar (partner requests)
  const pendingViewerRequestsCount = reservationRequests?.filter(r => r.status === 'pending' && !r.notes?.startsWith('[Partner:')).length || 0;
  const pendingPartnerRequestsCount = reservationRequests?.filter(r => r.status === 'pending' && r.notes?.startsWith('[Partner:')).length || 0;
  const logoUrl = logoSetting?.value;
  
  // Get company name from brand settings
  const brandCompanyName = (() => {
    if (brandSettings?.value) {
      try {
        const settings = JSON.parse(brandSettings.value);
        return settings.companyName || "Smartur";
      } catch {
        return "Smartur";
      }
    }
    return "Smartur";
  })();
  
  // Get brand logo URL if set
  const brandLogoUrl = (() => {
    if (brandSettings?.value) {
      try {
        const settings = JSON.parse(brandSettings.value);
        return settings.logoUrl || null;
      } catch {
        return null;
      }
    }
    return null;
  })();

  // License status helper
  const getLicenseStatusInfo = () => {
    // If user is logged in, check their membership
    if (currentUser) {
      // Unlimited membership (membershipEndDate is null)
      if (!currentUser.membershipEndDate) {
        return { 
          text: 'Aktif / Süresiz', 
          color: 'text-accent-foreground', 
          bgColor: 'bg-accent',
          isActive: true,
          isLoading: false
        };
      }
      
      // Has an end date - calculate remaining days
      const endDate = new Date(currentUser.membershipEndDate);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        return { text: 'Yenileme Gerekli', color: 'text-red-600', bgColor: 'bg-red-500', isActive: false, isLoading: false };
      }
      
      if (daysRemaining <= 7) {
        return { 
          text: `Aktif / ${daysRemaining} Gun Kaldi`, 
          color: 'text-red-600', 
          bgColor: 'bg-red-500',
          isActive: true,
          isLoading: false
        };
      } else if (daysRemaining <= 14) {
        return { 
          text: `Aktif / ${daysRemaining} Gun Kaldi`, 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-500',
          isActive: true,
          isLoading: false
        };
      } else {
        return { 
          text: `Aktif / ${daysRemaining} Gun Kaldi`, 
          color: 'text-accent-foreground', 
          bgColor: 'bg-accent',
          isActive: true,
          isLoading: false
        };
      }
    }
    
    // No user logged in - show neutral state
    return { text: 'Giriş Yapiniz', color: 'text-muted-foreground', bgColor: 'bg-muted', isActive: false, isLoading: false };
  };

  const licenseStatusInfo = getLicenseStatusInfo();

  return (
    <>
      {/* Mobile Menu */}
      <div className="md:hidden p-4 border-b flex items-center justify-between bg-white dark:bg-card">
        {(brandLogoUrl || logoUrl) ? (
          <img src={brandLogoUrl || logoUrl} alt="Logo" className="h-8 w-auto" data-testid="img-sidebar-logo-mobile" />
        ) : (
          <div className="font-display font-bold text-xl text-primary flex items-center gap-1.5">
            <span className="w-6 h-6 rounded bg-accent flex items-center justify-center text-accent-foreground">
              <Activity className="h-4 w-4" />
            </span>
            {brandCompanyName}
          </div>
        )}
        <Sheet>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent>Menüyü aç</TooltipContent>
          </Tooltip>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <nav className="flex flex-col gap-2 mt-8">
              {/* Quick Access Buttons for Mobile - Hidden for viewer-only users */}
              {!isViewerOnly && (
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
                  {quickAccessItems.map((item) => {
                    const hasPendingCount = 
                      (item.href === "/customer-requests" && pendingCustomerRequestsCount > 0) ||
                      (item.href === "/reservation-requests" && pendingViewerRequestsCount > 0);
                    const pendingCount = item.href === "/customer-requests" 
                      ? pendingCustomerRequestsCount 
                      : item.href === "/reservation-requests" 
                        ? pendingViewerRequestsCount 
                        : 0;
                    
                    return (
                      <Link key={item.href} href={item.href} className="flex-1">
                        <div className={cn(
                          "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border relative",
                          hasPendingCount
                            ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
                            : location === item.href 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        )}>
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                          {hasPendingCount && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                            >
                              {pendingCount}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  <Link href="/messages?filter=human_intervention" className="flex-1">
                    <div className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border relative",
                      openSupportCount > 0 
                        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" 
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    )}>
                      <Bell className="h-3.5 w-3.5" />
                      Destek
                      {openSupportCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                        >
                          {openSupportCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </div>
              )}
              {navItems.map((item) => {
                const hasViewerBadge = item.href === "/viewer-stats" && pendingViewerRequestsCount > 0;
                const hasPartnerBadge = item.href === "/partner-availability" && pendingPartnerRequestsCount > 0;
                const badgeCount = item.href === "/viewer-stats" ? pendingViewerRequestsCount : 
                                   item.href === "/partner-availability" ? pendingPartnerRequestsCount : 0;
                const isPartnerPage = item.href === "/partner-availability";
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                      location === item.href 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                      {isPartnerPage && logoUrl ? (
                        <img src={logoUrl} alt="" className="h-4 w-4 object-contain" />
                      ) : (
                        <item.icon className="h-4 w-4" />
                      )}
                      {item.label}
                      {(hasViewerBadge || hasPartnerBadge) && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                        >
                          {badgeCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
              
              {/* Viewer Profile Link - Only for İzleyici users */}
              {isViewerOnly && (
                <Link href="/partner-profile">
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location === "/partner-profile" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <User className="h-4 w-4" />
                    Profilim
                  </div>
                </Link>
              )}
              
              {/* Mobile Login/Logout */}
              <div className="mt-4 pt-4 border-t">
                {currentUser ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium flex-1">{currentUser.name || currentUser.username}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLogout();
                      }}
                      data-testid="button-logout-mobile"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Link href="/login">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
                      <LogIn className="h-4 w-4" />
                      Giriş Yap
                    </div>
                  </Link>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r bg-card h-screen fixed left-0 top-0">
        <div className="p-6">
          {(brandLogoUrl || logoUrl) ? (
            <img src={brandLogoUrl || logoUrl} alt="Logo" className="h-10 w-auto" data-testid="img-sidebar-logo" />
          ) : (
            <div className="font-display font-bold text-2xl text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
                <Activity className="h-5 w-5" />
              </span>
              {brandCompanyName}
            </div>
          )}
        </div>

        {/* Quick Access Buttons - Hidden for viewer-only users */}
        {!isViewerOnly && (
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              {quickAccessItems.map((item) => {
                const hasPendingCount = 
                  (item.href === "/customer-requests" && pendingCustomerRequestsCount > 0) ||
                  (item.href === "/reservation-requests" && pendingViewerRequestsCount > 0);
                const pendingCount = item.href === "/customer-requests" 
                  ? pendingCustomerRequestsCount 
                  : item.href === "/reservation-requests" 
                    ? pendingViewerRequestsCount 
                    : 0;
                
                return (
                  <Link key={item.href} href={item.href} className="flex-1">
                    <div className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border relative",
                      hasPendingCount
                        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
                        : location === item.href 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    )} data-testid={`button-quick-${item.href.replace('/', '')}`}>
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                      {hasPendingCount && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                          data-testid={`badge-${item.href.replace('/', '')}`}
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
              <Link href="/messages?filter=human_intervention" className="flex-1">
                <div className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border relative",
                  openSupportCount > 0 
                    ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" 
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )} data-testid="button-support-notifications">
                  <Bell className="h-3.5 w-3.5" />
                  Destek
                  {openSupportCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                      data-testid="badge-support-open"
                    >
                      {openSupportCount}
                    </Badge>
                  )}
                </div>
              </Link>
            </div>
          </div>
        )}

        <div className="flex-1 px-4 py-4 space-y-1 border-t overflow-y-auto">
          {navItems.map((item) => {
            const hasViewerBadge = item.href === "/viewer-stats" && pendingViewerRequestsCount > 0;
            const hasPartnerBadge = item.href === "/partner-availability" && pendingPartnerRequestsCount > 0;
            const badgeCount = item.href === "/viewer-stats" ? pendingViewerRequestsCount : 
                               item.href === "/partner-availability" ? pendingPartnerRequestsCount : 0;
            const isPartnerPage = item.href === "/partner-availability";
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group relative",
                  location === item.href 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  {isPartnerPage && logoUrl ? (
                    <img src={logoUrl} alt="" className="h-5 w-5 object-contain transition-transform group-hover:scale-110" />
                  ) : (
                    <item.icon className={cn(
                      "h-5 w-5 transition-transform group-hover:scale-110",
                      location === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    )} />
                  )}
                  {item.label}
                  {(hasViewerBadge || hasPartnerBadge) && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                      data-testid={hasViewerBadge ? "badge-viewer-requests" : "badge-partner-requests"}
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
          
          {/* Viewer Profile Link - Only for İzleyici users */}
          {isViewerOnly && (
            <Link href="/partner-profile">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                location === "/partner-profile" 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <User className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  location === "/partner-profile" ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )} />
                Profilim
              </div>
            </Link>
          )}
        </div>

        <div className="p-4 border-t space-y-3">
          {/* System Status and Links - Hidden for viewer-only users */}
          {!isViewerOnly && (
            <>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Sistem Durumu</div>
                <Link href="/settings?tab=whatsapp">
                  <div className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-whatsapp-bot-status">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isBotEnabled ? "bg-accent animate-pulse" : "bg-muted-foreground"
                    )} />
                    <span className="text-foreground">WhatsApp Bot</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-semibold",
                      isBotEnabled ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {isBotEnabled ? "Aktif" : "Kapalı"}
                    </span>
                  </div>
                </Link>
                <Link href="/subscription">
                  <div 
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium mt-1 cursor-pointer hover:opacity-80 transition-opacity",
                      licenseStatusInfo.color
                    )}
                    data-testid="link-license-status"
                  >
                    <div className={cn("w-2 h-2 rounded-full", licenseStatusInfo.bgColor, licenseStatusInfo.isActive && "animate-pulse")} />
                    <Shield className="h-3.5 w-3.5" />
                    {licenseStatusInfo.text}
                  </div>
                </Link>
              </div>
              <Link href="/user-guide">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  location === "/user-guide"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )} data-testid="link-user-guide">
                  <BookOpen className="h-4 w-4" />
                  Kullanım Kılavuzu
                </div>
              </Link>
              <Link href="/support">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  location === "/support"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )} data-testid="link-support">
                  <HelpCircle className="h-4 w-4" />
                  Destek
                </div>
              </Link>
            </>
          )}

          {/* User Login/Logout Section */}
          {currentUser ? (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" data-testid="text-current-user-name">
                  {currentUser.name || currentUser.username}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout();
                }}
                data-testid="button-logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                location === "/login"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )} data-testid="button-login">
                <LogIn className="h-4 w-4" />
                Giriş Yap
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
