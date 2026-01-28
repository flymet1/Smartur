import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { 
  Clock, MapPin, Users, Check, X, ChevronLeft, Calendar, Info, 
  Star, Globe, Shield, Camera, Share2, Heart, AlertCircle,
  Mountain, Zap, Award, Phone, MessageCircle, ChevronRight,
  Plus, Minus, Loader2, CheckCircle, Package, User, Backpack, Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SEO, FAQSchema } from "../components/shared/SEO";
import type { PublicActivity, AvailabilitySlot, PublicWebsiteData } from "../types";
import { getApiUrl } from "../utils";
import { useLanguage } from "../i18n/LanguageContext";
import { format } from "date-fns";
import { tr as trLocale, enUS } from "date-fns/locale";

interface SelectedExtra {
  name: string;
  priceTl: number;
  priceUsd: number;
  quantity: number;
}

interface Participant {
  firstName: string;
  lastName: string;
  birthDate: string;
}

const difficultyConfig: Record<string, { label: string; labelEn: string; color: string; icon: typeof Mountain }> = {
  easy: { label: "Kolay", labelEn: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: Zap },
  moderate: { label: "Orta", labelEn: "Moderate", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300", icon: Mountain },
  challenging: { label: "Zor", labelEn: "Challenging", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: AlertCircle },
};

const languageFlags: Record<string, { name: string; flag: string }> = {
  tr: { name: "Turkce", flag: "TR" },
  en: { name: "English", flag: "EN" },
  de: { name: "Deutsch", flag: "DE" },
  ru: { name: "Pусский", flag: "RU" },
  fr: { name: "Francais", flag: "FR" },
};

function ensureArray<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function ensureString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

export default function PublicActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const activityId = parseInt(id || "0");
  const { t, language, getLocalizedPath } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Reservation states
  const [reservationStep, setReservationStep] = useState<"selection" | "participants" | "contact" | "success">("selection");
  const [reservationData, setReservationData] = useState({
    date: "",
    time: "",
    quantity: 1,
    hotelName: "",
    hasTransfer: false,
    transferZone: "",
    notes: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
  });
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([{ firstName: "", lastName: "", birthDate: "" }]);
  const [trackingToken, setTrackingToken] = useState("");

  const { data: activity, isLoading } = useQuery<PublicActivity>({
    queryKey: [getApiUrl(`/api/website/activities/${activityId}?lang=${language}`)],
    enabled: activityId > 0,
  });

  const { data: allActivities } = useQuery<PublicActivity[]>({
    queryKey: [getApiUrl(`/api/website/activities?lang=${language}`)],
  });

  const { data: websiteData } = useQuery<PublicWebsiteData>({
    queryKey: [getApiUrl(`/api/website/data?lang=${language}`)],
  });

  const { data: availability } = useQuery<AvailabilitySlot[]>({
    queryKey: [getApiUrl(`/api/website/availability?activityId=${activityId}&date=${reservationData.date}`)],
    enabled: !!reservationData.date && activityId > 0,
  });

  // Payment initialization mutation
  const initializePaymentMutation = useMutation({
    mutationFn: async (data: { reservationId: number; amount: number; customerName: string; customerEmail: string; customerPhone: string }) => {
      const response = await apiRequest("POST", getApiUrl("/api/website/payment/initialize"), data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: language === "en" ? "Payment Error" : "Ödeme Hatası",
        description: error.message || (language === "en" ? "Could not initialize payment." : "Ödeme başlatılamadı."),
        variant: "destructive",
      });
    },
  });

  // Reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", getApiUrl("/api/website/reservations"), data);
      return response.json();
    },
    onSuccess: async (data) => {
      setTrackingToken(data.trackingToken);
      
      // Check if payment is required (deposit or full payment)
      if (data.depositRequired > 0 || data.paymentType === "full") {
        const paymentAmount = data.paymentType === "full" ? data.totalPrice : data.depositRequired;
        
        toast({
          title: language === "en" ? "Redirecting to Payment" : "Ödeme Sayfasına Yönlendiriliyorsunuz",
          description: language === "en" ? "Please wait..." : "Lütfen bekleyin...",
        });
        
        initializePaymentMutation.mutate({
          reservationId: data.id,
          amount: paymentAmount,
          customerName: reservationData.customerName,
          customerEmail: reservationData.customerEmail,
          customerPhone: reservationData.customerPhone,
        });
      } else {
        setReservationStep("success");
        toast({
          title: language === "en" ? "Reservation Created" : "Rezervasyon Oluşturuldu",
          description: language === "en" ? "Your reservation has been received." : "Rezervasyonunuz başarıyla alındı.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: language === "en" ? "Error" : "Hata",
        description: error.message || (language === "en" ? "Could not create reservation." : "Rezervasyon oluşturulamadı."),
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getMinDate = () => new Date().toISOString().split("T")[0];

  const getAvailableTimes = () => {
    const times = ensureArray(activity?.defaultTimes);
    if (times.length === 0) return [];
    if (availability && availability.length > 0) {
      return availability.filter((slot) => slot.available > 0).map((slot) => slot.time);
    }
    return times;
  };

  const toggleExtra = (extra: { name: string; priceTl: number; priceUsd: number }) => {
    setSelectedExtras((prev) => {
      const existing = prev.find((e) => e.name === extra.name);
      if (existing) {
        return prev.filter((e) => e.name !== extra.name);
      }
      return [...prev, { ...extra, quantity: reservationData.quantity }];
    });
  };

  const updateExtraQuantity = (extraName: string, delta: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) =>
        e.name === extraName
          ? { ...e, quantity: Math.max(1, Math.min(e.quantity + delta, reservationData.quantity)) }
          : e
      )
    );
  };

  const updateQuantity = (newQty: number) => {
    const qty = Math.max(1, Math.min(newQty, activity?.maxParticipants || 20));
    setReservationData((prev) => ({ ...prev, quantity: qty }));
    setSelectedExtras((prev) => prev.map((e) => ({ ...e, quantity: Math.min(e.quantity, qty) })));
    
    // Update participants array
    setParticipants((prev) => {
      if (qty > prev.length) {
        return [...prev, ...Array(qty - prev.length).fill({ firstName: "", lastName: "", birthDate: "" })];
      }
      return prev.slice(0, qty);
    });
  };

  const calculateExtrasTotal = () => {
    return selectedExtras.reduce((sum, extra) => sum + extra.priceTl * extra.quantity, 0);
  };

  const calculateTotalPrice = () => {
    const basePrice = (activity?.price || 0) * reservationData.quantity;
    const extrasTotal = calculateExtrasTotal();
    return basePrice + extrasTotal;
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const canProceedToParticipants = () => {
    return reservationData.date && reservationData.time && reservationData.quantity > 0;
  };

  const canProceedToContact = () => {
    return participants.every((p) => p.firstName.trim() && p.lastName.trim() && p.birthDate);
  };

  const handleSubmitReservation = () => {
    createReservationMutation.mutate({
      activityId,
      ...reservationData,
      quantity: reservationData.quantity,
      selectedExtras,
      participants,
    });
  };

  const relatedActivities = allActivities?.filter(a => 
    a.id !== activityId && 
    a.categories?.some(cat => activity?.categories?.includes(cat))
  ).slice(0, 3);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (language === "en") {
      if (hours === 0) return `${mins} minutes`;
      if (mins === 0) return `${hours} hours`;
      return `${hours}h ${mins}m`;
    }
    if (hours === 0) return `${mins} dakika`;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dakika`;
  };

  const formatDateTurkish = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: activity?.name,
          text: activity?.description || undefined,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[50vh] md:h-[60vh]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-80 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {language === "en" ? "Activity Not Found" : "Aktivite Bulunamadı"}
          </h1>
          <Link href={getLocalizedPath("/aktiviteler")}>
            <Button>{language === "en" ? "Back to Activities" : "Aktivitelere Dön"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = activity.imageUrl || 
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80";
  
  const allImages = [mainImage, ...ensureArray(activity.galleryImages)];
  const difficulty = activity.difficulty && difficultyConfig[activity.difficulty] 
    ? difficultyConfig[activity.difficulty] 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        websiteData={websiteData}
        title={activity.name}
        description={activity.description?.substring(0, 160) || ""}
        image={activity.imageUrl || undefined}
        type="product"
        activity={activity}
        language={language}
      />
      {activity.faq && activity.faq.length > 0 && (
        <FAQSchema faqs={activity.faq} />
      )}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img
          src={mainImage}
          alt={activity.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <Link href={getLocalizedPath("/aktiviteler")}>
            <Button variant="outline" size="sm" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {language === "en" ? "Back" : "Geri"}
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {ensureArray(activity.categories).map((cat, idx) => (
                <Badge key={idx} className="bg-primary/90 text-primary-foreground">
                  {ensureString(cat)}
                </Badge>
              ))}
              {difficulty && (
                <Badge className={difficulty.color}>
                  <difficulty.icon className="h-3 w-3 mr-1" />
                  {language === "en" ? difficulty.labelEn : difficulty.label}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3" data-testid="text-activity-name">
              {activity.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              {activity.region && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{activity.region}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(activity.durationMinutes)}</span>
              </div>
              {activity.maxParticipants && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{language === "en" ? `Max ${activity.maxParticipants} people` : `Maks ${activity.maxParticipants} kişi`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {ensureArray(activity.highlights).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ensureArray(activity.highlights).slice(0, 4).map((highlight, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{ensureString(highlight)}</span>
                  </div>
                ))}
              </div>
            )}

            {activity.description && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  {language === "en" ? "About This Experience" : "Bu Deneyim Hakkında"}
                </h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {activity.description}
                </p>
              </div>
            )}

            {allImages.length > 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {language === "en" ? "Gallery" : "Galeri"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allImages.slice(0, 8).map((img, idx) => (
                    <Dialog key={idx}>
                      <DialogTrigger asChild>
                        <div 
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover-elevate"
                          onClick={() => setSelectedImage(img)}
                        >
                          <img src={img} alt={`${activity.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0 overflow-hidden">
                        <img src={img} alt={activity.name} className="w-full h-auto" />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {ensureArray(activity.includedItems).length > 0 && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      {language === "en" ? "What's Included" : "Dahil Olanlar"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {ensureArray(activity.includedItems).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{ensureString(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {ensureArray(activity.excludedItems).length > 0 && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <X className="h-5 w-5" />
                      {language === "en" ? "Not Included" : "Dahil Olmayanlar"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {ensureArray(activity.excludedItems).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <X className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{ensureString(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {(activity.meetingPoint || (activity.minAge != null && activity.minAge > 0) || ensureArray(activity.tourLanguages).length > 0 || activity.importantInfo || ensureArray(activity.importantInfoItems).length > 0) && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    {language === "en" ? "Important Information" : "Önemli Bilgiler"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {activity.meetingPoint && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{language === "en" ? "Meeting Point" : "Buluşma Noktası"}</p>
                          <p className="text-sm text-muted-foreground">{activity.meetingPoint}</p>
                        </div>
                      </div>
                    )}

                    {activity.minAge != null && activity.minAge > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <p className="font-medium">{language === "en" ? "Minimum Age" : "Minimum Yaş"}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.minAge} {language === "en" ? "years old" : "yaş ve üzeri"}
                          </p>
                        </div>
                      </div>
                    )}

                    {ensureArray(activity.tourLanguages).length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium">{language === "en" ? "Languages" : "Diller"}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ensureArray(activity.tourLanguages).map((lang, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {languageFlags[lang]?.flag || lang.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium">{language === "en" ? "Safety" : "Güvenlik"}</p>
                        <p className="text-sm text-muted-foreground">
                          {language === "en" ? "Full insurance coverage" : "Tam sigorta kapsamı"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {ensureArray(activity.importantInfoItems).length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="grid md:grid-cols-2 gap-3">
                        {ensureArray(activity.importantInfoItems).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-sm text-foreground pt-1">{ensureString(item)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activity.importantInfo && (
                    <div className={activity.importantInfoItems?.length ? "mt-4" : "mt-6 pt-6 border-t"}>
                      <div className="flex flex-wrap gap-2">
                        {activity.importantInfo.split('\n').filter(Boolean).map((line, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-md">
                            <Info className="h-3.5 w-3.5" />
                            {line.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(ensureArray(activity.transferZones).length > 0) || activity.transferInfo ? (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {language === "en" ? "Transfer Zones" : "Transfer Bölgeleri"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ensureArray(activity.transferZones).length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        {language === "en" 
                          ? "Free hotel pickup available from these areas:" 
                          : "Bu bolgelerden ucretsiz otel transferi mevcuttur:"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ensureArray(activity.transferZones).map((zone, idx) => {
                          // Zone can be a string or an object {zone: string, minutesBefore: number}
                          const zoneName = typeof zone === 'object' && zone !== null && 'zone' in zone 
                            ? (zone as {zone: string}).zone 
                            : ensureString(zone);
                          return (
                            <Badge key={idx} variant="outline" className="gap-1">
                              <MapPin className="h-3 w-3" />
                              {zoneName}
                            </Badge>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {activity.transferInfo && (
                    <div className={activity.transferZones?.length ? "mt-4 pt-4 border-t" : ""}>
                      <div className="flex flex-wrap gap-2">
                        {activity.transferInfo.split('\n').filter(Boolean).map((line, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground text-sm rounded-md">
                            <Info className="h-3.5 w-3.5" />
                            {line.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Getirmeniz Gerekenler */}
            {ensureArray(activity.whatToBring).length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Backpack className="h-5 w-5 text-green-600" />
                    {language === "en" ? "What to Bring" : "Getirmeniz Gerekenler"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {ensureArray(activity.whatToBring).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{ensureString(item)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* İzin Verilmeyenler */}
            {ensureArray(activity.notAllowed).length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    {language === "en" ? "Not Allowed" : "İzin Verilmeyenler"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {ensureArray(activity.notAllowed).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
                        <X className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{ensureString(item)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tur Programı */}
            {ensureArray(activity.itinerary).length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    {language === "en" ? "Tour Program" : "Tur Programı"}
                  </CardTitle>
                  <CardDescription>
                    {language === "en" ? "Step-by-step itinerary of your tour" : "Turunuzun adım adım programı"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20" />
                    <div className="space-y-6">
                      {ensureArray(activity.itinerary).map((step: any, idx) => (
                        <div key={idx} className="relative flex gap-4 pl-2">
                          <div className="absolute left-[11px] w-3 h-3 rounded-full bg-primary border-2 border-background z-10" />
                          <div className="flex-1 ml-6 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                              {step?.time && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {ensureString(step.time)}
                                </Badge>
                              )}
                              <h4 className="font-semibold text-foreground">{ensureString(step?.title)}</h4>
                            </div>
                            {step?.description && (
                              <p className="text-sm text-muted-foreground">{ensureString(step.description)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {ensureArray(activity.faq).length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {language === "en" ? "Frequently Asked Questions" : "Sık Sorulan Sorular"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {ensureArray(activity.faq).map((item: any, idx) => (
                      <AccordionItem key={idx} value={`faq-${idx}`}>
                        <AccordionTrigger className="text-left">{ensureString(item?.question)}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {ensureString(item?.answer)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Yorum Kartları */}
            {activity.reviewCardsEnabled && ensureArray(activity.reviewCards).length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    {language === "en" ? "Customer Reviews" : "Müşteri Yorumları"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ensureArray(activity.reviewCards).map((card: any, idx) => (
                      <a
                        key={idx}
                        href={ensureString(card?.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-muted/50 rounded-lg border hover:shadow-md transition-shadow"
                        data-testid={`activity-review-card-${card?.platform || 'unknown'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {card?.platform === "google" && (
                            <div className="w-5 h-5 bg-[#4285F4] rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
                          )}
                          {card?.platform === "tripadvisor" && (
                            <div className="w-5 h-5 bg-[#00AF87] rounded-full flex items-center justify-center text-white text-xs font-bold">T</div>
                          )}
                          {card?.platform === "trustpilot" && (
                            <div className="w-5 h-5 bg-[#00B67A] rounded-full flex items-center justify-center text-white text-xs font-bold">★</div>
                          )}
                          {card?.platform === "facebook" && (
                            <div className="w-5 h-5 bg-[#1877F2] rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
                          )}
                          <span className="font-medium text-sm">{card?.platform === "tripadvisor" ? "TripAdvisor" : (card?.platform || '').charAt(0).toUpperCase() + (card?.platform || '').slice(1)}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < Math.floor(parseFloat(card?.rating || '0')) ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                            />
                          ))}
                          <span className="ml-1 text-sm font-medium">{card?.rating || '0'}/5</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {language === "en" ? `${card?.reviewCount || 0} Reviews` : `${card?.reviewCount || 0} Yorum`}
                        </p>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Card className="border-0 shadow-lg">
                {reservationStep === "success" ? (
                  <CardContent className="pt-6 pb-6">
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <CheckCircle className="h-7 w-7 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold">
                          {language === "en" ? "Reservation Successful!" : "Rezervasyon Başarılı!"}
                        </h3>
                      </div>
                      
                      <Separator />
                      
                      {/* Rezervasyon Özeti */}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{language === "en" ? "Activity" : "Aktivite"}</span>
                          <span className="font-medium">{activity?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{language === "en" ? "Date" : "Tarih"}</span>
                          <span className="font-medium">{formatDateTurkish(reservationData.date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{language === "en" ? "Time" : "Saat"}</span>
                          <span className="font-medium">{reservationData.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{language === "en" ? "Participants" : "Katılımcı"}</span>
                          <span className="font-medium">{reservationData.quantity} {language === "en" ? "person" : "kişi"}</span>
                        </div>
                        
                        {/* Transfer Bilgisi */}
                        {reservationData.hasTransfer && reservationData.transferZone && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{language === "en" ? "Transfer Zone" : "Transfer Bölgesi"}</span>
                            <span className="font-medium">{reservationData.transferZone}</span>
                          </div>
                        )}
                        {reservationData.hasTransfer && reservationData.hotelName && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{language === "en" ? "Hotel" : "Otel"}</span>
                            <span className="font-medium">{reservationData.hotelName}</span>
                          </div>
                        )}
                        
                        {/* Ekstralar */}
                        {selectedExtras.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground mb-2">{language === "en" ? "Extras" : "Ekstralar"}</p>
                            {selectedExtras.map((extra, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{extra.name} x{extra.quantity}</span>
                                <span>{(extra.priceTl * extra.quantity).toLocaleString()} TL</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Ödeme Bilgileri */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between font-medium">
                          <span>{language === "en" ? "Total Amount" : "Toplam Tutar"}</span>
                          <span className="text-primary">{calculateTotalPrice().toLocaleString()} TL</span>
                        </div>
                        
                        {activity?.fullPaymentRequired && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-xs text-amber-800 dark:text-amber-200">
                            {language === "en" 
                              ? "Full payment is required for this activity." 
                              : "Bu aktivite için tam ödeme gereklidir."}
                          </div>
                        )}
                        
                        {activity?.requiresDeposit && !activity?.fullPaymentRequired && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{language === "en" ? "Deposit Required" : "Gereken Ön Ödeme"}</span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                {activity.depositType === "percentage" 
                                  ? `${(calculateTotalPrice() * (activity.depositAmount || 0) / 100).toLocaleString()} TL (%${activity.depositAmount})`
                                  : `${(activity.depositAmount || 0).toLocaleString()} TL`
                                }
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{language === "en" ? "Remaining Payment" : "Kalan Ödeme"}</span>
                              <span className="font-medium">
                                {activity.depositType === "percentage"
                                  ? (calculateTotalPrice() - (calculateTotalPrice() * (activity.depositAmount || 0) / 100)).toLocaleString()
                                  : (calculateTotalPrice() - (activity.depositAmount || 0)).toLocaleString()
                                } TL
                              </span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs text-blue-800 dark:text-blue-200">
                              {language === "en" 
                                ? "Deposit payment is required. Remaining balance will be collected on the activity day." 
                                : "Ön ödeme (kapora) gereklidir. Kalan tutar aktivite günü tahsil edilecektir."}
                            </div>
                          </>
                        )}
                        
                        {!activity?.requiresDeposit && !activity?.fullPaymentRequired && (
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs text-green-800 dark:text-green-200">
                            {language === "en" 
                              ? "No advance payment required. Payment will be collected on the activity day." 
                              : "Ön ödeme gerekmez. Ödeme aktivite günü alınacaktır."}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground text-center text-xs">
                        {language === "en" 
                          ? "We will contact you soon to confirm your reservation." 
                          : "Rezervasyonunuzu onaylamak için en kısa sürede sizinle iletişime geçeceğiz."}
                      </p>
                      
                      {trackingToken && (
                        <Link href={`/takip/${trackingToken}`}>
                          <Button variant="outline" className="w-full mt-2">
                            {language === "en" ? "Track Your Reservation" : "Rezervasyonunuzu Takip Edin"}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="bg-primary/5 border-b">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {reservationStep === "selection" 
                            ? (language === "en" ? "Total Price" : "Toplam Fiyat")
                            : (language === "en" ? "Step" : "Adım")}
                        </span>
                        {reservationStep !== "selection" && (
                          <Badge variant="secondary">
                            {reservationStep === "participants" ? "2/3" : "3/3"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-primary">
                          {calculateTotalPrice().toLocaleString()}
                        </span>
                        <span className="text-xl">TL</span>
                      </div>
                      {reservationData.quantity > 0 && reservationStep === "selection" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.price.toLocaleString()} TL x {reservationData.quantity} {language === "en" ? "person" : "kişi"}
                          {calculateExtrasTotal() > 0 && ` + ${calculateExtrasTotal().toLocaleString()} TL ${language === "en" ? "extras" : "ekstralar"}`}
                        </p>
                      )}
                    </CardHeader>
                    
                    <CardContent className="pt-6 space-y-4">
                      {reservationStep === "selection" && (
                        <>
                          <div className="space-y-3">
                            <Label>{language === "en" ? "Select Date" : "Tarih Seçin"}</Label>
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                  data-testid="input-date"
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {reservationData.date 
                                    ? format(new Date(reservationData.date), "dd MMMM yyyy", { locale: language === "tr" ? trLocale : enUS })
                                    : (language === "en" ? "Select Date" : "Tarih Seçin")
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={reservationData.date ? new Date(reservationData.date) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      setReservationData((prev) => ({ 
                                        ...prev, 
                                        date: format(date, "yyyy-MM-dd"), 
                                        time: "" 
                                      }));
                                      setCalendarOpen(false);
                                    }
                                  }}
                                  locale={language === "tr" ? trLocale : enUS}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {reservationData.date && (
                            <div className="space-y-3">
                              <Label>{language === "en" ? "Select Time" : "Saat Seçin"}</Label>
                              <div className="flex flex-wrap gap-2">
                                {getAvailableTimes().length > 0 ? (
                                  getAvailableTimes().map((time, idx) => (
                                    <Button
                                      key={idx}
                                      variant={reservationData.time === time ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setReservationData((prev) => ({ ...prev, time }))}
                                      data-testid={`button-time-${time}`}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      {time}
                                    </Button>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {language === "en" ? "No available times" : "Müsait saat yok"}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <Label>{language === "en" ? "Number of People" : "Kişi Sayısı"}</Label>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(reservationData.quantity - 1)}
                                disabled={reservationData.quantity <= 1}
                                data-testid="button-decrease-quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center text-xl font-bold" data-testid="text-quantity">
                                {reservationData.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(reservationData.quantity + 1)}
                                disabled={reservationData.quantity >= (activity?.maxParticipants || 20)}
                                data-testid="button-increase-quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {ensureArray(activity.extras).length > 0 && (
                            <div className="space-y-3">
                              <Label className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                {language === "en" ? "Extras" : "Ekstralar"}
                              </Label>
                              <div className="space-y-2">
                                {ensureArray(activity.extras).map((extra: any, idx) => {
                                  const selected = selectedExtras.find((e) => e.name === extra?.name);
                                  return (
                                    <div key={idx} className="p-3 border rounded-lg space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={!!selected}
                                            onCheckedChange={() => extra && toggleExtra(extra)}
                                            data-testid={`checkbox-extra-${idx}`}
                                          />
                                          <span className="text-sm font-medium">{ensureString(extra?.name)}</span>
                                        </div>
                                        <span className="text-sm font-bold text-primary">+{extra?.priceTl || 0} TL</span>
                                      </div>
                                      {selected && (
                                        <div className="flex items-center gap-2 pl-6">
                                          <span className="text-xs text-muted-foreground">
                                            {language === "en" ? "Qty:" : "Adet:"}
                                          </span>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => updateExtraQuantity(extra.name, -1)}
                                            disabled={selected.quantity <= 1}
                                          >
                                            <Minus className="h-3 w-3" />
                                          </Button>
                                          <span className="w-6 text-center text-sm">{selected.quantity}</span>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => updateExtraQuantity(extra.name, 1)}
                                            disabled={selected.quantity >= reservationData.quantity}
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <Separator />

                          <Button 
                            size="lg" 
                            className="w-full gap-2 text-lg h-14" 
                            onClick={() => setReservationStep("participants")}
                            disabled={!canProceedToParticipants()}
                            data-testid="button-proceed-participants"
                          >
                            <Users className="h-5 w-5" />
                            {language === "en" ? "Continue" : "Devam Et"}
                          </Button>
                        </>
                      )}

                      {reservationStep === "participants" && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <Button variant="ghost" size="sm" onClick={() => setReservationStep("selection")}>
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              {language === "en" ? "Back" : "Geri"}
                            </Button>
                            <span className="text-sm font-medium">
                              {language === "en" ? "Participant Info" : "Katılımcı Bilgileri"}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {participants.map((participant, idx) => (
                              <Card key={idx} className="p-4 border-0 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-medium">
                                    {language === "en" ? `Participant ${idx + 1}` : `${idx + 1}. Katılımcı`}
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">{language === "en" ? "First Name" : "Ad"}</Label>
                                      <Input
                                        value={participant.firstName}
                                        onChange={(e) => updateParticipant(idx, "firstName", e.target.value)}
                                        placeholder={language === "en" ? "First name" : "Ad"}
                                        data-testid={`input-firstname-${idx}`}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">{language === "en" ? "Last Name" : "Soyad"}</Label>
                                      <Input
                                        value={participant.lastName}
                                        onChange={(e) => updateParticipant(idx, "lastName", e.target.value)}
                                        placeholder={language === "en" ? "Last name" : "Soyad"}
                                        data-testid={`input-lastname-${idx}`}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">{language === "en" ? "Birth Date" : "Doğum Tarihi"}</Label>
                                    <Input
                                      type="text"
                                      placeholder={language === "en" ? "DD.MM.YYYY" : "GG.AA.YYYY"}
                                      value={participant.birthDate}
                                      onChange={(e) => updateParticipant(idx, "birthDate", e.target.value)}
                                      data-testid={`input-birthdate-${idx}`}
                                    />
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          <Button 
                            size="lg" 
                            className="w-full gap-2" 
                            onClick={() => setReservationStep("contact")}
                            disabled={!canProceedToContact()}
                            data-testid="button-proceed-contact"
                          >
                            {language === "en" ? "Continue to Contact Info" : "İletişim Bilgilerine Devam Et"}
                          </Button>
                        </>
                      )}

                      {reservationStep === "contact" && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <Button variant="ghost" size="sm" onClick={() => setReservationStep("participants")}>
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              {language === "en" ? "Back" : "Geri"}
                            </Button>
                            <span className="text-sm font-medium">
                              {language === "en" ? "Contact Info" : "İletişim Bilgileri"}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Label>{language === "en" ? "Full Name" : "Ad Soyad"}</Label>
                              <Input
                                value={reservationData.customerName}
                                onChange={(e) => setReservationData((prev) => ({ ...prev, customerName: e.target.value }))}
                                placeholder={language === "en" ? "Your full name" : "Adınız Soyadınız"}
                                data-testid="input-customer-name"
                              />
                            </div>
                            <div>
                              <Label>{language === "en" ? "Phone" : "Telefon"}</Label>
                              <Input
                                value={reservationData.customerPhone}
                                onChange={(e) => setReservationData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                                placeholder="+90 5XX XXX XX XX"
                                data-testid="input-customer-phone"
                              />
                            </div>
                            <div>
                              <Label>{language === "en" ? "Email" : "E-posta"}</Label>
                              <Input
                                type="email"
                                value={reservationData.customerEmail}
                                onChange={(e) => setReservationData((prev) => ({ ...prev, customerEmail: e.target.value }))}
                                placeholder="email@example.com"
                                data-testid="input-customer-email"
                              />
                            </div>
                            {/* Transfer seçeneği - sadece aktivitede transfer varsa göster */}
                            {activity?.hasFreeHotelTransfer && ensureArray(activity.transferZones).length > 0 && (
                              <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id="hasTransfer"
                                    checked={reservationData.hasTransfer}
                                    onCheckedChange={(checked) => setReservationData((prev) => ({ 
                                      ...prev, 
                                      hasTransfer: checked === true,
                                      hotelName: checked === true ? prev.hotelName : "",
                                      transferZone: checked === true ? prev.transferZone : ""
                                    }))}
                                    data-testid="checkbox-has-transfer"
                                  />
                                  <Label htmlFor="hasTransfer" className="cursor-pointer font-medium text-green-800 dark:text-green-200">
                                    {language === "en" ? "I want hotel pickup (Free)" : "Otelden alınmak istiyorum (Ücretsiz)"}
                                  </Label>
                                </div>
                                
                                {reservationData.hasTransfer && (
                                  <div className="space-y-3 pl-6">
                                    {/* Transfer Bölgesi Seçimi */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">{language === "en" ? "Transfer Zone" : "Transfer Bölgesi"} *</Label>
                                      <Select
                                        value={reservationData.transferZone}
                                        onValueChange={(value) => setReservationData((prev) => ({ ...prev, transferZone: value }))}
                                      >
                                        <SelectTrigger className="bg-white dark:bg-background" data-testid="select-transfer-zone">
                                          <SelectValue placeholder={language === "en" ? "Select your zone" : "Bölgenizi seçin"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ensureArray(activity.transferZones).map((zone, idx) => {
                                            const zoneName = typeof zone === 'object' && zone !== null && 'zone' in zone 
                                              ? (zone as {zone: string}).zone 
                                              : ensureString(zone);
                                            return (
                                              <SelectItem key={idx} value={zoneName}>
                                                {zoneName}
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                      
                                      {/* Transfer süresi bildirimi */}
                                      {reservationData.transferZone && (() => {
                                        const selectedZoneData = ensureArray(activity.transferZones).find((zone) => {
                                          const zoneName = typeof zone === 'object' && zone !== null && 'zone' in zone 
                                            ? (zone as {zone: string}).zone 
                                            : ensureString(zone);
                                          return zoneName === reservationData.transferZone;
                                        });
                                        const minutesBefore = typeof selectedZoneData === 'object' && selectedZoneData !== null && 'minutesBefore' in selectedZoneData
                                          ? (selectedZoneData as {minutesBefore: number}).minutesBefore
                                          : 30;
                                        return (
                                          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-300">
                                            <Clock className="h-4 w-4" />
                                            <span>
                                              {language === "en" 
                                                ? `Pickup will be ${minutesBefore} minutes before activity time.`
                                                : `${reservationData.transferZone} bölgesinden aktiviteden ${minutesBefore} dakika önce alınacaksınız.`}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Otel Adı */}
                                    <div className="space-y-2">
                                      <Label className="text-sm">{language === "en" ? "Hotel Name" : "Otel Adı"} *</Label>
                                      <Input
                                        value={reservationData.hotelName}
                                        onChange={(e) => setReservationData((prev) => ({ ...prev, hotelName: e.target.value }))}
                                        placeholder={language === "en" ? "Enter your hotel name" : "Otel adınızı girin"}
                                        data-testid="input-hotel-name"
                                        className="bg-white dark:bg-background"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        {language === "en" 
                                          ? "Please enter your hotel name so we can arrange pickup." 
                                          : "Sizi otelden alabilmemiz için otel adınızı girin."}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <Label>{language === "en" ? "Notes (Optional)" : "Notlar (Opsiyonel)"}</Label>
                              <Textarea
                                value={reservationData.notes}
                                onChange={(e) => setReservationData((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder={language === "en" ? "Any special requests..." : "Özel istekleriniz..."}
                                rows={2}
                                data-testid="input-notes"
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>{language === "en" ? "Date:" : "Tarih:"}</span>
                              <span className="font-medium">{formatDateTurkish(reservationData.date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{language === "en" ? "Time:" : "Saat:"}</span>
                              <span className="font-medium">{reservationData.time}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{language === "en" ? "People:" : "Kişi:"}</span>
                              <span className="font-medium">{reservationData.quantity}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold">
                              <span>{language === "en" ? "Total:" : "Toplam:"}</span>
                              <span className="text-primary">{calculateTotalPrice().toLocaleString()} TL</span>
                            </div>
                          </div>

                          <Button 
                            size="lg" 
                            className="w-full gap-2 text-lg h-14" 
                            onClick={handleSubmitReservation}
                            disabled={!reservationData.customerName || !reservationData.customerPhone || createReservationMutation.isPending}
                            data-testid="button-submit-reservation"
                          >
                            {createReservationMutation.isPending ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {language === "en" ? "Processing..." : "İşleniyor..."}
                              </>
                            ) : (
                              <>
                                <Calendar className="h-5 w-5" />
                                {language === "en" ? "Complete Reservation" : "Rezervasyonu Tamamla"}
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {reservationStep === "selection" && (
                        <p className="text-xs text-center text-muted-foreground">
                          {language === "en" 
                            ? "Reserve now, pay later - secure your spot today!" 
                            : "Şimdi rezerve et, sonra öde - yerinizi garantileyin!"}
                        </p>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>

                          </div>
          </div>
        </div>

        {relatedActivities && relatedActivities.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {language === "en" ? "You May Also Like" : "Bunları da Beğenebilirsiniz"}
              </h2>
              <Link href={getLocalizedPath("/aktiviteler")}>
                <Button variant="ghost" className="gap-1">
                  {language === "en" ? "View All" : "Tümünü Gör"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedActivities.map((related) => (
                <Link key={related.id} href={getLocalizedPath(`/aktivite/${related.id}`)}>
                  <Card className="overflow-hidden hover-elevate cursor-pointer h-full border-0 shadow-md hover:shadow-xl">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={related.imageUrl || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80"}
                        alt={related.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-semibold text-white">{related.name}</h3>
                      </div>
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDuration(related.durationMinutes)}
                        </div>
                        <div className="font-bold text-primary">
                          {related.price.toLocaleString()} TL
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(websiteData?.contactPhone || websiteData?.websiteContactPhone || websiteData?.websiteWhatsappNumber) && (
          <div className="mt-16">
            <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl p-8 md:p-12 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full" />
              <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-white/30 rounded-full" />
              <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-white/40 rounded-full" />
              <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-white/20 rounded-full" />
              <div className="relative z-10 text-center max-w-2xl mx-auto text-primary-foreground">
                <h3 className="text-2xl md:text-3xl font-bold mb-3">
                  {language === "en" ? "Need Help?" : "Yardıma mı İhtiyacınız Var?"}
                </h3>
                <p className="text-primary-foreground/80 mb-8">
                  {language === "en" 
                    ? "Our team is here to help you with your reservation. Contact us anytime!"
                    : "Ekibimiz rezervasyonunuzla ilgili size yardımcı olmak için burada. Bize her zaman ulaşabilirsiniz!"}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {(websiteData?.websiteContactPhone || websiteData?.contactPhone) && (
                    <a href={`tel:${websiteData?.websiteContactPhone || websiteData?.contactPhone}`}>
                      <div className="group relative inline-flex items-center gap-3 bg-white text-foreground px-6 py-3.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">{language === "en" ? "Call Us" : "Bizi Arayın"}</div>
                          <div className="font-semibold">{websiteData?.websiteContactPhone || websiteData?.contactPhone}</div>
                        </div>
                      </div>
                    </a>
                  )}
                  {websiteData?.websiteWhatsappNumber && (
                    <a 
                      href={`https://wa.me/${websiteData.websiteWhatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="group relative inline-flex items-center gap-3 bg-white text-foreground px-6 py-3.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                          <MessageCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">{language === "en" ? "Chat with Us" : "Bizimle Yazışın"}</div>
                          <div className="font-semibold text-green-600">WhatsApp</div>
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
