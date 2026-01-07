import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit,
  CreditCard,
  Calendar,
  Umbrella,
  UserCheck,
  TableProperties,
  Send,
  RefreshCw,
  ArrowRightLeft,
  Euro,
  Banknote,
  Calculator,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react";
import type { Agency, AgencyPayout, SupplierDispatch, Activity, AgencyActivityRate } from "@shared/schema";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

export default function Finance() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<AgencyActivityRate | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    agencyId: 0,
    periodStart: startDate,
    periodEnd: endDate,
    description: '',
    guestCount: 0,
    baseAmountTl: 0,
    vatRatePct: 0,
    method: 'cash',
    reference: '',
    notes: '',
    status: 'paid'
  });
  const [dispatchForm, setDispatchForm] = useState({
    agencyId: 0,
    activityId: 0,
    dispatchDate: new Date().toISOString().split('T')[0],
    dispatchTime: '10:00',
    guestCount: 1,
    unitPayoutTl: 0,
    notes: ''
  });
  const [rateForm, setRateForm] = useState({
    agencyId: 0,
    activityId: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    unitPayoutTl: 0,
    unitPayoutUsd: 0,
    currency: 'TRY',
    notes: ''
  });

  // Currency converter state
  const [converterAmount, setConverterAmount] = useState<string>("100");
  const [converterFrom, setConverterFrom] = useState<string>("USD");
  const [converterTo, setConverterTo] = useState<string>("TRY");

  // Dispatch filter states
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [dispatchSortOrder, setDispatchSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Exchange Rates
  type ExchangeRates = {
    USD: { TRY: number; EUR: number };
    EUR: { TRY: number; USD: number };
    TRY: { USD: number; EUR: number };
    lastUpdated: string;
    date: string;
    stale?: boolean;
  };
  const { data: exchangeRates, isLoading: ratesLoading, refetch: refetchRates } = useQuery<ExchangeRates>({
    queryKey: ['/api/finance/exchange-rates'],
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 60, // 1 hour
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

  // Tedarikçiler (Suppliers)
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });

  // Ödemeler
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<AgencyPayout[]>({
    queryKey: ['/api/finance/payouts']
  });

  // Gönderimler (Dispatches)
  const { data: dispatches = [] } = useQuery<SupplierDispatch[]>({
    queryKey: ['/api/finance/dispatches']
  });

  // Gönderim Özeti (Dispatch Summary)
  type DispatchSummary = {
    agencyId: number;
    agencyName: string;
    totalGuests: number;
    totalOwedTl: number;
    totalPaidTl: number;
    remainingTl: number;
  };
  const { data: dispatchSummary = [] } = useQuery<DispatchSummary[]>({
    queryKey: [`/api/finance/dispatches/summary?startDate=${startDate}&endDate=${endDate}`]
  });

  // Aktiviteler
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  // Tarifeler
  const { data: rates = [] } = useQuery<AgencyActivityRate[]>({
    queryKey: ['/api/finance/rates']
  });

  // Tarih aralığına göre filtrelenmiş ödemeler (dönem kesişimi)
  const filteredPayouts = payouts.filter(p => {
    // Dönem kesişimi: ödeme dönemi seçili tarih aralığıyla örtüşüyorsa dahil et
    if (p.periodEnd && p.periodEnd < startDate) return false;
    if (p.periodStart && p.periodStart > endDate) return false;
    return true;
  });

  // Tarih aralığına göre filtrelenmiş ve sıralanmış gönderimler
  const filteredDispatches = dispatches
    .filter(d => {
      if (!d.dispatchDate) return false;
      // Tarih filtresi
      if (d.dispatchDate < startDate || d.dispatchDate > endDate) return false;
      // Acenta filtresi
      if (selectedAgencyId && d.agencyId !== selectedAgencyId) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.dispatchDate || '';
      const dateB = b.dispatchDate || '';
      if (dispatchSortOrder === 'newest') {
        return dateB.localeCompare(dateA);
      } else {
        return dateA.localeCompare(dateB);
      }
    });

  // Özet hesaplamalar
  const totalGuests = filteredPayouts.reduce((sum, p) => sum + (p.guestCount || 0), 0);
  const totalPaid = filteredPayouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0);
  const supplierSummary = suppliers.map(s => {
    const supplierPayouts = filteredPayouts.filter(p => p.agencyId === s.id);
    return {
      ...s,
      guestCount: supplierPayouts.reduce((sum, p) => sum + (p.guestCount || 0), 0),
      totalPaid: supplierPayouts.reduce((sum, p) => sum + (p.totalAmountTl || 0), 0),
      payoutCount: supplierPayouts.length
    };
  });

  // Mutations
  const createPayoutMutation = useMutation({
    mutationFn: async (data: typeof payoutForm) => apiRequest('POST', '/api/finance/payouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      setPayoutDialogOpen(false);
      setPayoutForm({
        agencyId: 0,
        periodStart: startDate,
        periodEnd: endDate,
        description: '',
        guestCount: 0,
        baseAmountTl: 0,
        vatRatePct: 0,
        method: 'cash',
        reference: '',
        notes: '',
        status: 'paid'
      });
      toast({ title: "Ödeme kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme kaydedilemedi", variant: "destructive" });
    }
  });

  const deletePayoutMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/payouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      toast({ title: "Ödeme silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ödeme silinemedi", variant: "destructive" });
    }
  });

  const createDispatchMutation = useMutation({
    mutationFn: async (data: typeof dispatchForm) => apiRequest('POST', '/api/finance/dispatches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dispatches'] });
      setDispatchDialogOpen(false);
      setDispatchForm({
        agencyId: 0,
        activityId: 0,
        dispatchDate: new Date().toISOString().split('T')[0],
        dispatchTime: '10:00',
        guestCount: 1,
        unitPayoutTl: 0,
        notes: ''
      });
      toast({ title: "Gönderim kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Gönderim kaydedilemedi", variant: "destructive" });
    }
  });

  const deleteDispatchMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/dispatches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/dispatches'] });
      toast({ title: "Gönderim silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Gönderim silinemedi", variant: "destructive" });
    }
  });

  const createRateMutation = useMutation({
    mutationFn: async (data: typeof rateForm) => apiRequest('POST', '/api/finance/rates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/rates'] });
      setRateDialogOpen(false);
      setEditingRate(null);
      setRateForm({ agencyId: 0, activityId: 0, validFrom: new Date().toISOString().split('T')[0], validTo: '', unitPayoutTl: 0, unitPayoutUsd: 0, currency: 'TRY', notes: '' });
      toast({ title: "Fiyat kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Fiyat kaydedilemedi", variant: "destructive" });
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof rateForm> }) => 
      apiRequest('PATCH', `/api/finance/rates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/rates'] });
      setRateDialogOpen(false);
      setEditingRate(null);
      toast({ title: "Tarife güncellendi" });
    }
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/rates'] });
      toast({ title: "Tarife silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tarife silinemedi", variant: "destructive" });
    }
  });

  const handlePayoutSubmit = () => {
    if (!payoutForm.agencyId) {
      toast({ title: "Hata", description: "Tedarikçi seçin", variant: "destructive" });
      return;
    }
    const vatAmount = Math.round(payoutForm.baseAmountTl * (payoutForm.vatRatePct || 0) / 100);
    const totalAmount = payoutForm.baseAmountTl + vatAmount;
    createPayoutMutation.mutate({
      ...payoutForm,
      vatAmountTl: vatAmount,
      totalAmountTl: totalAmount
    } as any);
  };

  const handleDispatchSubmit = () => {
    if (!dispatchForm.agencyId) {
      toast({ title: "Hata", description: "Tedarikçi seçin", variant: "destructive" });
      return;
    }
    createDispatchMutation.mutate(dispatchForm);
  };

  const handleRateSubmit = () => {
    if (!rateForm.agencyId) {
      toast({ title: "Hata", description: "Tedarikçi seçin", variant: "destructive" });
      return;
    }
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: rateForm });
    } else {
      createRateMutation.mutate(rateForm);
    }
  };

  if (suppliersLoading || payoutsLoading) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Tedarikçi Yönetimi</h1>
            <p className="text-muted-foreground">Tedarikçi firmalara yapılan ödemeler ve takip</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select 
              value="custom"
              onValueChange={(value) => {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                
                if (value === 'today') {
                  setStartDate(today);
                  setEndDate(today);
                } else if (value === 'this-week') {
                  const dayOfWeek = now.getDay();
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  setStartDate(monday.toISOString().split('T')[0]);
                  setEndDate(today);
                } else if (value === 'this-month') {
                  setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                  setEndDate(today);
                } else if (value === 'last-month') {
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(lastMonthEnd.toISOString().split('T')[0]);
                } else if (value === 'last-3-months') {
                  const threeMonthsAgo = new Date(now);
                  threeMonthsAgo.setMonth(now.getMonth() - 3);
                  setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
                  setEndDate(today);
                } else if (value === 'this-year') {
                  setStartDate(`${now.getFullYear()}-01-01`);
                  setEndDate(today);
                } else if (value === 'all-time') {
                  setStartDate('2020-01-01');
                  setEndDate(today);
                }
              }}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-date-preset">
                <SelectValue placeholder="Hızlı Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="this-week">Bu Hafta</SelectItem>
                <SelectItem value="this-month">Bu Ay</SelectItem>
                <SelectItem value="last-month">Geçen Ay</SelectItem>
                <SelectItem value="last-3-months">Son 3 Ay</SelectItem>
                <SelectItem value="this-year">Bu Yıl</SelectItem>
                <SelectItem value="all-time">Tüm Zamanlar</SelectItem>
                <SelectItem value="custom">Özel</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-36"
                data-testid="input-start-date"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-36"
              data-testid="input-end-date"
            />
          </div>
        </div>

        {/* Currency Exchange Rates & Converter Widget */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Guncel Doviz Kurlari</CardTitle>
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
              {/* Current Rates Display */}
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
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-muted-foreground">USD/EUR</span>
                      </div>
                      <div className="text-xl font-bold" data-testid="text-usd-eur-rate">
                        {exchangeRates.USD.EUR.toFixed(4)}
                      </div>
                      <p className="text-xs text-muted-foreground">1 USD = {exchangeRates.USD.EUR.toFixed(4)} EUR</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-1">
                        <Euro className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-muted-foreground">EUR/USD</span>
                      </div>
                      <div className="text-xl font-bold" data-testid="text-eur-usd-rate">
                        {exchangeRates.EUR.USD.toFixed(4)}
                      </div>
                      <p className="text-xs text-muted-foreground">1 EUR = {exchangeRates.EUR.USD.toFixed(4)} USD</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Kur bilgisi alınamadı
                  </div>
                )}
              </div>

              {/* Currency Converter */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium text-muted-foreground">Doviz Hesaplayiçi</h4>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Acenta</CardTitle>
              <Umbrella className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-supplier-count">{suppliers.length}</div>
              <p className="text-xs text-muted-foreground">Aktif acenta firma</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Gönderilen Misafir</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-guest-count">{totalGuests}</div>
              <p className="text-xs text-muted-foreground">Seçili dönemde</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Ödeme</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-paid">{formatMoney(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">Acentalara ödenen</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dispatches" className="space-y-4">
          <TabsList className="h-14 p-1.5 gap-1">
            <TabsTrigger value="dispatches" className="h-11 px-5 text-sm font-medium gap-2 rounded-md" data-testid="tab-dispatches">
              <UserCheck className="h-5 w-5" />
              Gönderilen Müşteri
            </TabsTrigger>
            <TabsTrigger value="payouts" className="h-11 px-5 text-sm font-medium gap-2 rounded-md" data-testid="tab-payouts">
              <CreditCard className="h-5 w-5" />
              Ödemeler
            </TabsTrigger>
            <TabsTrigger value="rates" className="h-11 px-5 text-sm font-medium gap-2 rounded-md" data-testid="tab-rates">
              <TableProperties className="h-5 w-5" />
              Fiyat Tablosu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dispatches" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Günlük Gönderimler</h3>
              <Button onClick={() => {
                setDispatchForm({
                  agencyId: 0,
                  activityId: 0,
                  dispatchDate: new Date().toISOString().split('T')[0],
                  dispatchTime: '10:00',
                  guestCount: 1,
                  unitPayoutTl: 0,
                  notes: ''
                });
                setDispatchDialogOpen(true);
              }} data-testid="button-add-dispatch">
                <Plus className="h-4 w-4 mr-2" />
                Gönderim Ekle
              </Button>
            </div>

            {dispatchSummary.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dispatchSummary.map(summary => {
                  const isDebt = summary.remainingTl > 0;
                  const isCredit = summary.remainingTl < 0;
                  const isSelected = selectedAgencyId === summary.agencyId;
                  return (
                    <Card 
                      key={summary.agencyId} 
                      data-testid={`card-summary-${summary.agencyId}`}
                      className={`cursor-pointer transition-all hover-elevate ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedAgencyId(isSelected ? null : summary.agencyId)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Umbrella className="h-4 w-4" />
                            {summary.agencyName}
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="text-xs">Seçili</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">Toplam Kişi:</span>
                          <span className="font-medium">{summary.totalGuests} kişi</span>
                        </div>
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">Toplam Borç:</span>
                          <span className="font-medium">{summary.totalOwedTl.toLocaleString('tr-TR')} TL</span>
                        </div>
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">Ödenen:</span>
                          <span className="font-medium text-green-600">{summary.totalPaidTl.toLocaleString('tr-TR')} TL</span>
                        </div>
                        <div className="flex justify-between gap-2 text-sm border-t pt-2">
                          <span className="text-muted-foreground">Kalan:</span>
                          <Badge variant={isDebt ? "destructive" : isCredit ? "secondary" : "outline"}>
                            {isCredit ? '+' : ''}{summary.remainingTl.toLocaleString('tr-TR')} TL
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">Gönderim Listesi</CardTitle>
                    {selectedAgencyId && (
                      <Badge variant="secondary" className="gap-1">
                        {suppliers.find(s => s.id === selectedAgencyId)?.name || 'Acenta'}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgencyId(null);
                          }}
                          data-testid="button-clear-agency-filter"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    <Badge variant="outline">{filteredDispatches.length} kayıt</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDispatchSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                    data-testid="button-toggle-sort"
                  >
                    {dispatchSortOrder === 'newest' ? (
                      <>
                        <ArrowDown className="h-4 w-4 mr-1" />
                        En Yeni
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4 mr-1" />
                        En Eski
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {filteredDispatches.map(dispatch => {
                    const supplier = suppliers.find(s => s.id === dispatch.agencyId);
                    const activity = activities.find(a => a.id === dispatch.activityId);
                    return (
                      <div key={dispatch.id} className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-lg" data-testid={`row-dispatch-${dispatch.id}`}>
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-medium flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            {supplier?.name || 'Bilinmeyen Acenta'}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {dispatch.dispatchDate} {dispatch.dispatchTime}
                            {activity && ` - ${activity.name}`}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Misafir:</span>
                            <span className="ml-1 font-medium">{dispatch.guestCount} kişi</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Birim:</span>
                            <span className="ml-1 font-medium">{formatMoney(dispatch.unitPayoutTl || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Toplam:</span>
                            <span className="ml-1 font-medium text-orange-600">{formatMoney(dispatch.totalPayoutTl || 0)}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Bu gönderim kaydını silmek istediğinize emin misiniz?')) {
                                deleteDispatchMutation.mutate(dispatch.id);
                              }
                            }}
                            data-testid={`button-delete-dispatch-${dispatch.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredDispatches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu dönemde gönderim kaydı bulunamadı
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Ödeme Kayıtları</h3>
              <Button onClick={() => {
                setPayoutForm({
                  agencyId: 0,
                  periodStart: startDate,
                  periodEnd: endDate,
                  description: '',
                  guestCount: 0,
                  baseAmountTl: 0,
                  vatRatePct: 0,
                  method: 'cash',
                  reference: '',
                  notes: '',
                  status: 'paid'
                });
                setPayoutDialogOpen(true);
              }} data-testid="button-add-payout">
                <Plus className="h-4 w-4 mr-2" />
                Ödeme Ekle
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {filteredPayouts.map(payout => {
                    const supplier = suppliers.find(s => s.id === payout.agencyId);
                    return (
                      <div key={payout.id} className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-lg" data-testid={`row-payout-${payout.id}`}>
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-medium flex items-center gap-2">
                            <Umbrella className="h-4 w-4" />
                            {supplier?.name || 'Bilinmeyen Acenta'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payout.periodStart} - {payout.periodEnd}
                            {payout.description && ` | ${payout.description}`}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Misafir:</span>
                            <span className="ml-1 font-medium">{payout.guestCount} kişi</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tutar:</span>
                            <span className="ml-1 font-medium text-orange-600">{formatMoney(payout.totalAmountTl || 0)}</span>
                          </div>
                          <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                            {payout.status === 'paid' ? 'Odendi' : 'Beklemede'}
                          </Badge>
                          <Badge variant="outline">{payout.method === 'cash' ? 'Nakit' : payout.method === 'bank' ? 'Banka' : payout.method}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
                                deletePayoutMutation.mutate(payout.id);
                              }
                            }}
                            data-testid={`button-delete-payout-${payout.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPayouts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu dönemde ödeme kaydı bulunamadı
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Fiyat Tablosu</h3>
              <Button onClick={() => { 
                setEditingRate(null);
                setRateForm({ agencyId: 0, activityId: 0, validFrom: new Date().toISOString().split('T')[0], validTo: '', unitPayoutTl: 0, unitPayoutUsd: 0, currency: 'TRY', notes: '' });
                setRateDialogOpen(true);
              }} data-testid="button-add-rate">
                <Plus className="h-4 w-4 mr-2" />
                Fiyat Ekle
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Acenta Fiyat Listesi</CardTitle>
                <CardDescription>
                  Acenta firmalar için dönem bazlı kişi başı ödeme fiyatları. Müşteri gönderiminde bu fiyatlar otomatik uygulanır.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rates.map(rate => {
                    const supplier = suppliers.find(s => s.id === rate.agencyId);
                    const activity = activities.find(a => a.id === rate.activityId);
                    const isTry = (rate.currency || 'TRY') === 'TRY';
                    const displayAmount = isTry ? (rate.unitPayoutTl || 0) : (rate.unitPayoutUsd || 0);
                    const currencySymbol = isTry ? 'TL' : 'USD';
                    return (
                      <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`card-rate-${rate.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Umbrella className="h-4 w-4" />
                            <span className="font-semibold">{supplier?.name || 'Bilinmeyen'}</span>
                            {activity && <Badge variant="outline">{activity.name}</Badge>}
                            {!activity && <Badge variant="secondary">Genel</Badge>}
                            <Badge variant={isTry ? "default" : "secondary"}>{currencySymbol}</Badge>
                            {!rate.isActive && <Badge variant="destructive">Pasif</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4" />
                            {rate.validFrom} - {rate.validTo || 'Süresiz'}
                          </div>
                          {rate.notes && <p className="text-sm text-muted-foreground mt-1">{rate.notes}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-600" data-testid={`text-rate-amount-${rate.id}`}>
                              {displayAmount.toLocaleString('tr-TR')} {currencySymbol}
                            </div>
                            <div className="text-xs text-muted-foreground">kişi başı</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingRate(rate);
                              setRateForm({
                                agencyId: rate.agencyId,
                                activityId: rate.activityId || 0,
                                validFrom: rate.validFrom,
                                validTo: rate.validTo || '',
                                unitPayoutTl: rate.unitPayoutTl || 0,
                                unitPayoutUsd: rate.unitPayoutUsd || 0,
                                currency: rate.currency || 'TRY',
                                notes: rate.notes || ''
                              });
                              setRateDialogOpen(true);
                            }} data-testid={`button-edit-rate-${rate.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteRateMutation.mutate(rate.id)} data-testid={`button-delete-rate-${rate.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {rates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Henuz fiyat tanımlanmamis
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ödeme Dialog */}
        <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ödeme Kaydı Ekle</DialogTitle>
              <DialogDescription>Tedarikçi firmaya yapılan ödemeyi kaydedin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tedarikçi</Label>
                <Select 
                  value={payoutForm.agencyId ? String(payoutForm.agencyId) : ""} 
                  onValueChange={v => {
                    const supplierId = parseInt(v);
                    const supplier = suppliers.find(s => s.id === supplierId);
                    setPayoutForm(f => ({ 
                      ...f, 
                      agencyId: supplierId,
                      baseAmountTl: supplier ? (f.guestCount * (supplier.defaultPayoutPerGuest || 0)) : f.baseAmountTl
                    }));
                  }}
                >
                  <SelectTrigger data-testid="select-payout-supplier">
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dönem Başlangıcı</Label>
                  <Input 
                    type="date"
                    value={payoutForm.periodStart}
                    onChange={e => setPayoutForm(f => ({ ...f, periodStart: e.target.value }))}
                    data-testid="input-payout-start"
                  />
                </div>
                <div>
                  <Label>Dönem Bitişi</Label>
                  <Input 
                    type="date"
                    value={payoutForm.periodEnd}
                    onChange={e => setPayoutForm(f => ({ ...f, periodEnd: e.target.value }))}
                    data-testid="input-payout-end"
                  />
                </div>
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input 
                  value={payoutForm.description}
                  onChange={e => setPayoutForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Örnek: Aralık ayı paragliding"
                  data-testid="input-payout-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Misafir Sayısı</Label>
                  <Input 
                    type="number"
                    value={payoutForm.guestCount}
                    onChange={e => {
                      const count = parseInt(e.target.value) || 0;
                      const supplier = suppliers.find(s => s.id === payoutForm.agencyId);
                      setPayoutForm(f => ({ 
                        ...f, 
                        guestCount: count,
                        baseAmountTl: supplier ? (count * (supplier.defaultPayoutPerGuest || 0)) : f.baseAmountTl
                      }));
                    }}
                    data-testid="input-payout-guests"
                  />
                </div>
                <div>
                  <Label>Tutar (TL)</Label>
                  <Input 
                    type="number"
                    value={payoutForm.baseAmountTl}
                    onChange={e => setPayoutForm(f => ({ ...f, baseAmountTl: parseInt(e.target.value) || 0 }))}
                    data-testid="input-payout-amount"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ödeme Yöntemi</Label>
                  <Select value={payoutForm.method} onValueChange={v => setPayoutForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger data-testid="select-payout-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Nakit</SelectItem>
                      <SelectItem value="bank">Banka Transferi</SelectItem>
                      <SelectItem value="card">Kart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Durum</Label>
                  <Select value={payoutForm.status} onValueChange={v => setPayoutForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-payout-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Odendi</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Referans / Dekont No</Label>
                <Input 
                  value={payoutForm.reference}
                  onChange={e => setPayoutForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="Ödeme referans numarası"
                  data-testid="input-payout-reference"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={payoutForm.notes}
                  onChange={e => setPayoutForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-payout-notes"
                />
              </div>
              {payoutForm.baseAmountTl > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Toplam Ödeme:</span>
                    <span className="font-bold text-orange-600">{formatMoney(payoutForm.baseAmountTl)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} data-testid="button-cancel-payout">İptal</Button>
              <Button 
                onClick={handlePayoutSubmit}
                disabled={createPayoutMutation.isPending}
                data-testid="button-save-payout"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gönderim Dialog */}
        <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gönderim Kaydı Ekle</DialogTitle>
              <DialogDescription>Tedarikçi firmaya gönderilen misafirleri kaydedin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tedarikçi</Label>
                <Select 
                  value={dispatchForm.agencyId ? String(dispatchForm.agencyId) : ""} 
                  onValueChange={v => {
                    const supplierId = parseInt(v);
                    const supplier = suppliers.find(s => s.id === supplierId);
                    setDispatchForm(f => ({ 
                      ...f, 
                      agencyId: supplierId,
                      unitPayoutTl: supplier?.defaultPayoutPerGuest || f.unitPayoutTl
                    }));
                  }}
                >
                  <SelectTrigger data-testid="select-dispatch-supplier">
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aktivite (Opsiyonel)</Label>
                <Select 
                  value={dispatchForm.activityId ? String(dispatchForm.activityId) : ""} 
                  onValueChange={v => setDispatchForm(f => ({ ...f, activityId: parseInt(v) || 0 }))}
                >
                  <SelectTrigger data-testid="select-dispatch-activity">
                    <SelectValue placeholder="Aktivite seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tarih</Label>
                  <Input 
                    type="date"
                    value={dispatchForm.dispatchDate}
                    onChange={e => setDispatchForm(f => ({ ...f, dispatchDate: e.target.value }))}
                    data-testid="input-dispatch-date"
                  />
                </div>
                <div>
                  <Label>Saat</Label>
                  <Input 
                    type="time"
                    value={dispatchForm.dispatchTime}
                    onChange={e => setDispatchForm(f => ({ ...f, dispatchTime: e.target.value }))}
                    data-testid="input-dispatch-time"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Misafir Sayısı</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={dispatchForm.guestCount}
                    onChange={e => setDispatchForm(f => ({ ...f, guestCount: parseInt(e.target.value) || 1 }))}
                    data-testid="input-dispatch-guests"
                  />
                </div>
                <div>
                  <Label>Kişi Başı (TL)</Label>
                  <Input 
                    type="number"
                    value={dispatchForm.unitPayoutTl}
                    onChange={e => setDispatchForm(f => ({ ...f, unitPayoutTl: parseInt(e.target.value) || 0 }))}
                    data-testid="input-dispatch-unit"
                  />
                </div>
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={dispatchForm.notes}
                  onChange={e => setDispatchForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-dispatch-notes"
                />
              </div>
              {dispatchForm.guestCount > 0 && dispatchForm.unitPayoutTl > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Toplam Ödeme:</span>
                    <span className="font-bold text-orange-600">{formatMoney(dispatchForm.guestCount * dispatchForm.unitPayoutTl)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDispatchDialogOpen(false)} data-testid="button-cancel-dispatch">İptal</Button>
              <Button 
                onClick={handleDispatchSubmit}
                disabled={createDispatchMutation.isPending}
                data-testid="button-save-dispatch"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fiyat Dialog */}
        <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Fiyat Düzenle' : 'Yeni Fiyat'}</DialogTitle>
              <DialogDescription>Acenta firma için dönemsel ödeme fiyatı tanımlayın</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Acenta</Label>
                <Select 
                  value={rateForm.agencyId ? String(rateForm.agencyId) : ""} 
                  onValueChange={v => setRateForm(f => ({ ...f, agencyId: parseInt(v) }))}
                >
                  <SelectTrigger data-testid="select-rate-supplier">
                    <SelectValue placeholder="Acenta seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aktivite (Opsiyonel - boş birakilirsa genel fiyat)</Label>
                <Select 
                  value={rateForm.activityId ? String(rateForm.activityId) : "0"} 
                  onValueChange={v => setRateForm(f => ({ ...f, activityId: parseInt(v) || 0 }))}
                >
                  <SelectTrigger data-testid="select-rate-activity">
                    <SelectValue placeholder="Genel fiyat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Genel (Tum aktiviteler)</SelectItem>
                    {activities.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Geçerlilik Başlangıçi</Label>
                  <Input 
                    type="date"
                    value={rateForm.validFrom}
                    onChange={e => setRateForm(f => ({ ...f, validFrom: e.target.value }))}
                    data-testid="input-rate-from"
                  />
                </div>
                <div>
                  <Label>Geçerlilik Bitişi (Opsiyonel)</Label>
                  <Input 
                    type="date"
                    value={rateForm.validTo}
                    onChange={e => setRateForm(f => ({ ...f, validTo: e.target.value }))}
                    data-testid="input-rate-to"
                  />
                </div>
              </div>
              <div>
                <Label>Para Birimi</Label>
                <Select 
                  value={rateForm.currency} 
                  onValueChange={v => setRateForm(f => ({ ...f, currency: v }))}
                >
                  <SelectTrigger data-testid="select-rate-currency">
                    <SelectValue placeholder="Para birimi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TL (Türk Lirası)</SelectItem>
                    <SelectItem value="USD">USD (Amerikan Doları)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kişi Başı Ödeme ({rateForm.currency === 'TRY' ? 'TL' : 'USD'})</Label>
                <Input 
                  type="number"
                  min="0"
                  value={rateForm.currency === 'TRY' ? rateForm.unitPayoutTl : rateForm.unitPayoutUsd}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    if (rateForm.currency === 'TRY') {
                      setRateForm(f => ({ ...f, unitPayoutTl: val }));
                    } else {
                      setRateForm(f => ({ ...f, unitPayoutUsd: val }));
                    }
                  }}
                  data-testid="input-rate-amount"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={rateForm.notes}
                  onChange={e => setRateForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-rate-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRateDialogOpen(false)} data-testid="button-cancel-rate">İptal</Button>
              <Button 
                onClick={handleRateSubmit}
                disabled={createRateMutation.isPending || updateRateMutation.isPending}
                data-testid="button-save-rate"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
