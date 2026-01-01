import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Package, Clock, Link as LinkIcon, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PackageTour, Activity, PackageTourActivity } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PackageTours() {
  const { data: packageTours = [], isLoading } = useQuery<PackageTour[]>({
    queryKey: ['/api/package-tours']
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/package-tours/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-tours'] });
    }
  });

  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (confirm("Bu paket turu silmek istediginize emin misiniz?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Basarili", description: "Paket tur silindi." });
      } catch (error) {
        toast({ title: "Hata", description: "Silme islemi basarisiz.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">Paket Turlar</h1>
            <p className="text-muted-foreground mt-1">Birden fazla aktivite iceren paket turlarinizi yonetin</p>
          </div>
          <PackageTourDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packageTours.map((tour) => (
              <PackageTourCard 
                key={tour.id} 
                tour={tour} 
                onDelete={() => handleDelete(tour.id)} 
              />
            ))}
            {packageTours.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                Henuz hic paket tur eklenmemis.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function PackageTourCard({ tour, onDelete }: { tour: PackageTour; onDelete: () => void }) {
  const { data: tourActivities = [] } = useQuery<PackageTourActivity[]>({
    queryKey: ['/api/package-tours', tour.id, 'activities']
  });
  
  const { data: allActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });

  return (
    <div className="dashboard-card group relative overflow-hidden flex flex-col h-full" data-testid={`card-package-tour-${tour.id}`}>
      <div className="h-40 bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-6 flex items-center justify-center">
        <Package className="w-16 h-16 text-purple-500/40 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-xl" data-testid={`text-tour-name-${tour.id}`}>{tour.name}</h3>
          <Badge variant={tour.active ? "default" : "secondary"}>
            {tour.active ? 'Aktif' : 'Pasif'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {tour.description || "Aciklama yok"}
        </p>
        
        <div className="flex items-center gap-4 text-sm font-medium text-foreground/80 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">TL</span>
            {tour.price?.toLocaleString('tr-TR') || 0}
          </div>
          {tour.priceUsd && tour.priceUsd > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">$</span>
              {tour.priceUsd}
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1 mb-4">
          {tourActivities.map(ta => {
            const activity = allActivities.find(a => a.id === ta.activityId);
            return activity ? (
              <Badge key={ta.id} variant="outline" className="text-xs">
                {activity.name} ({ta.defaultTime})
              </Badge>
            ) : null;
          })}
          {tourActivities.length === 0 && (
            <span className="text-xs text-muted-foreground">Aktivite eklenmemis</span>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t mt-auto">
          <PackageTourDialog tour={tour} trigger={
            <Button variant="outline" className="flex-1" data-testid={`button-edit-tour-${tour.id}`}>
              <Edit className="w-4 h-4 mr-2" /> Duzenle
            </Button>
          } />
          <Button variant="destructive" size="icon" onClick={onDelete} data-testid={`button-delete-tour-${tour.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TourActivityForm {
  activityId: number;
  dayOffset: number;
  defaultTime: string;
}

function PackageTourDialog({ tour, trigger }: { tour?: PackageTour; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: allActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities']
  });
  
  const { data: existingActivities = [] } = useQuery<PackageTourActivity[]>({
    queryKey: ['/api/package-tours', tour?.id, 'activities'],
    enabled: !!tour
  });

  const [form, setForm] = useState({
    name: tour?.name || '',
    nameAliases: tour?.nameAliases || '[]',
    description: tour?.description || '',
    price: tour?.price || 0,
    priceUsd: tour?.priceUsd || 0,
    confirmationMessage: tour?.confirmationMessage || 'Sayin {isim}, paket tur rezervasyonunuz onaylanmistir. Tarih: {tarih}. Tesekkur ederiz.',
    reservationLink: tour?.reservationLink || '',
    reservationLinkEn: tour?.reservationLinkEn || '',
    active: tour?.active !== false
  });
  
  const [tourActivities, setTourActivities] = useState<TourActivityForm[]>([]);
  const [aliasInput, setAliasInput] = useState('');

  // Initialize tour activities when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setForm({
        name: tour?.name || '',
        nameAliases: tour?.nameAliases || '[]',
        description: tour?.description || '',
        price: tour?.price || 0,
        priceUsd: tour?.priceUsd || 0,
        confirmationMessage: tour?.confirmationMessage || 'Sayin {isim}, paket tur rezervasyonunuz onaylanmistir. Tarih: {tarih}. Tesekkur ederiz.',
        reservationLink: tour?.reservationLink || '',
        reservationLinkEn: tour?.reservationLinkEn || '',
        active: tour?.active !== false
      });
      if (tour && existingActivities.length > 0) {
        setTourActivities(existingActivities.map(ea => ({
          activityId: ea.activityId,
          dayOffset: ea.dayOffset || 0,
          defaultTime: ea.defaultTime || '09:00'
        })));
      } else {
        setTourActivities([]);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/package-tours', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-tours'] });
      setOpen(false);
      toast({ title: "Basarili", description: "Paket tur olusturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Paket tur olusturulamadi.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('PATCH', `/api/package-tours/${tour?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/package-tours'] });
      setOpen(false);
      toast({ title: "Basarili", description: "Paket tur guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Paket tur guncellenemedi.", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Hata", description: "Paket tur adi zorunlu", variant: "destructive" });
      return;
    }
    
    const payload = {
      ...form,
      activities: tourActivities.filter(ta => ta.activityId > 0)
    };
    
    if (tour) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const addActivity = () => {
    setTourActivities([...tourActivities, { activityId: 0, dayOffset: 0, defaultTime: '09:00' }]);
  };

  const removeActivity = (index: number) => {
    setTourActivities(tourActivities.filter((_, i) => i !== index));
  };

  const updateActivity = (index: number, field: keyof TourActivityForm, value: any) => {
    const updated = [...tourActivities];
    updated[index] = { ...updated[index], [field]: value };
    setTourActivities(updated);
  };

  const aliases: string[] = (() => {
    try {
      return JSON.parse(form.nameAliases || '[]');
    } catch {
      return [];
    }
  })();

  const addAlias = () => {
    if (aliasInput.trim()) {
      const newAliases = [...aliases, aliasInput.trim()];
      setForm({ ...form, nameAliases: JSON.stringify(newAliases) });
      setAliasInput('');
    }
  };

  const removeAlias = (index: number) => {
    const newAliases = aliases.filter((_, i) => i !== index);
    setForm({ ...form, nameAliases: JSON.stringify(newAliases) });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setOpen(true)} data-testid="button-add-package-tour">
          <Plus className="w-4 h-4 mr-2" /> Paket Tur Ekle
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tour ? 'Paket Turu Duzenle' : 'Yeni Paket Tur'}</DialogTitle>
          <DialogDescription>Birden fazla aktivite iceren bir paket tur tanimlayin</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Paket Tur Adi</Label>
              <Input 
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="ornegin: Ucus ve Dalis Paketi"
                data-testid="input-tour-name"
              />
            </div>
            
            <div className="col-span-2">
              <Label>Isim Eslestirmeleri (WooCommerce icin)</Label>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={aliasInput}
                  onChange={e => setAliasInput(e.target.value)}
                  placeholder="Alternatif isim ekle"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                  data-testid="input-tour-alias"
                />
                <Button type="button" variant="outline" onClick={addAlias} data-testid="button-add-alias">Ekle</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {aliases.map((alias, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeAlias(i)}>
                    {alias} x
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="col-span-2">
              <Label>Aciklama</Label>
              <Textarea 
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Paket tur aciklamasi..."
                data-testid="input-tour-description"
              />
            </div>
            
            <div>
              <Label>Fiyat (TL)</Label>
              <Input 
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                data-testid="input-tour-price-tl"
              />
            </div>
            
            <div>
              <Label>Fiyat (USD)</Label>
              <Input 
                type="number"
                value={form.priceUsd}
                onChange={e => setForm({ ...form, priceUsd: parseInt(e.target.value) || 0 })}
                data-testid="input-tour-price-usd"
              />
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Dahil Aktiviteler
              </CardTitle>
              <CardDescription>Bu pakete dahil olan aktiviteleri ve varsayilan saatlerini tanimlayin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tourActivities.map((ta, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Select 
                    value={ta.activityId ? String(ta.activityId) : ""} 
                    onValueChange={v => updateActivity(index, 'activityId', parseInt(v))}
                  >
                    <SelectTrigger className="flex-1" data-testid={`select-activity-${index}`}>
                      <SelectValue placeholder="Aktivite secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {allActivities.filter(a => a.active).map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Select 
                      value={String(ta.dayOffset)} 
                      onValueChange={v => updateActivity(index, 'dayOffset', parseInt(v))}
                    >
                      <SelectTrigger className="w-28" data-testid={`select-day-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Ayni gun</SelectItem>
                        <SelectItem value="1">+1 gun</SelectItem>
                        <SelectItem value="2">+2 gun</SelectItem>
                        <SelectItem value="3">+3 gun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="time"
                      value={ta.defaultTime}
                      onChange={e => updateActivity(index, 'defaultTime', e.target.value)}
                      className="w-28"
                      data-testid={`input-time-${index}`}
                    />
                  </div>
                  
                  <Button variant="ghost" size="icon" onClick={() => removeActivity(index)} data-testid={`button-remove-activity-${index}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" onClick={addActivity} className="w-full" data-testid="button-add-activity">
                <Plus className="w-4 h-4 mr-2" /> Aktivite Ekle
              </Button>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Onay Mesaji</Label>
              <Textarea 
                value={form.confirmationMessage}
                onChange={e => setForm({ ...form, confirmationMessage: e.target.value })}
                placeholder="Sayin {isim}, rezervasyonunuz onaylandi..."
                data-testid="input-confirmation-message"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kullanilabilir degiskenler: {'{isim}'}, {'{tarih}'}, {'{saat}'}, {'{telefon}'}
              </p>
            </div>
            
            <div>
              <Label className="flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Rezervasyon Sayfasi (TR)</Label>
              <Input 
                value={form.reservationLink}
                onChange={e => setForm({ ...form, reservationLink: e.target.value })}
                placeholder="https://..."
                data-testid="input-reservation-link-tr"
              />
            </div>
            
            <div>
              <Label className="flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Rezervasyon Sayfasi (EN)</Label>
              <Input 
                value={form.reservationLinkEn}
                onChange={e => setForm({ ...form, reservationLinkEn: e.target.value })}
                placeholder="https://..."
                data-testid="input-reservation-link-en"
              />
            </div>
            
            <div className="col-span-2 flex items-center gap-2">
              <Switch 
                checked={form.active}
                onCheckedChange={v => setForm({ ...form, active: v })}
                data-testid="switch-active"
              />
              <Label>Aktif</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">Iptal</Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save"
          >
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
