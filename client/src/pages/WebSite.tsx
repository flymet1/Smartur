import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  Settings2, 
  FileText, 
  Image, 
  Phone, 
  Mail, 
  MapPin,
  Save,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Eye,
  Palette,
  Home,
  Info,
  MessageSquare,
  Shield,
  HelpCircle,
  Plus,
  Trash2,
  CreditCard,
  LayoutPanelTop,
  PenSquare,
  Layers,
  Star,
  ChevronDown,
  Type,
  Settings
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { BlogContent } from "@/pages/Blog";
import { HomepageSectionsManager } from "@/components/HomepageSectionsManager";
import { ImageUpload } from "@/components/ImageUpload";

interface WebsiteSettings {
  websiteDomain: string | null;
  websiteEnabled: boolean;
  websiteName: string | null;
  websiteLogo: string | null;
  websiteFavicon: string | null;
  websiteHeroImage: string | null;
  websiteHeroTitle: string | null;
  websiteHeroSubtitle: string | null;
  websitePrimaryColor: string | null;
  websiteAccentColor: string | null;
  websiteMetaDescription: string | null;
  websiteMetaKeywords: string | null;
  websiteGoogleAnalyticsId: string | null;
  websiteWhatsappNumber: string | null;
  websiteSocialLinks: string | null;
  websiteLanguages: string | null;
  websiteContactPageTitle: string | null;
  websiteContactPageContent: string | null;
  websiteContactEmail: string | null;
  websiteContactPhone: string | null;
  websiteContactAddress: string | null;
  websiteAboutPageTitle: string | null;
  websiteAboutPageContent: string | null;
  websiteCancellationPageTitle: string | null;
  websiteCancellationPageContent: string | null;
  websitePrivacyPageTitle: string | null;
  websitePrivacyPageContent: string | null;
  websiteTermsPageTitle: string | null;
  websiteTermsPageContent: string | null;
  websiteFaqPageTitle: string | null;
  websiteFaqPageContent: string | null;
  // Footer ve Header ayarları
  websiteDisplayName: string | null;
  websiteHeaderLogoUrl: string | null;
  websiteFooterCompanyDescription: string | null;
  websiteFooterPaymentImageUrl: string | null;
  websiteFooterCopyrightText: string | null;
  websiteFooterBackgroundColor: string | null;
  websiteFooterTextColor: string | null;
  websiteHeaderBackgroundColor: string | null;
  websiteHeaderTextColor: string | null;
  // Hero istatistikleri
  websiteHeroStats: string | null;
  // Ana sayfa bölüm ayarları
  websiteShowFeaturedActivities: boolean;
  // Yorum kartları
  websiteReviewCards: string | null;
  websiteReviewCardsEnabled: boolean;
  websiteReviewCardsTitle: string | null;
  websiteReviewCardsTitleEn: string | null;
  // Hero Slider
  websiteHeroSliderEnabled: boolean;
  websiteHeroSliderPosition: string | null;
  websiteHeroSliderTitle: string | null;
  websiteHeroSliderTitleEn: string | null;
  websiteHeroSlides: string | null;
  websitePromoBoxes: string | null;
  // Banner Order
  websiteBannerOrder: string | null;
  // Slogan Banner
  websiteSloganBannerEnabled: boolean;
  websiteSloganBannerTitle: string | null;
  websiteSloganBannerTitleEn: string | null;
  websiteSloganBannerDescription: string | null;
  websiteSloganBannerDescriptionEn: string | null;
  websiteSloganBannerColor: string | null;
  // Promo Banner
  websitePromoBannerEnabled: boolean;
  websitePromoBannerTitle: string | null;
  websitePromoBannerTitleEn: string | null;
  websitePromoBannerDescription: string | null;
  websitePromoBannerDescriptionEn: string | null;
  websitePromoBannerButtonText: string | null;
  websitePromoBannerButtonTextEn: string | null;
  websitePromoBannerButtonUrl: string | null;
  websitePromoBannerImage: string | null;
  websitePromoBannerPriceText: string | null;
  websitePromoBannerPriceTextEn: string | null;
}

interface HeroStat {
  icon: string;
  value: string;
  label: string;
  labelEn: string;
}

