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
  Building2, 
  Plus, 
  Trash2, 
  Edit,
  CreditCard,
  Calendar
} from "lucide-react";
import type { Agency, AgencyPayout } from "@shared/schema";
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
  const [editingSupplier, setEditingSupplier] = useState<Agency | null>(null);
  
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

  // Tedarikçiler (Suppliers)
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });

  // Ödemeler
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<AgencyPayout[]>({
    queryKey: ['/api/finance/payouts']
  });

  // Tarih aralığına göre filtrelenmiş ödemeler
  const filteredPayouts = payouts.filter(p => {
    if (p.periodStart && p.periodStart < startDate) return false;
    if (p.periodEnd && p.periodEnd > endDate) return false;
    return true;
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
      toast({ title: "Tedarikci eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Tedarikci eklenemedi", variant: "destructive" });
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof supplierForm }) => 
      apiRequest('PATCH', `/api/finance/agencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setSupplierDialogOpen(false);
      setEditingSupplier(null);
      toast({ title: "Tedarikci guncellendi" });
    }
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/agencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      toast({ title: "Tedarikci silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Tedarikci silinemedi", variant: "destructive" });
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
      toast({ title: "Odeme kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Odeme kaydedilemedi", variant: "destructive" });
    }
  });

  const deletePayoutMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/payouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      toast({ title: "Odeme silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Odeme silinemedi", variant: "destructive" });
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
      toast({ title: "Hata", description: "Tedarikci secin", variant: "destructive" });
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
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Tedarikci Yonetimi</h1>
            <p className="text-muted-foreground">Tedarikci firmalara yapilan odemeler ve takip</p>
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
              <CardTitle className="text-sm font-medium">Toplam Tedarikci</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-supplier-count">{suppliers.length}</div>
              <p className="text-xs text-muted-foreground">Aktif tedarikci firma</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Gonderilen Misafir</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-guest-count">{totalGuests}</div>
              <p className="text-xs text-muted-foreground">Secili donemde</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Odeme</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-paid">{formatMoney(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">Tedarikçilere odenen</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers" data-testid="tab-suppliers">Tedarikciler</TabsTrigger>
            <TabsTrigger value="payouts" data-testid="tab-payouts">Odemeler</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Tedarikci Firmalari</h3>
              <Button onClick={() => { 
                setEditingSupplier(null); 
                setSupplierForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' }); 
                setSupplierDialogOpen(true); 
              }} data-testid="button-add-supplier">
                <Plus className="h-4 w-4 mr-2" />
                Tedarikci Ekle
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplierSummary.map(supplier => (
                <Card key={supplier.id} data-testid={`card-supplier-${supplier.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
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
                      <span className="text-muted-foreground">Kisi basi odeme:</span>
                      <span className="font-medium">{formatMoney(supplier.defaultPayoutPerGuest || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gonderilen misafir:</span>
                      <span className="font-medium">{supplier.guestCount} kisi</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Toplam odeme:</span>
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
                  Henuz tedarikci eklenmemis
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Odeme Kayitlari</h3>
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
                Odeme Ekle
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
                            <Building2 className="h-4 w-4" />
                            {supplier?.name || 'Bilinmeyen Tedarikci'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payout.periodStart} - {payout.periodEnd}
                            {payout.description && ` | ${payout.description}`}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Misafir:</span>
                            <span className="ml-1 font-medium">{payout.guestCount} kisi</span>
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
                              if (confirm('Bu odeme kaydini silmek istediginize emin misiniz?')) {
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
                      Bu donemde odeme kaydi bulunamadi
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
              <DialogTitle>{editingSupplier ? 'Tedarikci Duzenle' : 'Yeni Tedarikci'}</DialogTitle>
              <DialogDescription>Aktivite saglayici firma bilgilerini girin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Firma Adi</Label>
                <Input 
                  value={supplierForm.name} 
                  onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ornek: UP Firma, Dalis Merkezi"
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
                <Label>Kisi Basi Odeme (TL)</Label>
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
              <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Iptal</Button>
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
              <DialogTitle>Odeme Kaydi Ekle</DialogTitle>
              <DialogDescription>Tedarikci firmaya yapilan odemeyi kaydedin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tedarikci</Label>
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
                    <SelectValue placeholder="Tedarikci secin" />
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
                  <Label>Donem Baslangici</Label>
                  <Input 
                    type="date"
                    value={payoutForm.periodStart}
                    onChange={e => setPayoutForm(f => ({ ...f, periodStart: e.target.value }))}
                    data-testid="input-payout-start"
                  />
                </div>
                <div>
                  <Label>Donem Bitisi</Label>
                  <Input 
                    type="date"
                    value={payoutForm.periodEnd}
                    onChange={e => setPayoutForm(f => ({ ...f, periodEnd: e.target.value }))}
                    data-testid="input-payout-end"
                  />
                </div>
              </div>
              <div>
                <Label>Aciklama</Label>
                <Input 
                  value={payoutForm.description}
                  onChange={e => setPayoutForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ornek: Aralik ayi paragliding"
                  data-testid="input-payout-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Misafir Sayisi</Label>
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
                  <Label>Odeme Yontemi</Label>
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
                  placeholder="Odeme referans numarasi"
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
                    <span>Toplam Odeme:</span>
                    <span className="font-bold text-orange-600">{formatMoney(payoutForm.baseAmountTl)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>Iptal</Button>
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
      </main>
    </div>
  );
}
