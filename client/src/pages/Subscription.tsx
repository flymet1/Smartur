import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/layout/Sidebar";
import { 
  Check, 
  Star, 
  CreditCard,
  Activity,
  Users,
  MessageSquare,
  Zap,
  Package,
  Settings2,
  Crown,
  ArrowRight
} from "lucide-react";
import type { SubscriptionPlan, License } from "@shared/schema";

const FEATURE_LABELS: Record<string, { label: string; icon: typeof Activity }> = {
  basic_calendar: { label: "Temel Takvim", icon: Activity },
  manual_reservations: { label: "Manuel Rezervasyon", icon: Activity },
  whatsapp_notifications: { label: "WhatsApp Bildirim", icon: MessageSquare },
  basic_reports: { label: "Temel Raporlar", icon: Activity },
  advanced_reports: { label: "Gelişmiş Raporlar", icon: Activity },
  ai_bot: { label: "AI Bot", icon: Zap },
  woocommerce: { label: "WooCommerce", icon: CreditCard },
  package_tours: { label: "Paket Turlar", icon: Package },
  api_access: { label: "API Erişimi", icon: Settings2 },
  priority_support: { label: "Öncelikli Destek", icon: Star },
  custom_branding: { label: "Özel Marka", icon: Crown },
};

export default function Subscription() {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  type LicenseData = {
    license: License | null;
    usage: { activitiesUsed: number; reservationsThisMonth: number };
    status: { valid: boolean; message: string };
  };

  const { data: licenseData } = useQuery<LicenseData>({
    queryKey: ["/api/license"],
  });

  const activePlans = plans.filter(p => p.isActive && p.code !== "trial");

  const formatPrice = (amount: number | null | undefined) => {
    if (!amount) return "0";
    return (amount / 100).toLocaleString("tr-TR");
  };

  const getFeatures = (plan: SubscriptionPlan) => {
    try {
      return JSON.parse(plan.features || "[]");
    } catch {
      return [];
    }
  };

  const handleSelectPlan = (planId: number) => {
    setSelectedPlan(planId);
  };

  const currentPlan = licenseData?.license?.planType;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Abonelik Planları</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            İşletmenize en uygun planı seçin ve Smartur'un tüm özelliklerinden yararlanın.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Aylık
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-toggle"
            />
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yıllık
              <Badge variant="secondary" className="ml-2">%20 Tasarruf</Badge>
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Planlar yükleniyor...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {activePlans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.code;
              const monthlyPrice = isYearly 
                ? Math.round((plan.yearlyPriceTl || 0) / 12)
                : plan.priceTl || 0;
              const monthlyPriceUsd = isYearly 
                ? Math.round((plan.yearlyPriceUsd || 0) / 12)
                : plan.priceUsd || 0;

              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col ${plan.isPopular ? "border-primary border-2 shadow-lg" : ""} ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}
                  data-testid={`card-plan-${plan.code}`}
                >
                  {plan.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      En Popüler
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold">
                        {formatPrice(monthlyPrice)}
                        <span className="text-lg font-normal text-muted-foreground"> TL</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${formatPrice(monthlyPriceUsd)}/ay
                      </div>
                      {isYearly && (
                        <div className="text-xs text-green-600 mt-1">
                          Yıllık toplamda {formatPrice(plan.yearlyPriceTl)} TL
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span>{plan.maxActivities === 9999 ? "Sınırsız" : plan.maxActivities} aktivite</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{plan.maxReservationsPerMonth === 99999 ? "Sınırsız" : plan.maxReservationsPerMonth?.toLocaleString()} rezervasyon/ay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span>{plan.maxWhatsappNumbers} WhatsApp numarası</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{plan.maxUsers} kullanıcı</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      {getFeatures(plan).map((featureKey: string) => {
                        const feature = FEATURE_LABELS[featureKey];
                        if (!feature) return null;
                        return (
                          <div key={featureKey} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>{feature.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>

                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button className="w-full" variant="secondary" disabled>
                        Mevcut Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant={plan.isPopular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan.id)}
                        data-testid={`button-select-plan-${plan.code}`}
                      >
                        {selectedPlan === plan.id ? (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Ödemeye Geç
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          "Planı Seç"
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {selectedPlan && (
          <Card className="mt-8 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ödeme Bilgileri
              </CardTitle>
              <CardDescription>
                PayTR entegrasyonu yakında aktif olacak. Şimdilik manuel ödeme yapabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Bilgi:</strong> Kredi kartı ile ödeme özelliği yakında aktif olacaktır. 
                  Şimdilik bizimle iletişime geçerek manuel ödeme yapabilirsiniz.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Banka Havalesi</h4>
                  <p className="text-sm text-muted-foreground">
                    Banka hesap bilgilerimiz için bizimle iletişime geçin.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">WhatsApp ile İletişim</h4>
                  <p className="text-sm text-muted-foreground">
                    +90 XXX XXX XX XX numarasından bize ulaşın.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>Tüm planlar 14 günlük ücretsiz deneme süresi içerir.</p>
          <p className="mt-1">Sorularınız için destek ekibimizle iletişime geçebilirsiniz.</p>
        </div>
      </main>
    </div>
  );
}
