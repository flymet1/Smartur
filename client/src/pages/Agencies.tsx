import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit,
  Phone,
  DollarSign,
  FileText
} from "lucide-react";
import type { Agency } from "@shared/schema";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

export default function Agencies() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });

  const { data: agencies = [], isLoading } = useQuery<Agency[]>({
    queryKey: ['/api/finance/agencies']
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => apiRequest('POST', '/api/finance/agencies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setDialogOpen(false);
      setForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
      toast({ title: "Acenta eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta eklenemedi", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => 
      apiRequest('PATCH', `/api/finance/agencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      setDialogOpen(false);
      setEditingAgency(null);
      toast({ title: "Acenta güncellendi" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/finance/agencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/agencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/payouts'] });
      toast({ title: "Acenta silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Acenta silinemedi", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Hata", description: "Acenta adi zorunludur", variant: "destructive" });
      return;
    }
    if (editingAgency) {
      updateMutation.mutate({ id: editingAgency.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEditDialog = (agency: Agency) => {
    setEditingAgency(agency);
    setForm({
      name: agency.name,
      contactInfo: agency.contactInfo || '',
      defaultPayoutPerGuest: agency.defaultPayoutPerGuest || 0,
      notes: agency.notes || ''
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingAgency(null);
    setForm({ name: '', contactInfo: '', defaultPayoutPerGuest: 0, notes: '' });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
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
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Acentalar</h1>
            <p className="text-muted-foreground">Acenta firmalarini yonetin</p>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-agency">
            <Plus className="h-4 w-4 mr-2" />
            Acenta Ekle
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map(agency => (
            <Card key={agency.id} data-testid={`card-agency-${agency.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {agency.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(agency)} data-testid={`button-edit-agency-${agency.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm(`${agency.name} acentasını ve tüm ödeme kayıtlarını silmek istediğinize emin misiniz?`)) {
                        deleteMutation.mutate(agency.id);
                      }
                    }} data-testid={`button-delete-agency-${agency.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agency.contactInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{agency.contactInfo}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Kişi başı: {formatMoney(agency.defaultPayoutPerGuest || 0)}</span>
                </div>
                {agency.notes && (
                  <div className="flex items-start gap-2 text-sm pt-2 border-t">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{agency.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {agencies.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz acenta eklenmemiş</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Acentayı Ekle
              </Button>
            </div>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgency ? 'Acenta Düzenle' : 'Yeni Acenta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Acenta Adı *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Örnek: ABC Turizm"
                data-testid="input-agency-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactInfo">İletişim Bilgisi (Telefon)</Label>
              <Input
                id="contactInfo"
                value={form.contactInfo}
                onChange={e => setForm({ ...form, contactInfo: e.target.value })}
                placeholder="+905xxxxxxxxx"
                data-testid="input-agency-contact"
              />
              <p className="text-xs text-muted-foreground">WhatsApp bildirimleri için telefon numarası</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout">Kişi Başı Ödeme (TL)</Label>
              <Input
                id="payout"
                type="number"
                value={form.defaultPayoutPerGuest}
                onChange={e => setForm({ ...form, defaultPayoutPerGuest: Number(e.target.value) })}
                placeholder="0"
                data-testid="input-agency-payout"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Ek bilgiler..."
                data-testid="input-agency-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-agency"
            >
              {editingAgency ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
