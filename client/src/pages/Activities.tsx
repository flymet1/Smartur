import { Sidebar } from "@/components/layout/Sidebar";
import { useActivities, useCreateActivity, useDeleteActivity, useUpdateActivity } from "@/hooks/use-activities";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Clock, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Activities() {
  const { data: activities, isLoading } = useActivities();
  const deleteMutation = useDeleteActivity();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (confirm("Bu aktiviteyi silmek istediğinize emin misiniz?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Başarılı", description: "Aktivite silindi." });
      } catch (error) {
        toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Aktiviteler</h1>
            <p className="text-muted-foreground mt-1">Turlarınızı ve hizmetlerinizi yönetin</p>
          </div>
          <ActivityDialog />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities?.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onDelete={() => handleDelete(activity.id)} 
              />
            ))}
            {activities?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                Henüz hiç aktivite eklenmemiş.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ActivityCard({ activity, onDelete }: { activity: Activity; onDelete: () => void }) {
  return (
    <div className="dashboard-card group relative overflow-hidden flex flex-col h-full">
      <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-center justify-center">
        <Tag className="w-16 h-16 text-primary/20 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-xl">{activity.name}</h3>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
            {activity.active ? 'Aktif' : 'Pasif'}
          </span>
        </div>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {activity.description || "Açıklama yok"}
        </p>
        
        <div className="flex items-center gap-4 text-sm font-medium text-foreground/80 mb-6">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {activity.durationMinutes} dk
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">₺</span>
            {activity.price}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t mt-auto">
          <ActivityDialog activity={activity} trigger={
            <Button variant="outline" className="flex-1">
              <Edit className="w-4 h-4 mr-2" /> Düzenle
            </Button>
          } />
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityDialog({ activity, trigger }: { activity?: Activity; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"1" | "3" | "5">(
    activity ? String((activity as any).dailyFrequency || 1) as "1" | "3" | "5" : "1"
  );
  const [times, setTimes] = useState<string[]>(() => {
    if (activity && (activity as any).defaultTimes) {
      try {
        return JSON.parse((activity as any).defaultTimes);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [defaultCapacity, setDefaultCapacity] = useState(
    activity ? (activity as any).defaultCapacity || 10 : 10
  );
  const [agencyPhone, setAgencyPhone] = useState(
    activity ? (activity as any).agencyPhone || "" : ""
  );
  const [adminPhone, setAdminPhone] = useState(
    activity ? (activity as any).adminPhone || "" : ""
  );
  const [sendNotificationToAgency, setSendNotificationToAgency] = useState(
    activity ? (activity as any).sendNotificationToAgency !== false : true
  );
  const [sendNotificationToAdmin, setSendNotificationToAdmin] = useState(
    activity ? (activity as any).sendNotificationToAdmin !== false : true
  );
  const [notificationMessage, setNotificationMessage] = useState(
    activity ? (activity as any).notificationMessageTemplate || "Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kisiSayisi}" : "Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kisiSayisi}"
  );
  const [nameAliases, setNameAliases] = useState(() => {
    if (activity && (activity as any).nameAliases) {
      try {
        return JSON.parse((activity as any).nameAliases).join(', ');
      } catch {
        return '';
      }
    }
    return '';
  });
  const [priceUsd, setPriceUsd] = useState(
    activity ? (activity as any).priceUsd || 0 : 0
  );
  const [reservationLink, setReservationLink] = useState(
    activity ? (activity as any).reservationLink || "" : ""
  );
  
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const { toast } = useToast();

  const isEditing = !!activity;

  const getDefaultTimes = (freq: "1" | "3" | "5") => {
    const freqNum = Number(freq);
    if (freqNum === 1) return ["09:00"];
    if (freqNum === 3) return ["09:00", "13:00", "17:00"];
    if (freqNum === 5) return ["08:00", "10:00", "13:00", "16:00", "18:00"];
    return [];
  };

  const handleFrequencyChange = (newFreq: "1" | "3" | "5") => {
    setFrequency(newFreq);
    setTimes(getDefaultTimes(newFreq));
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Parse aliases from comma-separated string
    const aliasesArray = nameAliases
      .split(',')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);
    
    const data = {
      name: formData.get("name") as string,
      nameAliases: JSON.stringify(aliasesArray),
      description: formData.get("description") as string,
      price: Number(formData.get("price")),
      priceUsd: Number(priceUsd),
      durationMinutes: Number(formData.get("durationMinutes")),
      dailyFrequency: Number(frequency),
      defaultTimes: JSON.stringify(times),
      defaultCapacity: Number(defaultCapacity),
      confirmationMessage: formData.get("confirmationMessage") as string,
      agencyPhone: agencyPhone || null,
      adminPhone: adminPhone || null,
      sendNotificationToAgency: sendNotificationToAgency,
      sendNotificationToAdmin: sendNotificationToAdmin,
      notificationMessageTemplate: notificationMessage,
      reservationLink: reservationLink || null,
      active: true,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: activity.id, ...data });
        toast({ title: "Güncellendi", description: "Aktivite başarıyla güncellendi." });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: "Oluşturuldu", description: "Yeni aktivite başarıyla eklendi." });
      }
      setOpen(false);
    } catch (err) {
      toast({ 
        title: "Hata", 
        description: "İşlem sırasında bir hata oluştu.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
            <Plus className="w-4 h-4 mr-2" /> Yeni Aktivite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Aktiviteyi Düzenle' : 'Yeni Aktivite Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="general" className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
              <TabsTrigger value="notifications">Bildirim Ayarları</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto py-4 px-1 min-h-0">
              <TabsContent value="general" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">Aktivite Adı</Label>
                  <Input id="name" name="name" defaultValue={activity?.name} required placeholder="Örn: ATV Safari" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameAliases">Alternatif İsimler (Çok Dilli)</Label>
                  <Input 
                    id="nameAliases"
                    value={nameAliases}
                    onChange={(e) => setNameAliases(e.target.value)}
                    placeholder="paragliding fethiye, Fethiye paragliding"
                  />
                  <p className="text-xs text-muted-foreground">WooCommerce eşleştirmesi için virgülle ayrılmış alternatif isimler (TR/EN)</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Fiyat (TL)</Label>
                    <Input id="price" name="price" type="number" defaultValue={activity?.price} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Fiyat (USD)</Label>
                    <Input 
                      id="priceUsd" 
                      type="number" 
                      value={priceUsd}
                      onChange={(e) => setPriceUsd(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Süre (Dk)</Label>
                    <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={activity?.durationMinutes} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Günde Kaç Defa?</Label>
                  <div className="flex gap-2">
                    {["1", "3", "5"].map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => handleFrequencyChange(freq as "1" | "3" | "5")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                          frequency === freq
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted border-border hover:bg-muted/80"
                        }`}
                      >
                        {freq}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Saatler</Label>
                  <div className="space-y-2">
                    {times.map((time, idx) => (
                      <Input
                        key={idx}
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(idx, e.target.value)}
                        placeholder="HH:mm"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    defaultValue={activity?.description || ""} 
                    placeholder="Tur hakkında kısa bilgi..." 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservationLink">Rezervasyon Linki</Label>
                  <Input 
                    id="reservationLink"
                    type="url"
                    value={reservationLink}
                    onChange={(e) => setReservationLink(e.target.value)}
                    placeholder="https://example.com/rezervasyon"
                    data-testid="input-reservation-link"
                  />
                  <p className="text-xs text-muted-foreground">Müşterilerin bu aktivite için rezervasyon yapabileceği harici sayfa linki</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCapacity">Varsayılan Müsaitlik (Her Saat Için)</Label>
                  <Input 
                    id="defaultCapacity" 
                    type="number" 
                    min="1"
                    value={defaultCapacity}
                    onChange={(e) => setDefaultCapacity(Math.max(1, Number(e.target.value)))}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">Her zaman dilimi için kaç kişi rezervasyon yapabilir</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmationMessage">Rezervasyon Onay Mesajı</Label>
                  <Textarea 
                    id="confirmationMessage" 
                    name="confirmationMessage" 
                    defaultValue={(activity as any)?.confirmationMessage || "Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Teşekkür ederiz."} 
                    placeholder="Rezervasyon onayı için özel mesaj..."
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">Kullanılabilir etiketler: {'{'}isim{'}'}, {'{'}tarih{'}'}, {'{'}saat{'}'}, {'{'}aktivite{'}'}</p>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Telefon Bildirim Ayarları</Label>
                  <p className="text-sm text-muted-foreground">Yeni rezervasyon yapıldığında kime SMS gönderilecek?</p>
                </div>

                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="agencyPhone" className="text-base">Acenta Telefon Numarası</Label>
                      <Input 
                        id="agencyPhone"
                        type="tel"
                        value={agencyPhone}
                        onChange={(e) => setAgencyPhone(e.target.value)}
                        placeholder="+90 xxx xxx xx xx"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch 
                        checked={sendNotificationToAgency}
                        onCheckedChange={setSendNotificationToAgency}
                        data-testid="toggle-agency-notification"
                      />
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="adminPhone" className="text-base">Admin Telefon Numarası</Label>
                      <Input 
                        id="adminPhone"
                        type="tel"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="+90 xxx xxx xx xx"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch 
                        checked={sendNotificationToAdmin}
                        onCheckedChange={setSendNotificationToAdmin}
                        data-testid="toggle-admin-notification"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notificationMessage">Bildirim Mesajı Şablonu</Label>
                  <Textarea 
                    id="notificationMessage"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Bildirim mesajı..."
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Desteklenen değişkenler:</strong> {'{'}isim{'}'} - Müşteri adı, {'{'}telefonunuz{'}'} - Müşteri telefonu, {'{'}emailiniz{'}'} - Müşteri eposta, {'{'}tarih{'}'} - Rezervasyon tarihi, {'{'}saat{'}'} - Rezervasyon saati, {'{'}aktivite{'}'} - Aktivite adı, {'{'}kisiSayisi{'}'} - Kişi sayısı
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="pt-4 border-t flex-shrink-0">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
