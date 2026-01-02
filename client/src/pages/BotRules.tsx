import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Save, ArrowLeft, Eye, EyeOff, Mail, FileText, AlertCircle, AlertTriangle, Info, RefreshCw, ChevronDown, ChevronUp, MessageSquare, Check, X, Clock } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";

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
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  interface SystemLog {
    id: number;
    level: string;
    source: string;
    message: string;
    details: string | null;
    phone: string | null;
    createdAt: string;
  }

  interface CustomerRequest {
    id: number;
    reservationId: number;
    requestType: string;
    requestDetails: string | null;
    preferredTime: string | null;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    status: string;
    adminNotes: string | null;
    emailSent: boolean | null;
    createdAt: string;
    processedAt: string | null;
  }

  // Load developer email setting
  const { data: emailSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'developerEmail'],
    queryFn: async () => {
      const res = await fetch('/api/settings/developerEmail');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Load system logs
  const { data: systemLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<SystemLog[]>({
    queryKey: ['/api/system-logs'],
    queryFn: async () => {
      const res = await fetch('/api/system-logs?limit=50');
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Load customer requests
  const { data: customerRequests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery<CustomerRequest[]>({
    queryKey: ['/api/customer-requests'],
    queryFn: async () => {
      const res = await fetch('/api/customer-requests');
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Update customer request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/customer-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({ title: "Başarılı", description: "Talep durumu güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep güncellenemedi.", variant: "destructive" });
    },
  });

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'time_change': return 'Saat Değişikliği';
      case 'cancellation': return 'İptal Talebi';
      case 'other': return 'Diğer Talep';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Beklemede</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 gap-1"><Check className="w-3 h-3" />Onaylandı</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 gap-1"><X className="w-3 h-3" />Reddedildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sistem Logları
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => refetchLogs()}
                disabled={logsLoading}
                data-testid="button-refresh-logs"
              >
                <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              Son 24 saat içindeki hata ve uyarı kayıtları (en yeni en üstte)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
            ) : !systemLogs || systemLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Henüz log kaydı yok
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {systemLogs.map((log) => (
                    <Collapsible
                      key={log.id}
                      open={expandedLogId === log.id}
                      onOpenChange={(open) => setExpandedLogId(open ? log.id : null)}
                    >
                      <div className="border rounded-md p-3">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-start gap-2 text-left">
                            {log.level === 'error' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            ) : log.level === 'warn' ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            ) : (
                              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'secondary' : 'outline'} className="text-xs">
                                  {log.source}
                                </Badge>
                                {log.phone && (
                                  <span className="text-xs text-muted-foreground">{log.phone}</span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(log.createdAt).toLocaleString('tr-TR')}
                                </span>
                              </div>
                              <p className="text-sm mt-1 break-words">{log.message}</p>
                            </div>
                            {log.details && (
                              <div className="shrink-0">
                                {expandedLogId === log.id ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                        </CollapsibleTrigger>
                        {log.details && (
                          <CollapsibleContent>
                            <div className="mt-3 pt-3 border-t">
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                                {log.details}
                              </pre>
                            </div>
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Musteri Talepleri
                {customerRequests && customerRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {customerRequests.filter(r => r.status === 'pending').length} yeni
                  </Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => refetchRequests()}
                disabled={requestsLoading}
                data-testid="button-refresh-requests"
              >
                <RefreshCw className={`h-4 w-4 ${requestsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              Müşteri takip sayfasından gelen talepler (saat değişikliği, iptal vb.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
            ) : !customerRequests || customerRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Henuz musteri talebi yok
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {customerRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{request.customerName}</span>
                            <Badge variant="outline" className="text-xs">
                              {getRequestTypeText(request.requestType)}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {request.customerPhone && <span>{request.customerPhone}</span>}
                            {request.customerEmail && <span className="ml-2">{request.customerEmail}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(request.createdAt).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      
                      {request.requestType === 'time_change' && request.preferredTime && (
                        <div className="text-sm bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                          <span className="text-muted-foreground">Tercih edilen saat:</span>{' '}
                          <span className="font-medium">{request.preferredTime}</span>
                        </div>
                      )}
                      
                      {request.requestDetails && (
                        <p className="text-sm bg-muted/50 p-2 rounded">{request.requestDetails}</p>
                      )}
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'approved' })}
                            disabled={updateRequestMutation.isPending}
                            data-testid={`button-approve-${request.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                            disabled={updateRequestMutation.isPending}
                            data-testid={`button-reject-${request.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reddet
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
