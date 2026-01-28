import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantSettings {
  id: number;
  tenantId: number;
  whatsappPhoneNumber: string | null;
  companyName: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioWhatsappNumber: string | null;
  botEnabled: boolean | null;
  botSystemPrompt: string | null;
  licenseStatus?: string;
  licenseType?: string;
  subscriptionEndDate?: string;
}

export function AppFooter() {
  const { data: settings } = useQuery<TenantSettings>({
    queryKey: ["/api/settings"],
  });

  const isBotEnabled = settings?.botEnabled === true;

  const getLicenseStatusInfo = () => {
    const status = settings?.licenseStatus || 'trial';
    const type = settings?.licenseType || 'trial';
    const endDate = settings?.subscriptionEndDate;
    
    let daysRemaining = 0;
    if (endDate) {
      const end = new Date(endDate);
      const now = new Date();
      daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const typeLabels: Record<string, string> = {
      trial: 'Deneme',
      basic: 'Başlangıç',
      professional: 'Profesyonel',
      enterprise: 'Kurumsal'
    };

    if (status === 'active') {
      if (daysRemaining <= 7 && daysRemaining > 0) {
        return {
          text: `${typeLabels[type]} (${daysRemaining} gün)`,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-500',
          isActive: true
        };
      }
      return {
        text: typeLabels[type],
        color: 'text-accent',
        bgColor: 'bg-accent',
        isActive: true
      };
    }

    if (status === 'expired') {
      return {
        text: 'Süresi Doldu',
        color: 'text-destructive',
        bgColor: 'bg-destructive',
        isActive: false
      };
    }

    if (status === 'cancelled') {
      return {
        text: 'İptal Edildi',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted-foreground',
        isActive: false
      };
    }

    return {
      text: 'Deneme',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted-foreground',
      isActive: false
    };
  };

  const licenseStatusInfo = getLicenseStatusInfo();

  return (
    <footer className="fixed bottom-0 left-0 right-0 xl:left-64 h-10 bg-background border-t z-40 flex items-center justify-center gap-6 px-4" data-testid="app-footer">
      <Link href="/settings?tab=whatsapp">
        <div className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity" data-testid="footer-whatsapp-status">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isBotEnabled ? "bg-accent animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-foreground">WhatsApp Bot</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-semibold",
            isBotEnabled ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}>
            {isBotEnabled ? "Aktif" : "Kapalı"}
          </span>
        </div>
      </Link>
      
      <div className="w-px h-4 bg-border" />
      
      <Link href="/subscription">
        <div 
          className={cn(
            "flex items-center gap-2 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
            licenseStatusInfo.color
          )}
          data-testid="footer-license-status"
        >
          <div className={cn("w-2 h-2 rounded-full", licenseStatusInfo.bgColor, licenseStatusInfo.isActive && "animate-pulse")} />
          <Shield className="h-3 w-3" />
          {licenseStatusInfo.text}
        </div>
      </Link>
    </footer>
  );
}
