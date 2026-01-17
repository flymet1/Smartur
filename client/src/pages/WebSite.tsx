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
  Trash2
} from "lucide-react";

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
}

interface FaqItem {
  question: string;
  answer: string;
}

export default function WebSite() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ["/api/website-settings"],
  });

  const [formData, setFormData] = useState<Partial<WebsiteSettings>>({});
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);

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
              {settings?.websiteDomain && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://${settings.websiteDomain}`} target="_blank" rel="noopener noreferrer" data-testid="link-preview-website">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Önizle
                  </a>
                </Button>
              )}
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>

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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
              <TabsTrigger value="general" className="gap-1" data-testid="tab-general">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Genel</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1" data-testid="tab-appearance">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Görünüm</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="gap-1" data-testid="tab-about">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">Hakkımızda</span>
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
            </TabsList>

            <TabsContent value="general" className="mt-6">
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

                  <div className="space-y-2">
                    <Label htmlFor="websiteHeroImage">Hero Görsel URL</Label>
                    <Input
                      id="websiteHeroImage"
                      placeholder="https://example.com/hero.jpg"
                      value={getValue("websiteHeroImage")}
                      onChange={(e) => updateField("websiteHeroImage", e.target.value)}
                      data-testid="input-hero-image"
                    />
                    {getValue("websiteHeroImage") && (
                      <div className="mt-2 rounded-lg border overflow-hidden">
                        <img
                          src={getValue("websiteHeroImage")}
                          alt="Hero önizleme"
                          className="w-full h-32 object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                    )}
                  </div>

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
                    <div className="space-y-2">
                      <Label htmlFor="websiteLogo">Logo URL</Label>
                      <Input
                        id="websiteLogo"
                        placeholder="https://example.com/logo.png"
                        value={getValue("websiteLogo")}
                        onChange={(e) => updateField("websiteLogo", e.target.value)}
                        data-testid="input-logo-url"
                      />
                      {getValue("websiteLogo") && (
                        <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                          <img
                            src={getValue("websiteLogo")}
                            alt="Logo önizleme"
                            className="h-12 w-auto"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="websiteFavicon">Favicon URL</Label>
                      <Input
                        id="websiteFavicon"
                        placeholder="https://example.com/favicon.ico"
                        value={getValue("websiteFavicon")}
                        onChange={(e) => updateField("websiteFavicon", e.target.value)}
                        data-testid="input-favicon-url"
                      />
                    </div>
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

            <TabsContent value="about" className="mt-6">
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

            <TabsContent value="contact" className="mt-6">
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

            <TabsContent value="policies" className="mt-6 space-y-6">
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

            <TabsContent value="faq" className="mt-6">
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}
