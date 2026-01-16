import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useReservations } from "@/hooks/use-reservations";
import { 
  Bell, ClipboardList, Clock, Package, ChevronDown, 
  Calendar, Users, Eye, Handshake, HeadphonesIcon,
  CalendarDays, ArrowRight, RefreshCw, XCircle as CancelIcon,
  MessageCircle, AlertCircle, DollarSign, Euro, Banknote, Calculator, ArrowRightLeft
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Activity, PackageTour, Reservation } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ExchangeRates {
  USD: { TRY: number; EUR: number };
  EUR: { TRY: number; USD: number };
  TRY: { USD: number; EUR: number };
  lastUpdated: string;
  date: string;
  stale?: boolean;
}

interface ChangeRequest {
  id: number;
  reservationId: number;
  tenantId: number;
  initiatedByType: string;
  initiatedById: number | null;
  requestType: string;
  originalDate: string | null;
  originalTime: string | null;
  requestedDate: string | null;
  requestedTime: string | null;
  requestDetails: string | null;
  status: string;
  processNotes: string | null;
  processedBy: number | null;
  processedAt: string | null;
  createdAt: string;
  reservation: Reservation | null;
}

interface ReservationRequest {
  id: number;
  tenantId: number;
  activityId: number;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  guests: number;
  notes: string | null;
  status: string;
  requestedBy: number | null;
  createdAt: string;
}

interface CustomerRequest {
  id: number;
  tenantId: number;
  reservationId: number;
  requestType: string;
  requestDetails: string | null;
  customerName: string;
  customerPhone: string;
  status: string;
  createdAt: string;
}

interface SupportRequest {
  id: number;
  tenantId: number;
  phone: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [reservationsDialogOpen, setReservationsDialogOpen] = useState(false);
  const [viewerRequestsDialogOpen, setViewerRequestsDialogOpen] = useState(false);
  const [partnerRequestsDialogOpen, setPartnerRequestsDialogOpen] = useState(false);
  const [customerRequestsDialogOpen, setCustomerRequestsDialogOpen] = useState(false);
  const [supportRequestsDialogOpen, setSupportRequestsDialogOpen] = useState(false);
  
  // Currency converter state - default 1 USD to TRY
  const [converterAmount, setConverterAmount] = useState<string>("1");
  const [converterFrom, setConverterFrom] = useState<string>("USD");
  const [converterTo, setConverterTo] = useState<string>("TRY");
  
  const getLastViewedTimestamp = () => {
    const stored = localStorage.getItem('lastViewedReservations');
    return stored ? new Date(stored) : new Date(0);
  };
  
  const [lastViewedTime, setLastViewedTime] = useState<Date>(getLastViewedTimestamp);
  
