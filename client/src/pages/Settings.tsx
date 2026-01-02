import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, QrCode, CheckCircle, Circle, RefreshCw, MessageSquare, Wifi, WifiOff, Plus, Trash2, Ban, Upload, Image, X } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [reminderHours, setReminderHours] = useState(24);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMessage, setReminderMessage] = useState(
    "Merhaba {isim}! Rezervasyonunuz için hatırlatma:\n\n{aktiviteler}\nTarih: {tarih}\n\nSizi görmek için sabırsızlanıyoruz!"
  );
  const [botEnabled, setBotEnabled] = useState(true);
  const [botPrompt, setBotPrompt] = useState(
    "Sen bir TURİZM RESERVASYONLARI DANIŞMANI'sın. Müşterilerle Türkçe konuşarak rezervasyon yardımcılığı yap. Kibar, samimi ve profesyonel ol. Müşterinin sorularına hızla cevap ver ve rezervasyon yapmalarına yardımcı ol."
  );
  const [customerSupportEmail, setCustomerSupportEmail] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [isRefreshingQR, setIsRefreshingQR] = useState(false);
  const [newBlacklistPhone, setNewBlacklistPhone] = useState("");
  const [newBlacklistReason, setNewBlacklistReason] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Bot Access Settings
  const [botAccessActivities, setBotAccessActivities] = useState(true);
  const [botAccessPackageTours, setBotAccessPackageTours] = useState(true);
  const [botAccessCapacity, setBotAccessCapacity] = useState(true);
  const [botAccessFaq, setBotAccessFaq] = useState(true);
  const [botAccessConfirmation, setBotAccessConfirmation] = useState(true);
  const [botAccessTransfer, setBotAccessTransfer] = useState(true);
  const [botAccessExtras, setBotAccessExtras] = useState(true);
  const [botAccessSettingsLoaded, setBotAccessSettingsLoaded] = useState(false);

  const { data: sidebarLogoSetting, refetch: refetchLogo } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'sidebarLogo'],
    queryFn: async () => {
      const res = await fetch('/api/settings/sidebarLogo');
      return res.json();
    },
  });

  // Load bot access settings
  const { data: botAccessSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'botAccess'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botAccess');
      return res.json();
    },
  });

  // Apply loaded bot access settings when data arrives (using useEffect)
  useEffect(() => {
    if (botAccessSettings?.value && !botAccessSettingsLoaded) {
      try {
        const settings = JSON.parse(botAccessSettings.value);
        if (settings.activities !== undefined) setBotAccessActivities(settings.activities);
        if (settings.packageTours !== undefined) setBotAccessPackageTours(settings.packageTours);
        if (settings.capacity !== undefined) setBotAccessCapacity(settings.capacity);
        if (settings.faq !== undefined) setBotAccessFaq(settings.faq);
        if (settings.confirmation !== undefined) setBotAccessConfirmation(settings.confirmation);
        if (settings.transfer !== undefined) setBotAccessTransfer(settings.transfer);
        if (settings.extras !== undefined) setBotAccessExtras(settings.extras);
        setBotAccessSettingsLoaded(true);
      } catch {}
    }
  }, [botAccessSettings?.value, botAccessSettingsLoaded]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Hata", description: "Lutfen bir gorsel dosyasi secin.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Hata", description: "Dosya boyutu 2MB'dan kucuk olmali.", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await fetch('/api/settings/sidebarLogo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: base64 })
        });
        await refetchLogo();
        queryClient.invalidateQueries({ queryKey: ['/api/settings', 'sidebarLogo'] });
        toast({ title: "Basarili", description: "Logo yuklendi." });
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: "Hata", description: "Logo yuklenemedi.", variant: "destructive" });
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await fetch('/api/settings/sidebarLogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: null })
      });
      await refetchLogo();
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'sidebarLogo'] });
      toast({ title: "Basarili", description: "Logo kaldirildi." });
    } catch (err) {
      toast({ title: "Hata", description: "Logo kaldirilamadi.", variant: "destructive" });
    }
  };

  interface BlacklistEntry {
    id: number;
    phone: string;
    reason?: string;
    createdAt: string;
  }

  const { data: blacklist, isLoading: isBlacklistLoading } = useQuery<BlacklistEntry[]>({
    queryKey: ['/api/blacklist'],
    queryFn: async () => {
      const res = await fetch('/api/blacklist');
      return res.json();
    }
  });

  const addToBlacklistMutation = useMutation({
    mutationFn: async ({ phone, reason }: { phone: string; reason?: string }) => {
      return apiRequest('POST', '/api/blacklist', { phone, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist'] });
      setNewBlacklistPhone("");
      setNewBlacklistReason("");
      toast({ title: "Eklendi", description: "Numara kara listeye eklendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Numara eklenemedi.", variant: "destructive" });
    }
  });

  const removeFromBlacklistMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/blacklist/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blacklist'] });
      toast({ title: "Silindi", description: "Numara kara listeden silindi." });
    }
  });

  const handleRefreshQR = () => {
    setIsRefreshingQR(true);
    setTimeout(() => {
      setIsRefreshingQR(false);
      toast({
        title: "QR Kod Yenilendi",
        description: "Yeni QR kodu telefonunuzla tarayabilirsiniz."
      });
    }, 1500);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Build bot access settings object
      const botAccessValue = JSON.stringify({
        activities: botAccessActivities,
        packageTours: botAccessPackageTours,
        capacity: botAccessCapacity,
        faq: botAccessFaq,
        confirmation: botAccessConfirmation,
        transfer: botAccessTransfer,
        extras: botAccessExtras
      });

      // Save all settings
      await Promise.all([
        fetch("/api/settings/customerSupportEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: customerSupportEmail })
        }),
        fetch("/api/settings/botPrompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: botPrompt })
        }),
        fetch("/api/settings/reminderHours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: String(reminderHours) })
        }),
        fetch("/api/settings/reminderMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: reminderMessage })
        }),
        fetch("/api/settings/botAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: botAccessValue })
        })
      ]);
      
      toast({ 
        title: "Başarılı", 
        description: "Ayarlar kaydedildi." 
      });
    } catch (err) {
      toast({ 
        title: "Hata", 
        description: "Ayarlar kaydedilemedi.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display">Ayarlar</h1>
          <p className="text-muted-foreground mt-1">Sistem yapılandırması</p>
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            size="lg"
            className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            {isSaving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Sidebar Logosu
              </CardTitle>
              <CardDescription>
                Sol menude gorunecek firmanizin logosunu yukleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                accept="image/*"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                className="hidden"
                data-testid="input-logo-upload"
              />
              
              {sidebarLogoSetting?.value ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={sidebarLogoSetting.value} 
                      alt="Logo" 
                      className="h-16 w-auto border rounded-md p-2 bg-muted/30"
                      data-testid="img-logo-preview"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      data-testid="button-change-logo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Degistir
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="text-destructive"
                      data-testid="button-remove-logo"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Kaldir
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                  data-testid="dropzone-logo"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Logo yuklemek icin tiklayin</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG (max 2MB)</p>
                  </div>
                </div>
              )}
              
              {isUploadingLogo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Yukleniyor...
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Otomasyon Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Otomatik Onay Mesajı</Label>
                  <p className="text-sm text-muted-foreground">Rezervasyon oluştuğunda müşteriye WhatsApp mesajı gönder</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <Label>Otomatik Hatırlatma</Label>
                    <p className="text-sm text-muted-foreground">Aktiviteye belirtilen süre kala WhatsApp hatırlatma gönder</p>
                  </div>
                  <Switch 
                    checked={reminderEnabled} 
                    onCheckedChange={setReminderEnabled}
                  />
                </div>
                
                {reminderEnabled && (
                  <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
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
                      <Label htmlFor="reminderMessage">Hatırlatma Mesajı</Label>
                      <Textarea 
                        id="reminderMessage"
                        value={reminderMessage}
                        onChange={(e) => setReminderMessage(e.target.value)}
                        placeholder="Hatırlatma mesajınızı yazın..."
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Desteklenen değişkenler:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}isim{'}'}</code> - Müşteri adı</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}tarih{'}'}</code> - Rezervasyon tarihi</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}aktiviteler{'}'}</code> - Aktivite adları</div>
                        <div><code className="bg-background px-1.5 py-1 rounded">{'{'}saatler{'}'}</code> - Aktivite saatleri</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Bot Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="connection" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="connection" data-testid="tab-whatsapp-connection">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Bağlantı
                  </TabsTrigger>
                  <TabsTrigger value="bot" data-testid="tab-whatsapp-bot">Bot Ayarları</TabsTrigger>
                  <TabsTrigger value="support" data-testid="tab-whatsapp-support">Destek</TabsTrigger>
                </TabsList>

                <TabsContent value="connection" className="space-y-6 mt-4">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${whatsappConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                          {whatsappConnected ? (
                            <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Bağlantı Durumu</p>
                          <Badge variant={whatsappConnected ? "default" : "secondary"} className="mt-1">
                            {whatsappConnected ? "Bağlı" : "Bağlı Değil"}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">QR Kod ile Bağlan</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleRefreshQR}
                            disabled={isRefreshingQR}
                            data-testid="button-refresh-qr"
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingQR ? 'animate-spin' : ''}`} />
                            Yenile
                          </Button>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border flex items-center justify-center min-h-[200px]">
                          {isRefreshingQR ? (
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                              <RefreshCw className="w-8 h-8 animate-spin" />
                              <span className="text-sm">QR kod yükleniyor...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                                <QrCode className="w-24 h-24 text-muted-foreground/50" />
                              </div>
                              <p className="text-xs text-muted-foreground text-center">
                                QR kod burada görünecek
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                              WhatsApp Botunu Nasıl Aktif Edersiniz?
                            </h4>
                            <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">1</span>
                                </div>
                                <span>Telefonunuzda <strong>WhatsApp Business</strong> uygulamasını açın</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">2</span>
                                </div>
                                <span><strong>Ayarlar &gt; Bağlı Cihazlar</strong> menüsüne gidin</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">3</span>
                                </div>
                                <span><strong>"Cihaz Bağla"</strong> butonuna dokunun</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">4</span>
                                </div>
                                <span>Soldaki <strong>QR kodu</strong> telefonunuzla tarayın</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">5</span>
                                </div>
                                <span>Bağlantı kurulduğunda durum <strong>"Bağlı"</strong> olarak değişecek</span>
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Circle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-1">
                              Önemli Notlar
                            </h4>
                            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                              <li>Telefonunuzun internete bağlı olduğundan emin olun</li>
                              <li>QR kod 60 saniye geçerlidir, süre dolarsa yenileyin</li>
                              <li>Bağlantı koptuğunda bot otomatik mesaj gönderemez</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bot" className="space-y-6 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>WhatsApp Botunu Etkinleştir</Label>
                      <p className="text-sm text-muted-foreground">Müşterilerle otomatik konuşmalar için bot'u aç/kapat</p>
                    </div>
                    <Switch 
                      checked={botEnabled} 
                      onCheckedChange={setBotEnabled}
                    />
                  </div>

                  {botEnabled && (
                    <div className="space-y-6">
                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-2">
                          <Label htmlFor="botPrompt">Bot Sistemi Prompt'u</Label>
                          <Textarea 
                            id="botPrompt"
                            value={botPrompt}
                            onChange={(e) => setBotPrompt(e.target.value)}
                            placeholder="Bot'un nasıl davranacağını tanımlayan talimatleri yazın..."
                            className="min-h-[150px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Bu prompt'u değiştirerek bot'un kişiliğini ve davranışını özelleştirebilirsiniz. Bot bu talimatlara uyarak müşterilerle konuşacak.
                          </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-900 dark:text-blue-200">
                            <strong>Ipucu:</strong> Prompt'unuzda musterilerle samimi olmalarini, kibar olmalarini, hizli cevap vermelerini ve rezervasyon yapmalarina yardimci olmalarini belirtin.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Bot Erisim Ayarlari</Label>
                          <p className="text-sm text-muted-foreground">
                            Bot'un hangi bilgilere erisebilecegini secin. Kapatilan bilgiler bot'a gonderilmez.
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Aktivite Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Aktivite aciklamalari, fiyatlar ve rezervasyon linkleri</p>
                            </div>
                            <Switch 
                              checked={botAccessActivities} 
                              onCheckedChange={setBotAccessActivities}
                              data-testid="switch-bot-access-activities"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Paket Tur Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Paket tur aciklamalari, fiyatlar ve rezervasyon linkleri</p>
                            </div>
                            <Switch 
                              checked={botAccessPackageTours} 
                              onCheckedChange={setBotAccessPackageTours}
                              data-testid="switch-bot-access-package-tours"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Kapasite / Takvim</Label>
                              <p className="text-xs text-muted-foreground">Musaitlik ve kontenjan bilgileri</p>
                            </div>
                            <Switch 
                              checked={botAccessCapacity} 
                              onCheckedChange={setBotAccessCapacity}
                              data-testid="switch-bot-access-capacity"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Sik Sorulan Sorular (SSS)</Label>
                              <p className="text-xs text-muted-foreground">Aktivite ve paket turlar icin tanimli SSS'ler</p>
                            </div>
                            <Switch 
                              checked={botAccessFaq} 
                              onCheckedChange={setBotAccessFaq}
                              data-testid="switch-bot-access-faq"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Onay Mesajlari</Label>
                              <p className="text-xs text-muted-foreground">Siparis tamamlandiginda gonderilecek onay mesajlari</p>
                            </div>
                            <Switch 
                              checked={botAccessConfirmation} 
                              onCheckedChange={setBotAccessConfirmation}
                              data-testid="switch-bot-access-confirmation"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Transfer Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Ucretsiz otel transferi bolgeleri</p>
                            </div>
                            <Switch 
                              checked={botAccessTransfer} 
                              onCheckedChange={setBotAccessTransfer}
                              data-testid="switch-bot-access-transfer"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2">
                            <div className="space-y-0.5">
                              <Label>Ekstra Hizmetler</Label>
                              <p className="text-xs text-muted-foreground">Aktivitelere eklenebilecek ekstra hizmetler ve fiyatlari</p>
                            </div>
                            <Switch 
                              checked={botAccessExtras} 
                              onCheckedChange={setBotAccessExtras}
                              data-testid="switch-bot-access-extras"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Ban className="w-5 h-5" />
                            <Label className="text-base font-medium">Kara Liste</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Bot bu numaralara asla otomatik cevap vermez
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Input 
                            placeholder="Telefon numarası (örn: 5321234567)"
                            value={newBlacklistPhone}
                            onChange={(e) => setNewBlacklistPhone(e.target.value)}
                            className="flex-1"
                            data-testid="input-blacklist-phone"
                          />
                          <Input 
                            placeholder="Sebep (opsiyonel)"
                            value={newBlacklistReason}
                            onChange={(e) => setNewBlacklistReason(e.target.value)}
                            className="flex-1"
                            data-testid="input-blacklist-reason"
                          />
                          <Button 
                            onClick={() => {
                              if (newBlacklistPhone.trim()) {
                                addToBlacklistMutation.mutate({ 
                                  phone: newBlacklistPhone.trim(), 
                                  reason: newBlacklistReason.trim() || undefined 
                                });
                              }
                            }}
                            disabled={!newBlacklistPhone.trim() || addToBlacklistMutation.isPending}
                            data-testid="button-add-blacklist"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Ekle
                          </Button>
                        </div>

                        {isBlacklistLoading ? (
                          <div className="text-sm text-muted-foreground">Yükleniyor...</div>
                        ) : blacklist?.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4 bg-background/50 rounded-lg">
                            Kara listede numara yok
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {blacklist?.map((entry) => (
                              <div 
                                key={entry.id} 
                                className="flex items-center justify-between gap-2 p-3 bg-background/50 rounded-lg"
                                data-testid={`blacklist-entry-${entry.id}`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{entry.phone}</div>
                                  {entry.reason && (
                                    <div className="text-xs text-muted-foreground">{entry.reason}</div>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeFromBlacklistMutation.mutate(entry.id)}
                                  disabled={removeFromBlacklistMutation.isPending}
                                  data-testid={`button-remove-blacklist-${entry.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            Kara listedeki numaralardan gelen mesajlar kaydedilir ancak bot otomatik cevap vermez.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="support" className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerSupportEmail">Müşteri Destek E-posta Adresi</Label>
                    <Input 
                      id="customerSupportEmail"
                      type="email"
                      value={customerSupportEmail}
                      onChange={(e) => setCustomerSupportEmail(e.target.value)}
                      placeholder="destek@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Müşteri destek talebinin gelmesi gereken e-posta adresi. Bot çözemediği sorular için bu adrese bildirim gönderilecek.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WooCommerce Entegrasyonu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value="https://api.domain.com/api/webhooks/woocommerce" className="bg-muted" />
                  <Button variant="outline">Kopyala</Button>
                </div>
                <p className="text-xs text-muted-foreground">Bu URL'i WooCommerce ayarlarınıza ekleyin.</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
