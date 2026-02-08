import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import {
  Search, Calendar as CalendarIcon, Clock, Users, CheckCircle, XCircle, AlertCircle,
  Loader2, Hash, User, ArrowRight, CalendarDays, CalendarClock, Ban, MessageSquare,
  Send, TrendingUp, MapPin, Hotel, Car, CreditCard, Package, Phone, ShieldCheck, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "../i18n/LanguageContext";
import { getApiUrl } from "../utils";

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
  pickupTime: string | null;
  pickupMinutesBefore: number | null;
  selectedExtras: { name: string; priceTl: number }[];
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

interface SearchResult {
  id: number;
  customerName: string;
  date: string;
  time: string;
  quantity: number;
  status: string;
  priceTl: number;
  priceUsd: number;
  currency: string;
  paymentStatus: string;
  hotelName: string | null;
  hasTransfer: boolean;
  activityName: string;
  orderNumber: string | null;
  trackingToken: string | null;
}

type RequestType = 'date_time_change' | 'cancellation' | 'other' | null;

export default function PublicTrackReservation() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialToken = urlParams.get("token") || "";

  const { language } = useLanguage();
  const { toast } = useToast();
  const lang = language === "en" ? "en" : "tr";
  const tr = (trText: string, enText: string) => lang === "en" ? enText : trText;

  const [token, setToken] = useState(initialToken);
  const [searchToken, setSearchToken] = useState(initialToken);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const { data: reservation, isLoading: isTokenLoading, error: tokenError } = useQuery<TrackingData>({
    queryKey: ['/api/track', searchToken],
    queryFn: async () => {
      const res = await fetch(`/api/track/${searchToken}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!searchToken,
  });

  const { data: availability } = useQuery<AvailabilityData>({
    queryKey: ['/api/track', searchToken, 'availability'],
    queryFn: async () => {
      const res = await fetch(`/api/track/${searchToken}/availability`);
      if (!res.ok) throw new Error('Availability unavailable');
      return res.json();
    },
    enabled: !!searchToken && !!reservation && reservation.status !== 'cancelled',
  });

  const { data: searchResults, isLoading: isSearching, error: searchError } = useQuery<SearchResult[]>({
    queryKey: [getApiUrl(`/api/website/track/search?q=${encodeURIComponent(activeSearchQuery)}`)],
    enabled: activeSearchQuery.length >= 2,
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

  const selectedDayData = useMemo(() => {
    if (!availability || !selectedCalendarDate) return null;
    return availability.days.find(d => d.date === selectedCalendarDate) || null;
  }, [availability, selectedCalendarDate]);

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/customer-requests', {
        token: searchToken,
        requestType: requestType === 'date_time_change' ? 'date_change' : requestType,
        preferredTime: requestType === 'date_time_change' ? preferredTime : undefined,
        preferredDate: requestType === 'date_time_change' ? preferredDate : undefined,
        requestDetails: requestDetails || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      setRequestSent(true);
      setShowRequestForm(false);
      toast({
        title: tr("Talep Gönderildi", "Request Sent"),
        description: tr("Talebiniz başarıyla iletildi. En kısa sürede size döneceğiz.", "Your request has been submitted. We will get back to you shortly."),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tr("Hata", "Error"),
        description: error.message || tr("Talep gönderilemedi.", "Request could not be sent."),
        variant: "destructive",
      });
    },
  });

  const handleTokenSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchQuery("");
    setSearchToken(token);
    resetRequestState();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      setSearchToken("");
      setActiveSearchQuery(searchQuery);
      resetRequestState();
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    if (result.trackingToken) {
      setToken(result.trackingToken);
      setSearchToken(result.trackingToken);
      setActiveSearchQuery("");
      setSearchQuery("");
      resetRequestState();
    }
  };

  const resetRequestState = () => {
    setShowRequestForm(false);
    setRequestType(null);
    setPreferredTime("");
    setPreferredDate("");
    setRequestDetails("");
    setRequestSent(false);
    setSelectedCalendarDate(null);
  };

  const handleRequestClick = (type: RequestType) => {
    setRequestType(type);
    setShowRequestForm(true);
    setPreferredTime("");
    setPreferredDate("");
    setRequestDetails("");
    if (type === 'date_time_change' && calendarRef.current) {
      setTimeout(() => {
        calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleSubmitRequest = () => {
    if (!requestType) return;
    submitRequestMutation.mutate();
  };

  const isSubmitDisabled = () => {
    if (submitRequestMutation.isPending) return true;
    if (requestType === 'date_time_change' && (!preferredDate || !preferredTime)) return true;
    return false;
  };

  const handleCalendarDateSelect = useCallback((dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    setPreferredDate(dateStr);
    setPreferredTime("");
  }, []);

  const handleCalendarTimeSelect = useCallback((time: string) => {
    setPreferredTime(time);
  }, []);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 gap-1"><CheckCircle className="h-3 w-3" /> {tr("Onaylandı", "Confirmed")}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 gap-1"><AlertCircle className="h-3 w-3" /> {tr("Beklemede", "Pending")}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 gap-1"><XCircle className="h-3 w-3" /> {tr("İptal Edildi", "Cancelled")}</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 gap-1"><CheckCircle className="h-3 w-3" /> {tr("Tamamlandı", "Completed")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (priceTl: number, priceUsd: number, currency: string) => {
    if (currency === 'USD' && priceUsd > 0) return `$${priceUsd}`;
    return `${priceTl.toLocaleString('tr-TR')} TL`;
  };

  const isSearchMode = activeSearchQuery.length >= 2 && !searchToken;
  const isLoading = isTokenLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-track-title">
            {tr("Rezervasyon Takip", "Reservation Tracking")}
          </h1>
          <p className="text-muted-foreground">
            {tr("Rezervasyonunuzun durumunu kontrol edin", "Check the status of your reservation")}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle>{tr("Rezervasyonunuzu Bulun", "Find Your Reservation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleTokenSearch} className="space-y-2">
                <Label htmlFor="token" className="flex items-center gap-1.5 text-sm">
                  <Hash className="w-3.5 h-3.5" />
                  {tr("Takip Kodu", "Tracking Code")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={tr("Takip kodunuzu girin", "Enter your tracking code")}
                    className="flex-1"
                    data-testid="input-tracking-token"
                  />
                  <Button type="submit" disabled={!token || isLoading} data-testid="button-search-token">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{tr("veya", "or")}</span>
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-2">
                <Label htmlFor="search" className="flex items-center gap-1.5 text-sm">
                  <User className="w-3.5 h-3.5" />
                  {tr("Rezervasyon No veya İsim Soyisim", "Order Number or Name")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tr("Örn: 5001 veya Ali Yılmaz", "e.g. 5001 or John Doe")}
                    className="flex-1"
                    data-testid="input-search-query"
                  />
                  <Button type="submit" disabled={searchQuery.length < 2 || isSearching} data-testid="button-search-query">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{tr("En az 2 karakter girin", "Enter at least 2 characters")}</p>
              </form>
            </CardContent>
          </Card>

          {/* Loading */}
          {(isLoading || isSearching) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">{tr("Yükleniyor...", "Loading...")}</p>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          {isSearchMode && !isSearching && searchResults && searchResults.length === 0 && (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">{tr("Rezervasyon Bulunamadı", "No Reservations Found")}</h3>
                <p className="text-muted-foreground">{tr("Aramanızla eşleşen bir rezervasyon bulunamadı.", "No reservation matching your search was found.")}</p>
              </CardContent>
            </Card>
          )}

          {isSearchMode && !isSearching && searchResults && searchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {tr(`${searchResults.length} rezervasyon bulundu. Detayları görmek için seçin:`, `${searchResults.length} reservation(s) found. Select to view details:`)}
              </p>
              {searchResults.map((result) => (
                <Card key={result.id} className="hover-elevate cursor-pointer transition-colors" onClick={() => handleSelectResult(result)} data-testid={`card-search-result-${result.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm truncate">{result.activityName}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{result.customerName}</span>
                          {result.orderNumber && <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{result.orderNumber}</span>}
                          <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(result.date + "T00:00:00").toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short" })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{result.time}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Token Error */}
          {tokenError && !isLoading && !isSearchMode && (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">{tr("Rezervasyon Bulunamadı", "Reservation Not Found")}</h3>
                <p className="text-muted-foreground">{tr("Girdiğiniz takip kodu ile eşleşen bir rezervasyon bulunamadı.", "No reservation found matching the tracking code you entered.")}</p>
              </CardContent>
            </Card>
          )}

          {searchError && !isSearching && isSearchMode && (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">{tr("Rezervasyon Bulunamadı", "No Reservations Found")}</h3>
                <p className="text-muted-foreground">{tr("Aramanızla eşleşen bir rezervasyon bulunamadı.", "No reservation matching your search was found.")}</p>
              </CardContent>
            </Card>
          )}

          {/* Reservation Details */}
          {reservation && !isSearchMode && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>{tr("Rezervasyon Detayları", "Reservation Details")}</CardTitle>
                  {getStatusBadge(reservation.status)}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-md">
                    <h3 className="font-semibold text-lg mb-1">{reservation.activityName}</h3>
                    <p className="text-muted-foreground">{reservation.customerName}</p>
                    {reservation.orderNumber && (
                      <p className="text-xs text-muted-foreground mt-1">#{reservation.orderNumber}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{tr("Tarih", "Date")}</p>
                        <p className="font-medium text-sm">{formatDate(reservation.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{tr("Saat", "Time")}</p>
                        <p className="font-medium text-sm">{reservation.time}</p>
                        {reservation.arrivalMinutesBefore && (
                          <p className="text-xs text-muted-foreground">{tr(`${reservation.arrivalMinutesBefore} dk önce geliniz`, `Please arrive ${reservation.arrivalMinutesBefore} min early`)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{tr("Kişi Sayısı", "Guests")}</p>
                        <p className="font-medium text-sm">{reservation.quantity} {tr("Kişi", "Guest(s)")}</p>
                      </div>
                    </div>

                    {reservation.meetingPoint && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{tr("Buluşma Noktası", "Meeting Point")}</p>
                          <p className="font-medium text-sm">{reservation.meetingPoint}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {reservation.hotelName && (
                    <div className="flex items-start gap-3">
                      <Hotel className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">{tr("Otel", "Hotel")}</p>
                        <p className="font-medium text-sm">{reservation.hotelName}</p>
                      </div>
                    </div>
                  )}

                  {reservation.hasTransfer && (
                    <div className="flex items-start gap-3">
                      <Car className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">{tr("Transfer", "Transfer")}</p>
                        <p className="font-medium text-sm">
                          {tr("Otel transferi dahil", "Hotel transfer included")}
                          {reservation.transferZone && ` (${reservation.transferZone})`}
                        </p>
                        {reservation.pickupTime && (
                          <div className="mt-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              {tr("Alınma Saati", "Pickup Time")}: {reservation.pickupTime}
                            </p>
                            {reservation.pickupMinutesBefore && (
                              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                                {tr(
                                  `Tur saatinden ${reservation.pickupMinutesBefore} dk önce otelinizden alınacaksınız`,
                                  `You will be picked up from your hotel ${reservation.pickupMinutesBefore} min before the tour`
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {reservation.selectedExtras && reservation.selectedExtras.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">{tr("Ekstra Hizmetler", "Extra Services")}</p>
                      </div>
                      <div className="space-y-2">
                        {reservation.selectedExtras.map((extra, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{extra.name}</span>
                            <span className="font-medium">{extra.priceTl.toLocaleString('tr-TR')} TL</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Section */}
                  <div className="border-t pt-4">
                    <div className="bg-muted/30 rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{tr("Toplam Fiyat", "Total Price")}</span>
                        <span className="font-semibold">{formatPrice(reservation.priceTl, reservation.priceUsd, reservation.currency)}</span>
                      </div>
                      {reservation.advancePaymentTl > 0 && (
                        <>
                          <div className="border-t border-border/50" />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" />
                              {tr("Ön Ödeme Yapıldı", "Advance Paid")}
                            </span>
                            <span className="font-medium text-green-600 dark:text-green-400">{reservation.advancePaymentTl.toLocaleString('tr-TR')} TL</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{tr("Kalan", "Remaining")}</span>
                            <span className="text-lg font-bold text-primary">{Math.max(0, (reservation.priceTl || 0) - (reservation.advancePaymentTl || 0)).toLocaleString('tr-TR')} TL</span>
                          </div>
                        </>
                      )}
                      <div className="border-t border-border/50" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{tr("Ödeme Durumu", "Payment Status")}</span>
                        <Badge className={
                          reservation.paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : reservation.paymentStatus === 'partial' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : reservation.paymentStatus === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                          : 'bg-muted text-muted-foreground'
                        }>
                          {reservation.paymentStatus === 'paid' ? tr("Ödendi", "Paid")
                          : reservation.paymentStatus === 'partial' ? tr("Kısmi Ödeme", "Partial")
                          : reservation.paymentStatus === 'failed' ? tr("Başarısız", "Failed")
                          : tr("Ödenmedi", "Unpaid")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {reservation.notes && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">{tr("Notlar", "Notes")}</p>
                      </div>
                      <p className="text-sm">{reservation.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Confirmation Message */}
              {reservation.status === 'confirmed' && reservation.confirmationMessage && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <div className="text-sm whitespace-pre-line">{reservation.confirmationMessage}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Availability Calendar */}
              {availability && availability.days.length > 0 && (
                <Card ref={calendarRef}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      {tr("Müsaitlik Takvimi", "Availability Calendar")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {availability.seasonalPricingEnabled
                        ? tr("Fiyatlar tarihe göre değişkenlik gösterebilir.", "Prices may vary depending on the date.")
                        : tr("Müsait tarih ve saatleri görüntüleyin.", "View available dates and times.")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-7 gap-1 text-center" data-testid="calendar-grid">
                      {(lang === 'tr' ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map(day => (
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
                                      <span className={`font-semibold text-sm leading-none ${isSelected ? 'text-primary' : ''}`}>{dayNum}</span>
                                      <span className={`text-[10px] leading-tight mt-0.5 ${isSelected ? 'text-primary' : ''}`}>
                                        {formatPriceShort(day.priceTl, day.priceUsd, currency)}
                                      </span>
                                      <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getOccupancyDot(day.occupancy, isClosed)}`} />
                                      {isReservationDay && (
                                        <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <div className="space-y-1">
                                      <p className="font-medium">{new Date(day.date + 'T00:00:00').toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                                      <p>{currency === 'USD' ? `$${day.priceUsd}` : `${day.priceTl.toLocaleString('tr-TR')} TL`} / {tr("kişi", "person")}</p>
                                      <p>{isClosed ? tr("Dolu", "Full") : tr(`${day.totalAvailable} kişilik yer mevcut`, `${day.totalAvailable} spots available`)}</p>
                                      {isReservationDay && <p className="text-blue-400">{tr("Mevcut rezervasyon tarihiniz", "Your current reservation date")}</p>}
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
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span>{tr("Müsait", "Available")}</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span>{tr("Dolmak Üzere", "Almost Full")}</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span>{tr("Dolu", "Full")}</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span>{tr("Rezervasyonunuz", "Your Booking")}</span></div>
                    </div>

                    {selectedDayData && (
                      <div className="border-t pt-4 space-y-3" data-testid="selected-day-details">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {new Date(selectedDayData.date + 'T00:00:00').toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', weekday: 'long' })}
                          </p>
                          <Badge className={getOccupancyColor(selectedDayData.occupancy, selectedDayData.closed)}>
                            {selectedDayData.closed ? tr("Kapalı", "Closed") : `${selectedDayData.totalAvailable} ${tr("yer", "spots")}`}
                          </Badge>
                        </div>

                        {availability.seasonalPricingEnabled && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">{tr("Kişi başı:", "Per person:")}:</span>
                            <span className="font-semibold">
                              {availability.currency === 'USD' ? `$${selectedDayData.priceUsd}` : `${selectedDayData.priceTl.toLocaleString('tr-TR')} TL`}
                            </span>
                            {selectedDayData.priceTl !== availability.basePrice && (
                              <span className="text-xs text-muted-foreground line-through">
                                {availability.currency === 'USD' ? `$${availability.basePriceUsd}` : `${availability.basePrice.toLocaleString('tr-TR')} TL`}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">{tr("Müsait Saatler", "Available Times")}</p>
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
                                    {isFull ? tr("Dolu", "Full") : `${slot.availableSlots} ${tr("yer", "spots")}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Request Form */}
              {reservation.status !== 'cancelled' && !requestSent && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      {tr("Talep Oluştur", "Submit a Request")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {tr("Rezervasyonunuzla ilgili değişiklik veya iptal talebi oluşturabilirsiniz.", "You can request changes or cancellation for your reservation.")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!showRequestForm ? (
                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full flex items-center gap-2 h-auto py-3"
                          onClick={() => handleRequestClick('date_time_change')}
                          data-testid="button-date-time-change"
                        >
                          <CalendarClock className="w-4 h-4" />
                          <span className="text-sm">{tr("Tarih / Saat Değiştir", "Change Date / Time")}</span>
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 h-auto py-3 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"
                            onClick={() => {
                              if (!cancellationAllowed) {
                                toast({
                                  title: tr("İptal Yapılamaz", "Cannot Cancel"),
                                  description: tr(
                                    `Aktivite saatine ${reservation.freeCancellationHours} saatten az kaldığı için iptal yapılamaz. (Kalan: ${hoursUntilActivity} saat)`,
                                    `Cancellation is not allowed as less than ${reservation.freeCancellationHours} hours remain. (Remaining: ${hoursUntilActivity} hours)`),
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
                            <span className="text-sm">{tr("İptal Et", "Cancel")}</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 h-auto py-3"
                            onClick={() => handleRequestClick('other')}
                            data-testid="button-other-request"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm">{tr("Diğer Talep", "Other Request")}</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {requestType === 'date_time_change' && (
                            <><CalendarClock className="w-4 h-4 text-primary" />{tr("Tarih / Saat Değişikliği Talebi", "Date / Time Change Request")}</>
                          )}
                          {requestType === 'cancellation' && (
                            <><Ban className="w-4 h-4 text-red-500" />{tr("İptal Talebi", "Cancellation Request")}</>
                          )}
                          {requestType === 'other' && (
                            <><MessageSquare className="w-4 h-4 text-primary" />{tr("Diğer Talep", "Other Request")}</>
                          )}
                        </div>

                        {requestType === 'date_time_change' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                                {tr("Tarih Seçin", "Select Date")}
                              </Label>
                              {preferredDate ? (
                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium">{formatDate(preferredDate)}</span>
                                  </div>
                                  <button type="button" onClick={() => calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-xs text-primary underline underline-offset-2">
                                    {tr("Değiştir", "Change")}
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="w-full bg-muted/30 border border-dashed border-border rounded-md p-3 text-center">
                                  <CalendarDays className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-xs text-muted-foreground">{tr("Yukarıdaki takvimden bir tarih seçin", "Select a date from the calendar above")}</p>
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${preferredDate ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
                                {tr("Saat Seçin", "Select Time")}
                              </Label>
                              {preferredTime ? (
                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium">{preferredTime}</span>
                                  </div>
                                  <button type="button" onClick={() => {
                                    setPreferredTime("");
                                    if (availability && calendarRef.current) {
                                      calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                  }} className="text-xs text-primary underline underline-offset-2">
                                    {tr("Değiştir", "Change")}
                                  </button>
                                </div>
                              ) : !availability || !availability.days.length ? (
                                <Select value={preferredTime} onValueChange={setPreferredTime}>
                                  <SelectTrigger data-testid="select-preferred-time-fallback">
                                    <SelectValue placeholder={tr("Saat seçin", "Select time")} />
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
                              ) : (
                                <div className={`bg-muted/30 border border-dashed border-border rounded-md p-3 text-center ${!preferredDate ? 'opacity-50' : ''}`}>
                                  <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-xs text-muted-foreground">
                                    {preferredDate
                                      ? tr("Takvimden bir saat dilimi seçin", "Select a time slot from the calendar")
                                      : tr("Önce tarih seçmeniz gerekiyor", "Please select a date first")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>
                            {requestType === 'cancellation'
                              ? tr("İptal Sebebi (Opsiyonel)", "Cancellation Reason (Optional)")
                              : tr("Ek Açıklama (Opsiyonel)", "Additional Notes (Optional)")}
                          </Label>
                          <Textarea
                            placeholder={requestType === 'cancellation'
                              ? tr("İptal sebebinizi yazabilirsiniz...", "You can write your cancellation reason...")
                              : tr("Talebinizle ilgili ek bilgi...", "Additional details about your request...")}
                            value={requestDetails}
                            onChange={(e) => setRequestDetails(e.target.value)}
                            rows={3}
                            data-testid="textarea-request-details"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setShowRequestForm(false)} className="flex-1" data-testid="button-cancel-request">
                            {tr("Vazgeç", "Cancel")}
                          </Button>
                          <Button onClick={handleSubmitRequest} disabled={isSubmitDisabled()} className="flex-1" data-testid="button-submit-request">
                            {submitRequestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            {tr("Gönder", "Submit")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!cancellationAllowed && !showRequestForm && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-center">
                        <p className="text-amber-800 dark:text-amber-300 text-xs">
                          {tr(
                            `Aktivite saatine ${reservation.freeCancellationHours} saatten az kaldığı için iptal yapılamaz. (Kalan: ${hoursUntilActivity} saat)`,
                            `Cancellation is not allowed as less than ${reservation.freeCancellationHours} hours remain. (Remaining: ${hoursUntilActivity} hours)`)}
                        </p>
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
                        <p className="font-medium">{tr("Talebiniz Alındı", "Request Received")}</p>
                        <p className="text-sm text-muted-foreground">{tr("En kısa sürede size döneceğiz. Teşekkür ederiz.", "We will get back to you shortly. Thank you.")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* WhatsApp Support */}
              {reservation.whatsappNumber && (
                <Card>
                  <CardContent className="pt-6">
                    <Button asChild className="w-full bg-green-600 dark:bg-green-700 text-white gap-2">
                      <a href={`https://wa.me/${reservation.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <Phone className="w-5 h-5" />
                        {tr("WhatsApp Destek Hattı", "WhatsApp Support")}
                      </a>
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      {tr("Sorularınız için bize WhatsApp üzerinden ulaşabilirsiniz.", "Contact us on WhatsApp for any questions.")}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Footer */}
              <div className="text-center space-y-2 pb-4">
                {reservation.companyName && (
                  <p className="text-xs text-muted-foreground">{reservation.companyName}</p>
                )}
                <button onClick={() => setShowCancellationPolicy(!showCancellationPolicy)} className="text-xs text-muted-foreground underline underline-offset-2" data-testid="link-cancellation-policy">
                  <ShieldCheck className="w-3 h-3 inline-block mr-1" />
                  {tr("İptal ve İade Politikası", "Cancellation & Refund Policy")}
                </button>
                {showCancellationPolicy && (
                  <div className="text-left bg-muted/30 border border-border rounded-md p-4 mt-2 text-xs text-muted-foreground space-y-2" data-testid="text-cancellation-policy">
                    {reservation.cancellationPolicy ? (
                      <div className="whitespace-pre-line">{reservation.cancellationPolicy}</div>
                    ) : (
                      <>
                        <p>{tr(
                          `Aktivite başlangıcına ${reservation.freeCancellationHours} saat ve daha fazla süre varken ücretsiz iptal yapılabilir.`,
                          `Free cancellation is available up to ${reservation.freeCancellationHours} hours before the activity starts.`
                        )}</p>
                        <p>{tr(
                          "Bu süre içinde yapılan iptallerde ödeme tamamen iade edilir. Süre geçtikten sonra iptal talebi kabul edilmez.",
                          "Cancellations made within this period are fully refunded. Cancellation requests are not accepted after the deadline."
                        )}</p>
                        <p>{tr(
                          "Tarih değişikliği talepleri, mevcut tarihten en fazla 7 gün öncesine veya sonrasına yapılabilir ve onay gerektirir.",
                          "Date change requests can be made up to 7 days before or after the current date and require approval."
                        )}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