interface ReviewCard {
  platform: string; // google, tripadvisor, trustpilot, facebook
  rating: string;
  reviewCount: string;
  url: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface HeroSlide {
  id: string;
  imageUrl: string;
  backgroundColor: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  buttonText: string;
  buttonTextEn: string;
  buttonUrl: string;
  badge?: string;
  badgeEn?: string;
  imageCaption?: string;
}

interface PromoBox {
  id: string;
  imageUrl: string;
  backgroundColor: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  buttonText: string;
  buttonTextEn: string;
  buttonUrl: string;
}

export default function WebSite() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [activePagesTab, setActivePagesTab] = useState("about");

  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ["/api/website-settings"],
  });

  const [formData, setFormData] = useState<Partial<WebsiteSettings>>({});
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [promoBoxes, setPromoBoxes] = useState<PromoBox[]>([]);

  const updateField = (field: keyof WebsiteSettings, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getValue = (field: keyof WebsiteSettings): string => {
    if (formData[field] !== undefined) {
      return String(formData[field] || "");
    }
    return String(settings?.[field] || "");
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WebsiteSettings>) => {
      const res = await apiRequest("PUT", "/api/website-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/website-settings"] });
      toast({
        title: "Kaydedildi",
        description: "Web sitesi ayarları başarıyla güncellendi.",
      });
      setFormData({});
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilemedi.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const dataToSave = { ...formData };
    if (faqItems.length > 0) {
      dataToSave.websiteFaqPageContent = JSON.stringify(faqItems);
    }
    saveMutation.mutate(dataToSave);
  };

  const parseSocialLinks = (): { facebook?: string; instagram?: string; twitter?: string; youtube?: string } => {
    try {
      return JSON.parse(getValue("websiteSocialLinks") || "{}");
    } catch {
      return {};
    }
  };

  const updateSocialLink = (platform: string, value: string) => {
    const current = parseSocialLinks();
    const updated = { ...current, [platform]: value };
    updateField("websiteSocialLinks", JSON.stringify(updated));
  };

  const parseFaqItems = (): FaqItem[] => {
    if (faqItems.length > 0) return faqItems;
    try {
      const content = getValue("websiteFaqPageContent");
      if (content) {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  };

  const addFaqItem = () => {
    setFaqItems([...parseFaqItems(), { question: "", answer: "" }]);
  };

  const updateFaqItem = (index: number, field: "question" | "answer", value: string) => {
    const items = [...parseFaqItems()];
    items[index] = { ...items[index], [field]: value };
    setFaqItems(items);
  };

  const removeFaqItem = (index: number) => {
    const items = parseFaqItems().filter((_, i) => i !== index);
    setFaqItems(items);
  };

  const socialLinks = parseSocialLinks();

  // Hero stats functions
  const parseHeroStats = (): HeroStat[] => {
    try {
      const stats = JSON.parse(getValue("websiteHeroStats") || "[]");
      return Array.isArray(stats) ? stats : [];
    } catch {
      return [];
    }
  };

  const addHeroStat = () => {
    const currentStats = heroStats.length > 0 ? heroStats : parseHeroStats();
    setHeroStats([...currentStats, { icon: "star", value: "", label: "", labelEn: "" }]);
  };

  const updateHeroStat = (index: number, field: keyof HeroStat, value: string) => {
    const currentStats = heroStats.length > 0 ? heroStats : parseHeroStats();
    const updated = [...currentStats];
    updated[index] = { ...updated[index], [field]: value };
    setHeroStats(updated);
  };

  const removeHeroStat = (index: number) => {
    const currentStats = heroStats.length > 0 ? heroStats : parseHeroStats();
    setHeroStats(currentStats.filter((_, i) => i !== index));
  };

  const saveHeroStats = () => {
    const dataToSave = {
      websiteHeroStats: JSON.stringify(heroStats.length > 0 ? heroStats : parseHeroStats())
    };
    saveMutation.mutate(dataToSave);
  };

  const displayedHeroStats = heroStats.length > 0 ? heroStats : parseHeroStats();

  // Review cards functions
  const parseReviewCards = (): ReviewCard[] => {
    try {
      const cards = JSON.parse(getValue("websiteReviewCards") || "[]");
      return Array.isArray(cards) ? cards : [];
    } catch {
      return [];
    }
  };

  const addReviewCard = () => {
    const currentCards = reviewCards.length > 0 ? reviewCards : parseReviewCards();
    setReviewCards([...currentCards, { platform: "google", rating: "5.0", reviewCount: "100+", url: "" }]);
  };

  const updateReviewCard = (index: number, field: keyof ReviewCard, value: string) => {
    const currentCards = reviewCards.length > 0 ? reviewCards : parseReviewCards();
    const updated = [...currentCards];
    updated[index] = { ...updated[index], [field]: value };
    setReviewCards(updated);
  };

  const removeReviewCard = (index: number) => {
    const currentCards = reviewCards.length > 0 ? reviewCards : parseReviewCards();
    setReviewCards(currentCards.filter((_, i) => i !== index));
  };

  const saveReviewCards = () => {
    const dataToSave = {
      websiteReviewCards: JSON.stringify(reviewCards.length > 0 ? reviewCards : parseReviewCards()),
      websiteReviewCardsEnabled: formData.websiteReviewCardsEnabled !== undefined 
        ? formData.websiteReviewCardsEnabled 
        : settings?.websiteReviewCardsEnabled ?? false,
      websiteReviewCardsTitle: formData.websiteReviewCardsTitle !== undefined
        ? formData.websiteReviewCardsTitle
        : settings?.websiteReviewCardsTitle ?? null,
      websiteReviewCardsTitleEn: formData.websiteReviewCardsTitleEn !== undefined
        ? formData.websiteReviewCardsTitleEn
        : settings?.websiteReviewCardsTitleEn ?? null,
    };
    saveMutation.mutate(dataToSave);
  };

  const displayedReviewCards = reviewCards.length > 0 ? reviewCards : parseReviewCards();

  const platformLabels: Record<string, string> = {
    google: "Google",
    tripadvisor: "TripAdvisor",
    trustpilot: "Trustpilot",
    facebook: "Facebook",
  };

  // Hero Slides functions
  const parseHeroSlides = (): HeroSlide[] => {
    try {
      const slides = JSON.parse(getValue("websiteHeroSlides") || "[]");
      return Array.isArray(slides) ? slides : [];
    } catch {
      return [];
    }
  };

  const addHeroSlide = () => {
    const currentSlides = heroSlides.length > 0 ? heroSlides : parseHeroSlides();
    const newSlide: HeroSlide = {
      id: crypto.randomUUID(),
      imageUrl: "",
      backgroundColor: "#3b82f6",
      title: "",
      titleEn: "",
      content: "",
      contentEn: "",
      buttonText: "",
      buttonTextEn: "",
      buttonUrl: "",
    };
    setHeroSlides([...currentSlides, newSlide]);
  };

  const updateHeroSlide = (index: number, field: keyof HeroSlide, value: string) => {
    const currentSlides = heroSlides.length > 0 ? heroSlides : parseHeroSlides();
    const updated = [...currentSlides];
    updated[index] = { ...updated[index], [field]: value };
    setHeroSlides(updated);
  };

  const removeHeroSlide = (index: number) => {
    const currentSlides = heroSlides.length > 0 ? heroSlides : parseHeroSlides();
    setHeroSlides(currentSlides.filter((_, i) => i !== index));
  };

  const displayedHeroSlides = heroSlides.length > 0 ? heroSlides : parseHeroSlides();

  // Promo Boxes functions
  const parsePromoBoxes = (): PromoBox[] => {
    try {
      const boxes = JSON.parse(getValue("websitePromoBoxes") || "[]");
      return Array.isArray(boxes) ? boxes : [];
    } catch {
      return [];
    }
  };

  const addPromoBox = () => {
    const currentBoxes = promoBoxes.length > 0 ? promoBoxes : parsePromoBoxes();
    if (currentBoxes.length >= 2) {
      toast({ title: "Maksimum 2 promosyon kutusu ekleyebilirsiniz", variant: "destructive" });
      return;
    }
    const newBox: PromoBox = {
      id: crypto.randomUUID(),
      imageUrl: "",
      backgroundColor: "#f97316",
      title: "",
      titleEn: "",
      content: "",
      contentEn: "",
      buttonText: "",
      buttonTextEn: "",
      buttonUrl: "",
    };
    setPromoBoxes([...currentBoxes, newBox]);
  };

  const updatePromoBox = (index: number, field: keyof PromoBox, value: string) => {
    const currentBoxes = promoBoxes.length > 0 ? promoBoxes : parsePromoBoxes();
    const updated = [...currentBoxes];
    updated[index] = { ...updated[index], [field]: value };
    setPromoBoxes(updated);
  };

  const removePromoBox = (index: number) => {
    const currentBoxes = promoBoxes.length > 0 ? promoBoxes : parsePromoBoxes();
    setPromoBoxes(currentBoxes.filter((_, i) => i !== index));
  };

  const displayedPromoBoxes = promoBoxes.length > 0 ? promoBoxes : parsePromoBoxes();

  // Save Hero Slider settings
  const saveHeroSlider = () => {
    const dataToSave = {
      websiteHeroSlides: JSON.stringify(heroSlides.length > 0 ? heroSlides : parseHeroSlides()),
      websitePromoBoxes: JSON.stringify(promoBoxes.length > 0 ? promoBoxes : parsePromoBoxes()),
      websiteHeroSliderEnabled: formData.websiteHeroSliderEnabled !== undefined 
        ? formData.websiteHeroSliderEnabled 
        : settings?.websiteHeroSliderEnabled ?? false,
      websiteHeroSliderPosition: formData.websiteHeroSliderPosition !== undefined
        ? formData.websiteHeroSliderPosition
        : settings?.websiteHeroSliderPosition ?? "after_hero",
      websiteHeroSliderTitle: formData.websiteHeroSliderTitle !== undefined
        ? formData.websiteHeroSliderTitle
        : settings?.websiteHeroSliderTitle ?? null,
      websiteHeroSliderTitleEn: formData.websiteHeroSliderTitleEn !== undefined
        ? formData.websiteHeroSliderTitleEn
        : settings?.websiteHeroSliderTitleEn ?? null,
    };
    saveMutation.mutate(dataToSave);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 pt-16 xl:pt-20 xl:ml-64">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  const isWebsiteActive = settings?.websiteDomain && settings?.websiteEnabled;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 pt-16 xl:pt-20 xl:ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <Globe className="h-7 w-7 text-primary" />
                Web Site Yönetimi
              </h1>
              <p className="text-muted-foreground mt-1">
                Müşterilerinize özel web sitenizi buradan yönetin
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isWebsiteActive ? (
                <Badge className="bg-green-600 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Pasif
                </Badge>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href="/website-preview" target="_blank" rel="noopener noreferrer" data-testid="link-preview-local">
                  <Eye className="h-4 w-4 mr-1" />
                  Önizle
                </a>
              </Button>
              {settings?.websiteDomain && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://${settings.websiteDomain}`} target="_blank" rel="noopener noreferrer" data-testid="link-preview-website">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Canlı
                  </a>
                </Button>
              )}
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="gap-1" data-testid="tab-general">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Genel</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1" data-testid="tab-appearance">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Görünüm</span>
              </TabsTrigger>
              <TabsTrigger value="pages" className="gap-1" data-testid="tab-pages">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Sayfalar</span>
              </TabsTrigger>
              <TabsTrigger value="footer" className="gap-1" data-testid="tab-footer">
                <LayoutPanelTop className="h-4 w-4" />
                <span className="hidden sm:inline">Footer</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Domain Ayarları
                  </CardTitle>
                  <CardDescription>
                    Web sitenizin yayınlanacağı alan adını belirleyin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="websiteDomain">Alan Adı (Domain)</Label>
                      <Input
                        id="websiteDomain"
                        placeholder="ornek.com veya rezervasyon.ornek.com"
                        value={getValue("websiteDomain")}
                        onChange={(e) => updateField("websiteDomain", e.target.value)}
                        data-testid="input-website-domain"
                      />
                      <p className="text-xs text-muted-foreground">
                        Alan adınızın DNS ayarlarından A kaydını sunucu IP adresine yönlendirin
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="websiteName">Site Adı</Label>
                      <Input
                        id="websiteName"
                        placeholder="Şirket Adınız"
                        value={getValue("websiteName")}
                        onChange={(e) => updateField("websiteName", e.target.value)}
                        data-testid="input-website-name"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Genel Ayarlar</CardTitle>
                  <CardDescription>Ana sayfa ve SEO ayarları</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="websiteHeroTitle">Hero Başlık</Label>
                      <Input
                        id="websiteHeroTitle"
                        placeholder="Unutulmaz Deneyimler Keşfedin"
                        value={getValue("websiteHeroTitle")}
                        onChange={(e) => updateField("websiteHeroTitle", e.target.value)}
                        data-testid="input-hero-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="websiteHeroSubtitle">Hero Alt Başlık</Label>
                      <Input
                        id="websiteHeroSubtitle"
                        placeholder="En iyi turlar ve aktiviteler"
                        value={getValue("websiteHeroSubtitle")}
                        onChange={(e) => updateField("websiteHeroSubtitle", e.target.value)}
                        data-testid="input-hero-subtitle"
                      />
                    </div>
                  </div>

                  <ImageUpload
                    value={getValue("websiteHeroImage")}
                    onChange={(url) => updateField("websiteHeroImage", url)}
                    label="Hero Görseli"
                    size="large"
                    recommendedSize="1920x1080px (16:9 oran)"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="websiteMetaDescription">Meta Açıklama (SEO)</Label>
                      <Textarea
                        id="websiteMetaDescription"
                        placeholder="Arama motorlarında görünecek açıklama..."
                        value={getValue("websiteMetaDescription")}
                        onChange={(e) => updateField("websiteMetaDescription", e.target.value)}
                        data-testid="input-meta-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="websiteMetaKeywords">Anahtar Kelimeler (SEO)</Label>
                      <Textarea
                        id="websiteMetaKeywords"
                        placeholder="tur, aktivite, tatil, rezervasyon"
                        value={getValue("websiteMetaKeywords")}
                        onChange={(e) => updateField("websiteMetaKeywords", e.target.value)}
                        data-testid="input-meta-keywords"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteGoogleAnalyticsId">Google Analytics ID</Label>
                    <Input
                      id="websiteGoogleAnalyticsId"
                      placeholder="G-XXXXXXXXXX"
                      value={getValue("websiteGoogleAnalyticsId")}
                      onChange={(e) => updateField("websiteGoogleAnalyticsId", e.target.value)}
                      data-testid="input-ga-id"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Görünüm Ayarları</CardTitle>
                  <CardDescription>Logo, renkler ve görseller</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUpload
                      value={getValue("websiteLogo")}
                      onChange={(url) => updateField("websiteLogo", url)}
                      label="Logo"
                      size="small"
                      recommendedSize="200x80px"
                    />
                    <ImageUpload
                      value={getValue("websiteFavicon")}
                      onChange={(url) => updateField("websiteFavicon", url)}
                      label="Favicon"
                      size="small"
                      recommendedSize="32x32px veya 64x64px"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="websitePrimaryColor">Ana Renk</Label>
                      <div className="flex gap-2">
                        <Input
                          id="websitePrimaryColor"
                          type="color"
                          value={getValue("websitePrimaryColor") || "#3b82f6"}
                          onChange={(e) => updateField("websitePrimaryColor", e.target.value)}
                          className="w-16 h-10 p-1"
                          data-testid="input-primary-color"
                        />
                        <Input
                          value={getValue("websitePrimaryColor") || "#3b82f6"}
                          onChange={(e) => updateField("websitePrimaryColor", e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="websiteAccentColor">Vurgu Rengi</Label>
                      <div className="flex gap-2">
                        <Input
                          id="websiteAccentColor"
                          type="color"
                          value={getValue("websiteAccentColor") || "#f59e0b"}
                          onChange={(e) => updateField("websiteAccentColor", e.target.value)}
                          className="w-16 h-10 p-1"
                          data-testid="input-accent-color"
                        />
                        <Input
                          value={getValue("websiteAccentColor") || "#f59e0b"}
                          onChange={(e) => updateField("websiteAccentColor", e.target.value)}
                          placeholder="#f59e0b"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Sosyal Medya Linkleri</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="socialFacebook" className="text-sm text-muted-foreground">Facebook</Label>
                        <Input
                          id="socialFacebook"
                          placeholder="https://facebook.com/sayfaniz"
                          value={socialLinks.facebook || ""}
                          onChange={(e) => updateSocialLink("facebook", e.target.value)}
                          data-testid="input-social-facebook"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="socialInstagram" className="text-sm text-muted-foreground">Instagram</Label>
                        <Input
                          id="socialInstagram"
                          placeholder="https://instagram.com/sayfaniz"
                          value={socialLinks.instagram || ""}
                          onChange={(e) => updateSocialLink("instagram", e.target.value)}
                          data-testid="input-social-instagram"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="socialTwitter" className="text-sm text-muted-foreground">Twitter/X</Label>
                        <Input
                          id="socialTwitter"
                          placeholder="https://twitter.com/sayfaniz"
                          value={socialLinks.twitter || ""}
                          onChange={(e) => updateSocialLink("twitter", e.target.value)}
                          data-testid="input-social-twitter"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="socialYoutube" className="text-sm text-muted-foreground">YouTube</Label>
                        <Input
                          id="socialYoutube"
                          placeholder="https://youtube.com/c/kanaliniz"
                          value={socialLinks.youtube || ""}
                          onChange={(e) => updateSocialLink("youtube", e.target.value)}
                          data-testid="input-social-youtube"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pages" className="mt-6">
              <Tabs value={activePagesTab} onValueChange={setActivePagesTab}>
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
                  <TabsTrigger value="about" className="gap-1" data-testid="tab-about">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">Hakkımızda</span>
                  </TabsTrigger>
                  <TabsTrigger value="sections" className="gap-1" data-testid="tab-sections">
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Anasayfa</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="gap-1" data-testid="tab-contact">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">İletişim</span>
                  </TabsTrigger>
                  <TabsTrigger value="policies" className="gap-1" data-testid="tab-policies">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Politikalar</span>
                  </TabsTrigger>
                  <TabsTrigger value="faq" className="gap-1" data-testid="tab-faq">
                    <HelpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">SSS</span>
                  </TabsTrigger>
                  <TabsTrigger value="blog" className="gap-1" data-testid="tab-blog">
                    <PenSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Blog</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="about">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hakkımızda Sayfası</CardTitle>
                      <CardDescription>Şirketiniz hakkında bilgi</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteAboutPageTitle">Sayfa Başlığı</Label>
                        <Input
                          id="websiteAboutPageTitle"
                          placeholder="Hakkımızda"
                          value={getValue("websiteAboutPageTitle")}
                          onChange={(e) => updateField("websiteAboutPageTitle", e.target.value)}
                          data-testid="input-about-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteAboutPageContent">İçerik (HTML destekler)</Label>
                        <Textarea
                          id="websiteAboutPageContent"
                          placeholder="Şirketiniz hakkında detaylı bilgi..."
                          value={getValue("websiteAboutPageContent")}
                          onChange={(e) => updateField("websiteAboutPageContent", e.target.value)}
                          rows={10}
                          data-testid="input-about-content"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contact">
                  <Card>
                    <CardHeader>
                      <CardTitle>İletişim Sayfası</CardTitle>
                      <CardDescription>İletişim bilgileri ve sayfa içeriği</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteContactPageTitle">Sayfa Başlığı</Label>
                        <Input
                          id="websiteContactPageTitle"
                          placeholder="İletişim"
                          value={getValue("websiteContactPageTitle")}
                          onChange={(e) => updateField("websiteContactPageTitle", e.target.value)}
                          data-testid="input-contact-title"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="websiteContactEmail" className="flex items-center gap-1">
                            <Mail className="h-4 w-4" /> E-posta
                          </Label>
                          <Input
                            id="websiteContactEmail"
                            type="email"
                            placeholder="info@example.com"
                            value={getValue("websiteContactEmail")}
                            onChange={(e) => updateField("websiteContactEmail", e.target.value)}
                            data-testid="input-contact-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="websiteContactPhone" className="flex items-center gap-1">
                            <Phone className="h-4 w-4" /> Telefon
                          </Label>
                          <Input
                            id="websiteContactPhone"
                            placeholder="+90 555 123 4567"
                            value={getValue("websiteContactPhone")}
                            onChange={(e) => updateField("websiteContactPhone", e.target.value)}
                            data-testid="input-contact-phone"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="websiteWhatsappNumber" className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" /> WhatsApp
                          </Label>
                          <Input
                            id="websiteWhatsappNumber"
                            placeholder="+905551234567"
                            value={getValue("websiteWhatsappNumber")}
                            onChange={(e) => updateField("websiteWhatsappNumber", e.target.value)}
                            data-testid="input-whatsapp-number"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteContactAddress" className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> Adres
                        </Label>
                        <Textarea
                          id="websiteContactAddress"
                          placeholder="Tam adres bilgisi..."
                          value={getValue("websiteContactAddress")}
                          onChange={(e) => updateField("websiteContactAddress", e.target.value)}
                          rows={2}
                          data-testid="input-contact-address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteContactPageContent">Ek Açıklama</Label>
                        <Textarea
                          id="websiteContactPageContent"
                          placeholder="İletişim sayfasında gösterilecek ek bilgi..."
                          value={getValue("websiteContactPageContent")}
                          onChange={(e) => updateField("websiteContactPageContent", e.target.value)}
                          rows={4}
                          data-testid="input-contact-content"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="policies" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>İptal ve İade Politikası</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteCancellationPageTitle">Sayfa Başlığı</Label>
                        <Input
                          id="websiteCancellationPageTitle"
                          placeholder="İptal ve İade Politikası"
                          value={getValue("websiteCancellationPageTitle")}
                          onChange={(e) => updateField("websiteCancellationPageTitle", e.target.value)}
                          data-testid="input-cancellation-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteCancellationPageContent">İçerik</Label>
                        <Textarea
                          id="websiteCancellationPageContent"
                          placeholder="İptal ve iade koşulları..."
                          value={getValue("websiteCancellationPageContent")}
                          onChange={(e) => updateField("websiteCancellationPageContent", e.target.value)}
                          rows={8}
                          data-testid="input-cancellation-content"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Gizlilik Politikası</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="websitePrivacyPageTitle">Sayfa Başlığı</Label>
                        <Input
                          id="websitePrivacyPageTitle"
                          placeholder="Gizlilik Politikası"
                          value={getValue("websitePrivacyPageTitle")}
                          onChange={(e) => updateField("websitePrivacyPageTitle", e.target.value)}
                          data-testid="input-privacy-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websitePrivacyPageContent">İçerik</Label>
                        <Textarea
                          id="websitePrivacyPageContent"
                          placeholder="Gizlilik politikası metni..."
                          value={getValue("websitePrivacyPageContent")}
                          onChange={(e) => updateField("websitePrivacyPageContent", e.target.value)}
                          rows={8}
                          data-testid="input-privacy-content"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Kullanım Koşulları</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteTermsPageTitle">Sayfa Başlığı</Label>
                        <Input
                          id="websiteTermsPageTitle"
                          placeholder="Kullanım Koşulları"
                          value={getValue("websiteTermsPageTitle")}
                          onChange={(e) => updateField("websiteTermsPageTitle", e.target.value)}
                          data-testid="input-terms-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteTermsPageContent">İçerik</Label>
                        <Textarea
                          id="websiteTermsPageContent"
                          placeholder="Kullanım koşulları metni..."
                          value={getValue("websiteTermsPageContent")}
                          onChange={(e) => updateField("websiteTermsPageContent", e.target.value)}
                          rows={8}
                          data-testid="input-terms-content"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="faq">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Sıkça Sorulan Sorular</CardTitle>
                        <CardDescription>Müşterilerinizin sık sorduğu sorular</CardDescription>
                      </div>
                      <Button onClick={addFaqItem} size="sm" data-testid="button-add-faq">
                        <Plus className="h-4 w-4 mr-1" />
                        Soru Ekle
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteFaqPageTitle">Sayfa Başlığı</Label>
                        <Input
                          id="websiteFaqPageTitle"
                          placeholder="Sıkça Sorulan Sorular"
                          value={getValue("websiteFaqPageTitle")}
                          onChange={(e) => updateField("websiteFaqPageTitle", e.target.value)}
                          data-testid="input-faq-title"
                        />
                      </div>

                      {parseFaqItems().length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Henüz soru eklenmemiş</p>
                          <p className="text-sm">Yukarıdaki "Soru Ekle" butonuna tıklayarak başlayın</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {parseFaqItems().map((item, index) => (
                            <Card key={index} className="bg-muted/30">
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 space-y-2">
                                    <Label>Soru {index + 1}</Label>
                                    <Input
                                      placeholder="Soru metni..."
                                      value={item.question}
                                      onChange={(e) => updateFaqItem(index, "question", e.target.value)}
                                      data-testid={`input-faq-question-${index}`}
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFaqItem(index)}
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`button-remove-faq-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <Label>Cevap</Label>
                                  <Textarea
                                    placeholder="Cevap metni..."
                                    value={item.answer}
                                    onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
                                    rows={3}
                                    data-testid={`input-faq-answer-${index}`}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="blog">
                  <BlogContent />
                </TabsContent>

                <TabsContent value="sections">
                  <div className="space-y-6">
                    {/* Anasayfa Bölümleri */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Anasayfa Bölümleri</CardTitle>
                        <CardDescription>
                          Anasayfada gösterilecek aktivite kategorilerini yönetin
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <HomepageSectionsManager />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings2 className="h-5 w-5" />
                          Hero İstatistikleri
                        </CardTitle>
                        <CardDescription>
                          Slider bölümünde gösterilecek istatistikleri düzenleyin (ör: 3+ Aktiviteler, 7/24 Destek)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {displayedHeroStats.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            Henüz istatistik eklenmemiş. Varsayılan istatistikler gösterilecektir.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {displayedHeroStats.map((stat, index) => (
                              <Card key={index} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                  <div className="space-y-2">
                                    <Label>İkon</Label>
                                    <Input
                                      placeholder="star, clock, users..."
                                      value={stat.icon}
                                      onChange={(e) => updateHeroStat(index, "icon", e.target.value)}
                                      data-testid={`input-hero-stat-icon-${index}`}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Değer</Label>
                                    <Input
                                      placeholder="3+, 7/24, 10K+"
                                      value={stat.value}
                                      onChange={(e) => updateHeroStat(index, "value", e.target.value)}
                                      data-testid={`input-hero-stat-value-${index}`}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Etiket (TR)</Label>
                                    <Input
                                      placeholder="Aktiviteler"
                                      value={stat.label}
                                      onChange={(e) => updateHeroStat(index, "label", e.target.value)}
                                      data-testid={`input-hero-stat-label-${index}`}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Etiket (EN)</Label>
                                    <Input
                                      placeholder="Activities"
                                      value={stat.labelEn}
                                      onChange={(e) => updateHeroStat(index, "labelEn", e.target.value)}
                                      data-testid={`input-hero-stat-label-en-${index}`}
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeHeroStat(index)}
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-remove-hero-stat-${index}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={addHeroStat}
                            className="gap-1"
                            data-testid="button-add-hero-stat"
                          >
                            <Plus className="h-4 w-4" />
                            İstatistik Ekle
                          </Button>
                          {displayedHeroStats.length > 0 && (
                            <Button
                              onClick={saveHeroStats}
                              disabled={saveMutation.isPending}
                              className="gap-1"
                              data-testid="button-save-hero-stats"
                            >
                              <Save className="h-4 w-4" />
                              Kaydet
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hero Slider ve Promosyon Kutuları */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Image className="h-5 w-5" />
                          Hero Slider & Promosyon Kutuları
                        </CardTitle>
                        <CardDescription>
                          Anasayfada hero bölümünün altında gösterilecek slider ve promosyon kutuları
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Hero Slider Göster</Label>
                            <p className="text-xs text-muted-foreground">Ana sayfada hero altında slider bölümünü göster</p>
                          </div>
                          <Switch
                            checked={formData.websiteHeroSliderEnabled !== undefined 
                              ? formData.websiteHeroSliderEnabled 
                              : settings?.websiteHeroSliderEnabled ?? false}
                            onCheckedChange={(checked) => updateField("websiteHeroSliderEnabled", checked)}
                            data-testid="switch-hero-slider-enabled"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Slider Konumu</Label>
                          <Select
                            value={formData.websiteHeroSliderPosition !== undefined 
                              ? (formData.websiteHeroSliderPosition || "after_hero")
                              : (settings?.websiteHeroSliderPosition || "after_hero")}
                            onValueChange={(value) => updateField("websiteHeroSliderPosition", value)}
                          >
                            <SelectTrigger data-testid="select-hero-slider-position">
                              <SelectValue placeholder="Konum seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="after_hero">Hero altında</SelectItem>
                              <SelectItem value="before_featured">Popüler aktiviteler/turlar üstünde</SelectItem>
                              <SelectItem value="after_featured">Popüler aktiviteler/turlar altında</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Slider bölümünün ana sayfadaki yerini belirleyin</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Bölüm Başlığı (TR)</Label>
                            <Input
                              placeholder="Öne Çıkan Teklifler"
                              value={getValue("websiteHeroSliderTitle")}
                              onChange={(e) => updateField("websiteHeroSliderTitle", e.target.value)}
                              data-testid="input-hero-slider-title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bölüm Başlığı (EN)</Label>
                            <Input
                              placeholder="Featured Offers"
                              value={getValue("websiteHeroSliderTitleEn")}
                              onChange={(e) => updateField("websiteHeroSliderTitleEn", e.target.value)}
                              data-testid="input-hero-slider-title-en"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Slider Slaytları</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addHeroSlide}
                              className="gap-1"
                              data-testid="button-add-hero-slide"
                            >
                              <Plus className="h-4 w-4" />
                              Slayt Ekle
                            </Button>
                          </div>

                          {displayedHeroSlides.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                              Henüz slayt eklenmemiş
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {displayedHeroSlides.map((slide, index) => (
                                <Collapsible key={slide.id || index} className="border rounded-lg">
                                  <div className="flex items-center justify-between p-3 bg-muted/30">
                                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:underline">
                                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                                      <span className="text-sm font-medium">
                                        Slayt {index + 1}{slide.title ? `: ${slide.title.substring(0, 30)}${slide.title.length > 30 ? '...' : ''}` : ''}
                                      </span>
                                    </CollapsibleTrigger>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeHeroSlide(index)}
                                      className="text-destructive hover:text-destructive h-8 w-8"
                                      data-testid={`button-remove-slide-${index}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <CollapsibleContent className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <ImageUpload
                                        label="Slide Görseli"
                                        value={slide.imageUrl}
                                        onChange={(url) => updateHeroSlide(index, "imageUrl", url)}
                                        size="large"
                                        recommendedSize="1920x600px"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Arka Plan Rengi</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          type="color"
                                          value={slide.backgroundColor || "#3b82f6"}
                                          onChange={(e) => updateHeroSlide(index, "backgroundColor", e.target.value)}
                                          className="w-12 h-9 p-1 cursor-pointer"
                                          data-testid={`input-slide-color-${index}`}
                                        />
                                        <Input
                                          placeholder="#3b82f6"
                                          value={slide.backgroundColor}
                                          onChange={(e) => updateHeroSlide(index, "backgroundColor", e.target.value)}
                                          className="flex-1"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Başlık (TR)</Label>
                                      <Input
                                        placeholder="Özel Teklif"
                                        value={slide.title}
                                        onChange={(e) => updateHeroSlide(index, "title", e.target.value)}
                                        data-testid={`input-slide-title-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Başlık (EN)</Label>
                                      <Input
                                        placeholder="Special Offer"
                                        value={slide.titleEn}
                                        onChange={(e) => updateHeroSlide(index, "titleEn", e.target.value)}
                                        data-testid={`input-slide-title-en-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="text-xs">İçerik (TR)</Label>
                                      <Textarea
                                        placeholder="Açıklama metni..."
                                        value={slide.content}
                                        onChange={(e) => updateHeroSlide(index, "content", e.target.value)}
                                        rows={2}
                                        data-testid={`input-slide-content-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="text-xs">İçerik (EN)</Label>
                                      <Textarea
                                        placeholder="Description text..."
                                        value={slide.contentEn}
                                        onChange={(e) => updateHeroSlide(index, "contentEn", e.target.value)}
                                        rows={2}
                                        data-testid={`input-slide-content-en-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Buton Metni (TR)</Label>
                                      <Input
                                        placeholder="Şimdi Rezerve Et"
                                        value={slide.buttonText}
                                        onChange={(e) => updateHeroSlide(index, "buttonText", e.target.value)}
                                        data-testid={`input-slide-button-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Buton Metni (EN)</Label>
                                      <Input
                                        placeholder="Book Now"
                                        value={slide.buttonTextEn}
                                        onChange={(e) => updateHeroSlide(index, "buttonTextEn", e.target.value)}
                                        data-testid={`input-slide-button-en-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="text-xs">Buton URL</Label>
                                      <Input
                                        placeholder="/aktiviteler veya https://..."
                                        value={slide.buttonUrl}
                                        onChange={(e) => updateHeroSlide(index, "buttonUrl", e.target.value)}
                                        data-testid={`input-slide-url-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Etiket/Badge (TR) - Opsiyonel</Label>
                                      <Input
                                        placeholder="Son Gün 31 Ocak"
                                        value={slide.badge || ""}
                                        onChange={(e) => updateHeroSlide(index, "badge", e.target.value)}
                                        data-testid={`input-slide-badge-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Etiket/Badge (EN) - Opsiyonel</Label>
                                      <Input
                                        placeholder="Last Day Jan 31"
                                        value={slide.badgeEn || ""}
                                        onChange={(e) => updateHeroSlide(index, "badgeEn", e.target.value)}
                                        data-testid={`input-slide-badge-en-${index}`}
                                      />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="text-xs">Görsel Alt Yazısı - Opsiyonel</Label>
                                      <Input
                                        placeholder="Görsel üzerinde alt kısımda gösterilecek açıklama..."
                                        value={slide.imageCaption || ""}
                                        onChange={(e) => updateHeroSlide(index, "imageCaption", e.target.value)}
                                        data-testid={`input-slide-caption-${index}`}
                                      />
                                    </div>
                                    <div className="md:col-span-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                      <strong>İpucu:</strong> Başlık ve içerik alanlarında kalın yazı için <code>&lt;strong&gt;metin&lt;/strong&gt;</code> veya <code>&lt;b&gt;metin&lt;/b&gt;</code> kullanabilirsiniz.
                                    </div>
                                  </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Promosyon Kutuları</h4>
                              <p className="text-xs text-muted-foreground">Slider'ın sağında sabit duran 2 kutu (maksimum)</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addPromoBox}
                              disabled={displayedPromoBoxes.length >= 2}
                              className="gap-1"
                              data-testid="button-add-promo-box"
                            >
                              <Plus className="h-4 w-4" />
                              Kutu Ekle
                            </Button>
                          </div>

                          {displayedPromoBoxes.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                              Henüz promosyon kutusu eklenmemiş
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {displayedPromoBoxes.map((box, index) => (
                                <Collapsible key={box.id || index} defaultOpen={false}>
                                  <Card className="overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                                          <div className="flex items-center gap-2">
                                            {box.imageUrl && (
                                              <img src={box.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                            )}
                                            <div>
                                              <span className="text-sm font-medium">Kutu {index + 1}</span>
                                              {box.title && (
                                                <span className="text-xs text-muted-foreground ml-2">- {box.title}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => { e.stopPropagation(); removePromoBox(index); }}
                                          className="text-destructive hover:text-destructive h-8 w-8"
                                          data-testid={`button-remove-promo-${index}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="p-4 pt-0 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                          <div className="space-y-2">
                                            <ImageUpload
                                              label="Promo Görseli"
                                              value={box.imageUrl}
                                              onChange={(url) => updatePromoBox(index, "imageUrl", url)}
                                              size="large"
                                              recommendedSize="400x300px"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs">Arka Plan Rengi</Label>
                                            <div className="flex gap-2">
                                              <Input
                                                type="color"
                                                value={box.backgroundColor || "#f97316"}
                                                onChange={(e) => updatePromoBox(index, "backgroundColor", e.target.value)}
                                                className="w-12 h-9 p-1 cursor-pointer"
                                                data-testid={`input-promo-color-${index}`}
                                              />
                                              <Input
                                                placeholder="#f97316"
                                                value={box.backgroundColor}
                                                onChange={(e) => updatePromoBox(index, "backgroundColor", e.target.value)}
                                                className="flex-1"
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs">Başlık</Label>
                                            <Input
                                              placeholder="Özel Fırsat"
                                              value={box.title}
                                              onChange={(e) => updatePromoBox(index, "title", e.target.value)}
                                              data-testid={`input-promo-title-${index}`}
                                            />
                                          </div>
                                          <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs">İçerik</Label>
                                            <Textarea
                                              placeholder="Açıklama..."
                                              value={box.content}
                                              onChange={(e) => updatePromoBox(index, "content", e.target.value)}
                                              rows={2}
                                              data-testid={`input-promo-content-${index}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs">Buton Metni</Label>
                                            <Input
                                              placeholder="İncele"
                                              value={box.buttonText}
                                              onChange={(e) => updatePromoBox(index, "buttonText", e.target.value)}
                                              data-testid={`input-promo-button-${index}`}
                                            />
                                          </div>
                                          <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs">Buton URL</Label>
                                            <Input
                                              placeholder="/aktiviteler veya https://..."
                                              value={box.buttonUrl}
                                              onChange={(e) => updatePromoBox(index, "buttonUrl", e.target.value)}
                                              data-testid={`input-promo-url-${index}`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </Card>
                                </Collapsible>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={saveHeroSlider}
                            disabled={saveMutation.isPending}
                            className="gap-1"
                            data-testid="button-save-hero-slider"
                          >
                            <Save className="h-4 w-4" />
                            Hero Slider Kaydet
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Slogan Banner Ayarları */}
                    <Collapsible defaultOpen={false}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <Type className="h-5 w-5" />
                                  Slogan Banner
                                </CardTitle>
                                <CardDescription>
                                  Anasayfada gradient arka planlı slogan alanı
                                </CardDescription>
                              </div>
                              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                              <div className="space-y-0.5">
                                <Label>Slogan Banner Göster</Label>
                                <p className="text-sm text-muted-foreground">
                                  Gradient arka planlı slogan alanını göster
                                </p>
                              </div>
                              <Switch
                                checked={formData.websiteSloganBannerEnabled !== undefined 
                                  ? formData.websiteSloganBannerEnabled 
                                  : settings?.websiteSloganBannerEnabled ?? false}
                                onCheckedChange={(checked) => updateField("websiteSloganBannerEnabled", checked)}
                                data-testid="switch-slogan-banner"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Banner Rengi</Label>
                              <Select
                                value={getValue("websiteSloganBannerColor") || "cyan_blue"}
                                onValueChange={(value) => updateField("websiteSloganBannerColor", value)}
                              >
                                <SelectTrigger data-testid="select-slogan-color">
                                  <SelectValue placeholder="Renk seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cyan_blue">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-4 rounded bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
                                      Mavi / Cyan
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="purple_pink">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-4 rounded bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500" />
                                      Mor / Pembe
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="green_teal">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-4 rounded bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
                                      Yeşil / Teal
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="orange_red">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-4 rounded bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" />
                                      Turuncu / Kırmızı
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-4">
                              <div className="space-y-2">
                                <Label>Slogan Başlığı</Label>
                                <Textarea
                                  placeholder="Fethiye'nin en iyi firması ile gökyüzüne dokunmaya hazır mısınız?"
                                  value={getValue("websiteSloganBannerTitle")}
                                  onChange={(e) => updateField("websiteSloganBannerTitle", e.target.value)}
                                  rows={2}
                                  data-testid="input-slogan-title"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Slogan Açıklaması</Label>
                                <Textarea
                                  placeholder="Dünya'nın farklı yerlerinden gelen konuklara..."
                                  value={getValue("websiteSloganBannerDescription")}
                                  onChange={(e) => updateField("websiteSloganBannerDescription", e.target.value)}
                                  rows={3}
                                  data-testid="input-slogan-description"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={() => saveMutation.mutate({
                                  websiteSloganBannerEnabled: formData.websiteSloganBannerEnabled ?? settings?.websiteSloganBannerEnabled ?? false,
                                  websiteSloganBannerTitle: formData.websiteSloganBannerTitle ?? settings?.websiteSloganBannerTitle ?? null,
                                  websiteSloganBannerDescription: formData.websiteSloganBannerDescription ?? settings?.websiteSloganBannerDescription ?? null,
                                  websiteSloganBannerColor: formData.websiteSloganBannerColor ?? settings?.websiteSloganBannerColor ?? "cyan_blue",
                                })}
                                disabled={saveMutation.isPending}
                                className="gap-1"
                                data-testid="button-save-slogan-banner"
                              >
                                <Save className="h-4 w-4" />
                                Slogan Kaydet
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* Promo CTA Banner Ayarları */}
                    <Collapsible defaultOpen={false}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <Image className="h-5 w-5" />
                                  Promosyon Banner
                                </CardTitle>
                                <CardDescription>
                                  Anasayfada mavi gradient arka planlı görsel + metin banner alanı
                                </CardDescription>
                              </div>
                              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                              <div className="space-y-0.5">
                                <Label>Promosyon Banner Göster</Label>
                                <p className="text-sm text-muted-foreground">
                                  Mavi gradient arka planlı CTA banner'ı göster
                                </p>
                              </div>
                              <Switch
                                checked={formData.websitePromoBannerEnabled !== undefined 
                                  ? formData.websitePromoBannerEnabled 
                                  : settings?.websitePromoBannerEnabled ?? false}
                                onCheckedChange={(checked) => updateField("websitePromoBannerEnabled", checked)}
                                data-testid="switch-promo-banner"
                              />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2 md:col-span-2">
                                <Label>Başlık</Label>
                                <Input
                                  placeholder="Türkiye'nin Her Noktasını Keşfedin"
                                  value={getValue("websitePromoBannerTitle")}
                                  onChange={(e) => updateField("websitePromoBannerTitle", e.target.value)}
                                  data-testid="input-promo-banner-title"
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Açıklama</Label>
                                <Textarea
                                  placeholder="Eşsiz deneyimler ve unutulmaz anılar için..."
                                  value={getValue("websitePromoBannerDescription")}
                                  onChange={(e) => updateField("websitePromoBannerDescription", e.target.value)}
                                  rows={2}
                                  data-testid="input-promo-banner-description"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Buton Metni</Label>
                                <Input
                                  placeholder="Hemen İncele"
                                  value={getValue("websitePromoBannerButtonText")}
                                  onChange={(e) => updateField("websitePromoBannerButtonText", e.target.value)}
                                  data-testid="input-promo-banner-button"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Buton URL</Label>
                                <Input
                                  placeholder="/aktiviteler"
                                  value={getValue("websitePromoBannerButtonUrl")}
                                  onChange={(e) => updateField("websitePromoBannerButtonUrl", e.target.value)}
                                  data-testid="input-promo-banner-url"
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Fiyat Etiketi</Label>
                                <Input
                                  placeholder="699,99 TL"
                                  value={getValue("websitePromoBannerPriceText")}
                                  onChange={(e) => updateField("websitePromoBannerPriceText", e.target.value)}
                                  data-testid="input-promo-banner-price"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Sağ üst köşede görünecek fiyat etiketi (isteğe bağlı)
                                </p>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Banner Görseli</Label>
                                <ImageUpload
                                  value={getValue("websitePromoBannerImage") || ""}
                                  onChange={(url) => updateField("websitePromoBannerImage", url)}
                                  label="Banner Görseli"
                                  size="large"
                                  placeholder="Banner görseli yükleyin"
                                  recommendedSize="1200x400px (maks. 200KB, PNG/WebP)"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Arka plan görseli olarak görünecek (isteğe bağlı)
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={() => saveMutation.mutate({
                                  websitePromoBannerEnabled: formData.websitePromoBannerEnabled ?? settings?.websitePromoBannerEnabled ?? false,
                                  websitePromoBannerTitle: formData.websitePromoBannerTitle ?? settings?.websitePromoBannerTitle ?? null,
                                  websitePromoBannerDescription: formData.websitePromoBannerDescription ?? settings?.websitePromoBannerDescription ?? null,
                                  websitePromoBannerButtonText: formData.websitePromoBannerButtonText ?? settings?.websitePromoBannerButtonText ?? null,
                                  websitePromoBannerButtonUrl: formData.websitePromoBannerButtonUrl ?? settings?.websitePromoBannerButtonUrl ?? null,
                                  websitePromoBannerImage: formData.websitePromoBannerImage ?? settings?.websitePromoBannerImage ?? null,
                                  websitePromoBannerPriceText: formData.websitePromoBannerPriceText ?? settings?.websitePromoBannerPriceText ?? null,
                                })}
                                disabled={saveMutation.isPending}
                                className="gap-1"
                                data-testid="button-save-promo-banner"
                              >
                                <Save className="h-4 w-4" />
                                Promo Banner Kaydet
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* Yorum Kartları */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Yorum Kartları (Dış Platformlar)
                        </CardTitle>
                        <CardDescription>
                          Google, TripAdvisor, Trustpilot gibi dış platformlardaki yorumlarınıza link verin
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Yorum Kartları Göster</Label>
                            <p className="text-xs text-muted-foreground">Ana sayfada yorum kartları bölümünü göster</p>
                          </div>
                          <Switch
                            checked={formData.websiteReviewCardsEnabled !== undefined 
                              ? formData.websiteReviewCardsEnabled 
                              : settings?.websiteReviewCardsEnabled ?? false}
                            onCheckedChange={(checked) => updateField("websiteReviewCardsEnabled", checked)}
                            data-testid="switch-review-cards-enabled-bottom"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Bölüm Başlığı</Label>
                          <Input
                            placeholder="Müşterilerimiz Bizi Öneriyor"
                            value={getValue("websiteReviewCardsTitle")}
                            onChange={(e) => updateField("websiteReviewCardsTitle", e.target.value)}
                            data-testid="input-review-cards-title-bottom"
                          />
                        </div>

                        {displayedReviewCards.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                            Henüz yorum kartı eklenmemiş
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {displayedReviewCards.map((card, index) => (
                              <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Platform</Label>
                                    <Select
                                      value={card.platform}
                                      onValueChange={(value) => updateReviewCard(index, "platform", value)}
                                    >
                                      <SelectTrigger data-testid={`select-review-platform-bottom-${index}`}>
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
                                      onChange={(e) => updateReviewCard(index, "rating", e.target.value)}
                                      data-testid={`input-review-rating-bottom-${index}`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Yorum Sayısı</Label>
                                    <Input
                                      placeholder="1200+"
                                      value={card.reviewCount}
                                      onChange={(e) => updateReviewCard(index, "reviewCount", e.target.value)}
                                      data-testid={`input-review-count-bottom-${index}`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">URL</Label>
                                    <Input
                                      placeholder="https://g.page/..."
                                      value={card.url}
                                      onChange={(e) => updateReviewCard(index, "url", e.target.value)}
                                      data-testid={`input-review-url-bottom-${index}`}
                                    />
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeReviewCard(index)}
                                  className="shrink-0 text-destructive hover:text-destructive"
                                  data-testid={`button-remove-review-bottom-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={addReviewCard}
                            className="gap-1"
                            data-testid="button-add-review-card-bottom"
                          >
                            <Plus className="h-4 w-4" />
                            Yorum Kartı Ekle
                          </Button>
                          {(displayedReviewCards.length > 0 || formData.websiteReviewCardsEnabled !== undefined || formData.websiteReviewCardsTitle !== undefined) && (
                            <Button
                              onClick={saveReviewCards}
                              disabled={saveMutation.isPending}
                              className="gap-1"
                              data-testid="button-save-review-cards-bottom"
                            >
                              <Save className="h-4 w-4" />
                              Kaydet
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="footer" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutPanelTop className="h-5 w-5" />
                    Footer & Header Ayarları
                  </CardTitle>
                  <CardDescription>Alt bilgi alanı ve renk ayarları</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="websiteDisplayName">Görüntü Adı (Top Bar)</Label>
                    <Input
                      id="websiteDisplayName"
                      placeholder="Top bar'da görünecek acenta adı (boş bırakılırsa şirket adı kullanılır)"
                      value={getValue("websiteDisplayName")}
                      onChange={(e) => updateField("websiteDisplayName", e.target.value)}
                      data-testid="input-display-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sadece header üst çubuğunda (top bar) görünecek özel isim
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Header Logo (Menü)</Label>
                    <ImageUpload
                      value={getValue("websiteHeaderLogoUrl")}
                      onChange={(value) => updateField("websiteHeaderLogoUrl", value)}
                      label="Header Logo"
                      size="large"
                      recommendedSize="200x60px"
                    />
                    <p className="text-xs text-muted-foreground">
                      Menü alanında görünecek logo. Yüklenmezse varsayılan ikon kullanılır.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteFooterCompanyDescription">Footer Şirket Açıklaması</Label>
                    <Textarea
                      id="websiteFooterCompanyDescription"
                      placeholder="Footer'da görünecek kısa şirket açıklaması..."
                      value={getValue("websiteFooterCompanyDescription")}
                      onChange={(e) => updateField("websiteFooterCompanyDescription", e.target.value)}
                      rows={3}
                      data-testid="input-footer-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteFooterCopyrightText">Telif Hakkı Metni</Label>
                    <Input
                      id="websiteFooterCopyrightText"
                      placeholder="© 2025 Şirket Adı. Tüm hakları saklıdır."
                      value={getValue("websiteFooterCopyrightText")}
                      onChange={(e) => updateField("websiteFooterCopyrightText", e.target.value)}
                      data-testid="input-footer-copyright"
                    />
                    <p className="text-xs text-muted-foreground">
                      Boş bırakırsanız otomatik olarak yıl ve şirket adı kullanılır
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteFooterPaymentImageUrl" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Ödeme Yöntemleri Görseli (PNG)
                    </Label>
                    <Input
                      id="websiteFooterPaymentImageUrl"
                      placeholder="https://example.com/payment-methods.png"
                      value={getValue("websiteFooterPaymentImageUrl")}
                      onChange={(e) => updateField("websiteFooterPaymentImageUrl", e.target.value)}
                      data-testid="input-footer-payment-image"
                    />
                    <p className="text-xs text-muted-foreground">
                      Visa, Mastercard, PayPal vb. ödeme yöntemlerini gösteren görsel URL'si
                    </p>
                    {getValue("websiteFooterPaymentImageUrl") && (
                      <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                        <img
                          src={getValue("websiteFooterPaymentImageUrl")}
                          alt="Ödeme yöntemleri önizleme"
                          className="h-8 w-auto"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Footer Renkleri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteFooterBackgroundColor">Footer Arka Plan Rengi</Label>
                        <div className="flex gap-2">
                          <Input
                            id="websiteFooterBackgroundColor"
                            type="color"
                            value={getValue("websiteFooterBackgroundColor") || "#1f2937"}
                            onChange={(e) => updateField("websiteFooterBackgroundColor", e.target.value)}
                            className="w-16 h-10 p-1"
                            data-testid="input-footer-bg-color"
                          />
                          <Input
                            value={getValue("websiteFooterBackgroundColor")}
                            onChange={(e) => updateField("websiteFooterBackgroundColor", e.target.value)}
                            placeholder="#1f2937"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteFooterTextColor">Footer Metin Rengi</Label>
                        <div className="flex gap-2">
                          <Input
                            id="websiteFooterTextColor"
                            type="color"
                            value={getValue("websiteFooterTextColor") || "#ffffff"}
                            onChange={(e) => updateField("websiteFooterTextColor", e.target.value)}
                            className="w-16 h-10 p-1"
                            data-testid="input-footer-text-color"
                          />
                          <Input
                            value={getValue("websiteFooterTextColor")}
                            onChange={(e) => updateField("websiteFooterTextColor", e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Header Renkleri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteHeaderBackgroundColor">Header Üst Bar Arka Plan</Label>
                        <div className="flex gap-2">
                          <Input
                            id="websiteHeaderBackgroundColor"
                            type="color"
                            value={getValue("websiteHeaderBackgroundColor") || "#3b82f6"}
                            onChange={(e) => updateField("websiteHeaderBackgroundColor", e.target.value)}
                            className="w-16 h-10 p-1"
                            data-testid="input-header-bg-color"
                          />
                          <Input
                            value={getValue("websiteHeaderBackgroundColor")}
                            onChange={(e) => updateField("websiteHeaderBackgroundColor", e.target.value)}
                            placeholder="#3b82f6"
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Telefon, e-posta ve sosyal medya linklerinin bulunduğu üst bar
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteHeaderTextColor">Header Üst Bar Metin Rengi</Label>
                        <div className="flex gap-2">
                          <Input
                            id="websiteHeaderTextColor"
                            type="color"
                            value={getValue("websiteHeaderTextColor") || "#ffffff"}
                            onChange={(e) => updateField("websiteHeaderTextColor", e.target.value)}
                            className="w-16 h-10 p-1"
                            data-testid="input-header-text-color"
                          />
                          <Input
                            value={getValue("websiteHeaderTextColor")}
                            onChange={(e) => updateField("websiteHeaderTextColor", e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  );
}
