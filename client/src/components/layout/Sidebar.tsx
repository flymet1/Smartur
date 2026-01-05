import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  Ticket, 
  Activity, 
  Settings,
  MessageCircle,
  Menu,
  Calculator,
  Package,
  CalendarHeart,
  BookOpen,
  HelpCircle,
  Building2,
  Bell,
  Shield,
  Megaphone,
  X,
  AlertTriangle,
  Info,
  AlertCircle,
  LogIn,
  LogOut,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import type { SupportRequest, CustomerRequest } from "@shared/schema";

const navItems = [
  { href: "/", label: "Rezervasyonlar", icon: Ticket },
  { href: "/calendar", label: "Kapasite", icon: Calendar },
  { href: "/activities", label: "Aktiviteler", icon: Activity },
  { href: "/package-tours", label: "Paket Turlar", icon: Package },
  { href: "/finance", label: "Finans", icon: Calculator },
  { href: "/agencies", label: "Acentalar", icon: Building2 },
  { href: "/messages", label: "WhatsApp", icon: MessageCircle },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

// Quick access buttons at the top (Talepler and Destek only)
const quickAccessItems = [
  { href: "/customer-requests", label: "Talepler", icon: MessageCircle },
];

type SupportSummary = {
  openCount: number;
  requests: SupportRequest[];
};

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean | null;
  createdAt: string | null;
}

