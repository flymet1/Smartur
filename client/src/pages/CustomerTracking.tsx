import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Users, MapPin, CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";

interface TrackingData {
  customerName: string;
  activityName: string;
  date: string;
  time: string;
  quantity: number;
  status: string;
  priceTl: number;
  priceUsd: number;
  currency: string;
  orderNumber: string | null;
}

export default function CustomerTracking() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data: reservation, isLoading, error } = useQuery<TrackingData>({
    queryKey: ['/api/track', token],
    enabled: !!token,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (priceTl: number, priceUsd: number, currency: string) => {
    if (currency === 'USD' && priceUsd > 0) {
      return `$${priceUsd}`;
    }
    return `${priceTl.toLocaleString('tr-TR')} TL`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1" data-testid="badge-status-confirmed">
            <CheckCircle className="w-3 h-3" />
            Onaylandi
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 gap-1" data-testid="badge-status-pending">
            <AlertCircle className="w-3 h-3" />
            Beklemede
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 gap-1" data-testid="badge-status-cancelled">
            <XCircle className="w-3 h-3" />
            Iptal Edildi
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Rezervasyon bilgileri yukleniyor...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Rezervasyon Bulunamadi</h2>
            <p className="text-muted-foreground">
              Bu takip linki gecersiz veya suresi dolmus olabilir.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Sorulariniz icin bizimle iletisime gecebilirsiniz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg" data-testid="card-reservation-tracking">
        <CardHeader className="text-center border-b pb-6">
          <div className="mx-auto mb-4">
            {reservation.status === 'confirmed' ? (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            ) : reservation.status === 'pending' ? (
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl" data-testid="text-customer-name">
            Merhaba, {reservation.customerName}
          </CardTitle>
          <p className="text-muted-foreground mt-2">Rezervasyon Detaylari</p>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Durum</span>
            {getStatusBadge(reservation.status)}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium" data-testid="text-activity-name">{reservation.activityName}</p>
                {reservation.orderNumber && (
                  <p className="text-sm text-muted-foreground">Siparis No: {reservation.orderNumber}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium" data-testid="text-date">{formatDate(reservation.date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium" data-testid="text-time">{reservation.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium" data-testid="text-quantity">{reservation.quantity} Kisi</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Toplam Tutar</span>
              <span className="text-xl font-semibold" data-testid="text-price">
                {formatPrice(reservation.priceTl, reservation.priceUsd, reservation.currency)}
              </span>
            </div>
          </div>

          {reservation.status === 'confirmed' && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <p className="text-green-800 dark:text-green-300 text-sm">
                Rezervasyonunuz onaylandi! Belirtilen tarih ve saatte sizi bekliyoruz.
              </p>
            </div>
          )}

          {reservation.status === 'pending' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                Rezervasyonunuz beklemede. En kisa surede size donecegiz.
              </p>
            </div>
          )}

          {reservation.status === 'cancelled' && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <p className="text-red-800 dark:text-red-300 text-sm">
                Rezervasyonunuz iptal edilmistir. Sorulariniz icin bizimle iletisime gecebilirsiniz.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
