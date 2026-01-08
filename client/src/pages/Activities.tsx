import { Sidebar } from "@/components/layout/Sidebar";
import { useActivities, useCreateActivity, useDeleteActivity, useUpdateActivity } from "@/hooks/use-activities";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Clock, Tag, Users, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaqEditor, FaqItem, parseFaq, stringifyFaq } from "@/components/FaqEditor";
import { LicenseLimitDialog, parseLicenseError } from "@/components/LicenseLimitDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
            <Button variant="outline" className="flex-1" data-testid={`button-edit-activity-${activity.id}`}>
              <Edit className="w-4 h-4 mr-2" /> Düzenle
            </Button>
          } />
          <Button variant="destructive" size="icon" onClick={onDelete} data-testid={`button-delete-activity-${activity.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityDialog({ activity, trigger }: { activity?: Activity; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [licenseErrorOpen, setLicenseErrorOpen] = useState(false);
  const [licenseErrorMessage, setLicenseErrorMessage] = useState("");
  const [licenseErrorType, setLicenseErrorType] = useState<'activity' | 'reservation' | 'user' | 'general'>('general');
  
  // Controlled form fields for name, price, duration
  const [name, setName] = useState(activity?.name || "");
  const [price, setPrice] = useState(activity?.price?.toString() || "");
  const [durationMinutes, setDurationMinutes] = useState(activity?.durationMinutes?.toString() || "");
  const [description, setDescription] = useState(activity?.description || "");
  
  const [frequency, setFrequency] = useState<"1" | "3" | "5">(
    activity ? String((activity as any).dailyFrequency || 1) as "1" | "3" | "5" : "1"
  );
  const [times, setTimes] = useState<string[]>(() => {
    if (activity && (activity as any).defaultTimes) {
      try {
        const parsed = JSON.parse((activity as any).defaultTimes);
        return parsed.length > 0 ? parsed : ["09:00"];
      } catch {
        return ["09:00"];
      }
    }
    return ["09:00"];
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
    activity ? (activity as any).notificationMessageTemplate || "Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kişiSayısı}" : "Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kişiSayısı}"
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
    activity ? ((activity as any).priceUsd ? String((activity as any).priceUsd) : "") : ""
  );
  const [color, setColor] = useState(
    activity ? (activity as any).color || "blue" : "blue"
  );
  const [reservationLink, setReservationLink] = useState(
    activity ? (activity as any).reservationLink || "" : ""
  );
  const [reservationLinkEn, setReservationLinkEn] = useState(
    activity ? (activity as any).reservationLinkEn || "" : ""
  );
  
  // Transfer ve Ekstralar
  const [hasFreeHotelTransfer, setHasFreeHotelTransfer] = useState(
    activity ? (activity as any).hasFreeHotelTransfer === true : false
  );
  // Partner Paylaşımı - Granüler seçim
  const [sharedWithPartners, setSharedWithPartners] = useState(
    activity ? (activity as any).sharedWithPartners === true : false
  );
  const [selectedPartnershipIds, setSelectedPartnershipIds] = useState<number[]>([]);
  
  // Partner listesini getir
  const { data: partnerships } = useQuery<any[]>({
    queryKey: ['/api/tenant-partnerships'],
  });
  
  // Aktivite için mevcut paylaşımları getir
  const { data: activityShares } = useQuery<any[]>({
    queryKey: [`/api/activities/${activity?.id}/partner-shares`],
    enabled: !!activity?.id && !!open,
  });
  
  // Aktif partner acentaları (bağlı olanlar)
  const activePartnerships = partnerships?.filter((p: any) => p.status === 'active') || [];
  
  // Mevcut paylaşımları state'e yükle
  useEffect(() => {
    if (activityShares && activityShares.length > 0) {
      setSelectedPartnershipIds(activityShares.map((s: any) => s.partnershipId));
    } else if (activityShares) {
      setSelectedPartnershipIds([]);
    }
  }, [activityShares]);
  const [transferZones, setTransferZones] = useState(() => {
    if (activity && (activity as any).transferZones) {
      try {
        return JSON.parse((activity as any).transferZones).join(', ');
      } catch {
        return '';
      }
    }
    return '';
  });
  const [extras, setExtras] = useState<Array<{name: string; priceTl: number; priceUsd: number; description: string}>>(() => {
    if (activity && (activity as any).extras) {
      try {
        return JSON.parse((activity as any).extras);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  // FAQ state
  const [faq, setFaq] = useState<FaqItem[]>(() => parseFaq((activity as any)?.faq));
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Reset form when dialog opens for new activity
  const resetForm = () => {
    setName("");
    setPrice("");
    setDurationMinutes("");
    setDescription("");
    setFrequency("1");
    setTimes(["09:00"]);
    setDefaultCapacity(10);
    setAgencyPhone("");
    setAdminPhone("");
    setSendNotificationToAgency(true);
    setSendNotificationToAdmin(true);
    setNotificationMessage("Yeni Rezervasyon:\nMüşteri: {isim}\nTelefon: {telefonunuz}\nEposta: {emailiniz}\nTarih: {tarih}\nSaat: {saat}\nAktivite: {aktivite}\nKişi Sayısı: {kişiSayısı}");
    setNameAliases("");
    setPriceUsd("");
    setColor("blue");
    setReservationLink("");
    setReservationLinkEn("");
    setHasFreeHotelTransfer(false);
    setSharedWithPartners(false);
    setSelectedPartnershipIds([]);
    setTransferZones("");
    setExtras([]);
    setFaq([]);
    setFormErrors({});
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !activity) {
      resetForm();
    }
    setOpen(newOpen);
  };
  
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
    
    // Validate required fields using controlled state
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      errors.name = "Aktivite adı zorunludur";
    }
    if (!price || Number(price) < 0) {
      errors.price = "Geçerli bir fiyat giriniz";
    }
    if (!durationMinutes || Number(durationMinutes) <= 0) {
      errors.durationMinutes = "Geçerli bir süre giriniz";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: "Form Hatası",
        description: "Lütfen zorunlu alanları doldurunuz",
        variant: "destructive"
      });
      return;
    }
    
    setFormErrors({});
    
    // Parse aliases from comma-separated string
    const aliasesArray = nameAliases
      .split(',')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);
    
    // Parse transfer zones from comma-separated string
    const zonesArray = transferZones
      .split(',')
      .map((z: string) => z.trim())
      .filter((z: string) => z.length > 0);
    
    const data = {
      name: trimmedName,
      nameAliases: JSON.stringify(aliasesArray),
      description: description,
      price: Number(price),
      priceUsd: priceUsd ? Number(priceUsd) : 0,
      durationMinutes: Number(durationMinutes),
      dailyFrequency: Number(frequency),
      defaultTimes: JSON.stringify(times),
      defaultCapacity: Number(defaultCapacity),
      color: color,
      confirmationMessage: formData.get("confirmationMessage") as string,
      agencyPhone: agencyPhone || null,
      adminPhone: adminPhone || null,
      sendNotificationToAgency: sendNotificationToAgency,
      sendNotificationToAdmin: sendNotificationToAdmin,
      notificationMessageTemplate: notificationMessage,
      reservationLink: reservationLink || null,
      reservationLinkEn: reservationLinkEn || null,
      active: true,
      hasFreeHotelTransfer: hasFreeHotelTransfer,
      transferZones: JSON.stringify(zonesArray),
      extras: JSON.stringify(extras),
      faq: stringifyFaq(faq),
      sharedWithPartners: sharedWithPartners,
    };

    try {
      let savedActivityId: number;
      
      if (isEditing) {
        await updateMutation.mutateAsync({ id: activity.id, ...data });
        savedActivityId = activity.id;
        
        // Partner paylaşımlarını kaydet (düzenleme modunda)
        try {
          await apiRequest('POST', `/api/activities/${savedActivityId}/partner-shares`, { partnershipIds: selectedPartnershipIds });
          queryClient.invalidateQueries({ queryKey: [`/api/activities/${savedActivityId}/partner-shares`] });
        } catch (shareErr) {
          console.error('Partner paylaşım hatası:', shareErr);
        }
        
        toast({ title: "Güncellendi", description: "Aktivite başarıyla güncellendi." });
      } else {
        const created = await createMutation.mutateAsync(data);
        
        // Yeni aktivite oluşturulduktan sonra ID'yi al
        if (created && created.id && selectedPartnershipIds.length > 0) {
          try {
            await apiRequest('POST', `/api/activities/${created.id}/partner-shares`, { partnershipIds: selectedPartnershipIds });
          } catch (shareErr) {
            console.error('Partner paylaşım hatası:', shareErr);
          }
        }
        
        toast({ title: "Oluşturuldu", description: "Yeni aktivite başarıyla eklendi." });
      }
      
      setOpen(false);
    } catch (err: any) {
      const licenseError = parseLicenseError(err);
      if (licenseError.isLicenseError) {
        setLicenseErrorMessage(licenseError.message);
        setLicenseErrorType(licenseError.limitType);
        setLicenseErrorOpen(true);
      } else {
        toast({ 
          title: "Hata", 
          description: licenseError.message || "İşlem sırasında bir hata oluştu.", 
          variant: "destructive" 
        });
      }
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" data-testid="button-add-activity">
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
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="general">Genel</TabsTrigger>
              <TabsTrigger value="extras">Transfer & Ekstra</TabsTrigger>
              <TabsTrigger value="faq">SSS</TabsTrigger>
              <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto py-4 px-1 min-h-0">
              <TabsContent value="general" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">Aktivite Adı <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: ATV Safari"
                    className={formErrors.name ? "border-destructive" : ""}
                  />
                  {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
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
                    <Label htmlFor="price">Fiyat (TL) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="price" 
                      name="price" 
                      type="number" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={formErrors.price ? "border-destructive" : ""}
                    />
                    {formErrors.price && <p className="text-xs text-destructive">{formErrors.price}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Fiyat (USD)</Label>
                    <Input 
                      id="priceUsd" 
                      type="number" 
                      value={priceUsd}
                      onChange={(e) => setPriceUsd(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Süre (Dk) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="durationMinutes" 
                      name="durationMinutes" 
                      type="number" 
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className={formErrors.durationMinutes ? "border-destructive" : ""}
                    />
                    {formErrors.durationMinutes && <p className="text-xs text-destructive">{formErrors.durationMinutes}</p>}
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tur hakkında kısa bilgi..." 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservationLink">(Türkçe) Rezervasyon Linki</Label>
                  <Input 
                    id="reservationLink"
                    type="url"
                    value={reservationLink}
                    onChange={(e) => setReservationLink(e.target.value)}
                    placeholder="https://example.com/rezervasyon"
                    data-testid="input-reservation-link"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservationLinkEn">(İngilizce) Rezervasyon Linki</Label>
                  <Input 
                    id="reservationLinkEn"
                    type="url"
                    value={reservationLinkEn}
                    onChange={(e) => setReservationLinkEn(e.target.value)}
                    placeholder="https://example.com/reservation"
                    data-testid="input-reservation-link-en"
                  />
                  <p className="text-xs text-muted-foreground">Müşterilerin bu aktivite için rezervasyon yapabileceği hariçi sayfa linkleri</p>
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
                  <Label>Takvim Rengi</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "blue", label: "Mavi", bg: "bg-blue-500" },
                      { value: "purple", label: "Mor", bg: "bg-purple-500" },
                      { value: "green", label: "Yeşil", bg: "bg-green-500" },
                      { value: "orange", label: "Turuncu", bg: "bg-orange-500" },
                      { value: "pink", label: "Pembe", bg: "bg-pink-500" },
                      { value: "cyan", label: "Camgöbeği", bg: "bg-cyan-500" },
                      { value: "red", label: "Kırmızı", bg: "bg-red-500" },
                      { value: "yellow", label: "Sarı", bg: "bg-yellow-500" },
                    ].map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`w-8 h-8 rounded-md ${c.bg} transition-all ${
                          color === c.value 
                            ? "ring-2 ring-offset-2 ring-primary scale-110" 
                            : "opacity-60 hover:opacity-100"
                        }`}
                        title={c.label}
                        data-testid={`color-${c.value}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Takvimde bu aktivitenin rezervasyonları seçilen renkte görünecek</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmationMessage">Rezervasyon Onay Mesajı</Label>
                  <Textarea 
                    id="confirmationMessage" 
                    name="confirmationMessage" 
                    defaultValue={(activity as any)?.confirmationMessage || "Sayın {isim}, rezervasyonunuz onaylanmıştır. Tarih: {tarih}, Saat: {saat}. Rezervasyonunuzu takip etmek için: {takip_linki} Teşekkür ederiz."} 
                    placeholder="Rezervasyon onayı için özel mesaj..."
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">Kullanılabilir etiketler: {'{'}isim{'}'}, {'{'}tarih{'}'}, {'{'}saat{'}'}, {'{'}aktivite{'}'}, {'{'}takip_linki{'}'}</p>
                </div>
              </TabsContent>

              <TabsContent value="extras" className="space-y-4 mt-0">
                {/* Partner Paylaşımı - Granüler Seçim */}
                <div className="space-y-4 bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Partner Paylasimi
                    </Label>
                    <p className="text-xs text-muted-foreground">Bu aktivitenin musaitligini hangi partner acentalarla paylasacaginizi secin</p>
                  </div>
                  
                  {activePartnerships.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Henuz aktif partner acentaniz yok. Ayarlar sayfasindan partner ekleyebilirsiniz.</p>
                  ) : (
                    <div className="space-y-2">
                      {activePartnerships.map((partnership: any) => {
                        const isSelected = selectedPartnershipIds.includes(partnership.id);
                        return (
                          <div 
                            key={partnership.id} 
                            className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                              isSelected 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              id={`partner-${partnership.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPartnershipIds([...selectedPartnershipIds, partnership.id]);
                                  setSharedWithPartners(true);
                                } else {
                                  const newIds = selectedPartnershipIds.filter(id => id !== partnership.id);
                                  setSelectedPartnershipIds(newIds);
                                  if (newIds.length === 0) setSharedWithPartners(false);
                                }
                              }}
                              data-testid={`checkbox-partner-${partnership.id}`}
                            />
                            <label 
                              htmlFor={`partner-${partnership.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <span className="font-medium">{partnership.partnerTenantName || `Partner #${partnership.partnerTenantId}`}</span>
                              {partnership.requesterTenantId === partnership.partnerTenantId ? (
                                <span className="text-xs text-muted-foreground ml-2">(Bizi eklediler)</span>
                              ) : (
                                <span className="text-xs text-muted-foreground ml-2">(Biz ekledik)</span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {selectedPartnershipIds.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {selectedPartnershipIds.length} partner acenta bu aktivitenin bos kapasitesini gorebilecek
                    </p>
                  )}
                </div>

                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Ücretsiz Otel Transferi</Label>
                      <p className="text-xs text-muted-foreground">Aktivite için ücretsiz transfer sunuluyor mu?</p>
                    </div>
                    <Switch 
                      checked={hasFreeHotelTransfer}
                      onCheckedChange={setHasFreeHotelTransfer}
                      data-testid="switch-free-transfer"
                    />
                  </div>
                  
                  {hasFreeHotelTransfer && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Transfer Bölgeleri</Label>
                      <Textarea 
                        value={transferZones}
                        onChange={(e) => setTransferZones(e.target.value)}
                        placeholder="Oludeniz, Fethiye Merkez, Hisaronu, Ovaçık, Calis"
                        className="min-h-[60px]"
                        data-testid="input-transfer-zones"
                      />
                      <p className="text-xs text-muted-foreground">Virgülle ayırarak bölgeleri girin. Bot bu verileri kullanabilir.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Ekstralar</Label>
                      <p className="text-xs text-muted-foreground">Ek hizmetler ve fiyatlari (Bot bu verilere erisebilir)</p>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => setExtras([...extras, { name: '', priceTl: 0, priceUsd: 0, description: '' }])}
                      data-testid="button-add-extra"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ekle
                    </Button>
                  </div>
                  
                  {extras.length > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      {extras.map((extra, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Ekstra adı (örnek: 10 dk ekstra uçuş)"
                              value={extra.name}
                              onChange={(e) => {
                                const newExtras = [...extras];
                                newExtras[idx].name = e.target.value;
                                setExtras(newExtras);
                              }}
                              data-testid={`input-extra-name-${idx}`}
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="TL"
                                value={extra.priceTl || ''}
                                onChange={(e) => {
                                  const newExtras = [...extras];
                                  newExtras[idx].priceTl = Number(e.target.value) || 0;
                                  setExtras(newExtras);
                                }}
                                className="w-24"
                                data-testid={`input-extra-priceTl-${idx}`}
                              />
                              <Input
                                type="number"
                                placeholder="USD"
                                value={extra.priceUsd || ''}
                                onChange={(e) => {
                                  const newExtras = [...extras];
                                  newExtras[idx].priceUsd = Number(e.target.value) || 0;
                                  setExtras(newExtras);
                                }}
                                className="w-24"
                                data-testid={`input-extra-priceUsd-${idx}`}
                              />
                              <Input
                                placeholder="Açıklama (opsiyonel)"
                                value={extra.description}
                                onChange={(e) => {
                                  const newExtras = [...extras];
                                  newExtras[idx].description = e.target.value;
                                  setExtras(newExtras);
                                }}
                                className="flex-1"
                                data-testid={`input-extra-desc-${idx}`}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
                            data-testid={`button-remove-extra-${idx}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {extras.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Henüz ekstra eklenmedi. "Ekle" butonuna tıklayarak ekstra hizmet ekleyebilirsiniz.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="faq" className="space-y-4 mt-0">
                <FaqEditor 
                  faq={faq} 
                  onChange={setFaq} 
                  testIdPrefix="activity-faq"
                />
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
                    <strong>Desteklenen değişkenler:</strong> {'{'}isim{'}'} - Müşteri adı, {'{'}telefonunuz{'}'} - Müşteri telefonu, {'{'}emailiniz{'}'} - Müşteri eposta, {'{'}tarih{'}'} - Rezervasyon tarihi, {'{'}saat{'}'} - Rezervasyon saati, {'{'}aktivite{'}'} - Aktivite adı, {'{'}kişiSayısı{'}'} - Kişi sayısı
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
    
    <LicenseLimitDialog
      open={licenseErrorOpen}
      onOpenChange={setLicenseErrorOpen}
      errorMessage={licenseErrorMessage}
      limitType={licenseErrorType}
    />
    </>
  );
}
