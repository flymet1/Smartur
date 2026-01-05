import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Users, MapPin, CheckCircle, AlertCircle, XCircle, Loader2, Edit3, Ban, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  defaultTimes: string[];
}

type RequestType = 'time_change' | 'cancellation' | 'other' | null;

export default function CustomerTracking() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { toast } = useToast();
  
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const { data: reservation, isLoading, error } = useQuery<TrackingData>({
    queryKey: ['/api/track', token],
    enabled: !!token,
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/customer-requests', {
        token,
        requestType,
        preferredTime: requestType === 'time_change' ? preferredTime : undefined,
        requestDetails: requestDetails || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      setRequestSent(true);
      setShowRequestForm(false);
      toast({
        title: "Talep Gönderildi",
        description: "Talebiniz başarıyla iletildi. En kısa sürede size döneceğiz.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Talep gönderilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
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
            Onaylandı
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
            İptal Edildi
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleRequestClick = (type: RequestType) => {
    setRequestType(type);
    setShowRequestForm(true);
    setPreferredTime("");
    setRequestDetails("");
  };

  const handleSubmitRequest = () => {
    if (!requestType) return;
    submitRequestMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Rezervasyon bilgileri yükleniyor...</p>
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
            <h2 className="text-xl font-semibold mb-2">Rezervasyon Bulunamadı</h2>
            <p className="text-muted-foreground">
              Bu takip linki geçersiz veya süresi dolmus olabilir.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Sorularınız için bizimle iletişime geçebilirsiniz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <Card data-testid="card-reservation-tracking">
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
            <p className="text-muted-foreground mt-2">Rezervasyon Detayları</p>
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
                    <p className="text-sm text-muted-foreground">Sipariş No: {reservation.orderNumber}</p>
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
                  <p className="font-medium" data-testid="text-quantity">{reservation.quantity} Kişi</p>
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
                  Rezervasyonunuz onaylandı! Belirtilen tarih ve saatte sizi bekliyoruz.
                </p>
              </div>
            )}

            {reservation.status === 'pending' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                <p className="text-amber-800 dark:text-amber-300 text-sm">
                  Rezervasyonunuz beklemede. En kısa sürede size döneceğiz.
                </p>
              </div>
            )}

            {reservation.status === 'cancelled' && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <p className="text-red-800 dark:text-red-300 text-sm">
                  Rezervasyonunuz iptal edilmiştir. Sorularınız için bizimle iletişime geçebilirsiniz.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Actions */}
        {reservation.status !== 'cancelled' && !requestSent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Talep Oluştur
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Rezervasyonunuzla ilgili değişiklik veya iptal talebi oluşturabilirsiniz.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showRequestForm ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3"
                    onClick={() => handleRequestClick('time_change')}
                    data-testid="button-time-change"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm">Saat Değiştir</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                    onClick={() => handleRequestClick('cancellation')}
                    data-testid="button-cancellation"
                  >
                    <Ban className="w-4 h-4" />
                    <span className="text-sm">İptal Et</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3"
                    onClick={() => handleRequestClick('other')}
                    data-testid="button-other-request"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Diger Talep</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {requestType === 'time_change' && (
                      <>
                        <Edit3 className="w-4 h-4 text-primary" />
                        Saat Degisikligi Talebi
                      </>
                    )}
                    {requestType === 'cancellation' && (
                      <>
                        <Ban className="w-4 h-4 text-red-500" />
                        İptal Talebi
                      </>
                    )}
                    {requestType === 'other' && (
                      <>
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Diger Talep
                      </>
                    )}
                  </div>

                  {requestType === 'time_change' && (
                    <div className="space-y-2">
                      <Label>Tercih Ettiginiz Saat</Label>
                      <Select value={preferredTime} onValueChange={setPreferredTime}>
                        <SelectTrigger data-testid="select-preferred-time">
                          <SelectValue placeholder="Saat seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {reservation?.defaultTimes && reservation.defaultTimes.length > 0 ? (
                            reservation.defaultTimes.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="09:00">09:00</SelectItem>
                              <SelectItem value="10:00">10:00</SelectItem>
                              <SelectItem value="11:00">11:00</SelectItem>
                              <SelectItem value="12:00">12:00</SelectItem>
                              <SelectItem value="14:00">14:00</SelectItem>
                              <SelectItem value="15:00">15:00</SelectItem>
                              <SelectItem value="16:00">16:00</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>
                      {requestType === 'cancellation' ? 'İptal Sebebi (Opsiyonel)' : 'Ek Açıklama (Opsiyonel)'}
                    </Label>
                    <Textarea
                      placeholder={
                        requestType === 'cancellation' 
                          ? "İptal sebebinizi yazabilirsiniz..." 
                          : "Talebinizle ilgili ek bilgi..."
                      }
                      value={requestDetails}
                      onChange={(e) => setRequestDetails(e.target.value)}
                      rows={3}
                      data-testid="textarea-request-details"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowRequestForm(false)}
                      className="flex-1"
                      data-testid="button-cancel-request"
                    >
                      Vazgec
                    </Button>
                    <Button
                      onClick={handleSubmitRequest}
                      disabled={submitRequestMutation.isPending || (requestType === 'time_change' && !preferredTime)}
                      className="flex-1"
                      data-testid="button-submit-request"
                    >
                      {submitRequestMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Gönder
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Request Sent Confirmation */}
        {requestSent && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-medium">Talebiniz Alindi</p>
                  <p className="text-sm text-muted-foreground">
                    En kısa sürede size döneceğiz. Teşekkür ederiz.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
