import { Sidebar } from "@/components/layout/Sidebar";
import { useActivities, useCreateActivity, useDeleteActivity, useUpdateActivity } from "@/hooks/use-activities";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Clock, Tag, Users, Building2, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaqEditor, FaqItem, parseFaq, stringifyFaq } from "@/components/FaqEditor";
import { LicenseLimitDialog, parseLicenseError } from "@/components/LicenseLimitDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ImageUpload";

const DEFAULT_CONFIRMATION_TEMPLATE = `Merhaba {isim},

{aktivite} rezervasyonunuz onaylanmıştır!

Sipariş No: {siparis_no}

Tarih: {tarih}
Saat: {saat}
Kişi: {kisi} ({yetiskin} yetişkin, {cocuk} çocuk)

Ödeme Bilgisi:
Toplam: {toplam}
Ödenen: {odenen}
Kalan: {kalan}

Transfer Bilgisi:
Otel: {otel}
Bölge: {bolge}
Alım Saati: {transfer_saat}

Buluşma Noktası: {bulusma_noktasi}
Varış Süresi: {varis_suresi} dakika önce

Yanınızda Getirin: {getirin}

Ekstralar: {ekstralar}

Sağlık Notları: {saglik_notlari}

Aktivite saati ve tarih değişikliği talepleriniz için, lütfen yukarıdaki takip linkine tıklayın. (Değişiklik talepleriniz müsaitliğe göre değerlendirilecektir.)

Sorularınız için bu numaradan bize ulaşabilirsiniz.

Rezervasyonunuzu takip etmek, değişiklik veya iptal talebinde bulunmak için: {takip_linki}

İyi tatiller dileriz!`;

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
      <main className="flex-1 xl:ml-64 p-4 pt-16 xl:pt-20 xl:px-8 xl:pb-8 pb-24 space-y-8 max-w-6xl mx-auto">
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
  const imageUrl = (activity as any).imageUrl;
  
  return (
    <div className="dashboard-card group relative overflow-hidden flex flex-col h-full">
      <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={activity.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Tag className="w-16 h-16 text-primary/20 group-hover:scale-110 transition-transform duration-300" />
        )}
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
  // Aktivite Görseli
  const [imageUrl, setImageUrl] = useState(
    activity ? (activity as any).imageUrl || "" : ""
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
  const [partnerPrices, setPartnerPrices] = useState<Record<number, { unitPrice: string; currency: string }>>({});
  
  // Partner listesini getir
  const { data: partnerships } = useQuery<any[]>({
    queryKey: ['/api/tenant-partnerships'],
  });
  
  // Website ayarlarını getir (rezervasyon linki için)
  const { data: websiteSettings } = useQuery<{
    websiteEnabled: boolean;
    websiteDomain: string | null;
  }>({
    queryKey: ['/api/website-settings'],
  });
  
  // Smartur web sitesi aktif mi kontrol et
  const isWebsiteActive = websiteSettings?.websiteEnabled && websiteSettings?.websiteDomain;
  
  // Aktivite için mevcut paylaşımları getir
  const { data: activityShares } = useQuery<any[]>({
    queryKey: [`/api/activities/${activity?.id}/partner-shares`],
    enabled: !!activity?.id && !!open,
  });
  
  // Aktif partner acentaları (bağlı olanlar)
  const activePartnerships = partnerships?.filter((p: any) => p.status === 'active') || [];
  
  // Mevcut paylaşımları ve fiyatları state'e yükle
  useEffect(() => {
    if (activityShares && activityShares.length > 0) {
      setSelectedPartnershipIds(activityShares.map((s: any) => s.partnershipId));
      const prices: Record<number, { unitPrice: string; currency: string }> = {};
      activityShares.forEach((s: any) => {
        if (s.partnerUnitPrice !== null && s.partnerUnitPrice !== undefined) {
          prices[s.partnershipId] = {
            unitPrice: String(s.partnerUnitPrice),
            currency: s.partnerCurrency || 'TRY'
          };
        }
      });
      setPartnerPrices(prices);
    } else if (activityShares) {
      setSelectedPartnershipIds([]);
      setPartnerPrices({});
    }
  }, [activityShares]);
  const [transferZones, setTransferZones] = useState<Array<{zone: string; minutesBefore: number}>>(() => {
    if (activity && (activity as any).transferZones) {
      try {
        const parsed = JSON.parse((activity as any).transferZones);
        // Support old format (simple string array) and new format (object array)
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            // Old format: convert to new format with default 60 minutes
            return parsed.map((z: string) => ({ zone: z, minutesBefore: 60 }));
          }
          return parsed;
        }
        return [];
      } catch {
        return [];
      }
    }
    return [];
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
  
  // Bot için ek talimatlar
  const [botPrompt, setBotPrompt] = useState(activity ? (activity as any).botPrompt || "" : "");
  
  // Web sitesi için yeni alanlar
  const [region, setRegion] = useState(activity ? (activity as any).region || "" : "");
  const [meetingPoint, setMeetingPoint] = useState(activity ? (activity as any).meetingPoint || "" : "");
  const [meetingPointMapLink, setMeetingPointMapLink] = useState(activity ? (activity as any).meetingPointMapLink || "" : "");
  const [arrivalMinutesBefore, setArrivalMinutesBefore] = useState(activity ? String((activity as any).arrivalMinutesBefore || "30") : "30");
  const [healthNotes, setHealthNotes] = useState(activity ? (activity as any).healthNotes || "" : "");
  const [confirmationMessageText, setConfirmationMessageText] = useState(DEFAULT_CONFIRMATION_TEMPLATE);
  const [useCustomConfirmation, setUseCustomConfirmation] = useState(activity ? (activity as any).useCustomConfirmation === true : false);
  const [reminderEnabled, setReminderEnabled] = useState(activity ? (activity as any).reminderEnabled === true : false);
  const [reminderHours, setReminderHours] = useState(activity ? Number((activity as any).reminderHours) || 24 : 24);
  const [reminderMessage, setReminderMessage] = useState(activity ? (activity as any).reminderMessage || "" : "");
  
  const handleUseCustomConfirmationChange = (checked: boolean) => {
    setUseCustomConfirmation(checked);
    if (checked && !confirmationMessageText) {
      setConfirmationMessageText(DEFAULT_CONFIRMATION_TEMPLATE);
    }
  };
  const [difficulty, setDifficulty] = useState(activity ? (activity as any).difficulty || "" : "");
  const [minAge, setMinAge] = useState(activity ? String((activity as any).minAge || "") : "");
  const [importantInfoItems, setImportantInfoItems] = useState(() => {
    if (activity && (activity as any).importantInfoItems) {
      try {
        const parsed = JSON.parse((activity as any).importantInfoItems);
        return Array.isArray(parsed) ? parsed.join('\n') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [importantInfo, setImportantInfo] = useState(activity ? (activity as any).importantInfo || "" : "");
  const [transferInfo, setTransferInfo] = useState(activity ? (activity as any).transferInfo || "" : "");
  // Getirmeniz Gerekenler & İzin Verilmeyenler
  const [whatToBring, setWhatToBring] = useState(() => {
    if (activity && (activity as any).whatToBring) {
      try {
        const parsed = JSON.parse((activity as any).whatToBring);
        return Array.isArray(parsed) ? parsed.join('\n') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [whatToBringEn, setWhatToBringEn] = useState(() => {
    if (activity && (activity as any).whatToBringEn) {
      try {
        const parsed = JSON.parse((activity as any).whatToBringEn);
        return Array.isArray(parsed) ? parsed.join('\n') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [notAllowed, setNotAllowed] = useState(() => {
    if (activity && (activity as any).notAllowed) {
      try {
        const parsed = JSON.parse((activity as any).notAllowed);
        return Array.isArray(parsed) ? parsed.join('\n') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [notAllowedEn, setNotAllowedEn] = useState(() => {
    if (activity && (activity as any).notAllowedEn) {
      try {
        const parsed = JSON.parse((activity as any).notAllowedEn);
        return Array.isArray(parsed) ? parsed.join('\n') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  // Yorum kartları
  const [reviewCards, setReviewCards] = useState<Array<{platform: string; rating: string; reviewCount: string; url: string}>>(() => {
    if (activity && (activity as any).reviewCards) {
      try {
        return JSON.parse((activity as any).reviewCards);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [reviewCardsEnabled, setReviewCardsEnabled] = useState(activity ? (activity as any).reviewCardsEnabled === true : false);
  
  // Tur programı
  const [itinerary, setItinerary] = useState<Array<{time: string; title: string; description: string}>>(() => {
    if (activity && (activity as any).itinerary) {
      try {
        return JSON.parse((activity as any).itinerary);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [tourLanguages, setTourLanguages] = useState(() => {
    if (activity && (activity as any).tourLanguages) {
      try {
        const parsed = JSON.parse((activity as any).tourLanguages);
        return Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [categories, setCategories] = useState(() => {
    if (activity && (activity as any).categories) {
      try {
        const parsed = JSON.parse((activity as any).categories);
        return Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [highlights, setHighlights] = useState(() => {
    if (activity && (activity as any).highlights) {
      try {
        const parsed = JSON.parse((activity as any).highlights);
        return Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [includedItems, setIncludedItems] = useState(() => {
    if (activity && (activity as any).includedItems) {
      try {
        const parsed = JSON.parse((activity as any).includedItems);
        return Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [excludedItems, setExcludedItems] = useState(() => {
    if (activity && (activity as any).excludedItems) {
      try {
        const parsed = JSON.parse((activity as any).excludedItems);
        return Array.isArray(parsed) ? parsed.join(', ') : '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [galleryImages, setGalleryImages] = useState<string[]>(() => {
    if (activity && (activity as any).galleryImages) {
      try {
        const parsed = JSON.parse((activity as any).galleryImages);
        return Array.isArray(parsed) ? parsed.filter((url: string) => url && url.trim()) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  
  // Ödeme Seçenekleri
  const [requiresDeposit, setRequiresDeposit] = useState(
    activity ? (activity as any).requiresDeposit === true : false
  );
  const [depositType, setDepositType] = useState<"percentage" | "fixed">(
    activity ? ((activity as any).depositType || "percentage") : "percentage"
  );
  const [depositAmount, setDepositAmount] = useState(
    activity ? String((activity as any).depositAmount || 0) : "0"
  );
  const [fullPaymentRequired, setFullPaymentRequired] = useState(
    activity ? (activity as any).fullPaymentRequired === true : false
  );
  
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
    setImageUrl("");
    setHasFreeHotelTransfer(false);
    setSharedWithPartners(false);
    setSelectedPartnershipIds([]);
    setPartnerPrices({});
    setTransferZones([]);
    setExtras([]);
    setFaq([]);
    setBotPrompt("");
    setFormErrors({});
    setRegion("");
    setMeetingPoint("");
    setDifficulty("");
    setMinAge("");
    setTourLanguages("");
    setCategories("");
    setHighlights("");
    setIncludedItems("");
    setExcludedItems("");
    setGalleryImages([]);
    setRequiresDeposit(false);
    setDepositType("percentage");
    setDepositAmount("0");
    setFullPaymentRequired(false);
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
    
    // Debug log for validation
    console.log('Form validation:', { name: trimmedName, price, durationMinutes });
    
    if (!trimmedName) {
      errors.name = "Aktivite adı zorunludur";
    }
    // Allow 0 as valid price
    if (price === '' || price === null || price === undefined || Number(price) < 0 || isNaN(Number(price))) {
      errors.price = "Geçerli bir fiyat giriniz";
    }
    // Duration must be > 0
    if (durationMinutes === '' || durationMinutes === null || durationMinutes === undefined || Number(durationMinutes) <= 0 || isNaN(Number(durationMinutes))) {
      errors.durationMinutes = "Geçerli bir süre giriniz";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      console.log('Form validation errors:', errors);
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
    
    // Transfer zones is already an array of {zone, minutesBefore} objects
    const zonesArray = transferZones.filter(z => z.zone && z.zone.trim().length > 0);
    
    // Parse web sitesi alanları
    const tourLanguagesArray = tourLanguages.split(',').map((l: string) => l.trim().toLowerCase()).filter((l: string) => l.length > 0);
    const categoriesArray = categories.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    const highlightsArray = highlights.split(',').map((h: string) => h.trim()).filter((h: string) => h.length > 0);
    const includedItemsArray = includedItems.split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 0);
    const excludedItemsArray = excludedItems.split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0);
    const galleryImagesArray = galleryImages.filter((u: string) => u && u.trim().length > 0);
    
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
      confirmationMessage: confirmationMessageText || null,
      useCustomConfirmation: useCustomConfirmation,
      reminderEnabled: reminderEnabled,
      reminderHours: reminderHours,
      reminderMessage: reminderMessage || null,
      agencyPhone: agencyPhone || null,
      adminPhone: adminPhone || null,
      sendNotificationToAgency: sendNotificationToAgency,
      sendNotificationToAdmin: sendNotificationToAdmin,
      notificationMessageTemplate: notificationMessage,
      reservationLink: reservationLink || null,
      reservationLinkEn: reservationLinkEn || null,
      imageUrl: imageUrl || null,
      active: true,
      hasFreeHotelTransfer: hasFreeHotelTransfer,
      transferZones: JSON.stringify(zonesArray),
      extras: JSON.stringify(extras),
      faq: stringifyFaq(faq),
      botPrompt: botPrompt || null,
      sharedWithPartners: sharedWithPartners,
      region: region || null,
      meetingPoint: meetingPoint || null,
      meetingPointMapLink: meetingPointMapLink || null,
      arrivalMinutesBefore: arrivalMinutesBefore ? Number(arrivalMinutesBefore) : 30,
      healthNotes: healthNotes || null,
      difficulty: difficulty || null,
      minAge: minAge ? Number(minAge) : null,
      tourLanguages: JSON.stringify(tourLanguagesArray),
      categories: JSON.stringify(categoriesArray),
      highlights: JSON.stringify(highlightsArray),
      includedItems: JSON.stringify(includedItemsArray),
      excludedItems: JSON.stringify(excludedItemsArray),
      galleryImages: JSON.stringify(galleryImagesArray),
      importantInfoItems: JSON.stringify(importantInfoItems.split('\n').map(s => s.trim()).filter(Boolean)),
      importantInfo: importantInfo || null,
      transferInfo: transferInfo || null,
      whatToBring: JSON.stringify(whatToBring.split('\n').map(s => s.trim()).filter(Boolean)),
      whatToBringEn: JSON.stringify(whatToBringEn.split('\n').map(s => s.trim()).filter(Boolean)),
      notAllowed: JSON.stringify(notAllowed.split('\n').map(s => s.trim()).filter(Boolean)),
      notAllowedEn: JSON.stringify(notAllowedEn.split('\n').map(s => s.trim()).filter(Boolean)),
      reviewCards: JSON.stringify(reviewCards),
      reviewCardsEnabled: reviewCardsEnabled,
      // Tur Programı
      itinerary: JSON.stringify(itinerary),
      // Ödeme Seçenekleri
      requiresDeposit: requiresDeposit,
      depositType: depositType,
      depositAmount: Number(depositAmount) || 0,
      fullPaymentRequired: fullPaymentRequired,
    };

    try {
      let savedActivityId: number;
      
      if (isEditing) {
        await updateMutation.mutateAsync({ id: activity.id, ...data });
        savedActivityId = activity.id;
        
        // Partner paylaşımlarını ve fiyatlarını kaydet (düzenleme modunda)
        try {
          const shares = selectedPartnershipIds.map(partnershipId => ({
            partnershipId,
            partnerUnitPrice: partnerPrices[partnershipId]?.unitPrice ? parseInt(partnerPrices[partnershipId].unitPrice) : undefined,
            partnerCurrency: partnerPrices[partnershipId]?.currency || 'TRY'
          }));
          await apiRequest('POST', `/api/activities/${savedActivityId}/partner-shares`, { shares });
          queryClient.invalidateQueries({ queryKey: [`/api/activities/${savedActivityId}/partner-shares`] });
        } catch (shareErr) {
          console.error('Partner paylaşım hatası:', shareErr);
        }
        
        toast({ title: "Güncellendi", description: "Aktivite başarıyla güncellendi." });
      } else {
        const created = await createMutation.mutateAsync(data);
        
        // Yeni aktivite oluşturulduktan sonra partner paylaşımlarını kaydet
        if (created && created.id && selectedPartnershipIds.length > 0) {
          try {
            const shares = selectedPartnershipIds.map(partnershipId => ({
              partnershipId,
              partnerUnitPrice: partnerPrices[partnershipId]?.unitPrice ? parseInt(partnerPrices[partnershipId].unitPrice) : undefined,
              partnerCurrency: partnerPrices[partnershipId]?.currency || 'TRY'
            }));
            await apiRequest('POST', `/api/activities/${created.id}/partner-shares`, { shares });
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Aktiviteyi Düzenle' : 'Yeni Aktivite Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="general" className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 flex-shrink-0">
              <TabsTrigger value="general" className="text-xs sm:text-sm">Genel</TabsTrigger>
              <TabsTrigger value="website" className="text-xs sm:text-sm">Web Sitesi</TabsTrigger>
              <TabsTrigger value="extras" className="text-xs sm:text-sm">Ekstra</TabsTrigger>
              <TabsTrigger value="confirmation" className="text-xs sm:text-sm">Onay Mesajı</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs sm:text-sm">Bildirim</TabsTrigger>
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
                {!isWebsiteActive && (
                  <div className="space-y-2">
                    <Label htmlFor="nameAliases">WooCommerce Eşleştirme İsimleri</Label>
                    <Input 
                      id="nameAliases"
                      value={nameAliases}
                      onChange={(e) => setNameAliases(e.target.value)}
                      placeholder="paragliding fethiye, tandem flight"
                    />
                    <p className="text-xs text-muted-foreground">
                      WooCommerce ürün isimlerini bu aktiviteyle eşleştirmek için alternatif isimler (virgülle ayırın)
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs sm:text-sm">Fiyat (TL) <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="priceUsd" className="text-xs sm:text-sm">Fiyat (USD)</Label>
                    <Input 
                      id="priceUsd" 
                      type="number" 
                      value={priceUsd}
                      onChange={(e) => setPriceUsd(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes" className="text-xs sm:text-sm">Süre (Dk) <span className="text-destructive">*</span></Label>
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

                {isWebsiteActive ? (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                    <Label>Rezervasyon Linki</Label>
                    <p className="text-sm text-muted-foreground">
                      Smartur web sitesi aktif olduğu için rezervasyon linki otomatik olarak oluşturulur:
                    </p>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">TR:</span>
                        <code className="text-xs bg-background px-2 py-1 rounded border break-all">
                          https://{websiteSettings?.websiteDomain}/tr/aktiviteler/{name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-ğüşıöçĞÜŞİÖÇ]/g, '')}-{activity?.id || 'yeni'}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">EN:</span>
                        <code className="text-xs bg-background px-2 py-1 rounded border break-all">
                          https://{websiteSettings?.websiteDomain}/en/activities/{name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-{activity?.id || 'yeni'}
                        </code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                      <p className="text-xs text-muted-foreground">Müşterilerin bu aktivite için rezervasyon yapabileceği harici sayfa linkleri</p>
                    </div>
                  </>
                )}

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
                    <div className="space-y-3">
                      {activePartnerships.map((partnership: any) => {
                        const isSelected = selectedPartnershipIds.includes(partnership.id);
                        const priceData = partnerPrices[partnership.id] || { unitPrice: '', currency: 'TRY' };
                        return (
                          <div 
                            key={partnership.id} 
                            className={`p-3 rounded-md border transition-colors ${
                              isSelected 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
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
                                    const newPrices = { ...partnerPrices };
                                    delete newPrices[partnership.id];
                                    setPartnerPrices(newPrices);
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
                            
                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-primary/20 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Partner Fiyati:</Label>
                                  <Input
                                    type="number"
                                    placeholder="Fiyat"
                                    value={priceData.unitPrice}
                                    onChange={(e) => setPartnerPrices({
                                      ...partnerPrices,
                                      [partnership.id]: { ...priceData, unitPrice: e.target.value }
                                    })}
                                    className="w-24 h-8"
                                    data-testid={`input-partner-price-${partnership.id}`}
                                  />
                                </div>
                                <Select
                                  value={priceData.currency}
                                  onValueChange={(val) => setPartnerPrices({
                                    ...partnerPrices,
                                    [partnership.id]: { ...priceData, currency: val }
                                  })}
                                >
                                  <SelectTrigger className="w-20 h-8" data-testid={`select-partner-currency-${partnership.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TRY">TL</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Bu fiyat partner acentaya gosterilir</p>
                              </div>
                            )}
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
                
                {/* Bot için Özel Talimatlar */}
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-muted">
                  <Label htmlFor="botPrompt" className="text-base flex items-center gap-2">
                    Bot için Özel Talimatlar
                    <span className="text-xs font-normal text-muted-foreground">(Sadece WhatsApp botu görür)</span>
                  </Label>
                  <Textarea 
                    id="botPrompt"
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    placeholder="Bu aktiviteye özel kurallar ve talimatlar yazın. Örnek:&#10;• Bu aktivite için 5 yaş altı çocuk kabul edilmez&#10;• Kış aylarında bu tur yapılmıyor, alternatif olarak X turu öner&#10;• Ödeme şarttır, taksit yapılmaz&#10;• 2 kişiye 1 kişi bedava kampanyası var"
                    rows={4}
                    data-testid="input-bot-prompt"
                  />
                  <p className="text-xs text-muted-foreground">Bu talimatlar sadece WhatsApp botuna görünür ve web sitesinde gösterilmez. Bot bu kurallara göre müşterilere cevap verir.</p>
                </div>
              </TabsContent>

              <TabsContent value="website" className="space-y-4 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Bu alanlar web sitenizde aktivite detay sayfasında gösterilir. Boş bırakılan alanlar gösterilmez.
                </p>

                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  label="Aktivite Görseli"
                  size="large"
                  recommendedSize="800x600px (4:3 oran)"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Bölge</Label>
                    <Input 
                      id="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Fethiye/Ölüdeniz"
                      data-testid="input-region"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meetingPoint">Buluşma Noktası</Label>
                    <Input 
                      id="meetingPoint"
                      value={meetingPoint}
                      onChange={(e) => setMeetingPoint(e.target.value)}
                      placeholder="Ölüdeniz Beach"
                      data-testid="input-meeting-point"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meetingPointMapLink">Buluşma Noktası Harita Linki</Label>
                    <Input 
                      id="meetingPointMapLink"
                      value={meetingPointMapLink}
                      onChange={(e) => setMeetingPointMapLink(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      data-testid="input-meeting-point-map-link"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrivalMinutesBefore">Varış Süresi (dakika önce)</Label>
                    <Input 
                      id="arrivalMinutesBefore"
                      type="number"
                      value={arrivalMinutesBefore}
                      onChange={(e) => setArrivalMinutesBefore(e.target.value)}
                      placeholder="30"
                      data-testid="input-arrival-minutes-before"
                    />
                    <p className="text-xs text-muted-foreground">Müşterinin aktiviteden kaç dakika önce buluşma noktasında olması gerektiği</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importantInfoItems">Önemli Bilgiler (Liste)</Label>
                  <Textarea 
                    id="importantInfoItems"
                    value={importantInfoItems}
                    onChange={(e) => setImportantInfoItems(e.target.value)}
                    placeholder="Her satıra bir önemli bilgi yazın. Örnek:&#10;Kimlik kartı yanınızda olmalı&#10;Yüzme bilmek gereklidir&#10;18 yaş altı katılamaz"
                    rows={4}
                    data-testid="input-important-info-items"
                  />
                  <p className="text-xs text-muted-foreground">Her satır, info ikonu ile birlikte ayrı bir öğe olarak gösterilecektir.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importantInfo">Önemli Bilgiler (Açıklama Metni)</Label>
                  <Textarea 
                    id="importantInfo"
                    value={importantInfo}
                    onChange={(e) => setImportantInfo(e.target.value)}
                    placeholder="Ek açıklama metni (isteğe bağlı)..."
                    rows={3}
                    data-testid="input-important-info"
                  />
                  <p className="text-xs text-muted-foreground">Liste öğelerinin altında ek açıklama olarak gösterilecektir.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatToBring">Getirmeniz Gerekenler</Label>
                    <Textarea 
                      id="whatToBring"
                      value={whatToBring}
                      onChange={(e) => setWhatToBring(e.target.value)}
                      placeholder="Her satıra bir madde yazın. Örnek:&#10;Güneş kremi&#10;Şapka&#10;Rahat ayakkabı&#10;Havlu"
                      rows={4}
                      data-testid="input-what-to-bring"
                    />
                    <p className="text-xs text-muted-foreground">İngilizce site için otomatik çevrilir.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notAllowed">İzin Verilmeyenler</Label>
                    <Textarea 
                      id="notAllowed"
                      value={notAllowed}
                      onChange={(e) => setNotAllowed(e.target.value)}
                      placeholder="Her satıra bir madde yazın. Örnek:&#10;Drone&#10;Evcil hayvan&#10;Alkol&#10;Sigara"
                      rows={4}
                      data-testid="input-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">İngilizce site için otomatik çevrilir.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Zorluk Seviyesi</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger data-testid="select-difficulty">
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Kolay</SelectItem>
                        <SelectItem value="moderate">Orta</SelectItem>
                        <SelectItem value="challenging">Zor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minAge">Minimum Yaş</Label>
                    <Input 
                      id="minAge"
                      type="number"
                      min="0"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value)}
                      placeholder="6"
                      data-testid="input-min-age"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tourLanguages">Tur Dilleri</Label>
                  <Input 
                    id="tourLanguages"
                    value={tourLanguages}
                    onChange={(e) => setTourLanguages(e.target.value)}
                    placeholder="tr, en, de, ru"
                    data-testid="input-tour-languages"
                  />
                  <p className="text-xs text-muted-foreground">Virgülle ayırarak dil kodlarını girin (tr, en, de, ru, fr)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categories">Kategoriler</Label>
                  <Input 
                    id="categories"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    placeholder="Macera, Hava Sporları, Ekstrem"
                    data-testid="input-categories"
                  />
                  <p className="text-xs text-muted-foreground">Virgülle ayırarak kategorileri girin</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highlights">Öne Çıkan Özellikler</Label>
                  <Textarea 
                    id="highlights"
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    placeholder="1900m Yükseklikten Uçuş, Profesyonel Pilotlar, GoPro Çekim"
                    className="min-h-[60px]"
                    data-testid="input-highlights"
                  />
                  <p className="text-xs text-muted-foreground">Virgülle ayırarak öne çıkan özellikleri girin</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="includedItems">Dahil Olanlar</Label>
                  <Textarea 
                    id="includedItems"
                    value={includedItems}
                    onChange={(e) => setIncludedItems(e.target.value)}
                    placeholder="Transfer, Sigorta, HD Video & Fotoğraf, Sertifika"
                    className="min-h-[60px]"
                    data-testid="input-included-items"
                  />
                  <p className="text-xs text-muted-foreground">Virgülle ayırarak dahil olan hizmetleri girin</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludedItems">Dahil Olmayanlar</Label>
                  <Textarea 
                    id="excludedItems"
                    value={excludedItems}
                    onChange={(e) => setExcludedItems(e.target.value)}
                    placeholder="Yemek, İçecek"
                    className="min-h-[60px]"
                    data-testid="input-excluded-items"
                  />
                  <p className="text-xs text-muted-foreground">Virgülle ayırarak dahil olmayan hizmetleri girin</p>
                </div>

                <div className="space-y-2">
                  <Label>Galeri Görselleri</Label>
                  <p className="text-xs text-muted-foreground mb-2">Aktivite detay sayfasında gösterilecek ek görseller (max 6 adet)</p>
                  <div className="space-y-4">
                    {galleryImages.map((url, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/30">
                        <ImageUpload
                          value={url}
                          onChange={(newUrl) => {
                            const updated = [...galleryImages];
                            if (newUrl) {
                              updated[index] = newUrl;
                            } else {
                              updated.splice(index, 1);
                            }
                            setGalleryImages(updated);
                          }}
                          label={`Görsel ${index + 1}`}
                          size="large"
                          recommendedSize="800x600px"
                        />
                      </div>
                    ))}
                    {galleryImages.length < 6 && (
                      <div className="p-3 border rounded-lg border-dashed bg-muted/20">
                        <ImageUpload
                          value=""
                          onChange={(newUrl) => {
                            if (newUrl) {
                              setGalleryImages([...galleryImages, newUrl]);
                            }
                          }}
                          label="Yeni Görsel Ekle"
                          size="large"
                          recommendedSize="800x600px"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                  <div className="space-y-1">
                    <Label className="text-base">Ödeme Seçenekleri</Label>
                    <p className="text-xs text-muted-foreground">Müşterilerden nasıl ödeme alınacağını ayarlayın</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-1">
                      <Label>Ön Ödeme (Kapora) Gerekli</Label>
                      <p className="text-xs text-muted-foreground">Rezervasyon için ön ödeme talep edilsin mi?</p>
                    </div>
                    <Switch 
                      checked={requiresDeposit}
                      onCheckedChange={(checked) => {
                        setRequiresDeposit(checked);
                        if (!checked) {
                          setDepositAmount("0");
                        }
                      }}
                      data-testid="switch-requires-deposit"
                    />
                  </div>
                  
                  {requiresDeposit && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Ön Ödeme Tipi</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDepositType("percentage")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                              depositType === "percentage"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted border-border hover:bg-muted/80"
                            }`}
                          >
                            Yüzde (%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDepositType("fixed")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                              depositType === "fixed"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted border-border hover:bg-muted/80"
                            }`}
                          >
                            Sabit Tutar (TL)
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="depositAmount">
                          {depositType === "percentage" ? "Ön Ödeme Yüzdesi (%)" : "Ön Ödeme Tutarı (TL)"}
                        </Label>
                        <Input 
                          id="depositAmount"
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder={depositType === "percentage" ? "25" : "500"}
                          min="0"
                          max={depositType === "percentage" ? "100" : undefined}
                          data-testid="input-deposit-amount"
                        />
                        <p className="text-xs text-muted-foreground">
                          {depositType === "percentage" 
                            ? `Toplam tutarın %${depositAmount || 0}'ı ön ödeme olarak alınacak` 
                            : `${depositAmount || 0} TL sabit ön ödeme alınacak`
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-1">
                      <Label>Tam Ödeme Zorunlu</Label>
                      <p className="text-xs text-muted-foreground">Rezervasyon için tüm tutarın ödenmesi zorunlu olsun mu?</p>
                    </div>
                    <Switch 
                      checked={fullPaymentRequired}
                      onCheckedChange={(checked) => {
                        setFullPaymentRequired(checked);
                        if (checked) {
                          setRequiresDeposit(false);
                          setDepositAmount("0");
                        }
                      }}
                      data-testid="switch-full-payment-required"
                    />
                  </div>
                  
                  {!requiresDeposit && !fullPaymentRequired && (
                    <p className="text-xs text-muted-foreground text-center py-2 bg-background/50 rounded">
                      Ödeme ayarı yapılmadı. Müşteriler ödeme yapmadan rezervasyon yapabilir.
                    </p>
                  )}
                </div>

                {/* Ücretsiz Otel Transferi */}
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
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Transfer Bölgeleri ve Alınış Süreleri</Label>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setTransferZones([...transferZones, { zone: '', minutesBefore: 60 }])}
                          data-testid="button-add-transfer-zone"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Bölge Ekle
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Her bölge için aktivite saatinden kaç dakika önce alınacağını belirtin. Bot bu bilgiyi kullanarak müşterilere alınış saatini söyleyecek.</p>
                      
                      {transferZones.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/30">
                          Henüz bölge eklenmedi. "Bölge Ekle" butonuna tıklayarak transfer bölgesi ekleyin.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {transferZones.map((zone, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2" data-testid={`transfer-zone-row-${index}`}>
                              <Input
                                value={zone.zone}
                                onChange={(e) => {
                                  const updated = [...transferZones];
                                  updated[index] = { ...updated[index], zone: e.target.value };
                                  setTransferZones(updated);
                                }}
                                placeholder="Bölge adı (ör: Fethiye Merkez)"
                                className="flex-1"
                                data-testid={`input-zone-name-${index}`}
                              />
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={zone.minutesBefore}
                                  onChange={(e) => {
                                    const updated = [...transferZones];
                                    updated[index] = { ...updated[index], minutesBefore: parseInt(e.target.value) || 0 };
                                    setTransferZones(updated);
                                  }}
                                  className="w-20"
                                  min={0}
                                  data-testid={`input-zone-minutes-${index}`}
                                />
                                <span className="text-sm text-muted-foreground whitespace-nowrap">dk önce</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updated = transferZones.filter((_, i) => i !== index);
                                  setTransferZones(updated);
                                }}
                                data-testid={`button-remove-zone-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="transferInfo">Transfer Ek Bilgileri</Label>
                    <Textarea 
                      id="transferInfo"
                      value={transferInfo}
                      onChange={(e) => setTransferInfo(e.target.value)}
                      placeholder="Her satıra bir bilgi yazın. Örnek:&#10;Transfer saati aktiviteden 1 saat önce&#10;Otel lobisinde bekleyiniz"
                      rows={3}
                      data-testid="input-transfer-info"
                    />
                    <p className="text-xs text-muted-foreground">Her satır, etiket bulutu olarak transfer bölgelerinin altında gösterilecektir.</p>
                  </div>
                </div>
                
                {/* Yorum Kartları */}
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Yorum Kartları (Dış Platformlar)</Label>
                      <p className="text-xs text-muted-foreground">Google, TripAdvisor gibi dış platformlardaki yorumlarınıza link verin</p>
                    </div>
                    <Switch 
                      checked={reviewCardsEnabled}
                      onCheckedChange={setReviewCardsEnabled}
                      data-testid="switch-review-cards-enabled"
                    />
                  </div>
                  
                  {reviewCardsEnabled && (
                    <div className="space-y-3 pt-2 border-t">
                      {reviewCards.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3 bg-background/50 rounded">
                          Henüz yorum kartı eklenmemiş
                        </p>
                      ) : (
                        reviewCards.map((card, idx) => (
                          <div key={idx} className="flex gap-2 items-start p-3 bg-background/50 rounded-lg">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Platform</Label>
                                <Select
                                  value={card.platform}
                                  onValueChange={(value) => {
                                    const newCards = [...reviewCards];
                                    newCards[idx].platform = value;
                                    setReviewCards(newCards);
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-review-platform-${idx}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="google">Google</SelectItem>
                                    <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                                    <SelectItem value="trustpilot">Trustpilot</SelectItem>
                                    <SelectItem value="facebook">Facebook</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Puan</Label>
                                <Input
                                  placeholder="4.9"
                                  value={card.rating}
                                  onChange={(e) => {
                                    const newCards = [...reviewCards];
                                    newCards[idx].rating = e.target.value;
                                    setReviewCards(newCards);
                                  }}
                                  data-testid={`input-review-rating-${idx}`}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Yorum Sayısı</Label>
                                <Input
                                  placeholder="1200+"
                                  value={card.reviewCount}
                                  onChange={(e) => {
                                    const newCards = [...reviewCards];
                                    newCards[idx].reviewCount = e.target.value;
                                    setReviewCards(newCards);
                                  }}
                                  data-testid={`input-review-count-${idx}`}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">URL</Label>
                                <Input
                                  placeholder="https://g.page/..."
                                  value={card.url}
                                  onChange={(e) => {
                                    const newCards = [...reviewCards];
                                    newCards[idx].url = e.target.value;
                                    setReviewCards(newCards);
                                  }}
                                  data-testid={`input-review-url-${idx}`}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setReviewCards(reviewCards.filter((_, i) => i !== idx))}
                              className="shrink-0 text-destructive hover:text-destructive"
                              data-testid={`button-remove-review-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewCards([...reviewCards, { platform: "google", rating: "5.0", reviewCount: "100+", url: "" }])}
                        data-testid="button-add-review-card"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Yorum Kartı Ekle
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tur Programı Bölümü */}
                <Separator className="my-4" />
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Tur Programı</Label>
                      <p className="text-xs text-muted-foreground">Adım adım tur programını tanımlayın (saat ve açıklama)</p>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => setItinerary([...itinerary, { time: '', title: '', description: '' }])}
                      data-testid="button-add-itinerary"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Adım Ekle
                    </Button>
                  </div>
                  {itinerary.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Henüz tur programı eklenmemiş
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {itinerary.map((step, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 bg-background rounded-lg border">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                placeholder="09:00"
                                value={step.time}
                                onChange={(e) => {
                                  const newItinerary = [...itinerary];
                                  newItinerary[index].time = e.target.value;
                                  setItinerary(newItinerary);
                                }}
                                className="w-24"
                                data-testid={`input-itinerary-time-${index}`}
                              />
                              <Input
                                placeholder="Başlık (ör: Otel Transferi)"
                                value={step.title}
                                onChange={(e) => {
                                  const newItinerary = [...itinerary];
                                  newItinerary[index].title = e.target.value;
                                  setItinerary(newItinerary);
                                }}
                                className="flex-1"
                                data-testid={`input-itinerary-title-${index}`}
                              />
                            </div>
                            <Textarea
                              placeholder="Açıklama (opsiyonel)"
                              value={step.description}
                              onChange={(e) => {
                                const newItinerary = [...itinerary];
                                newItinerary[index].description = e.target.value;
                                setItinerary(newItinerary);
                              }}
                              rows={2}
                              data-testid={`input-itinerary-desc-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setItinerary(itinerary.filter((_, i) => i !== index))}
                            className="text-destructive hover:text-destructive h-8 w-8 flex-shrink-0"
                            data-testid={`button-remove-itinerary-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 mt-6 pt-6 border-t">
                  <div className="space-y-1">
                    <Label className="text-base">Sık Sorulan Sorular (SSS)</Label>
                    <p className="text-xs text-muted-foreground">Web sitesinde aktivite sayfasında gösterilecek SSS. Bot bu bilgilere erişebilir.</p>
                  </div>
                  <FaqEditor 
                    faq={faq} 
                    onChange={setFaq} 
                    testIdPrefix="activity-faq"
                  />
                </div>
              </TabsContent>

              <TabsContent value="extras" className="space-y-4 mt-0">
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

              <TabsContent value="confirmation" className="space-y-4 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Sipariş onay mesajı varsayılan olarak e-posta ile gönderilir.
                </p>

                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="useCustomConfirmation" className="text-base">Özel Onay Mesajı Kullan</Label>
                      <p className="text-xs text-muted-foreground">
                        Aktif olduğunda bu aktivite için aşağıdaki özel şablon kullanılır.
                      </p>
                    </div>
                    <Switch
                      id="useCustomConfirmation"
                      checked={useCustomConfirmation}
                      onCheckedChange={handleUseCustomConfirmationChange}
                      data-testid="toggle-custom-confirmation"
                    />
                  </div>

                  {useCustomConfirmation && (
                    <>
                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="confirmationMessage">Sipariş Onay Mesajı Şablonu</Label>
                        <Textarea 
                          id="confirmationMessage"
                          value={confirmationMessageText}
                          onChange={(e) => setConfirmationMessageText(e.target.value)}
                          rows={16}
                          data-testid="input-confirmation-message"
                        />
                      </div>

                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="healthNotes">Sağlık ve Güvenlik Notları</Label>
                        <Textarea 
                          id="healthNotes"
                          value={healthNotes}
                          onChange={(e) => setHealthNotes(e.target.value)}
                          placeholder="Örnek: Uçuştan önce alkol tüketmemeniz ve son 1 saat içerisinde yemek yememeniz önerilmektedir."
                          rows={3}
                          data-testid="input-health-notes"
                        />
                        <p className="text-xs text-muted-foreground">Sipariş onay mesajında {"{saglik_notlari}"} placeholder'ı ile ve bot yanıtlarında kullanılacaktır.</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-muted/30 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Otomatik Hatırlatma</Label>
                      <p className="text-xs text-muted-foreground">Aktiviteye belirtilen süre kala e-posta ile hatırlatma gönder</p>
                    </div>
                    <Switch 
                      checked={reminderEnabled} 
                      onCheckedChange={setReminderEnabled}
                      data-testid="toggle-reminder-enabled"
                    />
                  </div>
                  
                  {reminderEnabled && (
                    <div className="space-y-4 bg-background/50 p-4 rounded-lg border-t pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="reminderHours">Kaç saat kala hatırlatma yapılsın?</Label>
                        <div className="flex gap-2 items-end">
                          <Input 
                            id="reminderHours"
                            type="number" 
                            min="1"
                            max="72"
                            value={reminderHours}
                            onChange={(e) => setReminderHours(Math.max(1, Math.min(72, Number(e.target.value))))}
                            placeholder="Saat cinsinden girin..."
                            className="flex-1"
                            data-testid="input-reminder-hours"
                          />
                          <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            saat
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          1-72 saat arasında ayarlayın (Varsayılan: 24 saat)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reminderMessage">Hatırlatma Mesajı Şablonu</Label>
                        <Textarea 
                          id="reminderMessage"
                          value={reminderMessage}
                          onChange={(e) => setReminderMessage(e.target.value)}
                          placeholder="Hatırlatma mesajınızı yazın..."
                          className="min-h-[120px]"
                          data-testid="textarea-reminder-message"
                        />
                        <p className="text-xs text-muted-foreground">
                          Desteklenen değişkenler:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}isim{'}'}</code> - Müşteri adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}tarih{'}'}</code> - Rezervasyon tarihi</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}aktiviteler{'}'}</code> - Aktivite adları</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}saatler{'}'}</code> - Aktivite saatleri</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}takip_linki{'}'}</code> - Takip linki</div>
                        </div>
                      </div>
                    </div>
                  )}
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
