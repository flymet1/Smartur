import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Save, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";

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
        toast({ title: "Giris Basarili", description: "Bot kurallarini duzenleyebilirsiniz." });
      } else {
        toast({ title: "Hata", description: data.error || "Giris basarisiz", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Giris yapilamadi", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('botRulesToken');
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
        throw new Error(error.error || 'Kayit basarisiz');
      }
      toast({ title: "Kaydedildi", description: "Bot kurallari guncellendi." });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Kurallar kaydedilemedi", variant: "destructive" });
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
        <div className="text-muted-foreground">Yukleniyor...</div>
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
            <CardTitle>Bot Kurallari - Giris</CardTitle>
            <CardDescription>
              Bu sayfaya erismek icin sifrenizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Sifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sifrenizi girin"
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
                {isLoggingIn ? "Giris yapiliyor..." : "Giris Yap"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/settings">
                <Button variant="ghost" className="text-muted-foreground" data-testid="link-back-settings">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ayarlara Don
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
              Bot Kurallari
            </h1>
            <p className="text-muted-foreground mt-1">
              AI botunun kullandigi kurallari duzenleyin
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
              Cikis
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Onemli Kurallar</CardTitle>
            <CardDescription>
              Bu kurallar bot'un sistem prompt'una eklenir ve her mesajda gecerli olur.
              Her satir bir kural olarak yazilmalidir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={botRules}
              onChange={(e) => setBotRules(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Bot kurallarini buraya yazin..."
              data-testid="textarea-bot-rules"
            />

            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                data-testid="button-save-rules"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Kaydediliyor..." : "Kurallari Kaydet"}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Ipuclari</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>Her kurali numaralandirarak yazin (1., 2., 3. gibi)</li>
                <li>Kurallar net ve acik olmali</li>
                <li>Bot bu kurallara gore musteri mesajlarini yanitlar</li>
                <li>Ozel durumlar icin (eskalasyon, indirim talepleri vs.) kurallar ekleyin</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
