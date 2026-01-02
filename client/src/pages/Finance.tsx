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
  Send
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
  
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Agency | null>(null);
  const [editingRate, setEditingRate] = useState<AgencyActivityRate | null>(null);
  
  const [supplierForm, setSupplierForm] = useState({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
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

  // Tarih aralığına göre filtrelenmiş gönderimler
  const filteredDispatches = dispatches.filter(d => {
    if (!d.dispatchDate) return false;
    return d.dispatchDate >= startDate && d.dispatchDate <= endDate;
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
  const createSupplierMutation = useMutation({
    mutationFn: async (data: typeof supplierForm) => apiRequest('POST', '/api/finance/agencies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setSupplierDialogOpen(false);
      setSupplierForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
      toast({ title: "Tedarikçi eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Tedarikçi eklenemedi", variant: "destructive" });
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof supplierForm }) => 
      apiRequest('PATCH', `/api/finance/agencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setSupplierDialogOpen(false);
      setEditingSupplier(null);
      toast({ title: "Tedarikçi güncellendi" });
    }
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/agencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      toast({ title: "Tedarikçi silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Tedarikçi silinemedi", variant: "destructive" });
    }
  });

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

  const handleSupplierSubmit = () => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data: supplierForm });
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
  };

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
          <div className="flex items-center gap-2">
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

        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList className="h-14 p-1.5 gap-1">
            <TabsTrigger value="suppliers" className="h-11 px-5 text-sm font-medium gap-2 rounded-md" data-testid="tab-suppliers">
              <Umbrella className="h-5 w-5" />
              Acentalar
            </TabsTrigger>
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

          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Acenta Firmalari</h3>
              <Button onClick={() => { 
                setEditingSupplier(null); 
                setSupplierForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' }); 
                setSupplierDialogOpen(true); 
              }} data-testid="button-add-supplier">
                <Plus className="h-4 w-4 mr-2" />
                Acenta Ekle
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplierSummary.map(supplier => (
                <Card key={supplier.id} data-testid={`card-supplier-${supplier.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Umbrella className="h-5 w-5" />
                        {supplier.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingSupplier(supplier);
                          setSupplierForm({
                            name: supplier.name,
                            contactInfo: supplier.contactInfo || '',
                            defaultPayoutPerGuest: supplier.defaultPayoutPerGuest || 0,
                            notes: supplier.notes || ''
                          });
                          setSupplierDialogOpen(true);
                        }} data-testid={`button-edit-supplier-${supplier.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm(`${supplier.name} tedarikçisini ve tüm ödeme kayıtlarını silmek istediğinize emin misiniz?`)) {
                            deleteSupplierMutation.mutate(supplier.id);
                          }
                        }} data-testid={`button-delete-supplier-${supplier.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {supplier.contactInfo && (
                      <CardDescription>{supplier.contactInfo}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kişi başı ödeme:</span>
                      <span className="font-medium">{formatMoney(supplier.defaultPayoutPerGuest || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gönderilen misafir:</span>
                      <span className="font-medium">{supplier.guestCount} kişi</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Toplam ödeme:</span>
                      <span className="font-medium text-orange-600">{formatMoney(supplier.totalPaid)}</span>
                    </div>
                    {supplier.notes && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">{supplier.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {suppliers.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Henüz tedarikçi eklenmemiş
                </div>
              )}
            </div>
          </TabsContent>

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
                  return (
                    <Card key={summary.agencyId} data-testid={`card-summary-${summary.agencyId}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Umbrella className="h-4 w-4" />
                          {summary.agencyName}
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
              <CardContent className="pt-4">
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
                            {rate.validFrom} - {rate.validTo || 'Suresiz'}
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
                      Henuz fiyat tanimlanmamis
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tedarikci Dialog */}
        <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}</DialogTitle>
              <DialogDescription>Aktivite sağlayıcı firma bilgilerini girin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Firma Adı</Label>
                <Input 
                  value={supplierForm.name} 
                  onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Örnek: UP Firma, Dalış Merkezi"
                  data-testid="input-supplier-name"
                />
              </div>
              <div>
                <Label>Iletisim Bilgisi</Label>
                <Input 
                  value={supplierForm.contactInfo} 
                  onChange={e => setSupplierForm(f => ({ ...f, contactInfo: e.target.value }))}
                  placeholder="Telefon veya email"
                  data-testid="input-supplier-contact"
                />
              </div>
              <div>
                <Label>Kişi Başı Ödeme (TL)</Label>
                <Input 
                  type="number" 
                  value={supplierForm.defaultPayoutPerGuest} 
                  onChange={e => setSupplierForm(f => ({ ...f, defaultPayoutPerGuest: parseInt(e.target.value) || 0 }))}
                  data-testid="input-supplier-payout"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea 
                  value={supplierForm.notes} 
                  onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek bilgiler..."
                  data-testid="input-supplier-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSupplierDialogOpen(false)} data-testid="button-cancel-supplier">İptal</Button>
              <Button 
                onClick={handleSupplierSubmit}
                disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                data-testid="button-save-supplier"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Odeme Dialog */}
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

        {/* Gonderim Dialog */}
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
                  <Label>Kisi Basi (TL)</Label>
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
                <Label>Aktivite (Opsiyonel - bos birakilirsa genel fiyat)</Label>
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
                  <Label>Gecerlilik Baslangici</Label>
                  <Input 
                    type="date"
                    value={rateForm.validFrom}
                    onChange={e => setRateForm(f => ({ ...f, validFrom: e.target.value }))}
                    data-testid="input-rate-from"
                  />
                </div>
                <div>
                  <Label>Gecerlilik Bitisi (Opsiyonel)</Label>
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
