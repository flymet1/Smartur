import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Save, ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const DEFAULT_BOT_RULES = `1. Müşteriye etkinlikler hakkında soru sorulduğunda yukarıdaki açıklamaları kullan.
2. MÜSAİTLİK/KONTENJAN sorularında yukarıdaki MÜSAİTLİK BİLGİSİ ve TARİH BİLGİSİ bölümlerini kontrol et. "Yarın" dendiğinde TARİH BİLGİSİ'ndeki yarın tarihini kullan.
3. Eğer müsaitlik bilgisi yoksa müşteriye "Kontenjan bilgisi için takvimimize bakmanızı veya bizi aramanızı öneriyorum" de.
4. ESKALASYON: Karmaşık konularda, şikayetlerde, veya 2 mesaj içinde çözülemeyen sorunlarda "Bu konuyu yetkili arkadaşımıza iletiyorum, en kısa sürede sizinle iletişime geçilecektir" de. Müşteri memnuniyetsiz/agresifse veya "destek talebi", "operatör", "beni arayın" gibi ifadeler kullanırsa da aynı şekilde yönlendir.
5. Fiyat indirimi, grup indirimi gibi özel taleplerde yetkili yönlendirmesi yap.
6. Mevcut rezervasyonu olmayan ama rezervasyon bilgisi soran müşterilerden sipariş numarası iste.
7. TRANSFER soruları: Yukarıdaki aktivite bilgilerinde "Ücretsiz Otel Transferi" ve "Bölgeler" kısımlarını kontrol et. Hangi bölgelerden ücretsiz transfer olduğunu söyle.
8. EKSTRA HİZMET soruları: "Ekstra uçuş ne kadar?", "Fotoğraf dahil mi?" gibi sorularda yukarıdaki "Ekstra Hizmetler" listesini kullan ve fiyatları ver.
9. PAKET TUR soruları: Müşteri birden fazla aktivite içeren paket turlar hakkında soru sorarsa yukarıdaki PAKET TURLAR bölümünü kullan ve bilgi ver.
10. SIK SORULAN SORULAR: Her aktivite veya paket tur için tanımlı "Sık Sorulan Sorular" bölümünü kontrol et. Müşterinin sorusu bu SSS'lerden biriyle eşleşiyorsa, oradaki cevabı kullan.
11. SİPARİŞ ONAYI: Müşteri sipariş numarasını paylaşırsa ve onay mesajı isterse, yukarıdaki "Türkçe Sipariş Onay Mesajı" alanını kullan. Mesajı olduğu gibi, hiçbir değişiklik yapmadan ilet.
12. DEĞİŞİKLİK TALEPLERİ: Paket turlarda saat/tarih değişikliği isteyenlere, rezervasyon sonrası info@skyfethiye.com adresine sipariş numarasıyla mail atmaları gerektiğini söyle.
13. REZERVASYON LİNKİ SEÇİMİ: Müşteriyle İngilizce konuşuyorsan "EN Reservation Link" kullan. İngilizce link yoksa/boşsa "TR Rezervasyon Linki" gönder (fallback). Türkçe konuşuyorsan her zaman "TR Rezervasyon Linki" kullan.`;

export default function BotRules() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [botRules, setBotRules] = useState(DEFAULT_BOT_RULES);
  const [isSaving, setIsSaving] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState("logobudur@gmail.com");
  const queryClient = useQueryClient();

  // Load developer email setting
  const { data: emailSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'developerEmail'],
    queryFn: async () => {
      const res = await fetch('/api/settings/developerEmail');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (emailSetting?.value) {
      setDeveloperEmail(emailSetting.value);
    }
  }, [emailSetting]);

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('botRulesToken');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch('/api/bot-rules/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        loadBotRules();
      } else {
        localStorage.removeItem('botRulesToken');
      }
    } catch {
      localStorage.removeItem('botRulesToken');
    }
    setIsLoading(false);
  };

  const loadBotRules = async () => {
    try {
      const res = await fetch('/api/settings/botRules');
      const data = await res.json();
      if (data.value) {
        setBotRules(data.value);
      }
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/bot-rules/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('botRulesToken', data.token);
        setIsAuthenticated(true);
        loadBotRules();
        toast({ title: "Giriş Başarılı", description: "Bot kurallarını düzenleyebilirsiniz." });
      } else {
        toast({ title: "Hata", description: data.error || "Giriş başarısız", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Giriş yapılamadı", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('botRulesToken');
      
      // Save bot rules
      const res = await fetch('/api/settings/botRules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: botRules })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Kayıt başarısız');
      }
      
      // Save developer email
      const emailRes = await fetch('/api/settings/developerEmail', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: developerEmail })
      });
      
      if (!emailRes.ok) {
        throw new Error('E-posta ayarı kaydedilemedi');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'developerEmail'] });
      toast({ title: "Kaydedildi", description: "Geliştirici ayarları güncellendi." });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Ayarlar kaydedilemedi", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('botRulesToken');
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Geliştirici Girişi</CardTitle>
            <CardDescription>
              Bu sayfaya erişmek için şifrenizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifrenizi girin"
                    required
                    data-testid="input-login-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-login-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoggingIn}
                data-testid="button-login"
              >
                {isLoggingIn ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/settings">
                <Button variant="ghost" className="text-muted-foreground" data-testid="link-back-settings">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ayarlara Dön
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Geliştirici Paneli
            </h1>
            <p className="text-muted-foreground mt-1">
              AI bot kuralları ve geliştirici ayarlarını düzenleyin
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="outline" data-testid="button-back-settings">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ayarlar
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              Çıkış
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Destek E-posta Adresi
            </CardTitle>
            <CardDescription>
              Kullanıcıların destek talepleri bu adrese gönderilecektir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="developerEmail">Geliştirici E-posta</Label>
              <Input
                id="developerEmail"
                type="email"
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                placeholder="ornek@email.com"
                data-testid="input-developer-email"
              />
              <p className="text-xs text-muted-foreground">
                Destek talepleri ve sistem bildirimleri bu adrese gönderilir.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Önemli Kurallar</CardTitle>
            <CardDescription>
              Bu kurallar bot'un sistem prompt'una eklenir ve her mesajda geçerli olur.
              Her satır bir kural olarak yazılmalıdır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={botRules}
              onChange={(e) => setBotRules(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Bot kurallarını buraya yazın..."
              data-testid="textarea-bot-rules"
            />

            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                data-testid="button-save-rules"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">İpuçları</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>Her kuralı numaralandırarak yazın (1., 2., 3. gibi)</li>
                <li>Kurallar net ve açık olmalı</li>
                <li>Bot bu kurallara göre müşteri mesajlarını yanıtlar</li>
                <li>Özel durumlar için (eskalasyon, indirim talepleri vs.) kurallar ekleyin</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