  const { data: reservations, isLoading } = useReservations();
  
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: packageTours = [] } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });

  const { data: changeRequests = [] } = useQuery<ChangeRequest[]>({
    queryKey: ['/api/reservation-change-requests'],
    refetchInterval: 30000,
  });

  const { data: reservationRequests = [] } = useQuery<ReservationRequest[]>({
    queryKey: ['/api/reservation-requests'],
    refetchInterval: 30000,
  });

  const { data: customerRequests = [] } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    refetchInterval: 30000,
  });

  const { data: supportSummary } = useQuery<{ openCount: number; requests: SupportRequest[] }>({
    queryKey: ['/api/support-requests/summary'],
    refetchInterval: 30000,
  });

  // Exchange rates query
  const { data: exchangeRates, isLoading: ratesLoading, refetch: refetchRates } = useQuery<ExchangeRates>({
    queryKey: ['/api/finance/exchange-rates'],
    staleTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 60,
  });

  // Convert currency
  const convertCurrency = (amount: number, from: string, to: string): number => {
    if (!exchangeRates || from === to) return amount;
    const fromRates = exchangeRates[from as keyof typeof exchangeRates];
    if (typeof fromRates === 'object' && to in fromRates) {
      return amount * (fromRates as Record<string, number>)[to];
    }
    return amount;
  };

  const convertedAmount = converterAmount && !isNaN(parseFloat(converterAmount))
    ? convertCurrency(parseFloat(converterAmount), converterFrom, converterTo)
    : 0;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    },
  });

  // Yeni rezervasyonlar
  const newReservationsCount = reservations?.filter(r => {
    if (!r.createdAt) return false;
    const createdAt = new Date(r.createdAt);
    return !isNaN(createdAt.getTime()) && createdAt > lastViewedTime;
  }).length || 0;
  
  const newReservations = reservations?.filter(r => {
    if (!r.createdAt) return false;
    const createdAt = new Date(r.createdAt);
    return !isNaN(createdAt.getTime()) && createdAt > lastViewedTime;
  }).slice(0, 10) || [];

  // Bugünün rezervasyonları
  const today = format(new Date(), "yyyy-MM-dd");
  const todayReservations = reservations?.filter(r => r.date === today) || [];

  // Notes alanından initiator type çıkar
  const getInitiatorTypeFromNotes = (notes: string | null): 'viewer' | 'partner' | 'unknown' => {
    if (!notes) return 'unknown';
    if (notes.includes('[Viewer:') || notes.includes('[İzleyici:')) return 'viewer';
    if (notes.includes('[Partner:')) return 'partner';
    return 'unknown';
  };

  // Tüm bekleyen reservation requests
  const pendingReservationRequests = reservationRequests.filter(r => r.status === 'pending');

  // İzleyici talepleri - notes'tan "[Viewer:" veya "[İzleyici:" içerenler + change requests
  const viewerReservationRequests = pendingReservationRequests.filter(r => getInitiatorTypeFromNotes(r.notes) === 'viewer');
  const viewerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'viewer');
  const totalViewerRequests = viewerReservationRequests.length + viewerChangeRequests.length;

  // Partner talepleri - notes'tan "[Partner:" içerenler + bilinmeyen kaynaklar (eski veriler) + change requests
  const partnerReservationRequests = pendingReservationRequests.filter(r => {
    const type = getInitiatorTypeFromNotes(r.notes);
    return type === 'partner' || type === 'unknown'; // Bilinmeyen kaynakları da partner olarak say
  });
  const partnerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'partner');
  const totalPartnerRequests = partnerReservationRequests.length + partnerChangeRequests.length;

  // Müşteri talepleri
  const pendingCustomerRequests = customerRequests.filter(r => r.status === 'pending');
  const customerChangeRequests = changeRequests.filter(r => r.status === 'pending' && r.initiatedByType === 'customer');
  const totalCustomerRequests = pendingCustomerRequests.length + customerChangeRequests.length;

  // Destek talepleri
  const openSupportRequests = supportSummary?.openCount || 0;

  // Toplam bekleyen talepler (çift sayımı önle - viewer ve partner ayrı sayıldığından basit toplam)
  const totalPendingRequests = totalViewerRequests + totalPartnerRequests + totalCustomerRequests;

  const markReservationsAsViewed = () => {
    const now = new Date();
    localStorage.setItem('lastViewedReservations', now.toISOString());
    setLastViewedTime(now);
  };

  const getActivityName = (activityId: number | null) => {
    if (!activityId) return "Bilinmiyor";
    return activities.find(a => a.id === activityId)?.name || "Bilinmiyor";
  };

  const getPackageTourName = (packageTourId: number | null) => {
    if (!packageTourId) return null;
    return packageTours.find(p => p.id === packageTourId)?.name || null;
  };

  const getStatusBadge = (status: string, reservationId: number) => {
    const statusConfig = {
      confirmed: { label: "Onaylı", className: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" },
      pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200" },
      cancelled: { label: "İptal", className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" },
    };
    const current = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "" };
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${current.className} cursor-pointer flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border`}
            data-testid={`button-status-${reservationId}`}
          >
            {current.label}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100]">
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'pending' })}
            className="text-yellow-700"
          >
            Beklemede
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'confirmed' })}
            className="text-green-700"
          >
            Onaylı
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => statusMutation.mutate({ id: reservationId, status: 'cancelled' })}
            className="text-red-700"
          >
            İptal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const QuickActionCard = ({ 
    title, 
    count, 
    icon: Icon, 
    color, 
    onClick,
    subtitle,
    testId
  }: { 
    title: string; 
    count: number; 
    icon: any; 
    color: string;
    onClick: () => void;
    subtitle?: string;
    testId: string;
  }) => {
    const colorClasses: Record<string, string> = {
      blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30",
      purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30",
      green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30",
      orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30",
      red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30",
      cyan: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/30",
    };
    
    const iconColors: Record<string, string> = {
      blue: "text-blue-600 dark:text-blue-400",
      purple: "text-purple-600 dark:text-purple-400",
      green: "text-green-600 dark:text-green-400",
      orange: "text-orange-600 dark:text-orange-400",
      red: "text-red-600 dark:text-red-400",
      cyan: "text-cyan-600 dark:text-cyan-400",
    };

    const badgeColors: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
      purple: "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
      green: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200",
      orange: "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200",
      red: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200",
      cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-200",
    };

    return (
      <Card 
        className={`cursor-pointer transition-all ${colorClasses[color]} border-2`}
        onClick={onClick}
        data-testid={testId}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                <Icon className={`w-6 h-6 ${iconColors[color]}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <Badge className={`${badgeColors[color]} text-sm px-2.5 py-0.5`}>
                  {count}
                </Badge>
              )}
              <ArrowRight className={`w-5 h-5 ${iconColors[color]}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 space-y-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Anasayfa
            </h1>
            <p className="text-muted-foreground mt-1">
              Hoş geldiniz! Hızlı erişim menüsü ile işlemlerinizi yönetin.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/reservations?date=${today}&view=list`}>
              <Button size="lg" data-testid="button-today-reservations">
                <CalendarDays className="w-5 h-5 mr-2" />
                Bugünün Rezervasyonları
                {todayReservations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {todayReservations.length}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Yeni Rezervasyonlar */}
          <QuickActionCard
            title="Yeni Rezervasyonlar"
            subtitle="Tüm kaynaklardan gelen"
            count={newReservationsCount}
            icon={Bell}
            color="blue"
            onClick={() => setReservationsDialogOpen(true)}
            testId="card-new-reservations"
          />

          {/* İzleyici Talepleri */}
          <QuickActionCard
            title="İzleyici Talepleri"
            subtitle="Değişiklik ve iptal talepleri"
            count={totalViewerRequests}
            icon={Eye}
            color="purple"
            onClick={() => setViewerRequestsDialogOpen(true)}
            testId="card-viewer-requests"
          />

          {/* Partner Talepleri */}
          <QuickActionCard
            title="Partner Talepleri"
            subtitle="Yeni rez, değişiklik, iptal"
            count={totalPartnerRequests}
            icon={Handshake}
            color="green"
            onClick={() => setPartnerRequestsDialogOpen(true)}
            testId="card-partner-requests"
          />

          {/* Müşteri Talepleri */}
          <QuickActionCard
            title="Müşteri Talepleri"
            subtitle="Değişiklik ve iptal talepleri"
            count={totalCustomerRequests}
            icon={Users}
            color="orange"
            onClick={() => setCustomerRequestsDialogOpen(true)}
            testId="card-customer-requests"
          />

          {/* Destek Talepleri */}
          <QuickActionCard
            title="Destek Talepleri"
            subtitle="Bot eskalasyonları"
            count={openSupportRequests}
            icon={HeadphonesIcon}
            color="red"
            onClick={() => setSupportRequestsDialogOpen(true)}
            testId="card-support-requests"
          />

          {/* Tüm Rezervasyonlar */}
          <QuickActionCard
            title="Tüm Rezervasyonlar"
            subtitle="Takvim görünümü"
            count={reservations?.length || 0}
            icon={ClipboardList}
            color="cyan"
            onClick={() => navigate('/reservations')}
            testId="card-all-reservations"
          />
        </div>

        {/* Özet Bilgiler */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{todayReservations.length}</p>
              <p className="text-sm text-muted-foreground">Bugün</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {reservations?.filter(r => r.status === 'confirmed').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Onaylı</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {reservations?.filter(r => r.status === 'pending').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Beklemede</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {totalPendingRequests}
              </p>
              <p className="text-sm text-muted-foreground">Bekleyen Talep</p>
            </CardContent>
          </Card>
        </div>

        {/* Döviz Hesaplama Aracı */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Döviz Hesaplama</CardTitle>
                {exchangeRates?.stale && (
                  <Badge variant="outline" className="text-xs">Eski veri</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {exchangeRates?.date && (
                  <span className="text-xs text-muted-foreground">
                    {exchangeRates.date}
                  </span>
                )}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => refetchRates()}
                  disabled={ratesLoading}
                  data-testid="button-refresh-rates"
                >
                  <RefreshCw className={`h-4 w-4 ${ratesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Günlük Kurlar */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Günlük Kurlar</h4>
                {ratesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : exchangeRates ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-muted-foreground">USD/TRY</span>
                      </div>
                      <div className="text-xl font-bold" data-testid="text-usd-try-rate">
                        {exchangeRates.USD.TRY.toFixed(4)}
                      </div>
                      <p className="text-xs text-muted-foreground">1 USD = {exchangeRates.USD.TRY.toFixed(2)} TL</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-1">
                        <Euro className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-muted-foreground">EUR/TRY</span>
                      </div>
                      <div className="text-xl font-bold" data-testid="text-eur-try-rate">
                        {exchangeRates.EUR.TRY.toFixed(4)}
                      </div>
                      <p className="text-xs text-muted-foreground">1 EUR = {exchangeRates.EUR.TRY.toFixed(2)} TL</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Kur bilgisi alınamadı
                  </div>
                )}
              </div>

              {/* Döviz Hesaplayıcı */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium text-muted-foreground">Döviz Hesaplayıcı</h4>
                </div>
                <div className="p-4 rounded-lg border bg-background">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={converterAmount}
                        onChange={(e) => setConverterAmount(e.target.value)}
                        placeholder="Miktar"
                        className="flex-1"
                        data-testid="input-converter-amount"
                      />
                      <Select value={converterFrom} onValueChange={setConverterFrom}>
                        <SelectTrigger className="w-24" data-testid="select-converter-from">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="TRY">TRY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const temp = converterFrom;
                          setConverterFrom(converterTo);
                          setConverterTo(temp);
                        }}
                        data-testid="button-swap-currencies"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 rounded-md bg-muted/50 border">
                        <div className="text-xl font-bold" data-testid="text-converted-amount">
                          {convertedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <Select value={converterTo} onValueChange={setConverterTo}>
                        <SelectTrigger className="w-24" data-testid="select-converter-to">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="TRY">TRY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>

      {/* Yeni Rezervasyonlar Dialog */}
      <Dialog open={reservationsDialogOpen} onOpenChange={setReservationsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Yeni Rezervasyonlar
              {newReservationsCount > 0 && (
                <Badge className="ml-2">{newReservationsCount}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {newReservations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Yeni rezervasyon bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {newReservations.map(res => {
                const packageTourName = getPackageTourName(res.packageTourId);
                return (
                  <Card key={res.id} className={packageTourName ? "border-purple-200 dark:border-purple-800" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{res.customerName}</span>
                            {packageTourName && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                <Package className="w-3 h-3 mr-1" />
                                {packageTourName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{getActivityName(res.activityId)}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {res.date} {res.time}
                            </span>
                            <span>{res.quantity} kişi</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(res.status || 'pending', res.id)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={markReservationsAsViewed} data-testid="button-mark-viewed">
                  Tümünü Görüldü İşaretle
                </Button>
                <Link href="/reservations">
                  <Button data-testid="button-view-all">Tüm Rezervasyonlar</Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* İzleyici Talepleri Dialog */}
      <Dialog open={viewerRequestsDialogOpen} onOpenChange={setViewerRequestsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              İzleyici Talepleri
              {totalViewerRequests > 0 && (
                <Badge className="ml-2 bg-purple-100 text-purple-700">{totalViewerRequests}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {totalViewerRequests === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Bekleyen izleyici talebi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {viewerReservationRequests.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Yeni Rezervasyon Talepleri</h4>
                  <div className="space-y-2">
                    {viewerReservationRequests.map(req => (
                      <Card key={req.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{req.customerName}</span>
                              <p className="text-sm text-muted-foreground">
                                {getActivityName(req.activityId)} - {req.date} {req.time}
                              </p>
                              <p className="text-xs text-muted-foreground">{req.guests} kişi</p>
                            </div>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">Yeni Rez.</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {viewerChangeRequests.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Değişiklik/İptal Talepleri</h4>
                  <div className="space-y-2">
                    {viewerChangeRequests.map(req => (
                      <Card key={req.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {req.requestType === 'date_change' && <RefreshCw className="w-4 h-4 text-orange-500" />}
                            {req.requestType === 'cancellation' && <CancelIcon className="w-4 h-4 text-red-500" />}
                            <span className="font-medium">{req.reservation?.customerName || 'Bilinmeyen'}</span>
                            <Badge variant="outline" className="text-xs">
                              {req.requestType === 'date_change' ? 'Tarih Değişikliği' : 'İptal'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {req.originalDate} {req.originalTime} → {req.requestedDate} {req.requestedTime}
                          </p>
                          {req.requestDetails && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{req.requestDetails}"</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Link href="/reservations">
                  <Button className="w-full" data-testid="button-view-viewer-requests">
                    Rezervasyonlar Sayfasında Görüntüle
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Partner Talepleri Dialog */}
      <Dialog open={partnerRequestsDialogOpen} onOpenChange={setPartnerRequestsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-green-600" />
              Partner Talepleri
              {totalPartnerRequests > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-700">{totalPartnerRequests}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {totalPartnerRequests === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Handshake className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Bekleyen partner talebi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {partnerReservationRequests.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Yeni Rezervasyon Talepleri</h4>
                  <div className="space-y-2">
                    {partnerReservationRequests.map(req => (
                      <Card key={req.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{req.customerName}</span>
                              <p className="text-sm text-muted-foreground">
                                {getActivityName(req.activityId)} - {req.date} {req.time}
                              </p>
                              <p className="text-xs text-muted-foreground">{req.guests} kişi</p>
                            </div>
                            <Badge variant="outline">Yeni Rez.</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {partnerChangeRequests.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Değişiklik/İptal Talepleri</h4>
                  <div className="space-y-2">
                    {partnerChangeRequests.map(req => (
                      <Card key={req.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {req.requestType === 'date_change' && <RefreshCw className="w-4 h-4 text-orange-500" />}
                            {req.requestType === 'cancellation' && <CancelIcon className="w-4 h-4 text-red-500" />}
                            <span className="font-medium">{req.reservation?.customerName || 'Bilinmeyen'}</span>
                            <Badge variant="outline" className="text-xs">
                              {req.requestType === 'date_change' ? 'Değişiklik' : 'İptal'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {req.originalDate} {req.originalTime} → {req.requestedDate} {req.requestedTime}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Link href="/reservations">
                  <Button className="w-full" data-testid="button-view-partner-requests">
                    Rezervasyonlar Sayfasında Görüntüle
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Müşteri Talepleri Dialog */}
      <Dialog open={customerRequestsDialogOpen} onOpenChange={setCustomerRequestsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Müşteri Talepleri
              {totalCustomerRequests > 0 && (
                <Badge className="ml-2 bg-orange-100 text-orange-700">{totalCustomerRequests}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {totalCustomerRequests === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Bekleyen müşteri talebi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCustomerRequests.map(req => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{req.customerName}</span>
                        <p className="text-sm text-muted-foreground">{req.customerPhone}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {req.requestType === 'time_change' ? 'Saat Değişikliği' : 
                           req.requestType === 'cancellation' ? 'İptal' : 'Bilgi'}
                        </Badge>
                      </div>
                    </div>
                    {req.requestDetails && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{req.requestDetails}"</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {customerChangeRequests.map(req => (
                <Card key={`change-${req.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {req.requestType === 'date_change' && <RefreshCw className="w-4 h-4 text-orange-500" />}
                      {req.requestType === 'cancellation' && <CancelIcon className="w-4 h-4 text-red-500" />}
                      <span className="font-medium">{req.reservation?.customerName || 'Bilinmeyen'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {req.originalDate} {req.originalTime} → {req.requestedDate} {req.requestedTime}
                    </p>
                  </CardContent>
                </Card>
              ))}
              <div className="pt-4 border-t">
                <Link href="/customer-requests">
                  <Button className="w-full" data-testid="button-view-customer-requests">
                    Müşteri Talepleri Sayfasında Görüntüle
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Destek Talepleri Dialog */}
      <Dialog open={supportRequestsDialogOpen} onOpenChange={setSupportRequestsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-red-600" />
              Destek Talepleri
              {openSupportRequests > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700">{openSupportRequests}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {openSupportRequests === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <HeadphonesIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Açık destek talebi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supportSummary?.requests.map(req => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{req.phone}</span>
                        <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Açık</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="pt-4 border-t">
                <Link href="/messages">
                  <Button className="w-full" data-testid="button-view-support-requests">
                    Mesajlar Sayfasında Görüntüle
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
