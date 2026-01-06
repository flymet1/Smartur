import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  ArrowRight,
  Calendar,
  Clock,
  AlertTriangle
} from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

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

interface UserData {
  id?: number;
  membershipType?: string | null;
  membershipEndDate?: string | null;
  companyName?: string | null;
}

interface UsageStats {
  activitiesUsed: number;
  maxActivities: number;
  reservationsThisMonth: number;
  maxReservationsPerMonth: number;
  usersCount: number;
  maxUsers: number;
  daysRemaining: number | null;
  planName: string;
  dailyMessagesUsed: number;
  maxDailyMessages: number;
  dailyReservationsUsed: number;
  maxDailyReservations: number;
}

export default function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // Get current user's membership type from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: usageStats } = useQuery<UsageStats>({
    queryKey: ["/api/subscription/usage"],
    enabled: !!currentUser,
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

  const currentPlan = currentUser?.membershipType;

  const getProgressColor = (used: number, max: number) => {
    if (max === 0 || max >= 9999) return "bg-primary";
    const percent = (used / max) * 100;
    if (percent >= 90) return "bg-red-500";
    if (percent >= 75) return "bg-amber-500";
    return "bg-primary";
  };

  const formatLimit = (value: number) => {
    if (value >= 9999) return "Sınırsız";
    return value.toLocaleString("tr-TR");
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        {/* Current Usage Stats */}
        {usageStats && (
          <Card className="border-primary/20" data-testid="card-usage-stats">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Mevcut Kullanım
                  </CardTitle>
                  <CardDescription>
                    Plan: <span className="font-medium text-foreground">{usageStats.planName}</span>
                    {usageStats.daysRemaining !== null && (
                      <span className="ml-2">
                        {usageStats.daysRemaining > 0 ? (
                          <Badge variant={usageStats.daysRemaining <= 7 ? "destructive" : "secondary"}>
                            <Clock className="h-3 w-3 mr-1" />
                            {usageStats.daysRemaining} gün kaldı
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Süre doldu
                          </Badge>
                        )}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Activities */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      Aktiviteler
                    </span>
                    <span className="font-medium">
                      {usageStats.activitiesUsed} / {formatLimit(usageStats.maxActivities)}
                    </span>
                  </div>
                  <Progress 
                    value={usageStats.maxActivities >= 9999 ? 0 : (usageStats.activitiesUsed / usageStats.maxActivities) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Reservations This Month */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Aylık Rezervasyon
                    </span>
                    <span className="font-medium">
                      {usageStats.reservationsThisMonth} / {formatLimit(usageStats.maxReservationsPerMonth)}
                    </span>
                  </div>
                  <Progress 
                    value={usageStats.maxReservationsPerMonth >= 9999 ? 0 : (usageStats.reservationsThisMonth / usageStats.maxReservationsPerMonth) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Users */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Kullanıcılar
                    </span>
                    <span className="font-medium">
                      {usageStats.usersCount} / {formatLimit(usageStats.maxUsers)}
                    </span>
                  </div>
                  <Progress 
                    value={usageStats.maxUsers >= 9999 ? 0 : (usageStats.usersCount / usageStats.maxUsers) * 100} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Daily Usage Section */}
              <div className="grid gap-6 md:grid-cols-2 mt-4 pt-4 border-t">
                {/* Daily Messages */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Bugünkü Mesajlar
                    </span>
                    <span className="font-medium">
                      {usageStats.dailyMessagesUsed} / {formatLimit(usageStats.maxDailyMessages)}
                    </span>
                  </div>
                  <Progress 
                    value={usageStats.maxDailyMessages >= 9999 ? 0 : (usageStats.dailyMessagesUsed / usageStats.maxDailyMessages) * 100} 
                    className={`h-2 ${getProgressColor(usageStats.dailyMessagesUsed, usageStats.maxDailyMessages)}`}
                  />
                  <p className="text-xs text-muted-foreground">Günlük WhatsApp mesaj limiti (gece yarısı sıfırlanır)</p>
                </div>

                {/* Daily Reservations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Bugünkü Rezervasyonlar
                    </span>
                    <span className="font-medium">
                      {usageStats.dailyReservationsUsed} / {formatLimit(usageStats.maxDailyReservations)}
                    </span>
                  </div>
                  <Progress 
                    value={usageStats.maxDailyReservations >= 9999 ? 0 : (usageStats.dailyReservationsUsed / usageStats.maxDailyReservations) * 100} 
                    className={`h-2 ${getProgressColor(usageStats.dailyReservationsUsed, usageStats.maxDailyReservations)}`}
                  />
                  <p className="text-xs text-muted-foreground">Günlük rezervasyon limiti (gece yarısı sıfırlanır)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Abonelik Planları</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            İşletmenize en uygun planı seçin ve Smartur'un tüm özelliklerinden yararlanın.
          </p>
          <Badge variant="secondary">Yıllık Abonelik</Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Planlar yükleniyor...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {activePlans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.code;
              const yearlyPriceTl = plan.yearlyPriceTl || 0;
              const yearlyPriceUsd = plan.yearlyPriceUsd || 0;

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
                        {formatPrice(yearlyPriceTl)}
                        <span className="text-lg font-normal text-muted-foreground"> TL/yıl</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${formatPrice(yearlyPriceUsd)}/yıl
                      </div>
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
