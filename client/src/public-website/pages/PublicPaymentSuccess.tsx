import { useLanguage } from "../i18n/LanguageContext";
import { CheckCircle, Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicPaymentSuccess() {
  const { language } = useLanguage();
  
  const urlParams = new URLSearchParams(window.location.search);
  const reservationId = urlParams.get("reservation");
  const trackingToken = urlParams.get("token");

  const content = {
    tr: {
      title: "Odeme Basarili",
      description: "Rezervasyonunuz icin odeme basariyla tamamlandi.",
      reservationLabel: "Rezervasyon No:",
      homeButton: "Ana Sayfaya Don",
      trackButton: "Rezervasyonu Takip Et",
      thankYou: "Tesekkur ederiz! Rezervasyonunuz onaylandi ve odemeniz alindi."
    },
    en: {
      title: "Payment Successful",
      description: "Your payment has been successfully completed.",
      reservationLabel: "Reservation No:",
      homeButton: "Back to Home",
      trackButton: "Track Reservation",
      thankYou: "Thank you! Your reservation is confirmed and your payment has been received."
    }
  };

  const c = content[language as keyof typeof content] || content.tr;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              {c.title}
            </h1>
            <p className="text-muted-foreground">
              {c.description}
            </p>
          </div>

          {reservationId && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">{c.reservationLabel}</p>
              <p className="text-lg font-semibold" data-testid="text-reservation-id">#{reservationId}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-6">
            {c.thankYou}
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild data-testid="button-home">
              <a href={`/${language}`}>
                <Home className="mr-2 h-4 w-4" />
                {c.homeButton}
              </a>
            </Button>
            {trackingToken && (
              <Button variant="outline" asChild data-testid="button-track">
                <a href={`/${language}/${language === "tr" ? "takip" : "track"}?token=${trackingToken}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {c.trackButton}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
