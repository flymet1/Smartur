import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Code
} from "lucide-react";

interface SystemLog {
  id: number;
  level: string;
  source: string;
  message: string;
  details: string | null;
  phone: string | null;
  createdAt: string;
}

const DEFAULT_BOT_RULES = `1. Her zaman nazik ve profesyonel ol.
2. Müşterilere aktivite bilgilerini doğru ver.
3. Fiyat sorularına net cevap ver.
4. Rezervasyon taleplerinde tarih, saat ve kişi sayısını sor.
5. Karmaşık konularda yetkiliye yönlendir.`;

export default function Developer() {
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [botRules, setBotRules] = useState(DEFAULT_BOT_RULES);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState("logobudur@gmail.com");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    const verifyExistingToken = async () => {
      const token = localStorage.getItem('superAdminToken');
      if (token) {
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
            localStorage.removeItem('superAdminToken');
          }
        } catch {
          localStorage.removeItem('superAdminToken');
        }
      }
      setIsCheckingAuth(false);
    };
    verifyExistingToken();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bot-rules/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        localStorage.setItem('superAdminToken', data.token);
        setIsAuthenticated(true);
        loadBotRules();
        toast({ title: "Giris Basarili", description: "Gelistirici paneline hos geldiniz." });
      } else {
        toast({ title: "Hata", description: data.error || "Sifre yanlis", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Giris yapilamadi", variant: "destructive" });
    }
  };

  const loadBotRules = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch('/api/settings/bot_rules', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.value) setBotRules(data.value);
      }
    } catch (err) {
      console.error("Bot rules yuklenemedi:", err);
    }
  };

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      const token = localStorage.getItem('superAdminToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      await fetch('/api/settings/bot_rules', {
        method: 'POST',
        headers,
        body: JSON.stringify({ value: botRules })
      });
      
      await fetch('/api/settings/developerEmail', {
        method: 'POST',
        headers,
        body: JSON.stringify({ value: developerEmail })
      });
      
      toast({ title: "Kaydedildi", description: "Ayarlar basariyla kaydedildi." });
    } catch {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    } finally {
      setIsSavingRules(false);
    }
  };

  const { data: systemLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<SystemLog[]>({
    queryKey: ['/api/system-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch('/api/system-logs?limit=50', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: emailSetting } = useQuery<{ value: string }>({
    queryKey: ['/api/settings/developerEmail'],
    queryFn: async () => {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch('/api/settings/developerEmail', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (emailSetting?.value) {
      setDeveloperEmail(emailSetting.value);
    }
  }, [emailSetting]);

  if (isCheckingAuth) {
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
            <CardTitle>Gelistirici Paneli</CardTitle>
            <CardDescription>
              Bu panele erismek icin sifrenizi girin
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
                    data-testid="input-developer-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="button-developer-login">
                Giris Yap
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Code className="h-6 w-6 text-primary" />
          Gelistirici Paneli
        </h1>
        <p className="text-muted-foreground">Bot kurallari ve sistem loglari</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Destek E-posta Adresi
            </CardTitle>
            <CardDescription>
              Kullanicilarin destek talepleri bu adrese gonderilecektir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="developerEmail">Gelistirici E-posta</Label>
              <Input
                id="developerEmail"
                type="email"
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                placeholder="ornek@email.com"
                data-testid="input-developer-email"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Bot Kurallari</CardTitle>
            <CardDescription>
              Bu kurallar bot'un sistem prompt'una eklenir ve her mesajda gecerli olur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={botRules}
              onChange={(e) => setBotRules(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Bot kurallarini buraya yazin..."
              data-testid="textarea-bot-rules"
            />

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveRules} 
                disabled={isSavingRules}
                data-testid="button-save-rules"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingRules ? "Kaydediliyor..." : "Ayarlari Kaydet"}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Ipuclari</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>Her kurali numaralandirarak yazin (1., 2., 3. gibi)</li>
                <li>Kurallar net ve acik olmali</li>
                <li>Bot bu kurallara gore musteri mesajlarini yanitlar</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sistem Loglari
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
              Son 24 saat icindeki hata ve uyari kayitlari (en yeni en ustte)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
            ) : !systemLogs || systemLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Henuz log kaydi yok
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
      </div>
    </div>
  );
}
