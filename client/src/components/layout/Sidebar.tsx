import { Link, useLocation } from "wouter";
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
  Code
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { href: "/", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/calendar", label: "Takvim & Kapasite", icon: Calendar },
  { href: "/reservations", label: "Rezervasyonlar", icon: Ticket },
  { href: "/activities", label: "Aktiviteler", icon: Activity },
  { href: "/package-tours", label: "Paket Turlar", icon: Package },
  { href: "/finance", label: "Finans & Acentalar", icon: Calculator },
  { href: "/messages", label: "Mesaj Geçmişi", icon: MessageCircle },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

// Quick access buttons at the top
const quickAccessItems = [
  { href: "/bot-test", label: "Bot Test", icon: MessageCircle },
  { href: "/holidays", label: "Tatiller", icon: CalendarHeart },
];

export function Sidebar() {
  const [location] = useLocation();

  const { data: logoSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'sidebarLogo'],
    queryFn: async () => {
      const res = await fetch('/api/settings/sidebarLogo');
      return res.json();
    },
    staleTime: 60000,
  });

  const logoUrl = logoSetting?.value;

  return (
    <>
      {/* Mobile Menu */}
      <div className="md:hidden p-4 border-b flex items-center justify-between bg-white dark:bg-card">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-8 w-auto" data-testid="img-sidebar-logo-mobile" />
        ) : (
          <div className="font-display font-bold text-xl text-primary">My Smartur</div>
        )}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <nav className="flex flex-col gap-2 mt-8">
              {/* Quick Access Buttons for Mobile */}
              <div className="flex gap-2 mb-3 pb-3 border-b">
                {quickAccessItems.map((item) => (
                  <Link key={item.href} href={item.href} className="flex-1">
                    <div className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                      location === item.href 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    )}>
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                  </Link>
                ))}
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
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="h-5 w-5" />
              </span>
              My Smartur
            </div>
          )}
        </div>

        {/* Quick Access Buttons */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {quickAccessItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                  location === item.href 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )} data-testid={`button-quick-${item.href.replace('/', '')}`}>
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

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
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              WhatsApp Bot Aktif
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mt-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              WooCommerce Bağlı
            </div>
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
          <Link href="/bot-rules">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
              location === "/bot-rules"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )} data-testid="link-developer-login">
              <Code className="h-4 w-4" />
              Geliştirici Girişi
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