interface UserData {
  id: number;
  username: string;
  name: string | null;
  companyName: string | null;
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

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

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('userRoles');
    setCurrentUser(null);
    setLocation('/login');
  };

  const { data: logoSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'sidebarLogo'],
    queryFn: async () => {
      const res = await fetch('/api/settings/sidebarLogo');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: supportSummary } = useQuery<SupportSummary>({
    queryKey: ['/api/support-requests/summary'],
    refetchInterval: 30000,
  });

  const { data: customerRequests } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    refetchInterval: 30000,
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
    refetchInterval: 60000,
  });

  // Filter active and not dismissed announcements
  const activeAnnouncements = announcements.filter(
    a => a.isActive !== false && !dismissedAnnouncements.includes(a.id)
  );

  const dismissAnnouncement = (id: number) => {
    setDismissedAnnouncements(prev => [...prev, id]);
  };

  const getAnnouncementStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'success':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      default:
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // License data for sidebar status
  type LicenseData = {
    license: unknown;
    usage: unknown;
    status: {
      valid: boolean;
      message: string;
      status?: 'active' | 'warning' | 'grace' | 'suspended' | 'expired';
      daysRemaining?: number;
      graceDaysRemaining?: number;
      canWrite?: boolean;
    };
  };
  
  const { data: licenseData, isLoading: isLicenseLoading } = useQuery<LicenseData>({
    queryKey: ['/api/license'],
    refetchInterval: 60000, // Check every minute
  });

  const openSupportCount = supportSummary?.openCount || 0;
  const pendingCustomerRequestsCount = customerRequests?.filter(r => r.status === 'pending').length || 0;
  const logoUrl = logoSetting?.value;

  // License status helper
  const getLicenseStatusInfo = () => {
    // Show neutral state while loading
    if (isLicenseLoading || !licenseData?.status) {
      return { text: 'Uyelik Durumu', color: 'text-muted-foreground', bgColor: 'bg-muted-foreground', isActive: false, isLoading: true };
    }
    
    const { valid, status, daysRemaining } = licenseData.status;
    
    if (!valid || status === 'expired' || status === 'suspended' || status === 'grace') {
      return { text: 'Yenileme Gerekli', color: 'text-red-600', bgColor: 'bg-red-500', isActive: false, isLoading: false };
    }
    
    // Active license - show days remaining with color coding
    if (daysRemaining !== undefined) {
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
    
    return { text: 'Aktif', color: 'text-accent-foreground', bgColor: 'bg-accent', isActive: true, isLoading: false };
  };

  const licenseStatusInfo = getLicenseStatusInfo();

  return (
    <>
      {/* Mobile Menu */}
      <div className="md:hidden p-4 border-b flex items-center justify-between bg-white dark:bg-card">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-8 w-auto" data-testid="img-sidebar-logo-mobile" />
        ) : (
          <div className="font-display font-bold text-xl text-primary flex items-center gap-1.5">
            <span className="w-6 h-6 rounded bg-accent flex items-center justify-center text-accent-foreground">
              <Activity className="h-4 w-4" />
            </span>
            Smartur
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
              {/* Quick Access Buttons for Mobile */}
              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
                {quickAccessItems.map((item) => (
                  <Link key={item.href} href={item.href} className="flex-1">
                    <div className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border relative",
                      pendingCustomerRequestsCount > 0 && item.href === "/customer-requests"
                        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
                        : location === item.href 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    )}>
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                      {item.href === "/customer-requests" && pendingCustomerRequestsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                        >
                          {pendingCustomerRequestsCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
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
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location === item.href 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              ))}
              
              {/* Mobile Login/Logout */}
              <div className="mt-4 pt-4 border-t">
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{currentUser.name || currentUser.username}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={handleLogout}
                      data-testid="button-logout-mobile"
                    >
                      <LogOut className="h-4 w-4" />
                      Cikis Yap
                    </Button>
                  </div>
                ) : (
                  <Link href="/login">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full justify-start gap-2"
                      data-testid="button-login-mobile"
                    >
                      <LogIn className="h-4 w-4" />
                      Giris Yap
                    </Button>
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
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-auto" data-testid="img-sidebar-logo" />
          ) : (
            <div className="font-display font-bold text-2xl text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
                <Activity className="h-5 w-5" />
              </span>
              Smartur
            </div>
          )}
        </div>

        {/* Quick Access Buttons */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {quickAccessItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border relative",
                  pendingCustomerRequestsCount > 0 && item.href === "/customer-requests"
                    ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
                    : location === item.href 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )} data-testid={`button-quick-${item.href.replace('/', '')}`}>
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {item.href === "/customer-requests" && pendingCustomerRequestsCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                      data-testid="badge-customer-requests"
                    >
                      {pendingCustomerRequestsCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            <Link href="/messages?filter=human_intervention">
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

        {/* Announcements */}
        {activeAnnouncements.length > 0 && (
          <div className="px-4 pb-3 space-y-2">
            {activeAnnouncements.slice(0, 2).map((announcement) => (
              <div
                key={announcement.id}
                className={cn(
                  "p-3 rounded-lg border text-xs relative",
                  getAnnouncementStyle(announcement.type)
                )}
                data-testid={`announcement-${announcement.id}`}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 h-5 w-5 opacity-60 hover:opacity-100"
                  onClick={() => dismissAnnouncement(announcement.id)}
                  data-testid={`button-dismiss-announcement-${announcement.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="flex items-start gap-2 pr-5">
                  {getAnnouncementIcon(announcement.type)}
                  <div>
                    <div className="font-medium">{announcement.title}</div>
                    <div className="opacity-80 mt-0.5">{announcement.content}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 px-4 py-4 space-y-1 border-t">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                location === item.href 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  location === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )} />
                {item.label}
              </div>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t space-y-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Sistem Durumu</div>
            <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-foreground">WhatsApp Bot</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-semibold">Aktif</span>
            </div>
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

          {/* User Login/Logout Section */}
          <div className="mt-3 pt-3 border-t">
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" data-testid="text-current-user-name">
                      {currentUser.name || currentUser.username}
                    </div>
                    {currentUser.companyName && (
                      <div className="text-xs text-muted-foreground truncate" data-testid="text-current-user-company">
                        {currentUser.companyName}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  Cikis Yap
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start gap-2"
                  data-testid="button-login"
                >
                  <LogIn className="h-4 w-4" />
                  Giris Yap
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
