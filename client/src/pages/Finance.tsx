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
  Calculator, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Building, 
  Plus, 
  Trash2, 
  Edit,
  Receipt,
  CreditCard,
  PiggyBank,
  Calendar
} from "lucide-react";
import type { Agency, Activity, ActivityCost, Settlement } from "@shared/schema";
import { format } from "date-fns";

interface FinanceOverview {
  period: { startDate: string; endDate: string };
  vatRate: number;
  totals: {
    revenueTl: number;
    revenueUsd: number;
    costTl: number;
    vatTl: number;
    payoutTl: number;
    profitTl: number;
    reservationCount: number;
    guestCount: number;
  };
  activityStats: Array<{
    activityId: number;
    activityName: string;
    reservationCount: number;
    guestCount: number;
    revenueTl: number;
    revenueUsd: number;
    costTl: number;
    profitTl: number;
    vatTl: number;
  }>;
  agencyPayouts: Array<{
    agencyId: number;
    agencyName: string;
    guestCount: number;
    payoutTl: number;
    paidTl: number;
    remainingTl: number;
  }>;
}

export default function Finance() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const selectedMonth = startDate.slice(0, 7);
  const [agencyDialogOpen, setAgencyDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [selectedAgencyForSettlement, setSelectedAgencyForSettlement] = useState<number | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  
  const [agencyForm, setAgencyForm] = useState({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
  const [costForm, setCostForm] = useState({ activityId: 0, month: selectedMonth, fixedCost: 0, variableCostPerGuest: 0 });
  const [paymentForm, setPaymentForm] = useState({ amountTl: 0, method: 'cash', reference: '', notes: '' });
  const [settlementForm, setSettlementForm] = useState({ 
    periodStart: startDate, 
    periodEnd: endDate, 
    vatRatePct: 20 
  });

  const { data: overview, isLoading: overviewLoading } = useQuery<FinanceOverview>({
    queryKey: ['/api/finance/overview', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/finance/overview?startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    }
  });

  const { data: agencies = [], isLoading: agenciesLoading } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  const { data: costs = [] } = useQuery<ActivityCost[]>({
    queryKey: ['/api/finance/costs', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/finance/costs?month=${selectedMonth}`);
      return res.json();
    }
  });

  const { data: settlements = [] } = useQuery<Settlement[]>({
    queryKey: ['/api/finance/settlements']
  });

  const createAgencyMutation = useMutation({
    mutationFn: async (data: typeof agencyForm) => apiRequest('POST', '/api/finance/agencies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setAgencyDialogOpen(false);
      setAgencyForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
      toast({ title: "Acenta eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta eklenemedi", variant: "destructive" });
    }
  });

  const updateAgencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof agencyForm }) => 
      apiRequest('PATCH', `/api/finance/agencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setAgencyDialogOpen(false);
      setEditingAgency(null);
      toast({ title: "Acenta guncellendi" });
    }
  });

  const deleteAgencyMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/agencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      toast({ title: "Acenta silindi" });
    }
  });

  const saveCostMutation = useMutation({
    mutationFn: async (data: typeof costForm) => {
      console.log('Saving cost:', data);
      return apiRequest('POST', '/api/finance/costs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/overview'] });
      setCostDialogOpen(false);
      toast({ title: "Maliyet kaydedildi" });
    },
    onError: (error: any) => {
      console.error('Cost save error:', error);
      toast({ title: "Hata", description: error?.message || "Maliyet kaydedilemedi", variant: "destructive" });
    }
  });

  const generateSettlementMutation = useMutation({
    mutationFn: async (data: { agencyId: number; periodStart: string; periodEnd: string; vatRatePct: number }) =>
      apiRequest('POST', '/api/finance/settlements/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/settlements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/overview'] });
      setSettlementDialogOpen(false);
      toast({ title: "Hesaplasma olusturuldu" });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { settlementId: number; amountTl: number; method: string; reference: string; notes: string }) =>
      apiRequest('POST', '/api/finance/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/settlements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/overview'] });
      setPaymentDialogOpen(false);
      setPaymentForm({ amountTl: 0, method: 'cash', reference: '', notes: '' });
      toast({ title: "Odeme kaydedildi" });
    }
  });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  if (overviewLoading || agenciesLoading) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
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
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Finans & Acenta Yonetimi</h1>
            <p className="text-muted-foreground">Kar analizi, maliyetler ve acenta hesaplasmalari</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-revenue">{formatMoney(overview?.totals.revenueTl || 0)}</div>
              <p className="text-xs text-muted-foreground">{overview?.totals.reservationCount || 0} rezervasyon</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Maliyet</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-cost">{formatMoney(overview?.totals.costTl || 0)}</div>
              <p className="text-xs text-muted-foreground">Aktivite maliyetleri</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">KDV ({overview?.vatRate || 20}%)</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-vat">{formatMoney(overview?.totals.vatTl || 0)}</div>
              <p className="text-xs text-muted-foreground">Hesaplanan KDV</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Net Kar</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(overview?.totals.profitTl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-profit">
                {formatMoney(overview?.totals.profitTl || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Gelir - Maliyet - KDV - Acenta</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activities" data-testid="tab-activities">Aktivite Bazli</TabsTrigger>
            <TabsTrigger value="costs" data-testid="tab-costs">Maliyetler</TabsTrigger>
            <TabsTrigger value="agencies" data-testid="tab-agencies">Acentalar</TabsTrigger>
            <TabsTrigger value="settlements" data-testid="tab-settlements">Hesaplamalar</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktivite Bazli Gelir/Gider Analizi</CardTitle>
                <CardDescription>{startDate} - {endDate} donemi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview?.activityStats.map(stat => (
                    <div key={stat.activityId} className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-lg" data-testid={`row-activity-${stat.activityId}`}>
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-medium">{stat.activityName}</div>
                        <div className="text-sm text-muted-foreground">
                          {stat.reservationCount} rezervasyon, {stat.guestCount} misafir
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Gelir:</span>
                          <span className="ml-1 font-medium text-green-600">{formatMoney(stat.revenueTl)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Maliyet:</span>
                          <span className="ml-1 font-medium text-orange-600">{formatMoney(stat.costTl)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">KDV:</span>
                          <span className="ml-1 font-medium text-blue-600">{formatMoney(stat.vatTl)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kar:</span>
                          <span className={`ml-1 font-medium ${stat.profitTl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMoney(stat.profitTl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!overview?.activityStats || overview.activityStats.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu donemde rezervasyon bulunamadi
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Aktivite Maliyetleri ({selectedMonth})</h3>
              <Button onClick={() => setCostDialogOpen(true)} data-testid="button-add-cost">
                <Plus className="h-4 w-4 mr-2" />
                Maliyet Ekle
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {activities.map(activity => {
                    const cost = costs.find(c => c.activityId === activity.id);
                    return (
                      <div key={activity.id} className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-lg" data-testid={`row-cost-${activity.id}`}>
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-medium">{activity.name}</div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sabit:</span>
                            <span className="ml-1 font-medium">{formatMoney(cost?.fixedCost || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Kisi basi:</span>
                            <span className="ml-1 font-medium">{formatMoney(cost?.variableCostPerGuest || 0)}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCostForm({
                                activityId: activity.id,
                                month: selectedMonth,
                                fixedCost: cost?.fixedCost || 0,
                                variableCostPerGuest: cost?.variableCostPerGuest || 0
                              });
                              setCostDialogOpen(true);
                            }}
                            data-testid={`button-edit-cost-${activity.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agencies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Acentalar</h3>
              <Button onClick={() => { setEditingAgency(null); setAgencyForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' }); setAgencyDialogOpen(true); }} data-testid="button-add-agency">
                <Plus className="h-4 w-4 mr-2" />
                Acenta Ekle
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agencies.map(agency => {
                const payout = overview?.agencyPayouts.find(a => a.agencyId === agency.id);
                return (
                  <Card key={agency.id} data-testid={`card-agency-${agency.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {agency.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingAgency(agency);
                            setAgencyForm({
                              name: agency.name,
                              contactInfo: agency.contactInfo || '',
                              defaultPayoutPerGuest: agency.defaultPayoutPerGuest || 0,
                              notes: agency.notes || ''
                            });
                            setAgencyDialogOpen(true);
                          }} data-testid={`button-edit-agency-${agency.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteAgencyMutation.mutate(agency.id)} data-testid={`button-delete-agency-${agency.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {agency.contactInfo && <CardDescription>{agency.contactInfo}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Kisi basi odeme:</span>
                        <span className="ml-2 font-medium">{formatMoney(agency.defaultPayoutPerGuest || 0)}</span>
                      </div>
                      {payout && (
                        <>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Bu ay ({payout.guestCount} kisi):</span>
                            <span className="ml-2 font-medium">{formatMoney(payout.payoutTl)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Odenen:</span>
                            <span className="ml-2 font-medium text-green-600">{formatMoney(payout.paidTl)}</span>
                          </div>
                          {payout.remainingTl > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Kalan:</span>
                              <span className="ml-2 font-medium text-orange-600">{formatMoney(payout.remainingTl)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedAgencyForSettlement(agency.id);
                          setSettlementDialogOpen(true);
                        }}
                        data-testid={`button-settlement-${agency.id}`}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Hesaplasma Olustur
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {agencies.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Henuz acenta eklenmemis
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settlements" className="space-y-4">
            <h3 className="text-lg font-semibold">Hesaplasma Gecmisi</h3>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {settlements.map(settlement => {
                    const agency = agencies.find(a => a.id === settlement.agencyId);
                    return (
                      <div key={settlement.id} className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-lg" data-testid={`row-settlement-${settlement.id}`}>
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-medium flex items-center gap-2">
                            {agency?.name || 'Bilinmeyen Acenta'}
                            <Badge variant={settlement.status === 'paid' ? 'default' : settlement.status === 'approved' ? 'secondary' : 'outline'}>
                              {settlement.status === 'paid' ? 'Odendi' : settlement.status === 'approved' ? 'Onaylandi' : 'Taslak'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {settlement.periodStart} - {settlement.periodEnd} | {settlement.totalGuests} misafir
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm items-center">
                          <div>
                            <span className="text-muted-foreground">Borc:</span>
                            <span className="ml-1 font-medium">{formatMoney(settlement.payoutTl || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Odenen:</span>
                            <span className="ml-1 font-medium text-green-600">{formatMoney(settlement.paidAmountTl || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Kalan:</span>
                            <span className="ml-1 font-medium text-orange-600">{formatMoney(settlement.remainingTl || 0)}</span>
                          </div>
                          {settlement.remainingTl && settlement.remainingTl > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSettlement(settlement);
                                setPaymentForm({ amountTl: settlement.remainingTl || 0, method: 'cash', reference: '', notes: '' });
                                setPaymentDialogOpen(true);
                              }}
                              data-testid={`button-payment-${settlement.id}`}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Odeme Yap
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {settlements.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Henuz hesaplasma olusturulmamis
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={agencyDialogOpen} onOpenChange={setAgencyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAgency ? 'Acenta Duzenle' : 'Yeni Acenta'}</DialogTitle>
              <DialogDescription>Acenta bilgilerini girin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Acenta Adi</Label>
                <Input 
                  value={agencyForm.name} 
                  onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value }))}
                  data-testid="input-agency-name"
                />
              </div>
              <div>
                <Label>Iletisim Bilgisi</Label>
                <Input 
                  value={agencyForm.contactInfo} 
                  onChange={e => setAgencyForm(f => ({ ...f, contactInfo: e.target.value }))}
                  data-testid="input-agency-contact"
                />
              </div>
              <div>
                <Label>Kisi Basi Odeme (TL)</Label>
                <Input 
                  type="number"
                  value={agencyForm.defaultPayoutPerGuest} 
                  onChange={e => setAgencyForm(f => ({ ...f, defaultPayoutPerGuest: parseInt(e.target.value) || 0 }))}
                  data-testid="input-agency-payout"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Input 
                  value={agencyForm.notes} 
                  onChange={e => setAgencyForm(f => ({ ...f, notes: e.target.value }))}
                  data-testid="input-agency-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAgencyDialogOpen(false)}>Iptal</Button>
              <Button 
                onClick={() => {
                  if (editingAgency) {
                    updateAgencyMutation.mutate({ id: editingAgency.id, data: agencyForm });
                  } else {
                    createAgencyMutation.mutate(agencyForm);
                  }
                }}
                disabled={createAgencyMutation.isPending || updateAgencyMutation.isPending}
                data-testid="button-save-agency"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Maliyet Duzenle</DialogTitle>
              <DialogDescription>Secili donem icin maliyet</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Aktivite</Label>
                <Select 
                  value={costForm.activityId ? String(costForm.activityId) : ""} 
                  onValueChange={v => setCostForm(f => ({ ...f, activityId: parseInt(v) }))}
                >
                  <SelectTrigger data-testid="select-cost-activity">
                    <SelectValue placeholder="Aktivite secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sabit Maliyet (TL)</Label>
                <Input 
                  type="number"
                  value={costForm.fixedCost} 
                  onChange={e => setCostForm(f => ({ ...f, fixedCost: parseInt(e.target.value) || 0 }))}
                  data-testid="input-cost-fixed"
                />
              </div>
              <div>
                <Label>Kisi Basi Degisken Maliyet (TL)</Label>
                <Input 
                  type="number"
                  value={costForm.variableCostPerGuest} 
                  onChange={e => setCostForm(f => ({ ...f, variableCostPerGuest: parseInt(e.target.value) || 0 }))}
                  data-testid="input-cost-variable"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCostDialogOpen(false)}>Iptal</Button>
              <Button 
                onClick={() => saveCostMutation.mutate({ ...costForm, month: selectedMonth })}
                disabled={saveCostMutation.isPending || !costForm.activityId}
                data-testid="button-save-cost"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={settlementDialogOpen} onOpenChange={(open) => {
          setSettlementDialogOpen(open);
          if (open) {
            setSettlementForm({
              periodStart: startDate,
              periodEnd: endDate,
              vatRatePct: 20
            });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hesaplasma Olustur</DialogTitle>
              <DialogDescription>Secili acenta icin yeni hesaplasma donemi olusturun</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Donem Baslangici</Label>
                <Input 
                  type="date"
                  value={settlementForm.periodStart}
                  onChange={e => setSettlementForm(f => ({ ...f, periodStart: e.target.value }))}
                  data-testid="input-settlement-start"
                />
              </div>
              <div>
                <Label>Donem Bitisi</Label>
                <Input 
                  type="date"
                  value={settlementForm.periodEnd}
                  onChange={e => setSettlementForm(f => ({ ...f, periodEnd: e.target.value }))}
                  data-testid="input-settlement-end"
                />
              </div>
              <div>
                <Label>KDV Orani (%)</Label>
                <Input 
                  type="number"
                  value={settlementForm.vatRatePct}
                  onChange={e => setSettlementForm(f => ({ ...f, vatRatePct: parseInt(e.target.value) || 20 }))}
                  data-testid="input-settlement-vat"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettlementDialogOpen(false)}>Iptal</Button>
              <Button 
                onClick={() => {
                  if (selectedAgencyForSettlement && settlementForm.periodStart && settlementForm.periodEnd) {
                    generateSettlementMutation.mutate({
                      agencyId: selectedAgencyForSettlement,
                      periodStart: settlementForm.periodStart,
                      periodEnd: settlementForm.periodEnd,
                      vatRatePct: settlementForm.vatRatePct
                    });
                  }
                }}
                disabled={generateSettlementMutation.isPending}
                data-testid="button-generate-settlement"
              >
                Olustur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Odeme Kaydet</DialogTitle>
              <DialogDescription>Hesaplasmaya odeme ekleyin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tutar (TL)</Label>
                <Input 
                  type="number"
                  value={paymentForm.amountTl} 
                  onChange={e => setPaymentForm(f => ({ ...f, amountTl: parseInt(e.target.value) || 0 }))}
                  data-testid="input-payment-amount"
                />
              </div>
              <div>
                <Label>Odeme Yontemi</Label>
                <Select value={paymentForm.method} onValueChange={v => setPaymentForm(f => ({ ...f, method: v }))}>
                  <SelectTrigger data-testid="select-payment-method">
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
                <Label>Referans (Dekont No vb.)</Label>
                <Input 
                  value={paymentForm.reference} 
                  onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                  data-testid="input-payment-reference"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Input 
                  value={paymentForm.notes} 
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  data-testid="input-payment-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Iptal</Button>
              <Button 
                onClick={() => {
                  if (selectedSettlement) {
                    createPaymentMutation.mutate({
                      settlementId: selectedSettlement.id,
                      ...paymentForm
                    });
                  }
                }}
                disabled={createPaymentMutation.isPending || !paymentForm.amountTl}
                data-testid="button-save-payment"
              >
                Odeme Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
