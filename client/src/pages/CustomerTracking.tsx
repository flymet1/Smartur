import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, Clock, Users, MapPin, CheckCircle, AlertCircle, XCircle, Loader2, Edit3, Ban, MessageSquare, Send, CalendarClock, ShieldCheck, Phone, ChevronLeft, ChevronRight, TrendingUp, CreditCard, Hotel, Car, Package, FileText, Info } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SelectedExtra {
  name: string;
  priceTl: number;
}

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
  freeCancellationHours: number;
  confirmationMessage: string | null;
  whatsappNumber: string | null;
  companyName: string | null;
  cancellationPolicy: string | null;
  meetingPoint: string | null;
  arrivalMinutesBefore: number | null;
  advancePaymentTl: number;
  paymentStatus: string;
  hotelName: string | null;
  hasTransfer: boolean;
  transferZone: string | null;
  selectedExtras: SelectedExtra[];
  notes: string | null;
}

interface TimeSlot {
  time: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

interface AvailabilityDay {
  date: string;
  priceTl: number;
  priceUsd: number;
  occupancy: number;
  totalAvailable: number;
  totalCapacity: number;
  isReservationDate: boolean;
  timeSlots: TimeSlot[];
  closed: boolean;
}

interface AvailabilityData {
  activityName: string;
  currency: string;
  basePrice: number;
  basePriceUsd: number;
  seasonalPricingEnabled: boolean;
  days: AvailabilityDay[];
}

type RequestType = 'time_change' | 'date_change' | 'cancellation' | 'other' | null;

export default function CustomerTracking() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { toast } = useToast();
  
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);

  const { data: reservation, isLoading, error } = useQuery<TrackingData>({
    queryKey: ['/api/track', token],
    enabled: !!token,
  });

  const { data: availability } = useQuery<AvailabilityData>({
    queryKey: ['/api/track', token, 'availability'],
    queryFn: async () => {
      const res = await fetch(`/api/track/${token}/availability`);
      if (!res.ok) throw new Error('Müsaitlik yüklenemedi');
      return res.json();
    },
    enabled: !!token && !!reservation && reservation.status !== 'cancelled',
  });

  const cancellationAllowed = useMemo(() => {
    if (!reservation) return true;
    const reservationDateTime = new Date(`${reservation.date}T${reservation.time || '00:00'}:00`);
    const now = new Date();
    const hoursRemaining = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursRemaining >= (reservation.freeCancellationHours || 24);
  }, [reservation]);

  const hoursUntilActivity = useMemo(() => {
    if (!reservation) return 0;
    const reservationDateTime = new Date(`${reservation.date}T${reservation.time || '00:00'}:00`);
    const now = new Date();
    return Math.max(0, Math.floor((reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
  }, [reservation]);

  const dateRange = useMemo(() => {
    if (!reservation) return { min: '', max: '' };
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const parts = reservation.date.split('-').map(Number);
    const original = new Date(parts[0], parts[1] - 1, parts[2]);
    const minDate = new Date(original);
    minDate.setDate(minDate.getDate() - 7);
    const maxDate = new Date(original);
    maxDate.setDate(maxDate.getDate() + 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveMin = minDate < today ? today : minDate;
    return {
      min: formatLocalDate(effectiveMin),
      max: formatLocalDate(maxDate)
    };
  }, [reservation]);

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/customer-requests', {
        token,
        requestType,
        preferredTime: requestType === 'time_change' ? preferredTime : undefined,
        preferredDate: requestType === 'date_change' ? preferredDate : undefined,
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
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Talep gönderilemedi. Lütfen tekrar deneyin.",
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
    setPreferredDate("");
    setRequestDetails("");
  };

  const handleSubmitRequest = () => {
    if (!requestType) return;
    submitRequestMutation.mutate();
  };

  const isSubmitDisabled = () => {
    if (submitRequestMutation.isPending) return true;
    if (requestType === 'time_change' && !preferredTime) return true;
    if (requestType === 'date_change' && !preferredDate) return true;
    return false;
  };

  const selectedDayData = useMemo(() => {
    if (!availability || !selectedCalendarDate) return null;
    return availability.days.find(d => d.date === selectedCalendarDate) || null;
  }, [availability, selectedCalendarDate]);

  const getOccupancyColor = useCallback((occupancy: number, closed: boolean) => {
    if (closed) return 'bg-muted text-muted-foreground';
    if (occupancy >= 100) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    if (occupancy >= 80) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300';
    if (occupancy >= 50) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
    return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
  }, []);

  const getOccupancyDot = useCallback((occupancy: number, closed: boolean) => {
    if (closed) return 'bg-muted-foreground';
    if (occupancy >= 100) return 'bg-red-500';
    if (occupancy >= 80) return 'bg-orange-500';
    if (occupancy >= 50) return 'bg-amber-500';
    return 'bg-green-500';
  }, []);

  const formatPriceShort = useCallback((priceTl: number, priceUsd: number, currency: string) => {
    if (currency === 'USD' && priceUsd > 0) return `$${priceUsd}`;
    if (priceTl >= 1000) return `${(priceTl / 1000).toFixed(priceTl % 1000 === 0 ? 0 : 1)}K`;
    return `${priceTl}`;
  }, []);

  const handleCalendarDateSelect = useCallback((dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    setPreferredDate(dateStr);
    setPreferredTime("");
  }, []);

  const handleCalendarTimeSelect = useCallback((time: string) => {
    setPreferredTime(time);
  }, []);

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

              {reservation.meetingPoint && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Buluşma Noktası</p>
                    <p className="font-medium text-sm" data-testid="text-meeting-point">{reservation.meetingPoint}</p>
                    {reservation.arrivalMinutesBefore && (
                      <p className="text-xs text-muted-foreground">{reservation.arrivalMinutesBefore} dk önce geliniz</p>
                    )}
                  </div>
                </div>
              )}

              {reservation.hotelName && (
                <div className="flex items-start gap-3">
                  <Hotel className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Otel</p>
                    <p className="font-medium text-sm" data-testid="text-hotel-name">{reservation.hotelName}</p>
                  </div>
                </div>
              )}

              {reservation.hasTransfer && (
                <div className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Transfer</p>
                    <p className="font-medium text-sm" data-testid="text-transfer-info">
                      Otel transferi dahil
                      {reservation.transferZone && ` (${reservation.transferZone})`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {reservation.selectedExtras.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Ekstra Hizmetler</p>
                </div>
                <div className="space-y-2">
                  {reservation.selectedExtras.map((extra, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm" data-testid={`extra-item-${idx}`}>
                      <span>{extra.name}</span>
                      <span className="font-medium">{extra.priceTl.toLocaleString('tr-TR')} TL</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toplam Tutar</span>
                <span className="text-xl font-semibold" data-testid="text-price">
                  {formatPrice(reservation.priceTl, reservation.priceUsd, reservation.currency)}
                </span>
              </div>

              {reservation.advancePaymentTl > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Ön Ödeme
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400" data-testid="text-advance-payment">
                      {reservation.advancePaymentTl.toLocaleString('tr-TR')} TL
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Kalan Ödeme</span>
                    <span className="font-semibold" data-testid="text-remaining-payment">
                      {Math.max(0, (reservation.priceTl || 0) - (reservation.advancePaymentTl || 0)).toLocaleString('tr-TR')} TL
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ödeme Durumu</span>
                <Badge
                  className={
                    reservation.paymentStatus === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : reservation.paymentStatus === 'partial'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'bg-muted text-muted-foreground'
                  }
                  data-testid="text-payment-status"
                >
                  {reservation.paymentStatus === 'paid' ? 'Ödendi' 
                    : reservation.paymentStatus === 'partial' ? 'Kısmi Ödeme' 
                    : reservation.paymentStatus === 'failed' ? 'Başarısız'
                    : 'Ödenmedi'}
                </Badge>
              </div>
            </div>

            {reservation.status === 'confirmed' && reservation.confirmationMessage && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4" data-testid="text-confirmation-message">
                <p className="text-green-800 dark:text-green-300 text-sm whitespace-pre-line">
                  {reservation.confirmationMessage}
                </p>
              </div>
            )}

            {reservation.status === 'confirmed' && !reservation.confirmationMessage && (
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

        {availability && availability.days.length > 0 && reservation.status !== 'cancelled' && (
          <Card data-testid="card-availability-calendar">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Müsait Tarih ve Saatler
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {availability.seasonalPricingEnabled ? 'Fiyatlar tarihe göre değişkenlik gösterebilir.' : 'Müsait tarih ve saatleri görüntüleyin.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-1 text-center" data-testid="calendar-grid">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                  <div key={day} className="text-xs font-medium text-muted-foreground py-1">{day}</div>
                ))}
                {(() => {
                  if (!availability.days.length) return null;
                  const firstDate = new Date(availability.days[0].date + 'T00:00:00');
                  let dayOfWeek = firstDate.getDay();
                  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const padding = Array(dayOfWeek).fill(null);
                  
                  return (
                    <>
                      {padding.map((_, i) => (
                        <div key={`pad-${i}`} className="aspect-square" />
                      ))}
                      {availability.days.map((day) => {
                        const isSelected = selectedCalendarDate === day.date;
                        const isReservationDay = day.isReservationDate;
                        const isClosed = day.closed || day.occupancy >= 100;
                        const currency = availability.currency;
                        const dateParts = day.date.split('-');
                        const dayNum = parseInt(dateParts[2]);
                        
                        return (
                          <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => !isClosed && handleCalendarDateSelect(day.date)}
                                disabled={isClosed}
                                className={`
                                  relative flex flex-col items-center justify-center rounded-md p-1 min-h-[52px] transition-all text-xs
                                  ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
                                  ${isReservationDay && !isSelected ? 'ring-1 ring-blue-400 dark:ring-blue-600' : ''}
                                  ${isClosed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover-elevate'}
                                  ${!isSelected && !isClosed ? getOccupancyColor(day.occupancy, day.closed) : ''}
                                `}
                                data-testid={`calendar-day-${day.date}`}
                              >
                                <span className={`font-semibold text-sm leading-none ${isSelected ? 'text-primary' : ''}`}>
                                  {dayNum}
                                </span>
                                <span className={`text-[10px] leading-tight mt-0.5 ${isSelected ? 'text-primary' : ''}`}>
                                  {formatPriceShort(day.priceTl, day.priceUsd, currency)}
                                  {currency === 'TRY' ? '' : ''}
                                </span>
                                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getOccupancyDot(day.occupancy, isClosed)}`} />
                                {isReservationDay && (
                                  <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{new Date(day.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                                <p>{currency === 'USD' ? `$${day.priceUsd}` : `${day.priceTl.toLocaleString('tr-TR')} TL`} / kişi</p>
                                <p>{isClosed ? 'Dolu' : `${day.totalAvailable} kişilik yer mevcut`}</p>
                                {isReservationDay && <p className="text-blue-400">Mevcut rezervasyon tarihiniz</p>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Müsait</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Dolmak Üzere</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Dolu</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Rezervasyonunuz</span>
                </div>
              </div>

              {selectedDayData && (
                <div className="border-t pt-4 space-y-3" data-testid="selected-day-details">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {new Date(selectedDayData.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                    </p>
                    <Badge className={getOccupancyColor(selectedDayData.occupancy, selectedDayData.closed)}>
                      {selectedDayData.closed ? 'Kapalı' : `${selectedDayData.totalAvailable} yer`}
                    </Badge>
                  </div>

                  {availability.seasonalPricingEnabled && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Kişi başı:</span>
                      <span className="font-semibold">
                        {availability.currency === 'USD' 
                          ? `$${selectedDayData.priceUsd}` 
                          : `${selectedDayData.priceTl.toLocaleString('tr-TR')} TL`}
                      </span>
                      {selectedDayData.priceTl !== availability.basePrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          {availability.currency === 'USD' 
                            ? `$${availability.basePriceUsd}` 
                            : `${availability.basePrice.toLocaleString('tr-TR')} TL`}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Müsait Saatler</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedDayData.timeSlots.map((slot) => {
                        const isFull = slot.availableSlots <= 0;
                        const isSelectedTime = preferredTime === slot.time && preferredDate === selectedDayData.date;
                        return (
                          <button
                            key={slot.time}
                            onClick={() => !isFull && handleCalendarTimeSelect(slot.time)}
                            disabled={isFull}
                            className={`
                              flex flex-col items-center rounded-md p-2 text-xs border transition-all
                              ${isSelectedTime ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border'}
                              ${isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover-elevate'}
                            `}
                            data-testid={`timeslot-${slot.time}`}
                          >
                            <span className="font-semibold text-sm">{slot.time}</span>
                            <span className={`text-[10px] ${isFull ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                              {isFull ? 'Dolu' : `${slot.availableSlots} yer`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {preferredDate === selectedDayData.date && preferredTime && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm">
                      <p className="font-medium text-primary">
                        Seçiminiz: {new Date(preferredDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {preferredTime}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tarih/saat değişikliği için aşağıdan talep oluşturabilirsiniz.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3"
                    onClick={() => handleRequestClick('time_change')}
                    data-testid="button-time-change"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Saat Değiştir</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3"
                    onClick={() => handleRequestClick('date_change')}
                    data-testid="button-date-change"
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span className="text-sm">Tarih Değiştir</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"
                    onClick={() => {
                      if (!cancellationAllowed) {
                        toast({
                          title: "İptal Yapılamaz",
                          description: `Aktivite saatine ${reservation.freeCancellationHours} saatten az kaldığı için iptal yapılamaz. (Kalan: ${hoursUntilActivity} saat)`,
                          variant: "destructive",
                        });
                        return;
                      }
                      handleRequestClick('cancellation');
                    }}
                    disabled={!cancellationAllowed}
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
                    <span className="text-sm">Diğer Talep</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {requestType === 'time_change' && (
                      <>
                        <Clock className="w-4 h-4 text-primary" />
                        Saat Değişikliği Talebi
                      </>
                    )}
                    {requestType === 'date_change' && (
                      <>
                        <CalendarClock className="w-4 h-4 text-primary" />
                        Tarih Değişikliği Talebi
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
                        Diğer Talep
                      </>
                    )}
                  </div>

                  {requestType === 'time_change' && (
                    <div className="space-y-2">
                      <Label>Tercih Ettiğiniz Saat</Label>
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

                  {requestType === 'date_change' && (
                    <div className="space-y-2">
                      <Label>Tercih Ettiğiniz Tarih</Label>
                      {preferredDate ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                          <p className="text-sm font-medium">
                            {formatDate(preferredDate)}
                            {preferredTime && ` - ${preferredTime}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Yukarıdaki takvimden farklı bir tarih seçebilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-muted/30 border border-dashed border-border rounded-md p-3 text-center">
                          <CalendarDays className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">
                            Yukarıdaki takvimden bir tarih ve saat seçin.
                          </p>
                        </div>
                      )}
                      <Input
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        min={dateRange.min}
                        max={dateRange.max}
                        className="text-xs"
                        data-testid="input-preferred-date"
                      />
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
                      Vazgeç
                    </Button>
                    <Button
                      onClick={handleSubmitRequest}
                      disabled={isSubmitDisabled()}
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

              {!cancellationAllowed && !showRequestForm && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                  <p className="text-amber-800 dark:text-amber-300 text-xs">
                    Aktivite saatine {reservation.freeCancellationHours} saatten az kaldığı için iptal yapılamaz. (Kalan: {hoursUntilActivity} saat)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {requestSent && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-medium">Talebiniz Alındı</p>
                  <p className="text-sm text-muted-foreground">
                    En kısa sürede size döneceğiz. Teşekkür ederiz.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reservation.whatsappNumber && (
          <Card data-testid="card-whatsapp-support">
            <CardContent className="pt-6">
              <Button
                asChild
                className="w-full bg-green-600 dark:bg-green-700 text-white gap-2"
                data-testid="link-whatsapp-support"
              >
                <a
                  href={`https://wa.me/${reservation.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="w-5 h-5" />
                  WhatsApp Destek Hattı
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Sorularınız için bize WhatsApp üzerinden ulaşabilirsiniz.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center space-y-2 pb-4">
          {reservation.companyName && (
            <p className="text-xs text-muted-foreground" data-testid="text-company-name">
              {reservation.companyName}
            </p>
          )}
          <button
            onClick={() => setShowCancellationPolicy(!showCancellationPolicy)}
            className="text-xs text-muted-foreground underline underline-offset-2"
            data-testid="link-cancellation-policy"
          >
            <ShieldCheck className="w-3 h-3 inline-block mr-1" />
            İptal ve İade Politikası
          </button>
          {showCancellationPolicy && (
            <div className="text-left bg-muted/30 border border-border rounded-md p-4 mt-2 text-xs text-muted-foreground space-y-2" data-testid="text-cancellation-policy">
              {reservation.cancellationPolicy ? (
                <div className="whitespace-pre-line">{reservation.cancellationPolicy}</div>
              ) : (
                <>
                  <p>
                    Aktivite başlangıcına <span className="font-medium text-foreground">{reservation.freeCancellationHours} saat</span> ve daha fazla süre varken ücretsiz iptal yapılabilir.
                  </p>
                  <p>
                    Bu süre içinde yapılan iptallerde ödeme tamamen iade edilir. Süre geçtikten sonra iptal talebi kabul edilmez.
                  </p>
                  <p>
                    Tarih değişikliği talepleri, mevcut tarihten en fazla 7 gün öncesine veya sonrasına yapılabilir ve onay gerektirir.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
