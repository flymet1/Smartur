import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { XCircle, Home, RotateCcw, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "../utils";

export default function PublicPaymentFailed() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const reservationId = urlParams.get("reservation");
  const trackingToken = urlParams.get("token");
  const errorMessage = urlParams.get("error");

  const content = {
    tr: {
      title: "Odeme Basarisiz",
      description: "Odeme islemi tamamlanamadi.",
      errorLabel: "Hata:",
      reservationLabel: "Rezervasyon No:",
      homeButton: "Ana Sayfaya Don",
      retryButton: "Tekrar Dene",
      contactButton: "Bize Ulasin",
      helpText: "Sorun devam ederse lutfen bizimle iletisime gecin.",
      trackButton: "Rezervasyonu Takip Et"
    },
    en: {
      title: "Payment Failed",
      description: "Your payment could not be completed.",
      errorLabel: "Error:",
      reservationLabel: "Reservation No:",
      homeButton: "Back to Home",
      retryButton: "Try Again",
      contactButton: "Contact Us",
      helpText: "If the problem persists, please contact us.",
      trackButton: "Track Reservation"
    }
  };

  const c = content[language as keyof typeof content] || content.tr;

  const handleRetry = async () => {
    if (!reservationId) return;
    
    setIsRetrying(true);
    try {
      const response = await apiRequest("POST", getApiUrl("/api/website/payment/initialize"), {
        reservationId: parseInt(reservationId),
      });
      const data = await response.json();
      
      if (data.success && data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
      } else {
        toast({
          title: language === "tr" ? "Hata" : "Error",
          description: data.error || (language === "tr" ? "Odeme sayfasi acilamadi." : "Could not open payment page."),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: language === "tr" ? "Hata" : "Error",
        description: error.message || (language === "tr" ? "Odeme baslatilamadi." : "Could not initiate payment."),
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-red-950/20 dark:to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
              {c.title}
            </h1>
            <p className="text-muted-foreground">
              {c.description}
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{c.errorLabel}</p>
              <p className="text-sm text-red-700 dark:text-red-300" data-testid="text-error-message">
                {decodeURIComponent(errorMessage)}
              </p>
            </div>
          )}

          {reservationId && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">{c.reservationLabel}</p>
              <p className="text-lg font-semibold" data-testid="text-reservation-id">#{reservationId}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-6">
            {c.helpText}
          </p>

          <div className="flex flex-col gap-3">
            {reservationId && (
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                data-testid="button-retry"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === "tr" ? "Yukleniyor..." : "Loading..."}
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {c.retryButton}
                  </>
                )}
              </Button>
            )}
            {trackingToken && (
              <Button variant="outline" asChild data-testid="button-track">
                <a href={`/${language}/${language === "tr" ? "takip" : "track"}?token=${trackingToken}`}>
                  {c.trackButton}
                </a>
              </Button>
            )}
            <Button variant="outline" asChild data-testid="button-home">
              <a href={`/${language}`}>
                <Home className="mr-2 h-4 w-4" />
                {c.homeButton}
              </a>
            </Button>
            <Button variant="ghost" asChild data-testid="button-contact">
              <a href={`/${language}/${language === "tr" ? "iletisim" : "contact"}`}>
                <Phone className="mr-2 h-4 w-4" />
                {c.contactButton}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
