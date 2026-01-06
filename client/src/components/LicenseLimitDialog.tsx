import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, MessageSquarePlus } from "lucide-react";
import { useLocation } from "wouter";

interface LicenseLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage: string;
  limitType?: 'activity' | 'reservation' | 'user' | 'general';
}

export function LicenseLimitDialog({ 
  open, 
  onOpenChange, 
  errorMessage,
  limitType = 'general'
}: LicenseLimitDialogProps) {
  const [, navigate] = useLocation();

  const getLimitTypeTitle = () => {
    switch (limitType) {
      case 'activity':
        return 'Aktivite Limiti';
      case 'reservation':
        return 'Rezervasyon Limiti';
      case 'user':
        return 'Kullanici Limiti';
      default:
        return 'Plan Limiti';
    }
  };

  const getLimitTypeDescription = () => {
    switch (limitType) {
      case 'activity':
        return 'Mevcut paketinizde tanimlayabileceginiz aktivite sayisina ulastiniz.';
      case 'reservation':
        return 'Mevcut paketinizde olusturabileceginiz rezervasyon sayisina ulastiniz.';
      case 'user':
        return 'Mevcut paketinizde ekleyebileceginiz kullanici sayisina ulastiniz.';
      default:
        return 'Mevcut paketinizdeki bir limite ulastiniz.';
    }
  };

  const handleSupportClick = () => {
    onOpenChange(false);
    navigate('/support');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle data-testid="text-limit-error-title">
              {getLimitTypeTitle()}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-4 space-y-3">
            <p className="font-medium text-foreground" data-testid="text-limit-error-message">
              {errorMessage}
            </p>
            <p className="text-muted-foreground">
              {getLimitTypeDescription()}
            </p>
            <div className="p-3 rounded-md bg-muted/50 border">
              <p className="text-sm">
                Paketinizi yukseltmek icin destek ekibimizle iletisime gecebilirsiniz. 
                Size en uygun paketi belirleyerek hizli bir sekilde yukseltme yapilmasini saglayacagiz.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel data-testid="button-limit-dialog-close">
            Kapat
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSupportClick}
            className="gap-2"
            data-testid="button-limit-dialog-support"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Destek Talebi Olustur
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function parseLicenseError(error: any): { 
  isLicenseError: boolean; 
  message: string; 
  limitType: 'activity' | 'reservation' | 'user' | 'general';
} {
  try {
    let errorMessage = 'Bir hata olustu';
    let licenseStatus: string | undefined;
    let limitTypeFromResponse: string | undefined;
    
    if (error instanceof Error) {
      const match = error.message.match(/^(\d+):\s*(.+)$/);
      if (match) {
        const statusCode = parseInt(match[1]);
        const body = match[2];
        
        try {
          const parsed = JSON.parse(body);
          errorMessage = parsed.error || errorMessage;
          licenseStatus = parsed.licenseStatus;
          limitTypeFromResponse = parsed.limitType;
        } catch {
          errorMessage = body;
        }
        
        if (statusCode === 403 || statusCode === 429) {
          licenseStatus = licenseStatus || 'limit';
        }
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'object') {
      const errorData = error?.response?.data || error?.data || error;
      errorMessage = errorData?.error || error?.message || errorMessage;
      licenseStatus = errorData?.licenseStatus;
      limitTypeFromResponse = errorData?.limitType;
    }
    
    if (licenseStatus || limitTypeFromResponse === 'daily_reservation') {
      let limitType: 'activity' | 'reservation' | 'user' | 'general' = 'general';
      
      const lowerMessage = errorMessage.toLowerCase();
      if (lowerMessage.includes('aktivite')) {
        limitType = 'activity';
      } else if (lowerMessage.includes('rezervasyon')) {
        limitType = 'reservation';
      } else if (lowerMessage.includes('kullanici') || lowerMessage.includes('kullanıcı')) {
        limitType = 'user';
      }
      
      return { isLicenseError: true, message: errorMessage, limitType };
    }
    
    return { isLicenseError: false, message: errorMessage, limitType: 'general' };
  } catch {
    return { isLicenseError: false, message: 'Bir hata olustu', limitType: 'general' };
  }
}
